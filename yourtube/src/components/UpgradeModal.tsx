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
import { formatPlanLabel } from "@/lib/plans";
import { BACKEND_URL } from "@/lib/constants";
import { auth } from "@/lib/firebase";
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

  const handleUpgrade = async () => {
    if (!user) return;

    setIsProcessing(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setIsProcessing(false);
        return;
      }

      const idToken = await currentUser.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create order");
      }

      await openRazorpayCheckout({
        user,
        plan,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        keyId: data.keyId,
        onSuccess: (updatedUser) => {
          login(updatedUser);
          toast.success(`You're now on the ${formatPlanLabel(updatedUser.plan)} plan!`);
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
        error instanceof Error ? error.message : "Could not start checkout";
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
            Upgrade to Premium
          </DialogTitle>
        </DialogHeader>

        {reason === "limit_reached" && (
          <p className="text-sm text-gray-600">
            Free users can download 1 video per day. Upgrade to Premium for
            unlimited downloads.
          </p>
        )}

        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-2">
            <Download className="w-4 h-4 text-red-600" />
            Unlimited video downloads
          </li>
          <li className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-600" />
            No daily limits
          </li>
          <li className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-red-600" />
            Gold plan badge on your profile
          </li>
        </ul>

        <p className="text-lg font-semibold">₹100 / month</p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Maybe later
          </Button>
          <Button onClick={handleUpgrade} disabled={isProcessing}>
            {isProcessing ? "Opening checkout..." : "Go Premium"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
