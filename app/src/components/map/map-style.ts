import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { useEffect, useState } from 'react';

import { MAP_FONTS, MAP_STYLES } from './map-config';

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

function loadStyle(url: string): Promise<StyleSpecification | string> {
    const started = cache.get(url);
    if (started) return started;

    // Строка вместо стиля — это отказ: скачать не вышло, и карте отдаётся
    // исходный адрес. Пусть с чужими границами, но карта, а не пустой экран.
    const loading = fetch(url)
        .then((response) => response.json())
        .then(applyMapRules)
        .catch(() => url);

    cache.set(url, loading);
    return loading;
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
    const [loaded, setLoaded] = useState<LoadedMapStyle | null>(null);

    useEffect(() => {
        let cancelled = false;

        loadStyle(MAP_STYLES[scheme]).then((style) => {
            if (!cancelled) setLoaded({ style, font: MAP_FONTS[scheme] });
        });

        return () => {
            cancelled = true;
        };
    }, [scheme]);

    return loaded;
}
