const ComicsApi = (function () {
  function getAdapter() {
    const cfg = window.SiteConfig ?? { backend: "json" };

    if (cfg.backend === "supabase") {
      if (!cfg.supabase?.url || !cfg.supabase?.anonKey) {
        throw new Error(
          "Supabase is enabled but url/anonKey are missing. Copy js/config.example.js to js/config.local.js and fill in your project keys."
        );
      }
      if (typeof SupabaseComicsAdapter === "undefined") {
        throw new Error("Supabase scripts did not load. Check your network connection and refresh the page.");
      }
      return SupabaseComicsAdapter;
    }

    return JsonComicsAdapter;
  }

  async function callAdapter(method, ...args) {
    return getAdapter()[method](...args);
  }

  function resolveVolumeRef() {
    const fromQuery = ComicModels.readSlugVolumeFromQuery();
    if (fromQuery) return fromQuery;

    const fromSlugPath = ComicModels.readSlugVolumeFromPath();
    if (fromSlugPath) return fromSlugPath;

    const seriesId = document.body.getAttribute("data-series-id");
    const volumeId = document.body.getAttribute("data-volume-id");
    if (seriesId && volumeId) {
      return { seriesId: String(seriesId), volumeId: String(volumeId) };
    }

    const legacy = ComicsDb.readSeriesVolumeFromPath();
    if (legacy) return legacy;

    return null;
  }

  function resolveSeriesRef() {
    const fromQuery = ComicModels.readSlugSeriesFromQuery();
    if (fromQuery) return fromQuery;

    const fromSlugPath = ComicModels.readSlugSeriesFromPath();
    if (fromSlugPath) return fromSlugPath;

    const seriesId = document.body.getAttribute("data-series-id");
    if (seriesId) return { seriesId: String(seriesId) };

    const legacy = ComicsDb.readSeriesFromPath();
    if (legacy) return legacy;

    return null;
  }

  return {
    resolveVolumeRef,
    resolveSeriesRef,
    listPublicSeries: () => callAdapter("listPublicSeries"),
    getPublicSeries: (ref) => callAdapter("getPublicSeries", ref),
    getSeriesBySlug: (slug) => callAdapter("getSeriesBySlug", slug),
    listPublicVolumesForSeries: (id) => callAdapter("listPublicVolumesForSeries", id),
    getVolumeForViewer: (ref, opts) => callAdapter("getVolumeForViewer", ref, opts),
    getSession: () => callAdapter("getSession"),
    requireUserId: () => callAdapter("requireUserId"),
    signIn: (e, p) => callAdapter("signIn", e, p),
    signUp: (e, p, n) => callAdapter("signUp", e, p, n),
    signOut: () => callAdapter("signOut"),
    listMySeries: () => callAdapter("listMySeries"),
    listMyVolumesForSeries: (id) => callAdapter("listVolumesForSeriesOwner", id),
    listLayouts: () => callAdapter("listLayouts"),
    createSeries: (p) => callAdapter("createSeries", p),
    createVolume: (p) => callAdapter("createVolume", p),
    uploadPages: (p) => callAdapter("uploadPages", p),
    uploadPagesOrdered: (p) => callAdapter("uploadPagesOrdered", p),
    uploadSeriesCover: (p) => callAdapter("uploadSeriesCover", p),
    createArt: (p) => callAdapter("createArt", p),
    publishArt: (id) => callAdapter("publishArt", id),
    setArtStatus: (id, status) => callAdapter("setArtStatus", id, status),
    setVolumeStatus: (id, status) => callAdapter("setVolumeStatus", id, status),
    setSeriesStatus: (id, status) => callAdapter("setSeriesStatus", id, status),
    listPublicArt: () => callAdapter("listPublicArt"),
    getArtForViewer: (ref) => callAdapter("getArtForViewer", ref),
    getPublicArtBySlug: (slug) => callAdapter("getPublicArtBySlug", slug),
    listMyArt: () => callAdapter("listMyArt"),
    getArtForOwner: (id) => callAdapter("getArtForOwner", id),
    updateArt: (p) => callAdapter("updateArt", p),
    getVolumeEditBundle: (p) => callAdapter("getVolumeEditBundle", p),
    updateSeries: (p) => callAdapter("updateSeries", p),
    updateVolume: (p) => callAdapter("updateVolume", p),
    syncVolumePages: (p) => callAdapter("syncVolumePages", p),
    publishVolume: (id) => callAdapter("publishVolume", id),
    publishSeries: (id) => callAdapter("publishSeries", id),
    deleteArt: (id) => callAdapter("deleteArt", id),
    deleteVolume: (id) => callAdapter("deleteVolume", id),
    deleteSeries: (id) => callAdapter("deleteSeries", id),
    getAdapterName: () => {
      try {
        return getAdapter() === SupabaseComicsAdapter ? "supabase" : "json";
      } catch {
        return "json";
      }
    },
  };
})();
