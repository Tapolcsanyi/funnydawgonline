async function loadComicsList() {
  const list = document.getElementById("comics-list");
  if (!list) return;

  const root = document.body.dataset.siteRoot || "";
  const dataPath = `${root ? `${root}/` : ""}data/comics.json`;

  try {
    const response = await fetch(dataPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const comics = data.comics ?? [];

    if (comics.length === 0) {
      list.innerHTML = "<li>No comics yet.</li>";
      return;
    }

    list.replaceChildren();
    for (const comic of comics) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = comic.url;
      a.textContent = comic.title;
      li.appendChild(a);

      const meta = document.createElement("span");
      meta.className = "catalog-meta";
      meta.textContent = ` — ${comic.artistName}`;
      li.appendChild(meta);

      list.appendChild(li);
    }
  } catch (err) {
    console.error("Failed to load comics:", err);
    list.innerHTML = "<li>Could not load comics list.</li>";
  }
}

loadComicsList();
