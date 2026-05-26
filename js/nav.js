function initNav() {
  const mount = document.getElementById("site-nav");
  if (!mount) return;

  const root = document.body.dataset.siteRoot || "";
  const base = root ? `${root}/` : "";

  const links = [
    { href: `${base}index.html`, label: "Home" },
    { href: `${base}comics/`, label: "Comics" },
    { href: `${base}art/`, label: "Art" },
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

initNav();
