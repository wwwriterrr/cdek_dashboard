import type { ReactNode } from "react";
import { Modal, OrderMeta } from "../../components/Modal";
import { formatBookSpecs, formatMoney, formatPhone } from "../../lib/format";
import type { Order } from "../../types/domain";

interface Props {
  order: Order;
  /** Запрос в полёте — окно не закрывается, кнопки заперты. */
  pending: boolean;
  /** Текст ошибки последней попытки либо null. */
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Строка сводки; пустое значение подсвечиваем — СДЭК может его не принять. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cdek-info__fact">
      <dt>{label}</dt>
      <dd>{children ?? <span className="confirm__missing">не указано</span>}</dd>
    </div>
  );
}

/**
 * Подтверждение перед созданием заказа в СДЭК. Действие необратимо из панели
 * и шлёт получателю уведомление, поэтому одного клика по кнопке в строке мало.
 *
 * Показываем данные позиции, которые бэк отправит в СДЭК, — чтобы администратор
 * сверил получателя и ПВЗ до отправки, а не после.
 */
export function CdekConfirmDialog({ order, pending, error, onConfirm, onClose }: Props) {
  const { customer, book } = order;
  const phone = formatPhone(customer.phone);
  const specs = formatBookSpecs(book);

  return (
    <Modal
      title="Создать заказ в СДЭК?"
      meta={<OrderMeta id={order.id} name={customer.name} />}
      busy={pending}
      onClose={onClose}
    >
      {(close) => (
        <>
          <p className="dialog__warning">
            В СДЭК будет создан заказ с данными, указанными в этой позиции. Получатель получит
            уведомление о заказе. Проверьте данные перед отправкой.
          </p>

          <dl className="cdek-info__facts confirm__facts">
            <Field label="Получатель">{customer.name}</Field>
            <Field label="Телефон">{phone}</Field>
            <Field label="Email">{customer.email}</Field>
            <Field label="Пункт выдачи">
              {customer.deliveryPoint || customer.deliveryAddress ? (
                <>
                  {customer.deliveryPoint && (
                    <span className="tag">ПВЗ {customer.deliveryPoint}</span>
                  )}{" "}
                  {customer.deliveryAddress}
                </>
              ) : null}
            </Field>
            <Field label="Книга">
              <span className="cdek-info__line">
                {book.name} × {order.quantity}
              </span>
              {book.author && (
                <span className="cdek-info__line cdek-info__muted">{book.author}</span>
              )}
            </Field>
            <Field label="Вес и габариты">{specs}</Field>
            <Field label="Сумма">{order.total === null ? null : formatMoney(order.total)}</Field>
          </dl>

          {error && (
            <p className="confirm__error" role="alert">
              {error}
            </p>
          )}

          <div className="link-form__actions confirm__actions">
            <button type="button" className="btn btn--ghost" disabled={pending} onClick={close}>
              Отмена
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending && <span className="btn__spinner" aria-hidden="true" />}
              {pending ? "Создаём…" : error ? "Повторить" : "Создать заказ"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
