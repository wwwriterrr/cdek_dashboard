import { baseApi } from "./baseApi";
import type { SessionSelfResponse } from "../types/api";

export interface Session {
  id: string;
  /** Что показывать в шапке: name, если бэк его дал, иначе username. */
  displayName: string;
  username: string;
  avatar: string | null;
  isStaff: boolean;
  groups: string[];
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Проверяет и вход, и права разом. Без сессии отвечает 403 — разбор отказа
     * в describeError. Устаревший `users/session/verify/` отдавал только
     * `{"msg":"ok"}` и признака прав не давал.
     */
    verifySession: build.query<Session, void>({
      query: () => "users/session/self/",
      transformResponse: (response: SessionSelfResponse): Session => {
        const username = text(response.username) ?? "";
        return {
          id: String(response.id ?? ""),
          displayName: text(response.name) ?? username ?? "Администратор",
          username,
          avatar: text(response.avatar),
          // Права только по явному true. Нет флага — нет и прав: это первый
          // барьер, второй — 403 от бэка на сами данные.
          isStaff: response.is_staff === true,
          groups: Array.isArray(response.groups) ? response.groups : [],
        };
      },
      providesTags: ["Session"],
    }),
  }),
});

export const { useVerifySessionQuery } = authApi;
