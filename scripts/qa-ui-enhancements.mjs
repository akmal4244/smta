import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const [config, script, styles, index] = await Promise.all([
    readFile(path.join(root, "config.js"), "utf8"),
    readFile(path.join(root, "assets", "ui-enhancements.js"), "utf8"),
    readFile(path.join(root, "assets", "ui-enhancements.css"), "utf8"),
    readFile(path.join(root, "index.html"), "utf8"),
  ]);

  assert(config.includes("assets/ui-enhancements.css"), "config.js tidak memuatkan CSS enhancement.");
  assert(config.includes("assets/ui-enhancements.js"), "config.js tidak memuatkan JS enhancement.");
  assert(!/\.innerHTML\s*=|insertAdjacentHTML\s*\(/.test(script), "UI enhancement mesti render menggunakan DOM API selamat, bukan innerHTML.");
  assert(script.includes("tm-bottom-nav"), "Bottom navigation mobile tiada.");
  assert(script.includes("tm-workflow-guide"), "Panduan tiga langkah tiada.");
  assert(script.includes("skipCache: true"), "Refresh Product Intel tanpa cache tiada.");
  assert(script.includes('setAttribute("aria-label"'), "UI enhancement perlu label aksesibiliti.");
  assert(styles.includes("@media (max-width: 860px)"), "Responsive mobile breakpoint tiada.");
  assert(styles.includes(":focus-visible") || styles.includes("focus-visible"), "Focus state aksesibiliti tiada.");
  assert(styles.includes("prefers-reduced-motion"), "Reduced motion guard tiada.");
  ["system-shell", "productIntelButton", "statusFilter"].forEach((marker) => {
    assert(index.includes(marker), `Hook UI asal hilang: ${marker}`);
  });

  console.log("UI enhancement QA passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
