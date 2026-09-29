import type { CdekEntityDto, CdekOrderInfoResponse, CdekStatusDto } from "../types/api";

/**
 * Ответ СДЭК о заказе, сведённый к тому, что нужно администратору:
 * где посылка, когда будет, кому, что внутри и сколько стоит.
 * Отправитель и продавец — это мы сами, их не показываем.
 */

/** Смысл статуса для цвета: дошло, ждёт получателя, проблема, в пути. */
export type CdekStatusTone = "created" | "transit" | "waiting" | "delivered" | "problem";

export interface CdekStatus {
  code: string;
  name: string;
  /** Миллисекунды UTC либо null, если дата не разобралась. */
  at: number | null;
  city: string | null;
}

export interface CdekPackage {
  weight: number | null;
  /** «29 × 23 × 9 см» либо null. */
  size: string | null;
  items: { name: string; amount: number; cost: number | null }[];
}

export interface CdekInfo {
  orderUuid: string;
  cdekNumber: string | null;
  imNumber: string | null;
  tariff: string | null;
  status: CdekStatus | null;
  tone: CdekStatusTone;
  /** Новые сверху, без удалённых. */
  history: CdekStatus[];
  /** Даты без времени — строкой "YYYY-MM-DD", чтобы часовой пояс их не сдвинул. */
  plannedDate: string | null;
  deliveredDate: string | null;
  keepFreeUntil: number | null;
  fromCity: string | null;
  toCity: string | null;
  toRegion: string | null;
  toAddress: string | null;
  deliveryPoint: string | null;
  recipient: { name: string | null; phones: string[]; email: string | null };
  packages: CdekPackage[];
  cost: {
    total: number | null;
    delivery: number | null;
    vat: number | null;
    services: { label: string; sum: number }[];
  };
  /** Сколько получатель доплачивает при вручении: доставка + наложенный платёж. */
  recipientPays: number;
  /** Ошибки отклонённых запросов к СДЭК — то, что надо исправить в ЛК. */
  problems: string[];
}

/** Коды тарифов, которыми пользуется издательство. Незнакомый показываем номером. */
const TARIFFS: Record<number, string> = {
  136: "Посылка склад-склад",
  137: "Посылка склад-дверь",
  138: "Посылка дверь-склад",
  139: "Посылка дверь-дверь",
  233: "Экономичная посылка склад-дверь",
  234: "Экономичная посылка склад-склад",
};

const SERVICES: Record<string, string> = {
  INSURANCE: "страховка",
};

/** Статусы, после которых посылка ждёт получателя. */
const WAITING = new Set(["ACCEPTED_AT_PICK_UP_POINT", "POSTOMAT_POSTED"]);
/** Статусы, требующие вмешательства. */
const PROBLEM = new Set(["NOT_DELIVERED", "INVALID", "REMOVED", "RETURNED"]);
const CREATED = new Set(["ACCEPTED", "CREATED"]);

function toneOf(code: string | undefined): CdekStatusTone {
  if (!code) return "created";
  if (code === "DELIVERED") return "delivered";
  if (WAITING.has(code)) return "waiting";
  if (PROBLEM.has(code) || code.includes("RETURN")) return "problem";
  if (CREATED.has(code)) return "created";
  return "transit";
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * СДЭК пишет смещение без двоеточия — "+0000". Chrome такое понимает,
 * Safari нет, поэтому приводим к ISO.
 */
function parseDateTime(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const parsed = Date.parse(raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeStatus(dto: CdekStatusDto): CdekStatus | null {
  const name = text(dto.name);
  if (!name || dto.deleted) return null;
  return {
    code: text(dto.code) ?? "",
    name,
    at: parseDateTime(dto.date_time),
    city: text(dto.city),
  };
}

function packagesOf(entity: CdekEntityDto): CdekPackage[] {
  return (entity.packages ?? []).map((pkg) => {
    const [length, width, height] = [num(pkg.length), num(pkg.width), num(pkg.height)];
    return {
      weight: num(pkg.weight),
      size:
        length !== null && width !== null && height !== null
          ? `${length} × ${width} × ${height} см`
          : null,
      items: (pkg.items ?? []).map((item) => ({
        name: text(item.name) ?? "Без названия",
        amount: num(item.amount) ?? 1,
        cost: num(item.cost),
      })),
    };
  });
}

function recipientPaysOf(entity: CdekEntityDto): number {
  const delivery = num(entity.delivery_recipient_cost?.value) ?? 0;
  const cod = (entity.packages ?? [])
    .flatMap((pkg) => pkg.items ?? [])
    .reduce((sum, item) => sum + (num(item.payment?.value) ?? 0) * (num(item.amount) ?? 1), 0);
  return delivery + cod;
}

export function normalizeCdekInfo(response: CdekOrderInfoResponse): CdekInfo {
  const entity: CdekEntityDto = response.data?.entity ?? {};

  const history = (entity.statuses ?? [])
    .map(normalizeStatus)
    .filter((status): status is CdekStatus => status !== null)
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  const status = history[0] ?? null;

  const tariffCode = num(entity.tariff_code);
  const detail = entity.delivery_detail;

  const problems = (response.data?.requests ?? [])
    .filter((request) => request.state === "INVALID")
    .flatMap((request) => request.errors ?? [])
    .map((error) => text(error.message) ?? text(error.code))
    .filter((message): message is string => message !== null);

  return {
    orderUuid: text(entity.uuid) ?? response.order_uuid,
    cdekNumber: text(entity.cdek_number),
    imNumber: text(entity.number),
    tariff: tariffCode === null ? null : (TARIFFS[tariffCode] ?? `Тариф ${tariffCode}`),
    status,
    tone: toneOf(status?.code),
    history,
    plannedDate: text(entity.planned_delivery_date),
    deliveredDate: text(entity.delivery_date),
    keepFreeUntil: parseDateTime(entity.keep_free_until),
    fromCity: text(entity.from_location?.city),
    toCity: text(entity.to_location?.city),
    toRegion: text(entity.to_location?.region),
    toAddress: text(entity.to_location?.address),
    deliveryPoint: text(entity.delivery_point),
    recipient: {
      name: text(entity.recipient?.name),
      phones: (entity.recipient?.phones ?? [])
        .map((phone) => text(phone.number))
        .filter((phone): phone is string => phone !== null),
      email: text(entity.recipient?.email),
    },
    packages: packagesOf(entity),
    cost: {
      total: num(detail?.total_sum),
      delivery: num(detail?.delivery_sum),
      vat: num(detail?.delivery_vat_sum),
      services: (entity.services ?? []).flatMap((service) => {
        const sum = num(service.total_sum);
        const code = text(service.code);
        return sum !== null && sum > 0 && code ? [{ label: SERVICES[code] ?? code, sum }] : [];
      }),
    },
    recipientPays: recipientPaysOf(entity),
    problems,
  };
}

/** Ссылка на публичное отслеживание — ей же можно поделиться с покупателем. */
export function cdekTrackingUrl(cdekNumber: string): string {
  return `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(cdekNumber)}`;
}
