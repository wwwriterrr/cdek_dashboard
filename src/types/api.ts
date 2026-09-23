/**
 * Контракты бэкенда «как есть».
 *
 * Сняты с боевого API 2026-09-19. Типы намеренно терпимые (nullable, union
 * number | string) — сериализатор ещё меняется, и панель не должна падать
 * из-за неожиданной формы поля. Приведение к удобному виду — в lib/normalize.ts.
 */

export interface BookDto {
  id: number | string;
  name: string;
  descr?: string | null;
  /** Путь от корня сайта: "/media/post_images/....png" */
  thumbnail?: string | null;
  price?: number | string | null;
  author?: string | null;
  isbn?: string | null;
  author_url?: string | null;
  /** Габариты в сантиметрах. */
  width?: number | string | null;
  height?: number | string | null;
  length?: number | string | null;
  /** Вес в граммах. */
  weight?: number | string | null;
}

export interface OrderUserDto {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface OrderDto {
  id: number | string;
  /** int(order.date.strftime("%s")) * 1000 — миллисекунды UTC. */
  dt: number;
  book: BookDto;
  quantity: number;
  /** order_uuid в системе СДЭК. Сейчас приходит null у всех заказов. */
  uuid?: string | null;

  // Данные получателя — плоскими полями рядом с заказом.
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Код пункта выдачи СДЭК, например "KSK12". */
  delivery_point?: string | null;
  delivery_address?: string | null;

  // Поля, которых эндпоинт пока не отдаёт. Описаны заранее, чтобы при их
  // появлении не переделывать таблицу. См. SPEC.md, раздел 5.3.
  status?: string | null;
  pay_status?: string | null;
  total?: number | string | null;
  user?: OrderUserDto | null;
}

export interface OrdersResponse {
  orders: OrderDto[];
  /** true — за пределами `limit` есть ещё заказы. */
  after?: boolean | null;
}

/** `GET /api/v1/users/session/self/` — кто вошёл и есть ли у него права. */
export interface SessionSelfResponse {
  id: number | string;
  /** Отображаемое имя. Может отсутствовать — тогда показываем username. */
  name?: string | null;
  /** Путь от корня сайта: "/media/avatars/….jpg" */
  avatar?: string | null;
  is_staff: boolean;
  username: string;
  groups?: string[] | null;
}
