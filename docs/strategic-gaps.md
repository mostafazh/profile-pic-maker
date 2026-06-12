# Strategic Gaps — Palestine Profile Pic Maker

> 🎯 **North Star Metric: Completed Solidarity PFPs per week.** Quick wins make today's product
> reliable; these gaps determine whether the product grows, stays alive through traffic spikes,
> and reaches the audience it's actually for. Ordered by leverage.

## At a glance

| Gap                          | One-liner                                                  | Status                  |
| ---------------------------- | ---------------------------------------------------------- | ----------------------- |
| 1. Campaign agility          | Frames as content (JSON manifest), not code                | ⬜ Open                  |
| 2. Minimal editor            | Crop / zoom / background fill, fully client-side           | ⬜ Open                  |
| 3. Arabic + RTL              | Localize for the core community                            | ⬜ Open                  |
| 4. Fetch resilience & reach  | Fallbacks + monitoring; honest answers on closed platforms | ⬜ Open                  |
| 5. Distribution loop         | Post-download share moment + T4P cross-promo               | ⬜ Open                  |
| 6. Device-matrix safety net  | Funnel tests in CI as an SLO                               | 🟡 Started — fork PR #2 |

---

### 1. Campaign agility: frames as content, not code

- **Gap:** one hardcoded `bg.webp`. Every new design (#30 asks for background variants) is a
  code change + deploy. Traffic for solidarity tools arrives in spikes tied to news moments;
  the product can't respond in hours, which is when it matters.
- **Direction:** a frame gallery driven by a JSON manifest (frame image + name + optional text
  overlay). Designers/maintainers add a frame via PR with zero code. Ship with 3–4 launch
  frames (flag ring, watermelon, keffiyeh pattern).
- **Success:** new frame live in < 1 hour without touching app code · ≥ 25 % of completions
  use a non-default frame

### 2. A minimal editor: crop, zoom, background

- **Gap:** non-square uploads are blind center-cropped (`object-cover`) with no user control —
  faces get cut off and there's no recourse except editing elsewhere first. The biggest quality
  gap vs. native tools and a silent driver of abandonment.
- **Direction:** pinch-zoom + drag repositioning inside the circle, plus background fill for
  transparent/odd-ratio images (#30). Stays 100 % client-side, preserving the privacy promise.
- **Success:** image-loaded → download conversion rises ≥ 10 points · quality complaints
  (#23-class issues) stop

### 3. Arabic + RTL (i18n)

- **Gap:** the app is English-only. For this audience that's not a localization nicety — it's
  excluding the core community. No i18n scaffolding exists today.
- **Direction:** `next-intl` (or equivalent), `ar` + `en` at launch, RTL layout, localized
  share copy. Community translations after.
- **Success:** Arabic UI shipped · ≥ 20 % of completions from `ar` locale within a quarter

### 4. Avatar-fetch resilience and reach

- **Gap:** the Twitter path rides entirely on `api.fxtwitter.com` — an unversioned third-party
  service that can break or rate-limit silently, taking the most popular fetch path down with
  no alert. Meanwhile users keep asking for platforms with no public avatar API
  (Instagram #31, LinkedIn #15, TikTok #37).
- **Direction:** fallback chain (e.g. unavatar.io) behind each fetcher · per-platform
  success-rate monitoring with alerting · for closed platforms, invest in the upload path
  (it always works) and say "no public API" honestly in the UI instead of leaving issues open
  for years.
- **Success:** no single-provider outage can zero a platform's fetch success · per-platform
  rates on the dashboard · #31 / #15 / #37 resolved with a clear answer

### 5. The distribution loop

- **Gap:** the product is inherently viral — the output is seen by every follower of every
  user — but nothing closes the loop. Post-download is a dead end; T4P's other products get no
  traffic from it (#111).
- **Direction:** a post-download moment: "share this tool" via Web Share / pre-filled post,
  per-frame OG images so shared links look good, and a quiet cross-promo strip for other T4P
  projects. Never watermark the user's image — the loop lives on the page, not the PFP.
- **Success:** referral share of traffic ≥ 15 % · measurable click-throughs to other T4P
  products

### 6. Confidence to change anything: a device-matrix safety net

- **Gap:** until June 2026 the repo had zero tests. The core action (render + download) fails
  differently across iOS Safari, Android Chrome, and webviews, and regressions shipped blind —
  #82 sat broken in production for months.
- **Progress (2026-06):** [fork PR #2](https://github.com/mostafazh/profile-pic-maker/pull/2)
  adds Vitest integration tests, a required Playwright e2e of the Twitter-path funnel
  (asserts a real PNG download), and a non-blocking live smoke against `api.fxtwitter.com`.
- **Direction:** extend the e2e beyond the Twitter path (upload path, remaining platforms),
  keep a short manual device checklist for releases, and treat "completion works on the top 5
  environments" as an SLO.
- **Success:** funnel smoke test gating every PR (lands when PR #2 merges) · no repeat of a
  silent core-action breakage

---

**90-day shape:** weeks 1–2 — quick wins land + funnel baseline; then gaps 1–2 (they move the
metric most); gap 3 in parallel with community help; gaps 4–6 as standing workstreams.
