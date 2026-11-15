import {locale, tr} from './i18n';
export function localDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function datetimeLocal(iso: string, minuteStep = 1) {
  const d = new Date(iso);
  const minute = Math.floor(d.getMinutes() / minuteStep) * minuteStep;
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
export function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(locale(), {month: 'long', day: 'numeric', weekday: 'short'});
}
export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(locale(), {hour: '2-digit', minute: '2-digit', hour12: false});
}
export function babyAge(birthday: string, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return '';
  const birth = {year: Number(match[1]), month: Number(match[2]), day: Number(match[3])};
  const end = {year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate()};
  const serial = (d: {year: number; month: number; day: number}) => Date.UTC(d.year, d.month - 1, d.day);
  const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();
  const addMonths = (months: number) => {
    const total = birth.year * 12 + birth.month - 1 + months;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    return {year, month, day: Math.min(birth.day, daysIn(year, month))};
  };
  if (serial(end) < serial(birth)) return tr('0个月0天', '0 mo 0 d');
  let totalMonths = (end.year - birth.year) * 12 + (end.month - birth.month);
  if (serial(addMonths(totalMonths)) > serial(end)) totalMonths--;
  const cursor = addMonths(totalMonths);
  const days = Math.floor((serial(end) - serial(cursor)) / 86400000);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return years > 0
    ? tr(`${years}岁${months}个月${days}天`, `${years} yr ${months} mo ${days} d`)
    : tr(`${months}个月${days}天`, `${months} mo ${days} d`);
}
