function resolveAssetPath(src, base) {
  if (/^https?:\/\//i.test(src) || src.startsWith("/")) {
    return src;
  }
  return `${base}${src}`;
}

function getVolumeIds() {
  const seriesId = document.body.getAttribute("data-series-id");
  const volumeId = document.body.getAttribute("data-volume-id");

  if (seriesId !== null && seriesId !== "" && volumeId !== null && volumeId !== "") {
    return { seriesId: String(seriesId), volumeId: String(volumeId) };
  }

  const fromPath = ComicsDb.readSeriesVolumeFromPath();
  if (fromPath) return fromPath;

  return null;
}

async function loadArtFromDatabase(rawId, base) {
  const response = await fetch(`${base}data/art.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const database = await response.json();
  const layoutMap = ComicsDb.buildLayoutMap(database.layouts);
  const id = String(rawId);
  const art = database.art ?? {};
  const piece = Array.isArray(art)
    ? art.find((entry) => String(entry.id) === id)
    : art[id];

  if (!piece) {
    throw new Error(`Art not found: ${id}`);
  }

  const layout = ComicsDb.buildLayoutMap(database.layouts).has(piece.layout)
    ? piece.layout
    : "top-to-bottom";
  const layoutMeta = layoutMap.get(layout);

  return {
    title: piece.title,
    artistName: piece.artistName ?? "",
    layout,
    layoutLabel: layoutMeta?.label ?? layout.replace(/-/g, " "),
    images: piece.images ?? [],
  };
}

async function loadMediaViewer() {
  const viewer = document.getElementById("media-viewer");
  if (!viewer) return;

  const type = document.body.dataset.mediaType || "comic";
  const root = document.body.dataset.siteRoot || "";
  const base = root ? `${root}/` : "";
  const header = document.getElementById("media-header");
  const errorEl = document.getElementById("media-error");

  try {
    let data;

    if (type === "art") {
      const rawId = document.body.getAttribute("data-media-id");
      if (rawId === null || rawId === "") {
        viewer.innerHTML = "<p class='media-empty'>No art id provided.</p>";
        return;
      }
      data = await loadArtFromDatabase(rawId, base);
    } else {
      const ids = getVolumeIds();
      if (!ids) {
        viewer.innerHTML =
          "<p class='media-empty'>No volume selected. <a href='../'>Back to series</a>.</p>";
        return;
      }

      const db = await ComicsDb.loadComicsDb();
      data = ComicsDb.prepareVolumeForViewer(db, ids.seriesId, ids.volumeId);
    }

    document.title = `${data.title} — FUNNY DAWG ONLINE`;

    if (header) {
      const titleEl = header.querySelector("h1");
      const artistEl = header.querySelector("#media-artist");
      const layoutEl = header.querySelector("#media-layout-label");
      const seriesEl = header.querySelector("#media-series-label");

      if (titleEl) titleEl.textContent = data.title;
      if (artistEl) artistEl.textContent = data.artistName ?? "";
      if (layoutEl) {
        layoutEl.textContent = `Reading order: ${data.layoutLabel}`;
      }
      if (seriesEl && data.seriesTitle) {
        seriesEl.textContent = data.seriesTitle;
        seriesEl.hidden = false;
      }
    }

    viewer.className = `media-viewer media-viewer--${data.layout}`;
    viewer.replaceChildren();

    if (data.images.length === 0) {
      viewer.innerHTML = "<p class='media-empty'>No pages yet.</p>";
      return;
    }

    for (const image of data.images) {
      const img = document.createElement("img");
      img.src = resolveAssetPath(image.src, base);
      img.alt = image.alt || data.title;
      img.loading = "lazy";
      img.decoding = "async";
      viewer.appendChild(img);
    }

    if (errorEl) errorEl.hidden = true;
  } catch (err) {
    console.error("Failed to load media:", err);
    viewer.replaceChildren();
    viewer.innerHTML = "<p class='media-empty'>Could not load this volume.</p>";
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = `Error: ${err.message}`;
    }
  }
}

loadMediaViewer();
