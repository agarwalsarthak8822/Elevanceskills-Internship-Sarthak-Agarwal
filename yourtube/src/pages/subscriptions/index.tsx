import Videogrid from "@/components/Videogrid";
import { Suspense } from "react";

// Subscriptions feed. Kept as its own route so the sidebar "Subscriptions"
// link resolves instead of 404-ing. Shows the video grid as the feed.
export default function Subscriptions() {
  return (
    <main className="flex-1 p-4 md:p-6 theme-page">
      <h1 className="text-xl font-semibold mb-4">Subscriptions</h1>
      <Suspense
        fallback={
          <div className="py-8 theme-text-secondary">Loading videos...</div>
        }
      >
        <Videogrid />
      </Suspense>
    </main>
  );
}
