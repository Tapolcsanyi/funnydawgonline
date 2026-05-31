/* Synchronous load of config overrides (dev + production). Runs before config.js. */
(function () {
  const script = document.currentScript;
  if (!script?.src) return;

  const base = new URL(".", script.src);

  function tryLoad(filename) {
    const url = new URL(filename, base).href;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      if (xhr.status < 200 || xhr.status >= 300) return false;
      const tag = document.createElement("script");
      tag.textContent = xhr.responseText;
      document.head.appendChild(tag);
      return true;
    } catch {
      return false;
    }
  }

  if (tryLoad("config.local.js")) {
    window.__siteConfigLocalLoaded = true;
    return;
  }
  tryLoad("config.production.js");
})();
