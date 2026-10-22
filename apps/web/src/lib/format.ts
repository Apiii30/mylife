const intlLocale = (locale: string) => (locale === "id" ? "id-ID" : "en-US");

export function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Untuk data contoh di landing page: selalu Rupiah. */
export function demoMoney(locale: string) {
  return (idr: number) => formatMoney(Math.round(idr), "IDR", locale);
}
