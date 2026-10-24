import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';

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
    onPersonPress,
    onPress,
}: MartyrsMapProps) {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const mapStyle = useMapStyle(isDark);
    const cameraRef = useRef<React.ComponentRef<typeof Camera>>(null);
    const sourceRef = useRef<React.ComponentRef<typeof GeoJSONSource>>(null);

    const data = useMemo(() => toFeatureCollection(points), [points]);
    const layers = useMemo(
        () => buildLayers(theme.text, theme.background),
        [theme.text, theme.background]
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
    if (!mapStyle) return null;

    const map = (
        <Map
            style={styles.map}
            mapStyle={mapStyle}
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
            <Camera ref={cameraRef} initialViewState={initialViewState} />

            <GeoJSONSource
                id={SOURCE_ID}
                ref={sourceRef}
                data={data}
                {...CLUSTER_OPTIONS}
                onPress={async (event) => {
                    if (!interactive) return;

                    const feature = event.nativeEvent.features[0];
                    if (!feature) return;

                    const properties = feature.properties ?? {};

                    // Кластер не открывает список, а разворачивается: источник
                    // сам считает, на каком зуме он распадётся на части.
                    if (properties.cluster) {
                        const zoom = await sourceRef.current
                            ?.getClusterExpansionZoom(properties.cluster_id)
                            .catch(() => null);

                        if (zoom == null || feature.geometry.type !== 'Point') return;

                        cameraRef.current?.easeTo({
                            center: feature.geometry.coordinates as [number, number],
                            zoom,
                            duration: 400,
                        });
                        return;
                    }

                    if (typeof properties.number === 'number') onPersonPress?.(properties.number);
                }}>
                <Layer id={CLUSTER_LAYER_ID} {...layers.clusters} />
                <Layer id={CLUSTER_COUNT_LAYER_ID} {...layers.clusterCount} />
                <Layer id={POINT_LAYER_ID} {...layers.points} />
            </GeoJSONSource>
        </Map>
    );

    // Неинтерактивная карта — это картинка со ссылкой, и нажатие на неё должно
    // ловиться поверх всей карты, а не отдельными точками.
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
