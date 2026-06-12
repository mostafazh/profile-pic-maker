# Quick Wins — Palestine Profile Pic Maker

**North Star Metric: Completed Solidarity PFPs per week** — the number of users who successfully
download (or natively share) a generated profile picture. Visits measure reach; a completed PFP is
the mission. Every item below either makes completion more reliable or makes it measurable.

Funnel we optimize: `visit → image loaded (upload or social fetch) → download/share succeeded`.

---

## ✅ Shipped (June 2026)

### ✅ Repo hygiene, trust signals & latent-bug fixes — [PR #1](https://github.com/mostafazh/profile-pic-maker/pull/1) *(open, awaiting merge)*
Was quick win 5 below; PR #1 delivers all of it and more:
- Removed unused/squatted deps: `child_process` (npm squatter), `sharp`, `browser-image-compression`.
  `html2canvas` kept deliberately — earmarked for the pending upstream Linux download fix (upstream PR #102).
- CI gate on PRs and `main`: lint, type-check, build.
- Fixed the `useEffect` dep arrays (no more duplicate gaza-status fetch) and the `unsuportedBrowser` typo.
- Added the missing MIT `LICENSE` (README claimed MIT; repo legally defaulted to all-rights-reserved).
- Fixed README clone URL and in-app bug-report link (old `palestine-pfp-maker` name 404s); feedback
  link now points to GitHub issues instead of a personal X account (closes #14).

### ✅ Behaviour tests + CI for the core flow — [PR #2](https://github.com/mostafazh/profile-pic-maker/pull/2) *(stacked on PR #1)*
Pulls strategic gap 6 (the safety net) forward for the Twitter path:
- Vitest integration tests for `/api/retrieve-profile-pic` (mocked upstream; happy path, 404, bad input).
- Playwright e2e of the full funnel: X button → username prompt → avatar renders → **download
  produces a real PNG** (asserts magic bytes). Required CI job.
- Non-blocking live smoke against the real `api.fxtwitter.com`, so third-party breakage is caught
  without false-red blocking merges.

### ⚠️ Self-hosted how-to video — branch `claude/video-how-to-guide-m7r4cw` *(needs a one-line fix + a PR)*
- Embeds `public/how-to-guide.mp4` directly on the page, replacing the Instagram-hosted
  step-by-step link — the item PR #1 deliberately deferred pending a recording.
- Verified 2026-06-12: merges cleanly with PR #1; video is a proper H.264 faststart MP4
  (1.4 MB, silent). **But `next build` fails** on one `prettier/prettier` error the edit
  introduced at `src/app/page.tsx:131` — run `npm run format` on the branch before opening the PR.

---

## Up next (ordered)

### 1. Replace DOM screenshot with direct canvas compositing — *the* fix
**Today:** download runs `html-to-image` against the live DOM and calls `generateImage()` 4× as a
workaround for flaky output (`src/app/page.tsx:94-103`). Users report the button silently doing
nothing (#82, #24) and quality loss (#23) — output is capped at the 300px preview size.
**Do:** draw border + photo onto an offscreen 1024×1024 `<canvas>`, export PNG. Deterministic, one
pass, full resolution, closes 3 open issues. PR #2's e2e asserts the downloaded PNG, so this
renderer swap now has a regression net.
**Effort:** ~1 day. **Success:** download success rate ≥ 99% on iOS Safari + Android Chrome; output ≥ 1024px; #82/#24/#23 closed.

### 2. Mobile save/share fallback (in-app browsers)
**Today:** Instagram/Facebook webviews get a "use another browser" banner and a dead end —
programmatic downloads don't work there, and that's where the audience lives.
**Do:** feature-detect `navigator.share({ files })` and offer native Share; in webviews render the
result as a plain `<img>` with "long-press to save". Detect TikTok/X/LinkedIn webviews too.
**Effort:** ~1 day. **Success:** completion rate in webview sessions goes from ~0 to comparable with normal browsers.

### 3. Measure the funnel (prerequisite for the metric)
**Today:** zero analytics — the north star is currently unmeasurable.
**Do:** add cookie-less analytics (Cloudflare Web Analytics or Plausible — must honor the "nothing
is saved" promise) + 4 events: `image_uploaded`, `avatar_fetched` (per platform), `download_success`, `download_failed`.
**Effort:** half a day. **Success:** weekly funnel dashboard exists; baseline captured within 2 weeks.

### 4. Harden the avatar-fetch API
**Today:** `retrieve-profile-pic` 500s instead of 404s when GitLab returns an empty array
(`response[0].avatar_url`), usernames aren't `encodeURIComponent`-ed, and errors surface as a
generic `alert()`. Username entry uses `prompt()`, which some webviews block entirely. See #35.
**Do:** try/catch per fetcher → clean 404; encode inputs; replace `prompt()`/`alert()` with an
inline input + inline error message. PR #2's integration tests pin today's route behaviour —
extend them with each fix (the e2e answers the `prompt()`, so it changes alongside).
**Effort:** ~1 day. **Success:** avatar-fetch success rate per platform visible and ≥ 95% for valid usernames; no 500s in logs.

### ~~5. Dependency + repo hygiene~~ → ✅ shipped in PR #1 (see above)

---

**Sequencing:** merge PRs #1–#2 and open the video-guide PR (after its prettier fix) first; then item 3 (so items 1–2 are
provable) → item 1 → item 2 → item 4. Remaining ≈ 3–4 focused days.
**90-day check:** baseline the funnel, then raise visit→completion conversion by ≥ 15 points over baseline.
