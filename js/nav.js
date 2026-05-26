function initFavicon() {
  const root = document.body.dataset.siteRoot || "";
  const base = root ? `${root}/` : "";
  const href = `${base}funnydawgonline-icon.png`;

  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.type = "image/png";
  link.href = href;
}

function initNav() {
  const mount = document.getElementById("site-nav");
  if (!mount) return;

  const root = document.body.dataset.siteRoot || "";
  const base = root ? `${root}/` : "";
  const homeHref = root ? `${root}/` : "./";

  const links = [
    { href: homeHref, label: "Home" },
    { href: `${base}comics/`, label: "Comics" },
    { href: `${base}art/`, label: "Art" },
    { href: `${base}about/`, label: "About" },
  ];

  const nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.setAttribute("aria-label", "Main");

  for (const { href, label } of links) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    nav.appendChild(a);
  }

  mount.replaceChildren(nav);
}

initFavicon();
initNav();
