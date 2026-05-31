function waitForComicsApi() {
  return new Promise((resolve) => {
    document.addEventListener("comics-api-ready", () => resolve(), { once: true });
    setTimeout(() => {
      if (typeof ComicsApi !== "undefined") resolve();
    }, 12000);
  });
}

async function loadArtView() {
  const mount = document.getElementById("art-view-content");
  if (!mount) return;

  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const id = params.get("id");
  if (!slug && !id) {
    mount.innerHTML = "<p class='media-error'>No art piece specified.</p>";
    return;
  }

  await waitForComicsApi();

  try {
    const piece = await ComicsApi.getArtForViewer({ slug, id });
    if (!piece) {
      mount.innerHTML =
        "<p class='media-error'>This art is not available. Published pieces are public; drafts are only visible to the creator who is signed in.</p>";
      return;
    }

    document.title = `${piece.title} — Art — FUNNY DAWG ONLINE`;
    mount.replaceChildren();

    const h1 = document.createElement("h1");
    h1.textContent = piece.title;
    const img = document.createElement("img");
    img.className = "edit-preview-image art-view-image";
    img.src = piece.imageUrl;
    img.alt = piece.title;

    mount.append(h1, img);

    if (piece.isDraft) {
      const draftNote = document.createElement("p");
      draftNote.className = "publish-status-banner publish-status-banner--draft";
      draftNote.textContent = "Draft preview — only you can see this while signed in.";
      mount.appendChild(draftNote);
    }

    const metaParts = [];
    if (piece.category) metaParts.push(piece.category);
    if (piece.artistName) metaParts.push(piece.artistName);
    if (metaParts.length) {
      const meta = document.createElement("p");
      meta.className = "catalog-meta";
      meta.textContent = metaParts.join(" — ");
      mount.appendChild(meta);
    }
  } catch (err) {
    mount.innerHTML = `<p class="media-error">${err.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadArtView);
