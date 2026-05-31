/**
 * Production Supabase config (copy to config.production.js).
 *
 * - Local dev: use js/config.local.js (gitignored) instead.
 * - GitHub Pages / deploy: copy this file to config.production.js and fill in keys.
 *
 * The anon key is safe to expose in the browser (RLS protects your data).
 * Never put the service_role key here.
 */
window.SiteConfig = {
  ...(window.SiteConfig || {}),
  backend: "supabase",
  fallbackToJson: false,
  supabase: {
    url: "https://YOUR_PROJECT_REF.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY",
  },
};
