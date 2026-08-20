// update-stats.mjs
//
// Pulls activity data from Codewars API, a GitHub "leetcode" repo, and the GitHub
// contribution graph API, then writes a single data/stats.json the dashboard reads.
//
// Env vars (set in .github/workflows/update-stats.yml):
//   GH_USERNAME        - GitHub username (e.g. "laurenesco")
//   CODEWARS_USERNAME  - Codewars username
//   LEETCODE_REPO      - "owner/repo" for the leetcode solutions repo
//   GITHUB_TOKEN        - provided automatically by Actions (REST calls)
//   GH_PAT              - a classic PAT with `read:user` scope (GraphQL contribution calendar)
//
// Run locally with: GH_USERNAME=... CODEWARS_USERNAME=... LEETCODE_REPO=... GITHUB_TOKEN=... node scripts/update-stats.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const GH_USERNAME = process.env.GH_USERNAME;
const CODEWARS_USERNAME = process.env.CODEWARS_USERNAME;
const LEETCODE_REPO = process.env.LEETCODE_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GH_PAT = process.env.GH_PAT || GITHUB_TOKEN;
const WEEKLY_GOAL = Number(process.env.WEEKLY_GOAL || 5);

if (!GH_USERNAME || !CODEWARS_USERNAME || !LEETCODE_REPO) {
  console.error("Missing required env vars: GH_USERNAME, CODEWARS_USERNAME, LEETCODE_REPO");
  process.exit(1);
}

const DATA_DIR = path.join(process.cwd(), "data");
const STATS_PATH = path.join(DATA_DIR, "stats.json");
const KATA_CACHE_PATH = path.join(DATA_DIR, "kata-cache.json");

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function ghHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${GH_USERNAME}-dashboard`,
  };
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

// ---------- Codewars ----------

async function fetchAllCompletedKatas(username) {
  const results = [];
  let page = 0;
  while (true) {
    const res = await fetch(
      `https://www.codewars.com/api/v1/users/${encodeURIComponent(username)}/code-challenges/completed?page=${page}`
    );
    if (!res.ok) throw new Error(`Codewars completed challenges request failed: ${res.status}`);
    const json = await res.json();
    results.push(...json.data);
    page += 1;
    if (page >= json.totalPages) break;
  }
  return results;
}

async function fetchCodewarsProfile(username) {
  const res = await fetch(`https://www.codewars.com/api/v1/users/${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error(`Codewars profile request failed: ${res.status}`);
  return res.json();
}

async function fetchKataRank(slug, cache) {
  if (cache[slug]) return cache[slug];
  const res = await fetch(`https://www.codewars.com/api/v1/code-challenges/${slug}`);
  if (!res.ok) {
    // Kata may have been retired/deleted; cache a neutral placeholder so we don't retry forever.
    cache[slug] = { id: null, name: "unknown" };
    return cache[slug];
  }
  const json = await res.json();
  cache[slug] = { id: json?.rank?.id ?? null, name: json?.rank?.name ?? "unknown" };
  return cache[slug];
}

function rankScoreToLabel(avgScore) {
  if (avgScore === null || Number.isNaN(avgScore)) return "n/a";
  const rounded = Math.round(avgScore);
  if (rounded < 0) return `${Math.abs(rounded)} kyu`;
  if (rounded > 0) return `${rounded} dan`;
  return "1 kyu"; // rank ids skip 0
}

async function buildCodewarsMonthly(username) {
  const completed = await fetchAllCompletedKatas(username);
  const cache = await readJsonSafe(KATA_CACHE_PATH, {});

  const uniqueSlugs = [...new Set(completed.map((c) => c.slug))];
  // Fetch rank info for any slug not already cached. Sequential + small delay to be polite to the API.
  for (const slug of uniqueSlugs) {
    if (!cache[slug]) {
      await fetchKataRank(slug, cache);
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(KATA_CACHE_PATH, JSON.stringify(cache, null, 2));

  const byMonth = new Map(); // month -> { count, scoreSum, scoreCount }
  for (const c of completed) {
    const key = monthKey(c.completedAt);
    const rank = cache[c.slug];
    const bucket = byMonth.get(key) || { count: 0, scoreSum: 0, scoreCount: 0 };
    bucket.count += 1;
    if (rank && typeof rank.id === "number") {
      bucket.scoreSum += rank.id;
      bucket.scoreCount += 1;
    }
    byMonth.set(key, bucket);
  }

  return { byMonth, totalCompleted: completed.length, completedRaw: completed };
}

// ---------- GitHub: leetcode repo commits ----------

async function fetchAllCommits(repo, token) {
  const [owner, name] = repo.split("/");
  const results = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${name}/commits?per_page=100&page=${page}`,
      { headers: ghHeaders(token) }
    );
    if (res.status === 409) break; // empty repo
    if (!res.ok) throw new Error(`GitHub commits request failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    if (json.length === 0) break;
    results.push(...json);
    if (json.length < 100) break;
    page += 1;
  }
  return results;
}

function buildLeetcodeMonthly(commits) {
  const byMonth = new Map();
  for (const c of commits) {
    const dateStr = c.commit?.author?.date || c.commit?.committer?.date;
    if (!dateStr) continue;
    const key = monthKey(dateStr);
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }
  return byMonth;
}

// ---------- GitHub: contribution calendar (GraphQL) ----------

async function fetchContributionCalendar(username, token) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 370);

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }`;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": `${GH_USERNAME}-dashboard`,
    },
    body: JSON.stringify({
      query,
      variables: { login: username, from: from.toISOString(), to: to.toISOString() },
    }),
  });

  if (!res.ok) {
    console.warn(`Contribution calendar request failed: ${res.status}. Skipping graph.`);
    return null;
  }
  const json = await res.json();
  if (json.errors) {
    console.warn("Contribution calendar GraphQL errors:", JSON.stringify(json.errors));
    return null;
  }
  const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) return null;

  const days = calendar.weeks.flatMap((w) => w.contributionDays);
  return { totalContributions: calendar.totalContributions, days };
}

function computeStreaks(days) {
  // days assumed chronological, one entry per date
  let longest = 0;
  let running = 0;
  let current = 0;

  for (const d of days) {
    if (d.contributionCount > 0) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  // current streak: walk backward from the most recent day
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) current += 1;
    else break;
  }

  return { current, longest };
}

// ---------- Week helpers (Sunday–Saturday, matching the Sunday review cadence) ----------

function currentWeekRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // back up to Sunday
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function countInRange(dateStrs, start, end) {
  return dateStrs.filter((d) => {
    const t = new Date(d).getTime();
    return t >= start.getTime() && t <= end.getTime() + 24 * 60 * 60 * 1000 - 1;
  }).length;
}

function sumContributionsInRange(days, start, end) {
  return days.reduce((sum, d) => {
    const t = new Date(d.date).getTime();
    if (t >= start.getTime() && t <= end.getTime() + 24 * 60 * 60 * 1000 - 1) {
      return sum + d.contributionCount;
    }
    return sum;
  }, 0);
}

// ---------- Main ----------

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  console.log("Fetching Codewars data...");
  const { byMonth: cwMonthly, totalCompleted: cwTotal, completedRaw } = await buildCodewarsMonthly(
    CODEWARS_USERNAME
  );
  const cwProfile = await fetchCodewarsProfile(CODEWARS_USERNAME);

  console.log("Fetching leetcode repo commits...");
  const commits = await fetchAllCommits(LEETCODE_REPO, GITHUB_TOKEN);
  const lcMonthly = buildLeetcodeMonthly(commits);

  console.log("Fetching GitHub contribution calendar...");
  const contrib = await fetchContributionCalendar(GH_USERNAME, GH_PAT);

  // Merge months from both sources into one sorted list (last 12 months)
  const allMonths = new Set([...cwMonthly.keys(), ...lcMonthly.keys()]);
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    allMonths.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const sortedMonths = [...allMonths].sort().slice(-12);

  const monthly = sortedMonths.map((month) => {
    const cw = cwMonthly.get(month) || { count: 0, scoreSum: 0, scoreCount: 0 };
    const avgScore = cw.scoreCount > 0 ? cw.scoreSum / cw.scoreCount : null;
    return {
      month,
      codingProblems: cw.count + (lcMonthly.get(month) || 0),
      avgKataLevel: rankScoreToLabel(avgScore),
      avgKataScore: avgScore,
    };
  });

  const { start, end } = currentWeekRange(now);
  const cwDatesThisWeek = completedRaw.map((c) => c.completedAt);
  const lcDatesThisWeek = commits.map((c) => c.commit?.author?.date).filter(Boolean);
  const weekCodewars = countInRange(cwDatesThisWeek, start, end);
  const weekLeetcode = countInRange(lcDatesThisWeek, start, end);

  const streaks = contrib ? computeStreaks(contrib.days) : { current: 0, longest: 0 };

  const stats = {
    generatedAt: new Date().toISOString(),
    goals: { weeklyProblems: WEEKLY_GOAL },
    monthly,
    currentWeek: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      total: weekCodewars + weekLeetcode,
      goal: WEEKLY_GOAL,
    },
    totals: {
      totalProblems: cwTotal + commits.length,
      codewarsRank: cwProfile?.ranks?.overall?.name || "n/a",
      codewarsHonor: cwProfile?.honor ?? null,
    },
    github: {
      totalContributionsLastYear: contrib?.totalContributions ?? null,
      contributionsThisWeek: contrib ? sumContributionsInRange(contrib.days, start, end) : 0,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      calendar: contrib?.days ?? [],
    },
  };

  await writeFile(STATS_PATH, JSON.stringify(stats, null, 2));
  console.log(`Wrote ${STATS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
