import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const file = path.join(root, "ai-server.mjs");
let source = await readFile(file, "utf8");

function replaceRequired(before, after, label) {
  if (source.includes(after)) return;
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Patch target tidak ditemui: ${label}`);
  source = `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

replaceRequired(
  "const extensionBridgeUrl = publicBaseUrl || extensionBridgeUrl;",
  'const extensionBridgeUrl = publicBaseUrl || `http://${host}:${port}`;',
  "local extension bridge fallback",
);

replaceRequired(
  "const autoCompletePastSlots = nativeScheduleMode || options.autoCompletePastSlots === true;",
  `const forceAutoCompletePastSlots = options.autoCompletePastSlots === true;
  const nativeProofMap = getNativeProofMap(statusData);
  const canAutoCompleteNumber = (number) =>
    forceAutoCompletePastSlots ||
    (nativeScheduleMode && Boolean(nativeProofMap[number] || nativeProofMap[String(number)]));`,
  "proof-per-series completion guard",
);

replaceRequired(
  '["published", "manual_published", "native_schedule_assumed"].includes(proof.status)',
  '["published", "manual_published", "native_schedule_assumed", "native_scheduled"].includes(proof.status)',
  "native scheduled proof acceptance",
);

replaceRequired(
  `  const postedNow = [];
  if (autoCompletePastSlots) {
    posts.forEach((post, index) => {
      const number = index + 1;
      if (!post || failedSet.has(number) || post.qualityStatus === "review") return;
      const time = parseScheduleSlot(post.slot).getTime();
      if (!Number.isFinite(time) || time > nowMs) return;
      if (!postedSet.has(number)) postedNow.push(number);
      postedSet.add(number);
      scheduledSet.delete(number);
      remainingSet.delete(number);
      preparedSet.delete(number);
      if (nativeScheduleMode && !publishResults[number] && !publishResults[String(number)]) {
        publishResults[number] = {
          status: "native_schedule_assumed",
          source: "Threads native schedule",
          slot: post.slot,
          publishedAt: \`${malaysiaNow()} GMT+8\`,
          note: "Ditanda Lulus kerana slot schedule sudah lepas dan Akmal sahkan scheduled posts dalam Threads berkurang.",
        };
      }
    });
  }`,
  `  const postedNow = [];
  posts.forEach((post, index) => {
    const number = index + 1;
    if (!post || failedSet.has(number) || post.qualityStatus === "review") return;
    const time = parseScheduleSlot(post.slot).getTime();
    if (!Number.isFinite(time) || time > nowMs || !canAutoCompleteNumber(number)) return;
    if (!postedSet.has(number)) postedNow.push(number);
    postedSet.add(number);
    scheduledSet.delete(number);
    remainingSet.delete(number);
    preparedSet.delete(number);
    const nativeProof = nativeProofMap[number] || nativeProofMap[String(number)];
    const existingResult = publishResults[number] || publishResults[String(number)] || {};
    if (
      nativeScheduleMode &&
      nativeProof &&
      !["published", "manual_published", "native_schedule_assumed"].includes(existingResult.status)
    ) {
      publishResults[number] = {
        ...existingResult,
        status: "native_schedule_assumed",
        source: "Threads native schedule proof",
        slot: post.slot,
        publishedAt: \`${malaysiaNow()} GMT+8\`,
        note: "Ditanda Lulus selepas slot lepas kerana siri ini mempunyai proof native Threads.",
      };
    }
  });`,
  "proof-gated past-slot completion",
);

replaceRequired(
  "if (time <= nowMs && autoCompletePastSlots) postedSet.add(number);",
  "if (time <= nowMs && canAutoCompleteNumber(number)) postedSet.add(number);",
  "proof-gated new status completion",
);

replaceRequired(
  `  if (autoCompletePastSlots) {
    for (const number of previousScheduled) {
      const post = posts[number - 1];
      if (!post || failedSet.has(number) || postedSet.has(number)) continue;
      if (post.qualityStatus === "review") continue;
      if (parseScheduleSlot(post.slot).getTime() <= nowMs) {
        postedSet.add(number);
        postedNow.push(number);
      }
    }
  }`,
  `  for (const number of previousScheduled) {
    const post = posts[number - 1];
    if (!post || failedSet.has(number) || postedSet.has(number)) continue;
    if (post.qualityStatus === "review") continue;
    if (parseScheduleSlot(post.slot).getTime() <= nowMs && canAutoCompleteNumber(number)) {
      postedSet.add(number);
      postedNow.push(number);
    }
  }`,
  "proof-gated previous pending completion",
);

replaceRequired(
  "return !autoCompletePastSlots || slotTime > nowMs;",
  "return !canAutoCompleteNumber(number) || slotTime > nowMs;",
  "proof-aware active queue filtering",
);

replaceRequired(
  "const proofMap = getNativeProofMap(statusData);",
  "const proofMap = nativeProofMap;",
  "reuse normalized native proof map",
);

await writeFile(file, source, "utf8");
console.log("Per-series proof continuity fixes applied.");
