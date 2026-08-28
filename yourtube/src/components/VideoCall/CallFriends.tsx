import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Phone,
  Search,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useUser } from "@/lib/useUser";
import {
  addFriend,
  getFriends,
  removeFriend,
  searchUsers,
  type FriendProfile,
} from "@/lib/friendApi";
import { toast } from "sonner";

const displayName = (friend: FriendProfile) =>
  friend.name || friend.email || "YourTube user";

/**
 * Self-contained friends launcher: opens a dialog to search users, add/remove
 * friends and video-call online friends. Requires no props and only relies on
 * the already-mounted VideoCallProvider + UserProvider contexts.
 */
export default function CallFriends() {
  const { user, openAuthDialog } = useUser();
  const { startCall, onlineUserIds, callStatus } = useVideoCall();

  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const isOnline = useCallback(
    (id: string) => onlineUserIds.includes(id),
    [onlineUserIds]
  );

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      setFriends(await getFriends());
    } catch {
      toast.error("Could not load your friends");
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  // Refresh the friends list whenever the dialog is opened.
  useEffect(() => {
    if (open && user?._id) {
      loadFriends();
    }
  }, [open, user?._id, loadFriends]);

  // Debounced user search.
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(async () => {
      try {
        const found = await searchUsers(term);
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) toast.error("Search failed");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, open]);

  const handleOpen = () => {
    if (!user) {
      openAuthDialog("signin");
      return;
    }
    setOpen(true);
  };

  const handleAdd = async (target: FriendProfile) => {
    setPendingId(target._id);
    try {
      const updated = await addFriend(target._id);
      setFriends(updated);
      setResults((prev) => prev.filter((u) => u._id !== target._id));
      toast.success(`Added ${displayName(target)}`);
    } catch {
      toast.error("Could not add friend");
    } finally {
      setPendingId(null);
    }
  };

  const handleRemove = async (target: FriendProfile) => {
    setPendingId(target._id);
    try {
      const updated = await removeFriend(target._id);
      setFriends(updated);
      toast.success(`Removed ${displayName(target)}`);
    } catch {
      toast.error("Could not remove friend");
    } finally {
      setPendingId(null);
    }
  };

  const handleCall = (friend: FriendProfile) => {
    if (!isOnline(friend._id)) {
      toast.error(`${displayName(friend)} is offline`);
      return;
    }
    startCall(friend._id, displayName(friend));
    setOpen(false);
  };

  const busy = callStatus !== "idle";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        title="Friends"
        aria-label="Friends"
      >
        <Users className="w-6 h-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md theme-card border">
          <DialogHeader>
            <DialogTitle>Friends</DialogTitle>
            <DialogDescription>
              Find people, add friends and start a video call.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-secondary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9 theme-input-bg"
            />
          </div>

          {/* Search results */}
          {query.trim() && (
            <div className="max-h-40 overflow-y-auto rounded-md border theme-border">
              {searching ? (
                <div className="flex items-center justify-center py-4 theme-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <p className="py-3 text-center text-sm theme-text-secondary">
                  No users found
                </p>
              ) : (
                results.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center gap-2 px-3 py-2 theme-hover"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.image} />
                      <AvatarFallback>
                        {displayName(u)[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {displayName(u)}
                      </p>
                      {u.email && (
                        <p className="truncate text-xs theme-text-secondary">
                          {u.email}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pendingId === u._id}
                      onClick={() => handleAdd(u)}
                    >
                      {pendingId === u._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Friends list */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide theme-text-secondary">
              Your friends
            </p>
            <div className="max-h-64 overflow-y-auto rounded-md border theme-border">
              {loadingFriends ? (
                <div className="flex items-center justify-center py-6 theme-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : friends.length === 0 ? (
                <p className="py-6 text-center text-sm theme-text-secondary">
                  No friends yet. Search above to add some.
                </p>
              ) : (
                friends.map((friend) => {
                  const online = isOnline(friend._id);
                  return (
                    <div
                      key={friend._id}
                      className="flex items-center gap-2 px-3 py-2 theme-hover"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.image} />
                          <AvatarFallback>
                            {displayName(friend)[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                            online ? "bg-green-500" : "bg-zinc-400"
                          }`}
                          title={online ? "Online" : "Offline"}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {displayName(friend)}
                        </p>
                        <p className="truncate text-xs theme-text-secondary">
                          {online ? "Online" : "Offline"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={!online || busy}
                        onClick={() => handleCall(friend)}
                        title={
                          online
                            ? busy
                              ? "You are already in a call"
                              : "Start video call"
                            : "Friend is offline"
                        }
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pendingId === friend._id}
                        onClick={() => handleRemove(friend)}
                        title="Remove friend"
                        aria-label="Remove friend"
                      >
                        {pendingId === friend._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
