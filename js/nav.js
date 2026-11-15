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
  document.getElementById("site-auth-bar")?.remove();
  document.querySelector(".auth-bar--static")?.remove();

  const mount = document.getElementById("site-nav");
  if (!mount) return;

  const root = document.body.dataset.siteRoot || "";
  const base = root ? `${root}/` : "";
  const homeHref = root ? `${root}/` : "./";

  const links = [
    { href: homeHref, label: "Home" },
    { href: `${base}comics/`, label: "Comics" },
    { href: `${base}art/`, label: "Art" },
    { href: `${base}sprites/`, label: "Sprites" },
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

function clearNavAuth(nav) {
  nav.querySelectorAll("[data-nav-auth]").forEach((el) => el.remove());
}

function appendNavAuthLink(nav, href, label) {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = label;
  a.dataset.navAuth = "1";
  nav.appendChild(a);
}

function renderNavAuth(session) {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const root = document.body.dataset.siteRoot || "";
  const base = root ? `${root}/` : "";

  clearNavAuth(nav);

  if (session) {
    appendNavAuthLink(nav, `${base}my-work/`, "My work");
    appendNavAuthLink(nav, `${base}upload/`, "Upload");
    appendNavAuthLink(nav, `${base}account/`, "Account");
  } else {
    appendNavAuthLink(nav, `${base}account/login.html`, "Log in");
    appendNavAuthLink(nav, `${base}account/sign-up.html`, "Sign up");
  }
}

async function refreshNavAuth() {
  if (typeof ComicsApi === "undefined") {
    renderNavAuth(null);
    return;
  }

  try {
    const session = await ComicsApi.getSession();
    renderNavAuth(session);
  } catch (err) {
    console.warn("Nav auth:", err);
    renderNavAuth(null);
  }
}

initFavicon();
initNav();
renderNavAuth(null);

document.addEventListener("DOMContentLoaded", refreshNavAuth);
document.addEventListener("comics-api-ready", refreshNavAuth);
