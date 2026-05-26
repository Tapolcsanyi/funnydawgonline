const SiteTheme = (function () {
  const STORAGE_KEY = "funnydawg-theme";
  const DEFAULT_THEME = "aero";
  const THEMES = {
    aero: { id: "aero", label: "Loud", next: "calm" },
    calm: { id: "calm", label: "Calm", next: "aero" },
  };

  const themeScript =
    document.currentScript ||
    document.querySelector('script[src*="theme.js"]');
  const THEME_BASE = themeScript?.src
    ? new URL("../css/themes/", themeScript.src).href
    : "";

  function themeHref(themeId) {
    const theme = THEMES[themeId] ? themeId : DEFAULT_THEME;
    return `${THEME_BASE}${theme}.css`;
  }

  function getSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES[saved] ? saved : DEFAULT_THEME;
  }

  function applyTheme(themeId) {
    const theme = THEMES[themeId] ? themeId : DEFAULT_THEME;
    const href = themeHref(theme);
    const current = document.getElementById("site-theme");

    if (current?.href === href) {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(STORAGE_KEY, theme);
      updateToggleButtons();
      return theme;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;

    link.onload = () => {
      link.id = "site-theme";
      if (current && current !== link) current.remove();
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(STORAGE_KEY, theme);
      updateToggleButtons();
    };

    link.onerror = () => {
      console.warn("Theme stylesheet failed to load:", href);
      link.remove();
    };

    document.head.appendChild(link);
    return theme;
  }

  function updateToggleButtons() {
    const current = getSavedTheme();
    const meta = THEMES[current];
    const next = THEMES[meta.next];
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.textContent = `Theme: ${meta.label}`;
      btn.setAttribute("aria-label", `Switch to ${next.label} theme`);
      btn.title = `Currently ${meta.label}. Click for ${next.label}.`;
      btn.disabled = false;
    });
  }

  function toggleTheme() {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.disabled = true;
    });
    const current = getSavedTheme();
    return applyTheme(THEMES[current].next);
  }

  function mountToggle(parent) {
    if (!parent || parent.querySelector("[data-theme-toggle]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.dataset.themeToggle = "true";
    btn.addEventListener("click", toggleTheme);
    parent.appendChild(btn);
    updateToggleButtons();
  }

  (function initTheme() {
    const theme = getSavedTheme();
    const href = themeHref(theme);
    let link = document.getElementById("site-theme");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "site-theme";
      link.href = href;
      document.head.appendChild(link);
    } else {
      link.href = href;
    }
    document.documentElement.dataset.theme = theme;
  })();

  document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector(".site-nav");
    if (nav) mountToggle(nav);
    updateToggleButtons();
  });

  return {
    applyTheme,
    toggleTheme,
    getTheme: getSavedTheme,
    mountToggle,
    THEMES,
  };
})();
