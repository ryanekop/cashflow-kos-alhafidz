import DashboardPage from "@/features/dashboard/DashboardPage";
import { getDashboardPageData } from "@/lib/server/services/dashboard";

export default async function Page() {
  const data = getDashboardPageData();
  return <DashboardPage data={data} />;
}
