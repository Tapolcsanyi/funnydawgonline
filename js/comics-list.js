async function loadComicsList() {
  const list = document.getElementById("comics-list");
  if (!list) return;

  try {
    const seriesList = await ComicsApi.listPublicSeries();

    if (seriesList.length === 0) {
      list.innerHTML = "<li>No comics yet.</li>";
      return;
    }

    list.replaceChildren();
    const base = document.body.dataset.siteRoot ? `${document.body.dataset.siteRoot}/` : "";
    const placeholderCover = `${base}funnydawgonline-icon.png`;

    for (const series of seriesList) {
      const li = document.createElement("li");
      li.className = "comics-catalog-item";

      const entry = document.createElement("a");
      entry.className = "comics-catalog-entry";
      entry.href = series.slug
        ? `${base}comics/series-view/?series=${encodeURIComponent(series.slug)}`
        : `${base}comics/series/${series.id}/`;

      const title = document.createElement("span");
      title.className = "comics-catalog-title";
      title.textContent = series.title;
      entry.appendChild(title);

      const artist = document.createElement("span");
      artist.className = "catalog-meta comics-catalog-artist";
      artist.textContent = series.artistName?.trim() || "Unknown artist";
      entry.appendChild(artist);

      const hasCover = Boolean(series.coverUrl);
      const cover = document.createElement("img");
      cover.className = "comics-catalog-cover";
      if (!hasCover) cover.classList.add("comics-catalog-cover--placeholder");
      cover.src = hasCover ? series.coverUrl : placeholderCover;
      cover.alt = hasCover ? `${series.title} cover` : "";
      cover.loading = "lazy";
      cover.decoding = "async";
      entry.appendChild(cover);

      li.appendChild(entry);

      const meta = document.createElement("p");
      meta.className = "catalog-meta comics-catalog-meta";
      meta.textContent = `${series.volumeCount} volume${series.volumeCount === 1 ? "" : "s"}`;
      li.appendChild(meta);

      list.appendChild(li);
    }
  } catch (err) {
    console.error("Failed to load comics:", err);
    list.innerHTML = "<li>Could not load comics list.</li>";
  }
}

function bootComicsList() {
  if (typeof ComicsApi === "undefined") {
    document.addEventListener("comics-api-ready", loadComicsList);
    return;
  }
  loadComicsList();
}

bootComicsList();
