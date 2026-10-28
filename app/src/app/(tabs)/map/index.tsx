import { router, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockLoading } from '@/components/block-loading';
import { EventsPanel } from '@/components/map/events-panel';
import { FilterChip, KindFilter } from '@/components/map/kind-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Dropdown } from '@/components/ui/dropdown';
import { BottomTabInset, ButtonRadius, MaxContentWidth, Spacing, SurfaceShadow, WebHeaderInset } from '@/constants/theme';
import { boundsOf, useMapPoints, usePersonMapPoints } from '@/hooks/use-map-points';
import { normalizePersonNumber } from '@/hooks/use-person';
import { useTheme } from '@/hooks/use-theme';
import {
    PERIODS,
    inPeriod,
    isCanonizedTitle,
    queryWords,
    searchPoints,
    type PeriodValue,
} from '@/utils/map-search';

const MartyrsMap = lazy(() => import('@/components/map/martyrs-map'));

const NO_KINDS: ReadonlySet<string> = new Set();
const NO_IDS: readonly number[] = [];

/** Пауза после ввода, прежде чем карта полетит к найденному. */
const FOCUS_DELAY_MS = 500;

const SEARCH_HEIGHT = 40;

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
 * Нажатие на точку или кластер открывает снизу список этих событий по людям.
 * Сверху — поиск и фильтры. Поиск — как общий: по ФИО и по событиям (текст,
 * место, датировка); на карте остаются только найденные точки, камера
 * перелетает к ним, а снизу открывается их список. Фильтры — по типу события,
 * по периоду и «только прославленные».
 */
export default function MapScreen() {
    const { person } = useLocalSearchParams<{ person?: string }>();
    const focusNumber = normalizePersonNumber(person);
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { width: windowWidth } = useWindowDimensions();
    // На iOS шапка прозрачная и карта начинается под ней — фильтр ставится
    // ниже шапки. На Android шапка сплошная, и карта начинается после неё.
    const headerHeight = useHeaderHeight();
    const filterTop = Platform.OS === 'ios' ? headerHeight + Spacing.two : undefined;

    const points = useMapPoints();
    const focusPoints = usePersonMapPoints(focusNumber);

    const [hidden, setHidden] = useState(NO_KINDS);
    const [period, setPeriod] = useState<PeriodValue>('all');
    const [canonizedOnly, setCanonizedOnly] = useState(false);
    const [query, setQuery] = useState('');
    // Перебор восьми тысяч точек — не на каждую букву в том же кадре, что и
    // ввод: поле отвечает сразу, а карта догоняет.
    const deferredQuery = useDeferredValue(query);
    const words = useMemo(() => queryWords(deferredQuery), [deferredQuery]);
    const searching = words.length > 0;
    const [resultsClosed, setResultsClosed] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[] | null>(null);
    const [focus, setFocus] = useState<{ bounds: [[number, number], [number, number]]; key: number } | null>(null);

    // id точки — её позиция в снимке, и после фонового обновления точек
    // старые id указывали бы на чужие события. Выбор сбрасывается.
    const [lastPoints, setLastPoints] = useState(points);
    if (lastPoints !== points) {
        setLastPoints(points);
        setSelectedIds(null);
    }

    // Всё, кроме типа: по этому списку считаются числа у переключателей типов.
    const filtered = useMemo(() => {
        const found = searching ? searchPoints(points, words) : null;
        if (!found && period === 'all' && !canonizedOnly) return points;

        return points.filter(
            (point) =>
                (!found || found.has(point.id)) &&
                inPeriod(point, period) &&
                (!canonizedOnly || isCanonizedTitle(point.title))
        );
    }, [points, words, searching, period, canonizedOnly]);

    const visible = useMemo(
        () => (hidden.size === 0 ? filtered : filtered.filter((point) => !hidden.has(point.kind))),
        [filtered, hidden]
    );

    const counts = useMemo(() => {
        const result: Record<string, number> = {};
        for (const point of filtered) result[point.kind] = (result[point.kind] ?? 0) + 1;
        return result;
    }, [filtered]);

    // Новый запрос — список найденного снова открыт, а карта перелетает к
    // найденному, когда ввод притих.
    const [lastWords, setLastWords] = useState(words);
    if (lastWords !== words) {
        setLastWords(words);
        setResultsClosed(false);
        setSelectedIds(null);
    }

    const resultBounds = useMemo(() => (searching ? boundsOf(visible) : null), [searching, visible]);
    const resultKey = resultBounds ? JSON.stringify(resultBounds) : '';
    useEffect(() => {
        if (!resultKey) return;
        const timer = setTimeout(
            () => setFocus((current) => ({ bounds: JSON.parse(resultKey), key: (current?.key ?? 0) + 1 })),
            FOCUS_DELAY_MS
        );
        return () => clearTimeout(timer);
    }, [resultKey]);

    const selectedEvents = useMemo(() => {
        if (!selectedIds) return [];
        const wanted = new Set(selectedIds);
        return points.filter((point) => wanted.has(point.id));
    }, [points, selectedIds]);

    // Снизу — выбранное на карте, а если ничего не выбрано — найденное.
    const showResults = selectedEvents.length === 0 && searching && !resultsClosed && visible.length > 0;
    const panelEvents = showResults ? visible : selectedEvents;

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

    const edge = Platform.OS === 'web' ? webHeaderEdge(windowWidth) : Spacing.three;
    const periodLabel = PERIODS.find((item) => item.value === period)?.label ?? PERIODS[0].label;
    const nothingFound = (searching || period !== 'all' || canonizedOnly) && visible.length === 0;

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
                        selected={selectedIds ?? (searching ? NO_IDS : focusIds)}
                        onEventsPress={setSelectedIds}
                        focus={focus}
                    />
                </Suspense>
            </EdgeEffectHost>

            <View
                pointerEvents="box-none"
                style={[styles.filter, Platform.OS === 'web' && styles.filterWeb, filterTop !== undefined && { top: filterTop }]}>
                <View style={[styles.searchRow, { paddingHorizontal: edge }]}>
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Поиск по ФИО, местам и событиям"
                        placeholderTextColor={theme.textSecondary}
                        autoCorrect={false}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                        accessibilityLabel="Поиск по карте"
                        style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundRaised }]}
                    />
                    {query !== '' && Platform.OS !== 'ios' && (
                        <Pressable
                            onPress={() => setQuery('')}
                            hitSlop={Spacing.two}
                            accessibilityRole="button"
                            accessibilityLabel="Очистить поиск"
                            style={[styles.clear, { right: edge + Spacing.three }]}>
                            <ThemedText themeColor="textSecondary" style={styles.clearText}>
                                ✕
                            </ThemedText>
                        </Pressable>
                    )}
                </View>

                <KindFilter hidden={hidden} onChange={setHidden} counts={counts} inset={edge} style={styles.chips}>
                    <Dropdown
                        options={PERIODS.map(({ value, label }) => ({ value, label }))}
                        value={period}
                        onSelect={setPeriod}
                        accessibilityLabel={`Период: ${periodLabel}`}>
                        <FilterChip label={periodLabel} on={period !== 'all'} dropdown />
                    </Dropdown>
                    <FilterChip
                        label="Прославленные"
                        on={canonizedOnly}
                        onPress={() => setCanonizedOnly((value) => !value)}
                        accessibilityLabel={`Только прославленные: ${canonizedOnly ? 'да' : 'нет'}`}
                    />
                </KindFilter>

                {nothingFound && (
                    <View style={[styles.notice, { marginHorizontal: edge, backgroundColor: theme.backgroundRaised }]}>
                        <ThemedText type="small" themeColor="textSecondary">
                            Ничего не нашлось — измените запрос или фильтры
                        </ThemedText>
                    </View>
                )}
            </View>

            {panelEvents.length > 0 && (
                <EventsPanel
                    key={showResults ? 'found' : 'selected'}
                    events={panelEvents}
                    found={showResults}
                    onClose={() => (showResults ? setResultsClosed(true) : setSelectedIds(null))}
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
        gap: Spacing.one,
    },
    // Поля — те же, что у ленты фильтров: в вебе поле стоит ровно под шапкой.
    searchRow: {
        paddingTop: Spacing.one,
    },
    chips: {
        flexGrow: 0,
    },
    search: {
        height: SEARCH_HEIGHT,
        paddingHorizontal: Spacing.three,
        paddingRight: Spacing.five,
        borderRadius: ButtonRadius * 2,
        fontSize: 16,
        boxShadow: SurfaceShadow,
    },
    clear: {
        position: 'absolute',
        top: Spacing.one,
        height: SEARCH_HEIGHT,
        justifyContent: 'center',
    },
    clearText: {
        fontSize: 15,
    },
    notice: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: ButtonRadius * 2,
        boxShadow: SurfaceShadow,
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
