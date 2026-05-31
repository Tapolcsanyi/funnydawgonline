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
  const base = document.body.dataset.siteRoot ? `${document.body.dataset.siteRoot}/` : "";
  const placeholderCover = `${base}funnydawgonline-icon.png`;

  if (filtered.length === 0) {
    list.innerHTML =
      activeCategory === "All"
        ? '<li class="art-catalog-empty">No published art yet.</li>'
        : `<li class="art-catalog-empty">No art in “${activeCategory}” yet.</li>`;
    return;
  }

  list.replaceChildren();
  for (const piece of filtered) {
    const li = document.createElement("li");
    li.className = "art-catalog-item";

    const entry = document.createElement("a");
    entry.className = "comics-catalog-entry";
    entry.href = piece.href;

    const title = document.createElement("span");
    title.className = "comics-catalog-title";
    title.textContent = piece.title;
    entry.appendChild(title);

    const artist = document.createElement("span");
    artist.className = "catalog-meta comics-catalog-artist";
    artist.textContent = piece.artistName?.trim() || "Unknown artist";
    entry.appendChild(artist);

    const hasImage = Boolean(piece.imageUrl);
    const thumb = document.createElement("img");
    thumb.className = "comics-catalog-cover";
    if (!hasImage) thumb.classList.add("comics-catalog-cover--placeholder");
    thumb.src = hasImage ? piece.imageUrl : placeholderCover;
    thumb.alt = hasImage ? piece.title : "";
    thumb.loading = "lazy";
    thumb.decoding = "async";
    entry.appendChild(thumb);

    li.appendChild(entry);

    if (piece.category) {
      const meta = document.createElement("p");
      meta.className = "catalog-meta comics-catalog-meta";
      meta.textContent = piece.category;
      li.appendChild(meta);
    }

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
    list.innerHTML = '<li class="art-catalog-empty">Could not load art list.</li>';
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
