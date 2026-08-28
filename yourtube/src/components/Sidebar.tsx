import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  Download,
  ThumbsUp,
  History,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/useUser";

interface SidebarProps {
  /** Whether the mobile drawer is open. Ignored on desktop (always visible). */
  open?: boolean;
  /** Called to close the mobile drawer (backdrop click, link tap, or X). */
  onClose?: () => void;
}

const Sidebar = ({ open = false, onClose }: SidebarProps) => {
  const { user } = useUser();
  const router = useRouter();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  // A single sidebar row. Highlights itself when its route is active, matching
  // YouTube's grey "pill" on the current page.
  const NavItem = ({
    href,
    icon: Icon,
    label,
    onNavigate,
  }: {
    href: string;
    icon: LucideIcon;
    label: string;
    onNavigate?: () => void;
  }) => {
    const active =
      router.pathname === href ||
      (href !== "/" && router.pathname.startsWith(href));
    return (
      <Link href={href} onClick={onNavigate}>
        <span
          className={`flex items-center gap-5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            active
              ? "theme-bg-secondary font-medium"
              : "font-normal theme-hover"
          }`}
        >
          <Icon className="w-[22px] h-[22px] shrink-0" />
          <span className="truncate">{label}</span>
        </span>
      </Link>
    );
  };

  // Nav items are shared between the desktop rail and the mobile drawer.
  // onNavigate closes the drawer after a tap on mobile.
  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-0.5">
      <NavItem href="/" icon={Home} label="Home" onNavigate={onNavigate} />
      <NavItem
        href="/explore"
        icon={Compass}
        label="Explore"
        onNavigate={onNavigate}
      />
      <NavItem
        href="/subscriptions"
        icon={PlaySquare}
        label="Subscriptions"
        onNavigate={onNavigate}
      />

      {user && (
        <div className="border-t theme-border pt-2 mt-2">
          <h3 className="px-3 pb-1 pt-1 text-base font-medium">You</h3>
          <NavItem
            href="/history"
            icon={History}
            label="History"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/liked"
            icon={ThumbsUp}
            label="Liked videos"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/watch-later"
            icon={Clock}
            label="Watch later"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/profile/downloads"
            icon={Download}
            label="My downloads"
            onNavigate={onNavigate}
          />
          {user?.channelname ? (
            <NavItem
              href={`/channel/${user._id}`}
              icon={User}
              label="Your channel"
              onNavigate={onNavigate}
            />
          ) : (
            <div className="px-2 py-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  onNavigate?.();
                  setisdialogeopen(true);
                }}
              >
                Create Channel
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop rail — sticky under the 56px header, scrolls independently. */}
      <aside className="hidden md:block w-60 shrink-0 border-r theme-sidebar sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-3">
        <NavLinks />
      </aside>

      {/* Mobile drawer — slides in over the content, hidden on desktop. */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        {/* Panel */}
        <aside
          className={`absolute left-0 top-0 h-full w-64 max-w-[80%] border-r p-3 theme-sidebar overflow-y-auto shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex justify-end p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <NavLinks onNavigate={onClose} />
        </aside>
      </div>

      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </>
  );
};

export default Sidebar;
