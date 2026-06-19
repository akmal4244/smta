import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function write(relativePath, content) {
  await writeFile(path.join(root, relativePath), content, "utf8");
}

function replaceOnceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Patch target tidak ditemui: ${label}`);
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

function replaceRegexRequired(source, pattern, replacement, label) {
  if (typeof replacement === "string" && source.includes(replacement)) return source;
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Patch regex tidak sepadan: ${label}`);
  return next;
}

async function patchAiServer() {
  let source = await read("ai-server.mjs");

  source = replaceOnceRequired(
    source,
    'import { access, appendFile, copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";',
    'import { access, appendFile, copyFile, mkdir, readFile, readdir, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";',
    "fs realpath import",
  );

  source = replaceOnceRequired(
    source,
    'const publicBaseUrl = String(process.env.THREADSME_PUBLIC_URL || "").replace(/\\/+$/, "");\nconst forceHttps = process.env.THREADSME_FORCE_HTTPS === "true";',
    'const publicBaseUrl = String(process.env.THREADSME_PUBLIC_URL || "").replace(/\\/+$/, "");\nconst forceHttps = process.env.THREADSME_FORCE_HTTPS === "true";\nconst extensionBridgeUrl = publicBaseUrl || `http://${host}:${port}`;\nconst secureSessionCookie = forceHttps || /^https:\\/\\//i.test(publicBaseUrl);',
    "public URL continuity constants",
  );

  source = replaceRegexRequired(
    source,
    /const blockedStaticRuntimeFiles = new Set\(\[\n(?:.|\n)*?\n\]\);/,
    `const publicStaticRootFiles = new Set([\n  "index.html",\n  "styles.css",\n  "app.js",\n  "config.js",\n  "threadsme-extension.zip",\n  "favicon.ico",\n  "manifest.webmanifest",\n  "robots.txt",\n  "service-worker.js",\n]);\n\nfunction staticPublicPath(filePath) {\n  return path.relative(here, filePath).split(path.sep).join("/");\n}\n\nfunction isPublicStaticPath(relativePath) {\n  if (!relativePath || relativePath === ".") return false;\n  const segments = relativePath.split("/");\n  if (segments.some((segment) => !segment || segment.startsWith("."))) return false;\n  return publicStaticRootFiles.has(relativePath) || relativePath.startsWith("assets/");\n}`,
    "static public allowlist",
  );

  source = source.replaceAll('`http://${host}:${port}`', "extensionBridgeUrl");
  source = source.replace(
    "const extensionBridgeUrl = publicBaseUrl || extensionBridgeUrl;",
    'const extensionBridgeUrl = publicBaseUrl || `http://${host}:${port}`;',
  );
  if (!source.includes("bridgeUrl: extensionBridgeUrl")) throw new Error("Bridge URL public patch gagal.");

  source = replaceRegexRequired(
    source,
    /function authCookie\(session\) \{\n(?:.|\n)*?\n\}\n\nfunction expiredAuthCookie\(\) \{\n(?:.|\n)*?\n\}/,
    `function sessionCookieSecurity() {\n  return secureSessionCookie ? "; Secure" : "";\n}\n\nfunction authCookie(session) {\n  const maxAge = Math.floor(adminSessionTtlMs / 1000);\n  return \`tm_session=\${encodeURIComponent(session.token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=\${maxAge}\${sessionCookieSecurity()}\`;\n}\n\nfunction expiredAuthCookie() {\n  return \`tm_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0\${sessionCookieSecurity()}\`;\n}`,
    "secure admin session cookie",
  );

  source = replaceOnceRequired(
    source,
    "const autoCompletePastSlots = nativeScheduleMode || options.autoCompletePastSlots !== false;",
    "const autoCompletePastSlots = nativeScheduleMode || options.autoCompletePastSlots === true;",
    "proof-based Lulus default",
  );

  source = replaceRegexRequired(
    source,
    /function resolveStaticRequest\(pathname\) \{\n(?:.|\n)*?\n\}\n\nasync function serveStatic\(req, res, url\) \{\n(?:.|\n)*?\n\}\n\nasync function readBody/,
    `function resolveStaticRequest(pathname) {\n  let normalized = "";\n  try {\n    normalized = decodeURIComponent(pathname || "/");\n  } catch {\n    return null;\n  }\n  const cleanPath = normalized.replace(/^\\/threadsme(?=\\/|$)/i, "") || "/";\n  const relativePath = cleanPath.endsWith("/") ? \`\${cleanPath}index.html\` : cleanPath;\n  const target = path.resolve(here, \`.\${relativePath}\`);\n  const relative = path.relative(here, target);\n  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;\n  if (!isPublicStaticPath(staticPublicPath(target))) return null;\n  return target;\n}\n\nfunction staticSecurityHeaders(req) {\n  const connectSources = new Set([\n    "'self'",\n    "http://127.0.0.1:8788",\n    "http://localhost:8788",\n  ]);\n  if (publicBaseUrl) {\n    try {\n      connectSources.add(new URL(publicBaseUrl).origin);\n    } catch {\n      // Invalid public URL is ignored here and remains visible through ops configuration.\n    }\n  }\n  const headers = {\n    "x-content-type-options": "nosniff",\n    "referrer-policy": "same-origin",\n    "x-frame-options": "DENY",\n    "x-robots-tag": "noindex, nofollow, noarchive",\n    "permissions-policy": "camera=(), microphone=(), geolocation=()",\n    "content-security-policy": [\n      "default-src 'self'",\n      "script-src 'self'",\n      "style-src 'self' 'unsafe-inline'",\n      "img-src 'self' data: blob: https: http:",\n      \`connect-src \${[...connectSources].join(" ")}\`,\n      "object-src 'none'",\n      "base-uri 'self'",\n      "frame-ancestors 'none'",\n      "form-action 'self'",\n    ].join("; "),\n  };\n  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();\n  if (forwardedProto === "https" || secureSessionCookie) {\n    headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";\n  }\n  return headers;\n}\n\nfunction staticCacheControl(filePath, url) {\n  const relative = staticPublicPath(filePath);\n  if (relative === "index.html" || relative === "config.js") return "no-store";\n  if (url.searchParams.has("v")) return "public, max-age=31536000, immutable";\n  return "public, max-age=300, must-revalidate";\n}\n\nasync function serveStatic(req, res, url) {\n  if (!["GET", "HEAD"].includes(req.method || "GET")) {\n    sendJson(res, 405, { ok: false, error: "Method not allowed" }, { allow: "GET, HEAD" });\n    return true;\n  }\n\n  const target = resolveStaticRequest(url.pathname);\n  if (!target) {\n    sendJson(res, 404, { ok: false, error: "Not found" });\n    return true;\n  }\n\n  try {\n    const info = await stat(target);\n    if (!info.isFile()) throw new Error("Not a file");\n    const canonicalPath = await realpath(target);\n    const canonicalRelative = path.relative(here, canonicalPath);\n    if (canonicalRelative.startsWith("..") || path.isAbsolute(canonicalRelative) || !isPublicStaticPath(staticPublicPath(canonicalPath))) {\n      sendJson(res, 404, { ok: false, error: "Not found" });\n      return true;\n    }\n    const body = req.method === "HEAD" ? null : await readFile(canonicalPath);\n    const ext = path.extname(canonicalPath).toLowerCase();\n    res.writeHead(200, {\n      ...staticSecurityHeaders(req),\n      "content-type": staticMime.get(ext) || "application/octet-stream",\n      "cache-control": staticCacheControl(canonicalPath, url),\n      "last-modified": info.mtime.toUTCString(),\n    });\n    res.end(body || undefined);\n  } catch {\n    sendJson(res, 404, { ok: false, error: "Not found" });\n  }\n  return true;\n}\n\nasync function readBody`,
    "AI server static hardening",
  );

  source = replaceOnceRequired(source, 'version: "0.9.6",', 'version: "0.10.3",', "runtime backup version");
  source = source.replaceAll("run.productTitle = run.productTitle || productTitle;", "run.productTitle = productTitle;");
  source = source.replaceAll("run.productCategory = run.productCategory || productCategory;", "run.productCategory = productCategory;");
  source = replaceOnceRequired(
    source,
    'if (quality.status === "review") post.qualityReasons = quality.reasons;',
    "post.qualityReasons = quality.reasons;",
    "clear stale quality reasons",
  );
  source = replaceOnceRequired(
    source,
    `    if (runTouched) {\n      run.productTitle = run.productTitle || post.productTitle;\n      run.productCategory = run.productCategory || post.productCategory;\n      run.autoRegeneratedAt = \`\${malaysiaNow()} GMT+8\`;\n    }`,
    `    if (runTouched) {\n      if (post.productTitle) run.productTitle = post.productTitle;\n      if (post.productCategory) run.productCategory = post.productCategory;\n      run.autoRegeneratedAt = \`\${malaysiaNow()} GMT+8\`;\n    }`,
    "sync regenerated run metadata",
  );

  await write("ai-server.mjs", source);
}

async function patchExtensionContent() {
  let source = await read("threadsme-extension/src/content.js");
  source = replaceOnceRequired(
    source,
    `    if (mismatch || extraFilled.length) {\n      boxes.forEach(clearTextboxValue);\n      throw new Error("Composer Threads nampak tidak selari selepas isi. Extension kosongkan draf untuk elak duplicate/over-limit.");\n    }\n  }`,
    `    if (mismatch || extraFilled.length) {\n      boxes.forEach(clearTextboxValue);\n      throw new Error("Composer Threads nampak tidak selari selepas isi. Extension kosongkan draf untuk elak duplicate/over-limit.");\n    }\n    return expected;\n  }`,
    "return normalized composer parts",
  );
  source = replaceOnceRequired(
    source,
    "      await fillThread(post, delayMs);\n      validatePreview(post);",
    "      const parts = await fillThread(post, delayMs);\n      validatePreview(post);",
    "define parts before submitSchedule",
  );
  await write("threadsme-extension/src/content.js", source);
}

async function patchConfig() {
  let source = await read("config.js");
  source = replaceOnceRequired(
    source,
    'const useProductionData = host === "threadsme.akmalmarvis.com" || host === "localhost";',
    'const useProductionData = host === "threadsme.akmalmarvis.com";',
    "localhost must use local API by default",
  );
  source = replaceOnceRequired(source, 'uiVersion: "0.10.2",', 'uiVersion: "0.10.3",', "UI version");
  source = replaceOnceRequired(
    source,
    '          productTitle: title?.value.trim() || "",\n          productCategory: category?.value.trim() || "",',
    '          productTitle: "",\n          productCategory: "",',
    "fresh Product Intel link lookup",
  );
  source = replaceOnceRequired(
    source,
    '        if (typeof state !== "undefined" && data.productTitle) {',
    '        if (!keepManual && typeof state !== "undefined" && data.productTitle) {',
    "do not overwrite manual Product Intel state",
  );
  source = replaceOnceRequired(
    source,
    `    toggle.addEventListener("click", () => setSimple(!document.body.classList.contains("tm-simple-mode")));\n    [q("#productAffiliateLink"), q("#productTitle"), q("#storyOutput")].filter(Boolean).forEach((node) => node.addEventListener("input", update));\n    setSimple(storageGet("threadsme.ui.simpleMode") !== "false");`,
    `    toggle.addEventListener("click", () => setSimple(!document.body.classList.contains("tm-simple-mode")));\n    [q("#productAffiliateLink"), q("#productTitle"), q("#storyOutput")].filter(Boolean).forEach((node) => node.addEventListener("input", update));\n    const generatedList = q("#generatedStatusList");\n    if (generatedList) new MutationObserver(update).observe(generatedList, { childList: true, subtree: true });\n    const generateButton = q("#generateStoryButton");\n    if (generateButton) {\n      generateButton.addEventListener("click", () => [300, 1200, 4000].forEach((delay) => setTimeout(update, delay)));\n      new MutationObserver(update).observe(generateButton, { attributes: true, attributeFilter: ["aria-busy", "disabled"] });\n    }\n    setSimple(storageGet("threadsme.ui.simpleMode") !== "false");`,
    "workflow guide completion refresh",
  );
  await write("config.js", source);
}

async function patchRestoreValidation() {
  let source = await read("scripts/restore-runtime.mjs");
  source = replaceOnceRequired(
    source,
    "if (maxNumber > 0 && number > maxNumber)",
    "if (number > maxNumber)",
    "empty schedule status validation",
  );
  source = replaceOnceRequired(
    source,
    `  ["scheduled", "posted", "failed", "prepared", "remaining"].forEach((key) => {\n    validateNumberList(status[key] || [], \`status.json.\${key}\`, schedule.posts.length);\n  });`,
    `  const statusKeys = ["scheduled", "posted", "failed", "prepared", "remaining"];\n  statusKeys.forEach((key) => {\n    validateNumberList(status[key] || [], \`status.json.\${key}\`, schedule.posts.length);\n  });\n  const ownership = new Map();\n  for (const key of statusKeys) {\n    for (const number of status[key] || []) {\n      const previous = ownership.get(number);\n      if (previous) throw new Error(\`Siri \${number} muncul serentak dalam status \${previous} dan \${key}.\`);\n      ownership.set(number, key);\n    }\n  }`,
    "cross-status restore consistency",
  );
  await write("scripts/restore-runtime.mjs", source);
}

async function patchReadme() {
  let source = await read("README.md");
  source = source.replaceAll("v0.10.1", "v0.10.3");
  source = replaceOnceRequired(
    source,
    "7. Paste Bridge URL dan token dalam popup extension.",
    "7. Paste Bridge URL dan token dalam popup extension. Bridge rasmi boleh guna `https://threadsme.akmalmarvis.com`; localhost kekal disokong untuk operasi local.",
    "extension production bridge docs",
  );
  await write("README.md", source);
}

await patchAiServer();
await patchExtensionContent();
await patchConfig();
await patchRestoreValidation();
await patchReadme();
console.log("Flow continuity source patches applied.");
