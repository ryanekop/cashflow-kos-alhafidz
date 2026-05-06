import PaymentPage from "@/features/payment/PaymentPage";
import { getPaymentSnapshot } from "@/lib/server/services/snapshots";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialData = getPaymentSnapshot();
  return <PaymentPage initialData={initialData} />;
}
