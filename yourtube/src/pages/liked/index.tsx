import LikedContent from "@/components/LikedContent";

export default function LikedPage() {
  return (
    <main className="flex-1 min-h-screen p-6 theme-page">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Liked videos</h1>
        <LikedContent />
      </div>
    </main>
  );
}
