import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { readCsrfToken } from "../lib/csrf";

/**
 * Панель живёт на том же домене, что и Django, поэтому базовый путь
 * относительный, а сессионная кука едет автоматически с credentials: "include".
 * В режиме разработки /api проксируется на боевой бэк, см. vite.config.ts.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/v1/",
    credentials: "include",
    prepareHeaders: (headers, { type }) => {
      headers.set("Accept", "application/json");
      if (type === "mutation") {
        const token = readCsrfToken();
        if (token) headers.set("X-CSRFToken", token);
      }
      return headers;
    },
  }),
  tagTypes: ["Session", "Orders"],
  endpoints: () => ({}),
});

/**
 * Вид отказа в доступе.
 *
 * Бэк отвечает 403 и когда пользователь не вошёл, и когда вошёл, но у него нет
 * staff-статуса. Различить их можно только по тексту `detail` от DRF — а сказать
 * администратору надо разное: в первом случае «войдите», во втором «войти можно,
 * но прав всё равно не хватит».
 */
export type AccessProblem = "unauthenticated" | "forbidden";

/** Формулировки DRF для «вы не представились». Локаль бэка может меняться. */
const UNAUTHENTICATED_MARKERS = [
  "authentication credentials were not provided",
  "учетные данные не были предоставлены",
  "учётные данные не были предоставлены",
];

function classifyAccess(detail: string | null): AccessProblem {
  if (!detail) return "unauthenticated";
  const text = detail.toLowerCase();
  // По умолчанию считаем, что пользователь не вошёл: этот экран предлагает вход,
  // и он же выручит того, кто просто зашёл не под той учётной записью.
  return UNAUTHENTICATED_MARKERS.some((marker) => text.includes(marker))
    ? "unauthenticated"
    : "forbidden";
}

export interface ErrorInfo {
  message: string;
  /** null, если проблема не в доступе. */
  access: AccessProblem | null;
}

/**
 * Бэк отвечает об ошибках в трёх разных формах:
 *   {"detail": "..."}                        — DRF, авторизация и права
 *   {"error": "Order does not exist"}        — 404
 *   {"field": "status", "error": "..."}      — отклонённое значение
 */
function readErrorBody(data: unknown): { text: string | null; field: string | null } {
  if (typeof data !== "object" || data === null) return { text: null, field: null };
  const record = data as Record<string, unknown>;
  const text =
    typeof record.detail === "string"
      ? record.detail
      : typeof record.error === "string"
        ? record.error
        : null;
  return { text, field: typeof record.field === "string" ? record.field : null };
}

/** Разбирает ошибку RTK Query в сообщение, которое не стыдно показать. */
export function describeError(error: unknown): ErrorInfo {
  if (typeof error === "object" && error !== null && "status" in error) {
    const { status, data } = error as { status: number | string; data?: unknown };
    const { text: detail, field } = readErrorBody(data);

    // Отклонённое значение бэк отдаёт с кодом 500, хотя по смыслу это 400.
    // Проверяем раньше кода ответа, иначе покажем «ошибка на сервере».
    if (field) {
      return { message: `Сервер не принял новое значение поля «${field}».`, access: null };
    }
    if (status === 404) {
      return { message: "Заказ не найден. Возможно, его удалили — обновите список.", access: null };
    }

    if (status === 401 || status === 403) {
      const access = status === 401 ? "unauthenticated" : classifyAccess(detail);
      return {
        message: detail ?? "Нет доступа к панели предзаказов.",
        access,
      };
    }
    if (status === "FETCH_ERROR") {
      return { message: "Сервер не отвечает. Проверьте соединение и повторите.", access: null };
    }
    if (status === "PARSING_ERROR") {
      return {
        message: "Сервер вернул не JSON. Похоже, вместо данных пришла страница входа.",
        access: null,
      };
    }
    if (typeof status === "number" && status >= 500) {
      return { message: `Ошибка на сервере (${status}). Повторите через минуту.`, access: null };
    }
    return { message: detail ?? `Запрос не прошёл (${status}).`, access: null };
  }
  return { message: "Не удалось загрузить данные.", access: null };
}
