import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

/**
 * Мок `POST /api/v1/cdek/orders/<id>/` — создания заказа в СДЭК,
 * и `PATCH` того же адреса с `order_uuid` — привязки уже созданного заказа.
 *
 * Заказы в таблице боевые, и настоящий POST создал бы настоящую отправку.
 * Поэтому в режиме разработки запрос перехватывается здесь и до прокси на бэк
 * не доходит: middleware из configureServer встаёт раньше встроенного прокси.
 * В сборку для прода плагин не попадает (apply: "serve").
 *
 * VITE_CDEK_MOCK:
 *   не задан / cycle — сценарий выбирается по номеру заказа (id % 6), чтобы
 *                      в одной таблице были видны все варианты ответа;
 *   <имя сценария>   — всегда этот сценарий, например `ok` или `details_list`;
 *   off              — мок выключен, запрос уйдёт на настоящий бэк.
 *
 * Привязка номера от VITE_CDEK_MOCK не зависит (кроме off): сценарий
 * выбирается по введённому номеру, чтобы проверять ошибки прямо из окна,
 * см. LINK_SCENARIOS. Остальные PATCH (смена статусов) идут на бэк как раньше.
 */

interface Scenario {
  status: number;
  /** Объект — отдаём JSON, строка — отдаём как HTML (как делает nginx при 502). */
  body: object | string;
  delayMs: number;
}

const SCENARIOS = {
  ok: () => ({ status: 200, body: { msg: "ok", uuid: randomUUID() }, delayMs: 1200 }),
  cdek_error: () => ({
    status: 400,
    body: { details: "СДЭК: не найден пункт выдачи с кодом получателя" },
    delayMs: 900,
  }),
  details_list: () => ({
    status: 400,
    body: {
      details: [
        "Не заполнен телефон получателя",
        "У товара не указан вес",
      ],
    },
    delayMs: 900,
  }),
  cdek_down: () => ({
    status: 502,
    body: { details: "СДЭК API не ответил за 30 секунд" },
    delayMs: 2500,
  }),
  forbidden: () => ({
    status: 403,
    body: { detail: "У вас недостаточно прав для выполнения данного действия." },
    delayMs: 400,
  }),
  html_500: () => ({
    status: 500,
    body: "<html><body><h1>Server Error (500)</h1></body></html>",
    delayMs: 600,
  }),
} satisfies Record<string, () => Scenario>;

/**
 * Сценарии привязки: если введённый номер содержит ключ, срабатывает он,
 * иначе — успех. Проверяются по порядку.
 */
const LINK_SCENARIOS: [string, () => Scenario][] = [
  [
    "err",
    () => ({
      status: 400,
      body: { details: "Заказ с таким номером не найден в СДЭК" },
      delayMs: 800,
    }),
  ],
  [
    "field",
    () => ({
      status: 500,
      body: { field: "order_uuid", error: "Значение передано неверно" },
      delayMs: 600,
    }),
  ],
  [
    "403",
    () => ({
      status: 403,
      body: { detail: "У вас недостаточно прав для выполнения данного действия." },
      delayMs: 400,
    }),
  ],
  [
    "500",
    () => ({
      status: 500,
      body: "<html><body><h1>Server Error (500)</h1></body></html>",
      delayMs: 600,
    }),
  ],
];

function linkScenario(value: string): [string, Scenario] {
  const lowered = value.toLowerCase();
  const found = LINK_SCENARIOS.find(([key]) => lowered.includes(key));
  if (found) return [found[0], found[1]()];
  return ["ok", { status: 200, body: { msg: "ok" }, delayMs: 700 }];
}

function send(res: ServerResponse, name: string, { status, body, delayMs }: Scenario) {
  setTimeout(() => {
    const isJson = typeof body === "object";
    res.statusCode = status;
    res.setHeader("X-Cdek-Mock", name);
    res.setHeader(
      "Content-Type",
      isJson ? "application/json; charset=utf-8" : "text/html; charset=utf-8",
    );
    res.end(isJson ? JSON.stringify(body) : body);
  }, delayMs);
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readOrderUuid(raw: Buffer): string | null {
  try {
    const body: unknown = JSON.parse(raw.toString("utf8"));
    if (typeof body !== "object" || body === null || !("order_uuid" in body)) return null;
    return String((body as { order_uuid: unknown }).order_uuid);
  } catch {
    return null;
  }
}

type ScenarioName = keyof typeof SCENARIOS;
const CYCLE = Object.keys(SCENARIOS) as ScenarioName[];

const ROUTE = /^\/api\/v1\/cdek\/orders\/(\d+)\/?(?:\?.*)?$/;

function pickScenario(mode: string, orderId: number): ScenarioName {
  if (mode in SCENARIOS) return mode as ScenarioName;
  return CYCLE[orderId % CYCLE.length] ?? "ok";
}

export function cdekMock(mode: string | undefined): Plugin {
  const setting = (mode ?? "cycle").trim().toLowerCase() || "cycle";

  return {
    name: "alterlit:cdek-mock",
    apply: "serve",
    configureServer(server) {
      if (setting === "off") {
        server.config.logger.warn(
          "[cdek-mock] выключен: POST /api/v1/cdek/orders/<id>/ уйдёт на настоящий бэк",
        );
        return;
      }
      if (setting !== "cycle" && !(setting in SCENARIOS)) {
        server.config.logger.warn(
          `[cdek-mock] неизвестный сценарий «${setting}», работаю в режиме cycle. ` +
            `Доступны: ${CYCLE.join(", ")}, off`,
        );
      }

      server.middlewares.use((req, res, next) => {
        const match = ROUTE.exec(req.url ?? "");
        if (!match) return next();
        const orderId = Number(match[1]);

        if (req.method === "POST") {
          const name = pickScenario(setting, orderId);
          const scenario = SCENARIOS[name]();
          server.config.logger.info(
            `[cdek-mock] POST заказ ${orderId} → ${name} (${scenario.status})`,
            { timestamp: true },
          );
          // Тело запроса вычитываем, чтобы соединение закрылось штатно.
          req.resume();
          send(res, name, scenario);
          return;
        }

        if (req.method === "PATCH") {
          // Смена статусов и привязка номера ходят на один адрес — различить
          // их можно только по телу. Читаем его, а если это не привязка,
          // отдаём прокси те же байты: он передаёт тело через req.pipe(),
          // а поток мы уже вычитали.
          readBody(req).then(
            (raw) => {
              const orderUuid = readOrderUuid(raw);
              if (orderUuid === null) {
                req.pipe = (<T extends NodeJS.WritableStream>(dest: T): T => {
                  dest.end(raw);
                  return dest;
                }) as typeof req.pipe;
                return next();
              }
              const [name, scenario] = linkScenario(orderUuid);
              server.config.logger.info(
                `[cdek-mock] PATCH заказ ${orderId} order_uuid=«${orderUuid}» → ${name} (${scenario.status})`,
                { timestamp: true },
              );
              send(res, name, scenario);
            },
            (error: unknown) => next(error),
          );
          return;
        }

        next();
      });
    },
  };
}
