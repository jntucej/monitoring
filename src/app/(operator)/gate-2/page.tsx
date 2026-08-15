import { Scanner } from "@/components/operator/Scanner";
import { RecentScans } from "@/components/operator/RecentScans";

export default function Gate2Page() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Scanner />
      </div>
      <div>
        <RecentScans />
      </div>
    </div>
  );
}
