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

export async function handleTasksApi({
  request,
  env,
  corsHeaders,
  getTokenFromRequest,
  decodeAndValidateToken,
  getProfileByEmail,
}) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const isTasks = pathname.startsWith("/api/tasks/") || pathname.startsWith("/tasks/");
  const isTasksList = pathname === "/api/tasks" || pathname === "/tasks";

  if (!(isTasks || isTasksList)) return null;

  const token = getTokenFromRequest(request);
  if (!token) return json({ error: "Unauthorized" }, 401, corsHeaders);

  const decoded = decodeAndValidateToken(token);
  if (!decoded.ok) return json({ error: "Unauthorized" }, 401, corsHeaders);

  const profile = await getProfileByEmail(env, decoded.email);
  if (!profile) return json({ error: "User not found" }, 403, corsHeaders);

  const supabaseBase = baseUrl(env);
  const userId = profile.user_id;

  // GET /api/tasks?user_id=... (defaults to profile user)
  if (isTasksList && request.method === "GET") {
    const queryUserId = url.searchParams.get("user_id") || userId;
    const tasksUrl =
      `${supabaseBase}/rest/v1/tasks` +
      `?select=*` +
      `&user_id=eq.${encodeURIComponent(queryUserId)}` +
      `&order=date.asc`;
    const tasks = await sbFetch(env, tasksUrl, { method: "GET" });
    return json({ ok: true, tasks }, 200, corsHeaders);
  }

  // POST /api/tasks (create)
  if (isTasksList && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    if (!body.title || !body.type || !body.date || !body.color || !body.urgency) {
      return json({ error: "Missing required fields" }, 400, corsHeaders);
    }

    const row = {
      id: body.id,
      user_id: userId,
      title: body.title,
      category: body.category || "Deep Work",
      type: body.type,
      color: body.color,
      urgency: body.urgency,
      date: body.date,
      time: body.time ?? null,
      duration: body.duration ?? "1h",
      status: body.status ?? "todo",
      progress: body.progress ?? 0,
      updated_at: new Date().toISOString(),
    };

    const tasksUrl = `${supabaseBase}/rest/v1/tasks`;
    const saved = await sbFetch(env, tasksUrl, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    return json({ ok: true, task: Array.isArray(saved) ? saved[0] : saved }, 200, corsHeaders);
  }

  // PUT /api/tasks/:id (update)
  if (isTasks && request.method === "PUT") {
    const id = parseId(pathname);
    if (!id) return json({ error: "Missing task id" }, 400, corsHeaders);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    const row = {
      title: body.title,
      category: body.category,
      type: body.type,
      color: body.color,
      urgency: body.urgency,
      date: body.date,
      time: body.time ?? null,
      duration: body.duration,
      status: body.status,
      progress: body.progress,
      updated_at: new Date().toISOString(),
    };

    const tasksUrl = `${supabaseBase}/rest/v1/tasks?id=eq.${encodeURIComponent(id)}`;
    const saved = await sbFetch(env, tasksUrl, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    return json({ ok: true, task: Array.isArray(saved) ? saved[0] : saved }, 200, corsHeaders);
  }

  // DELETE /api/tasks/:id
  if (isTasks && request.method === "DELETE") {
    const id = parseId(pathname);
    if (!id) return json({ error: "Missing task id" }, 400, corsHeaders);
    const tasksUrl = `${supabaseBase}/rest/v1/tasks?id=eq.${encodeURIComponent(id)}`;
    await sbFetch(env, tasksUrl, { method: "DELETE" });
    return json({ ok: true }, 200, corsHeaders);
  }

  return json({ error: "Not found" }, 404, corsHeaders);
}
