/* Load before comics-api.js on pages that use ComicsApi or auth. */
(function () {
  const root = document.body?.dataset?.siteRoot ?? "";
  const base = root ? `${root}/` : "";
  const v = window.__FD_SCRIPT_VERSION || "1";
  const q = `?v=${encodeURIComponent(v)}`;

  function scriptUrl(path) {
    return `${base}js/${path}${q}`;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error(`Failed to load: ${url}`));
      document.head.appendChild(s);
    });
  }

  async function ensureConfig() {
    const cfg = window.SiteConfig ?? {};
    if (cfg.backend === "supabase" && cfg.supabase?.url && cfg.supabase?.anonKey) {
      return;
    }

    try {
      await loadScript(scriptUrl("config.js"));
    } catch (err) {
      console.warn(err.message);
    }

    if (window.SiteConfig?.backend === "supabase" && window.SiteConfig?.supabase?.url) {
      return;
    }

    try {
      await loadScript(scriptUrl("config.production.js"));
    } catch (err) {
      /* optional: committed or CI-generated for GitHub Pages / production */
    }

    if (window.SiteConfig?.backend === "supabase" && window.SiteConfig?.supabase?.url) {
      return;
    }

    try {
      await loadScript(scriptUrl("config.local.js"));
    } catch (err) {
      console.warn(
        "Supabase config missing. For local dev: js/config.local.js. For deploy: js/config.production.js (see js/config.example.js)."
      );
    }
  }

  async function boot() {
    await ensureConfig();

    const cfg = window.SiteConfig ?? {};
    if (cfg.backend === "supabase" && (!cfg.supabase?.url || !cfg.supabase?.anonKey)) {
      console.error("SiteConfig.backend is supabase but url/anonKey are missing.");
    }

    const chain = [
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
      scriptUrl("comic-models.js"),
      scriptUrl("comics-db.js"),
      scriptUrl("adapters/json-adapter.js"),
      scriptUrl("adapters/supabase-adapter.js"),
      scriptUrl("comics-api.js"),
    ];

    for (const url of chain) {
      try {
        await loadScript(url);
      } catch (err) {
        console.warn(err.message);
      }
    }

    document.dispatchEvent(new Event("comics-api-ready"));
  }

  boot();
})();
