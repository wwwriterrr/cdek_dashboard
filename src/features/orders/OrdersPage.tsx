import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { describeError } from "../../api/baseApi";
import { useGetOrdersQuery, useUpdateOrderMutation } from "../../api/ordersApi";
import type { Session } from "../../api/authApi";
import { AuthGate } from "../auth/AuthGate";
import { ordersCountLabel } from "../../lib/format";
import { applyFilters, countByStatus, countPayStatus, countUnknownStatus } from "./filtering";
import { moreRequested } from "./ordersSlice";
import { OrdersTable } from "./OrdersTable";
import { OrdersToolbar } from "./OrdersToolbar";
import "./orders.css";

interface Props {
  session: Session;
}

export function OrdersPage({ session }: Props) {
  const dispatch = useAppDispatch();
  const ui = useAppSelector((state) => state.ordersUi);
  const { data, isLoading, isFetching, isError, error, refetch } = useGetOrdersQuery(ui.limit);
  const [patchOrder, patchState] = useUpdateOrderMutation();

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const visible = useMemo(() => applyFilters(orders, ui), [orders, ui]);

  const statusCounts = useMemo(() => countByStatus(orders), [orders]);
  const unknownCount = useMemo(() => countUnknownStatus(orders), [orders]);
  const paidCount = useMemo(() => countPayStatus(orders, "paid"), [orders]);
  const unpaidCount = useMemo(() => countPayStatus(orders, "not_paid"), [orders]);

  if (isError) {
    const { message, access } = describeError(error);
    // Доступ мог отвалиться уже после проверки сессии — например, у пользователя
    // отобрали staff. Показываем тот же экран, что и на входе, а не «повторить».
    if (access !== null) {
      return <AuthGate access={access} message={message} onRetry={() => void refetch()} />;
    }
    return (
      <div className="screen">
        <h2 className="screen__title">Не удалось загрузить заказы</h2>
        <p className="screen__text">{message}</p>
        <div className="screen__actions">
          <button type="button" className="btn btn--primary" onClick={() => void refetch()}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const filtersActive = ui.search !== "" || ui.statusFilter !== null || ui.payFilter !== null;
  const hasMore = data?.hasMore ?? false;

  const meta = isLoading
    ? "Загружаем список"
    : filtersActive
      ? `Показано ${visible.length} из ${ordersCountLabel(orders.length)}`
      : hasMore
        ? `Показаны последние ${ordersCountLabel(orders.length)}`
        : ordersCountLabel(orders.length);

  return (
    <>
      <div className="shell__head">
        <div>
          <h1 className="shell__title">Предзаказы</h1>
          <p className="shell__meta">{meta}</p>
        </div>
        <div className="shell__actions">
          <span className="whoami" title={`Вы вошли как ${session.username}`}>
            {session.avatar && (
              <img className="whoami__avatar" src={session.avatar} alt="" loading="lazy" />
            )}
            {session.displayName}
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching && <span className="btn__spinner" aria-hidden="true" />}
            {isFetching ? "Обновляем" : "Обновить"}
          </button>
        </div>
      </div>

      {patchState.isError && (
        <div className="notice" role="alert">
          {describeError(patchState.error).message} Значение вернулось к прежнему.
          <button type="button" className="notice__close" onClick={patchState.reset}>
            Скрыть
          </button>
        </div>
      )}

      <OrdersToolbar
        total={orders.length}
        statusCounts={statusCounts}
        unknownCount={unknownCount}
        paidCount={paidCount}
        unpaidCount={unpaidCount}
      />

      <OrdersTable
        orders={visible}
        loading={isLoading}
        totalCount={orders.length}
        busyId={patchState.isLoading ? (patchState.originalArgs?.id ?? null) : null}
        onPatch={(patch) => void patchOrder(patch)}
      />

      {hasMore && (
        <div className="table-foot">
          <span>
            Показаны последние {orders.length}. В базе есть более ранние заказы.
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => dispatch(moreRequested())}
            disabled={isFetching}
          >
            {isFetching && <span className="btn__spinner" aria-hidden="true" />}
            {isFetching ? "Загружаем" : "Показать ещё"}
          </button>
        </div>
      )}
    </>
  );
}
