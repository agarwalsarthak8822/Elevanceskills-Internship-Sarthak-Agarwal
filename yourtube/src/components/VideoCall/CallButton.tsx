import { Phone } from "lucide-react";
import { Button } from "../ui/button";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useUser } from "@/lib/useUser";

interface CallButtonProps {
  calleeId?: string;
  calleeName?: string;
}

export default function CallButton({ calleeId, calleeName }: CallButtonProps) {
  const { user, openAuthDialog } = useUser();
  const { callStatus, startCall } = useVideoCall();

  if (!calleeId) return null;

  const isSelf = user?._id === calleeId;
  const isBusy = callStatus !== "idle";

  const handleClick = () => {
    if (!user) {
      openAuthDialog("signin");
      return;
    }

    if (isSelf) return;

    startCall(calleeId, calleeName || "Channel owner");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="theme-action-pill"
      onClick={handleClick}
      disabled={isSelf || isBusy}
      title={isSelf ? "You cannot call yourself" : "Start video call"}
    >
      <Phone className="w-5 h-5 mr-2" />
      Call
    </Button>
  );
}
