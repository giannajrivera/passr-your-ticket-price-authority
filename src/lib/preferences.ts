/**
 * Passr's structured, provider-agnostic preference model.
 *
 * Selections are stored as taxonomy path ids (see `src/lib/taxonomy.ts`),
 * never as loose UI booleans, so any selection can be resolved back into
 * structured facets (category / subcategory / genre / league / gender ...).
 *
 * Provider-specific identifiers (Ticketmaster segment ids, Eventbrite
 * category ids, ...) deliberately live OUTSIDE this module. A mapping layer
 * can translate `PreferenceFacets` into provider queries later without
 * touching the taxonomy or the onboarding UI.
 */

import { categoryOf, getNode, labelFor, type Gender } from "@/lib/taxonomy";

export type BudgetBand = "under-75" | "75-150" | "150-300" | "300-plus" | "no-limit";
export type TravelRadius = "my-city" | "50-miles" | "few-hours" | "anywhere";
export type PlanningHorizon = "this-week" | "this-month" | "few-months" | "whenever";
export type EventVibe =
  | "cheapest-seat"
  | "best-value"
  | "close-as-possible"
  | "big-nights"
  | "small-rooms"
  | "with-friends"
  | "family-friendly"
  | "date-night"
  | "solo";

export type EventPreferences = {
  /** Schema version so stored profiles can be migrated safely. */
  version: 2;
  /** Top-level category ids the user opted into, e.g. "sports". */
  categories: string[];
  /** Any deeper taxonomy path ids, e.g. "sports.basketball.wnba". */
  interests: string[];
  budget?: BudgetBand | undefined;
  travel?: TravelRadius | undefined;
  horizon?: PlanningHorizon | undefined;
  vibes: EventVibe[];
};

export const emptyPreferences = (): EventPreferences => ({
  version: 2,
  categories: [],
  interests: [],
  vibes: [],
});

/* ------------------------------------------------------------- Facets */

/** A single selection resolved into structured, queryable facets. */
export type PreferenceFacets = {
  id: string;
  category: string;
  categoryLabel: string;
  subcategory?: string | undefined;
  subcategoryLabel?: string | undefined;
  /** Genre (music) / sport league / event type, depending on the category. */
  detail?: string | undefined;
  detailLabel?: string | undefined;
  /** Subgenre or specific competition, when the user drilled that deep. */
  subDetail?: string | undefined;
  subDetailLabel?: string | undefined;
  gender: Gender;
};

export function resolveFacets(id: string): PreferenceFacets | undefined {
  const node = getNode(id);
  const cat = categoryOf(id);
  if (!node || !cat) return undefined;
  const parts = id.split(".");
  const at = (n: number) => (parts.length > n ? parts.slice(0, n + 1).join(".") : undefined);
  const sub = at(1);
  const detail = at(2);
  const subDetail = at(3);
  return {
    id,
    category: cat.id,
    categoryLabel: cat.label,
    subcategory: sub,
    subcategoryLabel: sub ? labelFor(sub) : undefined,
    detail,
    detailLabel: detail ? labelFor(detail) : undefined,
    subDetail,
    subDetailLabel: subDetail ? labelFor(subDetail) : undefined,
    gender: node.gender,
  };
}

/** All selections resolved into facets — the shape a recommender consumes. */
export function facetsFor(prefs: EventPreferences): PreferenceFacets[] {
  return prefs.interests
    .map(resolveFacets)
    .filter((f): f is PreferenceFacets => Boolean(f));
}

/** Selected interest ids grouped by top-level category id. */
export function interestsByCategory(prefs: EventPreferences): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const id of prefs.interests) {
    const root = id.split(".")[0]!;
    map.set(root, [...(map.get(root) ?? []), id]);
  }
  return map;
}

export function countSelections(prefs: EventPreferences): number {
  return prefs.categories.length + prefs.interests.length + prefs.vibes.length;
}

/* -------------------------------------------------------- Option labels */

export const budgetOptions: { id: BudgetBand; label: string; hint?: string }[] = [
  { id: "under-75", label: "Under $75" },
  { id: "75-150", label: "$75 – $150" },
  { id: "150-300", label: "$150 – $300" },
  { id: "300-plus", label: "$300+" },
  { id: "no-limit", label: "Depends on the show" },
];

export const travelOptions: { id: TravelRadius; label: string }[] = [
  { id: "my-city", label: "My city only" },
  { id: "50-miles", label: "Within 50 miles" },
  { id: "few-hours", label: "Within a few hours" },
  { id: "anywhere", label: "Anywhere worth it" },
];

export const horizonOptions: { id: PlanningHorizon; label: string }[] = [
  { id: "this-week", label: "This week" },
  { id: "this-month", label: "This month" },
  { id: "few-months", label: "Next few months" },
  { id: "whenever", label: "Whenever it's good" },
];

export const vibeOptions: { id: EventVibe; label: string }[] = [
  { id: "cheapest-seat", label: "Cheapest seat in the house" },
  { id: "best-value", label: "Best value middle" },
  { id: "close-as-possible", label: "Close as possible" },
  { id: "big-nights", label: "Big arena nights" },
  { id: "small-rooms", label: "Small rooms & clubs" },
  { id: "with-friends", label: "Group outings" },
  { id: "family-friendly", label: "Family friendly" },
  { id: "date-night", label: "Date night" },
  { id: "solo", label: "Happy going solo" },
];

export const labelForBudget = (id?: BudgetBand) => budgetOptions.find((o) => o.id === id)?.label;
export const labelForTravel = (id?: TravelRadius) => travelOptions.find((o) => o.id === id)?.label;
export const labelForHorizon = (id?: PlanningHorizon) => horizonOptions.find((o) => o.id === id)?.label;
export const labelForVibe = (id: EventVibe) => vibeOptions.find((o) => o.id === id)?.label ?? id;

/* ------------------------------------------- Legacy answers compatibility */

/**
 * The first onboarding stored answers as `Record<questionId, string[]>` and
 * the home feed still reads `answers.categories`. We keep writing that shape
 * (derived from the new model) so nothing downstream breaks.
 */
export function toLegacyAnswers(prefs: EventPreferences): Record<string, string[]> {
  const byCat = interestsByCategory(prefs);
  const answers: Record<string, string[]> = {
    categories: prefs.categories.map((c) => labelFor(c)),
    genres: (byCat.get("music") ?? []).map(labelFor),
    teams: (byCat.get("sports") ?? []).map(labelFor),
  };
  if (prefs.budget) answers["budget"] = [labelForBudget(prefs.budget)!];
  if (prefs.travel) answers["travel"] = [labelForTravel(prefs.travel)!];
  if (prefs.horizon) answers["horizon"] = [labelForHorizon(prefs.horizon)!];
  if (prefs.vibes.length) answers["seating"] = prefs.vibes.map(labelForVibe);
  return answers;
}
