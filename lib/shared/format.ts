export function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatIDRShort(value: number) {
  if (value >= 1000) {
    return `${value / 1000}`;
  }

  return String(value);
}

export function formatMonthLabel(month: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(`${month}-01`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    ...options,
  });
}

export function formatDateLabel(dateString: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(dateString).toLocaleDateString("id-ID", options);
}
