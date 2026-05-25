import type { PaymentMethod } from "@/lib/types/domain";

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const WHATSAPP_NUMBER = "6283846451376";

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "bni",
    label: "BNI",
    color: "#f26522",
    desc: "Transfer via BNI",
    logo: "/bni-logo.png",
    account: "0718804098",
    accountName: "RYAN EKO PRAMONO",
  },
  {
    id: "shopeepay",
    label: "ShopeePay",
    color: "#ee4d2d",
    desc: "Via ShopeePay",
    logo: "/shopeepay-logo.png",
    account: "083846451376",
    accountName: "RYAN EKO PRAMONO",
  },
  {
    id: "gopay",
    label: "GoPay",
    color: "#00aed6",
    desc: "Via GoPay",
    logo: "/gopay-logo.png",
    account: "083846451376",
    accountName: "RYAN EKO PRAMONO",
  },
  {
    id: "dana",
    label: "DANA",
    color: "#118eea",
    desc: "Via DANA",
    logo: "/dana-logo.png",
    account: "083846451376",
    accountName: "RYAN EKO PRAMONO",
  },
];
