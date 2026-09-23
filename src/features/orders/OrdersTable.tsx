import { useAppDispatch, useAppSelector } from "../../app/hooks";
import type { OrderPatch } from "../../api/ordersApi";
import type { Order, SortField } from "../../types/domain";
import { OrderRow } from "./OrderRow";
import { filtersReset, sortRequested } from "./ordersSlice";

const COLUMN_COUNT = 8;

interface HeaderProps {
  label: string;
  field?: SortField;
  className?: string;
}

function SortableHeader({ label, field, className }: HeaderProps) {
  const dispatch = useAppDispatch();
  const { sortField, sortDirection } = useAppSelector((state) => state.ordersUi);

  if (!field) {
    return <th className={className}>{label}</th>;
  }

  const active = sortField === field;
  const ariaSort = active ? (sortDirection === "asc" ? "ascending" : "descending") : "none";

  return (
    <th className={className} aria-sort={ariaSort}>
      <button
        type="button"
        className="orders__sort"
        aria-sort={ariaSort}
        onClick={() => dispatch(sortRequested(field))}
      >
        {label}
        <span className="orders__sort-mark" aria-hidden="true">
          {active ? (sortDirection === "asc" ? "▲" : "▼") : "◆"}
        </span>
      </button>
    </th>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }, (_, index) => (
        <tr className="row" key={index}>
          {Array.from({ length: COLUMN_COUNT }, (__, cell) => (
            <td key={cell}>
              <span className="skeleton" />
              {cell < 5 && <span className="skeleton" />}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface Props {
  orders: Order[];
  loading: boolean;
  /** Всего заказов до фильтрации — чтобы отличить «пусто» от «ничего не нашлось». */
  totalCount: number;
  /** id строки, по которой сейчас идёт PATCH. */
  busyId: string | null;
  onPatch: (patch: OrderPatch) => void;
}

export function OrdersTable({ orders, loading, totalCount, busyId, onPatch }: Props) {
  const dispatch = useAppDispatch();

  return (
    <div className="table-frame">
      <table className="orders">
        <colgroup>
          <col style={{ width: "108px" }} />
          {/* Клиент тянется: самое длинное поле таблицы — адрес доставки. */}
          <col />
          <col style={{ width: "300px" }} />
          <col style={{ width: "116px" }} />
          <col style={{ width: "140px" }} />
          <col style={{ width: "130px" }} />
          <col style={{ width: "128px" }} />
          <col style={{ width: "96px" }} />
        </colgroup>
        <thead>
          <tr>
            <SortableHeader label="Номер заказа" field="id" />
            <SortableHeader label="Данные клиента" />
            <SortableHeader label="Книга" />
            <SortableHeader label="Дата заказа" field="dt" />
            <SortableHeader label="Сумма платежа" field="total" className="cell--money" />
            <SortableHeader label="Статус" />
            <SortableHeader label="Статус оплаты" />
            <SortableHeader label="Действия" className="cell--actions" />
          </tr>
        </thead>
        <tbody>
          {loading && <SkeletonRows />}

          {!loading &&
            orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                busy={busyId === order.id}
                onPatch={onPatch}
              />
            ))}

          {!loading && orders.length === 0 && (
            <tr>
              <td colSpan={COLUMN_COUNT}>
                {totalCount === 0 ? (
                  <div className="empty">
                    <p className="empty__title">Предзаказов пока нет</p>
                    <p className="empty__text">
                      Как только читатель оформит предзаказ, он появится в этой таблице.
                    </p>
                  </div>
                ) : (
                  <div className="empty">
                    <p className="empty__title">Ничего не нашлось</p>
                    <p className="empty__text">
                      Под выбранные условия не подходит ни один из {totalCount} заказов.
                    </p>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => dispatch(filtersReset())}
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
