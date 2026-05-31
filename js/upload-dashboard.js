function waitForComicsApi() {
  return new Promise((resolve) => {
    document.addEventListener("comics-api-ready", () => resolve(), { once: true });
    setTimeout(() => {
      if (typeof ComicsApi !== "undefined") resolve();
    }, 12000);
  });
}

function setMessage(text, isError = false) {
  const el = document.getElementById("upload-message");
  if (!el) return;
  el.textContent = text ?? "";
  el.classList.toggle("media-error", Boolean(isError && text));
}

function bindSlugAutofill(titleInput, slugInput) {
  if (!titleInput || !slugInput) return;
  titleInput.addEventListener("input", () => {
    if (slugInput.dataset.userEdited === "1") return;
    slugInput.value = ComicModels.slugify(titleInput.value);
  });
  slugInput.addEventListener("input", () => {
    slugInput.dataset.userEdited = slugInput.value.trim() ? "1" : "";
  });
}

async function populateSeriesSelect(selectEl) {
  if (!selectEl) return;
  const series = await ComicsApi.listMySeries();
  selectEl.replaceChildren();
  const choose = document.createElement("option");
  choose.value = "";
  choose.textContent = "Choose a comic…";
  selectEl.appendChild(choose);

  for (const s of series) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.title} (${s.isDraft ? "draft" : s.status})`;
    opt.dataset.slug = s.slug;
    selectEl.appendChild(opt);
  }

  const createNew = document.createElement("option");
  createNew.value = "__new__";
  createNew.textContent = "+ New comic";
  selectEl.appendChild(createNew);
}

async function initUpload() {
  await waitForComicsApi();
  const session = await ComicsApi.getSession();
  const gate = document.getElementById("upload-gate");
  const panel = document.getElementById("upload-panel");
  if (!session) {
    if (gate) gate.hidden = false;
    if (panel) panel.hidden = true;
    return;
  }
  if (gate) gate.hidden = true;
  if (panel) panel.hidden = false;

  const typeSelect = document.getElementById("upload-type");
  const artPanel = document.getElementById("upload-art-panel");
  const comicPanel = document.getElementById("upload-comic-panel");
  const seriesSelect = document.getElementById("comic-series-select");
  const newComicFields = document.getElementById("new-comic-fields");
  const layoutSelect = document.getElementById("volume-layout");
  const pageQueueMount = document.getElementById("page-queue-mount");
  const pageFilesInput = document.getElementById("page-files-input");

  let activeSeriesSlug = null;

  const pageQueue = PageUploadQueue.create(pageQueueMount);

  pageFilesInput?.addEventListener("change", () => {
    if (pageFilesInput.files?.length) {
      pageQueue.addFiles(pageFilesInput.files);
      pageFilesInput.value = "";
    }
  });

  const layouts = await ComicsApi.listLayouts();
  if (layoutSelect) {
    layoutSelect.replaceChildren();
    for (const l of layouts) {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.label;
      layoutSelect.appendChild(opt);
    }
  }

  bindSlugAutofill(document.getElementById("new-comic-title"), document.getElementById("new-comic-slug"));
  bindSlugAutofill(document.getElementById("volume-title"), document.getElementById("volume-slug"));

  typeSelect?.addEventListener("change", async () => {
    const type = typeSelect.value;
    artPanel.hidden = type !== "art";
    comicPanel.hidden = type !== "comic";
    setMessage("");
    if (type === "comic") await populateSeriesSelect(seriesSelect);
  });

  seriesSelect?.addEventListener("change", () => {
    const isNew = seriesSelect.value === "__new__";
    newComicFields.hidden = !isNew;
    if (!isNew && seriesSelect.selectedOptions[0]) {
      activeSeriesSlug = seriesSelect.selectedOptions[0].dataset.slug ?? null;
    } else {
      activeSeriesSlug = null;
    }
  });

  document.getElementById("art-upload-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("art-title").value.trim();
    const file = document.getElementById("art-image").files?.[0];
    if (!title || !file) {
      setMessage("Add a title and image for your art.", true);
      return;
    }
    try {
      const row = await ComicsApi.createArt({
        title,
        slug: ComicModels.slugify(title),
        category: document.getElementById("art-category")?.value?.trim() ?? "",
        file,
      });
      location.href = `../edit/?type=art&id=${encodeURIComponent(row.id)}`;
    } catch (err) {
      setMessage(err.message, true);
    }
  });

  document.getElementById("comic-upload-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = pageQueue.getOrderedFiles();
    const volumeTitle = document.getElementById("volume-title").value.trim();
    const volumeSlug =
      document.getElementById("volume-slug").value.trim() || ComicModels.slugify(volumeTitle);
    const layoutId = layoutSelect?.value;

    if (!volumeTitle || !layoutId) {
      setMessage("Volume title and layout are required.", true);
      return;
    }
    if (files.length === 0) {
      setMessage("Add at least one page image.", true);
      return;
    }

    try {
      let seriesId = seriesSelect?.value;
      let seriesSlug = activeSeriesSlug;

      if (seriesId === "__new__") {
        const comicTitle = document.getElementById("new-comic-title").value.trim();
        const comicSlug =
          document.getElementById("new-comic-slug").value.trim() || ComicModels.slugify(comicTitle);
        const coverFile = document.getElementById("new-comic-cover").files?.[0];

        if (!comicTitle || !comicSlug) {
          setMessage("New comic needs a title (slug can be auto-filled).", true);
          return;
        }

        const series = await ComicsApi.createSeries({
          title: comicTitle,
          slug: comicSlug,
          description: "",
        });
        seriesId = series.id;
        seriesSlug = series.slug;

        if (coverFile) await ComicsApi.uploadSeriesCover({ seriesId, file: coverFile });
      }

      if (!seriesId || seriesId === "__new__") {
        setMessage("Choose a comic or create a new one.", true);
        return;
      }

      const selectedOpt = seriesSelect.selectedOptions[0];
      seriesSlug = selectedOpt?.dataset.slug ?? seriesSlug;
      if (!seriesSlug) {
        setMessage("Could not resolve comic slug. Re-select the comic.", true);
        return;
      }

      const volume = await ComicsApi.createVolume({
        seriesId,
        title: volumeTitle,
        slug: volumeSlug,
        layoutId,
      });

      await ComicsApi.uploadPagesOrdered({
        seriesSlug,
        volumeId: volume.id,
        files,
      });

      location.href = `../edit/?type=comic&series=${encodeURIComponent(seriesId)}&volume=${encodeURIComponent(volume.id)}`;
    } catch (err) {
      setMessage(err.message, true);
    }
  });

  const params = new URLSearchParams(location.search);
  const presetType = params.get("type");
  if (presetType === "art" || presetType === "comic") {
    typeSelect.value = presetType;
    typeSelect.dispatchEvent(new Event("change"));
  }
}

document.addEventListener("DOMContentLoaded", initUpload);
