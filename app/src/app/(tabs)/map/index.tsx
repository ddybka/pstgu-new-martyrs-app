import { router, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { Suspense, lazy, useMemo, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockLoading } from '@/components/block-loading';
import { EventsPanel } from '@/components/map/events-panel';
import { KindFilter } from '@/components/map/kind-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebHeaderInset } from '@/constants/theme';
import { boundsOf, useMapPoints, usePersonMapPoints } from '@/hooks/use-map-points';
import { normalizePersonNumber } from '@/hooks/use-person';

const MartyrsMap = lazy(() => import('@/components/map/martyrs-map'));

const NO_KINDS: ReadonlySet<string> = new Set();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    const isMissingNativeModule = /TurboModuleRegistry|could not be found/.test(error.message);

    return (
        <ThemedView style={styles.center}>
            <ThemedText>Карта не загрузилась</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                {isMissingNativeModule
                    ? 'Приложение собрано без нативного модуля карты. Нужна пересборка: npx expo run:ios'
                    : error.message}
            </ThemedText>
            <Pressable onPress={retry}>
                <ThemedText type="linkPrimary">Повторить</ThemedText>
            </Pressable>
        </ThemedView>
    );
}

/**
 * Карта событий: каждая точка — событие из биографии в конкретном месте.
 *
 * Нажатие на точку или кластер открывает снизу список этих событий по людям;
 * переключатели сверху прячут и показывают точки по типам.
 */
export default function MapScreen() {
    const { person } = useLocalSearchParams<{ person?: string }>();
    const focusNumber = normalizePersonNumber(person);
    const insets = useSafeAreaInsets();

    const points = useMapPoints();
    const focusPoints = usePersonMapPoints(focusNumber);

    const [hidden, setHidden] = useState(NO_KINDS);
    const [selectedIds, setSelectedIds] = useState<number[] | null>(null);

    // id точки — её позиция в снимке, и после фонового обновления точек
    // старые id указывали бы на чужие события. Выбор сбрасывается.
    const [lastPoints, setLastPoints] = useState(points);
    if (lastPoints !== points) {
        setLastPoints(points);
        setSelectedIds(null);
    }

    const visible = useMemo(
        () => (hidden.size === 0 ? points : points.filter((point) => !hidden.has(point.kind))),
        [points, hidden]
    );

    const counts = useMemo(() => {
        const result: Record<string, number> = {};
        for (const point of points) result[point.kind] = (result[point.kind] ?? 0) + 1;
        return result;
    }, [points]);

    const selectedEvents = useMemo(() => {
        if (!selectedIds) return [];
        const wanted = new Set(selectedIds);
        return points.filter((point) => wanted.has(point.id));
    }, [points, selectedIds]);

    // Пришли со страницы новомученика — его точки обведены, пока не выбрано
    // что-то другое.
    const focusIds = useMemo(() => focusPoints.map((point) => point.id), [focusPoints]);

    const isClient = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false
    );

    if (!isClient) return <BlockLoading />;

    // Нижний край: на нативе карта уходит под плавающую панель вкладок,
    // в вебе панели внизу нет — шапка у него сверху и тоже плавающая.
    const bottom =
        Platform.OS === 'web'
            ? Spacing.three
            : BottomTabInset + (Platform.OS === 'ios' ? insets.bottom : 0) + Spacing.two;

    return (
        <ThemedView style={styles.container}>
            <Suspense fallback={<BlockLoading />}>
                <MartyrsMap
                    points={visible}
                    bounds={boundsOf(focusPoints)}
                    selected={selectedIds ?? focusIds}
                    onEventsPress={setSelectedIds}
                />
            </Suspense>

            <KindFilter
                hidden={hidden}
                onChange={setHidden}
                counts={counts}
                inset={Platform.OS === 'web' ? 0 : Spacing.three}
                style={[styles.filter, Platform.OS === 'web' && styles.filterWeb]}
            />

            {selectedEvents.length > 0 && (
                <EventsPanel
                    events={selectedEvents}
                    onClose={() => setSelectedIds(null)}
                    onOpenPerson={(number, eventIds) =>
                        router.push({
                            pathname: '/person/[id]',
                            params: { id: number, events: eventIds.join(',') },
                        })
                    }
                    style={[styles.panel, Platform.OS === 'web' && styles.panelWeb, { bottom }]}
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filter: {
        position: 'absolute',
        top: Spacing.two,
        left: 0,
        right: 0,
        flexGrow: 0,
    },
    // В вебе ряд стоит ровно под плавающей шапкой: та же ширина (не больше
    // MaxContentWidth), те же поля от краёв окна, по центру. Края переключателей
    // совпадают с краями шапки — см. tabListContainer в app-tabs.web.
    filterWeb: {
        top: WebHeaderInset,
        left: Spacing.three,
        right: Spacing.three,
        maxWidth: MaxContentWidth,
        marginHorizontal: 'auto',
    },
    panelWeb: {
        left: Spacing.three,
        right: Spacing.three,
    },
    panel: {
        position: 'absolute',
        left: Spacing.two,
        right: Spacing.two,
        maxHeight: '55%',
        maxWidth: MaxContentWidth,
        alignSelf: 'center',
        marginHorizontal: 'auto',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
    },
    hint: {
        textAlign: 'center',
    },
});
