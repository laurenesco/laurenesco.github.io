# laurenesco.github.io — dev-log dashboard

A static dashboard tracking Codewars katas, LeetCode commits (from the `leetcode`
repo), and overall GitHub activity, updated automatically once a day by a
GitHub Action.

## How it works

- `scripts/update-stats.mjs` — a Node script that calls the Codewars API, the
  GitHub REST API (commits on `laurenesco/leetcode`), and the GitHub GraphQL
  API (contribution calendar), then writes everything to `data/stats.json`.
- `.github/workflows/update-stats.yml` — runs that script daily (and on
  demand) and commits the updated `data/stats.json` back to the repo.
- `index.html` — the dashboard itself. Plain HTML/CSS/JS, no build step. It
  fetches `data/stats.json` at page load and renders it.

## One-time setup

1. **Create the repo.** On GitHub, create a new repository named exactly
   `laurenesco.github.io` (this exact name is what makes GitHub Pages serve
   it automatically at `https://laurenesco.github.io`).

2. **Add these files.** Push everything in this folder to the repo's `main`
   branch, preserving the folder structure:
   ```
   .github/workflows/update-stats.yml
   data/stats.json
   data/kata-cache.json
   scripts/update-stats.mjs
   index.html
   README.md
   ```
   Easiest path if you don't already have this cloned locally:
   ```bash
   git clone https://github.com/laurenesco/laurenesco.github.io.git
   cd laurenesco.github.io
   # copy in the files from this folder, then:
   git add .
   git commit -m "Initial dashboard setup"
   git push
   ```

3. **Turn on Pages.** Repo → Settings → Pages → Source: "Deploy from a
   branch" → Branch: `main`, folder `/ (root)`. Save. Your site will be live
   at `https://laurenesco.github.io` within a minute or two.

4. **Let Actions write back to the repo.** Repo → Settings → Actions →
   General → Workflow permissions → select **"Read and write permissions"**
   → Save. Without this, the workflow can run but won't be able to commit
   the updated `data/stats.json`.

5. **Add a personal access token for the contribution graph.** The
   contribution calendar (all-repo GitHub activity) needs a token with
   `read:user` scope — the default Actions token isn't allowed to query it.
   - Go to GitHub → Settings → Developer settings → Personal access tokens →
     Tokens (classic) → Generate new token.
   - Scope: just `read:user`. No repo access needed.
   - Copy the token, then in the `laurenesco.github.io` repo go to
     Settings → Secrets and variables → Actions → New repository secret.
   - Name: `GH_PAT`, value: the token you copied.
   - If you skip this step, everything else still works — the contribution
     graph panel will just stay empty.

6. **Run it once.** Repo → Actions tab → "Update Dashboard Stats" →
   "Run workflow". After it finishes (~30 seconds), refresh your GitHub
   Pages site and the real numbers should appear.

## Customizing

- **Weekly goal:** change `WEEKLY_GOAL` in `update-stats.yml` (defaults to 5,
  matching the "5 coding problems each week" strategy).
- **Schedule:** change the `cron` line in `update-stats.yml`
  (currently daily at 13:00 UTC).
- **Colors/fonts/layout:** all in the `<style>` block at the top of
  `index.html` — CSS variables at the very top (`--bg`, `--amber`, `--cyan`,
  etc.) control the palette.
- **New metrics:** add fields to the `stats` object at the bottom of
  `update-stats.mjs`, then read them in the `<script>` block of `index.html`.

## Notes on the data

- **LeetCode** has no public API, so this counts commits to the `leetcode`
  repo as a proxy (1 commit ≈ 1 problem, per your workflow of one commit per
  solve). If you ever batch multiple problems into one commit, that month's
  count will undercount.
- **Codewars** kata "level" is averaged from each kata's rank ID for the
  month (kyu ranks are negative, dan ranks positive), then mapped back to the
  nearest kyu/dan label — it's an approximation for trend purposes, not an
  official Codewars stat.
- Kata rank lookups are cached in `data/kata-cache.json` so the script only
  looks up new slugs each run instead of re-fetching your whole history.
