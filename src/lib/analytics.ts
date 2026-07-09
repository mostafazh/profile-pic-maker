type PlausibleProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: PlausibleProps; callback?: () => void },
    ) => void;
  }
}

/**
 * Funnel events tracked end to end in Plausible, in firing order. The
 * numeric prefix keeps them ordered in the Plausible dashboard.
 *
 * Landed: visitor opens the page.
 * SourceSelected: clicks a "pick a photo" button (upload or a social platform).
 * PhotoProvided: commits input (chooses a file / submits a username).
 * PhotoFetched: a usable source is obtained (data URL / social profile URL).
 * PreviewShown: that photo actually renders on screen.
 * Downloaded: the final framed image is downloaded.
 */
export const FunnelEvent = {
  Landed: 'Funnel: 1 Landed',
  SourceSelected: 'Funnel: 2 Source Selected',
  PhotoProvided: 'Funnel: 3 Photo Provided',
  PhotoFetched: 'Funnel: 4 Photo Fetched',
  PreviewShown: 'Funnel: 5 Preview Shown',
  Downloaded: 'Funnel: 6 Downloaded',
  // Not a funnel step: user resets to pick a different photo.
  StartOver: 'Start Over',
  // Not a funnel step: fetching/showing the chosen photo failed. Always
  // carries the source. Props: method (the source — platform or user-upload)
  // and error (machine-readable code): profile_pic_not_found / invalid_platform
  // from the API, http_<status> / network_error when the request itself
  // failed, or image_load_failed when the returned URL wouldn't render.
  PhotoFetchFailed: 'Photo Fetch Failed',
} as const;

export type FunnelEventName = (typeof FunnelEvent)[keyof typeof FunnelEvent];

let experimentProps: Record<string, string> = {};

/**
 * Register the current visitor's experiment assignments, already keyed by each
 * experiment's namespaced propKey (see src/lib/experiments.ts `toEventProps`).
 * Once set, every subsequent trackEvent call carries them, so any funnel event
 * can be segmented by experiment in Plausible without mixing experiments' data.
 * Call once, before the first tracked event.
 */
export function setExperimentProps(props: Record<string, string>) {
  experimentProps = props;
}

/**
 * Safely fire a Plausible custom event. No-ops during SSR or if the
 * Plausible script hasn't loaded yet. Any registered experiment props are
 * merged in automatically (an event's own props win on key clashes).
 */
export function trackEvent(event: FunnelEventName, props?: PlausibleProps) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') {
    return;
  }
  const merged: PlausibleProps = { ...experimentProps, ...props };
  window.plausible(
    event,
    Object.keys(merged).length > 0 ? { props: merged } : undefined,
  );
}
