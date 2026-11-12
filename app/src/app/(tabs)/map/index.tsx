import { router, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockError } from '@/components/block-error';
import { BlockLoading } from '@/components/block-loading';
import { EventsPanel } from '@/components/map/events-panel';
import { FilterChip, KindFilter } from '@/components/map/kind-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Dropdown } from '@/components/ui/dropdown';
import { BottomTabInset, ButtonRadius, MaxContentWidth, Spacing, SurfaceShadow, WebHeaderInset } from '@/constants/theme';
import { boundsOf, useMapPoints, usePersonMapPoints } from '@/hooks/use-map-points';
import { useIsClient } from '@/hooks/use-is-client';
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

import { Metadata } from 'expo-router/server';
import { SITE_URL } from '@/constants/site';

export function generateMetadata(): Metadata {
    const title = 'Карта мест — Память новомучеников';
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
const NO_IDS: readonly number[] = [];

/** Пауза после ввода, прежде чем карта полетит к найденному. */
const FOCUS_DELAY_MS = 500;

/**
 * Пауза после перелёта к точкам, прежде чем открыть их список. Так сначала
 * видно сам перелёт и точки по центру, а уже потом появляется пояснение.
 */
const FOCUS_PANEL_DELAY_MS = 1200;

/**
 * Поля вокруг точек человека на общей карте. Симметричные — чтобы места
 * оказались ровно по центру экрана, как на мини-карте биографии, но уже:
 * на общей карте нужен более сильный зум, чем на миниатюре.
 */
const PERSON_FOCUS_PADDING = 40;

/** Одна точка на общей карте — ближе, чем на мини-карте биографии. */
const PERSON_FOCUS_SINGLE_ZOOM = 14;

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

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
    // Технический текст ошибки (WebGL, отсутствующий нативный модуль) человеку
    // ничего не даёт: показываем ту же плашку, что и при потере связи, но без
    // разбора причины — только «произошла ошибка» и «Повторить».
    return (
        <BlockError
            title="Карта не загрузилась"
            description="Произошла ошибка"
            onRetry={retry}
        />
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
    const { person, events: focusEvents } = useLocalSearchParams<{ person?: string; events?: string }>();
    const focusNumber = normalizePersonNumber(person);
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { width: windowWidth } = useWindowDimensions();
    // На iOS шапка прозрачная и карта начинается под ней — фильтр ставится
    // ниже шапки. На Android шапка сплошная, и карта начинается после неё.
    const headerHeight = useHeaderHeight();
    const filterTop = Platform.OS === 'ios' ? headerHeight + Spacing.two : undefined;

    const points = useMapPoints();
    const personPoints = usePersonMapPoints(focusNumber);

    // Пришли со страницы новомученика с открытым блоком событий — ведём
    // камеру только к этим точкам. Нет списка событий — ко всем местам
    // человека. Остальные точки карты при этом не прячутся.
    const focusEventIds = useMemo(() => {
        const raw = Array.isArray(focusEvents) ? focusEvents[0] : focusEvents;
        return new Set(
            (raw ?? '')
                .split(',')
                // Пустая строка — это не id 0: без списка событий параметра
                // нет вовсе, и разбирать нечего.
                .filter((part: string) => part.trim() !== '')
                .map(Number)
                .filter((id: number) => Number.isInteger(id))
        );
    }, [focusEvents]);
    const focusPoints = useMemo(() => {
        if (focusEventIds.size === 0) return personPoints;
        const selected = personPoints.filter((point) => focusEventIds.has(point.id));
        return selected.length > 0 ? selected : personPoints;
    }, [personPoints, focusEventIds]);

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
    const [focus, setFocus] = useState<{
        bounds: [[number, number], [number, number]];
        key: number;
        padding?: number;
        singleZoom?: number;
    } | null>(null);

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

    // Приход со страницы новомученика — плавный перелёт к его местам.
    // `bounds` карте не отдаём: иначе она сначала прыгнула бы туда без
    // анимации, и перелёта бы не было видно. Остальные точки остаются на
    // карте, просто камера подлетает к нужным.
    useEffect(() => {
        if (focusNumber === null || !focusBounds) return;

        // Не синхронно в теле эффекта: иначе React Compiler считает это
        // каскадной отрисовкой (как в `useApiResource`).
        let active = true;
        void Promise.resolve().then(() => {
            if (!active) return;

            setFocus((current) => ({
                bounds: focusBounds,
                key: (current?.key ?? 0) + 1,
                padding: PERSON_FOCUS_PADDING,
                singleZoom: PERSON_FOCUS_SINGLE_ZOOM,
            }));
        });

        return () => {
            active = false;
        };
    }, [focusNumber, focusBounds]);

    // С мини-карты пришли с открытым блоком событий — открываем тот же блок
    // и здесь: по нему сразу видно, что это за точки, а не только где они.
    // Один раз на ссылку, чтобы после закрытия блок не раскрывался снова.
    const openedFocus = useRef<string | null>(null);
    useEffect(() => {
        if (focusNumber === null || focusEventIds.size === 0) return;

        const key = `${focusNumber}:${[...focusEventIds].join(',')}`;
        if (openedFocus.current === key) return;

        const ids = focusPoints.map((point) => point.id);
        if (ids.length === 0) return;

        const timer = setTimeout(() => {
            openedFocus.current = key;
            setSelectedIds(ids);
        }, FOCUS_PANEL_DELAY_MS);

        return () => clearTimeout(timer);
    }, [focusNumber, focusEventIds, focusPoints]);

    const isClient = useIsClient();

    // Точки читаются асинхронно (см. `use-map-points`). Без них не знаем, куда
    // лететь по ссылке «на общей карте», поэтому сначала показываем загрузку.
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
            <EdgeEffectHost>
                <Suspense fallback={<BlockLoading />}>
                    <MartyrsMap
                        points={visible}
                        // Камера ставится не в момент создания, а перелётом
                        // (см. focus): по ссылке из биографии нужен плавный
                        // подлёт к её точкам, а не мгновенный прыжок.
                        bounds={null}
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
                        <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: 400 }}>
                            Ничего не нашлось, измените запрос или фильтры
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
        top: Spacing.one,
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
});
