import type { CSSProperties } from "react";
import { PaySelect } from "../../components/PaySelect";
import { StatusSelect } from "../../components/StatusSelect";
import { statusRailColor } from "../../lib/statusTokens";
import { EMPTY, formatDate, formatMoney, formatPhone, formatTime } from "../../lib/format";
import { addressMapUrl, pickupPointMapUrl } from "../../lib/maps";
import type { OrderPatch } from "../../api/ordersApi";
import type { Book, Order } from "../../types/domain";

function Empty() {
  return <span className="cell__empty">{EMPTY}</span>;
}

/** «33 × 3 × 22 см, 540 г». Показываем то, что есть: хоть габариты, хоть вес. */
function bookSpecs(book: Book): string | null {
  const parts: string[] = [];
  if (book.length !== null && book.width !== null && book.height !== null) {
    parts.push(`${book.length} × ${book.width} × ${book.height} см`);
  }
  if (book.weight !== null) parts.push(`${book.weight} г`);
  return parts.length > 0 ? parts.join(", ") : null;
}

interface Props {
  order: Order;
  /** Идёт сохранение этой строки — селекты заперты, чтобы не слать второй PATCH. */
  busy: boolean;
  onPatch: (patch: OrderPatch) => void;
}

export function OrderRow({ order, busy, onPatch }: Props) {
  const { book, customer } = order;
  const railStyle = { "--row-rail-color": statusRailColor(order.status) } as CSSProperties;
  const phone = formatPhone(customer.phone);
  const specs = bookSpecs(book);
  const hasDelivery = customer.deliveryPoint !== null || customer.deliveryAddress !== null;
  const addressUrl = addressMapUrl(customer.deliveryAddress);
  const pickupUrl = pickupPointMapUrl(customer.deliveryAddress);

  return (
    <tr className="row" style={railStyle}>
      <td className="row__lead">
        <span className="cell__primary cell__num">№&nbsp;{order.id}</span>
        {/* UUID показываем, только когда он есть: сейчас он null у всех заказов,
            и подпись «не передан в СДЭК» в каждой строке была бы шумом. */}
        {order.cdekUuid && (
          <span className="cell__secondary cell__uuid" title="Идентификатор заказа в СДЭК">
            {order.cdekUuid}
          </span>
        )}
      </td>

      <td>
        {customer.name ? (
          <span className="cell__primary cell__name">{customer.name}</span>
        ) : (
          <Empty />
        )}
        {phone && (
          <a className="cell__secondary cell__link" href={`tel:${customer.phone}`}>
            {phone}
          </a>
        )}
        {customer.email && (
          <a className="cell__secondary cell__link" href={`mailto:${customer.email}`}>
            {customer.email}
          </a>
        )}

        {/* Куда везти — отделено от того, кому звонить: при оформлении отправки
            это два разных действия. Адрес и плашка ПВЗ ведут на Яндекс Карты. */}
        {hasDelivery && (
          <div className="subblock">
            {customer.deliveryPoint &&
              (pickupUrl ? (
                <a
                  className="tag tag--link"
                  href={pickupUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Показать пункт выдачи СДЭК на Яндекс Картах"
                >
                  ПВЗ {customer.deliveryPoint}
                </a>
              ) : (
                <span className="tag" title="Код пункта выдачи СДЭК">
                  ПВЗ {customer.deliveryPoint}
                </span>
              ))}
            {customer.deliveryAddress && addressUrl && (
              <a
                className="subblock__text subblock__text--link"
                href={addressUrl}
                target="_blank"
                rel="noreferrer"
                title="Показать адрес на Яндекс Картах"
              >
                {customer.deliveryAddress}
              </a>
            )}
          </div>
        )}
      </td>

      <td>
        <div className="book">
          {book.thumbnail ? (
            <img className="book__cover" src={book.thumbnail} alt="" loading="lazy" />
          ) : (
            <span className="book__cover book__cover--blank" aria-hidden="true" />
          )}
          <div className="book__text">
            <span className="cell__primary book__title">{book.name}</span>
            {book.authorUrl && book.author ? (
              <a
                className="cell__secondary cell__link"
                href={book.authorUrl}
                target="_blank"
                rel="noreferrer"
              >
                {book.author}
              </a>
            ) : (
              <span className="cell__secondary">{book.author ?? "автор не указан"}</span>
            )}
            {book.isbn && <span className="cell__secondary book__isbn">ISBN {book.isbn}</span>}
            {specs && <span className="cell__secondary">{specs}</span>}
          </div>
        </div>
      </td>

      <td className="cell--date">
        <span className="cell__primary">{formatDate(order.dt)}</span>
        <span className="cell__secondary">{formatTime(order.dt)}</span>
      </td>

      <td className="cell--money">
        <span className="cell__primary">{formatMoney(order.total)}</span>
        <span className="cell__secondary">
          {book.price === null
            ? "цена не задана"
            : `${formatMoney(book.price)} × ${order.quantity}`}
        </span>
      </td>

      <td>
        <StatusSelect
          status={order.status}
          raw={order.statusRaw}
          disabled={busy}
          onChange={(status) => onPatch({ id: order.id, status })}
        />
      </td>

      <td>
        <PaySelect
          payStatus={order.payStatus}
          disabled={busy}
          onChange={(payStatus) => onPatch({ id: order.id, payStatus })}
        />
      </td>

      {/* Кнопки управления появятся здесь после согласования состава действий. */}
      <td className="cell--actions">
        <Empty />
      </td>
    </tr>
  );
}
