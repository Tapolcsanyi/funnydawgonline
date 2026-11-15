(function () {
  const canvas = document.getElementById("sprites-ambient-canvas");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let mx = 0;
  let my = 0;
  let hasPointer = false;
  let rafId = 0;

  const HALO_RADIUS = 165;
  const GRID = 4;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.floor(window.innerWidth * dpr);
    h = Math.floor(window.innerHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!hasPointer) {
      mx = w * 0.5;
      my = h * 0.45;
    }
  }

  function drawGrid() {
    ctx.fillStyle = "#060a06";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += GRID) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += GRID) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
  }

  function drawHalo() {
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, HALO_RADIUS);
    g.addColorStop(0, "rgba(160, 210, 150, 0.58)");
    g.addColorStop(0.18, "rgba(110, 175, 105, 0.32)");
    g.addColorStop(0.42, "rgba(55, 120, 60, 0.14)");
    g.addColorStop(0.68, "rgba(25, 55, 30, 0.04)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function frame() {
    drawGrid();
    drawHalo();
    rafId = requestAnimationFrame(frame);
  }

  function onPointerMove(e) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    hasPointer = true;
    mx = e.clientX * dpr;
    my = e.clientY * dpr;
    if (reduceMotion) {
      drawGrid();
      drawHalo();
    }
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  if (reduceMotion) {
    drawGrid();
    drawHalo();
    return;
  }

  rafId = requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      return;
    }
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);
  });
})();