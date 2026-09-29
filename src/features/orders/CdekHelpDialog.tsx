import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { describeCdekError } from "../../api/baseApi";
import { useLinkCdekOrderMutation } from "../../api/ordersApi";
import { Modal, OrderMeta } from "../../components/Modal";
import type { Order } from "../../types/domain";

interface Props {
  order: Order;
  onClose: () => void;
}

/**
 * Пояснение к кнопке «Создать заказ в СДЭК» и привязка заказа, созданного
 * вручную в ЛК СДЭК.
 */
export function CdekHelpDialog({ order, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [linking, setLinking] = useState(false);
  const [value, setValue] = useState("");
  const [linkOrder, { isLoading, isError, error, reset }] = useLinkCdekOrderMutation();

  useEffect(() => {
    if (linking) inputRef.current?.focus();
  }, [linking]);

  const orderUuid = value.trim();

  async function handleSubmit(event: FormEvent, close: () => void) {
    event.preventDefault();
    if (orderUuid === "" || isLoading) return;
    try {
      await linkOrder({ id: order.id, orderUuid }).unwrap();
      close();
    } catch {
      // Текст ошибки берём из состояния мутации, см. ниже.
    }
  }

  return (
    <Modal
      title="Создание заказа в СДЭК"
      meta={<OrderMeta id={order.id} name={order.customer.name} />}
      busy={isLoading}
      onClose={onClose}
    >
      {(close) => (
        <>
          <p className="dialog__text">
            По нажатию на кнопку «Создать заказ в СДЭК» будет выполнено автоматическое создание
            заказа в системе СДЭК. Получатель заказа получит уведомление о созданном заказе. Заказ
            можно будет увидеть и отредактировать в личном кабинете СДЭК.
          </p>
          <p className="dialog__warning">
            Не нажимайте эту кнопку, если вы уже создали заказ сами через ЛК СДЭК.
          </p>

          <div className="dialog__section">
            <h3 className="dialog__subtitle">Заказ уже создан?</h3>

            {!linking ? (
              <button type="button" className="btn" onClick={() => setLinking(true)}>
                Привязать номер заказа
              </button>
            ) : (
              <form className="link-form" onSubmit={(event) => void handleSubmit(event, close)}>
                <label className="link-form__label" htmlFor={inputId}>
                  Номер заказа в СДЭК
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  className="link-form__input"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="UUID, номер ИМ или номер СДЭК"
                  value={value}
                  disabled={isLoading}
                  aria-invalid={isError}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (isError) reset();
                  }}
                />
                {isError && (
                  <p className="link-form__error" role="alert">
                    {describeCdekError(error)}
                  </p>
                )}
                <div className="link-form__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={isLoading}
                    onClick={() => {
                      setLinking(false);
                      setValue("");
                      reset();
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={orderUuid === "" || isLoading}
                  >
                    {isLoading && <span className="btn__spinner" aria-hidden="true" />}
                    {isLoading ? "Привязываем…" : "Привязать"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
