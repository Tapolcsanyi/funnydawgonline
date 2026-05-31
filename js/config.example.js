window.SiteConfig = {
  ...(window.SiteConfig || {}),
  backend: "supabase",
  fallbackToJson: false,
  supabase: {
    url: "https://YOUR_PROJECT_REF.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY",
  },
};
