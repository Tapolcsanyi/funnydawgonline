function getSeriesId() {
  const fromBody = document.body.getAttribute("data-series-id");
  if (fromBody !== null && fromBody !== "") {
    return String(fromBody);
  }

  const fromPath = ComicsDb.readSeriesFromPath();
  if (fromPath) return fromPath.seriesId;

  return null;
}

async function loadSeriesPage() {
  const list = document.getElementById("volumes-list");
  const header = document.getElementById("series-header");
  if (!list) return;

  const seriesId = getSeriesId();
  if (seriesId === null) {
    list.innerHTML = "<li>No series id provided.</li>";
    return;
  }

  try {
    const db = await ComicsDb.loadComicsDb();
    const series = ComicsDb.getSeries(db, seriesId);
    if (!series) {
      list.innerHTML = "<li>Series not found.</li>";
      return;
    }

    const layoutMap = ComicsDb.buildLayoutMap(db.layouts);
    const volumeIds = ComicsDb.sortedKeys(series.volumes ?? {});

    document.title = `${series.title} — FUNNY DAWG ONLINE`;

    if (header) {
      const titleEl = header.querySelector("h1");
      const artistEl = header.querySelector("#series-artist");
      const descEl = header.querySelector("#series-description");
      if (titleEl) titleEl.textContent = series.title;
      if (artistEl) artistEl.textContent = series.artistName ?? "";
      if (descEl) {
        descEl.textContent = series.description ?? "";
        descEl.hidden = !series.description;
      }
    }

    if (volumeIds.length === 0) {
      list.innerHTML = "<li>No volumes yet.</li>";
      return;
    }

    list.replaceChildren();
    for (const volumeId of volumeIds) {
      const volume = series.volumes[volumeId];
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = volume.slug ? `${volume.slug}/` : `volume/${volumeId}/`;
      a.textContent = volume.title;
      li.appendChild(a);

      const artist =
        volume.artistName ?? series.artistName ?? "Unknown artist";
      const layoutMeta = layoutMap.get(volume.layout);
      const layoutName = layoutMeta?.label ?? volume.layout;

      const meta = document.createElement("span");
      meta.className = "catalog-meta";
      meta.textContent = ` — ${artist} (${layoutName})`;
      li.appendChild(meta);

      list.appendChild(li);
    }
  } catch (err) {
    console.error("Failed to load series:", err);
    list.innerHTML = "<li>Could not load volumes.</li>";
  }
}

loadSeriesPage();
