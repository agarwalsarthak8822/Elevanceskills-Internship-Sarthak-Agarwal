import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="flex-1 p-4 md:p-6 theme-page">
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
