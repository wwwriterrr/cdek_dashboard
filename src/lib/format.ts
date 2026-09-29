const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
});

const dateWithYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const moneyWithKopecks = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
});

export const EMPTY = "—";

/**
 * Год показываем только у заказов не из текущего года: в колонке шириной
 * в одну строку каждый лишний символ стоит переноса.
 */
export function formatDate(dt: number | null): string {
  if (dt === null) return EMPTY;
  const date = new Date(dt);
  if (date.getFullYear() === new Date().getFullYear()) return dateFormatter.format(date);

  // «19 авг. 2025 г.» → «19 авг. 2025». Пробел перед «г.» обязателен, иначе
  // регулярка срезает окончание самого месяца: «19 авг.» → «19 ав».
  return dateWithYearFormatter.format(date).replace(/\s+г\.$/, "");
}

export function formatTime(dt: number | null): string {
  return dt === null ? EMPTY : timeFormatter.format(new Date(dt));
}

export function formatMoney(value: number | null): string {
  if (value === null) return EMPTY;
  return Number.isInteger(value) ? moneyFormatter.format(value) : moneyWithKopecks.format(value);
}

/** +79135609860 → +7 913 560-98-60. Незнакомый формат оставляем как есть. */
export function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    const [, a, b, c, d] = digits.match(/^.(\d{3})(\d{3})(\d{2})(\d{2})$/) ?? [];
    if (a) return `+7 ${a} ${b}-${c}-${d}`;
  }
  return phone;
}

/** Множественное число по-русски: 1 заказ, 2 заказа, 5 заказов. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function ordersCountLabel(count: number): string {
  return `${count} ${plural(count, "заказ", "заказа", "заказов")}`;
}

/** «29 сент., 05:45» — момент события в местном времени. */
export function formatDateTime(dt: number | null): string {
  return dt === null ? EMPTY : `${formatDate(dt)}, ${formatTime(dt)}`;
}

/**
 * «2026-10-03» → «03 окт.». Дата без времени: собираем её в местном поясе,
 * иначе new Date("2026-10-03") прочтётся как полночь UTC и западнее Гринвича
 * уедет на день назад.
 */
export function formatCalendarDate(value: string | null): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value ?? EMPTY;
  const [, y, m, d] = match;
  return formatDate(new Date(Number(y), Number(m) - 1, Number(d)).getTime());
}

/** 600 → «600 г», 1710 → «1,71 кг». */
export function formatWeight(grams: number | null): string | null {
  if (grams === null) return null;
  if (grams < 1000) return `${grams} г`;
  return `${(grams / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} кг`;
}
