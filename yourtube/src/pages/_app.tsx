import Head from "next/head";
import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import AuthDialog from "@/components/AuthDialog";
import UpgradeModal from "@/components/UpgradeModal";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import "@/styles/themes.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthProvider";
import { useUser } from "../lib/useUser";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { VideoCallProvider } from "@/hooks/useVideoCall";
import IncomingCallModal from "@/components/VideoCall/IncomingCallModal";
import CallInterface from "@/components/VideoCall/CallInterface";

function AppShell({ Component, pageProps }: AppProps) {
  const { upgradeOpen, upgradeReason, upgradePlan, closeUpgradeDialog } = useUser();
  const { theme, locationChecked } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!locationChecked) {
    return (
      <div data-theme="dark" className="min-h-screen flex items-center justify-center theme-loading">
        <p>Setting up your experience...</p>
      </div>
    );
  }

  return (
    <div data-theme={theme} className="min-h-screen theme-page">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <AuthDialog />
      <UpgradeModal
        open={upgradeOpen}
        onClose={closeUpgradeDialog}
        reason={upgradeReason}
        plan={upgradePlan}
      />
      <IncomingCallModal />
      <CallInterface />
      <Toaster />
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 min-w-0">
          <Component {...pageProps} />
        </div>
      </div>
    </div>
  );
}

export default function App(props: AppProps) {
  return (
    <UserProvider>
      <ThemeProvider>
        <VideoCallProvider>
          <Head>
            <title>YourTube</title>
            <meta name="description" content="YourTube video sharing platform" />
          </Head>
          <AppShell {...props} />
        </VideoCallProvider>
      </ThemeProvider>
    </UserProvider>
  );
}
