import SearchResult from "@/components/SearchResult";
import { useRouter } from "next/router";

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const query = typeof q === "string" ? q : "";

  return (
    <div className="flex-1 p-4">
      <div className="max-w-6xl">
        {query && (
          <div className="mb-6">
            <h1 className="text-xl font-medium mb-4">
              Search results for &quot;{query}&quot;
            </h1>
          </div>
        )}
        <SearchResult query={query} />
      </div>
    </div>
  );
}
