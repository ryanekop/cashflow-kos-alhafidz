import WifiPage from "@/features/wifi/WifiPage";
import { getWifiSnapshot } from "@/lib/server/services/snapshots";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialData = getWifiSnapshot();
  return <WifiPage initialData={initialData} />;
}
