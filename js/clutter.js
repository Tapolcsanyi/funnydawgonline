let hitCounterInterval = null;

function initClutter() {
  const box = document.querySelector(".box");
  if (!box || box.dataset.clutterReady) return;
  box.dataset.clutterReady = "true";

  const root = document.body.dataset.siteRoot || "";
  const base = root ? `${root}/` : "";
  const isMobile = window.matchMedia("(max-width: 700px)").matches;

  if (isMobile) {
    document.body.classList.add("is-mobile");
  }

  box.classList.add("box--crowded");

  const marqueeText = isMobile
    ? "★ FUNNY DAWG ONLINE ★ COMICS ★ ART ★ "
    : "★ FUNNY DAWG ONLINE ★ COMICS ★ ART ★ MARRVENTURE ZONE ★ BE NICE 2 INTERNET ★ " +
      "★ FUNNY DAWG ONLINE ★ COMICS ★ ART ★ MARRVENTURE ZONE ★ BE NICE 2 INTERNET ★ ";

  const marquee = document.createElement("div");
  marquee.className = "marquee-strip";
  marquee.setAttribute("aria-hidden", "true");
  marquee.innerHTML = `<div class="marquee-track"><span>${marqueeText}</span></div>`;

  const layout = document.createElement("div");
  layout.className = "box-layout";

  const main = document.createElement("main");
  main.className = "box-main";
  while (box.firstChild) {
    main.appendChild(box.firstChild);
  }

  const aside = document.createElement("aside");
  aside.className = "clutter-rail";
  aside.setAttribute("aria-label", "Site widgets");
  aside.innerHTML = `
    <div class="clutter-widget">
      <h3>visitors!!</h3>
      <p class="hit-counter" id="hit-counter">000000</p>
    </div>
    <div class="clutter-widget">
      <h3>status</h3>
      <p class="blink">UNDER CONSTRUCTION</p>
    </div>
    <div class="clutter-widget">
      <h3>last updated</h3>
      <p class="clutter-date">${new Date().toLocaleDateString()}</p>
    </div>
    <div class="clutter-widget clutter-widget--optional">
      <h3>now playing</h3>
      <p class="clutter-mono">nothing.mp3</p>
    </div>
    <div class="clutter-widget clutter-widget--optional">
      <h3>cool links</h3>
      <p><a href="${base}comics/">→ comics</a></p>
      <p><a href="${base}art/">→ art</a></p>
      <p><a href="#">guestbook (soon)</a></p>
    </div>
    <div class="clutter-badge">
      best viewed<br>IE 6.0<br>800×600
    </div>
  `;

  const stickers = document.createElement("div");
  stickers.className = "box-stickers";
  stickers.setAttribute("aria-hidden", "true");
  if (!isMobile) {
    stickers.innerHTML = `
      <span class="sticker sticker--new blink">NEW!!!</span>
      <span class="sticker sticker--yum">YUM</span>
      <span class="sticker sticker--wow">WOW</span>
    `;
  }

  layout.appendChild(main);
  layout.appendChild(aside);

  const footerMarquee = document.createElement("div");
  footerMarquee.className = "marquee-strip marquee-strip--footer";
  footerMarquee.setAttribute("aria-hidden", "true");
  footerMarquee.innerHTML = `<div class="marquee-track marquee-track--reverse"><span>⚠ WEB ZONE ⚠ DO NOT FEED THE HTML ⚠ THANK U ⚠ WEB ZONE ⚠ DO NOT FEED THE HTML ⚠ </span></div>`;

  box.appendChild(marquee);
  if (!isMobile) {
    box.appendChild(stickers);
  }
  box.appendChild(layout);
  box.appendChild(footerMarquee);

  startHitCounter();
  setupMotionControls();

  const h1 = main.querySelector("h1");
  if (h1 && !h1.querySelector(".title-badge") && !isMobile) {
    const badge = document.createElement("span");
    badge.className = "title-badge";
    badge.textContent = " [HOT]";
    h1.appendChild(badge);
  }
}

function startHitCounter() {
  const counter = document.getElementById("hit-counter");
  if (!counter) return;

  const baseCount = 847 + Math.floor(Math.random() * 50);
  let current = baseCount;
  counter.textContent = String(current).padStart(6, "0");

  if (hitCounterInterval) clearInterval(hitCounterInterval);

  hitCounterInterval = setInterval(() => {
    if (document.hidden) return;
    current += Math.floor(Math.random() * 3);
    counter.textContent = String(current).padStart(6, "0");
  }, 5000);
}

function setupMotionControls() {
  const setMarqueeState = (paused) => {
    document.querySelectorAll(".marquee-track").forEach((track) => {
      track.style.animationPlayState = paused ? "paused" : "running";
    });
  };

  document.addEventListener("visibilitychange", () => {
    setMarqueeState(document.hidden);
  });

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const applyMotion = () => setMarqueeState(motionQuery.matches || document.hidden);
  motionQuery.addEventListener("change", applyMotion);
  applyMotion();
}

function scheduleClutter() {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(initClutter, { timeout: 800 });
  } else {
    setTimeout(initClutter, 1);
  }
}

scheduleClutter();
