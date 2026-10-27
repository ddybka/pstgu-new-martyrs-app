import { router, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Suspense, lazy, useMemo, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockLoading } from '@/components/block-loading';
import { EventsPanel } from '@/components/map/events-panel';
import { KindFilter } from '@/components/map/kind-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebHeaderInset } from '@/constants/theme';
import { boundsOf, useMapPoints, usePersonMapPoints } from '@/hooks/use-map-points';
import { normalizePersonNumber } from '@/hooks/use-person';

import { Metadata } from 'expo-router/server';
import { SITE_URL } from '@/constants/site';

export function generateMetadata(): Metadata {
    const title = 'Карта мест новомучеников.';
    const description = 'Карта мест, связанных с новомучениками: события из их биографий на общей карте. Фильтруйте по типам событий и открывайте страницы новомучеников';

    const url = `${SITE_URL}/map`;

    return {
        title,
        description,

        alternates: {
            canonical: url,
        },

        openGraph: {
            title,
            description,
            url,
            siteName: 'Память новомучеников',
            locale: 'ru_RU',
            type: 'website',
        },
    };
}

const MartyrsMap = lazy(() => import('@/components/map/martyrs-map'));

const NO_KINDS: ReadonlySet<string> = new Set();

/** См. комментарий у места использования. На других платформах — просто обёртка. */
function EdgeEffectHost({ children }: { children: React.ReactNode }) {
    if (Platform.OS !== 'ios') return <>{children}</>;

    return (
        <ScrollView
            style={styles.edgeHost}
            contentContainerStyle={styles.edgeHost}
            scrollEnabled={false}
            bounces={false}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustsScrollIndicatorInsets={false}>
            {children}
        </ScrollView>
    );
}

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
    const { width: windowWidth } = useWindowDimensions();
    // На iOS шапка прозрачная и карта начинается под ней — фильтр ставится
    // ниже шапки. На Android шапка сплошная, и карта начинается после неё.
    const headerHeight = useHeaderHeight();
    const filterTop = Platform.OS === 'ios' ? headerHeight + Spacing.two : undefined;

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
    const focusBounds = useMemo(() => boundsOf(focusPoints), [focusPoints]);

    const isClient = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false
    );

    // Точки читаются асинхронно (см. `use-map-points`). Камера ставится по
    // ним один раз, при создании карты, поэтому без точек карту не создаём:
    // иначе по ссылке «на общей карте» она открылась бы не на том человеке.
    if (!isClient || points.length === 0) return <BlockLoading />;

    // Нижний край: на нативе карта уходит под плавающую панель вкладок,
    // в вебе панели внизу нет — шапка у него сверху и тоже плавающая.
    const bottom =
        Platform.OS === 'web'
            ? Spacing.three
            : BottomTabInset + (Platform.OS === 'ios' ? insets.bottom : 0) + Spacing.two;

    return (
        <ThemedView style={styles.container}>
            {/* Неподвижная прокрутка вокруг карты — только ради системного края
                под шапкой на iOS 26 (градиентное «стекло», UIScrollEdgeEffect).
                Его рисует только UIScrollView, и react-native-screens ищет его
                по цепочке первых потомков экрана, — поэтому она первая.
                Прокрутка выключена, и жесты достаются карте; отступы под шапку
                выключены, чтобы карта с самого начала была под ней. */}
            <EdgeEffectHost>
                <Suspense fallback={<BlockLoading />}>
                    <MartyrsMap
                        points={visible}
                        bounds={focusBounds}
                        selected={selectedIds ?? focusIds}
                        onEventsPress={setSelectedIds}
                    />
                </Suspense>
            </EdgeEffectHost>

            <KindFilter
                hidden={hidden}
                onChange={setHidden}
                counts={counts}
                inset={Platform.OS === 'web' ? webHeaderEdge(windowWidth) : Spacing.three}
                style={[styles.filter, Platform.OS === 'web' && styles.filterWeb, filterTop !== undefined && { top: filterTop }]}
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

/**
 * Отступ края плавающей шапки от края окна: поля Spacing.three, а шире
 * MaxContentWidth шапка не растёт и стоит по центру — см. tabListContainer
 * в app-tabs.web.
 */
function webHeaderEdge(windowWidth: number) {
    return Math.max(Spacing.three, (windowWidth - MaxContentWidth) / 2);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    edgeHost: {
        flex: 1,
    },
    filter: {
        position: 'absolute',
        top: Spacing.two,
        left: 0,
        right: 0,
        flexGrow: 0,
    },
    // В вебе лента во всю ширину окна и прокручивается от края до края,
    // а в покое переключатели стоят ровно под шапкой — см. webHeaderEdge.
    filterWeb: {
        top: WebHeaderInset,
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
