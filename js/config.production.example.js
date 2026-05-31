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
    url: "https://ujevvowllrtlvpajiqeb.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZXZ2b3dsbHJ0bHZwYWppcWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzM1NTAsImV4cCI6MjA5NTgwOTU1MH0.pxDnYOKNzBAeTgpmjGKhkr0Sb6h1jxiDtj0kuAQdohU",
  },
};
