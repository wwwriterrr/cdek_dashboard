import type { BookDto, OrderDto } from "../types/api";
import type { Book, Customer, Order, OrderStatus, PayStatus } from "../types/domain";
import { ORDER_STATUSES } from "../types/domain";

/** Числовые поля приходят то числом, то строкой — приводим к одному виду. */
function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Пустая строка от бэка — это отсутствие значения, а не значение. */
function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toStatus(value: unknown): OrderStatus | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase();
  return (ORDER_STATUSES as readonly string[]).includes(code) ? (code as OrderStatus) : null;
}

function toPayStatus(value: unknown): PayStatus | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase();
  return code === "paid" || code === "not_paid" ? code : null;
}

function normalizeBook(dto: BookDto | null | undefined): Book {
  return {
    id: String(dto?.id ?? ""),
    name: toText(dto?.name) ?? "Без названия",
    author: toText(dto?.author),
    price: toNumber(dto?.price),
    thumbnail: toText(dto?.thumbnail),
    isbn: toText(dto?.isbn),
    authorUrl: toText(dto?.author_url),
    descr: toText(dto?.descr),
    width: toNumber(dto?.width),
    height: toNumber(dto?.height),
    length: toNumber(dto?.length),
    weight: toNumber(dto?.weight),
  };
}

/**
 * Данные получателя бэк отдаёт плоскими полями. Если их вынесут в объект `user`,
 * читаем и оттуда — поэтому берём первое непустое значение.
 */
function normalizeCustomer(dto: OrderDto): Customer {
  return {
    name: toText(dto.name) ?? toText(dto.user?.name),
    phone: toText(dto.phone) ?? toText(dto.user?.phone),
    email: toText(dto.email) ?? toText(dto.user?.email),
    deliveryPoint: toText(dto.delivery_point),
    deliveryAddress: toText(dto.delivery_address),
  };
}

export function normalizeOrder(dto: OrderDto): Order {
  const book = normalizeBook(dto.book);
  const quantity = toNumber(dto.quantity) ?? 1;

  const backendTotal = toNumber(dto.total);
  const computedTotal = book.price === null ? null : book.price * quantity;
  const total = backendTotal ?? computedTotal;

  return {
    id: String(dto.id),
    dt: toNumber(dto.dt),
    book,
    quantity,
    cdekUuid: toText(dto.uuid),
    customer: normalizeCustomer(dto),
    status: toStatus(dto.status),
    statusRaw: toText(dto.status),
    payStatus: toPayStatus(dto.pay_status),
    total,
    totalIsComputed: backendTotal === null && computedTotal !== null,
  };
}

