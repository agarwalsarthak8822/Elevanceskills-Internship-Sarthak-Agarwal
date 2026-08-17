import React, { FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import OtpInput from "./OtpInput";
import { useUser } from "@/lib/useUser";
import { useTheme } from "@/context/ThemeContext";
import {
  getFirebaseAuthErrorMessage,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase";
import { signinWithPassword, completeLogin } from "@/lib/authApi";
import { sendOtp, verifyOtp } from "@/lib/otpApi";
import { isSouthIndianState } from "@/lib/southIndia";
import { toast } from "sonner";

const OTP_COUNTDOWN_SECONDS = 300;

const AuthDialog = () => {
  const {
    authDialogOpen,
    authDialogMode,
    closeAuthDialog,
    openAuthDialog,
    handleAuthSuccess,
    loginWithToken,
  } = useUser();
  const { detectedState } = useTheme();

  const [mode, setMode] = useState(authDialogMode);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpUserId, setOtpUserId] = useState("");
  const [otpChannel, setOtpChannel] = useState<"email" | "mobile">("email");
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array.from({ length: 6 }, () => "")
  );
  const [otpError, setOtpError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(OTP_COUNTDOWN_SECONDS);

  useEffect(() => {
    setMode(authDialogMode);
  }, [authDialogMode]);

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step, secondsLeft]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setStep("credentials");
    setOtpUserId("");
    setOtpDigits(Array.from({ length: 6 }, () => ""));
    setOtpError("");
    setSecondsLeft(OTP_COUNTDOWN_SECONDS);
  };

  const handleClose = () => {
    resetForm();
    closeAuthDialog();
  };

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const startOtpFlow = async (userId: string) => {
    const channel = isSouthIndianState(detectedState) ? "email" : "mobile";
    setOtpUserId(userId);
    setOtpChannel(channel);
    setStep("otp");
    setSecondsLeft(OTP_COUNTDOWN_SECONDS);
    setOtpDigits(Array.from({ length: 6 }, () => ""));
    setOtpError("");

    await sendOtp(userId, channel);
    toast.success(
      channel === "email"
        ? "OTP sent to your email"
        : "OTP sent to your mobile (dev: check server terminal)"
    );
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const firebaseUser = await signUpWithEmail({ email, password, name });
        await handleAuthSuccess(firebaseUser);
        resetForm();
        return;
      }

      const signinData = await signinWithPassword(email, password);
      await startOtpFlow(signinData.userId);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          getFirebaseAuthErrorMessage(error) ||
          "Sign in failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join("");

    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit OTP");
      return;
    }

    setIsSubmitting(true);
    setOtpError("");

    try {
      await verifyOtp(otpUserId, otp);
      const { result, token } = await completeLogin(otpUserId);
      loginWithToken(result, token);
      toast.success("Signed in successfully");
      resetForm();
      closeAuthDialog();
    } catch (error: any) {
      setOtpError(
        error?.response?.data?.message || "Invalid or expired OTP"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (secondsLeft > 0 || !otpUserId) return;

    setIsSubmitting(true);
    setOtpError("");

    try {
      await sendOtp(otpUserId, otpChannel);
      setSecondsLeft(OTP_COUNTDOWN_SECONDS);
      toast.success("OTP resent");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const firebaseUser = await signInWithGoogle();
      await handleAuthSuccess(firebaseUser);
      resetForm();
    } catch (error: any) {
      toast.error(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={authDialogOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md theme-card border">
        <DialogHeader>
          <DialogTitle>
            {step === "otp"
              ? "Verify OTP"
              : mode === "signup"
              ? "Create your account"
              : "Sign in to YourTube"}
          </DialogTitle>
        </DialogHeader>

        {step === "otp" ? (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm theme-text-secondary">
              {otpChannel === "email"
                ? "OTP sent to your email"
                : "OTP sent to your mobile (dev: check server terminal)"}
            </p>

            <OtpInput
              value={otpDigits}
              onChange={setOtpDigits}
              disabled={isSubmitting}
            />

            <p className="text-center text-sm theme-text-secondary">
              Time remaining: {formatCountdown(secondsLeft)}
            </p>

            {otpError && (
              <p className="text-sm text-red-600 text-center">{otpError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify OTP"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={secondsLeft > 0 || isSubmitting}
              onClick={handleResendOtp}
            >
              Resend OTP
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("credentials");
                setOtpError("");
              }}
            >
              Back to sign in
            </Button>
          </form>
        ) : (
          <>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="theme-input-bg"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="theme-input-bg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  className="theme-input-bg"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? "Please wait..."
                  : mode === "signup"
                  ? "Sign up"
                  : "Sign in"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t theme-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="theme-page px-2 theme-text-secondary">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              Continue with Google
            </Button>

            <p className="text-center text-sm theme-text-secondary">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => setMode("signin")}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New to YourTube?{" "}
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => {
                      setMode("signup");
                      openAuthDialog("signup");
                    }}
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
