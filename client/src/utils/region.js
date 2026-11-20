const EU = new Set(['AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK']);

// Best guess of the user's region from the browser, so sign-up starts on the right currency.
export function guessRegion(regions, fallback = 'IN') {
  const codes = new Set(regions.map((r) => r.code));
  const country = (navigator.language || '').match(/-([A-Za-z]{2})$/)?.[1]?.toUpperCase();
  if (country && codes.has(country)) return country;
  if (country && EU.has(country) && codes.has('EU')) return 'EU';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (/^Asia\/(Kolkata|Calcutta)$/.test(tz) && codes.has('IN')) return 'IN';
  return fallback;
}
