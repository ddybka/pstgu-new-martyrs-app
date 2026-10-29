import type {
    CircleLayerSpecification,
    FilterSpecification,
    SymbolLayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';

import { CLUSTER_PROPERTIES, PIE_SIZE, pieImageExpression } from './cluster-pie';
import type { KindColors } from './map-kinds';

/**
 * Общая часть карты для натива и веба.
 *
 * Стиль, кластеризация и оформление слоёв описаны в терминах MapLibre style
 * spec, а он один и тот же в `@maplibre/maplibre-react-native` и в
 * `maplibre-gl`. Поэтому здесь лежит всё, что не зависит от рендерера, а в
 * `martyrs-map.tsx` / `martyrs-map.web.tsx` остаются только обёртки.
 */

/**
 * Подложка — OpenFreeMap: бесплатно, без ключа и без лимитов.
 *
 * Тёмного стиля у него нет, поэтому для тёмной темы берём dark-matter у CARTO
 * (тоже бесплатный, требует указания авторства OSM/CARTO).
 */
export const MAP_STYLES = {
    light: 'https://tiles.openfreemap.org/styles/positron',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const;

/**
 * Шрифт подписи на кластере — свой у каждой подложки.
 *
 * Глифы отдаёт сервер подложки, и общего жирного шрифта у двух провайдеров
 * нет: у OpenFreeMap есть только Noto Sans, у CARTO — Open Sans и Montserrat
 * (Noto Sans Bold там отвечает 404). Отсутствующий шрифт хуже, чем пропавшая
 * подпись: нативный MapLibre из-за ошибки глифов бракует тайл источника
 * целиком, и вместе с подписями пропадают и сами точки. Поэтому в тёмной
 * теме точек не было — а после переключения из светлой были, потому что
 * глифы Noto Sans Bold уже лежали в кэше карты.
 */
export const MAP_FONTS = {
    light: ['Noto Sans Bold'],
    dark: ['Open Sans Bold'],
} as const;

/** Центр и приближение по умолчанию: европейская часть России. */
export const INITIAL_VIEW = {
    center: [45, 57] as [number, number],
    zoom: 3,
};

export const SOURCE_ID = 'martyrs';
export const CLUSTER_LAYER_ID = 'martyrs-clusters';
export const CLUSTER_PIE_LAYER_ID = 'martyrs-cluster-pie';
export const CLUSTER_COUNT_LAYER_ID = 'martyrs-cluster-count';
export const POINT_LAYER_ID = 'martyrs-points';
export const SELECTED_LAYER_ID = 'martyrs-selected';

/**
 * Кластеризация (supercluster внутри MapLibre). `clusterRadius` — то же, что
 * `gridSize` у Яндекс.Карт: в пикселях экрана, точки ближе друг к другу
 * сливаются в один кластер. Чем он больше, тем кластеров меньше и тем
 * больше видно саму карту.
 */
export const CLUSTER_OPTIONS = {
    cluster: true,
    clusterRadius: 80,
    clusterMaxZoom: 12,
    // Сколько в кластере событий каждого типа — для секторов (см. cluster-pie).
    clusterProperties: CLUSTER_PROPERTIES,
};

/**
 * Радиус кластера растёт ступенями, а не линейно: разница между «3» и «5»
 * читается плохо, а между «3» и «30» должна быть заметной.
 */
const CLUSTER_RADIUS = ['step', ['get', 'point_count'], 13, 10, 17, 100, 21];

/** Одна точка на карте — место, связанное с конкретным делом. */
export type MartyrPoint = {
    /** Сквозной номер точки. У одного дела их бывает много. */
    id: number;
    /** Номер дела: по нему открывается страница новомученика. */
    number: number;
    /** Раздел биографии: служение, репрессии, кончина, другое. */
    kind: string;
    longitude: number;
    latitude: number;
    /** Заголовок биографии: «ФИО, сан». */
    title: string;
    /** Датировка события; бывает пустой. */
    dating: string;
    /** Что случилось в этом месте — текст события из биографии. */
    text: string;
};

export { KIND_COLORS, POINT_KINDS, kindColor, type KindColors } from './map-kinds';

export function toFeatureCollection(points: readonly MartyrPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
    return {
        type: 'FeatureCollection',
        features: points.map((point) => ({
            type: 'Feature',
            // id обязателен целым числом и должен быть уникальным: по нему
            // MapLibre сопоставляет фичи между кадрами. Номер дела на эту роль
            // не годится — у человека с пятью местами он один на все пять.
            id: point.id,
            geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] },
            // id дублируется в свойствах: нативные события нажатия и листья
            // кластера отдают `id` фичи то числом, то строкой, а свойство
            // приходит как есть.
            properties: {
                id: point.id,
                kind: point.kind,
            },
        })),
    };
}

const geoJsonCache = new WeakMap<readonly MartyrPoint[], string>();

/**
 * Данные источника строкой — для нативной карты.
 *
 * Нативный `GeoJSONSource` сам вызывает `JSON.stringify` на каждой своей
 * отрисовке. Для восьми тысяч точек это почти мегабайт текста, и собирался он
 * заново на каждое нажатие на точку (меняется выделение — перерисовывается
 * карта). Строка, собранная один раз на массив точек, идёт на натив как есть.
 */
export function toGeoJsonString(points: readonly MartyrPoint[]): string {
    let json = geoJsonCache.get(points);

    if (json === undefined) {
        json = JSON.stringify(toFeatureCollection(points));
        geoJsonCache.set(points, json);
    }

    return json;
}

/**
 * Оформление слоёв. Цвета и шрифт передаются снаружи — они зависят от темы
 * (шрифт — от подложки, см. MAP_FONTS).
 */
export function buildLayers(
    accent: string,
    contrast: string,
    font: readonly string[],
    kindColors: KindColors,
    scheme: 'light' | 'dark',
    selected: readonly number[] = []
) {
    // Подложка кластера: видна, пока картинка с секторами ещё не нарисована,
    // и по ней же ловятся нажатия.
    const clusters: Omit<CircleLayerSpecification, 'id' | 'source'> = {
        type: 'circle',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': contrast,
            'circle-radius': CLUSTER_RADIUS as unknown as number,
            'circle-stroke-width': 2,
            'circle-stroke-color': accent,
        },
    };

    // Сектора по типам событий — картинкой (см. cluster-pie). Картинка одна
    // на все размеры и сжимается под радиус кластера.
    const clusterPie: Omit<SymbolLayerSpecification, 'id' | 'source'> = {
        type: 'symbol',
        filter: ['has', 'point_count'],
        layout: {
            'icon-image': pieImageExpression(scheme),
            'icon-size': ['/', ['*', 2, CLUSTER_RADIUS], PIE_SIZE] as unknown as number,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
        },
    };

    const clusterCount: Omit<SymbolLayerSpecification, 'id' | 'source'> = {
        type: 'symbol',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            // Шрифт должен существовать в glyphs подложки (см. MAP_FONTS).
            'text-font': [...font],
            'text-size': 12,
            'text-allow-overlap': true,
        },
        // Число — на круге цвета фона в середине кластера.
        paint: { 'text-color': accent },
    };

    const points: Omit<CircleLayerSpecification, 'id' | 'source'> = {
        type: 'circle',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': [
                'match',
                ['get', 'kind'],
                ...Object.entries(kindColors).flat(),
                kindColors.другое,
            ] as unknown as string,
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': contrast,
        },
    };

    // Обводка вокруг выбранных точек — рисуется под ними, кольцом цвета
    // акцента. Кластер выделить так нельзя: у него нет своего id в данных.
    const selection: Omit<CircleLayerSpecification, 'id' | 'source'> = {
        type: 'circle',
        filter: selectionFilter(selected),
        paint: {
            'circle-color': accent,
            'circle-radius': 13,
        },
    };

    return { clusters, clusterPie, clusterCount, points, selection };
}

/** Фильтр слоя обводки: одиночные точки из выбранных. */
export function selectionFilter(selected: readonly number[]): FilterSpecification {
    return ['all', ['!', ['has', 'point_count']], ['in', ['get', 'id'], ['literal', [...selected]]]];
}

/** Рамка камеры: [[запад, юг], [восток, север]]. */
export type MapBounds = [[number, number], [number, number]];

/** Отступ от краёв кадра, когда камера ставится по рамке. */
export const BOUNDS_PADDING = 48;

export type MartyrsMapProps = {
    points: MartyrPoint[];
    /**
     * Куда смотреть в начале. Без неё — вид по умолчанию (INITIAL_VIEW).
     * Одна точка рамки не задаёт, поэтому для неё берётся фиксированный зум.
     */
    bounds?: MapBounds | null;
    /**
     * Жесты: сдвиг, зум, поворот. Нажатия на точки работают и без жестов.
     *
     * - `true` — все жесты, карта на весь экран;
     * - `'embedded'` — карта внутри прокручиваемой страницы (страница
     *   новомученика): сдвиг и зум есть, поворота и наклона нет, а в вебе
     *   колесо листает страницу, зум — с Ctrl/⌘, на сенсорном экране карта
     *   двигается двумя пальцами;
     * - `false` — без жестов, карта-картинка.
     */
    interactive?: boolean | 'embedded';
    /**
     * Нажатие на точку или кластер — id всех точек под пальцем: у точки это
     * все события с теми же координатами (разные люди в одном месте, или
     * несколько событий одного человека), у кластера — все его точки.
     */
    onEventsPress?: (ids: number[]) => void;
    /** Точки, обведённые как выбранные. */
    selected?: readonly number[];
    /**
     * Куда перевести камеру после создания карты — например, на найденное.
     * Новый `key` — новый перелёт, даже к той же рамке.
     */
    focus?: { bounds: MapBounds; key: number } | null;
};

/**
 * Все точки с теми же координатами, что у нажатой.
 *
 * На крупном зуме кластеров нет, и события в одном месте лежат стопкой одна
 * на другой: нажатие попадает в верхнюю, а остальные под ней не видны.
 */
export function idsAtSamePlace(points: readonly MartyrPoint[], id: number): number[] {
    const tapped = points.find((point) => point.id === id);
    if (!tapped) return [id];

    return points
        .filter((point) => point.latitude === tapped.latitude && point.longitude === tapped.longitude)
        .map((point) => point.id);
}

/** id точки из фичи — из свойств, см. `toFeatureCollection`. */
export function featureId(feature: GeoJSON.Feature): number | null {
    const id = Number(feature.properties?.id);
    return Number.isInteger(id) ? id : null;
}

/** Зум для единственной точки: рамка нулевого размера камере ничего не говорит. */
export const SINGLE_POINT_ZOOM = 9;

export function isSinglePoint(bounds: MapBounds) {
    const [[west, south], [east, north]] = bounds;
    return west === east && south === north;
}
