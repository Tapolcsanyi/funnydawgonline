const ComicsDb = (function () {
  let cache = null;

  function getSiteBase() {
    const root = document.body?.dataset?.siteRoot ?? "";
    return root ? `${root}/` : "";
  }

  function sortedKeys(obj) {
    return Object.keys(obj ?? {}).sort((a, b) => Number(a) - Number(b));
  }

  function buildLayoutMap(layouts) {
    const map = new Map();
    for (const layout of layouts ?? []) {
      map.set(layout.id, layout);
    }
    return map;
  }

  function resolveLayout(layoutId, layoutMap) {
    if (layoutMap.has(layoutId)) return layoutId;
    const first = layoutMap.keys().next().value;
    return first ?? "top-to-bottom";
  }

  const DEFAULT_VIEWER_BY_LAYOUT = {
    "top-to-bottom": {
      mode: "stacked",
      reverseStack: false,
      scrollToBottomOnLoad: false,
      carouselRtl: false,
    },
    "bottom-to-top": {
      mode: "stacked",
      reverseStack: true,
      scrollToBottomOnLoad: true,
      carouselRtl: false,
    },
    "left-to-right": {
      mode: "carousel",
      reverseStack: false,
      scrollToBottomOnLoad: false,
      carouselRtl: false,
    },
    "right-to-left": {
      mode: "carousel",
      reverseStack: false,
      scrollToBottomOnLoad: false,
      carouselRtl: true,
    },
  };

  function buildViewerConfig(layoutId, layoutMap) {
    const layoutMeta = layoutMap.get(layoutId);
    const defaults =
      DEFAULT_VIEWER_BY_LAYOUT[layoutId] ?? DEFAULT_VIEWER_BY_LAYOUT["top-to-bottom"];
    const fromDb = layoutMeta?.viewer ?? {};
    return {
      layoutId,
      mode: fromDb.mode ?? defaults.mode,
      reverseStack: fromDb.reverseStack ?? defaults.reverseStack,
      scrollToBottomOnLoad: fromDb.scrollToBottomOnLoad ?? defaults.scrollToBottomOnLoad,
      carouselRtl: fromDb.carouselRtl ?? defaults.carouselRtl,
    };
  }

  async function loadComicsDb() {
    if (cache) return cache;
    const base = getSiteBase();
    const response = await fetch(`${base}data/comics.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cache = await response.json();
    return cache;
  }

  function getSeries(db, seriesId) {
    return db.series?.[String(seriesId)] ?? null;
  }

  function getVolume(db, seriesId, volumeId) {
    const series = getSeries(db, seriesId);
    if (!series) return null;
    const volume = series.volumes?.[String(volumeId)];
    if (!volume) return null;
    return {
      series,
      volume,
      seriesId: String(seriesId),
      volumeId: String(volumeId),
    };
  }

  function resolveArtistName(series, volume) {
    if (volume.artistName) return volume.artistName;
    if (series.artistName) return series.artistName;
    return "";
  }

  function buildVolumeHref(base, series, seriesId, volumeId, volume) {
    const root = base || "";
    if (series.slug && volume.slug) {
      return `${root}comics/${series.slug}/${volume.slug}/`;
    }
    return `${root}comics/series/${seriesId}/volume/${volumeId}/`;
  }

  function getVolumeAdjacency(db, seriesId, volumeId, base = "") {
    const series = getSeries(db, seriesId);
    if (!series?.volumes) {
      return { prevVolume: null, nextVolume: null };
    }

    const volumeIds = sortedKeys(series.volumes);
    const currentId = String(volumeId);
    const index = volumeIds.indexOf(currentId);
    if (index === -1) {
      return { prevVolume: null, nextVolume: null };
    }

    const toNav = (id) => {
      const volume = series.volumes[id];
      return {
        volumeId: id,
        title: volume.title,
        href: buildVolumeHref(base, series, seriesId, id, volume),
      };
    };

    return {
      prevVolume: index > 0 ? toNav(volumeIds[index - 1]) : null,
      nextVolume: index < volumeIds.length - 1 ? toNav(volumeIds[index + 1]) : null,
    };
  }

  function prepareVolumeForViewer(db, seriesId, volumeId) {
    const entry = getVolume(db, seriesId, volumeId);
    if (!entry) {
      throw new Error(`Volume not found: series ${seriesId}, volume ${volumeId}`);
    }

    const layoutMap = buildLayoutMap(db.layouts);
    const layout = resolveLayout(entry.volume.layout, layoutMap);
    const layoutMeta = layoutMap.get(layout);

    return {
      seriesId: entry.seriesId,
      volumeId: entry.volumeId,
      seriesTitle: entry.series.title,
      title: entry.volume.title,
      artistName: resolveArtistName(entry.series, entry.volume),
      artistId: entry.volume.artistId ?? entry.series.artistId ?? null,
      layout,
      layoutLabel: layoutMeta?.label ?? layout.replace(/-/g, " "),
      viewerConfig: buildViewerConfig(layout, layoutMap),
      images: entry.volume.images ?? [],
    };
  }

  function readSeriesVolumeFromPath() {
    const match = window.location.pathname.match(
      /[/\\]comics[/\\]series[/\\](\d+)[/\\]volume[/\\](\d+)[/\\]?/i
    );
    if (!match) return null;
    return { seriesId: match[1], volumeId: match[2] };
  }

  function readSeriesFromPath() {
    const match = window.location.pathname.match(
      /[/\\]comics[/\\]series[/\\](\d+)[/\\]?/i
    );
    if (!match) return null;
    return { seriesId: match[1] };
  }

  return {
    loadComicsDb,
    sortedKeys,
    buildLayoutMap,
    buildViewerConfig,
    getSeries,
    getVolume,
    buildVolumeHref,
    getVolumeAdjacency,
    prepareVolumeForViewer,
    readSeriesVolumeFromPath,
    readSeriesFromPath,
  };
})();
