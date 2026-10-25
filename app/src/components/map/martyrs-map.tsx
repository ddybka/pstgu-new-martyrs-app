import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

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
    toFeatureCollection,
    type MartyrsMapProps,
} from './map-config';
import { useMapStyle } from './map-style';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Карта для iOS и Android. Веб-вариант — в `martyrs-map.web.tsx`.
 *
 * Кластеризацию считает сам источник (внутри supercluster), поэтому «один
 * новомученик или группа» — это не наша логика, а разные слои по фильтру
 * `has point_count`.
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
    const mapStyle = useMapStyle(isDark);
    const sourceRef = useRef<React.ComponentRef<typeof GeoJSONSource>>(null);

    const data = useMemo(() => toFeatureCollection(points), [points]);
    const layers = useMemo(
        () =>
            mapStyle &&
            buildLayers(
                theme.text,
                theme.background,
                mapStyle.font,
                KIND_COLORS[isDark ? 'dark' : 'light'],
                selected
            ),
        [theme.text, theme.background, mapStyle, isDark, selected]
    );

    // Камера ставится один раз, начальным состоянием: если задавать её пропсом
    // на каждый кадр, любое движение пальцем тут же откатывалось бы назад.
    const initialViewState = useMemo(() => {
        if (!bounds) return { center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom };

        if (isSinglePoint(bounds)) {
            return { center: bounds[0], zoom: SINGLE_POINT_ZOOM };
        }

        // Порядок в LngLatBounds здесь плоский: [запад, юг, восток, север].
        const [[west, south], [east, north]] = bounds;

        return {
            bounds: [west, south, east, north] as [number, number, number, number],
            padding: {
                top: BOUNDS_PADDING,
                right: BOUNDS_PADDING,
                bottom: BOUNDS_PADDING,
                left: BOUNDS_PADDING,
            },
        };
    }, [bounds]);

    // Стиль скачивается и правится (подписи, границы) — до этого карту рисовать
    // нечем: с временным стилем она моргнула бы чужим оформлением.
    if (!mapStyle || !layers) return null;

    return (
        <Map
            style={styles.map}
            mapStyle={mapStyle.style}
            // Встроенные «украшения» карты выключены: кнопка «i» и логотип
            // MapLibre. Указание авторства при этом остаётся обязательным —
            // подложка на данных OpenStreetMap под ODbL, — поэтому оно
            // вынесено обычной строкой на экран карты (см. ATTRIBUTION_TEXT).
            attribution={false}
            logo={false}
            compass={false}
            // На iOS MapLibre по умолчанию рисует не чаще 60 кадров в секунду,
            // даже на экранах ProMotion. Выше частоты экрана всё равно не будет.
            preferredFramesPerSecond={120}
            dragPan={interactive}
            touchZoom={interactive}
            doubleTapZoom={interactive}
            doubleTapHoldZoom={interactive}
            touchRotate={interactive}
            touchPitch={interactive}>
            <Camera initialViewState={initialViewState} />

            <GeoJSONSource
                id={SOURCE_ID}
                ref={sourceRef}
                data={data}
                {...CLUSTER_OPTIONS}
                onPress={async (event) => {
                    if (!onEventsPress) return;

                    const feature = event.nativeEvent.features[0];
                    if (!feature) return;

                    const properties = feature.properties ?? {};

                    // Кластер — это список событий, а не повод приблизиться:
                    // точки внутри него могут не разойтись ни на каком зуме
                    // (вся Москва в данных — одна точка).
                    if (properties.cluster) {
                        const leaves = await sourceRef.current
                            ?.getClusterLeaves(properties.cluster_id, properties.point_count, 0)
                            .catch(() => null);
                        if (!leaves) return;

                        const ids = leaves.map(featureId).filter((id) => id !== null);
                        if (ids.length > 0) onEventsPress(ids);
                        return;
                    }

                    const id = featureId(feature);
                    if (id !== null) onEventsPress(idsAtSamePlace(points, id));
                }}>
                <Layer id={CLUSTER_LAYER_ID} {...layers.clusters} />
                <Layer id={SELECTED_LAYER_ID} {...layers.selection} />
                <Layer id={POINT_LAYER_ID} {...layers.points} />
                <Layer id={CLUSTER_COUNT_LAYER_ID} {...layers.clusterCount} />
            </GeoJSONSource>
        </Map>
    );
}

const styles = StyleSheet.create({
    map: {
        flex: 1,
    },
});
