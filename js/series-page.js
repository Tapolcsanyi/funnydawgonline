async function loadSeriesPage() {
  const list = document.getElementById("volumes-list");
  const header = document.getElementById("series-header");
  if (!list) return;

  const ref = ComicsApi.resolveSeriesRef();
  if (!ref) {
    list.innerHTML = "<li>No series selected.</li>";
    return;
  }

  try {
    const series = await ComicsApi.getPublicSeries(ref);
    if (!series) {
      list.innerHTML = "<li>Series not found.</li>";
      return;
    }

    const volumes = await ComicsApi.listPublicVolumesForSeries(series.id);

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

    if (volumes.length === 0) {
      list.innerHTML = "<li>No volumes yet.</li>";
      return;
    }

    list.replaceChildren();
    for (const volume of volumes) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      const base = document.body.dataset.siteRoot ? `${document.body.dataset.siteRoot}/` : "";
      a.href =
        series.slug && volume.slug
          ? `${base}comics/read/?series=${encodeURIComponent(series.slug)}&volume=${encodeURIComponent(volume.slug)}`
          : `${base}comics/series/${series.id}/volume/${volume.id}/`;
      a.textContent = volume.title;
      li.appendChild(a);

      const meta = document.createElement("span");
      meta.className = "catalog-meta";
      meta.textContent = ` — ${volume.artistName ?? series.artistName ?? "Unknown artist"} (${volume.layoutLabel})`;
      li.appendChild(meta);

      list.appendChild(li);
    }
  } catch (err) {
    console.error("Failed to load series:", err);
    list.innerHTML = "<li>Could not load volumes.</li>";
  }
}

function bootSeriesPage() {
  if (typeof ComicsApi === "undefined") {
    document.addEventListener("comics-api-ready", loadSeriesPage);
    return;
  }
  loadSeriesPage();
}

bootSeriesPage();
