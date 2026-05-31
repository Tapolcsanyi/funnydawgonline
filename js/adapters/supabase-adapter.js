const SupabaseComicsAdapter = (function () {
  let client = null;

  function getSiteBase() {
    const root = document.body?.dataset?.siteRoot ?? "";
    return root ? `${root}/` : "";
  }

  function getClient() {
    if (client) return client;
    const cfg = window.SiteConfig?.supabase ?? {};
    if (!cfg.url || !cfg.anonKey) {
      throw new Error("Supabase URL and anon key are required in SiteConfig.");
    }
    if (!window.supabase?.createClient) {
      throw new Error("Supabase JS library is not loaded.");
    }
    client = window.supabase.createClient(cfg.url, cfg.anonKey);
    return client;
  }

  function publicImageUrl(storagePath) {
    const cfg = window.SiteConfig?.supabase ?? {};
    return `${cfg.url}/storage/v1/object/public/comic-pages/${storagePath}`;
  }

  function resolvePageSrc(storagePath, base) {
    if (!storagePath) return "";
    if (storagePath.startsWith("site:")) {
      const rel = storagePath.slice(5);
      if (/^https?:\/\//i.test(rel) || rel.startsWith("/")) return rel;
      return `${base}${rel}`;
    }
    if (/^https?:\/\//i.test(storagePath)) return storagePath;
    return publicImageUrl(storagePath);
  }

  async function listLayouts() {
    const { data, error } = await getClient().from("layouts").select("id, label, viewer");
    if (error) throw error;
    return data ?? [];
  }

  async function listPublicSeries() {
    const { data, error } = await getClient()
      .from("series")
      .select("id, slug, title, description, artist_name, status, cover_storage_path")
      .eq("status", ComicModels.VOLUME_STATUS.PUBLISHED)
      .order("sort_order", { ascending: true });
    if (error) throw error;

    const base = getSiteBase();
    const rows = data ?? [];
    const withCounts = await Promise.all(
      rows.map(async (s) => {
        const { count } = await getClient()
          .from("volumes")
          .select("id", { count: "exact", head: true })
          .eq("series_id", s.id)
          .eq("status", ComicModels.VOLUME_STATUS.PUBLISHED);
        const coverPath = s.cover_storage_path ?? "";
        return {
          id: s.id,
          slug: s.slug,
          title: s.title,
          description: s.description ?? "",
          artistName: s.artist_name ?? "",
          status: s.status,
          volumeCount: count ?? 0,
          coverUrl: coverPath ? resolvePageSrc(coverPath, base) : "",
        };
      })
    );
    return withCounts;
  }

  async function getPublicSeries(ref) {
    if (ref.seriesSlug) return getSeriesBySlug(ref.seriesSlug);
    if (ref.seriesId) {
      const { data, error } = await getClient()
        .from("series")
        .select("id, slug, title, description, artist_name, status, cover_storage_path")
        .eq("id", ref.seriesId)
        .eq("status", ComicModels.VOLUME_STATUS.PUBLISHED)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const base = getSiteBase();
      const coverPath = data.cover_storage_path ?? "";
      return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description ?? "",
        artistName: data.artist_name ?? "",
        status: data.status,
        coverUrl: coverPath ? resolvePageSrc(coverPath, base) : "",
      };
    }
    return null;
  }

  async function getSeriesBySlug(seriesSlug) {
    const { data, error } = await getClient()
      .from("series")
      .select("id, slug, title, description, artist_name, status, cover_storage_path")
      .eq("slug", seriesSlug)
      .eq("status", ComicModels.VOLUME_STATUS.PUBLISHED)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const base = getSiteBase();
    const coverPath = data.cover_storage_path ?? "";
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description ?? "",
      artistName: data.artist_name ?? "",
      status: data.status,
      coverUrl: coverPath ? resolvePageSrc(coverPath, base) : "",
    };
  }

  async function getSeriesBySlugForOwner(seriesSlug) {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await getClient()
      .from("series")
      .select("id, slug, title, description, artist_name, status, owner_id")
      .eq("slug", seriesSlug)
      .eq("owner_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function listPublicVolumesForSeries(seriesId) {
    const { data: layouts } = await getClient().from("layouts").select("id, label");
    const layoutMap = new Map((layouts ?? []).map((l) => [l.id, l]));

    const { data, error } = await getClient()
      .from("volumes")
      .select("id, slug, title, layout_id, artist_name, status, sort_order")
      .eq("series_id", seriesId)
      .eq("status", ComicModels.VOLUME_STATUS.PUBLISHED)
      .order("sort_order", { ascending: true });
    if (error) throw error;

    return (data ?? []).map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.title,
      layout: v.layout_id,
      layoutLabel: layoutMap.get(v.layout_id)?.label ?? v.layout_id,
      artistName: v.artist_name ?? "",
      status: v.status,
      isDraft: ComicModels.isDraft(v.status),
    }));
  }

  async function listVolumesForSeriesOwner(seriesId) {
    const userId = await requireUserId();

    const { data: seriesRow, error: seriesErr } = await getClient()
      .from("series")
      .select("id, owner_id")
      .eq("id", seriesId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (seriesErr) throw seriesErr;
    if (!seriesRow) return [];

    const { data: layouts } = await getClient().from("layouts").select("id, label");
    const layoutMap = new Map((layouts ?? []).map((l) => [l.id, l]));

    const { data, error } = await getClient()
      .from("volumes")
      .select("id, slug, title, layout_id, artist_name, status, sort_order, published_at")
      .eq("series_id", seriesId)
      .order("sort_order", { ascending: true });
    if (error) throw error;

    return (data ?? []).map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.title,
      layout: v.layout_id,
      layoutLabel: layoutMap.get(v.layout_id)?.label ?? v.layout_id,
      artistName: v.artist_name ?? "",
      status: v.status,
      isDraft: ComicModels.isDraft(v.status),
    }));
  }

  async function resolveVolumeRow(ref, options = {}) {
    const { includeDraft = false } = options;
    const sb = getClient();

    if (ref.volumeId && ref.seriesId) {
      let vq = sb.from("volumes").select("*").eq("id", ref.volumeId).eq("series_id", ref.seriesId);
      if (!includeDraft) vq = vq.eq("status", ComicModels.VOLUME_STATUS.PUBLISHED);
      const { data: volume, error: vErr } = await vq.maybeSingle();
      if (vErr) throw vErr;
      if (!volume) return null;
      const { data: series, error: sErr } = await sb
        .from("series")
        .select("id, slug, title, description, artist_name, status, owner_id")
        .eq("id", ref.seriesId)
        .maybeSingle();
      if (sErr) throw sErr;
      return { ...volume, series };
    }

    if (ref.seriesSlug && ref.volumeSlug) {
      let sq = sb
        .from("series")
        .select("id, slug, title, description, artist_name, status, owner_id")
        .eq("slug", ref.seriesSlug);
      if (!includeDraft) sq = sq.eq("status", ComicModels.VOLUME_STATUS.PUBLISHED);
      const { data: series, error: sErr } = await sq.maybeSingle();
      if (sErr) throw sErr;
      if (!series) return null;

      let q = sb
        .from("volumes")
        .select("*")
        .eq("series_id", series.id)
        .eq("slug", ref.volumeSlug);
      if (!includeDraft) q = q.eq("status", ComicModels.VOLUME_STATUS.PUBLISHED);
      const { data: volume, error: vErr } = await q.maybeSingle();
      if (vErr) throw vErr;
      if (!volume) return null;
      return { ...volume, series };
    }

    return null;
  }

  async function getVolumeForViewer(ref, options = {}) {
    const base = getSiteBase();
    const row = await resolveVolumeRow(ref, options);
    if (!row) throw new Error("Volume not found");

    const series = row.series ?? row;
    const seriesId = series.id ?? row.series_id;
    const volumeId = row.id;

    const { data: pages, error: pErr } = await getClient()
      .from("pages")
      .select("storage_path, alt, sort_order")
      .eq("volume_id", volumeId)
      .order("sort_order", { ascending: true });
    if (pErr) throw pErr;

    const { data: layouts } = await getClient().from("layouts").select("id, label, viewer");
    const layoutMap = ComicModels.buildLayoutMap(layouts ?? []);
    const layout = ComicModels.resolveLayout(row.layout_id, layoutMap);
    const layoutMeta = layoutMap.get(layout);

    const images = (pages ?? []).map((p) => ({
      src: resolvePageSrc(p.storage_path, base),
      alt: p.alt || "",
    }));

    const { data: allVolumes } = await getClient()
      .from("volumes")
      .select("id, slug, title, sort_order")
      .eq("series_id", seriesId)
      .eq("status", ComicModels.VOLUME_STATUS.PUBLISHED)
      .order("sort_order", { ascending: true });

    const volList = allVolumes ?? [];
    const idx = volList.findIndex((v) => v.id === volumeId);
    const seriesSlug = series.slug ?? seriesId;
    const toNav = (v) => ({
      volumeId: v.id,
      title: v.title,
      href: ComicModels.buildVolumeHref(base, seriesSlug, v.slug, seriesId, v.id),
    });

    return {
      seriesId,
      volumeId,
      seriesSlug,
      volumeSlug: row.slug,
      seriesTitle: series.title,
      title: row.title,
      artistName: row.artist_name || series.artist_name || "",
      layout,
      layoutLabel: layoutMeta?.label ?? layout,
      viewerConfig: ComicModels.buildViewerConfig(layout, layoutMap),
      images,
      status: row.status,
      isDraft: ComicModels.isDraft(row.status),
      prevVolume: idx > 0 ? toNav(volList[idx - 1]) : null,
      nextVolume: idx >= 0 && idx < volList.length - 1 ? toNav(volList[idx + 1]) : null,
    };
  }

  async function getSession() {
    const { data } = await getClient().auth.getSession();
    return data.session;
  }

  /** Validated user id (JWT checked server-side). Use for owner-scoped lists. */
  async function requireUserId() {
    const { data, error } = await getClient().auth.getUser();
    if (error) throw error;
    if (!data.user?.id) throw new Error("You must be signed in.");
    return data.user.id;
  }

  function filterOwnedRows(rows, userId, ownerKey = "owner_id") {
    return (rows ?? []).filter((row) => row[ownerKey] === userId);
  }

  async function signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  async function signUp(email, password, displayName) {
    const { data, error } = await getClient().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || "" } },
    });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    await getClient().auth.signOut();
  }

  async function listMySeries() {
    const userId = await requireUserId();

    const { data, error } = await getClient()
      .from("series")
      .select("id, slug, title, description, artist_name, status, sort_order, owner_id")
      .eq("owner_id", userId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return filterOwnedRows(data, userId).map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description ?? "",
      artistName: s.artist_name ?? "",
      status: s.status,
      isDraft: ComicModels.isDraft(s.status),
    }));
  }

  async function createSeries({ title, slug, description, artistName }) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const resolvedArtist =
      artistName?.trim() || (await ownerDisplayName());

    const { data, error } = await getClient()
      .from("series")
      .insert({
        owner_id: session.user.id,
        title,
        slug,
        description: description ?? "",
        artist_name: resolvedArtist,
        status: ComicModels.VOLUME_STATUS.DRAFT,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function createVolume({ seriesId, title, slug, layoutId, artistName }) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const resolvedArtist =
      artistName?.trim() || (await ownerDisplayName());

    const { data: maxRow } = await getClient()
      .from("volumes")
      .select("sort_order")
      .eq("series_id", seriesId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (maxRow?.sort_order ?? -1) + 1;

    const { data, error } = await getClient()
      .from("volumes")
      .insert({
        series_id: seriesId,
        title,
        slug,
        layout_id: layoutId,
        artist_name: resolvedArtist,
        status: ComicModels.VOLUME_STATUS.DRAFT,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function uploadStorageFile(path, file) {
    const { error } = await getClient().storage.from("comic-pages").upload(path, file, {
      upsert: true,
    });
    if (error) throw error;
    return path;
  }

  async function uploadPagesOrdered({ seriesSlug, volumeId, files }) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data: volume, error: vErr } = await getClient()
      .from("volumes")
      .select("id, slug, series_id, series:series_id (slug)")
      .eq("id", volumeId)
      .single();
    if (vErr) throw vErr;

    const ownerSeriesSlug = volume.series?.slug ?? seriesSlug;
    const volumeSlug = volume.slug;
    const uploaded = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${session.user.id}/${ownerSeriesSlug}/${volumeSlug}/page-${String(i + 1).padStart(3, "0")}.${ext}`;

      await uploadStorageFile(path, file);

      const { data: page, error: insErr } = await getClient()
        .from("pages")
        .insert({
          volume_id: volumeId,
          sort_order: i,
          storage_path: path,
          alt: file.name,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      uploaded.push(page);
    }

    return uploaded;
  }

  async function uploadSeriesCover({ seriesId, file }) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data: series, error: sErr } = await getClient()
      .from("series")
      .select("id, slug")
      .eq("id", seriesId)
      .eq("owner_id", session.user.id)
      .single();
    if (sErr) throw sErr;

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${session.user.id}/${series.slug}/cover.${ext}`;
    await uploadStorageFile(path, file);

    const { data, error } = await getClient()
      .from("series")
      .update({ cover_storage_path: path })
      .eq("id", seriesId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function ownerDisplayName() {
    const session = await getSession();
    if (!session) return "";
    const fromMeta = session.user.user_metadata?.display_name?.trim();
    if (fromMeta) return fromMeta;

    const { data } = await getClient()
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .maybeSingle();
    const fromProfile = data?.display_name?.trim();
    if (fromProfile) return fromProfile;

    return session.user.email?.split("@")[0] ?? "";
  }

  async function createArt({ title, slug, category, file }) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const artSlug = slug || ComicModels.slugify(title);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${session.user.id}/art/${artSlug}.${ext}`;
    await uploadStorageFile(path, file);

    const { data, error } = await getClient()
      .from("art_pieces")
      .insert({
        owner_id: session.user.id,
        slug: artSlug,
        title,
        category: category ?? "",
        artist_name: (await ownerDisplayName()),
        storage_path: path,
        status: ComicModels.VOLUME_STATUS.DRAFT,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function publishArt(artId) {
    return setArtStatus(artId, ComicModels.VOLUME_STATUS.PUBLISHED);
  }

  async function uploadPages({ seriesSlug, volumeId, files }) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data: volume, error: vErr } = await getClient()
      .from("volumes")
      .select("id, slug, series_id, series:series_id (slug)")
      .eq("id", volumeId)
      .single();
    if (vErr) throw vErr;

    const ownerSeriesSlug = volume.series?.slug ?? seriesSlug;
    const volumeSlug = volume.slug;

    const { data: existing } = await getClient()
      .from("pages")
      .select("sort_order")
      .eq("volume_id", volumeId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextOrder = (existing?.sort_order ?? -1) + 1;
    const uploaded = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${session.user.id}/${ownerSeriesSlug}/${volumeSlug}/page-${String(nextOrder + 1).padStart(3, "0")}.${ext}`;

      const { error: upErr } = await getClient().storage.from("comic-pages").upload(path, file, {
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: page, error: insErr } = await getClient()
        .from("pages")
        .insert({
          volume_id: volumeId,
          sort_order: nextOrder,
          storage_path: path,
          alt: file.name,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      uploaded.push(page);
      nextOrder += 1;
    }

    return uploaded;
  }

  async function publishVolume(volumeId) {
    return setVolumeStatus(volumeId, ComicModels.VOLUME_STATUS.PUBLISHED);
  }

  async function publishSeries(seriesId) {
    return setSeriesStatus(seriesId, ComicModels.VOLUME_STATUS.PUBLISHED);
  }

  async function setSeriesStatus(seriesId, status) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data, error } = await getClient()
      .from("series")
      .update({ status })
      .eq("id", seriesId)
      .eq("owner_id", session.user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function setVolumeStatus(volumeId, status) {
    await assertVolumeOwner(volumeId);

    const patch = { status };
    if (status === ComicModels.VOLUME_STATUS.PUBLISHED) {
      patch.published_at = new Date().toISOString();
    }

    const { data, error } = await getClient()
      .from("volumes")
      .update(patch)
      .eq("id", volumeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function setArtStatus(artId, status) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data, error } = await getClient()
      .from("art_pieces")
      .update({ status })
      .eq("id", artId)
      .eq("owner_id", session.user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function listPublicArt() {
    const { data, error } = await getClient()
      .from("art_pieces")
      .select("id, slug, title, category, artist_name, storage_path, sort_order, created_at")
      .eq("status", ComicModels.VOLUME_STATUS.PUBLISHED)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const base = getSiteBase();
    return (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category ?? "",
      artistName: row.artist_name ?? "",
      imageUrl: resolvePageSrc(row.storage_path, base),
      href: ComicModels.buildArtHref(base, row.slug),
    }));
  }

  function viewerMaySeeArt(row, userId) {
    if (ComicModels.isPublished(row.status)) return true;
    return Boolean(userId && row.owner_id === userId);
  }

  function mapArtForViewer(row, base) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category ?? "",
      artistName: row.artist_name ?? "",
      status: row.status,
      isDraft: ComicModels.isDraft(row.status),
      imageUrl: resolvePageSrc(row.storage_path, base),
    };
  }

  async function getArtForViewer(ref = {}) {
    const slug = ref.slug?.trim() || null;
    const id = ref.id?.trim() || null;
    if (!slug && !id) return null;

    const session = await getSession();
    const userId = session?.user?.id ?? null;
    const base = getSiteBase();

    let query = getClient()
      .from("art_pieces")
      .select("id, slug, title, category, artist_name, storage_path, status, owner_id");

    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", slug);
    }

    const { data, error } = await query;
    if (error) throw error;

    const visible = (data ?? []).filter((row) => viewerMaySeeArt(row, userId));
    if (!visible.length) return null;

    if (id) {
      const row = visible.find((r) => r.id === id);
      return row ? mapArtForViewer(row, base) : null;
    }

    const published = visible.filter((r) => ComicModels.isPublished(r.status));
    if (published.length === 1) return mapArtForViewer(published[0], base);
    if (published.length > 1) return null;

    const own = visible.filter((r) => r.owner_id === userId);
    if (own.length === 1) return mapArtForViewer(own[0], base);

    return null;
  }

  async function getPublicArtBySlug(slug) {
    const piece = await getArtForViewer({ slug });
    if (!piece || !ComicModels.isPublished(piece.status)) return null;
    return piece;
  }

  async function assertVolumeOwner(volumeId) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data: volume, error } = await getClient()
      .from("volumes")
      .select(
        "id, slug, series_id, layout_id, title, status, series:series_id (id, slug, title, description, owner_id, status, cover_storage_path)"
      )
      .eq("id", volumeId)
      .single();
    if (error) throw error;
    if (volume.series?.owner_id !== session.user.id) {
      throw new Error("You do not have permission to edit this volume.");
    }
    return volume;
  }

  async function listMyArt() {
    const userId = await requireUserId();

    const { data, error } = await getClient()
      .from("art_pieces")
      .select("id, slug, title, category, status, storage_path, created_at, owner_id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return filterOwnedRows(data, userId).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category ?? "",
      status: row.status,
      isDraft: ComicModels.isDraft(row.status),
    }));
  }

  async function getArtForOwner(artId) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data, error } = await getClient()
      .from("art_pieces")
      .select("id, slug, title, category, status, storage_path")
      .eq("id", artId)
      .eq("owner_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Art piece not found.");

    const base = getSiteBase();
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      category: data.category ?? "",
      status: data.status,
      isDraft: ComicModels.isDraft(data.status),
      imageUrl: resolvePageSrc(data.storage_path, base),
      storagePath: data.storage_path,
    };
  }

  async function updateArt({ id, title, slug, category, file }) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const existing = await getArtForOwner(id);
    const artSlug = slug || ComicModels.slugify(title);
    let storagePath = existing.storagePath;

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      storagePath = `${session.user.id}/art/${artSlug}.${ext}`;
      await uploadStorageFile(storagePath, file);
    }

    const patch = {
      title,
      slug: artSlug,
      storage_path: storagePath,
    };
    if (category !== undefined) patch.category = category;

    const { data, error } = await getClient()
      .from("art_pieces")
      .update(patch)
      .eq("id", id)
      .eq("owner_id", session.user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function getVolumeEditBundle({ seriesId, volumeId }) {
    const volume = await assertVolumeOwner(volumeId);
    if (volume.series_id !== seriesId && volume.series?.id !== seriesId) {
      throw new Error("Volume does not belong to this comic.");
    }

    const base = getSiteBase();
    const series = volume.series;

    const { data: pages, error: pErr } = await getClient()
      .from("pages")
      .select("id, storage_path, alt, sort_order")
      .eq("volume_id", volumeId)
      .order("sort_order", { ascending: true });
    if (pErr) throw pErr;

    return {
      series: {
        id: series.id,
        slug: series.slug,
        title: series.title,
        description: series.description ?? "",
        status: series.status,
        coverStoragePath: series.cover_storage_path ?? "",
        coverUrl: series.cover_storage_path
          ? resolvePageSrc(series.cover_storage_path, base)
          : "",
      },
      volume: {
        id: volume.id,
        slug: volume.slug,
        title: volume.title,
        layoutId: volume.layout_id,
        status: volume.status,
        isDraft: ComicModels.isDraft(volume.status),
      },
      pages: (pages ?? []).map((p) => ({
        pageId: p.id,
        storagePath: p.storage_path,
        label: p.alt || "Page",
        previewUrl: resolvePageSrc(p.storage_path, base),
        sortOrder: p.sort_order,
      })),
    };
  }

  function isBucketStoragePath(storagePath) {
    return Boolean(storagePath && !storagePath.startsWith("site:"));
  }

  async function removeStoragePaths(paths) {
    const unique = [...new Set((paths ?? []).filter(isBucketStoragePath))];
    if (!unique.length) return;

    const { error } = await getClient().storage.from("comic-pages").remove(unique);
    if (error) {
      console.warn("Could not remove some storage files:", error.message);
    }
  }

  function assertDraftStatus(status, what) {
    if (!ComicModels.isDraft(status)) {
      throw new Error(`Only draft ${what} can be deleted. Switch it back to draft first.`);
    }
  }

  async function deleteArt(artId) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const existing = await getArtForOwner(artId);
    assertDraftStatus(existing.status, "art");

    await removeStoragePaths([existing.storagePath]);

    const { data, error } = await getClient()
      .from("art_pieces")
      .delete()
      .eq("id", artId)
      .eq("owner_id", session.user.id)
      .eq("status", ComicModels.VOLUME_STATUS.DRAFT)
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      throw new Error("Only draft art can be deleted.");
    }
  }

  async function deleteVolume(volumeId) {
    const volume = await assertVolumeOwner(volumeId);
    assertDraftStatus(volume.status, "volumes");

    const { data: pages, error: pErr } = await getClient()
      .from("pages")
      .select("storage_path")
      .eq("volume_id", volumeId);
    if (pErr) throw pErr;

    await removeStoragePaths((pages ?? []).map((p) => p.storage_path));

    const { data, error } = await getClient()
      .from("volumes")
      .delete()
      .eq("id", volumeId)
      .eq("status", ComicModels.VOLUME_STATUS.DRAFT)
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      throw new Error("Only draft volumes can be deleted.");
    }
  }

  async function deleteSeries(seriesId) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data: series, error: sErr } = await getClient()
      .from("series")
      .select("id, status, cover_storage_path")
      .eq("id", seriesId)
      .eq("owner_id", session.user.id)
      .single();
    if (sErr) throw sErr;
    if (!series) throw new Error("Comic not found.");

    assertDraftStatus(series.status, "comics");

    const { count, error: pubErr } = await getClient()
      .from("volumes")
      .select("id", { count: "exact", head: true })
      .eq("series_id", seriesId)
      .eq("status", ComicModels.VOLUME_STATUS.PUBLISHED);
    if (pubErr) throw pubErr;
    if ((count ?? 0) > 0) {
      throw new Error("Unpublish all volumes before deleting this comic.");
    }

    const { data: volumes, error: vErr } = await getClient()
      .from("volumes")
      .select("id")
      .eq("series_id", seriesId);
    if (vErr) throw vErr;

    const volumeIds = (volumes ?? []).map((v) => v.id);
    let pagePaths = [];
    if (volumeIds.length) {
      const { data: pages, error: pErr } = await getClient()
        .from("pages")
        .select("storage_path")
        .in("volume_id", volumeIds);
      if (pErr) throw pErr;
      pagePaths = (pages ?? []).map((p) => p.storage_path);
    }

    await removeStoragePaths([...pagePaths, series.cover_storage_path]);

    const { data, error } = await getClient()
      .from("series")
      .delete()
      .eq("id", seriesId)
      .eq("owner_id", session.user.id)
      .eq("status", ComicModels.VOLUME_STATUS.DRAFT)
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      throw new Error("Only draft comics can be deleted.");
    }
  }

  async function updateSeries({ id, title, slug, description }) {
    const session = await getSession();
    if (!session) throw new Error("You must be signed in.");

    const { data, error } = await getClient()
      .from("series")
      .update({
        title,
        slug,
        description: description ?? "",
      })
      .eq("id", id)
      .eq("owner_id", session.user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updateVolume({ id, title, slug, layoutId }) {
    await assertVolumeOwner(id);

    const { data, error } = await getClient()
      .from("volumes")
      .update({
        title,
        slug,
        layout_id: layoutId,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function syncVolumePages({ volumeId, seriesSlug, items }) {
    const volume = await assertVolumeOwner(volumeId);
    const ownerSeriesSlug = volume.series?.slug ?? seriesSlug;
    const volumeSlug = volume.slug;
    const session = await getSession();

    const keepIds = items
      .filter((item) => item.kind === "existing" && item.pageId)
      .map((item) => item.pageId);

    let deleteQuery = getClient().from("pages").delete().eq("volume_id", volumeId);
    if (keepIds.length > 0) {
      deleteQuery = deleteQuery.not("id", "in", `(${keepIds.join(",")})`);
    }
    const { error: delErr } = await deleteQuery;
    if (delErr) throw delErr;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === "existing" && item.pageId) {
        const { error } = await getClient()
          .from("pages")
          .update({ sort_order: 10000 + i })
          .eq("id", item.pageId)
          .eq("volume_id", volumeId);
        if (error) throw error;
      }
    }

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === "existing" && item.pageId) {
        const { error } = await getClient()
          .from("pages")
          .update({ sort_order: i, alt: item.label ?? "" })
          .eq("id", item.pageId)
          .eq("volume_id", volumeId);
        if (error) throw error;
        continue;
      }

      if (item.kind === "new" && item.file) {
        const ext = item.file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${session.user.id}/${ownerSeriesSlug}/${volumeSlug}/page-${String(i + 1).padStart(3, "0")}-${Date.now()}.${ext}`;
        await uploadStorageFile(path, item.file);

        const { error: insErr } = await getClient().from("pages").insert({
          volume_id: volumeId,
          sort_order: i,
          storage_path: path,
          alt: item.label ?? item.file.name,
        });
        if (insErr) throw insErr;
      }
    }

    return { count: items.length };
  }

  return {
    listPublicSeries,
    getPublicSeries,
    getSeriesBySlug,
    getSeriesBySlugForOwner,
    listPublicVolumesForSeries,
    listVolumesForSeriesOwner,
    getVolumeForViewer,
    getSession,
    requireUserId,
    signIn,
    signUp,
    signOut,
    listMySeries,
    listLayouts,
    createSeries,
    createVolume,
    uploadPages,
    uploadPagesOrdered,
    uploadSeriesCover,
    createArt,
    publishArt,
    setArtStatus,
    setVolumeStatus,
    setSeriesStatus,
    listPublicArt,
    getArtForViewer,
    getPublicArtBySlug,
    listMyArt,
    getArtForOwner,
    updateArt,
    getVolumeEditBundle,
    updateSeries,
    updateVolume,
    syncVolumePages,
    publishVolume,
    publishSeries,
    deleteArt,
    deleteVolume,
    deleteSeries,
  };
})();
