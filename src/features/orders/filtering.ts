import type { Order, PayStatus, SortDirection, SortField } from "../../types/domain";
import type { OrdersUiState } from "./ordersSlice";
import type { StatusCount } from "./OrdersToolbar";
import { ORDER_STATUSES } from "../../types/domain";

/** Поля, по которым ищем. Телефон дополнительно сводим к цифрам. */
function searchHaystack(order: Order): string {
  return [
    order.id,
    order.cdekUuid,
    order.customer.name,
    order.customer.email,
    order.customer.phone,
    order.customer.phone?.replace(/\D/g, ""),
    order.customer.deliveryPoint,
    order.customer.deliveryAddress,
    order.book.name,
    order.book.author,
    order.book.isbn,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function compare(a: Order, b: Order, field: SortField): number {
  switch (field) {
    case "dt":
      return (a.dt ?? 0) - (b.dt ?? 0);
    case "total":
      return (a.total ?? 0) - (b.total ?? 0);
    case "id":
      // Номера числовые, но тип допускает строки — сравниваем устойчиво.
      return (
        Number(a.id) - Number(b.id) ||
        a.id.localeCompare(b.id, "ru", { numeric: true })
      );
  }
}

export function applyFilters(orders: Order[], ui: OrdersUiState): Order[] {
  const query = ui.search.trim().toLowerCase();
  const queryDigits = query.replace(/\D/g, "");

  const filtered = orders.filter((order) => {
    if (ui.statusFilter === "unknown" && order.status !== null) return false;
    if (ui.statusFilter !== null && ui.statusFilter !== "unknown" && order.status !== ui.statusFilter) {
      return false;
    }
    if (ui.payFilter !== null && order.payStatus !== ui.payFilter) return false;

    if (query === "") return true;
    const haystack = searchHaystack(order);
    // Запрос из одних цифр («9135») должен находить телефон с любым форматированием.
    return haystack.includes(query) || (queryDigits.length >= 3 && haystack.includes(queryDigits));
  });

  const direction: SortDirection = ui.sortDirection;
  const sign = direction === "asc" ? 1 : -1;
  return filtered.sort((a, b) => sign * compare(a, b, ui.sortField));
}

/**
 * Возвращает все семь статусов, включая нулевые. Пустой статус — тоже
 * информация: администратор видит полный словарь состояний, а не только те,
 * что случайно оказались в текущей выдаче.
 */
export function countByStatus(orders: Order[]): StatusCount[] {
  return ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  }));
}

export function countUnknownStatus(orders: Order[]): number {
  return orders.filter((order) => order.status === null).length;
}

export function countPayStatus(orders: Order[], payStatus: PayStatus): number {
  return orders.filter((order) => order.payStatus === payStatus).length;
}
