import axios from "axios";

const TOKEN_KEY = "mindflow_token";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

function buildUrl(config = {}) {
  const base = (config.baseURL || "").replace(/\/$/, "");
  const path = (config.url || "").replace(/^\//, "");
  return path ? `${base}/${path}` : base;
}

function logApiError(error, context = "") {
  const method = error.config?.method?.toUpperCase() || "UNKNOWN";
  const url = buildUrl(error.config);

  if (error.response) {
    console.error(`[API ERROR][${context}] ${method} ${url} -> ${error.response.status}`, {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
    });
    return;
  }

  if (error.request) {
    console.error(
      `[API NETWORK FAILURE][${context}] ${method} ${url} -> no response received (possible backend down/CORS/network issue)`,
      {
        request: error.request,
      }
    );
    return;
  }

  console.error(`[API SETUP ERROR][${context}] ${method} ${url}`, {
    message: error.message,
  });
}

// Sanitise request payload before logging – omit fields that may carry credentials.
function sanitisePayload(data) {
  if (!data || typeof data !== "object") return data;
  const SENSITIVE = new Set(["password", "password_hash", "token", "access_token"]);
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, SENSITIVE.has(k) ? "[REDACTED]" : v])
  );
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.debug("[API REQUEST]", {
      method: config.method?.toUpperCase(),
      url: buildUrl(config),
      payload: sanitisePayload(
        typeof config.data === "string" ? JSON.parse(config.data) : config.data
      ),
      params: config.params,
    });

    return config;
  },
  (error) => {
    logApiError(error, "request_interceptor");
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.debug("[API RESPONSE]", {
      method: response.config?.method?.toUpperCase(),
      url: buildUrl(response.config),
      status: response.status,
    });
    return response;
  },
  (error) => {
    logApiError(error, "response_interceptor");
    return Promise.reject(error);
  }
);

async function withErrorLogging(context, requestFn) {
  try {
    return await requestFn();
  } catch (error) {
    logApiError(error, context);
    throw error;
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUserId() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getErrorMessage(error, fallback = "Something went wrong.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  if (error.response) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length) {
      return detail
        .map((item) => item?.msg || item?.message || item?.detail)
        .filter(Boolean)
        .join(" ");
    }

    if (detail && typeof detail === "object") {
      if (typeof detail.message === "string" && detail.message.trim()) return detail.message;
      if (typeof detail.error === "string" && detail.error.trim()) return detail.error;
    }

    return `Request failed with status ${error.response.status}.`;
  }

  if (error.request) {
    return "Unable to reach the server. Please check whether the backend is running on http://127.0.0.1:8000.";
  }

  if (typeof error.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

// Validated against backend routers/schemas:
// - baseURL: http://127.0.0.1:8000/api
// - auth: POST /auth/signup, POST /auth/login, GET /auth/me
// - behaviors: GET/POST /behaviors/{userId}
// - ui: GET /ui/{userId}/overview, /analysis, /profile, /chat/bootstrap; POST /ui/{userId}/chat
// - analysis: POST /analysis/{userId} payload: { days: number }

export async function logOut() {
  try {
    await withErrorLogging("logOut", () => api.post("/auth/logout"));
  } catch {
    // best-effort — always clear local token
  }
  clearStoredToken();
}

export async function signUp(payload) {
  const { data } = await withErrorLogging("signUp", () => api.post("/auth/signup", payload));
  setStoredToken(data.access_token);
  return { user: data.user, isNewUser: data.is_new_user ?? true };
}

export async function logIn(payload) {
  const { data } = await withErrorLogging("logIn", () => api.post("/auth/login", payload));
  setStoredToken(data.access_token);
  return { user: data.user, isNewUser: data.is_new_user ?? false };
}

export async function fetchCurrentUser() {
  const { data } = await withErrorLogging("fetchCurrentUser", () => api.get("/auth/me"));
  return data;
}

export async function bootstrapDemoUser() {
  try {
    return await fetchCurrentUser();
  } catch (error) {
    // Non-fatal bootstrap helper. Caller can continue rendering fallback UI.
    logApiError(error, "bootstrapDemoUser");
    return null;
  }
}
export async function ensureSeedLogs() {
  return false;
}
export async function fetchOverview(userId) {
  const { data } = await withErrorLogging("fetchOverview", () => api.get(`/ui/${userId}/overview`));
  return data;
}

export async function fetchAnalysis(userId, days = 7) {
  const { data } = await withErrorLogging("fetchAnalysis", () => api.post(`/analysis/${userId}`, { days }));
  return data;
}

export async function fetchAnalysisView(userId, days = 7) {
  const { data } = await withErrorLogging("fetchAnalysisView", () =>
    api.get(`/ui/${userId}/analysis`, { params: { days } })
  );
  return data;
}

export async function fetchProfileView(userId) {
  const { data } = await withErrorLogging("fetchProfileView", () => api.get(`/ui/${userId}/profile`));
  return data;
}

export async function fetchHeatmap(userId) {
  const { data } = await withErrorLogging("fetchHeatmap", () => api.get(`/ui/${userId}/heatmap`));
  return data;
}

export async function fetchHabitCorrelations(userId) {
  const { data } = await withErrorLogging("fetchHabitCorrelations", () =>
    api.get(`/ui/${userId}/habit-correlations`)
  );
  return data;
}

export async function fetchFocusPrediction(userId) {
  const { data } = await withErrorLogging("fetchFocusPrediction", () =>
    api.get(`/ui/${userId}/focus-prediction`)
  );
  return data;
}

export async function fetchWeeklyReport(userId) {
  const { data } = await withErrorLogging("fetchWeeklyReport", () =>
    api.get(`/ui/${userId}/weekly-report`)
  );
  return data;
}

export async function fetchChatBootstrap(userId) {
  const { data } = await withErrorLogging("fetchChatBootstrap", () => api.get(`/ui/${userId}/chat/bootstrap`));
  return data;
}

export async function fetchChatHistory(userId, offset = 0) {
  const { data } = await withErrorLogging("fetchChatHistory", () =>
    api.get(`/ui/${userId}/chat/history`, { params: { offset } })
  );
  return data;
}

export async function createBehavior(userId, payload) {
  const { data } = await withErrorLogging("createBehavior", () => api.post(`/behaviors/${userId}`, payload));
  return data;
}

export async function updateBehavior(userId, logId, payload) {
  const { data } = await withErrorLogging("updateBehavior", () =>
    api.put(`/behaviors/${userId}/${logId}`, payload)
  );
  return data;
}

export async function deleteBehavior(userId, logId) {
  await withErrorLogging("deleteBehavior", () =>
    api.delete(`/behaviors/${userId}/${logId}`)
  );
}

export async function fetchBehaviors(userId, limit = 20) {
  const { data } = await withErrorLogging("fetchBehaviors", () =>
    api.get(`/behaviors/${userId}`, { params: { limit } })
  );
  return data;
}

export async function askAssistant(userId, message, sessionId = null) {
  const { data } = await withErrorLogging("askAssistant", () =>
    api.post(`/ui/${userId}/chat`, { message, session_id: sessionId }, { timeout: 30000 })
  );
  return data;
}

export async function fetchChatSessions(userId) {
  const { data } = await withErrorLogging("fetchChatSessions", () =>
    api.get(`/ui/${userId}/chat/sessions`)
  );
  return data;
}

export async function createChatSession(userId) {
  const { data } = await withErrorLogging("createChatSession", () =>
    api.post(`/ui/${userId}/chat/sessions`)
  );
  return data;
}

export async function deleteChatSession(userId, sessionId) {
  await withErrorLogging("deleteChatSession", () =>
    api.delete(`/ui/${userId}/chat/sessions/${sessionId}`)
  );
}

export async function renameChatSession(userId, sessionId, title) {
  const { data } = await withErrorLogging("renameChatSession", () =>
    api.patch(`/ui/${userId}/chat/sessions/${sessionId}`, { title })
  );
  return data;
}

export async function fetchPreferences(userId) {
  const { data } = await withErrorLogging("fetchPreferences", () =>
    api.get(`/ui/${userId}/preferences`)
  );
  return data;
}

export async function updatePreferences(userId, payload) {
  const { data } = await withErrorLogging("updatePreferences", () =>
    api.patch(`/ui/${userId}/preferences`, payload)
  );
  return data;
}

export async function fetchChatHistoryBySession(userId, sessionId, limit = 50, offset = 0) {
  const { data } = await withErrorLogging("fetchChatHistoryBySession", () =>
    api.get(`/ui/${userId}/chat/history`, { params: { session_id: sessionId, limit, offset } })
  );
  return data;
}

// ── Community: Posts ──────────────────────────────────────────────────────────
export async function fetchPosts(params = {}) {
  const { data } = await withErrorLogging("fetchPosts", () =>
    api.get("/community/posts", { params })
  );
  return data;
}

export async function createPost(payload) {
  const { data } = await withErrorLogging("createPost", () =>
    api.post("/community/posts", payload)
  );
  return data;
}

export async function updatePost(postId, payload) {
  const { data } = await withErrorLogging("updatePost", () =>
    api.patch(`/community/posts/${postId}`, payload)
  );
  return data;
}

export async function deletePost(postId) {
  await withErrorLogging("deletePost", () => api.delete(`/community/posts/${postId}`));
}

export async function toggleLike(postId) {
  const { data } = await withErrorLogging("toggleLike", () =>
    api.post(`/community/posts/${postId}/like`)
  );
  return data;
}

export async function fetchComments(postId) {
  const { data } = await withErrorLogging("fetchComments", () =>
    api.get(`/community/posts/${postId}/comments`)
  );
  return data;
}

export async function createComment(postId, content) {
  const { data } = await withErrorLogging("createComment", () =>
    api.post(`/community/posts/${postId}/comments`, { content })
  );
  return data;
}

export async function deleteComment(postId, commentId) {
  await withErrorLogging("deleteComment", () =>
    api.delete(`/community/posts/${postId}/comments/${commentId}`)
  );
}

// ── Community: Challenges ─────────────────────────────────────────────────────
export async function fetchChallenges(params = {}) {
  const { data } = await withErrorLogging("fetchChallenges", () =>
    api.get("/community/challenges", { params })
  );
  return data;
}

export async function createChallenge(payload) {
  const { data } = await withErrorLogging("createChallenge", () =>
    api.post("/community/challenges", payload)
  );
  return data;
}

export async function joinChallenge(challengeId) {
  const { data } = await withErrorLogging("joinChallenge", () =>
    api.post(`/community/challenges/${challengeId}/join`)
  );
  return data;
}

export async function leaveChallenge(challengeId) {
  await withErrorLogging("leaveChallenge", () =>
    api.delete(`/community/challenges/${challengeId}/join`)
  );
}

export async function checkinChallenge(challengeId) {
  const { data } = await withErrorLogging("checkinChallenge", () =>
    api.post(`/community/challenges/${challengeId}/checkin`)
  );
  return data;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function fetchNotifications(userId) {
  const { data } = await withErrorLogging("fetchNotifications", () =>
    api.get(`/ui/${userId}/notifications`)
  );
  return data;
}

export async function markNotificationRead(userId, notifId) {
  const { data } = await withErrorLogging("markNotificationRead", () =>
    api.patch(`/ui/${userId}/notifications/${notifId}`)
  );
  return data;
}

export async function markAllNotificationsRead(userId) {
  await withErrorLogging("markAllNotificationsRead", () =>
    api.post(`/ui/${userId}/notifications/read-all`)
  );
}

// ── Follow / Following ────────────────────────────────────────────────────────
export async function fetchFollowStatus(targetId) {
  const { data } = await withErrorLogging("fetchFollowStatus", () =>
    api.get(`/community/users/${targetId}/follow-status`)
  );
  return data;
}

export async function followUser(targetId) {
  const { data } = await withErrorLogging("followUser", () =>
    api.post(`/community/users/${targetId}/follow`)
  );
  return data;
}

export async function unfollowUser(targetId) {
  const { data } = await withErrorLogging("unfollowUser", () =>
    api.delete(`/community/users/${targetId}/follow`)
  );
  return data;
}

export async function fetchFollowers(targetId) {
  const { data } = await withErrorLogging("fetchFollowers", () =>
    api.get(`/community/users/${targetId}/followers`)
  );
  return data;
}

export async function fetchFollowing(targetId) {
  const { data } = await withErrorLogging("fetchFollowing", () =>
    api.get(`/community/users/${targetId}/following`)
  );
  return data;
}

export async function fetchPublicProfile(targetId) {
  const { data } = await withErrorLogging("fetchPublicProfile", () =>
    api.get(`/community/users/${targetId}/public-profile`)
  );
  return data;
}

// ── Password Reset ────────────────────────────────────────────────────────────
export async function requestPasswordReset(email) {
  const { data } = await withErrorLogging("requestPasswordReset", () =>
    api.post("/auth/forgot-password", { email })
  );
  return data;
}

export async function confirmPasswordReset(token, newPassword) {
  const { data } = await withErrorLogging("confirmPasswordReset", () =>
    api.post("/auth/reset-password", { token, new_password: newPassword })
  );
  return data;
}

// ── Export ────────────────────────────────────────────────────────────────────
export async function exportBehaviors(userId, format = "csv") {
  const response = await withErrorLogging("exportBehaviors", () =>
    api.get(`/ui/${userId}/export`, { params: { format }, responseType: "blob" })
  );
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `behaviors.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportChatSession(userId, sessionId) {
  const response = await withErrorLogging("exportChatSession", () =>
    api.get(`/ui/${userId}/chat/sessions/${sessionId}/export`, { responseType: "blob" })
  );
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat_${sessionId}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default api;
