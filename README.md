# laurenesco.github.io - Development log dashboard

A static dashboard tracking coding exercises (e.g., Codewars, Leetcode), and overall GitHub activity, updated automatically once a day by a
GitHub Action.

## How it works

- `scripts/update-stats.mjs`: A Node script that calls the Codewars API, the
  GitHub REST API (commits on `laurenesco/leetcode`), and the GitHub GraphQL
  API (contribution calendar), then writes everything to `data/stats.json`.
- `.github/workflows/update-stats.yml`: Runs that script daily and commits the updated `data/stats.json` back to the repo.
- `index.html`: the dashboard itself written in HTML, JS, and CSS. It
  fetches `data/stats.json` at page load and renders it.

## Customizing

- **Weekly goal:** change `WEEKLY_GOAL` in `update-stats.yml`.
- **Schedule:** change the `cron` line in `update-stats.yml`.
- **Colors/fonts/layout:** all in the `<style>` block at the top of
  `index.html`.
- **New metrics:** add fields to the `stats` object at the bottom of
  `update-stats.mjs`, then read them in the `<script>` block of `index.html`.

## Notes on the data

- **LeetCode** has no public API, so this counts commits to the `leetcode`
  repo as a proxy (1 commit ≈ 1 problem, per workflow of one commit per
  solve).
- **Codewars** kata "level" is averaged from each kata's rank ID for the
  month (kyu ranks are negative, dan ranks positive), then mapped back to the
  nearest kyu/dan label.
- Kata rank lookups are cached in `data/kata-cache.json` so the script only
  looks up new slugs each run.
