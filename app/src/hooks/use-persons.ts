import { useApiResource } from '@/hooks/use-api-resource';
import { apiFetch } from '@/utils/api-fetch';

/** Дата памяти новомученика */
export type PersonDate = {
    год?: number;
    датировка?: string;
    текст?: string;
};

/** Точка на карте */
export type GeoJsonPoint = {
    type: 'Point';
    coordinates: [number, number];  // долгота и широта
};

/** Место, привязанное к событию новомученика */
export type PersonPlace = {
    адрес?: string;
    тип?: string;
    Координаты?: GeoJsonPoint | null;
};

export type PersonEvent = {
    датировка?: string;
    текст?: string;
    тип?: string;
    Места?: PersonPlace[];
};

export type Person = {
    Номер: number;
    Заголовок: string;
    ФИО?: string;
    фамилия?: string;
    имя?: string;
    отчество?: string;
    сан_церк_служение?: string;
    Рождение?: PersonDate;
    Кончина?: PersonDate;
    События?: PersonEvent[];
    дополнительный_текст?: string;
    Фотографии?: unknown[];
    [key: string]: unknown;
};

export type PersonsResponse = {
    success: boolean;
    items: Person[];
    items_count: number;
    total_docs_count: number;
    has_next: boolean;
    skip: number;
    take: number;
};

export type UsePersonsOptions = {
    filter?: Record<string, unknown>;
};

/** Запись списка в формате `item`: реквизиты из `fields` лежат в `поля`. */
type PersonItem = Omit<Person, 'Заголовок'> & {
    поля?: Partial<Person>;
};

type PersonItemsResponse = Omit<PersonsResponse, 'items'> & { items: PersonItem[] };

/**
 * Что из полной биографии нужно карточке списка.
 *
 * Список грузится в формате `item` с этими реквизитами, а не в `full`: полная
 * запись тянет события, источники и связи, это ~16 КБ на человека. В дни с
 * полусотней новомучеников (30 октября) выходило под мегабайт JSON, который
 * разбирался, клался в кэш и держался в памяти ради четырёх полей.
 */
const CARD_FIELDS = ['Заголовок', 'Рождение', 'Кончина', 'Фотографии'];

/** Больше 50 за раз API не отдаёт */
const PAGE_SIZE = 50;

/** Фильтр по дню памяти: месяц и число, без года. */
export function dayOfYearFilter(month: number, day: number) {
    return {
        'death.month': month,
        'death.day': day,
    };
}

export function memorialDayFilter(date = new Date()) {
    return dayOfYearFilter(date.getMonth() + 1, date.getDate());
}

export function buildPersonsUrl({ filter }: UsePersonsOptions = {}) {
    const params = new URLSearchParams({
        data_format: 'item',
        fields: CARD_FIELDS.join(','),
        filter: JSON.stringify(filter ?? memorialDayFilter()),
    });

    return `public/dela?${params.toString()}`;
}

function collected(page: PersonItemsResponse, items: Person[], hasNext: boolean): PersonsResponse {
    return {
        ...page,
        items,
        items_count: items.length,
        has_next: hasNext,
        skip: 0,
        take: items.length,
    };
}

/**
 * API отдаёт дела страницами, поэтому собираем все страницы в один ответ.
 *
 * Первая страница уходит на экран сразу (`onPartial`): в дни, где
 * новомучеников за сотню, список больше не ждёт всех страниц подряд.
 * Остальные дописываются снизу, и то, что уже на экране, не сдвигается.
 */
async function fetchAllPersons(url: string, onPartial?: (partial: PersonsResponse) => void): Promise<PersonsResponse> {
    const items: Person[] = [];
    let page: PersonItemsResponse;

    do {
        page = await apiFetch<PersonItemsResponse>(`${url}&skip=${items.length}&take=${PAGE_SIZE}`);
        // Реквизиты из `поля` поднимаются наверх: дальше запись выглядит так
        // же, как полная, только без лишнего.
        items.push(...page.items.map(({ поля, ...item }) => ({ ...item, ...поля }) as Person));

        if (page.has_next && page.items.length > 0) onPartial?.(collected(page, [...items], true));
    } while (page.has_next && page.items.length > 0);

    return collected(page, items, false);
}

export function usePersons(options: UsePersonsOptions = {}) {
    const { data, ...resource } = useApiResource<PersonsResponse>(buildPersonsUrl(options), {
        fetcher: fetchAllPersons,
    });

    return {
        ...resource,
        persons: data?.items ?? [],
        total: data?.total_docs_count ?? 0,
        hasNext: data?.has_next ?? false,
        data,
        reload: resource.refresh,
    };
}
