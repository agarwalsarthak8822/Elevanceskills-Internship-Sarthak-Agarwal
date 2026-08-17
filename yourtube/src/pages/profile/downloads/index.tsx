import DownloadHistoryContent from "@/components/DownloadHistoryContent";
import { useUser } from "@/lib/useUser";
import { formatPlanLabel, hasPaidPlan } from "@/lib/plans";
import { Crown } from "lucide-react";

export default function ProfileDownloadsPage() {
  const { user } = useUser();

  return (
    <main className="flex-1 p-6 theme-page">
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">My Downloads</h1>
          {hasPaidPlan(user?.plan) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
              <Crown className="w-3 h-3" />
              {formatPlanLabel(user?.plan)}
            </span>
          )}
        </div>
        <DownloadHistoryContent />
      </div>
    </main>
  );
}
