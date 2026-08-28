import HistoryContent from "@/components/HistoryContent";

export default function HistoryPage() {
  return (
    <main className="flex-1 min-h-screen p-6 theme-page">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Watch history</h1>
        <HistoryContent />
      </div>
    </main>
  );
}
