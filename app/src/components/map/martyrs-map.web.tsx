import {
    Map as MapLibreMap,
    setWorkerUrl,
    type FilterSpecification,
    type GeoJSONSource,
    type MapLayerMouseEvent,
    type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';

import 'maplibre-gl/dist/maplibre-gl.css';

import {
    BOUNDS_PADDING,
    CLUSTER_COUNT_LAYER_ID,
    CLUSTER_LAYER_ID,
    CLUSTER_OPTIONS,
    INITIAL_VIEW,
    KIND_COLORS,
    POINT_LAYER_ID,
    SELECTED_LAYER_ID,
    SINGLE_POINT_ZOOM,
    SOURCE_ID,
    buildLayers,
    featureId,
    idsAtSamePlace,
    isSinglePoint,
    selectionFilter,
    toFeatureCollection,
    type MartyrsMapProps,
} from './map-config';
import { useMapStyle } from './map-style';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Адрес воркера задаётся руками: сам maplibre-gl ищет его рядом с собой по
 * `import.meta.url`, а после сборки Metro такого адреса нет — и вместо воркера
 * получается `new Worker('')`. Карта при этом не падает, а тихо остаётся
 * пустой: тайлы разбирает именно воркер. Файлы кладёт в `public/maplibre`
 * скрипт `scripts/copy-maplibre-worker.mjs` (запускается на postinstall).
 */
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

/**
 * Веб-вариант карты. Нативный — в `martyrs-map.tsx`.
 *
 * Источник, кластеризация и оформление слоёв берутся из общего `map-config`:
 * style spec у maplibre-gl и у нативной обёртки один, различается только то,
 * как слои регистрируются — здесь императивно, там компонентами.
 */
export default function MartyrsMap({
    points,
    bounds,
    interactive = true,
    onEventsPress,
    selected,
}: MartyrsMapProps) {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();

    const containerRef = useRef<ComponentRef<typeof View>>(null);
    const mapRef = useRef<MapLibreMap | null>(null);

    // Колбэк, точки и выделение держим в ref: карта создаётся один раз на
    // тему, и ни новый колбэк, ни новые точки не должны пересоздавать её
    // вместе со всем состоянием (позицией, зумом). А при смене темы новый
    // источник должен сразу получить текущие точки, а не пустой список.
    // Обновляются в эффекте, объявленном раньше создания карты, — эффекты
    // идут по порядку.
    const onEventsPressRef = useRef(onEventsPress);
    const pointsRef = useRef(points);
    const selectedRef = useRef(selected);
    useEffect(() => {
        onEventsPressRef.current = onEventsPress;
        pointsRef.current = points;
        selectedRef.current = selected;
    }, [onEventsPress, points, selected]);

    // Рамка нужна только в момент создания карты, а массив у неё каждый рендер
    // новый. Через ref он не попадает в зависимости и не пересоздаёт карту;
    // в зависимостях — строковый ключ, который меняется только по существу.
    const boundsRef = useRef(bounds);
    boundsRef.current = bounds;
    const boundsKey = bounds ? JSON.stringify(bounds) : '';

    // Стиль приходит не сразу: он скачивается и правится (подписи, границы).
    // Пока его нет, карта не создаётся — иначе она построилась бы на исходном
    // стиле и её пришлось бы пересоздавать поверх уже показанного кадра.
    const mapStyle = useMapStyle(isDark);

    useEffect(() => {
        const container = containerRef.current as unknown as HTMLElement | null;
        if (!container || !mapStyle) return;

        const map = new MapLibreMap({
            container,
            // maplibre-gl тянет свою копию style-spec, и её типы расходятся с
            // той, что идёт с нативной обёрткой. Сам стиль один и тот же.
            style: mapStyle.style as StyleSpecification | string,
            center: INITIAL_VIEW.center,
            zoom: INITIAL_VIEW.zoom,
            // Как и на нативе: убираем встроенный блок копирайта, а само
            // указание авторства выносим строкой на экран — оно обязательно.
            attributionControl: false,
        });

        // Без жестов, но с нажатиями: `interactive: false` у maplibre-gl
        // выключил бы и клики по точкам, поэтому жесты гасятся по одному.
        if (!interactive) {
            map.dragPan.disable();
            map.scrollZoom.disable();
            map.boxZoom.disable();
            map.dragRotate.disable();
            map.keyboard.disable();
            map.doubleClickZoom.disable();
            map.touchZoomRotate.disable();
            map.touchPitch.disable();
        }

        // Камеру ставим до первого кадра — не анимацией: иначе карта успевает
        // показать вид по умолчанию и только потом перелетает к человеку.
        const initialBounds = boundsRef.current;
        if (initialBounds) {
            if (isSinglePoint(initialBounds)) {
                map.jumpTo({ center: initialBounds[0], zoom: SINGLE_POINT_ZOOM });
            } else {
                map.fitBounds(initialBounds, { padding: BOUNDS_PADDING, animate: false });
            }
        }
        mapRef.current = map;

        const layers = buildLayers(
            theme.text,
            theme.background,
            mapStyle.font,
            KIND_COLORS[isDark ? 'dark' : 'light'],
            selectedRef.current
        );

        map.on('load', () => {
            map.addSource(SOURCE_ID, {
                type: 'geojson',
                data: toFeatureCollection(pointsRef.current),
                ...CLUSTER_OPTIONS,
            });

            // Порядок как на нативе: обводка выбранных под точками, число на
            // кластере — поверх всего.
            map.addLayer({ id: CLUSTER_LAYER_ID, source: SOURCE_ID, ...layers.clusters });
            map.addLayer({ id: SELECTED_LAYER_ID, source: SOURCE_ID, ...layers.selection });
            map.addLayer({ id: POINT_LAYER_ID, source: SOURCE_ID, ...layers.points });
            map.addLayer({ id: CLUSTER_COUNT_LAYER_ID, source: SOURCE_ID, ...layers.clusterCount });

            // Кластер — список событий, а не повод приблизиться: точки внутри
            // могут не разойтись ни на каком зуме (вся Москва — одна точка).
            map.on('click', CLUSTER_LAYER_ID, (event: MapLayerMouseEvent) => {
                const properties = event.features?.[0]?.properties;
                if (properties?.cluster_id == null) return;

                const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
                source
                    ?.getClusterLeaves(properties.cluster_id, properties.point_count, 0)
                    .then((leaves) => {
                        const ids = leaves.map(featureId).filter((id) => id !== null);
                        if (ids.length > 0) onEventsPressRef.current?.(ids);
                    })
                    .catch(() => { });
            });

            map.on('click', POINT_LAYER_ID, (event: MapLayerMouseEvent) => {
                const feature = event.features?.[0];
                const id = feature ? featureId(feature) : null;
                if (id !== null) onEventsPressRef.current?.(idsAtSamePlace(pointsRef.current, id));
            });

            for (const layerId of [CLUSTER_LAYER_ID, POINT_LAYER_ID]) {
                map.on('mouseenter', layerId, () => {
                    if (onEventsPressRef.current) map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', layerId, () => {
                    map.getCanvas().style.cursor = '';
                });
            }
        });

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // Смена темы меняет подложку целиком — карту проще пересоздать, чем
        // переносить слои на новый стиль вручную.
    }, [mapStyle, isDark, theme.text, theme.background, interactive, boundsKey]);

    // Данные обновляются отдельно от создания карты: точек может ещё не быть
    // в момент монтирования, и пересоздавать карту ради них не нужно.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const apply = () => {
            const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
            source?.setData(toFeatureCollection(points));
        };

        if (map.isStyleLoaded() && map.getSource(SOURCE_ID)) apply();
        else map.once('idle', apply);
    }, [points]);

    // Выделение — это только фильтр слоя обводки, его можно поменять на месте.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const apply = () => {
            if (!map.getLayer(SELECTED_LAYER_ID)) return;
            // Типы style-spec у maplibre-gl свои (см. выше), фильтр тот же.
            map.setFilter(SELECTED_LAYER_ID, selectionFilter(selected ?? []) as FilterSpecification);
        };

        if (map.isStyleLoaded() && map.getLayer(SELECTED_LAYER_ID)) apply();
        else map.once('idle', apply);
    }, [selected]);

    return <View ref={containerRef} style={styles.map} />;
}

const styles = StyleSheet.create({
    map: {
        flex: 1,
    },
});
