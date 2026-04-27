import axios from "axios";

const TOKEN_KEY = "mindflow_token";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
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

  if (typeof error.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

export async function signUp(payload) {
  const { data } = await api.post("/auth/signup", payload);
  setStoredToken(data.access_token);
  return data.user;
}

export async function logIn(payload) {
  const { data } = await api.post("/auth/login", payload);
  setStoredToken(data.access_token);
  return data.user;
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function ensureSeedLogs(userId) {
  const { data } = await api.get(`/behaviors/${userId}`, { params: { limit: 1 } });
  if (data?.length) return;

  const seed = [
    { text: "Morning study sprint", emotion: "focused", tag: "Study", intensity: 8, daysAgo: 2, hour: 9 },
    { text: "YouTube browsing", emotion: "stressed", tag: "YouTube", intensity: 6, daysAgo: 1, hour: 22 },
    { text: "Workout", emotion: "happy", tag: "Exercise", intensity: 7, daysAgo: 1, hour: 7 },
    { text: "Study session", emotion: "focused", tag: "Study", intensity: 9, daysAgo: 0, hour: 10 },
  ];

  await Promise.all(
    seed.map((item) => {
      const createdAt = new Date();
      createdAt.setHours(item.hour, 0, 0, 0);
      createdAt.setDate(createdAt.getDate() - item.daysAgo);

      return api.post(`/behaviors/${userId}`, {
        text: item.text,
        emotion: item.emotion,
        tag: item.tag,
        intensity: item.intensity,
        created_at: createdAt.toISOString(),
      });
    })
  );
}

export async function fetchOverview(userId) {
  const { data } = await api.get(`/ui/${userId}/overview`);
  return data;
}

export async function fetchAnalysis(userId, days = 7) {
  const { data } = await api.post(`/analysis/${userId}`, { days });
  return data;
}

export async function fetchAnalysisView(userId) {
  const { data } = await api.get(`/ui/${userId}/analysis`);
  return data;
}

export async function fetchProfileView(userId) {
  const { data } = await api.get(`/ui/${userId}/profile`);
  return data;
}

export async function fetchChatBootstrap(userId) {
  const { data } = await api.get(`/ui/${userId}/chat/bootstrap`);
  return data;
}

export async function createBehavior(userId, payload) {
  const { data } = await api.post(`/behaviors/${userId}`, payload);
  return data;
}

export async function fetchBehaviors(userId, limit = 20) {
  const { data } = await api.get(`/behaviors/${userId}`, { params: { limit } });
  return data;
}

export async function askAssistant(userId, message) {
  const { data } = await api.post(`/ui/${userId}/chat`, { message });
  return data;
}

export default api;
