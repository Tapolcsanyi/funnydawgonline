function waitForComicsApi() {
  return new Promise((resolve) => {
    document.addEventListener("comics-api-ready", () => resolve(), { once: true });
    setTimeout(() => {
      if (typeof ComicsApi !== "undefined") resolve();
    }, 12000);
  });
}

let allArtPieces = [];
let activeCategory = "All";

function normalizeCategory(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function pieceMatchesCategory(piece, category) {
  if (category === "All") return true;
  return normalizeCategory(piece.category) === normalizeCategory(category);
}

function renderArtList() {
  const list = document.getElementById("art-list");
  if (!list) return;

  const filtered = allArtPieces.filter((piece) => pieceMatchesCategory(piece, activeCategory));

  if (filtered.length === 0) {
    list.innerHTML =
      activeCategory === "All"
        ? "<li>No published art yet.</li>"
        : `<li>No art in “${activeCategory}” yet.</li>`;
    return;
  }

  list.replaceChildren();
  for (const piece of filtered) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = piece.href;
    a.textContent = piece.title;
    li.appendChild(a);

    const meta = document.createElement("span");
    meta.className = "catalog-meta";
    const categoryLabel = piece.category ? ` · ${piece.category}` : "";
    const artistLabel = piece.artistName ? ` — ${piece.artistName}` : "";
    meta.textContent = `${categoryLabel}${artistLabel}`;
    li.appendChild(meta);

    list.appendChild(li);
  }
}

async function loadArtList() {
  const list = document.getElementById("art-list");
  if (!list) return;

  try {
    allArtPieces = await ComicsApi.listPublicArt();
    renderArtList();
  } catch (err) {
    console.error("Failed to load art:", err);
    list.innerHTML = "<li>Could not load art list.</li>";
  }
}

function initCategoryFilter() {
  const bar = document.getElementById("category-bar");
  if (!bar) return;

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".category-btn");
    if (!btn) return;
    activeCategory = btn.textContent.trim() || "All";
    renderArtList();
  });

  document.addEventListener("category-change", (e) => {
    activeCategory = e.detail?.label ?? "All";
    renderArtList();
  });
}

async function bootArtList() {
  await waitForComicsApi();
  initCategoryFilter();
  await loadArtList();
}

bootArtList();
