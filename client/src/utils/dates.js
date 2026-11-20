// All expiry maths is done on calendar dates (UTC midnight), so time zones never shift a batch by a day.
const MS_DAY = 86_400_000;

export const todayUTC = () => {
  const t = new Date();
  return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
};

export const parseISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const daysUntil = (iso, today = todayUTC()) => Math.round((parseISODate(iso) - today) / MS_DAY);

export const formatDate = (iso, locale) =>
  new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parseISODate(iso));

export const formatDateTime = (value, locale) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "Today", "in 9 days", "3 months ago", "2.1 years ago"
export const relativeDays = (days) => {
  if (days === 0) return 'Today';
  const abs = Math.abs(days);
  let text;
  if (abs <= 90) text = plural(abs, 'day');
  else if (abs < 365) text = plural(Math.round(abs / 30), 'month');
  else text = `${(abs / 365).toFixed(1)} years`;
  return days < 0 ? `${text} ago` : `in ${text}`;
};
