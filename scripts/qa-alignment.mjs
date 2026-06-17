import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const runtimeRoot = process.env.THREADSME_RUNTIME_DIR || path.join(root, "work", "runtime");
const backupRoot = process.env.THREADSME_BACKUP_DIR || path.join(root, "work", "backups");
const scheduleFile = process.env.THREADSME_SCHEDULE_FILE || path.join(runtimeRoot, "threads-schedule.json");
const storyRunsFile = process.env.THREADSME_STORY_RUNS_FILE || path.join(runtimeRoot, "story-runs.json");
const statusFile = process.env.THREADSME_STATUS_FILE || path.join(runtimeRoot, "status.json");
const apply = process.argv.includes("--fix");
const dailyTarget = 25;
const postingTimes25 = [
  "07:00",
  "07:40",
  "08:20",
  "09:00",
  "09:40",
  "10:20",
  "11:00",
  "11:40",
  "12:20",
  "13:00",
  "13:40",
  "14:20",
  "15:00",
  "15:40",
  "16:20",
  "17:00",
  "17:40",
  "18:20",
  "19:00",
  "19:40",
  "20:20",
  "21:00",
  "21:40",
  "22:20",
  "23:00",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readText(file) {
  return readFile(path.join(root, file), "utf8");
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function uniqueNumbers(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(Number).filter(Number.isInteger))).sort(
    (a, b) => a - b,
  );
}

function formatNumberRange(numbers) {
  const values = uniqueNumbers(numbers);
  if (!values.length) return "-";
  const ranges = [];
  let start = values[0];
  let previous = values[0];
  for (let index = 1; index <= values.length; index += 1) {
    const current = values[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = current;
    previous = current;
  }
  return `Siri ${ranges.join(", ")}`;
}

function parseSlot(slot) {
  const match = String(slot || "").match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return new Date(Number.NaN);
  const [, year, month, day, hour, minute] = match.map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function formatSlot(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function malaysiaStamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${value("year")}${value("month")}${value("day")}-${value("hour")}${value("minute")}${value("second")}`;
}

function extractFrontendContract(app, html, server) {
  const apiCalls = [...app.matchAll(/apiFetch\("([^"]+)"/g)].map((match) => match[1]);
  const routes = [...server.matchAll(/url\.pathname === "([^"]+)"/g)].map((match) => match[1]);
  const queryIds = [...app.matchAll(/querySelector\("#([^"]+)"/g)].map((match) => match[1]);
  const getElementIds = [...app.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((match) => match[1]);
  const htmlIds = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const views = [...html.matchAll(/data-view="([^"]+)"/g)].map((match) => match[1]);
  const navTargets = [...html.matchAll(/data-view-target="([^"]+)"/g)].map((match) => match[1]);

  return {
    missingRoutes: [...new Set(apiCalls)].filter((route) => !routes.includes(route)),
    missingIds: [...new Set([...queryIds, ...getElementIds])].filter((id) => !htmlIds.includes(id)),
    navTargetsMissingPanel: [...new Set(navTargets)].filter((target) => !views.includes(target)),
    panelsMissingNav: [...new Set(views)].filter((view) => !navTargets.includes(view)),
    apiCallCount: new Set(apiCalls).size,
    routeCount: new Set(routes).size,
  };
}

function storyRunsArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.runs)) return data.runs;
  return [];
}

function statusStateMap(status) {
  const keys = ["scheduled", "posted", "failed", "prepared", "remaining"];
  const map = new Map();
  for (const key of keys) {
    for (const number of uniqueNumbers(status[key])) {
      map.set(number, [...(map.get(number) || []), key]);
    }
  }
  return map;
}

function nativeProofNumbers(status) {
  return uniqueNumbers([
    ...Object.keys(status.nativeThreadsScheduleProofs || {}).map(Number),
    ...(status.nativeThreadsScheduledNumbers || []),
  ]);
}

function sortNumbersBySlot(posts, numbers) {
  return [...numbers].sort((a, b) => {
    const aTime = parseSlot(posts[a - 1]?.slot).getTime();
    const bTime = parseSlot(posts[b - 1]?.slot).getTime();
    const safeATime = Number.isFinite(aTime) ? aTime : Number.POSITIVE_INFINITY;
    const safeBTime = Number.isFinite(bTime) ? bTime : Number.POSITIVE_INFINITY;
    return safeATime - safeBTime || a - b;
  });
}

function getAffiliateLink(post, schedule) {
  return String(post.affiliateLink || schedule.affiliate_link || "").trim();
}

function validateDataAlignment(schedule, status, storyRunsData) {
  const posts = Array.isArray(schedule.posts) ? schedule.posts : [];
  const runs = storyRunsArray(storyRunsData);
  const stateMap = statusStateMap(status);
  const missingStatus = [];
  const duplicateStatus = [];
  const badLengths = [];
  const missingAffiliate = [];
  const replyLinkMismatch = [];
  const activeSlotMap = new Map();
  const activeDaily = new Map();
  const postedSet = new Set(uniqueNumbers(status.posted));
  const failedSet = new Set(uniqueNumbers(status.failed));
  const scheduledCount = uniqueNumbers(status.scheduled).length;

  posts.forEach((post, index) => {
    const number = index + 1;
    const keys = stateMap.get(number) || [];
    if (!keys.length) missingStatus.push(number);
    if (keys.length > 1) duplicateStatus.push({ number, keys });

    const lengths = [post.main, post.reply1, post.reply2].map((part) => String(part || "").length);
    if (lengths.some((length) => length <= 0 || length > 300)) badLengths.push({ number, lengths });

    const affiliate = getAffiliateLink(post, schedule);
    if (!affiliate) missingAffiliate.push(number);
    const reply2 = String(post.reply2 || "");
    const links = reply2.match(/https?:\/\/\S+/g) || [];
    const lastLink = links.length ? links[links.length - 1].replace(/[),.;]+$/g, "") : "";
    if (affiliate && lastLink && affiliate !== lastLink) replyLinkMismatch.push({ number, affiliate, reply2Link: lastLink });

    const isActive = !postedSet.has(number) && !failedSet.has(number);
    if (isActive && post.slot) {
      const slot = String(post.slot).trim();
      activeSlotMap.set(slot, [...(activeSlotMap.get(slot) || []), number]);
      const day = slot.slice(0, 10);
      activeDaily.set(day, (activeDaily.get(day) || 0) + 1);
    }
  });

  const storyNumbers = new Set();
  for (const run of runs) {
    for (const version of run.versions || []) {
      const number = Number(version.scheduleNumber);
      if (Number.isInteger(number) && number > 0) storyNumbers.add(number);
    }
  }
  const missingStoryRun = [];
  for (let number = 1; number <= posts.length; number += 1) {
    if (!storyNumbers.has(number)) missingStoryRun.push(number);
  }

  return {
    posts: posts.length,
    statusCounts: {
      scheduled: uniqueNumbers(status.scheduled).length,
      posted: uniqueNumbers(status.posted).length,
      failed: uniqueNumbers(status.failed).length,
      prepared: uniqueNumbers(status.prepared).length,
      remaining: uniqueNumbers(status.remaining).length,
    },
    issues: {
      missingRoutes: [],
      missingIds: [],
      navTargetsMissingPanel: [],
      panelsMissingNav: [],
      missingStatus,
      duplicateStatus,
      badLengths,
      missingAffiliate,
      replyLinkMismatch,
      activeDuplicateSlots: [...activeSlotMap.entries()].filter(([, numbers]) => numbers.length > 1).map(([slot, numbers]) => ({ slot, numbers })),
      activeDaysOverLimit: [...activeDaily.entries()].filter(([, count]) => count > dailyTarget).map(([day, count]) => ({ day, count })),
      scheduledOverLimit: scheduledCount > dailyTarget ? [{ scheduled: scheduledCount, limit: dailyTarget }] : [],
      missingStoryRun,
    },
  };
}

function collectBlockingIssues(frontend, data) {
  return [
    ...frontend.missingRoutes.map((item) => `missing_route:${item}`),
    ...frontend.missingIds.map((item) => `missing_id:${item}`),
    ...frontend.navTargetsMissingPanel.map((item) => `nav_missing_panel:${item}`),
    ...frontend.panelsMissingNav.map((item) => `panel_missing_nav:${item}`),
    ...data.issues.missingStatus.map((item) => `missing_status:${item}`),
    ...data.issues.duplicateStatus.map((item) => `duplicate_status:${item.number}`),
    ...data.issues.badLengths.map((item) => `bad_length:${item.number}`),
    ...data.issues.missingAffiliate.map((item) => `missing_affiliate:${item}`),
    ...data.issues.replyLinkMismatch.map((item) => `reply_link_mismatch:${item.number}`),
    ...data.issues.activeDuplicateSlots.map((item) => `active_duplicate_slot:${item.slot}`),
    ...data.issues.activeDaysOverLimit.map((item) => `active_day_over_limit:${item.day}`),
    ...data.issues.scheduledOverLimit.map((item) => `scheduled_over_limit:${item.scheduled}`),
  ];
}

function buildAlignedSlots({ count, fixedSlots, fixedLatestMs }) {
  const slots = [];
  const used = new Set(fixedSlots);
  const startAfter = Math.max(Date.now() + 30 * 60 * 1000, fixedLatestMs + 60 * 1000);
  const cursor = new Date(startAfter);
  const day = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());

  while (slots.length < count) {
    for (const time of postingTimes25) {
      const [hour, minute] = time.split(":").map(Number);
      const slotDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
      const slot = formatSlot(slotDate);
      if (slotDate.getTime() > startAfter && !used.has(slot)) {
        slots.push(slot);
        used.add(slot);
        if (slots.length === count) break;
      }
    }
    day.setDate(day.getDate() + 1);
  }

  return slots;
}

async function repairSlotAlignment(schedule, status, storyRunsData) {
  const posts = Array.isArray(schedule.posts) ? schedule.posts : [];
  const postedSet = new Set(uniqueNumbers(status.posted));
  const failedSet = new Set(uniqueNumbers(status.failed));
  const nativeSet = new Set(nativeProofNumbers(status));
  const scheduledSet = new Set(uniqueNumbers(status.scheduled));
  const preparedSet = new Set(uniqueNumbers(status.prepared));
  const remainingSet = new Set(uniqueNumbers(status.remaining));
  const fixedSlots = new Set();
  let fixedLatestMs = 0;
  const targets = [];

  posts.forEach((post, index) => {
    const number = index + 1;
    const locked = postedSet.has(number) || failedSet.has(number) || nativeSet.has(number);
    const slotTime = parseSlot(post.slot).getTime();
    if (locked) {
      if (post.slot) fixedSlots.add(post.slot);
      if (Number.isFinite(slotTime)) fixedLatestMs = Math.max(fixedLatestMs, slotTime);
      return;
    }
    targets.push({ number, post });
  });

  targets.sort((a, b) => {
    const rank = (number) => {
      if (scheduledSet.has(number)) return 0;
      if (preparedSet.has(number)) return 1;
      if (remainingSet.has(number)) return 2;
      return 3;
    };
    return rank(a.number) - rank(b.number) || a.number - b.number;
  });

  const slots = buildAlignedSlots({ count: targets.length, fixedSlots, fixedLatestMs });
  const changed = [];
  targets.forEach((target, index) => {
    const nextSlot = slots[index];
    if (target.post.slot !== nextSlot) {
      changed.push({ number: target.number, before: target.post.slot || "", after: nextSlot });
      target.post.slot = nextSlot;
    }
  });

  if (!changed.length) return { changed };

  const stamp = malaysiaStamp();
  const stampText = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)} ${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)} GMT+8`;
  const backupDir = path.join(backupRoot, `alignment-repair-${stamp}`);
  await mkdir(backupDir, { recursive: true });
  await copyFile(scheduleFile, path.join(backupDir, "threads-schedule.json"));
  await copyFile(storyRunsFile, path.join(backupDir, "story-runs.json"));
  await copyFile(statusFile, path.join(backupDir, "status.json"));

  const slotByNumber = new Map(changed.map((item) => [item.number, item.after]));
  const runs = storyRunsArray(storyRunsData);
  for (const run of runs) {
    let touched = false;
    for (const version of run.versions || []) {
      const number = Number(version.scheduleNumber);
      if (!slotByNumber.has(number)) continue;
      version.slot = slotByNumber.get(number);
      version.updatedAt = stampText;
      touched = true;
    }
    if (touched) run.updatedAt = stampText;
  }

  schedule.posts = posts;
  schedule.maxPostingPerDay = dailyTarget;
  schedule.lastAlignmentRepairAt = stampText;
  schedule.lastAlignmentRepairNote = `${changed.length} siri belum proof native disusun semula supaya fungsi kalendar, queue dan extension selari.`;
  status.lastAlignmentRepairAt = stampText;
  status.lastAlignmentRepairNote = schedule.lastAlignmentRepairNote;

  await writeJson(scheduleFile, schedule);
  await writeJson(storyRunsFile, Array.isArray(storyRunsData) ? runs : { ...storyRunsData, runs });
  await writeJson(statusFile, status);

  return { changed, backupDir };
}

async function repairStatusOverLimit(schedule, status) {
  const posts = Array.isArray(schedule.posts) ? schedule.posts : [];
  const scheduled = uniqueNumbers(status.scheduled);
  if (scheduled.length <= dailyTarget) return { demoted: [] };

  const keep = new Set(sortNumbersBySlot(posts, scheduled).slice(0, dailyTarget));
  const demoted = scheduled.filter((number) => !keep.has(number));
  if (!demoted.length) return { demoted };

  const stamp = malaysiaStamp();
  const stampText = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)} ${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)} GMT+8`;
  const backupDir = path.join(backupRoot, `status-overlimit-repair-${stamp}`);
  await mkdir(backupDir, { recursive: true });
  await copyFile(scheduleFile, path.join(backupDir, "threads-schedule.json"));
  await copyFile(storyRunsFile, path.join(backupDir, "story-runs.json"));
  await copyFile(statusFile, path.join(backupDir, "status.json"));

  status.scheduled = scheduled.filter((number) => keep.has(number));
  status.prepared = uniqueNumbers([...(status.prepared || []), ...demoted]);
  status.remaining = uniqueNumbers(status.remaining).filter((number) => !keep.has(number));
  status.nativeThreadsScheduledNumbers = uniqueNumbers(status.nativeThreadsScheduledNumbers).filter((number) =>
    keep.has(number),
  );
  const proofs = {};
  for (const [key, value] of Object.entries(status.nativeThreadsScheduleProofs || {})) {
    if (keep.has(Number(key))) proofs[key] = value;
  }
  status.nativeThreadsScheduleProofs = proofs;
  status.lastAlignmentRepairAt = stampText;
  status.lastAlignmentRepairNote = `${formatNumberRange(demoted)} dipindahkan ke Prepared supaya Pending aktif kekal ${dailyTarget}.`;

  await writeJson(statusFile, status);
  return { demoted, backupDir };
}

async function main() {
  const [app, html, server, schedule, status, storyRunsData] = await Promise.all([
    readText("app.js"),
    readText("index.html"),
    readText("ai-server.mjs"),
    readJson(scheduleFile, { posts: [] }),
    readJson(statusFile, {}),
    readJson(storyRunsFile, { runs: [] }),
  ]);

  const frontend = extractFrontendContract(app, html, server);
  let data = validateDataAlignment(schedule, status, storyRunsData);
  let repair = null;
  const blockingBefore = collectBlockingIssues(frontend, data);

  if (apply && (data.issues.activeDuplicateSlots.length || data.issues.activeDaysOverLimit.length)) {
    repair = await repairSlotAlignment(schedule, status, storyRunsData);
    const nextSchedule = await readJson(scheduleFile, { posts: [] });
    const nextStatus = await readJson(statusFile, {});
    const nextStoryRuns = await readJson(storyRunsFile, { runs: [] });
    data = validateDataAlignment(nextSchedule, nextStatus, nextStoryRuns);
  }
  if (apply && data.issues.scheduledOverLimit.length) {
    const nextSchedule = await readJson(scheduleFile, { posts: [] });
    const nextStatus = await readJson(statusFile, {});
    const overLimitRepair = await repairStatusOverLimit(nextSchedule, nextStatus);
    const repairedStatus = await readJson(statusFile, {});
    data = validateDataAlignment(nextSchedule, repairedStatus, storyRunsData);
    repair = {
      ...(repair || { changed: [] }),
      overLimit: overLimitRepair,
    };
  }

  const blockingAfter = collectBlockingIssues(frontend, data);
  const report = {
    mode: apply ? "fix" : "check",
    ok: blockingAfter.length === 0,
    frontend,
    data: {
      posts: data.posts,
      statusCounts: data.statusCounts,
      missingStoryRunCount: data.issues.missingStoryRun.length,
      missingStoryRunSample: data.issues.missingStoryRun.slice(0, 20),
      activeDuplicateSlots: data.issues.activeDuplicateSlots,
      activeDaysOverLimit: data.issues.activeDaysOverLimit,
      scheduledOverLimit: data.issues.scheduledOverLimit,
    },
    blockingBefore,
    blockingAfter,
      repair: repair
      ? {
          changedCount: repair.changed.length,
          changedSample: repair.changed.slice(0, 20),
          backupDir: repair.backupDir || "",
          overLimit: repair.overLimit || null,
        }
      : null,
  };

  assert(frontend.missingRoutes.length === 0, "Frontend memanggil API yang tiada route backend.");
  assert(frontend.missingIds.length === 0, "app.js merujuk ID HTML yang tiada.");
  console.log(JSON.stringify(report, null, 2));
  if (blockingAfter.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
