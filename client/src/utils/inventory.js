import { daysUntil, todayUTC } from './dates';

export const LOW_STOCK_THRESHOLD = 20;     // units
export const DISPOSAL_AFTER_DAYS = 365;    // expired longer than this goes to the disposal queue
export const BOOST_ABOVE_UNITS_SOLD = 80;  // sold more than this: recommend scaling production up

export const STATUSES = {
  expired:  { label: 'Expired',  hint: 'Past expiry date' },
  critical: { label: 'Critical', hint: 'Expires in under 30 days' },
  warning:  { label: 'Warning',  hint: 'Expires in 30–90 days' },
  optimal:  { label: 'Optimal',  hint: 'More than 90 days left' },
};
export const STATUS_ORDER = ['expired', 'critical', 'warning', 'optimal'];

export const statusFor = (days) => {
  if (days < 0) return 'expired';
  if (days < 30) return 'critical';
  if (days <= 90) return 'warning';
  return 'optimal';
};

export const enrich = (batch, today = todayUTC()) => {
  const daysLeft = daysUntil(batch.expirationDate, today);
  return {
    ...batch,
    daysLeft,
    status: statusFor(daysLeft),
    value: batch.price * batch.quantity,
    revenue: batch.price * batch.unitsSold,
  };
};

export const summarize = (items) => {
  const counts = { expired: 0, critical: 0, warning: 0, optimal: 0 };
  const values = { expired: 0, critical: 0, warning: 0, optimal: 0 };
  let units = 0;
  let expiredUnits = 0;
  let lowStock = 0;
  let unpricedExpired = 0;
  let revenue = 0;
  let unitsSold = 0;

  for (const i of items) {
    counts[i.status] += 1;
    values[i.status] += i.value;
    revenue += i.revenue;
    unitsSold += i.unitsSold;
    if (i.status === 'expired') {
      expiredUnits += i.quantity;
      if (i.price === 0) unpricedExpired += 1;
    } else {
      units += i.quantity;
      if (i.quantity < LOW_STOCK_THRESHOLD) lowStock += 1;
    }
  }

  return {
    total: items.length,
    counts,
    values,
    units,
    expiredUnits,
    lowStock,
    unpricedExpired,
    revenue,
    unitsSold,
    atRiskCount: counts.critical + counts.warning,
    atRiskValue: values.critical + values.warning,
    inDateValue: values.critical + values.warning + values.optimal,
    expiredLoss: values.expired,
  };
};
