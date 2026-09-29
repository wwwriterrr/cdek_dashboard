import { baseApi } from "./baseApi";
import { normalizeOrder } from "../lib/normalize";
import { normalizeCdekInfo } from "../lib/cdekInfo";
import type { CdekInfo } from "../lib/cdekInfo";
import type { CdekOrderInfoResponse, OrderDto, OrdersResponse } from "../types/api";
import type { Order, OrderStatus, PayStatus } from "../types/domain";

/** Умолчание бэка. Держим то же число, чтобы первый запрос был обычным. */
export const DEFAULT_LIMIT = 40;

/** На сколько увеличивать выдачу по кнопке «Показать ещё». */
export const LIMIT_STEP = 40;

export interface OrdersResult {
  orders: Order[];
  /** За пределами выдачи есть ещё заказы. */
  hasMore: boolean;
}

export interface OrderPatch {
  id: string;
  status?: OrderStatus;
  payStatus?: PayStatus;
}

export interface CdekOrderResult {
  /** order_uuid созданного заказа в СДЭК. null — бэк ответил успехом, но без uuid. */
  uuid: string | null;
}

export interface CdekLink {
  id: string;
  /** uuid, номер ИМ или номер заказа СДЭК — непустая строка. */
  orderUuid: string;
}

/**
 * serializeQueryArgs у getOrders схлопывает аргумент, поэтому запись кэша
 * одна на все лимиты — для доступа к ней подойдёт любое значение.
 */
const ANY_LIMIT = 0;

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Бэк не отдаёт курсор — только `limit`, обрезающий список сверху, и флаг
     * `after`. Поэтому «следующая страница» — это тот же запрос с бо́льшим
     * лимитом, а не дозагрузка хвоста.
     *
     * serializeQueryArgs + merge держат всё в одной записи кэша: при росте
     * лимита таблица не мигает скелетонами, а просто дополняется.
     */
    getOrders: build.query<OrdersResult, number>({
      query: (limit) => ({ url: "cdek/orders/", params: { limit } }),
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (_current, incoming) => incoming,
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
      transformResponse: (response: OrdersResponse | unknown): OrdersResult => {
        // Бэк отдаёт {orders, after}, но раньше отдавал голый массив —
        // принимаем обе формы, чтобы панель пережила откат сериализатора.
        const list = Array.isArray(response)
          ? response
          : ((response as OrdersResponse)?.orders ?? []);
        const after = Array.isArray(response) ? false : (response as OrdersResponse)?.after;

        return {
          orders: list.map(normalizeOrder),
          hasMore: after === true,
        };
      },
      providesTags: ["Orders"],
    }),

    /**
     * Смена статуса или статуса оплаты.
     *
     * Значение подставляется в таблицу сразу, до ответа сервера: администратор
     * проходит список подряд, и ждать круга по сети на каждой строке незачем.
     * Если бэк откажет, правка откатывается, а ошибка показывается сверху.
     */
    updateOrder: build.mutation<Order | null, OrderPatch>({
      query: ({ id, status, payStatus }) => ({
        url: `cdek/orders/${id}/`,
        method: "PATCH",
        body: {
          ...(status !== undefined && { status }),
          ...(payStatus !== undefined && { pay_status: payStatus }),
        },
      }),
      // Раньше PATCH отвечал {"msg":"ok"}, теперь — заказом целиком.
      // Принимаем обе формы: null означает «сервер подтвердил, но данных не дал».
      transformResponse: (response: OrderDto | { msg?: string } | null): Order | null =>
        response && typeof response === "object" && "id" in response
          ? normalizeOrder(response as OrderDto)
          : null,
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const rollback = dispatch(
          ordersApi.util.updateQueryData("getOrders", ANY_LIMIT, (draft) => {
            const order = draft.orders.find((item) => item.id === patch.id);
            if (!order) return;
            if (patch.status !== undefined) {
              order.status = patch.status;
              order.statusRaw = patch.status;
            }
            if (patch.payStatus !== undefined) order.payStatus = patch.payStatus;
          }),
        );

        try {
          const { data } = await queryFulfilled;
          if (!data) return;
          // Сервер прислал заказ целиком — кладём его как есть: вдруг вместе
          // со статусом он поменял что-то ещё.
          dispatch(
            ordersApi.util.updateQueryData("getOrders", ANY_LIMIT, (draft) => {
              const index = draft.orders.findIndex((item) => item.id === data.id);
              if (index !== -1) draft.orders[index] = data;
            }),
          );
        } catch {
          rollback.undo();
        }
      },
    }),

    /**
     * Создание заказа в СДЭК. Бэк сам собирает данные заказа, отправляет их
     * в API СДЭК и отвечает {"msg": "ok", "uuid": "..."}.
     *
     * Здесь никакого оптимизма: пока СДЭК не подтвердил, заказа там нет.
     * Полученный uuid и статус «в работе», который бэк ставит заодно, кладём
     * в строку, чтобы она обновилась без перезапроса всего списка.
     */
    createCdekOrder: build.mutation<CdekOrderResult, string>({
      query: (id) => ({ url: `cdek/orders/${id}/`, method: "POST" }),
      transformResponse: (response: { msg?: string; uuid?: unknown } | null) => ({
        uuid:
          typeof response?.uuid === "string" && response.uuid.trim() !== ""
            ? response.uuid.trim()
            : null,
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (!data.uuid) return;
          const uuid = data.uuid;
          dispatch(
            ordersApi.util.updateQueryData("getOrders", ANY_LIMIT, (draft) => {
              const order = draft.orders.find((item) => item.id === id);
              if (!order) return;
              order.cdekUuid = uuid;
              // Бэк при создании в СДЭК переводит заказ «в работу», но отвечает
              // только uuid — повторяем смену статуса у себя.
              order.status = "in_work";
              order.statusRaw = "in_work";
            }),
          );
        } catch {
          // Ошибку показывает строка — она читает её из состояния мутации.
        }
      },
    }),

    /**
     * Привязка заказа, который уже создали вручную в ЛК СДЭК: uuid, номер ИМ
     * или номер заказа СДЭК — бэк разберётся сам, фронт передаёт строку как есть.
     *
     * Если бэк ответил заказом целиком — кладём его, иначе записываем в строку
     * введённый номер.
     */
    linkCdekOrder: build.mutation<Order | null, CdekLink>({
      query: ({ id, orderUuid }) => ({
        url: `cdek/orders/${id}/`,
        method: "PATCH",
        body: { order_uuid: orderUuid },
      }),
      transformResponse: (response: OrderDto | { msg?: string } | null): Order | null =>
        response && typeof response === "object" && "id" in response
          ? normalizeOrder(response as OrderDto)
          : null,
      async onQueryStarted({ id, orderUuid }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            ordersApi.util.updateQueryData("getOrders", ANY_LIMIT, (draft) => {
              const index = draft.orders.findIndex((item) => item.id === id);
              const order = draft.orders[index];
              if (!order) return;
              if (data) draft.orders[index] = data;
              else order.cdekUuid = orderUuid;
            }),
          );
        } catch {
          // Ошибку показывает окно привязки.
        }
      },
    }),

    /**
     * Заказ глазами СДЭК: статус, история, посылка, стоимость. Бэк ходит
     * в API СДЭК на каждый запрос, поэтому окно запрашивает данные при каждом
     * открытии (refetchOnMountOrArgChange в компоненте) — статусы меняются.
     */
    getCdekOrderInfo: build.query<CdekInfo, string>({
      query: (id) => `cdek/orders/${id}/`,
      transformResponse: (response: CdekOrderInfoResponse) => normalizeCdekInfo(response),
    }),
  }),
});

export const {
  useGetCdekOrderInfoQuery,
  useGetOrdersQuery,
  useUpdateOrderMutation,
  useCreateCdekOrderMutation,
  useLinkCdekOrderMutation,
} = ordersApi;
