export const PAID_PLANS = ["bronze", "silver", "gold"];

export const PLAN_AMOUNT_PAISE = {
  bronze: 1000,
  silver: 5000,
  gold: 10000,
};

export const getPlanAmountInPaise = (plan) => PLAN_AMOUNT_PAISE[plan];

export const hasPaidPlan = (plan) => PAID_PLANS.includes(plan);

export const isFreePlan = (plan) => !plan || plan === "free";
