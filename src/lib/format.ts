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
