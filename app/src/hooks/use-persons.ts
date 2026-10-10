import { useApiResource } from '@/hooks/use-api-resource';

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
    dataFormat?: 'full' | 'short';
    skip?: number;
    take?: number;
};

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

export function buildPersonsUrl({ filter, dataFormat = 'full', skip, take }: UsePersonsOptions = {}) {
    const params = new URLSearchParams({
        data_format: dataFormat,
        filter: JSON.stringify(filter ?? memorialDayFilter()),
    });

    if (skip !== undefined) params.set('skip', String(skip));
    if (take !== undefined) params.set('take', String(take));

    return `public/dela?${params.toString()}`;
}

export function usePersons(options: UsePersonsOptions = {}) {
    const { data, ...resource } = useApiResource<PersonsResponse>(buildPersonsUrl(options));

    return {
        ...resource,
        persons: data?.items ?? [],
        total: data?.total_docs_count ?? 0,
        hasNext: data?.has_next ?? false,
        data,
        reload: resource.refresh,
    };
}
