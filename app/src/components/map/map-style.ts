import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { useEffect, useState } from 'react';

import { MAP_FONTS, MAP_STYLES } from './map-config';

import { readCache, writeCache } from '@/utils/api-cache';

/**
 * Правка чужого стиля под нужды проекта.
 *
 * Подложки — готовые стили OpenFreeMap и CARTO, и оба решают за нас два
 * вопроса, которые мы решаем иначе: на каком языке подписи и как проведены
 * границы. Форк стиля целиком не годится — он устареет на первом же обновлении
 * подложки. Поэтому стиль скачивается как есть и правится в двух местах:
 * подписи переводятся на русский, а слои границ заменяются своими.
 *
 * Всё остальное — дороги, вода, здания, шрифты, порядок слоёв — остаётся
 * авторским.
 */

/**
 * Подпись по-русски, с откатом на местное название.
 *
 * `name:ru` есть в тайлах обоих провайдеров, но не у каждого объекта: у мелких
 * улиц и речек его обычно нет, и тогда берётся `name` — местное имя. Латиница
 * последняя: без неё подпись пропала бы совсем.
 */
const RU_NAME = [
    'coalesce',
    ['get', 'name:ru'],
    ['get', 'name'],
    ['get', 'name:latin'],
];

/** Слой тайлов, в котором лежат все административные границы. */
const BOUNDARY_LAYER = 'boundary';

/** Цвет границ: средне-серый, читается и на белой подложке, и на чёрной. */
const BOUNDARY_COLOR = 'hsl(210, 4%, 55%)';

const BOUNDARY_WIDTH = [
    'interpolate',
    ['linear'],
    ['zoom'],
    3, 0.8,
    6, 1.2,
    12, 2,
];

/**
 * Государственная граница.
 *
 * Спорные участки: рисуется российская версия. В тайлах обе стороны лежат
 * рядом, помеченные `disputed` и `claimed_by`, — выбор версии и есть выбор
 * издателя карты. Украинская версия тех же участков отсеивается ниже, иначе
 * обе линии наложились бы друг на друга и граница читалась бы как размытая
 * (так сейчас и выглядит тёмная тема).
 *
 * `maritime` — морские продолжения границ: они уходят в открытую воду и на
 * карте выглядят случайными линиями посреди моря. Их не рисует и оригинал.
 */
const COUNTRY_FILTER = [
    'all',
    ['==', ['get', 'admin_level'], 2],
    ['!=', ['get', 'maritime'], 1],
    ['any', ['!=', ['get', 'disputed'], 1], ['==', ['get', 'claimed_by'], 'RU']],
];

/**
 * Спорные границы в остальном мире — пунктиром, как и было.
 *
 * Крымские участки исключены: их версия уже выбрана слоем выше. У прочих
 * спорных линий (Кашмир, линии фактического контроля) `claimed_by` в данных
 * обычно нет вовсе, поэтому под это условие они попадают и остаются пунктиром.
 */
const DISPUTED_FILTER = [
    'all',
    ['==', ['get', 'admin_level'], 2],
    ['==', ['get', 'disputed'], 1],
    ['!=', ['get', 'maritime'], 1],
    ['!=', ['get', 'claimed_by'], 'RU'],
    ['!=', ['get', 'claimed_by'], 'UA'],
];

/** Внутренние границы — регионы и районы. Тонким пунктиром, как в оригинале. */
const REGION_FILTER = [
    'all',
    ['>=', ['get', 'admin_level'], 3],
    ['<=', ['get', 'admin_level'], 4],
    ['!=', ['get', 'maritime'], 1],
];

function boundaryLayers(source: string): LayerSpecification[] {
    return [
        {
            id: 'boundary-region',
            type: 'line',
            source,
            'source-layer': BOUNDARY_LAYER,
            minzoom: 4,
            filter: REGION_FILTER,
            paint: {
                'line-color': BOUNDARY_COLOR,
                'line-opacity': 0.5,
                'line-dasharray': [2, 2],
                'line-width': 0.8,
            },
        },
        {
            id: 'boundary-disputed',
            type: 'line',
            source,
            'source-layer': BOUNDARY_LAYER,
            filter: DISPUTED_FILTER,
            paint: {
                'line-color': BOUNDARY_COLOR,
                'line-opacity': 0.8,
                'line-dasharray': [1, 2],
                'line-width': BOUNDARY_WIDTH,
            },
        },
        {
            id: 'boundary-country',
            type: 'line',
            source,
            'source-layer': BOUNDARY_LAYER,
            filter: COUNTRY_FILTER,
            paint: {
                'line-color': BOUNDARY_COLOR,
                'line-width': BOUNDARY_WIDTH,
            },
        },
    ] as LayerSpecification[];
}

/**
 * Стиль после правок: подписи по-русски, границы свои.
 *
 * Исходный объект не меняется — стиль кэшируется, и портить общий экземпляр
 * нельзя.
 */
export function applyMapRules(style: StyleSpecification): StyleSpecification {
    const layers: LayerSpecification[] = [];
    // Источник берём у самих слоёв границ, а не по имени: у OpenFreeMap он
    // называется `openmaptiles`, у CARTO — `carto`.
    let boundarySource: string | null = null;

    for (const layer of style.layers) {
        const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : undefined;

        if (sourceLayer === BOUNDARY_LAYER) {
            boundarySource = 'source' in layer ? layer.source : null;
            continue;
        }

        const textField =
            layer.type === 'symbol' ? layer.layout?.['text-field'] : undefined;

        // Подпись переводится только там, где она построена из названия.
        // Номера дорог и номера домов — тоже `text-field`, но переводить в них
        // нечего, и подмена превратила бы щит с номером трассы в её имя.
        if (textField !== undefined && JSON.stringify(textField).includes('name')) {
            layers.push({
                ...layer,
                layout: { ...layer.layout, 'text-field': RU_NAME },
            } as LayerSpecification);
            continue;
        }

        layers.push(layer);
    }

    if (boundarySource) {
        // Границы встают перед первым слоем подписей: иначе линия проходила бы
        // поверх названий городов и резала их пополам.
        const firstLabel = layers.findIndex((layer) => layer.type === 'symbol');
        const at = firstLabel === -1 ? layers.length : firstLabel;
        layers.splice(at, 0, ...boundaryLayers(boundarySource));
    }

    return { ...style, layers };
}

/**
 * Кэш загрузок по адресу исходного стиля.
 *
 * Хранятся промисы, а не готовые стили: карта монтируется заново на каждой
 * странице новомученика, и второй заход должен присоединяться к первой
 * загрузке, а не начинать свою. Модульный, потому что стиль один на всё
 * приложение и от жизни компонентов не зависит.
 */
const cache = new Map<string, Promise<StyleSpecification | string>>();

/**
 * Уже готовые стили — чтобы карта, открытая после предзагрузки, получила
 * стиль в первой же отрисовке, а не кадром позже, после промиса.
 */
const ready = new Map<string, StyleSpecification | string>();

/** Сколько сохранённая копия стиля живёт без обновления. */
const STYLE_REFRESH_MS = 24 * 60 * 60 * 1000;

function styleCacheKey(url: string) {
    return `map-style-v1:${url}`;
}

/**
 * Сколько ждём стиль, когда сохранённой копии нет. Дальше карте отдаётся
 * исходный адрес: пусть она грузит стиль сама, чем стоит пустой.
 */
const STYLE_TIMEOUT_MS = 10_000;

async function fetchStyle(url: string): Promise<StyleSpecification> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STYLE_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`${url} ответил ${response.status}`);

        const style = applyMapRules((await response.json()) as StyleSpecification);
        void writeCache(styleCacheKey(url), style);
        return style;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Стиль берётся из сохранённой копии, если она есть, а сеть только обновляет
 * её к следующему запуску. Раньше карта ждала скачивания стиля при каждом
 * запуске и до тех пор стояла пустой — на медленном мобильном интернете это
 * были секунды. Подменять стиль уже показанной карты не нужно: подложка
 * меняется редко, а пересборка карты на глазах заметнее, чем день старых
 * границ.
 */
async function resolveStyle(url: string): Promise<StyleSpecification | string> {
    const cached = await readCache<StyleSpecification>(styleCacheKey(url));

    if (cached) {
        if (Date.now() - cached.fetchedAt > STYLE_REFRESH_MS) {
            fetchStyle(url).catch(() => { });
        }
        return cached.data;
    }

    // Строка вместо стиля — это отказ: скачать не вышло, и карте отдаётся
    // исходный адрес. Пусть с чужими границами, но карта, а не пустой экран.
    return fetchStyle(url).catch(() => url);
}

function loadStyle(url: string): Promise<StyleSpecification | string> {
    const started = cache.get(url);
    if (started) return started;

    const loading = resolveStyle(url).then((style) => {
        ready.set(url, style);
        return style;
    });
    cache.set(url, loading);
    return loading;
}

/** Скачать стиль заранее, до того как откроют карту (см. `preloadMapPoints`). */
export function preloadMapStyle(isDark: boolean) {
    void loadStyle(MAP_STYLES[isDark ? 'dark' : 'light']);
}

export type LoadedMapStyle = {
    style: StyleSpecification | string;
    /** Шрифт для своих подписей — из глифов именно этой подложки. */
    font: readonly string[];
};

/**
 * Стиль подложки под текущую тему. `null` — пока скачивается.
 *
 * Результат живёт в состоянии, а не читается из кэша прямо в рендере: чтение
 * изменяемого модульного значения не является для React источником обновления,
 * и с включённым React Compiler оно вдобавок мемоизируется — хук навсегда
 * оставался бы с первым (пустым) ответом.
 *
 * Шрифт отдаётся вместе со стилем, а не выводится из темы на месте: при смене
 * темы старая подложка ещё какое-то время на экране, пока качается новая, и
 * шрифт от новой темы на старой подложке ломал бы тайлы (см. MAP_FONTS).
 */
export function useMapStyle(isDark: boolean): LoadedMapStyle | null {
    const scheme = isDark ? 'dark' : 'light';
    const [loaded, setLoaded] = useState<LoadedMapStyle | null>(() => {
        const style = ready.get(MAP_STYLES[scheme]);
        return style ? { style, font: MAP_FONTS[scheme] } : null;
    });

    useEffect(() => {
        let cancelled = false;

        loadStyle(MAP_STYLES[scheme]).then((style) => {
            if (cancelled) return;
            // Тот же стиль, что уже взят из готовых, — без лишней отрисовки.
            setLoaded((prev) => (prev?.style === style ? prev : { style, font: MAP_FONTS[scheme] }));
        });

        return () => {
            cancelled = true;
        };
    }, [scheme]);

    return loaded;
}
