async function loadComicsList() {
  const list = document.getElementById("comics-list");
  if (!list) return;

  try {
    const db = await ComicsDb.loadComicsDb();
    const seriesMap = db.series ?? {};
    const ids = ComicsDb.sortedKeys(seriesMap);

    if (ids.length === 0) {
      list.innerHTML = "<li>No comics yet.</li>";
      return;
    }

    list.replaceChildren();
    for (const seriesId of ids) {
      const series = seriesMap[seriesId];
      const volumeCount = Object.keys(series.volumes ?? {}).length;

      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = series.slug ? `${series.slug}/` : `series/${seriesId}/`;
      a.textContent = series.title;
      li.appendChild(a);

      const meta = document.createElement("span");
      meta.className = "catalog-meta";
      meta.textContent = ` — ${series.artistName} (${volumeCount} volume${volumeCount === 1 ? "" : "s"})`;
      li.appendChild(meta);

      list.appendChild(li);
    }
  } catch (err) {
    console.error("Failed to load comics:", err);
    list.innerHTML = "<li>Could not load comics list.</li>";
  }
}

loadComicsList();
