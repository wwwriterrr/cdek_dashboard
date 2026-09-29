import { useState } from "react";
import type { ReactNode } from "react";
import { describeCdekError } from "../../api/baseApi";
import { useGetCdekOrderInfoQuery } from "../../api/ordersApi";
import { Modal, OrderMeta } from "../../components/Modal";
import { cdekTrackingUrl } from "../../lib/cdekInfo";
import type { CdekInfo } from "../../lib/cdekInfo";
import {
  formatCalendarDate,
  formatDateTime,
  formatMoney,
  formatPhone,
  formatWeight,
} from "../../lib/format";
import { pickupPointMapUrl } from "../../lib/maps";
import type { Order } from "../../types/domain";

/** Сколько последних статусов видно сразу; остальные — по кнопке. */
const HISTORY_PREVIEW = 5;

interface Props {
  order: Order;
  onClose: () => void;
}

export function CdekInfoDialog({ order, onClose }: Props) {
  // Каждое открытие — свежие данные: статусы в СДЭК меняются по нескольку раз в день.
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCdekOrderInfoQuery(
    order.id,
    { refetchOnMountOrArgChange: true },
  );

  return (
    <Modal
      title="Заказ в СДЭК"
      meta={<OrderMeta id={order.id} name={order.customer.name} />}
      wide
      onClose={onClose}
    >
      {() => {
        if (isLoading) return <InfoSkeleton />;
        if (isError || !data) {
          return (
            <div className="cdek-info__failure" role="alert">
              <p className="cdek-info__failure-text">
                Не удалось получить данные от СДЭК. {describeCdekError(error)}
              </p>
              <button
                type="button"
                className="btn"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                {isFetching && <span className="btn__spinner" aria-hidden="true" />}
                Повторить
              </button>
            </div>
          );
        }
        return <InfoBody info={data} />;
      }}
    </Modal>
  );
}

function InfoSkeleton() {
  return (
    <div className="cdek-info" aria-busy="true" aria-label="Загружаем данные СДЭК">
      <div className="cdek-info__status cdek-info__status--skeleton">
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div className="cdek-info__skeleton-row" key={index}>
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ))}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cdek-info__fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function InfoBody({ info }: { info: CdekInfo }) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { status, recipient, cost } = info;

  const pointAddress = [info.toCity, info.toAddress].filter(Boolean).join(", ");
  const pointUrl = pickupPointMapUrl(pointAddress || null);
  const history = showAllHistory ? info.history : info.history.slice(0, HISTORY_PREVIEW);
  const costParts = [
    cost.delivery !== null && `доставка ${formatMoney(cost.delivery)}`,
    ...cost.services.map((service) => `${service.label} ${formatMoney(service.sum)}`),
    cost.vat !== null && cost.vat > 0 && `НДС ${formatMoney(cost.vat)}`,
  ].filter(Boolean);

  return (
    <div className="cdek-info">
      <section className={`cdek-info__status cdek-info__status--${info.tone}`}>
        <p className="cdek-info__status-name">{status?.name ?? "Статус неизвестен"}</p>
        {status && (
          <p className="cdek-info__status-meta">
            {[status.city, formatDateTime(status.at)].filter(Boolean).join(" · ")}
          </p>
        )}
        {(info.deliveredDate || info.plannedDate || info.keepFreeUntil !== null) && (
          <p className="cdek-info__status-dates">
            {info.deliveredDate ? (
              <span>Вручен {formatCalendarDate(info.deliveredDate)}</span>
            ) : (
              info.plannedDate && (
                <span>Плановая доставка {formatCalendarDate(info.plannedDate)}</span>
              )
            )}
            {/* После вручения срок хранения уже не важен. */}
            {!info.deliveredDate && info.keepFreeUntil !== null && (
              <span>Бесплатное хранение до {formatDateTime(info.keepFreeUntil)}</span>
            )}
          </p>
        )}
      </section>

      {info.problems.length > 0 && (
        <section className="cdek-info__problems" role="alert">
          <p className="cdek-info__problems-title">СДЭК отклонил запрос по заказу</p>
          <ul>
            {info.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </section>
      )}

      <dl className="cdek-info__facts">
        {info.cdekNumber && (
          <Fact label="Номер СДЭК">
            <span className="cdek-info__number">{info.cdekNumber}</span>
            <a
              className="cell__link cdek-info__track"
              href={cdekTrackingUrl(info.cdekNumber)}
              target="_blank"
              rel="noreferrer"
            >
              Отследить на сайте СДЭК ↗
            </a>
          </Fact>
        )}

        {(info.fromCity || info.toCity) && (
          <Fact label="Маршрут">
            {info.fromCity ?? "?"} → {info.toCity ?? "?"}
            {info.toRegion && info.toRegion !== info.toCity && (
              <span className="cdek-info__muted"> ({info.toRegion})</span>
            )}
          </Fact>
        )}

        {(info.deliveryPoint || info.toAddress) && (
          <Fact label="Пункт выдачи">
            {info.deliveryPoint && <span className="tag">ПВЗ {info.deliveryPoint}</span>}{" "}
            {info.toAddress &&
              (pointUrl ? (
                <a className="cell__link" href={pointUrl} target="_blank" rel="noreferrer">
                  {info.toAddress}
                </a>
              ) : (
                info.toAddress
              ))}
          </Fact>
        )}

        {info.tariff && <Fact label="Тариф">{info.tariff}</Fact>}

        {(recipient.name || recipient.phones.length > 0 || recipient.email) && (
          <Fact label="Получатель">
            {recipient.name && <span className="cdek-info__line">{recipient.name}</span>}
            {recipient.phones.map((phone) => (
              <a key={phone} className="cdek-info__line cell__link" href={`tel:+${phone}`}>
                {formatPhone(phone)}
              </a>
            ))}
            {recipient.email && (
              <a className="cdek-info__line cell__link" href={`mailto:${recipient.email}`}>
                {recipient.email}
              </a>
            )}
          </Fact>
        )}

        {info.packages.map((pkg, index) => (
          <Fact key={index} label={info.packages.length > 1 ? `Место ${index + 1}` : "Посылка"}>
            <span className="cdek-info__line">
              {[formatWeight(pkg.weight), pkg.size].filter(Boolean).join(" · ") || "—"}
            </span>
            {pkg.items.map((item, itemIndex) => (
              <span className="cdek-info__line cdek-info__muted" key={itemIndex}>
                {item.name} × {item.amount}
                {item.cost !== null && ` — ${formatMoney(item.cost * item.amount)}`}
              </span>
            ))}
          </Fact>
        ))}

        {cost.total !== null && (
          <Fact label="Доставка стоит">
            <span className="cdek-info__line cdek-info__strong">{formatMoney(cost.total)}</span>
            {costParts.length > 0 && (
              <span className="cdek-info__line cdek-info__muted">{costParts.join(" + ")}</span>
            )}
          </Fact>
        )}

        <Fact label="С получателя">
          {info.recipientPays > 0 ? (
            <span className="cdek-info__strong">{formatMoney(info.recipientPays)}</span>
          ) : (
            "ничего, заказ оплачен"
          )}
        </Fact>
      </dl>

      {info.history.length > 0 && (
        <section className="cdek-info__history">
          <h3 className="dialog__subtitle">История</h3>
          <ol className="timeline">
            {history.map((item, index) => (
              <li
                className={
                  index === 0 ? "timeline__item timeline__item--current" : "timeline__item"
                }
                key={`${item.code}-${item.at ?? index}`}
              >
                <span className="timeline__name">{item.name}</span>
                <span className="timeline__meta">
                  {[item.city, formatDateTime(item.at)].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ol>
          {info.history.length > HISTORY_PREVIEW && (
            <button
              type="button"
              className="btn btn--ghost cdek-info__more"
              onClick={() => setShowAllHistory((value) => !value)}
            >
              {showAllHistory ? "Свернуть" : `Показать всю историю (${info.history.length})`}
            </button>
          )}
        </section>
      )}

      <p className="cdek-info__ids">
        UUID <span className="cdek-info__id">{info.orderUuid}</span>
        {info.imNumber && (
          <>
            {" · "}номер ИМ <span className="cdek-info__id">{info.imNumber}</span>
          </>
        )}
      </p>
    </div>
  );
}
