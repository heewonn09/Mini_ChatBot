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

  const seed = [
    { text: "Morning study sprint", emotion: "focused", tag: "Study", intensity: 8, daysAgo: 6, hour: 9 },
    { text: "YouTube browsing", emotion: "stressed", tag: "YouTube", intensity: 6, daysAgo: 6, hour: 22 },
    { text: "Workout", emotion: "happy", tag: "Exercise", intensity: 7, daysAgo: 5, hour: 7 },
    { text: "Social media scrolling", emotion: "anxious", tag: "Social Media", intensity: 6, daysAgo: 5, hour: 21 },
    { text: "Deep work", emotion: "motivated", tag: "Work", intensity: 8, daysAgo: 4, hour: 10 },
    { text: "Late-night streaming", emotion: "sad", tag: "Netflix", intensity: 5, daysAgo: 4, hour: 23 },
    { text: "Reading session", emotion: "calm", tag: "Reading", intensity: 7, daysAgo: 3, hour: 9 },
    { text: "Coffee break", emotion: "neutral", tag: "Break", intensity: 4, daysAgo: 3, hour: 15 },
    { text: "Study session", emotion: "focused", tag: "Study", intensity: 8, daysAgo: 2, hour: 11 },
    { text: "YouTube browsing", emotion: "stressed", tag: "YouTube", intensity: 6, daysAgo: 2, hour: 21 },
    { text: "Project planning", emotion: "motivated", tag: "Work", intensity: 8, daysAgo: 1, hour: 9 },
    { text: "Workout", emotion: "happy", tag: "Exercise", intensity: 7, daysAgo: 1, hour: 18 },
    { text: "Study session", emotion: "focused", tag: "Study", intensity: 9, daysAgo: 0, hour: 9 },
    { text: "Social media scrolling", emotion: "stressed", tag: "Social Media", intensity: 6, daysAgo: 0, hour: 22 },
    { text: "YouTube browsing", emotion: "anxious", tag: "YouTube", intensity: 7, daysAgo: 0, hour: 23 },
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
