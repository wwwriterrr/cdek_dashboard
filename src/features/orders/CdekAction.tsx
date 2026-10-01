import { useState } from "react";
import { describeCdekError } from "../../api/baseApi";
import { useCreateCdekOrderMutation } from "../../api/ordersApi";
import type { Order } from "../../types/domain";
import { CdekConfirmDialog } from "./CdekConfirmDialog";
import { CdekHelpDialog } from "./CdekHelpDialog";
import { CdekInfoDialog } from "./CdekInfoDialog";

interface Props {
  order: Order;
}

/**
 * Ячейка «Действия»: заказ уже в СДЭК — показываем его uuid и кнопку сведений
 * о нём, ещё нет — кнопку создания. Создание идёт только через окно
 * подтверждения. У каждой строки своя мутация, поэтому ожидание и ошибка
 * остаются в своей строке и не мешают работать с соседними.
 */
export function CdekAction({ order }: Props) {
  const [createOrder, { isLoading, isError, isSuccess, error, reset }] =
    useCreateCdekOrderMutation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function confirmCreate() {
    try {
      await createOrder(order.id).unwrap();
      // Пришёл uuid — строка сама сменится на номер; не пришёл — строка
      // покажет предупреждение. В обоих случаях окну больше нечего сказать.
      setConfirmOpen(false);
    } catch {
      // Окно остаётся открытым и показывает ошибку — можно повторить.
    }
  }

  if (order.cdekUuid) {
    return (
      <div className="cdek">
        <span className="cdek__label">Заказ в СДЭК</span>
        <span className="cdek__uuid" title="Идентификатор заказа в СДЭК">
          {order.cdekUuid}
        </span>
        <button type="button" className="btn cdek__create" onClick={() => setInfoOpen(true)}>
          Информация о заказе в СДЭК
        </button>
        {infoOpen && <CdekInfoDialog order={order} onClose={() => setInfoOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="cdek">
      <div className="cdek__row">
        <button
          type="button"
          className="cdek__help"
          aria-label="Что произойдёт при создании заказа в СДЭК"
          title="Что произойдёт при создании заказа"
          onClick={() => setHelpOpen(true)}
        >
          ?
        </button>
        <button
          type="button"
          className="btn cdek__create"
          disabled={isLoading}
          onClick={() => {
            reset();
            setConfirmOpen(true);
          }}
        >
          {isLoading ? (
            <span className="btn__spinner" aria-hidden="true" />
          ) : (
            <svg className="cdek__icon" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 3.5v9M3.5 8h9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          )}
          {isLoading ? "Создаём…" : "Создать заказ в СДЭК"}
        </button>
      </div>
      {isError && !confirmOpen && (
        <p className="cdek__error" role="alert">
          {describeCdekError(error)}
        </p>
      )}
      {/* Успех без uuid: заказ в СДЭК, скорее всего, создан — повторное нажатие
          могло бы завести второй. Просим обновить список, а не жать снова. */}
      {isSuccess && (
        <p className="cdek__error" role="alert">
          СДЭК принял заказ, но номер не пришёл. Обновите список, прежде чем создавать заново.
        </p>
      )}
      {helpOpen && <CdekHelpDialog order={order} onClose={() => setHelpOpen(false)} />}
      {confirmOpen && (
        <CdekConfirmDialog
          order={order}
          pending={isLoading}
          error={isError ? describeCdekError(error) : null}
          onConfirm={() => void confirmCreate()}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
