import HistoryPage from "@/features/history/HistoryPage";
import { getHistoryPageData } from "@/lib/server/services/history";

export default async function Page() {
  const data = getHistoryPageData();
  return <HistoryPage data={data} />;
}
