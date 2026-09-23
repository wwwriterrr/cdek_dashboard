import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { ORDER_STATUS_LABELS, type OrderStatus, type PayStatus } from "../../types/domain";
import { payFilterChanged, searchChanged, statusFilterChanged } from "./ordersSlice";

export interface StatusCount {
  status: OrderStatus;
  count: number;
}

interface Props {
  total: number;
  statusCounts: StatusCount[];
  unknownCount: number;
  paidCount: number;
  unpaidCount: number;
}

export function OrdersToolbar({ total, statusCounts, unknownCount, paidCount, unpaidCount }: Props) {
  const dispatch = useAppDispatch();
  const { search, statusFilter, payFilter } = useAppSelector((state) => state.ordersUi);

  const payOptions: Array<{ value: PayStatus | null; label: string; count: number | null }> = [
    { value: null, label: "Любой", count: null },
    { value: "paid", label: "Оплачен", count: paidCount },
    { value: "not_paid", label: "Не оплачен", count: unpaidCount },
  ];

  return (
    <div className="toolbar">
      <div className="chips" role="group" aria-label="Фильтр по статусу заказа">
        <button
          type="button"
          className="chip"
          aria-pressed={statusFilter === null}
          onClick={() => dispatch(statusFilterChanged(null))}
        >
          Все
          <span className="chip__count">{total}</span>
        </button>

        {/* Статусы показываем все семь, даже пустые: так видно словарь состояний
            целиком. Пустые не нажимаются — фильтровать нечего. */}
        {statusCounts.map(({ status, count }) => (
          <button
            key={status}
            type="button"
            className="chip"
            aria-pressed={statusFilter === status}
            disabled={count === 0 && statusFilter !== status}
            onClick={() => dispatch(statusFilterChanged(statusFilter === status ? null : status))}
          >
            {ORDER_STATUS_LABELS[status]}
            <span className="chip__count">{count}</span>
          </button>
        ))}

        {unknownCount > 0 && (
          <button
            type="button"
            className="chip"
            aria-pressed={statusFilter === "unknown"}
            onClick={() =>
              dispatch(statusFilterChanged(statusFilter === "unknown" ? null : "unknown"))
            }
            title="Бэкенд ещё не проставил статус этим заказам"
          >
            Без статуса
            <span className="chip__count">{unknownCount}</span>
          </button>
        )}
      </div>

      <div className="toolbar__row">
        <div className="filter-group">
          <span className="filter-group__label" id="pay-filter-label">
            Оплата
          </span>
          <div className="segmented" role="group" aria-labelledby="pay-filter-label">
            {payOptions.map(({ value, label, count }) => (
              <button
                key={label}
                type="button"
                className="segmented__item"
                aria-pressed={payFilter === value}
                onClick={() => dispatch(payFilterChanged(value))}
              >
                {label}
                {count !== null && <span className="chip__count">{count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="search">
          <label className="visually-hidden" htmlFor="orders-search">
            Поиск по заказам
          </label>
          <input
            id="orders-search"
            className="search__input"
            type="search"
            value={search}
            placeholder="Номер, клиент, телефон, книга"
            onChange={(event) => dispatch(searchChanged(event.target.value))}
          />
          {search && (
            <button
              type="button"
              className="search__clear"
              aria-label="Очистить поиск"
              onClick={() => dispatch(searchChanged(""))}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
