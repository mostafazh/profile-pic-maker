/**
 * Experiment registry — the single place to define A/B experiments.
 *
 * Each experiment owns a distinct, versioned `propKey`. Events (Plausible on the
 * client, Sentry on the edge) are tagged with that key, so different experiments
 * — and different versions of the same experiment — never mix in the analytics
 * data. To re-run an altered experiment, bump the version in both `id` and
 * `propKey` (…_v2), which starts a clean data series.
 *
 * This module is intentionally free of browser- and node-only APIs so it can be
 * imported from both client components and the edge API route.
 */
export type Experiment = {
  /** Stable identifier, versioned (e.g. 'social-buttons-v1'). */
  id: string;
  /**
   * Namespaced property key emitted on events (e.g. 'exp_social_buttons_v1').
   * Must start with EXPERIMENT_PROP_PREFIX and be unique across experiments.
   */
  propKey: string;
  /** Possible variants; index 0 is treated as control by convention. */
  variants: readonly string[];
  /** Optional relative weights (same length as variants); defaults to even. */
  weights?: readonly number[];
  /** Only active experiments are assigned and emitted. */
  active: boolean;
};

/** Shared prefix for experiment property keys and forwarded query params. */
export const EXPERIMENT_PROP_PREFIX = 'exp_';

export const SOCIAL_BUTTONS_EXPERIMENT_ID = 'social-buttons-v1';

export const EXPERIMENTS: readonly Experiment[] = [
  {
    // Do the newly added social platforms (Instagram/Threads, Facebook, TikTok)
    // lift the page-open → downloaded conversion rate? Treatment sees them;
    // control does not.
    id: SOCIAL_BUTTONS_EXPERIMENT_ID,
    propKey: 'exp_social_buttons_v1',
    variants: ['control', 'treatment'],
    active: true,
  },
];

export const activeExperiments = (): Experiment[] =>
  EXPERIMENTS.filter((e) => e.active);

/**
 * Pick a variant for an experiment. `r` is a [0,1) random value (injectable for
 * tests). Uses `weights` if provided, otherwise an even split.
 */
export const chooseVariant = (
  exp: Experiment,
  r: number = Math.random(),
): string => {
  const { variants, weights } = exp;
  if (!weights) {
    return variants[
      Math.min(variants.length - 1, Math.floor(r * variants.length))
    ];
  }
  const total = weights.reduce((a, b) => a + b, 0);
  let threshold = r * total;
  for (let i = 0; i < variants.length; i++) {
    threshold -= weights[i];
    if (threshold < 0) {
      return variants[i];
    }
  }
  return variants[variants.length - 1];
};

/**
 * Map assignments keyed by experiment id → event props keyed by each
 * experiment's namespaced propKey. Only active experiments are included.
 */
export const toEventProps = (
  assignments: Record<string, string>,
): Record<string, string> => {
  const props: Record<string, string> = {};
  for (const exp of activeExperiments()) {
    const variant = assignments[exp.id];
    if (variant !== undefined) {
      props[exp.propKey] = variant;
    }
  }
  return props;
};
