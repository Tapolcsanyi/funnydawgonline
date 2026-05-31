const JsonComicsAdapter = (function () {
  function getSiteBase() {
    const root = document.body?.dataset?.siteRoot ?? "";
    return root ? `${root}/` : "";
  }

  function seriesCoverFromJson(s, base) {
    if (s.coverUrl) return s.coverUrl;
    if (s.cover) return `${base}${s.cover}`;
    const volumeIds = ComicsDb.sortedKeys(s.volumes ?? {});
    if (!volumeIds.length) return "";
    const firstVol = s.volumes[volumeIds[0]];
    const firstImg = firstVol?.images?.[0];
    if (!firstImg?.src) return "";
    const src = firstImg.src;
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return `${base}${src}`;
  }

  async function listPublicSeries() {
    const db = await ComicsDb.loadComicsDb();
    const base = getSiteBase();
    const seriesMap = db.series ?? {};
    const ids = ComicsDb.sortedKeys(seriesMap);
    return ids.map((id) => {
      const s = seriesMap[id];
      const volumes = s.volumes ?? {};
      const volumeIds = ComicsDb.sortedKeys(volumes);
      return {
        id,
        slug: s.slug ?? id,
        title: s.title,
        description: s.description ?? "",
        artistName: s.artistName ?? "",
        status: ComicModels.VOLUME_STATUS.PUBLISHED,
        volumeCount: volumeIds.length,
        coverUrl: seriesCoverFromJson(s, base),
      };
    });
  }

  async function getPublicSeries(ref) {
    if (ref.seriesSlug) return getSeriesBySlug(ref.seriesSlug);
    if (ref.seriesId) {
      const db = await ComicsDb.loadComicsDb();
      const s = ComicsDb.getSeries(db, ref.seriesId);
      if (!s) return null;
      const base = getSiteBase();
      return {
        id: ref.seriesId,
        slug: s.slug ?? ref.seriesId,
        title: s.title,
        description: s.description ?? "",
        artistName: s.artistName ?? "",
        status: ComicModels.VOLUME_STATUS.PUBLISHED,
        coverUrl: seriesCoverFromJson(s, base),
      };
    }
    return null;
  }

  async function getSeriesBySlug(seriesSlug) {
    const db = await ComicsDb.loadComicsDb();
    const seriesMap = db.series ?? {};
    for (const id of ComicsDb.sortedKeys(seriesMap)) {
      const s = seriesMap[id];
      if (s.slug === seriesSlug || id === seriesSlug) {
        const base = getSiteBase();
        return {
          id,
          slug: s.slug ?? id,
          title: s.title,
          description: s.description ?? "",
          artistName: s.artistName ?? "",
          status: ComicModels.VOLUME_STATUS.PUBLISHED,
          coverUrl: seriesCoverFromJson(s, base),
        };
      }
    }
    return null;
  }

  async function listPublicVolumesForSeries(seriesId) {
    const db = await ComicsDb.loadComicsDb();
    const series = ComicsDb.getSeries(db, seriesId);
    if (!series) return [];
    const layoutMap = ComicModels.buildLayoutMap(db.layouts);
    const volumeIds = ComicsDb.sortedKeys(series.volumes ?? {});
    return volumeIds.map((vid) => {
      const v = series.volumes[vid];
      const layout = ComicModels.resolveLayout(v.layout, layoutMap);
      const layoutMeta = layoutMap.get(layout);
      return {
        id: vid,
        slug: v.slug ?? vid,
        title: v.title,
        layout,
        layoutLabel: layoutMeta?.label ?? layout,
        artistName: v.artistName ?? series.artistName ?? "",
        status: ComicModels.VOLUME_STATUS.PUBLISHED,
        isDraft: false,
      };
    });
  }

  async function getVolumeForViewer(ref) {
    const base = getSiteBase();
    let seriesId = ref.seriesId;
    let volumeId = ref.volumeId;

    const db = await ComicsDb.loadComicsDb();

    if (ref.seriesSlug && ref.volumeSlug) {
      for (const id of ComicsDb.sortedKeys(db.series ?? {})) {
        const s = db.series[id];
        if (s.slug === ref.seriesSlug || id === ref.seriesSlug) {
          seriesId = id;
          for (const vid of ComicsDb.sortedKeys(s.volumes ?? {})) {
            const v = s.volumes[vid];
            if (v.slug === ref.volumeSlug || vid === ref.volumeSlug) {
              volumeId = vid;
              break;
            }
          }
          break;
        }
      }
    }

    const data = ComicsDb.prepareVolumeForViewer(db, seriesId, volumeId);
    const series = ComicsDb.getSeries(db, seriesId);
    const volume = series?.volumes?.[volumeId];
    Object.assign(data, ComicsDb.getVolumeAdjacency(db, seriesId, volumeId, base));
    data.status = ComicModels.VOLUME_STATUS.PUBLISHED;
    data.isDraft = false;
    data.seriesSlug = series?.slug ?? seriesId;
    data.volumeSlug = volume?.slug ?? volumeId;
    return data;
  }

  async function getSession() {
    return null;
  }

  async function signIn() {
    throw new Error(
      "Accounts need Supabase. Copy js/config.example.js to js/config.local.js, set backend to \"supabase\", and add your project URL and anon key."
    );
  }

  async function signUp() {
    throw new Error(
      "Accounts need Supabase. Copy js/config.example.js to js/config.local.js, set backend to \"supabase\", and add your project URL and anon key."
    );
  }

  async function signOut() {
    return;
  }

  async function listMySeries() {
    return [];
  }

  async function requireUserId() {
    throw new Error("You must be signed in. Enable Supabase in js/config.local.js.");
  }

  async function listLayouts() {
    const db = await ComicsDb.loadComicsDb();
    return (db.layouts ?? []).map((l) => ({
      id: l.id,
      label: l.label,
      viewer: l.viewer,
    }));
  }

  return {
    listPublicSeries,
    getPublicSeries,
    getSeriesBySlug,
    listPublicVolumesForSeries,
    getVolumeForViewer,
    getSession,
    requireUserId,
    signIn,
    signUp,
    signOut,
    listMySeries,
    listVolumesForSeriesOwner: async () => [],
    listLayouts,
    createSeries: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    createVolume: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    uploadPages: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    uploadPagesOrdered: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    uploadSeriesCover: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    createArt: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    publishArt: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    setArtStatus: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    setVolumeStatus: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    setSeriesStatus: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    listPublicArt: async () => {
      const base = getSiteBase();
      try {
        const response = await fetch(`${base}data/art.json`);
        if (!response.ok) return [];
        const data = await response.json();
        const pieces = data.art ?? [];
        return pieces.map((piece) => {
          const slug = piece.slug ?? piece.id ?? ComicModels.slugify(piece.title);
          return {
            id: piece.id ?? slug,
            slug,
            title: piece.title,
            category: piece.category ?? "",
            artistName: piece.artistName ?? "",
            imageUrl: "",
            href: piece.url?.startsWith("http") || piece.url?.includes("?")
              ? piece.url
              : piece.url
                ? `${base}art/${piece.url}`
                : ComicModels.buildArtHref(base, slug),
          };
        });
      } catch {
        return [];
      }
    },
    getArtForViewer: async () => null,
    getPublicArtBySlug: async () => null,
    listMyArt: async () => [],
    getArtForOwner: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    updateArt: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    getVolumeEditBundle: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    updateSeries: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    updateVolume: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    syncVolumePages: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    publishVolume: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    publishSeries: async () => {
      throw new Error("Uploads require Supabase backend.");
    },
    deleteArt: async () => {
      throw new Error("Delete requires Supabase backend.");
    },
    deleteVolume: async () => {
      throw new Error("Delete requires Supabase backend.");
    },
    deleteSeries: async () => {
      throw new Error("Delete requires Supabase backend.");
    },
  };
})();
