import { useState } from "react";

const categories = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

export default function CategoryTabs() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="sticky top-14 z-30 theme-page flex gap-3 overflow-x-auto py-3 scrollbar-hide">
      {categories.map((category) => {
        const isActive = activeCategory === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "theme-bg-secondary theme-text-primary theme-hover"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
