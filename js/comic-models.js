const ComicModels = (function () {
  const VOLUME_STATUS = {
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived",
  };

  const SERIES_STATUS = VOLUME_STATUS;

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

  function isDraft(status) {
    return status === VOLUME_STATUS.DRAFT;
  }

  function isPublished(status) {
    return status === VOLUME_STATUS.PUBLISHED;
  }

  function buildArtHref(base, slug) {
    const root = base || "";
    if (slug) {
      return `${root}art/view.html?slug=${encodeURIComponent(slug)}`;
    }
    return `${root}art/`;
  }

  function buildSeriesHref(base, seriesSlug, seriesId) {
    const root = base || "";
    if (seriesSlug) {
      return `${root}comics/series-view/?series=${encodeURIComponent(seriesSlug)}`;
    }
    return `${root}comics/series/${seriesId}/`;
  }

  function buildVolumeHref(base, seriesSlug, volumeSlug, seriesId, volumeId) {
    const root = base || "";
    if (seriesSlug && volumeSlug) {
      return `${root}comics/read/?series=${encodeURIComponent(seriesSlug)}&volume=${encodeURIComponent(volumeSlug)}`;
    }
    return `${root}comics/series/${seriesId}/volume/${volumeId}/`;
  }

  function readSlugVolumeFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const seriesSlug = params.get("series");
    const volumeSlug = params.get("volume");
    if (seriesSlug && volumeSlug) {
      return { seriesSlug, volumeSlug };
    }
    return null;
  }

  function readSlugSeriesFromQuery() {
    const seriesSlug = new URLSearchParams(window.location.search).get("series");
    if (seriesSlug) return { seriesSlug };
    return null;
  }

  const RESERVED_COMIC_SEGMENTS = new Set([
    "series",
    "layout-demos",
    "read",
    "series-view",
    "index.html",
  ]);

  function readSlugVolumeFromPath() {
    const match = window.location.pathname.match(
      /[/\\]comics[/\\]([^/\\]+)[/\\]([^/\\]+)[/\\]?$/i
    );
    if (!match) return null;
    const seriesSlug = match[1];
    if (RESERVED_COMIC_SEGMENTS.has(seriesSlug)) return null;
    return { seriesSlug, volumeSlug: match[2] };
  }

  function slugify(text) {
    return String(text ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function readSlugSeriesFromPath() {
    const match = window.location.pathname.match(/[/\\]comics[/\\]([^/\\]+)[/\\]?$/i);
    if (!match) return null;
    const seriesSlug = match[1];
    if (RESERVED_COMIC_SEGMENTS.has(seriesSlug)) return null;
    if (/\.html$/i.test(seriesSlug)) return null;
    return { seriesSlug };
  }

  return {
    VOLUME_STATUS,
    SERIES_STATUS,
    DEFAULT_VIEWER_BY_LAYOUT,
    buildLayoutMap,
    resolveLayout,
    buildViewerConfig,
    isDraft,
    isPublished,
    buildArtHref,
    buildSeriesHref,
    buildVolumeHref,
    readSlugVolumeFromQuery,
    readSlugSeriesFromQuery,
    readSlugVolumeFromPath,
    readSlugSeriesFromPath,
    slugify,
  };
})();
