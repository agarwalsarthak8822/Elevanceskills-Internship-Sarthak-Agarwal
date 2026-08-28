import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import { Suspense } from "react";

// Explore mirrors the home feed (browse all videos by category). Kept as its
// own route so the sidebar "Explore" link resolves instead of 404-ing.
export default function Explore() {
  return (
    <main className="flex-1 p-4 md:p-6 theme-page">
      <h1 className="text-xl font-semibold mb-4">Explore</h1>
      <CategoryTabs />
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
