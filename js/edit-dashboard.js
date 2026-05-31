function waitForComicsApi() {
  return new Promise((resolve) => {
    document.addEventListener("comics-api-ready", () => resolve(), { once: true });
    setTimeout(() => {
      if (typeof ComicsApi !== "undefined") resolve();
    }, 12000);
  });
}

function setMessage(text, isError = false) {
  const el = document.getElementById("edit-message");
  if (!el) return;
  el.textContent = text ?? "";
  el.classList.toggle("media-error", Boolean(isError && text));
}

function setDeleteButtonVisible(button, visible) {
  if (!button) return;
  button.hidden = !visible;
}

function wireDeleteButton(button, confirmMessage, onDelete, canDelete) {
  if (!button) return;
  button.addEventListener("click", async () => {
    if (button.hidden || (canDelete && !canDelete())) {
      setMessage("Only draft work can be deleted. Switch back to draft first.", true);
      return;
    }
    if (!window.confirm(confirmMessage)) return;
    try {
      button.disabled = true;
      await onDelete();
      location.href = "../my-work/";
    } catch (err) {
      button.disabled = false;
      setMessage(err.message, true);
    }
  });
}

function updateGoToComicLink(seriesSlug, volumeSlug, seriesStatus, volumeStatus) {
  const link = document.getElementById("go-to-reader");
  if (!link) return;

  const show =
    seriesSlug &&
    volumeSlug &&
    ComicModels.isPublished(seriesStatus) &&
    ComicModels.isPublished(volumeStatus);

  link.hidden = !show;
  if (show) {
    link.href = `../comics/read/?series=${encodeURIComponent(seriesSlug)}&volume=${encodeURIComponent(volumeSlug)}`;
    link.textContent = "Go to comic";
  }
}

function updateGoToArtLink(slug, status) {
  const link = document.getElementById("go-to-art");
  if (!link) return;

  const show = slug && ComicModels.isPublished(status);
  link.hidden = !show;
  if (show) {
    link.href = `../art/view.html?slug=${encodeURIComponent(slug)}`;
    link.textContent = "Go to art";
  }
}

async function initArtEdit(artId) {
  const panel = document.getElementById("edit-art-panel");
  panel.hidden = false;

  const art = await ComicsApi.getArtForOwner(artId);
  document.getElementById("art-title").value = art.title;
  const categoryInput = document.getElementById("art-category");
  if (categoryInput) categoryInput.value = art.category ?? "";
  const slugInput = document.getElementById("art-slug");
  slugInput.value = art.slug;
  slugInput.dataset.userEdited = "1";

  const preview = document.getElementById("art-current-preview");
  if (art.imageUrl && preview) {
    preview.src = art.imageUrl;
    preview.alt = art.title;
    preview.hidden = false;
  }

  let currentSlug = art.slug;
  let currentStatus = art.status;

  updateGoToArtLink(currentSlug, currentStatus);

  const artDeleteBtn = document.getElementById("art-delete-btn");
  const syncArtDelete = () => setDeleteButtonVisible(artDeleteBtn, ComicModels.isDraft(currentStatus));

  PublishStatusControl.create(document.getElementById("art-status-mount"), {
    label: "Art piece",
    initialStatus: currentStatus,
    onChange: async (status) => {
      try {
        await ComicsApi.setArtStatus(artId, status);
        currentStatus = status;
        updateGoToArtLink(currentSlug, currentStatus);
        syncArtDelete();
        setMessage(status === ComicModels.VOLUME_STATUS.PUBLISHED ? "Art is now published." : "Art is now a draft.");
      } catch (err) {
        setMessage(err.message, true);
        throw err;
      }
    },
    onStatusChange: (status) => {
      currentStatus = status;
      syncArtDelete();
    },
  });

  wireDeleteButton(
    artDeleteBtn,
    `Delete "${art.title}" permanently? This cannot be undone.`,
    () => ComicsApi.deleteArt(artId),
    () => ComicModels.isDraft(currentStatus)
  );
  syncArtDelete();

  document.getElementById("art-edit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("art-title").value.trim();
    const slug = document.getElementById("art-slug").value.trim() || ComicModels.slugify(title);
    const file = document.getElementById("art-image").files?.[0];
    if (!title) {
      setMessage("Title is required.", true);
      return;
    }
    try {
      await ComicsApi.updateArt({
        id: artId,
        title,
        slug,
        category: document.getElementById("art-category")?.value?.trim() ?? "",
        file,
      });
      currentSlug = slug;
      updateGoToArtLink(currentSlug, currentStatus);
      setMessage(`Art "${title}" saved.`);
      if (file) location.reload();
    } catch (err) {
      setMessage(err.message, true);
    }
  });
}

async function initComicEdit(seriesId, volumeId) {
  const panel = document.getElementById("edit-comic-panel");
  panel.hidden = false;

  const bundle = await ComicsApi.getVolumeEditBundle({ seriesId, volumeId });
  const { series, volume, pages } = bundle;

  let seriesSlug = series.slug;
  let volumeSlug = volume.slug;
  let seriesStatus = series.status;
  let volumeStatus = volume.status;

  document.getElementById("comic-title").value = series.title;
  document.getElementById("comic-slug").value = series.slug;
  document.getElementById("comic-description").value = series.description ?? "";
  document.getElementById("comic-slug").dataset.userEdited = "1";

  const coverPreview = document.getElementById("comic-cover-preview");
  if (series.coverUrl && coverPreview) {
    coverPreview.src = series.coverUrl;
    coverPreview.hidden = false;
  }

  document.getElementById("volume-title").value = volume.title;
  document.getElementById("volume-slug").value = volume.slug;
  document.getElementById("volume-slug").dataset.userEdited = "1";

  const layoutSelect = document.getElementById("volume-layout");
  const layouts = await ComicsApi.listLayouts();
  layoutSelect.replaceChildren();
  for (const l of layouts) {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.label;
    if (l.id === volume.layoutId) opt.selected = true;
    layoutSelect.appendChild(opt);
  }

  const pageQueue = PageUploadQueue.create(document.getElementById("page-queue-mount"), {
    emptyText: "No pages in this volume. Add images below.",
  });
  pageQueue.addExisting(pages);

  document.getElementById("page-files-input")?.addEventListener("change", (e) => {
    const input = e.target;
    if (input.files?.length) {
      pageQueue.addFiles(input.files);
      input.value = "";
    }
  });

  const refreshReaderLink = () => {
    updateGoToComicLink(seriesSlug, volumeSlug, seriesStatus, volumeStatus);
  };
  refreshReaderLink();

  const volumeDeleteBtn = document.getElementById("volume-delete-btn");
  const seriesDeleteBtn = document.getElementById("series-delete-btn");
  const syncVolumeDelete = () => setDeleteButtonVisible(volumeDeleteBtn, ComicModels.isDraft(volumeStatus));
  const syncSeriesDelete = () => setDeleteButtonVisible(seriesDeleteBtn, ComicModels.isDraft(seriesStatus));

  PublishStatusControl.create(document.getElementById("series-status-mount"), {
    label: "Comic (series)",
    initialStatus: seriesStatus,
    onChange: async (status) => {
      try {
        await ComicsApi.setSeriesStatus(seriesId, status);
        seriesStatus = status;
        refreshReaderLink();
        syncSeriesDelete();
        setMessage(status === ComicModels.VOLUME_STATUS.PUBLISHED ? "Comic is now published." : "Comic is now a draft.");
      } catch (err) {
        setMessage(err.message, true);
        throw err;
      }
    },
    onStatusChange: (status) => {
      seriesStatus = status;
      syncSeriesDelete();
    },
  });

  PublishStatusControl.create(document.getElementById("volume-status-mount"), {
    label: "Volume",
    initialStatus: volumeStatus,
    onChange: async (status) => {
      try {
        await ComicsApi.setVolumeStatus(volumeId, status);
        volumeStatus = status;
        refreshReaderLink();
        syncVolumeDelete();
        setMessage(status === ComicModels.VOLUME_STATUS.PUBLISHED ? "Volume is now published." : "Volume is now a draft.");
      } catch (err) {
        setMessage(err.message, true);
        throw err;
      }
    },
    onStatusChange: (status) => {
      volumeStatus = status;
      syncVolumeDelete();
    },
  });

  wireDeleteButton(
    volumeDeleteBtn,
    `Delete volume "${volume.title}" and all of its pages? The comic "${series.title}" will stay.`,
    () => ComicsApi.deleteVolume(volumeId),
    () => ComicModels.isDraft(volumeStatus)
  );

  wireDeleteButton(
    seriesDeleteBtn,
    `Delete the entire comic "${series.title}" including every volume and page? This cannot be undone.`,
    () => ComicsApi.deleteSeries(seriesId),
    () => ComicModels.isDraft(seriesStatus)
  );

  syncVolumeDelete();
  syncSeriesDelete();

  document.getElementById("comic-edit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const comicTitle = document.getElementById("comic-title").value.trim();
    const comicSlug = document.getElementById("comic-slug").value.trim();
    const comicDescription = document.getElementById("comic-description").value.trim();
    const volumeTitle = document.getElementById("volume-title").value.trim();
    const volumeSlug = document.getElementById("volume-slug").value.trim();
    const layoutId = layoutSelect.value;
    const coverFile = document.getElementById("comic-cover").files?.[0];
    const orderedItems = pageQueue.getOrderedItems();

    if (!comicTitle || !comicSlug || !volumeTitle || !volumeSlug || !layoutId) {
      setMessage("Fill in comic and volume titles and slugs.", true);
      return;
    }
    if (orderedItems.length === 0) {
      setMessage("Volume needs at least one page.", true);
      return;
    }

    try {
      await ComicsApi.updateSeries({
        id: seriesId,
        title: comicTitle,
        slug: comicSlug,
        description: comicDescription,
      });
      if (coverFile) await ComicsApi.uploadSeriesCover({ seriesId, file: coverFile });
      await ComicsApi.updateVolume({
        id: volumeId,
        title: volumeTitle,
        slug: volumeSlug,
        layoutId,
      });
      await ComicsApi.syncVolumePages({
        volumeId,
        seriesSlug: comicSlug,
        items: orderedItems,
      });

      seriesSlug = comicSlug;
      volumeSlug = document.getElementById("volume-slug").value.trim();
      refreshReaderLink();
      setMessage(`Saved "${volumeTitle}" and ${orderedItems.length} page(s).`);
    } catch (err) {
      setMessage(err.message, true);
    }
  });
}

async function initEdit() {
  await waitForComicsApi();
  const session = await ComicsApi.getSession();
  const gate = document.getElementById("edit-gate");
  const panel = document.getElementById("edit-panel");

  if (!session) {
    if (gate) gate.hidden = false;
    if (panel) panel.hidden = true;
    return;
  }

  if (gate) gate.hidden = true;
  if (panel) panel.hidden = false;

  const params = new URLSearchParams(location.search);
  const type = params.get("type");
  const artId = params.get("id");
  const seriesId = params.get("series");
  const volumeId = params.get("volume");

  try {
    if (type === "art" && artId) {
      await initArtEdit(artId);
      return;
    }
    if (type === "comic" && seriesId && volumeId) {
      await initComicEdit(seriesId, volumeId);
      return;
    }
    setMessage("Invalid edit link. Open a piece from My work.", true);
  } catch (err) {
    setMessage(err.message, true);
  }
}

document.addEventListener("DOMContentLoaded", initEdit);
