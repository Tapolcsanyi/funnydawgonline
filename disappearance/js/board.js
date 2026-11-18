(function () {
  const root = getComputedStyle(document.documentElement);
  const readPx = (name, fallback) => {
    const raw = root.getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const ZOOM = readPx("--mag-zoom", 1.55);
  const LENS = readPx("--mag-lens-size", 280);

  const wrapFolder = document.querySelector(".case-folder-wrap");
  const folderEl = document.getElementById("case-folder");
  const stack = document.getElementById("folder-stack");
  const reader = document.getElementById("folder-reader");
  const backBtn = document.getElementById("sheet-back");
  const stackPages = stack ? [...stack.querySelectorAll(".stack-page")] : [];
  const sheets = document.querySelectorAll(".folder-sheet");
  let activeId = null;
  let focusIndex = 0;

  function hideAllSheets() {
    sheets.forEach((s) => {
      s.hidden = true;
    });
  }

  function setStackFocus(index) {
    if (!stackPages.length) return;
    focusIndex = ((index % stackPages.length) + stackPages.length) % stackPages.length;
    stackPages.forEach((btn, i) => {
      btn.classList.toggle("is-focused", i === focusIndex);
    });
  }

  function openSheet(id) {
    if (!id || !reader) return;
    const sheet = document.querySelector(`.folder-sheet[data-sheet="${id}"]`);
    if (!sheet) return;

    hideAllSheets();
    sheet.hidden = false;
    activeId = id;
    reader.hidden = false;
    wrapFolder?.classList.add("is-reading");
    folderEl?.classList.add("can-dismiss");

    stackPages.forEach((btn) => {
      btn.classList.toggle("is-pulled-away", btn.dataset.sheet === id);
    });

    initMagnifiers();
  }

  function closeReader() {
    hideAllSheets();
    activeId = null;
    if (reader) reader.hidden = true;
    wrapFolder?.classList.remove("is-reading");
    folderEl?.classList.remove("can-dismiss");
    stackPages.forEach((btn) => btn.classList.remove("is-pulled-away"));
  }

  stackPages.forEach((btn, index) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.sheet;
      if (activeId === id) {
        closeReader();
        return;
      }
      openSheet(id);
    });
    btn.addEventListener("mouseenter", () => setStackFocus(index));
  });

  stack?.addEventListener(
    "wheel",
    (e) => {
      if (wrapFolder?.classList.contains("is-reading")) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      setStackFocus(focusIndex + delta);
    },
    { passive: false }
  );

  stack?.addEventListener("mouseleave", () => {
    stackPages.forEach((btn) => btn.classList.remove("is-focused"));
  });

  folderEl?.addEventListener("click", () => {
    if (activeId) closeReader();
  });

  backBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeReader();
  });

  function clickInsideOpenPage(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(".folder-sheet") ||
        target.closest(".sheet-back") ||
        target.closest(".stack-page")
    );
  }

  function tryDismissFromBackground(e) {
    if (!activeId) return;
    if (clickInsideOpenPage(e.target)) return;
    closeReader();
  }

  reader?.addEventListener("click", tryDismissFromBackground);
  wrapFolder?.addEventListener("click", tryDismissFromBackground);
  document.querySelector(".desk-room")?.addEventListener("click", tryDismissFromBackground);

  setStackFocus(0);

  const magnifierBound = new WeakSet();

  function bindMagnifier(wrap) {
    if (magnifierBound.has(wrap)) return;
    const img = wrap.querySelector("img");
    const lens = wrap.querySelector(".mag-lens");
    if (!img || !lens) return;

    magnifierBound.add(wrap);
    const src = img.currentSrc || img.src;
    lens.style.setProperty("--lens-size", `${LENS}px`);

    function primeLens() {
      if (!img.complete || !img.naturalWidth) return;
      lens.style.backgroundImage = `url("${src}")`;
    }

    if (img.complete) primeLens();
    else img.addEventListener("load", primeLens, { once: true });

    function placeLens(clientX, clientY) {
      const rect = wrap.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        wrap.classList.remove("is-active");
        lens.classList.remove("is-on");
        return;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const rw = rect.width;
      const rh = rect.height;
      const relX = x / rw;
      const relY = y / rh;
      const bgW = rw * ZOOM;
      const bgH = rh * ZOOM;

      lens.style.left = `${x}px`;
      lens.style.top = `${y}px`;
      lens.style.backgroundSize = `${bgW}px ${bgH}px`;
      lens.style.backgroundPosition = `${LENS / 2 - relX * bgW}px ${LENS / 2 - relY * bgH}px`;

      wrap.classList.add("is-active");
      lens.classList.add("is-on");
    }

    function hideLens() {
      wrap.classList.remove("is-active");
      lens.classList.remove("is-on");
    }

    wrap.addEventListener("mousemove", (e) => placeLens(e.clientX, e.clientY));
    wrap.addEventListener("mouseleave", hideLens);
    wrap.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (!t) return;
        placeLens(t.clientX, t.clientY);
      },
      { passive: true }
    );
    wrap.addEventListener("touchend", hideLens);
    wrap.addEventListener("touchcancel", hideLens);
  }

  function initMagnifiers() {
    document.querySelectorAll(".ledger-mag[data-mag]").forEach(bindMagnifier);
  }

  initMagnifiers();
})();