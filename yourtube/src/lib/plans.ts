export const PAID_PLANS = ["bronze", "silver", "gold"] as const;

export type UserPlan = "free" | "bronze" | "silver" | "gold";

export const hasPaidPlan = (plan?: string) =>
  PAID_PLANS.includes(plan as (typeof PAID_PLANS)[number]);

export const isFreePlan = (plan?: string) => !plan || plan === "free";

export const formatPlanLabel = (plan?: string) => {
  if (!plan || plan === "free") return "Free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
};
