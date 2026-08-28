export const PAID_PLANS = ["bronze", "silver", "gold"] as const;

export type UserPlan = "free" | "bronze" | "silver" | "gold";

// Price per plan in whole rupees. bronze ₹10, silver ₹50, gold ₹100.
export const PLAN_PRICE_RUPEES: Record<UserPlan, number> = {
  free: 0,
  bronze: 10,
  silver: 50,
  gold: 100,
};

// Maximum watch time per video, in minutes. `null` means unlimited.
export const PLAN_WATCH_LIMIT_MINUTES: Record<UserPlan, number | null> = {
  free: 5,
  bronze: 7,
  silver: 10,
  gold: null,
};

// Free → paid progression, used to order the plans page and pick "next" plan.
export const PLAN_ORDER: UserPlan[] = ["free", "bronze", "silver", "gold"];

export const hasPaidPlan = (plan?: string) =>
  PAID_PLANS.includes(plan as (typeof PAID_PLANS)[number]);

export const isFreePlan = (plan?: string) => !plan || plan === "free";

export const formatPlanLabel = (plan?: string) => {
  if (!plan || plan === "free") return "Free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
};

export const getPlanPriceRupees = (plan?: string) =>
  PLAN_PRICE_RUPEES[(plan as UserPlan) || "free"] ?? 0;

export const getWatchLimitMinutes = (plan?: string): number | null => {
  const key = (plan as UserPlan) || "free";
  return key in PLAN_WATCH_LIMIT_MINUTES
    ? PLAN_WATCH_LIMIT_MINUTES[key]
    : PLAN_WATCH_LIMIT_MINUTES.free;
};

export const formatWatchLimitLabel = (plan?: string): string => {
  const minutes = getWatchLimitMinutes(plan);
  return minutes === null ? "Unlimited" : `${minutes} min / video`;
};

// The next tier up from the given plan, or null if already on the top (gold).
export const getNextPlan = (plan?: string): "bronze" | "silver" | "gold" | null => {
  const idx = PLAN_ORDER.indexOf((plan as UserPlan) || "free");
  const nextIdx = idx === -1 ? 1 : idx + 1;
  const next = PLAN_ORDER[nextIdx];
  return next && next !== "free" ? (next as "bronze" | "silver" | "gold") : null;
};
