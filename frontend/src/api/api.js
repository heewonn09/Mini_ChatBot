import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

export async function bootstrapDemoUser() {
  try {
    const { data } = await api.get("/users", { params: { limit: 1 } });
    if (data?.length) return data[0];
  } catch {
    // ignore and try create
  }

  const payload = {
    username: "alex_johnson",
    email: "alex@example.com",
  };

  const { data } = await api.post("/users/", payload);
  return data;
}

export async function ensureSeedLogs(userId) {
  const { data } = await api.get(`/behaviors/${userId}`, { params: { limit: 1 } });
  if (data?.length) return;

  const now = new Date();
  const seed = [
    ["Study Session", "focused", "Study", 8],
    ["YouTube browsing", "stressed", "YouTube", 6],
    ["Workout", "happy", "Exercise", 7],
    ["Social media scrolling", "anxious", "Social Media", 6],
    ["Deep work", "motivated", "Work", 8],
    ["Late-night streaming", "sad", "Netflix", 5],
    ["Reading", "calm", "Reading", 7],
  ];

  await Promise.all(
    seed.map(([text, emotion, tag, intensity], i) => {
      const payload = { text, emotion, tag, intensity };
      return api.post(`/behaviors/${userId}`, payload, {
        params: { at: new Date(now.getTime() - i * 1000).toISOString() },
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
