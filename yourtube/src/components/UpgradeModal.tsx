import { useState } from "react";
import { Crown, Download, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useUser } from "@/lib/useUser";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { createPremiumOrder } from "@/lib/paymentApi";
import {
  formatPlanLabel,
  formatWatchLimitLabel,
  getPlanPriceRupees,
} from "@/lib/plans";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "limit_reached" | "manual";
  plan: "bronze" | "silver" | "gold";
}

export default function UpgradeModal({
  open,
  onClose,
  reason = "manual",
  plan,
}: UpgradeModalProps) {
  const { user, login } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);

  const price = getPlanPriceRupees(plan);
  const planLabel = formatPlanLabel(plan);

  const handleUpgrade = async () => {
    if (!user) return;

    setIsProcessing(true);

    try {
      // Uses axiosInstance under the hood, which attaches whichever token the
      // user has (Firebase idToken OR JWT from OTP login) — so every signed-in
      // user can pay, not just Firebase accounts.
      const data = await createPremiumOrder(plan);

      await openRazorpayCheckout({
        user,
        plan,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        keyId: data.keyId,
        onSuccess: (updatedUser) => {
          login(updatedUser);
          toast.success(
            `You're now on the ${formatPlanLabel(updatedUser.plan)} plan!`
          );
          setIsProcessing(false);
          onClose();
        },
        onError: (message) => {
          if (message !== "Payment cancelled") {
            toast.error(message);
          }
          setIsProcessing(false);
        },
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (error instanceof Error ? error.message : "Could not start checkout");
      toast.error(message);
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Upgrade to {planLabel}
          </DialogTitle>
        </DialogHeader>

        {reason === "limit_reached" && (
          <p className="text-sm text-gray-600">
            Free users can download 1 video per day. Upgrade for unlimited
            downloads.
          </p>
        )}

        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-2">
            <Download className="w-4 h-4 text-red-600" />
            Unlimited video downloads
          </li>
          <li className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-600" />
            {formatWatchLimitLabel(plan)} watch time
          </li>
          <li className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-red-600" />
            {planLabel} plan badge on your profile
          </li>
        </ul>

        <p className="text-lg font-semibold">₹{price} / month</p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Maybe later
          </Button>
          <Button onClick={handleUpgrade} disabled={isProcessing}>
            {isProcessing ? "Opening checkout..." : `Upgrade to ${planLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
