import { payVars } from "../lib/statusTokens";
import { PAY_STATUS_LABELS, type PayStatus } from "../types/domain";

const PAY_STATUSES: PayStatus[] = ["paid", "not_paid"];

interface Props {
  payStatus: PayStatus | null;
  disabled: boolean;
  onChange: (payStatus: PayStatus) => void;
}

/** Тот же приём, что и у статуса заказа, но визуально легче: точка вместо плашки. */
export function PaySelect({ payStatus, disabled, onChange }: Props) {
  return (
    <span className={`pill pill--pay${payStatus ? ` pay--${payStatus}` : ""}`} style={payVars(payStatus)}>
      <span className="pill__dot" aria-hidden="true" />
      <select
        className="pill__select pill__select--pay"
        value={payStatus ?? ""}
        disabled={disabled}
        aria-label="Статус оплаты"
        onChange={(event) => onChange(event.target.value as PayStatus)}
      >
        {!payStatus && (
          <option value="" disabled>
            —
          </option>
        )}
        {PAY_STATUSES.map((code) => (
          <option key={code} value={code}>
            {PAY_STATUS_LABELS[code]}
          </option>
        ))}
      </select>
      <span className="pill__caret" aria-hidden="true">
        ▾
      </span>
    </span>
  );
}
