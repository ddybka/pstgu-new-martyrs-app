import { Camera, GeoJSONSource, Images, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { PIE_SIZE, encodePng, parsePieName, pieImageExpression, renderPie } from './cluster-pie';
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
    toGeoJsonString,
    type MartyrsMapProps,
} from './map-config';
import { useMapStyle } from './map-style';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** Сколько ждать после последней новой картинки кластера, прежде чем разложить слой заново. */
const PIE_RELAYOUT_DELAY_MS = 150;

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
    const mapStyle = useMapStyle(isDark);
    const sourceRef = useRef<React.ComponentRef<typeof GeoJSONSource>>(null);
    const cameraRef = useRef<CameraRef>(null);
    const [pies, setPies] = useState<Record<string, string>>({});

    // Нативный MapLibre, не найдя картинку кластера, раскладывает тайл без
    // неё и сам к ней не возвращается: дорисованная позже картинка появилась
    // бы только на новых тайлах, а на остальных остался бы круг-подложка.
    // Поэтому, когда новые картинки переданы карте и запросы утихли, слой
    // раскладывается заново (новая версия выражения имени) — теперь все
    // картинки на месте, и карта берёт их сразу.
    const [pieVersion, setPieVersion] = useState(0);
    const pieCount = Object.keys(pies).length;
    useEffect(() => {
        if (pieCount === 0) return;
        const timer = setTimeout(() => setPieVersion((value) => value + 1), PIE_RELAYOUT_DELAY_MS);
        return () => clearTimeout(timer);
    }, [pieCount]);

    const data = useMemo(() => toGeoJsonString(points), [points]);
    const layers = useMemo(
        () =>
            mapStyle &&
            buildLayers(
                theme.text,
                theme.background,
                mapStyle.font,
                KIND_COLORS[isDark ? 'dark' : 'light'],
                isDark ? 'dark' : 'light'
            ),
        [theme.text, theme.background, mapStyle, isDark]
    );
    const pieLayout = useMemo(
        () =>
            layers && {
                ...layers.clusterPie.layout,
                'icon-image': pieImageExpression(isDark ? 'dark' : 'light', pieVersion),
            },
        [layers, isDark, pieVersion]
    );
    const selectedFilter = useMemo(() => selectionFilter(selected ?? []), [selected]);

    const initialViewState = useMemo(() => {
        if (!bounds) return { center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom };

        if (isSinglePoint(bounds)) {
            return { center: bounds[0], zoom: SINGLE_POINT_ZOOM };
        }

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

    useEffect(() => {
        if (!focus) return;
        const [[west, south], [east, north]] = focus.bounds;

        if (isSinglePoint(focus.bounds)) {
            cameraRef.current?.flyTo({ center: focus.bounds[0], zoom: SINGLE_POINT_ZOOM, duration: 800 });
        } else {
            cameraRef.current?.fitBounds([west, south, east, north], {
                padding: { top: BOUNDS_PADDING * 3, right: BOUNDS_PADDING, bottom: BOUNDS_PADDING * 4, left: BOUNDS_PADDING },
                duration: 800,
            });
        }
    }, [focus]);

    const addPie = (name: string) => {
        if (pies[name]) return;
        const pie = parsePieName(name);
        if (!pie) return;

        const background = Colors[pie.scheme].background;
        const uri = encodePng(renderPie(pie.shares, KIND_COLORS[pie.scheme], background), PIE_SIZE, PIE_SIZE);
        setPies((prev) => (prev[name] ? prev : { ...prev, [name]: uri }));
    };

    if (!mapStyle || !layers) return null;

    return (
        <Map
            style={styles.map}
            mapStyle={mapStyle.style}
            attribution={false}
            logo={false}
            compass={false}
            preferredFramesPerSecond={120}
            dragPan={interactive !== false}
            touchZoom={interactive !== false}
            doubleTapZoom={interactive !== false}
            doubleTapHoldZoom={interactive !== false}
            touchRotate={interactive === true}
            touchPitch={interactive === true}>
            <Camera ref={cameraRef} initialViewState={initialViewState} />

            <Images images={pies} onImageMissing={(event) => addPie(event.nativeEvent.image)} />

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
                <Layer id={CLUSTER_PIE_LAYER_ID} {...layers.clusterPie} layout={pieLayout ?? layers.clusterPie.layout} />
                <Layer id={SELECTED_LAYER_ID} {...layers.selection} filter={selectedFilter} />
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
