import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  /** Строка под заголовком: чей это заказ. */
  meta?: ReactNode;
  /** Идёт запрос — окно не закрывается, иначе ответ потеряется. */
  busy?: boolean;
  wide?: boolean;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}

/**
 * Модальное окно на нативном <dialog>, а не попап у кнопки: таблица лежит
 * в контейнере с overflow-x, который обрезал бы всплывающий блок. Модальный
 * диалог рисуется поверх страницы, закрывается по Esc и держит фокус внутри.
 *
 * Монтируется только на время показа — так состояние внутри сбрасывается само.
 */
export function Modal({ title, meta, busy = false, wide = false, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className={wide ? "dialog dialog--wide" : "dialog"}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      // Клик по подложке: событие приходит на сам <dialog>, а не на его содержимое.
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) close();
      }}
    >
      <div className="dialog__body">
        <div className="dialog__head">
          <div>
            <h2 className="dialog__title" id={titleId}>
              {title}
            </h2>
            {meta && <p className="dialog__meta">{meta}</p>}
          </div>
          <button
            type="button"
            className="dialog__close"
            aria-label="Закрыть"
            disabled={busy}
            onClick={close}
          >
            ×
          </button>
        </div>
        {children(close)}
      </div>
    </dialog>
  );
}

/** «Заказ № 115, Иванов Иван» — подпись окна, привязанного к строке таблицы. */
export function OrderMeta({ id, name }: { id: string; name: string | null }) {
  return (
    <>
      Заказ <span className="cell__num">№&nbsp;{id}</span>
      {name && <>, {name}</>}
    </>
  );
}
