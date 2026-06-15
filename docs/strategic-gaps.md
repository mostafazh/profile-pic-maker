# Strategic Gaps — Palestine Profile Pic Maker

> 🎯 **North Star Metric: Completed Solidarity PFPs per week.** Quick wins make today's product
> reliable; these gaps determine whether the product grows, stays alive through traffic spikes,
> and reaches the audience it's actually for. Ordered by leverage.

> 📊 **How we prioritize:** the ordering below is an initial hypothesis, not a fixed plan. Final
> priority — and which platforms, frames, and locales come first — will be set by the **data and
> user feedback the earlier steps put in place**: the funnel analytics (quick win 3), per-platform
> fetch demand, and the GitHub-issues feedback channel (quick win A). We ship the instrumentation
> first, then let it rank the roadmap.

## At a glance

| Gap                         | One-liner                                                  | Status                  |
| --------------------------- | --------------------------------------------------------- | ----------------------- |
| 1. Campaign agility         | Frames as content (JSON manifest), not code               | ⬜ Open                  |
| 2. Minimal editor           | Crop / zoom / background fill, fully client-side          | ⬜ Open                  |
| 3. Arabic + RTL             | Localize for the core community                           | ⬜ Open                  |
| 4. Fetch resilience & reach | Fallbacks + monitoring + more platforms (FB/LinkedIn/IG…) | ⬜ Open                  |
| 5. Distribution loop        | Post-download share moment + T4P cross-promo              | ⬜ Open                  |
| 6. Device-matrix safety net | Funnel tests in CI as an SLO                              | 🟡 Started — fork PR #2 |
| 7. Observability & alerting | Every strategic feature ships instrumented + alerted      | ⬜ Open                  |

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
  no alert. Coverage is also narrow: users keep asking for more platforms, several with no
  public avatar API (Instagram #31, LinkedIn #15, TikTok #37).
- **Direction — resilience:** fallback chain (e.g. unavatar.io) behind each fetcher ·
  per-platform success-rate monitoring with alerting · for closed platforms, invest in the
  upload path (it always works) and say "no public API" honestly in the UI instead of leaving
  issues open for years.
- **Direction — add more platforms:** broaden coverage beyond X/GitHub/GitLab/Bluesky to
  **Facebook, LinkedIn, Instagram, TikTok, Mastodon**, and similar. A single aggregator
  (e.g. unavatar.io) can cover several of these at once; the rest fall back to upload.
  **Which platforms ship first is driven by the demand data and user feedback from the earlier
  steps**, not guesswork.
- **Success:** no single-provider outage can zero a platform's fetch success · per-platform
  rates on the dashboard · top user-requested platforms added · #31 / #15 / #37 resolved with
  a clear answer

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

### 7. Observability & alerting on strategic features

- **Gap:** today almost nothing is measured or alerted (the funnel analytics in quick win 3 is
  the first step). As we ship the features above, a silent regression in any of them — a frame
  that won't load, an editor that drops uploads, a broken share link, a fetch provider that
  starts failing — would go unnoticed the way the download bug (#82) did for months.
- **Direction:** make observability a **definition-of-done for every strategic feature**, not a
  separate project. Each ships with (a) a success metric wired into the funnel dashboard and
  (b) an **alert on regression** — an error-rate / success-rate threshold routed to a channel
  the team actually watches. Add uptime + error monitoring for the API routes and the
  third-party dependencies they call.
- **Success:** every strategic feature has a live metric + an alert before it's called done ·
  mean time to detect a core-flow regression drops from "months" (#82) to "minutes"

---

**90-day shape:** weeks 1–2 — quick wins land + funnel baseline, which then **re-ranks
everything below by real data and user feedback** rather than the initial guess. Likely next:
gaps 1–2 (they move the metric most) and gap 3 in parallel with community help; gaps 4–7 as
standing workstreams, with observability (gap 7) baked into each feature as it ships rather than
done as a separate phase.
