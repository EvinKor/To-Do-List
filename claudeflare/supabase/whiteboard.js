function baseUrl(env) {
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  if (!url) throw new Error("Missing SUPABASE_URL");
  return url;
}

function sbHeaders(env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function sbFetch(env, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...sbHeaders(env),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Supabase error ${res.status}`);
  }
  return text ? JSON.parse(text) : null;
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function parseId(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

export async function handleWhiteboardApi({
  request,
  env,
  corsHeaders,
  getTokenFromRequest,
  decodeAndValidateToken,
  getProfileByEmail,
}) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const isBoards = pathname.startsWith("/api/whiteboards/") || pathname.startsWith("/whiteboards/");
  const isBoardsList = pathname === "/api/whiteboards" || pathname === "/whiteboards";

  const isNotes = pathname.startsWith("/api/whiteboard-notes/") || pathname.startsWith("/whiteboard-notes/");
  const isNotesList = pathname === "/api/whiteboard-notes" || pathname === "/whiteboard-notes";

  const isDrawings = pathname.startsWith("/api/whiteboard-drawings/") || pathname.startsWith("/whiteboard-drawings/");
  const isDrawingsList = pathname === "/api/whiteboard-drawings" || pathname === "/whiteboard-drawings";

  const isShares = pathname.startsWith("/api/whiteboard-shares/") || pathname.startsWith("/whiteboard-shares/");
  const isSharesList = pathname === "/api/whiteboard-shares" || pathname === "/whiteboard-shares";

  if (!(isBoards || isBoardsList || isNotes || isNotesList || isDrawings || isDrawingsList || isShares || isSharesList)) {
    return null;
  }

  const token = getTokenFromRequest(request);
  if (!token) return json({ error: "Unauthorized" }, 401, corsHeaders);

  const decoded = decodeAndValidateToken(token);
  if (!decoded.ok) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const profile = await getProfileByEmail(env, decoded.email);
  if (!profile) return json({ error: "User not found" }, 403, corsHeaders);

  const supabaseBase = baseUrl(env);

  /* ==============================
     Whiteboards (resolve by user)
     ============================== */
  const getOrCreateBoardId = async () => {
    const listUrl =
      `${supabaseBase}/rest/v1/whiteboards` +
      `?select=*` +
      `&user_id=eq.${encodeURIComponent(profile.user_id)}` +
      `&order=created_at.asc` +
      `&limit=1`;
    const boards = await sbFetch(env, listUrl, { method: "GET" });
    const existing = Array.isArray(boards) ? boards[0] : null;
    if (existing?.id) return existing.id;

    const newId = crypto.randomUUID();
    const row = {
      id: newId,
      user_id: profile.user_id,
      title: "My Whiteboard",
      canvas_orientation: "landscape",
      canvas_width: 1920,
      canvas_height: 1080,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const createUrl = `${supabaseBase}/rest/v1/whiteboards`;
    const created = await sbFetch(env, createUrl, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    const createdRow = Array.isArray(created) ? created[0] : created;
    return createdRow?.id ?? newId;
  };

  if (isBoardsList && request.method === "GET") {
    const boardId = await getOrCreateBoardId();
    const boardsUrl =
      `${supabaseBase}/rest/v1/whiteboards` +
      `?id=eq.${encodeURIComponent(boardId)}&select=*`;
    const board = await sbFetch(env, boardsUrl, { method: "GET" });
    return json({ ok: true, boards: Array.isArray(board) ? board : [board] }, 200, corsHeaders);
  }

  if (isBoards && request.method === "GET") {
    const boardId = await getOrCreateBoardId();
    const boardsUrl =
      `${supabaseBase}/rest/v1/whiteboards` +
      `?id=eq.${encodeURIComponent(boardId)}&select=*`;
    const board = await sbFetch(env, boardsUrl, { method: "GET" });
    return json({ ok: true, board: Array.isArray(board) ? board[0] : board }, 200, corsHeaders);
  }

  if (isBoardsList && request.method === "POST") {
    const boardId = await getOrCreateBoardId();
    const boardsUrl =
      `${supabaseBase}/rest/v1/whiteboards` +
      `?id=eq.${encodeURIComponent(boardId)}&select=*`;
    const board = await sbFetch(env, boardsUrl, { method: "GET" });
    return json({ ok: true, board: Array.isArray(board) ? board[0] : board }, 200, corsHeaders);
  }

  /* ==============================
     Notes
     ============================== */
  if (isNotesList && request.method === "GET") {
    const whiteboardId = await getOrCreateBoardId();
    const notesUrl =
      `${supabaseBase}/rest/v1/whiteboard_notes_with_status` +
      `?select=*` +
      `&whiteboard_id=eq.${encodeURIComponent(whiteboardId)}`;
    const notes = await sbFetch(env, notesUrl, { method: "GET" });
    return json({ ok: true, notes }, 200, corsHeaders);
  }

  if (isNotes && request.method === "PUT") {
    const id = parseId(pathname);
    if (!id) return json({ error: "Missing note id" }, 400, corsHeaders);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    if (!body.type) {
      return json({ error: "Missing type" }, 400, corsHeaders);
    }

    const row = {
      id,
      whiteboard_id: await getOrCreateBoardId(),
      user_id: profile.user_id,
      type: body.type,
      x: body.x ?? 0,
      y: body.y ?? 0,
      width: body.width ?? 256,
      height: body.height ?? 256,
      rotation: body.rotation ?? 0,
      z_index: body.z_index ?? 1,
      title: body.title ?? null,
      content: body.content ?? null,
      color: body.color ?? "yellow",
      font_size: body.font_size ?? 16,
      image_url: body.image_url ?? null,
      updated_at: new Date().toISOString(),
      status: body.status ?? null,
    };

    const notesUrl = `${supabaseBase}/rest/v1/whiteboard_notes?on_conflict=id`;
    const saved = await sbFetch(env, notesUrl, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    return json({ ok: true, note: Array.isArray(saved) ? saved[0] : saved }, 200, corsHeaders);
  }

  if (isNotes && request.method === "DELETE") {
    const id = parseId(pathname);
    if (!id) return json({ error: "Missing note id" }, 400, corsHeaders);
    const notesUrl = `${supabaseBase}/rest/v1/whiteboard_notes?id=eq.${encodeURIComponent(id)}`;
    await sbFetch(env, notesUrl, { method: "DELETE" });
    return json({ ok: true }, 200, corsHeaders);
  }

  /* ==============================
     Drawings
     ============================== */
  if (isDrawingsList && request.method === "GET") {
    const whiteboardId = await getOrCreateBoardId();
    const drawingsUrl =
      `${supabaseBase}/rest/v1/whiteboard_drawings_with_status` +
      `?select=*` +
      `&whiteboard_id=eq.${encodeURIComponent(whiteboardId)}`;
    const drawings = await sbFetch(env, drawingsUrl, { method: "GET" });
    return json({ ok: true, drawings }, 200, corsHeaders);
  }

  if (isDrawings && request.method === "PUT") {
    const id = parseId(pathname);
    if (!id) return json({ error: "Missing drawing id" }, 400, corsHeaders);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    if (!body.path_points) {
      return json({ error: "Missing path_points" }, 400, corsHeaders);
    }

    const row = {
      id,
      whiteboard_id: await getOrCreateBoardId(),
      user_id: profile.user_id,
      path_points: body.path_points,
      color: body.color ?? "black",
      updated_at: new Date().toISOString(),
      status: body.status ?? null,
    };

    const drawingsUrl = `${supabaseBase}/rest/v1/whiteboard_drawings?on_conflict=id`;
    const saved = await sbFetch(env, drawingsUrl, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    return json({ ok: true, drawing: Array.isArray(saved) ? saved[0] : saved }, 200, corsHeaders);
  }

  if (isDrawings && request.method === "DELETE") {
    const id = parseId(pathname);
    if (!id) return json({ error: "Missing drawing id" }, 400, corsHeaders);
    const drawingsUrl = `${supabaseBase}/rest/v1/whiteboard_drawings?id=eq.${encodeURIComponent(id)}`;
    await sbFetch(env, drawingsUrl, { method: "DELETE" });
    return json({ ok: true }, 200, corsHeaders);
  }

  /* ==============================
     Shares
     ============================== */
  if (isSharesList && request.method === "GET") {
    const whiteboardId = await getOrCreateBoardId();
    const sharesUrl =
      `${supabaseBase}/rest/v1/whiteboard_shares` +
      `?select=*` +
      `&whiteboard_id=eq.${encodeURIComponent(whiteboardId)}`;
    const shares = await sbFetch(env, sharesUrl, { method: "GET" });
    return json({ ok: true, shares }, 200, corsHeaders);
  }

  if (isSharesList && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    if (!body.id) {
      return json({ error: "Missing id" }, 400, corsHeaders);
    }

    const row = {
      id: body.id,
      whiteboard_id: await getOrCreateBoardId(),
      created_by: profile.user_id,
      created_at: new Date().toISOString(),
    };

    const sharesUrl = `${supabaseBase}/rest/v1/whiteboard_shares`;
    const saved = await sbFetch(env, sharesUrl, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    return json({ ok: true, share: Array.isArray(saved) ? saved[0] : saved }, 200, corsHeaders);
  }

  if (isShares && request.method === "GET") {
    const id = parseId(pathname);
    if (!id) return json({ error: "Missing share id" }, 400, corsHeaders);
    const sharesUrl =
      `${supabaseBase}/rest/v1/whiteboard_shares` +
      `?id=eq.${encodeURIComponent(id)}&select=*`;
    const share = await sbFetch(env, sharesUrl, { method: "GET" });
    return json({ ok: true, share: Array.isArray(share) ? share[0] : share }, 200, corsHeaders);
  }

  return json({ error: "Not found" }, 404, corsHeaders);
}


