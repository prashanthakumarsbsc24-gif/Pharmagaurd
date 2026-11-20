// Builds money formatters for a region ({ code, name, currency, locale } from the API).
// Numbers are formatted with the region's own conventions, e.g. India groups as ₹12,34,567.00.
export const makeMoney = (region) => {
  const { locale, currency } = region;
  const full = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const compact = new Intl.NumberFormat(locale, {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  });
  const symbol = full.formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency;

  return {
    region,
    currency,
    locale,
    symbol,
    format: (n) => full.format(n || 0),
    // Short form for big figures: ₹1.2Cr / $1.2M
    compact: (n) => (Math.abs(n) >= 100_000 ? compact.format(n || 0) : full.format(n || 0)),
    number: (n) => new Intl.NumberFormat(locale).format(n || 0),
  };
};
