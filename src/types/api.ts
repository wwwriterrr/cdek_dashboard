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

/**
 * `GET /api/v1/cdek/orders/<id>/` — заказ как его видит СДЭК.
 *
 * `data` — ответ API СДЭК «как есть», бэк его не перекладывает. Описаны
 * только поля, которые показывает панель; всё optional — СДЭК отдаёт поле,
 * когда у него есть значение (`delivery_date` — только у врученных,
 * `keep_free_until` — только у лежащих на ПВЗ).
 */
export interface CdekOrderInfoResponse {
  id: number | string;
  order_uuid: string;
  data?: CdekOrderDataDto | null;
}

export interface CdekOrderDataDto {
  entity?: CdekEntityDto | null;
  /** Запросы к СДЭК по заказу; у отклонённых `state: "INVALID"` и `errors`. */
  requests?: CdekRequestDto[] | null;
}

export interface CdekEntityDto {
  uuid?: string;
  cdek_number?: string | null;
  /** Номер заказа в ИМ. */
  number?: string | null;
  tariff_code?: number | null;
  shipment_point?: string | null;
  delivery_point?: string | null;
  delivery_recipient_cost?: { value?: number | null } | null;
  recipient?: {
    name?: string | null;
    email?: string | null;
    phones?: { number?: string | null }[] | null;
  } | null;
  from_location?: CdekLocationDto | null;
  to_location?: CdekLocationDto | null;
  services?: CdekServiceDto[] | null;
  packages?: CdekPackageDto[] | null;
  /** Новые сверху, но порядок не гарантирован — сортируем сами. */
  statuses?: CdekStatusDto[] | null;
  /** "2026-10-03" */
  planned_delivery_date?: string | null;
  /** "2026-09-29" — фактическая дата вручения. */
  delivery_date?: string | null;
  /** "2026-10-05T20:59:59Z" — до какого момента заказ бесплатно хранится на ПВЗ. */
  keep_free_until?: string | null;
  delivery_detail?: {
    delivery_sum?: number | null;
    total_sum?: number | null;
    delivery_vat_sum?: number | null;
  } | null;
}

export interface CdekLocationDto {
  city?: string | null;
  region?: string | null;
  address?: string | null;
}

export interface CdekServiceDto {
  code?: string | null;
  total_sum?: number | null;
}

export interface CdekPackageDto {
  /** Граммы. */
  weight?: number | null;
  /** Сантиметры. */
  length?: number | null;
  width?: number | null;
  height?: number | null;
  items?:
    | {
        name?: string | null;
        amount?: number | null;
        cost?: number | null;
        /** Наложенный платёж за единицу. */
        payment?: { value?: number | null } | null;
      }[]
    | null;
}

export interface CdekStatusDto {
  code?: string | null;
  name?: string | null;
  /** "2026-09-29T02:45:29+0000" */
  date_time?: string | null;
  city?: string | null;
  deleted?: boolean | null;
}

export interface CdekRequestDto {
  type?: string | null;
  state?: string | null;
  errors?: { code?: string | null; message?: string | null }[] | null;
}
