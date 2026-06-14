import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const stamp = Date.now();
const port = 8900 + Math.floor(Math.random() * 700);
const baseUrl = `http://127.0.0.1:${port}`;
const workspaceRoot = path.join(root, "work", `qa-runtime-${stamp}`);
const runtimeRoot = path.join(workspaceRoot, "runtime");
const backupRoot = path.join(workspaceRoot, "backups");
const adminPassword = "ThreadsMeTest123!";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  let json = null;
  const text = await response.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json, text };
}

async function waitForServer(child) {
  const start = Date.now();
  while (Date.now() - start < 20_000) {
    if (child.exitCode !== null) break;
    try {
      const { response } = await request("/api/health");
      if (response.status === 200) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error("AI server tidak ready untuk smoke test.");
}

function parseSessionCookie(response) {
  const raw = response.headers.get("set-cookie") || "";
  const match = raw.match(/tm_session=[^;]+/);
  assert(match, "Auth setup tidak pulangkan session cookie.");
  return match[0];
}

async function run() {
  await mkdir(runtimeRoot, { recursive: true });
  const child = spawn(process.execPath, ["ai-server.mjs", String(port)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      THREADSME_AI_PORT: String(port),
      THREADSME_WORKSPACE_ROOT: workspaceRoot,
      THREADSME_RUNTIME_DIR: runtimeRoot,
      THREADSME_BACKUP_DIR: backupRoot,
      DEEPSEEK_API_KEY: "",
      DEEPSEEK_API_KEY_FILE: path.join(workspaceRoot, "private", "missing.key"),
      SHOPEE_COOKIE: "",
      SHOPEE_COOKIE_FILE: path.join(workspaceRoot, "private", "shopee-cookie.txt"),
      THREADSME_AUTH_REQUIRED: "true",
      THREADSME_ALLOWED_ORIGINS: "http://localhost,http://localhost:80,http://127.0.0.1,http://127.0.0.1:80",
    },
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(child);

    const health = await request("/api/health");
    assert(health.response.status === 200 && health.json?.ok, "Health endpoint gagal.");
    assert(health.json.authRequired === true, "Auth wajib tidak aktif dalam smoke test.");
    assert(health.json.authenticated === false, "Health unauth sepatutnya belum authenticated.");

    const locked = await request("/api/system-data");
    assert(locked.response.status === 401, "Protected GET tanpa login mesti pulang 401.");

    const evilCors = await request("/api/health", { headers: { origin: "http://evil.example" } });
    assert(evilCors.response.status === 403, "Origin luar sepatutnya ditolak.");

    const setup = await request("/api/auth/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: adminPassword }),
    });
    assert(setup.response.status === 200 && setup.json?.authenticated, "Setup admin gagal.");
    const cookie = parseSessionCookie(setup.response);
    const csrfToken = setup.json.csrfToken;
    assert(csrfToken, "CSRF token tiada selepas login.");

    const csrfBlocked = await request("/api/runtime-backup/snapshot", {
      method: "POST",
      headers: { cookie },
    });
    assert(csrfBlocked.response.status === 403, "POST tanpa CSRF mesti pulang 403.");

    const invalidStatus = await request("/api/story-runs/status", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-threadsme-csrf": csrfToken,
      },
      body: JSON.stringify({ versionId: "missing", status: "bukan-status" }),
    });
    assert(invalidStatus.response.status === 400, "Validation invalid mesti pulang 400.");

    const story = await request("/api/generate-story", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-threadsme-csrf": csrfToken,
      },
      body: JSON.stringify({
        productTitle: "Sambal Nyet Berapi 180g",
        productCategory: "sambal ready-to-eat untuk lauk cepat",
        affiliateLink: "https://s.shopee.com.my/5q5IqSXkro",
        postsPerDay: 25,
        versions: 2,
      }),
    });
    assert(story.response.status === 200, `Generate story gagal: ${story.text}`);
    assert(story.json?.versions?.length === 2, "Generate story tidak pulang 2 versi.");
    assert(story.json?.run?.schedule?.postsPerDay === 25, "Schedule generated tidak ikut 25 posting/hari.");

    const shopeeCookie = await request("/api/shopee-cookie/config", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-threadsme-csrf": csrfToken,
      },
      body: JSON.stringify({ cookie: "" }),
    });
    assert(shopeeCookie.response.status === 200 && shopeeCookie.json?.hasCookie === false, "Shopee cookie config gagal.");

    const backup = await request("/api/runtime-backup/snapshot", {
      method: "POST",
      headers: { cookie, "x-threadsme-csrf": csrfToken },
    });
    assert(backup.response.status === 200 && backup.json?.saved, "Runtime backup gagal.");

    console.log("QA smoke passed");
  } finally {
    child.kill();
    await delay(250);
    if (child.exitCode === null) child.kill("SIGKILL");
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
