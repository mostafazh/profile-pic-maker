# Quick Wins — Palestine Profile Pic Maker

**North Star Metric: Completed Solidarity PFPs per week** — the number of users who successfully
download (or natively share) a generated profile picture. Visits measure reach; a completed PFP is
the mission. Every item below either makes completion more reliable or makes it measurable.

Funnel we optimize: `visit → image loaded (upload or social fetch) → download/share succeeded`.

---

## 1. Replace DOM screenshot with direct canvas compositing — *the* fix
**Today:** download runs `html-to-image` against the live DOM and calls `generateImage()` 4× as a
workaround for flaky output (`src/app/page.tsx:94-103`). Users report the button silently doing
nothing (#82, #24) and quality loss (#23) — output is capped at the 300px preview size.
**Do:** draw border + photo onto an offscreen 1024×1024 `<canvas>`, export PNG. Deterministic, one
pass, full resolution, closes 3 open issues.
**Effort:** ~1 day. **Success:** download success rate ≥ 99% on iOS Safari + Android Chrome; output ≥ 1024px; #82/#24/#23 closed.

## 2. Mobile save/share fallback (in-app browsers)
**Today:** Instagram/Facebook webviews get a "use another browser" banner and a dead end —
programmatic downloads don't work there, and that's where the audience lives.
**Do:** feature-detect `navigator.share({ files })` and offer native Share; in webviews render the
result as a plain `<img>` with "long-press to save". Detect TikTok/X/LinkedIn webviews too.
**Effort:** ~1 day. **Success:** completion rate in webview sessions goes from ~0 to comparable with normal browsers.

## 3. Measure the funnel (prerequisite for the metric)
**Today:** zero analytics — the north star is currently unmeasurable.
**Do:** add cookie-less analytics (Cloudflare Web Analytics or Plausible — must honor the "nothing
is saved" promise) + 4 events: `image_uploaded`, `avatar_fetched` (per platform), `download_success`, `download_failed`.
**Effort:** half a day. **Success:** weekly funnel dashboard exists; baseline captured within 2 weeks.

## 4. Harden the avatar-fetch API
**Today:** `retrieve-profile-pic` 500s instead of 404s when GitLab returns an empty array
(`response[0].avatar_url`), usernames aren't `encodeURIComponent`-ed, and errors surface as a
generic `alert()`. Username entry uses `prompt()`, which some webviews block entirely. See #35.
**Do:** try/catch per fetcher → clean 404; encode inputs; replace `prompt()`/`alert()` with an
inline input + inline error message.
**Effort:** ~1 day. **Success:** avatar-fetch success rate per platform visible and ≥ 95% for valid usernames; no 500s in logs.

## 5. Dependency + repo hygiene
**Today:** `child_process` (a squatted placeholder npm package — supply-chain smell), `html2canvas`,
`browser-image-compression`, and likely `sharp` are declared but never imported. No CI gate beyond CodeQL.
**Do:** remove unused deps (verify `sharp` against the Cloudflare Pages build); add a
`lint + build` GitHub Action on PRs; fix the duplicate gaza-status fetch (`useEffect` dep array,
`src/app/page.tsx:35-39`); close #14 (footer link already shipped).
**Effort:** half a day. **Success:** green CI required on PRs; dependency count down ~4; one fetch per visit.

---

**Sequencing:** #3 first (so wins 1–2 are provable), then #1 → #2 → #4 → #5. Total ≈ one focused week.
**90-day check:** baseline the funnel, then raise visit→completion conversion by ≥ 15 points over baseline.
