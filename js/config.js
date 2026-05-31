(function () {
  const defaults = {
    backend: "json",
    fallbackToJson: false,
    supabase: { url: "", anonKey: "" },
  };
  const prev = window.SiteConfig || {};
  window.SiteConfig = {
    ...defaults,
    ...prev,
    supabase: { ...defaults.supabase, ...(prev.supabase || {}) },
  };
})();

