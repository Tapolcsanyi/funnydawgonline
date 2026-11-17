(function () {
  const WHISPER = "it knows you are watching ";
  const whisperEl = document.getElementById("entity-whisper");

  function fillWhisper() {
    if (!whisperEl) return;
    const w = window.innerWidth || 800;
    const h = window.innerHeight || 600;
    const cols = Math.max(12, Math.ceil(w / 7));
    const rows = Math.max(12, Math.ceil(h / 16));
    const chars = cols * rows;
    const repeats = Math.ceil(chars / WHISPER.length) + 24;
    whisperEl.textContent = WHISPER.repeat(repeats);
  }

  fillWhisper();
  window.addEventListener("resize", fillWhisper);

  const breathEl = document.getElementById("entity-breath");
  const ambientEl = document.getElementById("entity-ambient");
  if (!breathEl || !ambientEl) return;

  const AMBIENT_EVERY_MS = 45_000;
  let started = false;
  let ambientTimer = 0;

  async function startAudio() {
    if (started) return;
    started = true;
    breathEl.loop = true;
    try {
      await breathEl.play();
    } catch {
      /* needs gesture */
    }
    playAmbientOnce();
    ambientTimer = window.setInterval(playAmbientOnce, AMBIENT_EVERY_MS);
  }

  async function playAmbientOnce() {
    if (!started) return;
    try {
      ambientEl.pause();
      ambientEl.currentTime = 0;
      await ambientEl.play();
    } catch {
      /* ignore */
    }
  }

  function bindUnlock() {
    const unlock = () => {
      startAudio();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    startAudio();
  }

  function stopAll() {
    window.clearInterval(ambientTimer);
    breathEl.pause();
    ambientEl.pause();
  }

  bindUnlock();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      breathEl.pause();
      ambientEl.pause();
    } else if (started) {
      breathEl.play().catch(() => {});
    }
  });
})();