import WifiPage from "@/features/wifi/WifiPage";
import { getWifiSnapshot } from "@/lib/server/services/snapshots";

export default async function Page() {
  const initialData = getWifiSnapshot();
  return <WifiPage initialData={initialData} />;
}
