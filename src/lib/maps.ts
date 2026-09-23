/**
 * Ссылки на Яндекс Карты по текстовому адресу.
 *
 * Координат СДЭК не отдаёт, поэтому используем поиск по строке. Код ПВЗ
 * («KSK12») сам по себе Яндексу ничего не говорит — ищем всегда по адресу,
 * а к запросу от плашки ПВЗ добавляем «СДЭК», чтобы метка встала на пункт
 * выдачи, а не на здание вообще.
 */

const YANDEX_MAPS = "https://yandex.ru/maps/";

function searchUrl(query: string): string {
  return `${YANDEX_MAPS}?${new URLSearchParams({ text: query }).toString()}`;
}

/** Карта по адресу доставки. null, если адреса нет — ссылку рисовать не из чего. */
export function addressMapUrl(address: string | null): string | null {
  return address ? searchUrl(address) : null;
}

/** Карта по пункту выдачи: тот же адрес, но с уточнением «СДЭК». */
export function pickupPointMapUrl(address: string | null): string | null {
  return address ? searchUrl(`СДЭК ${address}`) : null;
}
