import { PAYMENT_METHODS } from "@/lib/shared/constants";
import { formatIDR } from "@/lib/shared/format";

export function getPaymentMethod(paymentMethodId: string) {
  return PAYMENT_METHODS.find((method) => method.id === paymentMethodId) ?? null;
}

export function buildWhatsAppPaymentText({
  memberName,
  paymentMethodId,
  totalKas,
  totalWifi,
  totalPayment,
  kasMonths,
  wifiMonths,
}: {
  memberName: string;
  paymentMethodId: string;
  totalKas: number;
  totalWifi: number;
  totalPayment: number;
  kasMonths: string[];
  wifiMonths: string[];
}) {
  const method = getPaymentMethod(paymentMethodId);
  const parts: string[] = [];

  if (kasMonths.length > 0) {
    parts.push(`kas bulan ${kasMonths.join(", ")} (${formatIDR(totalKas)})`);
  }

  if (wifiMonths.length > 0) {
    parts.push(`wifi bulan ${wifiMonths.join(", ")} (${formatIDR(totalWifi)})`);
  }

  return encodeURIComponent(
    `Halo mas, saya ${memberName} mau bayar ${parts.join(" dan ")} total ${formatIDR(totalPayment)} via ${method?.label ?? ""} ini ya buktinya.`,
  );
}
