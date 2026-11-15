(function () {
  const textMain = document.getElementById("god-circuit-wall");
  const gridEl = document.getElementById("god-circuit-grid");
  if (!textMain || !gridEl) return;

  const root = document.body.dataset.siteRoot ? `${document.body.dataset.siteRoot}/` : "../";

  const passage =
    "An incredible lucky discovery has led us to develop a 'God Circuit' of sorts. Somehow the BP model was able to force virtual particle fluctuations inside of the material envelope. It is currently unclear what affects this may have on the vacuum vessel.";

  function fillText(repeatCount) {
    const n = Math.max(1, Math.min(24, Number(repeatCount) || 4));
    textMain.replaceChildren();
    for (let i = 0; i < n; i++) {
      const block = document.createElement("p");
      block.textContent = passage;
      textMain.appendChild(block);
    }
  }

  function resolveAsset(src) {
    if (!src) return "";
    if (/^https?:\/\//i.test(src) || src.startsWith("../")) return src;
    const path = src.replace(/^\//, "");
    const encoded = path.split("/").map((part) => encodeURIComponent(part)).join("/");
    return `${root}god-circuit/${encoded}`;
  }

  function buildGrid(cfg) {
    const size = Number(cfg.gridSize) || 10;
    const row = Number(cfg.vantexCell?.row ?? 7);
    const col = Number(cfg.vantexCell?.col ?? 7);
    const vantexHref = cfg.vantexHref || "vantex/index.html";
    const imgSrc = resolveAsset(cfg.gridImage || cfg.vantexImage || "assets/frame4.png");
    const links = Array.isArray(cfg.externalLinks) ? cfg.externalLinks : [];

    gridEl.replaceChildren();
    gridEl.style.setProperty("--gc-cols", String(size));
    let linkIdx = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const a = document.createElement("a");
        a.className = "god-circuit-grid-btn";
        const img = document.createElement("img");
        img.alt = "";
        img.decoding = "async";
        img.loading = "lazy";
        img.src = imgSrc;

        if (r === row && c === col) {
          a.href = vantexHref;
        } else {
          const href = links[linkIdx % Math.max(links.length, 1)] || "#";
          linkIdx += 1;
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }

        a.appendChild(img);
        gridEl.appendChild(a);
      }
    }
  }

  async function init() {
    let cfg = {};
    try {
      const res = await fetch(`${root}data/god-circuit-grid.json`);
      if (res.ok) cfg = await res.json();
    } catch {
      /* defaults */
    }
    fillText(cfg.passageRepeat);
    buildGrid(cfg);
  }

  init();
})();