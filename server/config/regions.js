// Regions drive currency and number/date formatting across the whole app.
// The client fetches this list from GET /api/meta/regions so there is one source of truth.
const REGIONS = [
  { code: 'IN', name: 'India',          currency: 'INR', locale: 'en-IN' },
  { code: 'US', name: 'United States',  currency: 'USD', locale: 'en-US' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  { code: 'EU', name: 'Eurozone',       currency: 'EUR', locale: 'en-IE' },
  { code: 'AE', name: 'UAE',            currency: 'AED', locale: 'en-AE' },
  { code: 'SA', name: 'Saudi Arabia',   currency: 'SAR', locale: 'en-SA' },
  { code: 'SG', name: 'Singapore',      currency: 'SGD', locale: 'en-SG' },
  { code: 'AU', name: 'Australia',      currency: 'AUD', locale: 'en-AU' },
  { code: 'CA', name: 'Canada',         currency: 'CAD', locale: 'en-CA' },
  { code: 'JP', name: 'Japan',          currency: 'JPY', locale: 'ja-JP' },
];

const DEFAULT_REGION = 'IN';
const REGION_CODES = REGIONS.map((r) => r.code);
const getRegion = (code) => REGIONS.find((r) => r.code === code) || REGIONS.find((r) => r.code === DEFAULT_REGION);

const formatMoney = (value, regionCode) => {
  const { locale, currency } = getRegion(regionCode);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
};

module.exports = { REGIONS, REGION_CODES, DEFAULT_REGION, getRegion, formatMoney };
