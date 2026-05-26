let activeCarouselController = null;

function resolveAssetPath(src, base) {
  if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
  return `${base}${src}`;
}

function getVolumeIds() {
  const seriesId = document.body.getAttribute("data-series-id");
  const volumeId = document.body.getAttribute("data-volume-id");
  if (seriesId !== null && seriesId !== "" && volumeId !== null && volumeId !== "") {
    return { seriesId: String(seriesId), volumeId: String(volumeId) };
  }
  const fromPath = ComicsDb.readSeriesVolumeFromPath();
  return fromPath || null;
}

async function loadArtFromDatabase(rawId, base) {
  const response = await fetch(`${base}data/art.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const database = await response.json();
  const layoutMap = ComicsDb.buildLayoutMap(database.layouts);
  const id = String(rawId);
  const art = database.art ?? {};
  const piece = Array.isArray(art) ? art.find((entry) => String(entry.id) === id) : art[id];
  if (!piece) throw new Error(`Art not found: ${id}`);

  const layout = layoutMap.has(piece.layout) ? piece.layout : "top-to-bottom";
  const layoutMeta = layoutMap.get(layout);
  return {
    title: piece.title,
    artistName: piece.artistName ?? "",
    layout,
    layoutLabel: layoutMeta?.label ?? layout.replace(/-/g, " "),
    viewerConfig: ComicsDb.buildViewerConfig(layout, layoutMap),
    images: piece.images ?? [],
  };
}

function createImageElement(image, fallbackAlt, base, eager = false) {
  const img = document.createElement("img");
  img.src = resolveAssetPath(image.src, base);
  img.alt = image.alt || fallbackAlt;
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  img.classList.add("media-image", "media-image--pixel");
  return img;
}

function createVolumeNavLink(volume, direction) {
  if (!volume) return null;
  const link = document.createElement("a");
  link.className = `volume-nav volume-nav--${direction}`;
  link.href = volume.href;
  link.textContent =
    direction === "prev" ? `← Previous: ${volume.title}` : `Next: ${volume.title} →`;
  return link;
}

function appendVolumeNav(container, data, direction) {
  const volume = direction === "prev" ? data.prevVolume : data.nextVolume;
  const link = createVolumeNavLink(volume, direction);
  if (link) container.appendChild(link);
}

function renderStackedViewer(viewer, data, base, viewerConfig) {
  viewer.className = `media-viewer media-viewer--stacked media-viewer--${viewerConfig.layoutId}`;
  viewer.replaceChildren();

  appendVolumeNav(viewer, data, "prev");

  const ordered = viewerConfig.reverseStack ? [...data.images].reverse() : data.images;
  for (const image of ordered) {
    const img = createImageElement(image, data.title, base);
    viewer.appendChild(img);
  }

  appendVolumeNav(viewer, data, "next");
}

function scrollPageToBottom() {
  window.scrollTo(0, document.documentElement.scrollHeight);
}

function scrollToBottomAfterImagesLoad(viewer) {
  const images = Array.from(viewer.querySelectorAll("img"));
  if (images.length === 0) {
    scrollPageToBottom();
    return;
  }

  const waitForImage = (img) =>
    new Promise((resolve) => {
      if (img.complete) {
        resolve();
        return;
      }
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });

  // Scroll now and again after assets settle so final height is respected.
  scrollPageToBottom();
  Promise.allSettled(images.map(waitForImage)).then(() => {
    requestAnimationFrame(scrollPageToBottom);
  });
}

function addSwipeNavigation(target, onPrev, onNext) {
  let startX = 0;
  let startY = 0;
  const minDistance = 35;

  target.addEventListener(
    "touchstart",
    (event) => {
      const t = event.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    },
    { passive: true }
  );

  target.addEventListener(
    "touchend",
    (event) => {
      if (!event.changedTouches.length) return;
      const t = event.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy)) return;
      if (dx > 0) onPrev();
      else onNext();
    },
    { passive: true }
  );
}

function createCarouselController(root, ordered, base, title, carouselRtl = false) {
  let index = 0;
  let modalOpen = false;

  const frame = root.querySelector(".media-carousel-frame");
  const image = root.querySelector(".media-carousel-image");
  const prevBtn = root.querySelector(".media-carousel-btn--prev");
  const nextBtn = root.querySelector(".media-carousel-btn--next");
  const status = root.querySelector(".media-carousel-status");
  const modal = root.querySelector(".media-modal");
  const modalImage = root.querySelector(".media-modal-image");
  const modalStatus = root.querySelector(".media-modal-status");
  const modalPrev = root.querySelector(".media-modal-btn--prev");
  const modalNext = root.querySelector(".media-modal-btn--next");
  const modalClose = root.querySelector(".media-modal-close");
  const modalFullscreen = root.querySelector(".media-modal-fullscreen");
  const thumbs = root.querySelectorAll(".media-thumb");

  const setImage = () => {
    const item = ordered[index];
    image.src = resolveAssetPath(item.src, base);
    image.alt = item.alt || title;
    modalImage.src = image.src;
    modalImage.alt = image.alt;
    status.textContent = `${index + 1} / ${ordered.length}`;
    modalStatus.textContent = status.textContent;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === ordered.length - 1;
    modalPrev.disabled = prevBtn.disabled;
    modalNext.disabled = nextBtn.disabled;
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle("is-active", i === index);
    });
  };

  const goPrev = () => {
    if (index === 0) return;
    index -= 1;
    setImage();
  };

  const goNext = () => {
    if (index >= ordered.length - 1) return;
    index += 1;
    setImage();
  };

  const goArrowLeft = () => {
    if (carouselRtl) goNext();
    else goPrev();
  };

  const goArrowRight = () => {
    if (carouselRtl) goPrev();
    else goNext();
  };

  const modalHome = { parent: modal.parentNode, next: modal.nextSibling };

  const restoreModalHome = () => {
    if (!modalHome.parent || modal.parentNode === modalHome.parent) return;
    if (modalHome.next) {
      modalHome.parent.insertBefore(modal, modalHome.next);
    } else {
      modalHome.parent.appendChild(modal);
    }
  };

  const openModal = () => {
    if (modal.parentNode !== document.body) {
      document.body.appendChild(modal);
    }
    modal.hidden = false;
    modalOpen = true;
    document.body.classList.add("media-modal-open");
    setImage();
  };

  const closeModal = () => {
    modal.hidden = true;
    modalOpen = false;
    document.body.classList.remove("media-modal-open");
    restoreModalHome();
  };

  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);
  modalPrev.addEventListener("click", goPrev);
  modalNext.addEventListener("click", goNext);
  image.addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      index = i;
      setImage();
    });
  });

  addSwipeNavigation(frame, goPrev, goNext);
  addSwipeNavigation(modal, goPrev, goNext);

  const clickZones = root.querySelectorAll("[data-carousel-zone]");
  clickZones.forEach((zone) => {
    zone.addEventListener("click", () => {
      if (zone.dataset.carouselZone === "prev") goPrev();
      else goNext();
    });
  });

  modalFullscreen.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await modalImage.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen unavailable:", error);
    }
  });

  return {
    setImage,
    onKeydown(event) {
      if (!modalOpen && !root.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }
      if (event.key === "ArrowLeft") {
        goArrowLeft();
        event.preventDefault();
      } else if (event.key === "ArrowRight") {
        goArrowRight();
        event.preventDefault();
      } else if (event.key === "Escape" && modalOpen) {
        closeModal();
        event.preventDefault();
      } else if (event.key.toLowerCase() === "f" && modalOpen) {
        modalFullscreen.click();
        event.preventDefault();
      }
    },
    destroy() {
      closeModal();
    },
  };
}

function renderCarouselViewer(viewer, data, base, viewerConfig) {
  viewer.className = `media-viewer media-viewer--carousel media-viewer--${viewerConfig.layoutId}`;
  viewer.replaceChildren();

  const ordered = data.images;
  const wrap = document.createElement("div");
  wrap.className = "media-carousel-wrap";
  wrap.innerHTML = `
    <div class="media-carousel-frame">
      <button type="button" class="media-tap-zone media-tap-zone--prev" data-carousel-zone="prev" aria-label="Previous page"></button>
      <img class="media-carousel-image media-image media-image--pixel" alt="" />
      <button type="button" class="media-tap-zone media-tap-zone--next" data-carousel-zone="next" aria-label="Next page"></button>
    </div>
    <div class="media-carousel-controls">
      <button type="button" class="media-carousel-btn media-carousel-btn--prev">← Prev</button>
      <span class="media-carousel-status"></span>
      <div class="media-carousel-right-actions">
        <button type="button" class="media-carousel-btn media-carousel-btn--modal">Open viewer</button>
        <button type="button" class="media-carousel-btn media-carousel-btn--next">Next →</button>
      </div>
    </div>
    <div class="media-modal" hidden>
      <div class="media-modal-inner">
        <div class="media-modal-toolbar">
          <span class="media-modal-status"></span>
          <div class="media-modal-actions">
            <button type="button" class="media-carousel-btn media-modal-fullscreen">Fullscreen</button>
            <button type="button" class="media-carousel-btn media-modal-close">Close ✕</button>
          </div>
        </div>
        <div class="media-modal-frame">
          <button type="button" class="media-tap-zone media-tap-zone--prev" data-carousel-zone="prev" aria-label="Previous page"></button>
          <img class="media-modal-image media-image media-image--pixel" alt="" />
          <button type="button" class="media-tap-zone media-tap-zone--next" data-carousel-zone="next" aria-label="Next page"></button>
          <button type="button" class="media-modal-btn media-modal-btn--prev">←</button>
          <button type="button" class="media-modal-btn media-modal-btn--next">→</button>
        </div>
        <div class="media-modal-thumbs"></div>
      </div>
    </div>
  `;
  appendVolumeNav(viewer, data, "prev");
  viewer.appendChild(wrap);
  appendVolumeNav(viewer, data, "next");

  const modalEl = wrap.querySelector(".media-modal");
  if (viewerConfig.carouselRtl) {
    modalEl?.classList.add("media-modal--right-to-left");
    const prevText = wrap.querySelector(".media-carousel-btn--prev");
    const nextText = wrap.querySelector(".media-carousel-btn--next");
    const modalPrev = wrap.querySelector(".media-modal-btn--prev");
    const modalNext = wrap.querySelector(".media-modal-btn--next");
    if (prevText) prevText.textContent = "Prev →";
    if (nextText) nextText.textContent = "← Next";
    if (modalPrev) modalPrev.textContent = "→";
    if (modalNext) modalNext.textContent = "←";
  }

  const thumbsContainer = wrap.querySelector(".media-modal-thumbs");
  ordered.forEach((item, i) => {
    const thumb = document.createElement("img");
    thumb.className = "media-thumb media-image media-image--pixel";
    thumb.src = resolveAssetPath(item.src, base);
    thumb.alt = item.alt || `${data.title} preview ${i + 1}`;
    thumb.loading = "lazy";
    thumb.decoding = "async";
    thumbsContainer.appendChild(thumb);
  });

  const openBtn = wrap.querySelector(".media-carousel-btn--modal");
  openBtn.addEventListener("click", () => {
    wrap.querySelector(".media-carousel-image").click();
  });

  if (activeCarouselController) {
    activeCarouselController.destroy();
  }
  activeCarouselController = createCarouselController(
    wrap,
    ordered,
    base,
    data.title,
    viewerConfig.carouselRtl
  );
  activeCarouselController.setImage();
}

function renderViewer(viewer, data, base) {
  if (data.images.length === 0) {
    viewer.className = "media-viewer";
    viewer.replaceChildren();
    appendVolumeNav(viewer, data, "prev");
    const empty = document.createElement("p");
    empty.className = "media-empty";
    empty.textContent = "No pages yet.";
    viewer.appendChild(empty);
    appendVolumeNav(viewer, data, "next");
    return;
  }

  if (activeCarouselController) {
    activeCarouselController.destroy();
    activeCarouselController = null;
  }

  const viewerConfig =
    data.viewerConfig ?? ComicsDb.buildViewerConfig(data.layout, ComicsDb.buildLayoutMap([]));

  if (viewerConfig.mode === "carousel") {
    renderCarouselViewer(viewer, data, base, viewerConfig);
  } else {
    renderStackedViewer(viewer, data, base, viewerConfig);
  }
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
      Object.assign(data, ComicsDb.getVolumeAdjacency(db, ids.seriesId, ids.volumeId, base));
    }

    document.title = `${data.title} — FUNNY DAWG ONLINE`;
    if (header) {
      const titleEl = header.querySelector("h1");
      const artistEl = header.querySelector("#media-artist");
      const layoutEl = header.querySelector("#media-layout-label");
      const seriesEl = header.querySelector("#media-series-label");
      if (titleEl) titleEl.textContent = data.title;
      if (artistEl) artistEl.textContent = data.artistName ?? "";
      if (layoutEl) layoutEl.textContent = `Reading order: ${data.layoutLabel}`;
      if (seriesEl && data.seriesTitle) {
        seriesEl.textContent = data.seriesTitle;
        seriesEl.hidden = false;
      }
    }

    renderViewer(viewer, data, base);
    if (data.viewerConfig?.scrollToBottomOnLoad) {
      requestAnimationFrame(() => scrollToBottomAfterImagesLoad(viewer));
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

document.addEventListener("keydown", (event) => {
  if (!activeCarouselController) return;
  activeCarouselController.onKeydown(event);
});

loadMediaViewer();
