import type { CircleLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';

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

/** Центр и приближение по умолчанию: европейская часть России. */
export const INITIAL_VIEW = {
    center: [45, 57] as [number, number],
    zoom: 3,
};

export const SOURCE_ID = 'martyrs';
export const CLUSTER_LAYER_ID = 'martyrs-clusters';
export const CLUSTER_COUNT_LAYER_ID = 'martyrs-cluster-count';
export const POINT_LAYER_ID = 'martyrs-points';

export const CLUSTER_OPTIONS = {
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 12,
};

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
};

export function toFeatureCollection(points: MartyrPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
    return {
        type: 'FeatureCollection',
        features: points.map((point) => ({
            type: 'Feature',
            // id обязателен целым числом и должен быть уникальным: по нему
            // MapLibre сопоставляет фичи между кадрами. Номер дела на эту роль
            // не годится — у человека с пятью местами он один на все пять.
            id: point.id,
            geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] },
            properties: {
                number: point.number,
                kind: point.kind,
            },
        })),
    };
}

/** Оформление слоёв. Цвет акцента передаётся снаружи — он зависит от темы. */
export function buildLayers(accent: string, contrast: string) {
    const clusters: Omit<CircleLayerSpecification, 'id' | 'source'> = {
        type: 'circle',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': accent,
            // Кружок растёт ступенями, а не линейно: разница между «3» и «5»
            // читается плохо, а между «3» и «30» должна быть заметной.
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
            'circle-stroke-width': 2,
            'circle-stroke-color': contrast,
        },
    };

    const clusterCount: Omit<SymbolLayerSpecification, 'id' | 'source'> = {
        type: 'symbol',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            // Шрифт должен существовать в glyphs подложки, иначе подпись просто
            // не отрисуется — молча. Noto Sans есть и в OpenFreeMap, и в CARTO.
            'text-font': ['Noto Sans Bold'],
            'text-size': 13,
            'text-allow-overlap': true,
        },
        paint: { 'text-color': contrast },
    };

    const points: Omit<CircleLayerSpecification, 'id' | 'source'> = {
        type: 'circle',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': accent,
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': contrast,
        },
    };

    return { clusters, clusterCount, points };
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
    /** Карта как картинка: без жестов. Нужна на странице новомученика. */
    interactive?: boolean;
    /** Нажатие на одиночную точку — номер дела. */
    onPersonPress?: (number: number) => void;
    /** Нажатие на карту целиком. Имеет смысл только для неинтерактивной. */
    onPress?: () => void;
};

/** Зум для единственной точки: рамка нулевого размера камере ничего не говорит. */
export const SINGLE_POINT_ZOOM = 9;

export function isSinglePoint(bounds: MapBounds) {
    const [[west, south], [east, north]] = bounds;
    return west === east && south === north;
}
