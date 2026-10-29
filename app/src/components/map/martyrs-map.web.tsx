import {
    Map as MapLibreMap,
    setWorkerUrl,
    type FilterSpecification,
    type GeoJSONSource,
    type MapLayerMouseEvent,
    type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';


import {
    BOUNDS_PADDING,
    CLUSTER_COUNT_LAYER_ID,
    CLUSTER_LAYER_ID,
    CLUSTER_OPTIONS,
    CLUSTER_PIE_LAYER_ID,
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
    type MapBounds,
    type MartyrsMapProps,
} from './map-config';
import { PIE_SIZE, parsePieName, renderPie } from './cluster-pie';
import { useMapStyle } from './map-style';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

/**
 * Стили maplibre-gl подключаются, только когда карту открыли.
 *
 * Импорт .css статическая сборка поднимала в <head> каждой страницы, и
 * десять килобайт стилей карты задерживали первую отрисовку и главной, и
 * биографий. Файл кладёт в public/maplibre тот же скрипт, что и воркер.
 * Карта создаётся после загрузки стилей: без них холст и подсказки
 * встают не на свои места.
 */
const MAP_CSS_URL = '/maplibre/maplibre-gl.css';
let mapCss: Promise<void> | null = null;
let mapCssReady = false;

function loadMapCss(): Promise<void> {
    mapCss ??= new Promise<void>((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = MAP_CSS_URL;
        // Не загрузились стили — карта всё равно лучше, чем пустое место.
        link.onload = link.onerror = () => {
            mapCssReady = true;
            resolve();
        };
        // Первыми в <head>: правила подсказки поверх карты в GLOBAL_CSS должны
        // их перекрывать.
        document.head.prepend(link);
    });
    return mapCss;
}

const COOPERATIVE_LOCALE = {
    'CooperativeGesturesHandler.WindowsHelpText': 'Чтобы изменить масштаб, прокручивайте с зажатой клавишей Ctrl',
    'CooperativeGesturesHandler.MacHelpText': 'Чтобы изменить масштаб, прокручивайте с зажатой клавишей ⌘',
    'CooperativeGesturesHandler.MobileHelpText': 'Двигайте карту двумя пальцами',
};

export default function MartyrsMap({
    points,
    bounds,
    interactive = true,
    onEventsPress,
    selected,
    focus,
}: MartyrsMapProps) {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();

    const containerRef = useRef<ComponentRef<typeof View>>(null);
    const [cssReady, setCssReady] = useState(mapCssReady);

    useEffect(() => {
        if (cssReady) return;
        let active = true;
        void loadMapCss().then(() => {
            if (active) setCssReady(true);
        });
        return () => {
            active = false;
        };
    }, [cssReady]);
    const mapRef = useRef<MapLibreMap | null>(null);

    const onEventsPressRef = useRef(onEventsPress);
    const pointsRef = useRef(points);
    const selectedRef = useRef(selected);
    useEffect(() => {
        onEventsPressRef.current = onEventsPress;
        pointsRef.current = points;
        selectedRef.current = selected;
    }, [onEventsPress, points, selected]);

    const boundsKey = bounds ? JSON.stringify(bounds) : '';

    const mapStyle = useMapStyle(isDark);

    useEffect(() => {
        const container = containerRef.current as unknown as HTMLElement | null;
        if (!container || !mapStyle || !cssReady) return;

        const map = new MapLibreMap({
            container,
            style: mapStyle.style as StyleSpecification | string,
            center: INITIAL_VIEW.center,
            zoom: INITIAL_VIEW.zoom,
            attributionControl: false,
            cooperativeGestures: interactive === 'embedded',
            locale: COOPERATIVE_LOCALE,
        });

        if (interactive === 'embedded') {
            map.dragRotate.disable();
            map.touchZoomRotate.disableRotation();
            map.touchPitch.disable();
            map.keyboard.disableRotation();
        }

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

        const initialBounds = boundsKey ? (JSON.parse(boundsKey) as MapBounds) : null;
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
            isDark ? 'dark' : 'light',
            selectedRef.current
        );

        map.on('styleimagemissing', ({ id }) => {
            const pie = parsePieName(id);
            if (!pie || map.hasImage(id)) return;

            const data = renderPie(pie.shares, KIND_COLORS[pie.scheme], Colors[pie.scheme].background);
            map.addImage(id, { width: PIE_SIZE, height: PIE_SIZE, data });
        });

        map.on('load', () => {
            map.addSource(SOURCE_ID, {
                type: 'geojson',
                data: toFeatureCollection(pointsRef.current),
                ...CLUSTER_OPTIONS,
            });

            map.addLayer({ id: CLUSTER_LAYER_ID, source: SOURCE_ID, ...layers.clusters });
            map.addLayer({ id: CLUSTER_PIE_LAYER_ID, source: SOURCE_ID, ...layers.clusterPie });
            map.addLayer({ id: SELECTED_LAYER_ID, source: SOURCE_ID, ...layers.selection });
            map.addLayer({ id: POINT_LAYER_ID, source: SOURCE_ID, ...layers.points });
            map.addLayer({ id: CLUSTER_COUNT_LAYER_ID, source: SOURCE_ID, ...layers.clusterCount });

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
    }, [mapStyle, isDark, theme.text, theme.background, interactive, boundsKey, cssReady]);

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

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !focus) return;

        if (isSinglePoint(focus.bounds)) {
            map.flyTo({ center: focus.bounds[0], zoom: SINGLE_POINT_ZOOM, duration: 800 });
        } else {
            map.fitBounds(focus.bounds, {
                padding: { top: BOUNDS_PADDING * 3, right: BOUNDS_PADDING, bottom: BOUNDS_PADDING * 4, left: BOUNDS_PADDING },
                duration: 800,
            });
        }
    }, [focus]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const apply = () => {
            if (!map.getLayer(SELECTED_LAYER_ID)) return;
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
