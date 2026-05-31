function waitForComicsApi() {
  return new Promise((resolve) => {
    document.addEventListener("comics-api-ready", () => resolve(), { once: true });
    setTimeout(() => {
      if (typeof ComicsApi !== "undefined") resolve();
    }, 12000);
  });
}

async function loadMyComics(mount) {
  if (!mount) return;
  const seriesList = await ComicsApi.listMySeries();

  if (seriesList.length === 0) {
    mount.innerHTML = '<p class="catalog-meta">No comics yet. <a href="../upload/?type=comic">Upload a comic</a>.</p>';
    return;
  }

  mount.replaceChildren();

  for (const series of seriesList) {
    const block = document.createElement("article");
    block.className = "my-work-series";

    const heading = document.createElement("h3");
    heading.textContent = series.title;
    const meta = document.createElement("p");
    meta.className = "catalog-meta";
    meta.textContent = `${series.slug} · ${series.isDraft ? "draft" : series.status}`;

    const volList = document.createElement("ul");
    volList.className = "media-list";

    const volumes = await ComicsApi.listMyVolumesForSeries(series.id);
    if (volumes.length === 0) {
      const li = document.createElement("li");
      li.className = "catalog-meta";
      li.textContent = "No volumes yet.";
      volList.appendChild(li);
    } else {
      for (const vol of volumes) {
        const li = document.createElement("li");
        const edit = document.createElement("a");
        edit.href = `../edit/?type=comic&series=${encodeURIComponent(series.id)}&volume=${encodeURIComponent(vol.id)}`;
        edit.textContent = "Edit";
        edit.className = "category-btn my-work-edit-btn";

        li.append(`${vol.title} (${vol.isDraft ? "draft" : vol.status}) — `);
        li.appendChild(edit);
        volList.appendChild(li);
      }
    }

    const addVol = document.createElement("p");
    addVol.className = "catalog-meta";
    addVol.innerHTML = `<a href="../upload/?type=comic">Add volume</a> to this comic`;

    block.append(heading, meta, volList, addVol);
    mount.appendChild(block);
  }
}

async function loadMyArt(list) {
  if (!list) return;
  const pieces = await ComicsApi.listMyArt();

  if (pieces.length === 0) {
    list.innerHTML = '<li class="catalog-meta">No art yet. <a href="../upload/?type=art">Upload art</a>.</li>';
    return;
  }

  list.replaceChildren();
  for (const piece of pieces) {
    const li = document.createElement("li");
    const edit = document.createElement("a");
    edit.href = `../edit/?type=art&id=${encodeURIComponent(piece.id)}`;
    edit.textContent = "Edit";
    edit.className = "category-btn my-work-edit-btn";

    li.append(`${piece.title} (${piece.isDraft ? "draft" : piece.status}) — `);
    li.appendChild(edit);
    list.appendChild(li);
  }
}

async function initMyWork() {
  await waitForComicsApi();
  const gate = document.getElementById("my-work-gate");
  const panel = document.getElementById("my-work-panel");

  try {
    await ComicsApi.requireUserId();
  } catch {
    if (gate) gate.hidden = false;
    if (panel) panel.hidden = true;
    return;
  }

  if (gate) gate.hidden = true;
  if (panel) panel.hidden = false;

  try {
    await loadMyComics(document.getElementById("my-comics-list"));
    await loadMyArt(document.getElementById("my-art-list"));
  } catch (err) {
    const msg = document.getElementById("my-work-message");
    if (msg) {
      msg.textContent = err.message;
      msg.classList.add("media-error");
    }
  }
}

document.addEventListener("DOMContentLoaded", initMyWork);
