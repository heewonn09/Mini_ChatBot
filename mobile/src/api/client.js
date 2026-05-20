import axios from "axios";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "mindflow_access_token";
const REFRESH_TOKEN_KEY = "mindflow_refresh_token";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
let refreshPromise = null;

async function getAccessToken() { return SecureStore.getItemAsync(ACCESS_TOKEN_KEY); }
async function getRefreshToken() { return SecureStore.getItemAsync(REFRESH_TOKEN_KEY); }
async function persistTokens(accessToken, refreshToken) {
  if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((r) => r, async (error) => {
  const req = error.config;
  const status = error?.response?.status;
  if (status !== 401 || req?._retry || req?.url?.includes("/auth/refresh")) return Promise.reject(error);
  req._retry = true;
  try {
    if (!refreshPromise) refreshPromise = refreshSession();
    await refreshPromise; refreshPromise = null;
    const token = await getAccessToken();
    if (token) req.headers.Authorization = `Bearer ${token}`;
    return api(req);
  } catch (e) {
    refreshPromise = null;
    await clearStoredAuth();
    return Promise.reject(e);
  }
});

export async function clearStoredAuth() { await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]); }
export async function refreshSession() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  const { data } = await api.post("/auth/refresh", { refresh_token: refreshToken });
  await persistTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logIn(payload) { const { data } = await api.post("/auth/login", payload); await persistTokens(data.access_token, data.refresh_token); return data.user; }
export async function signUp(payload) { const { data } = await api.post("/auth/signup", payload); await persistTokens(data.access_token, data.refresh_token); return data.user; }
export async function fetchCurrentUser() { const { data } = await api.get("/auth/me"); return data; }
export async function hydrateSession() { const t = await getAccessToken(); if (!t) return null; try { return await fetchCurrentUser(); } catch { await refreshSession(); return fetchCurrentUser(); } }
export async function fetchOverview(userId) { const { data } = await api.get(`/ui/${userId}/overview`); return data; }
export async function createBehavior(userId, payload) { const { data } = await api.post(`/behaviors/${userId}`, payload); return data; }
