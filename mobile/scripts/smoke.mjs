const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const RUN_AUTH = process.argv.includes("--auth");

async function check(url, label, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
  console.log(`✅ ${label}: ${res.status}`);
  return res;
}

async function runAuthSmoke() {
  const usernameOrEmail = process.env.SMOKE_USERNAME_OR_EMAIL;
  const password = process.env.SMOKE_PASSWORD;

  if (!usernameOrEmail || !password) {
    throw new Error("auth smoke requires SMOKE_USERNAME_OR_EMAIL and SMOKE_PASSWORD");
  }

  const loginRes = await check(`${API_BASE_URL}/auth/login`, "auth_login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
  });

  const loginData = await loginRes.json();
  const token = loginData?.access_token;
  if (!token) throw new Error("auth_login succeeded but access_token missing");

  await check(`${API_BASE_URL}/auth/me`, "auth_me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function run() {
  console.log(`ℹ️  API base: ${API_BASE_URL}`);
  console.log(`ℹ️  API origin: ${API_ORIGIN}`);
  await check(`${API_ORIGIN}/health`, "health");
  await check(`${API_ORIGIN}/`, "root");

  if (RUN_AUTH) {
    console.log("ℹ️  Running auth smoke checks");
    await runAuthSmoke();
  }

  console.log("🎉 Mobile smoke checks passed");
}

run().catch((err) => {
  console.error("❌ Mobile smoke checks failed");
  console.error("   reason:", err.message);
  console.error("   hint: backend server가 실행 중인지 확인하세요. 예) docker compose up -d");
  process.exit(1);
});
