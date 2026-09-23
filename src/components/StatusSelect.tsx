import { statusVars } from "../lib/statusTokens";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "../types/domain";

interface Props {
  status: OrderStatus | null;
  /** Код от бэка, если он не входит в известный список. */
  raw: string | null;
  disabled: boolean;
  onChange: (status: OrderStatus) => void;
}

/**
 * Нативный <select>, стилизованный под бейдж.
 *
 * Не своё выпадающее меню: таблица лежит в контейнере с overflow-x, который
 * обрезал бы абсолютно позиционированный список. Нативный список рисуется
 * поверх страницы, работает с клавиатуры и на телефоне — без нашего кода.
 * Цвет статуса при этом остаётся на самом бейдже, а это главный сигнал.
 */
export function StatusSelect({ status, raw, disabled, onChange }: Props) {
  return (
    <span className="pill" style={statusVars(status)}>
      <select
        className="pill__select"
        value={status ?? ""}
        disabled={disabled}
        aria-label="Статус заказа"
        onChange={(event) => onChange(event.target.value as OrderStatus)}
      >
        {/* Нечего выбрать «обратно», если статуса ещё нет или он незнакомый —
            держим текущее значение видимым, но невыбираемым. */}
        {!status && (
          <option value="" disabled>
            {raw ?? "—"}
          </option>
        )}
        {ORDER_STATUSES.map((code) => (
          <option key={code} value={code}>
            {ORDER_STATUS_LABELS[code]}
          </option>
        ))}
      </select>
      <span className="pill__caret" aria-hidden="true">
        ▾
      </span>
    </span>
  );
}
