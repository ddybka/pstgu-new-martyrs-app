/**
 * Адрес веб-версии — из него собираются ссылки «Поделиться».
 *
 * Ссылки должны совпадать с маршрутами приложения, поэтому путь строится тем
 * же способом, что и в роутере: /person/{Номер}.
 */
export const SITE_URL = 'https://fcsmap.nmbook.ru';

export function personUrl(number: number) {
    return `${SITE_URL}/person/${number}`;
}
