(function () {
  const listEl = document.getElementById("sprites-list");
  const canvas = document.getElementById("sprites-canvas");
  const gifEl = document.getElementById("sprites-gif");
  const metaEl = document.getElementById("sprites-meta");
  const tagsEl = document.getElementById("sprites-tags");
  const dirStrip = document.getElementById("sprites-direction");
  const fpsSlider = document.getElementById("sprites-fps");
  const fpsOut = document.getElementById("sprites-fps-out");
  const fpsLabel = fpsSlider?.closest("label");
  const scaleSlider = document.getElementById("sprites-scale");
  const scaleOut = document.getElementById("sprites-scale-out");
  const cursorDot = document.getElementById("sprites-cursor-dot");
  if (!listEl || !canvas) return;

  const root = document.body.dataset.siteRoot ? `${document.body.dataset.siteRoot}/` : "";
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const DIRECTIONS = [
    { id: 0, label: "front", key: "front", arrows: ["ArrowDown", "s", "S"] },
    { id: 1, label: "left", key: "left", arrows: ["ArrowLeft", "a", "A"] },
    { id: 2, label: "back", key: "back", arrows: ["ArrowUp", "w", "W"] },
    { id: 3, label: "right", key: "right", arrows: ["ArrowRight", "d", "D"] },
  ];

  let sprites = [];
  let selected = null;
  let previewMode = "sheet";
  let sheet = new Image();
  let frameCol = 0;
  let direction = 0;
  let lastTs = 0;
  let playFps = 8;
  let displayScale = 4;
  let rafId = 0;
  let gifNaturalW = 0;
  let gifNaturalH = 0;

  function isGifEntry(raw) {
    if (raw.type === "gif" || raw.kind === "gif") return true;
    const src = String(raw.src || "").toLowerCase();
    return src.endsWith(".gif");
  }

  function normalizeEntry(raw) {
    const gif = isGifEntry(raw);
    const rows = Math.max(1, Number(raw.rows ?? (raw.frames && !raw.cols ? 1 : 4)) || 4);
    const cols = Math.max(1, Number(raw.cols ?? raw.frames ?? 4) || 4);
    return {
      ...raw,
      type: gif ? "gif" : raw.type || "sheet",
      rows,
      cols,
      frameWidth: Number(raw.frameWidth) || 0,
      frameHeight: Number(raw.frameHeight) || 0,
      fps: Number(raw.fps ?? 8),
      tags: Array.isArray(raw.tags) ? raw.tags : [],
    };
  }

  function assetUrl(entry) {
    const path = entry.src.replace(/^\//, "");
    const encoded = path.split("/").map((part) => encodeURIComponent(part)).join("/");
    return `${root}sprites/${encoded}`;
  }

  function setSpot(x, y) {
    document.body.style.setProperty("--spot-x", `${x}px`);
    document.body.style.setProperty("--spot-y", `${y}px`);
  }

  function setSheetUiVisible(on) {
    dirStrip?.classList.toggle("is-muted", !on);
    fpsLabel?.classList.toggle("is-muted", !on);
    if (!on && fpsOut) fpsOut.textContent = "—";
  }

  function syncDirectionUi() {
    if (!dirStrip) return;
    dirStrip.querySelectorAll(".sprites-dir-btn").forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.dir) === direction);
    });
  }

  function buildDirectionStrip() {
    if (!dirStrip) return;
    dirStrip.replaceChildren();
    for (const d of DIRECTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sprites-dir-btn";
      btn.dataset.dir = String(d.id);
      btn.textContent = d.label;
      btn.addEventListener("click", () => {
        if (previewMode !== "sheet") return;
        direction = d.id;
        frameCol = 0;
        syncDirectionUi();
        updateMeta();
        drawFrame();
      });
      dirStrip.appendChild(btn);
    }
    syncDirectionUi();
  }

  function applyAutoFrameSize(entry, img) {
    if (entry.frameWidth > 0 && entry.frameHeight > 0) return entry;
    return {
      ...entry,
      frameWidth: Math.floor(img.naturalWidth / entry.cols),
      frameHeight: Math.floor(img.naturalHeight / entry.rows),
    };
  }

  function updateMeta() {
    if (!metaEl || !selected) return;
    if (previewMode === "gif") {
      metaEl.textContent =
        `${selected.title} · ${gifNaturalW}×${gifNaturalH} · animated gif · zoom ${displayScale}×`;
      return;
    }
    const dir = DIRECTIONS[direction]?.label ?? `row ${direction}`;
    metaEl.textContent =
      `${selected.title} · ${selected.frameWidth}×${selected.frameHeight} · ` +
      `${selected.cols}×${selected.rows} grid · ${dir} · frame ${frameCol + 1}/${selected.cols}`;
  }

  function showSheetPreview() {
    previewMode = "sheet";
    canvas.hidden = false;
    if (gifEl) {
      gifEl.hidden = true;
      gifEl.removeAttribute("src");
    }
    setSheetUiVisible(true);
  }

  function showGifPreview(entry) {
    previewMode = "gif";
    canvas.hidden = true;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSheetUiVisible(false);
    if (!gifEl) return;
    const url = assetUrl(entry);
    gifEl.alt = entry.title || entry.id;
    gifEl.onload = () => {
      gifNaturalW = gifEl.naturalWidth;
      gifNaturalH = gifEl.naturalHeight;
      applyGifScale();
      updateMeta();
    };
    gifEl.onerror = () => {
      if (metaEl) metaEl.textContent = `could not load: ${entry.src}`;
    };
    gifEl.hidden = false;
    gifEl.src = url;
    applyGifScale();
    updateMeta();
  }

  function applyGifScale() {
    if (!gifEl || !gifNaturalW) return;
    gifEl.style.width = `${gifNaturalW * displayScale}px`;
    gifEl.style.maxWidth = "100%";
    gifEl.style.height = "auto";
  }

  function selectSprite(entryRaw) {
    const entry = normalizeEntry(entryRaw);
    selected = entry;
    frameCol = 0;
    direction = 0;
    playFps = entry.fps;
    listEl.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.id === entry.id);
    });
    if (fpsSlider) {
      fpsSlider.value = String(playFps);
      if (fpsOut) fpsOut.textContent = String(playFps);
    }
    if (tagsEl) {
      tagsEl.replaceChildren();
      entry.tags.forEach((tag) => {
        const span = document.createElement("span");
        span.className = "sprites-tag";
        span.textContent = tag;
        tagsEl.appendChild(span);
      });
    }
    syncDirectionUi();

    if (entry.type === "gif") {
      showGifPreview(entry);
      return;
    }

    showSheetPreview();
    const url = assetUrl(entry);
    sheet = new Image();
    sheet.decoding = "async";
    sheet.src = url;
    sheet.onload = () => {
      selected = applyAutoFrameSize(selected, sheet);
      resizeCanvas();
      updateMeta();
      drawFrame();
    };
    sheet.onerror = () => {
      if (metaEl) metaEl.textContent = `could not load: ${entry.src}`;
    };
    updateMeta();
  }

  function resizeCanvas() {
    if (!selected || previewMode !== "sheet") return;
    const fw = selected.frameWidth;
    const fh = selected.frameHeight;
    canvas.width = fw * displayScale;
    canvas.height = fh * displayScale;
    canvas.style.width = `${fw * displayScale}px`;
    canvas.style.height = `${fh * displayScale}px`;
  }

  function drawFrame() {
    if (!selected || !ctx || previewMode !== "sheet") return;
    const fw = selected.frameWidth;
    const fh = selected.frameHeight;
    const row = Math.min(direction, selected.rows - 1);
    const col = frameCol % selected.cols;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sheet.complete && sheet.naturalWidth > 0 && fw > 0 && fh > 0) {
      const sx = col * fw;
      const sy = row * fh;
      ctx.drawImage(sheet, sx, sy, fw, fh, 0, 0, canvas.width, canvas.height);
    }
  }

  function setDirection(dir) {
    if (previewMode !== "sheet") return;
    const maxDir = Math.min(3, selected?.rows - 1 ?? 3);
    direction = Math.max(0, Math.min(maxDir, dir));
    frameCol = 0;
    syncDirectionUi();
    updateMeta();
    drawFrame();
  }

  function tick(ts) {
    if (previewMode === "sheet" && selected && !reduceMotion && playFps > 0 && selected.cols > 1) {
      const interval = 1000 / playFps;
      if (ts - lastTs >= interval) {
        frameCol = (frameCol + 1) % selected.cols;
        lastTs = ts;
        drawFrame();
        updateMeta();
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function renderList() {
    listEl.replaceChildren();
    if (!sprites.length) {
      const li = document.createElement("li");
      li.className = "sprites-empty";
      li.textContent = "no sprites in manifest — add entries to data/sprites.json";
      listEl.appendChild(li);
      return;
    }
    for (const raw of sprites) {
      const entry = normalizeEntry(raw);
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.id = entry.id;
      btn.textContent = entry.title || entry.id;
      btn.addEventListener("click", () => selectSprite(entry));
      li.appendChild(btn);
      listEl.appendChild(li);
    }
    selectSprite(normalizeEntry(sprites[0]));
  }

  fpsSlider?.addEventListener("input", () => {
    playFps = Number(fpsSlider.value) || 8;
    if (fpsOut) fpsOut.textContent = String(playFps);
  });

  scaleSlider?.addEventListener("input", () => {
    displayScale = Number(scaleSlider.value) || 4;
    if (scaleOut) scaleOut.textContent = `${displayScale}×`;
    if (previewMode === "gif") applyGifScale();
    else {
      resizeCanvas();
      drawFrame();
    }
    updateMeta();
  });

  if (!reduceMotion && cursorDot) {
    window.addEventListener(
      "pointermove",
      (e) => {
        cursorDot.style.left = `${e.clientX}px`;
        cursorDot.style.top = `${e.clientY}px`;
        setSpot(e.clientX, e.clientY);
      },
      { passive: true }
    );
  }

  window.addEventListener("keydown", (e) => {
    if (!selected || previewMode !== "sheet" || e.altKey || e.ctrlKey || e.metaKey) return;
    for (const d of DIRECTIONS) {
      if (d.arrows.includes(e.key)) {
        e.preventDefault();
        setDirection(d.id);
        return;
      }
    }
  });

  async function load() {
    try {
      const res = await fetch(`${root}data/sprites.json`);
      if (!res.ok) throw new Error("manifest missing");
      const data = await res.json();
      sprites = Array.isArray(data.sprites) ? data.sprites : [];
    } catch {
      sprites = [];
    }
    buildDirectionStrip();
    renderList();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  load();
})();