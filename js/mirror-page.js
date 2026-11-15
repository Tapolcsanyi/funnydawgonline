(function () {
  const eye = document.getElementById("mirror-eye");
  const pupil = document.getElementById("mirror-pupil");
  const veil = document.getElementById("cursor-veil");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let ex = mx;
  let ey = my;

  function setVars(x, y) {
    document.body.style.setProperty("--mx", `${x}px`);
    document.body.style.setProperty("--my", `${y}px`);
  }

  function tick() {
    ex += (mx - ex) * 0.18;
    ey += (my - ey) * 0.18;
    if (eye) {
      eye.style.left = `${ex}px`;
      eye.style.top = `${ey}px`;
    }
    if (pupil && eye) {
      const dx = mx - ex;
      const dy = my - ey;
      const max = 10;
      const dist = Math.hypot(dx, dy) || 1;
      const px = (dx / dist) * Math.min(max, dist * 0.35);
      const py = (dy / dist) * Math.min(max, dist * 0.35);
      pupil.style.transform = `translate(${px}px, ${py}px)`;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      setVars(mx, my);
    },
    { passive: true }
  );

  setVars(mx, my);
  tick();
})();