(function () {
  const backdrop = document.getElementById("eyes-backdrop");
  const centerImg = document.getElementById("eyes-center-img");
  const centerLink = document.getElementById("eyes-center-link");
  if (!backdrop) return;

  const root = document.body.dataset.siteRoot ? `${document.body.dataset.siteRoot}/` : "";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let backgrounds = [];
  let strobeTimer = 0;
  let strobeCfg = { minMs: 70, maxMs: 200 };

  function assetUrl(src) {
    const path = src.replace(/^\//, "");
    const encoded = path.split("/").map((part) => encodeURIComponent(part)).join("/");
    return `${root}eyes/${encoded}`;
  }

  function applyWallpaper(bg) {
    if (!bg) return;
    document.body.classList.remove("eyes-solid-flash");
    document.body.style.backgroundColor = bg.base || "#000";
    backdrop.style.backgroundColor = bg.base || "#000";
    backdrop.style.backgroundImage = `url("${assetUrl(bg.src)}")`;
    backdrop.style.backgroundRepeat = bg.repeat || "repeat";
    backdrop.style.backgroundSize = bg.size || "auto";
    backdrop.style.backgroundPosition = bg.position || "0 0";
  }

  function applySolid(color) {
    document.body.classList.add("eyes-solid-flash");
    document.body.style.backgroundColor = color;
    backdrop.style.backgroundColor = color;
    backdrop.style.backgroundImage = "none";
  }

  function randomMs() {
    const min = Math.max(40, Number(strobeCfg.minMs) || 70);
    const max = Math.max(min, Number(strobeCfg.maxMs) || 200);
    return min + Math.random() * (max - min);
  }

  function pickStrobeFrame() {
    const choices = [
      ...backgrounds.map((bg) => ({ kind: "wall", bg })),
      { kind: "solid", color: "#000000" },
      { kind: "solid", color: "#ffffff" },
    ];
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function showFrame(frame) {
    if (!frame) return;
    if (frame.kind === "solid") applySolid(frame.color);
    else applyWallpaper(frame.bg);
  }

  function strobeStep() {
    if (document.hidden) {
      strobeTimer = window.setTimeout(strobeStep, 250);
      return;
    }
    showFrame(pickStrobeFrame());
    strobeTimer = window.setTimeout(strobeStep, randomMs());
  }

  function startStrobe() {
    window.clearTimeout(strobeTimer);
    strobeStep();
  }

  function stopStrobe() {
    window.clearTimeout(strobeTimer);
    strobeTimer = 0;
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      stopStrobe();
      window.location.href = root || "../";
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!reduceMotion && backgrounds.length) startStrobe();
  });

  function applyCenter(center) {
    if (!centerImg || !center?.src) return;
    if (centerLink && center.href) centerLink.href = center.href;
    centerImg.src = assetUrl(center.src);
    if (center.size) {
      document.documentElement.style.setProperty("--eyes-center-size", center.size);
    }
    const sec = Number(center.rotateSec);
    if (sec > 0) {
      document.documentElement.style.setProperty("--eyes-rotate-sec", `${sec}s`);
    }
  }

  async function load() {
    let data = { backgrounds: [], default: "solar", strobe: {} };
    try {
      const res = await fetch(`${root}data/eyes.json`);
      if (res.ok) data = await res.json();
    } catch {
      /* empty */
    }
    applyCenter(data.center);
    backgrounds = Array.isArray(data.backgrounds) ? data.backgrounds : [];
    if (data.strobe && typeof data.strobe === "object") {
      strobeCfg = { ...strobeCfg, ...data.strobe };
    }

    if (!backgrounds.length) {
      applySolid("#000000");
      return;
    }

    if (reduceMotion) {
      const still =
        backgrounds.find((b) => b.id === data.default) || backgrounds[0];
      applyWallpaper(still);
      return;
    }

    startStrobe();
  }

  load();
})();