import { useState } from "react";
import { useRouter } from "next/router";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { createPremiumOrder } from "@/lib/paymentApi";
import { formatPlanLabel, type UserPlan } from "@/lib/plans";
import { useUser } from "@/lib/useUser";
import { toast } from "sonner";

const PLANS: Array<{
  id: UserPlan;
  price: number;
  watchLimit: string;
}> = [
  { id: "free", price: 0, watchLimit: "5 min" },
  { id: "bronze", price: 10, watchLimit: "7 min" },
  { id: "silver", price: 50, watchLimit: "10 min" },
  { id: "gold", price: 100, watchLimit: "Unlimited" },
];

const PLAN_RANK: Record<UserPlan, number> = {
  free: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

type PaidPlan = "bronze" | "silver" | "gold";

export default function PlansPage() {
  const { user, login, openAuthDialog, loading } = useUser();
  const router = useRouter();
  const [processingPlan, setProcessingPlan] = useState<PaidPlan | null>(null);

  const currentPlan = (user?.plan || "free") as UserPlan;
  const currentRank = PLAN_RANK[currentPlan] ?? 0;

  const isUpgradeDisabled = (planId: UserPlan) =>
    PLAN_RANK[planId] <= currentRank;

  const handleUpgrade = async (planId: PaidPlan) => {
    if (isUpgradeDisabled(planId)) return;

    if (!user) {
      openAuthDialog("signin");
      return;
    }

    setProcessingPlan(planId);

    try {
      // createPremiumOrder uses axiosInstance, which attaches whichever token
      // the user has (Firebase idToken or JWT from OTP login).
      const data = await createPremiumOrder(planId);

      await openRazorpayCheckout({
        user,
        plan: planId,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        keyId: data.keyId,
        onSuccess: (updatedUser) => {
          login(updatedUser);
          toast.success(
            `You're now on the ${formatPlanLabel(updatedUser.plan)} plan!`
          );
          setProcessingPlan(null);
          router.push("/");
        },
        onError: (message) => {
          if (message !== "Payment cancelled") {
            toast.error(message);
          }
          setProcessingPlan(null);
        },
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (error instanceof Error ? error.message : "Could not start checkout");
      toast.error(message);
      setProcessingPlan(null);
    }
  };

  return (
    <main className="flex-1 p-6 theme-page">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Choose your plan</h1>
        <p className="theme-text-secondary mb-8">
          Pick the plan that fits how you watch.
        </p>

        {loading ? (
          <p className="text-sm theme-text-secondary">Loading your account...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const disabled = isUpgradeDisabled(plan.id);
              const isPaid = plan.id !== "free";

              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-5 flex flex-col theme-card transition-shadow hover:shadow-md ${
                    isCurrent ? "border-yellow-500 bg-yellow-500/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold">
                      {formatPlanLabel(plan.id)}
                    </h2>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-600 shrink-0">
                        <Crown className="w-3 h-3" />
                        Current Plan
                      </span>
                    )}
                  </div>

                  <p className="text-2xl font-bold mb-1">₹{plan.price}</p>
                  <p className="text-xs theme-text-secondary mb-4">
                    {plan.price === 0 ? "Forever" : "per month"}
                  </p>

                  <p className="text-sm theme-text-secondary mb-6">
                    Watch limit:{" "}
                    <span className="font-medium">
                      {plan.watchLimit}
                    </span>
                  </p>

                  {isPaid ? (
                    <Button
                      className="w-full mt-auto"
                      disabled={disabled || processingPlan !== null}
                      onClick={() => handleUpgrade(plan.id as PaidPlan)}
                    >
                      {processingPlan === plan.id
                        ? "Opening checkout..."
                        : disabled
                          ? "Current or lower plan"
                          : "Upgrade"}
                    </Button>
                  ) : (
                    <Button className="w-full mt-auto" disabled={disabled}>
                      {isCurrent ? "Current Plan" : "Included"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
