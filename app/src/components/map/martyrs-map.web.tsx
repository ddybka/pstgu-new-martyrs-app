import {
    Map as MapLibreMap,
    setWorkerUrl,
    type GeoJSONSource,
    type MapLayerMouseEvent,
    type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import 'maplibre-gl/dist/maplibre-gl.css';

import {
    BOUNDS_PADDING,
    CLUSTER_COUNT_LAYER_ID,
    CLUSTER_LAYER_ID,
    CLUSTER_OPTIONS,
    INITIAL_VIEW,
    POINT_LAYER_ID,
    SINGLE_POINT_ZOOM,
    SOURCE_ID,
    buildLayers,
    isSinglePoint,
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
    onPersonPress,
    onPress,
}: MartyrsMapProps) {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();

    const containerRef = useRef<ComponentRef<typeof View>>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    // Колбэк держим в ref: иначе каждый новый onPersonPress пересоздавал бы
    // карту вместе со всем её состоянием (позицией, зумом).
    const onPersonPressRef = useRef(onPersonPress);
    onPersonPressRef.current = onPersonPress;

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
            style: mapStyle as StyleSpecification | string,
            center: INITIAL_VIEW.center,
            zoom: INITIAL_VIEW.zoom,
            // Как и на нативе: убираем встроенный блок копирайта, а само
            // указание авторства выносим строкой на экран — оно обязательно.
            attributionControl: false,
            interactive,
        });

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

        const layers = buildLayers(theme.text, theme.background);

        map.on('load', () => {
            map.addSource(SOURCE_ID, {
                type: 'geojson',
                data: toFeatureCollection([]),
                ...CLUSTER_OPTIONS,
            });

            map.addLayer({ id: CLUSTER_LAYER_ID, source: SOURCE_ID, ...layers.clusters });
            map.addLayer({ id: CLUSTER_COUNT_LAYER_ID, source: SOURCE_ID, ...layers.clusterCount });
            map.addLayer({ id: POINT_LAYER_ID, source: SOURCE_ID, ...layers.points });

            map.on('click', CLUSTER_LAYER_ID, (event: MapLayerMouseEvent) => {
                const feature = event.features?.[0];
                if (!feature || feature.geometry.type !== 'Point') return;

                const clusterId = feature.properties?.cluster_id;
                if (clusterId == null) return;

                const center = feature.geometry.coordinates as [number, number];
                const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
                source?.getClusterExpansionZoom(clusterId).then((zoom) => {
                    map.easeTo({ center, zoom, duration: 400 });
                });
            });

            map.on('click', POINT_LAYER_ID, (event: MapLayerMouseEvent) => {
                const number = event.features?.[0]?.properties?.number;
                if (typeof number === 'number') onPersonPressRef.current?.(number);
            });

            for (const layerId of [CLUSTER_LAYER_ID, POINT_LAYER_ID]) {
                map.on('mouseenter', layerId, () => {
                    map.getCanvas().style.cursor = 'pointer';
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
    }, [mapStyle, theme.text, theme.background, interactive, boundsKey]);

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

    const map = <View ref={containerRef} style={styles.map} />;

    // Неинтерактивная карта — картинка со ссылкой: нажатие ловится поверх всей
    // карты, а не отдельными точками.
    if (!interactive && onPress) {
        return (
            <Pressable onPress={onPress} style={styles.map}>
                {map}
            </Pressable>
        );
    }

    return map;
}

const styles = StyleSheet.create({
    map: {
        flex: 1,
    },
});
