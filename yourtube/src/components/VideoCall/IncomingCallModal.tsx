import { Phone, PhoneOff } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useVideoCall } from "@/hooks/useVideoCall";

export default function IncomingCallModal() {
  const { callStatus, incomingCall, acceptCall, rejectCall } = useVideoCall();

  return (
    <Dialog open={callStatus === "incoming" && !!incomingCall}>
      <DialogContent className="sm:max-w-md theme-card border">
        <DialogHeader>
          <DialogTitle>Incoming video call</DialogTitle>
        </DialogHeader>
        <p className="text-sm theme-text-secondary">
          {incomingCall?.callerName || "Someone"} is calling you...
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={rejectCall}>
            <PhoneOff className="w-4 h-4 mr-2" />
            Decline
          </Button>
          <Button onClick={acceptCall}>
            <Phone className="w-4 h-4 mr-2" />
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
