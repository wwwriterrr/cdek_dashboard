/** Доменные типы, с которыми работает интерфейс. */

export const ORDER_STATUSES = [
  "new",
  "in_work",
  "processed",
  "reserved",
  "completed",
  "rejected",
  "lost",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  in_work: "В работе",
  processed: "Отработан",
  reserved: "Бронь",
  completed: "Выполнен",
  rejected: "Отказ",
  lost: "Товар потерян",
};

export type PayStatus = "paid" | "not_paid";

export const PAY_STATUS_LABELS: Record<PayStatus, string> = {
  paid: "Оплачен",
  not_paid: "Не оплачен",
};

export interface Book {
  id: string;
  name: string;
  author: string | null;
  price: number | null;
  thumbnail: string | null;
  isbn: string | null;
  authorUrl: string | null;
  descr: string | null;
  /** Габариты в сантиметрах, вес в граммах. */
  width: number | null;
  height: number | null;
  length: number | null;
  weight: number | null;
}

export interface Customer {
  name: string | null;
  phone: string | null;
  email: string | null;
  deliveryPoint: string | null;
  deliveryAddress: string | null;
}

export interface Order {
  id: string;
  /** Миллисекунды UTC либо null, если бэк прислал мусор. */
  dt: number | null;
  book: Book;
  quantity: number;
  cdekUuid: string | null;
  customer: Customer;
  /** null, пока бэк не отдаёт статус. */
  status: OrderStatus | null;
  /** Код статуса как пришёл — чтобы показать неизвестное значение, а не скрыть. */
  statusRaw: string | null;
  payStatus: PayStatus | null;
  /** Сумма платежа: total от бэка либо price × quantity. null, если цены нет. */
  total: number | null;
  /** true, если сумму посчитал фронт, а не бэк. */
  totalIsComputed: boolean;
}

export type SortField = "id" | "dt" | "total";
export type SortDirection = "asc" | "desc";
