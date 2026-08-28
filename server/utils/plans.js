export const PAID_PLANS = ["bronze", "silver", "gold"];

// Amount charged per plan, in paise (₹1 = 100 paise).
// bronze ₹10, silver ₹50, gold ₹100.
export const PLAN_AMOUNT_PAISE = {
  bronze: 1000,
  silver: 5000,
  gold: 10000,
};

// Maximum watch time per video, in minutes. `null` means unlimited.
// free = 5 min, bronze = 7 min, silver = 10 min, gold = unlimited.
export const PLAN_WATCH_LIMIT_MINUTES = {
  free: 5,
  bronze: 7,
  silver: 10,
  gold: null,
};

export const getPlanAmountInPaise = (plan) => PLAN_AMOUNT_PAISE[plan];

// Convenience: plan price in whole rupees (used for invoices/emails).
export const getPlanRupees = (plan) => (PLAN_AMOUNT_PAISE[plan] ?? 0) / 100;

// Watch-time limit in minutes for a plan; unknown plans fall back to free.
export const getWatchLimitMinutes = (plan) => {
  const key =
    plan && Object.prototype.hasOwnProperty.call(PLAN_WATCH_LIMIT_MINUTES, plan)
      ? plan
      : "free";
  return PLAN_WATCH_LIMIT_MINUTES[key];
};

export const hasPaidPlan = (plan) => PAID_PLANS.includes(plan);

export const isFreePlan = (plan) => !plan || plan === "free";
