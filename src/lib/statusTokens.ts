import type { CSSProperties } from "react";
import type { OrderStatus, PayStatus } from "../types/domain";

/** Ключ в токенах CSS: in_work → in-work. */
function tokenKey(status: OrderStatus): string {
  return status.replace(/_/g, "-");
}

/** Цвет полосы по левому краю строки. Без статуса полосы нет. */
export function statusRailColor(status: OrderStatus | null): string {
  return status ? `var(--st-${tokenKey(status)}-rail)` : "transparent";
}

/** Пара цветов бейджа. Незнакомый статус получает нейтральную пару. */
export function statusVars(status: OrderStatus | null): CSSProperties {
  const key = status ? tokenKey(status) : "unknown";
  return {
    "--badge-fg": `var(--st-${key}-fg)`,
    "--badge-bg": `var(--st-${key}-bg)`,
  } as CSSProperties;
}

export function payVars(payStatus: PayStatus | null): CSSProperties {
  return {
    "--pay-dot": payStatus === "paid" ? "var(--pay-paid)" : "var(--pay-unpaid)",
  } as CSSProperties;
}
