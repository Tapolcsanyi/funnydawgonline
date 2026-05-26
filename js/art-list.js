async function loadArtList() {
  const list = document.getElementById("art-list");
  if (!list) return;

  const root = document.body.dataset.siteRoot || "";
  const dataPath = `${root ? `${root}/` : ""}data/art.json`;

  try {
    const response = await fetch(dataPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const pieces = data.art ?? [];

    if (pieces.length === 0) {
      list.innerHTML = "<li>No art yet.</li>";
      return;
    }

    list.replaceChildren();
    for (const piece of pieces) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = piece.url;
      a.textContent = piece.title;
      li.appendChild(a);

      const meta = document.createElement("span");
      meta.className = "catalog-meta";
      meta.textContent = ` — ${piece.artistName}`;
      li.appendChild(meta);

      list.appendChild(li);
    }
  } catch (err) {
    console.error("Failed to load art:", err);
    list.innerHTML = "<li>Could not load art list.</li>";
  }
}

loadArtList();
