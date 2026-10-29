import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, RefreshControl, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BlockError } from "@/components/block-error";
import { BlockLoading } from "@/components/block-loading";
import { FlashOverlay } from "@/components/flash-overlay";
import { HighlightedText } from "@/components/highlighted-text";
import { ListButton } from "@/components/list-button";
import { OfflineNotice } from "@/components/offline-notice";
import { PageScrollView, usePageScrollRef } from "@/components/page-scroll-view";
import { PersonMap } from "@/components/person-map";
import { PersonMenu } from "@/components/person-menu";
import { PersonPhotos } from "@/components/person-photos";
import { PersonRankLine } from "@/components/person-rank-line";
import { PersonSources, sourceTexts } from "@/components/person-sources";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Chevron } from "@/components/ui/chevron";
import { HeadingFonts, MaxContentWidth, Spacing, SurfaceShadow } from "@/constants/theme";
import { usePersonMapPoints } from "@/hooks/use-map-points";
import { useIsClient } from "@/hooks/use-is-client";
import { normalizePersonNumber, usePerson } from "@/hooks/use-person";
import { holinessOf, type PersonEvent } from "@/hooks/use-persons";
import { useScrollTitle } from "@/hooks/use-scroll-title";
import { useTheme } from "@/hooks/use-theme";
import { matchEvents } from "@/utils/match-events";
import { formatPersonHeading, formatPersonName } from "@/utils/person-name";
import { scrollBlockToTop } from "@/utils/scroll-block";
import { findMatches, pageNeedle } from "@/utils/text-search";
import { useNameOrder } from "@/context/name-order";

import { shareLink } from "@/utils/share-link";
import { personUrl } from "@/constants/site";

function formatEventDate(date: string | null | undefined) {
    if (date == null) return 'Дата неизвестна';
    if (/^\d{4}$/.test(date.trim())) return `${date} г.`;
    if (/^\d{4}\s*[-–—]\s*\d{4}$/.test(date.trim())) return `${date} гг.`;
    return date;
}

/** Тексты события в том порядке, в каком они на экране: дата, текст, места. */
function eventTexts(event: PersonEvent): string[] {
    const places = (event.Места ?? [])
        .map((place) => place.адрес)
        .filter((address): address is string => Boolean(address));

    return [formatEventDate(event?.датировка), event.текст ?? '', places.join(' · ')];
}

/** Сквозные номера первого совпадения в каждом из текстов, начиная с `first`. */
function matchOffsets(texts: readonly string[], needle: string, first: number) {
    const offsets: number[] = [];
    let offset = first;
    for (const text of texts) {
        offsets.push(offset);
        offset += needle ? findMatches(text, needle).length : 0;
    }
    return offsets;
}

function EventRow({
    event,
    flashKey,
    onLayout,
    viewRef,
    needle,
    first,
    active,
}: {
    event: PersonEvent;
    flashKey: number | null;
    onLayout: (event: LayoutChangeEvent) => void;
    /** Узел строки — по нему в вебе меряется, куда прокручивать. */
    viewRef: (node: unknown) => void;
    needle: string;
    first: number;
    active: number | null;
}) {
    const theme = useTheme();
    const [date, text, places] = eventTexts(event);
    const [dateFirst, textFirst, placesFirst] = matchOffsets([date, text, places], needle, first);

    return (
        <View ref={viewRef} style={[styles.event, styles.eventRow]} onLayout={onLayout}>
            <FlashOverlay flashKey={flashKey} color={theme.backgroundElement} />
            <HighlightedText type="smallBold" style={styles.eventDate} needle={needle} first={dateFirst} active={active}>
                {date}
            </HighlightedText>
            {text !== '' && (
                <HighlightedText type="small" style={styles.eventText} needle={needle} first={textFirst} active={active}>
                    {text}
                </HighlightedText>
            )}
            {places !== '' && (
                <HighlightedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.eventPlace}
                    needle={needle}
                    first={placesFirst}
                    active={active}>
                    {places}
                </HighlightedText>
            )}
        </View>
    );
}

export default function PagePerson() {
    const { id, events: eventsParam } = useLocalSearchParams<{ id: string; events?: string }>();
    const { person, loading, refreshing, notFound, error, stale, updatedAt, refresh } = usePerson(id);
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const { order } = useNameOrder();
    const number = normalizePersonNumber(id);
    const holiness = holinessOf(person);
    // На странице чин — строкой над именем, в шапке — только ФИО, а при
    // «Поделиться» — вместе с чином.
    const name = formatPersonHeading(person?.ФИО, holiness, order) ?? person?.Заголовок ?? '—';
    const title = formatPersonName(person?.ФИО, order) ?? person?.Заголовок ?? '—';

    const { onScroll, setTitleBottom } = useScrollTitle(person ? title : null);
    const textTop = useRef(0);
    const titleHeight = useRef(0);
    const updateTitleBottom = () => setTitleBottom(textTop.current + titleHeight.current);

    const personEvents = useMemo(() => person?.События ?? [], [person]);
    // Точки нужны странице, только чтобы подсветить события, с которыми
    // пришли с общей карты (`events`); иначе их грузит блок карты внизу,
    // когда до него докрутят.
    const mapPoints = usePersonMapPoints(number, Boolean(eventsParam));

    const paramHighlight = useMemo(() => {
        const ids = new Set((eventsParam ?? '').split(',').filter(Boolean).map(Number));
        if (ids.size === 0) return [];
        return matchEvents(mapPoints.filter((point) => ids.has(point.id)), personEvents);
    }, [eventsParam, mapPoints, personEvents]);

    const [flash, setFlash] = useState<{ indexes: number[]; key: number } | null>(null);
    const flashEvents = (indexes: number[]) =>
        setFlash((current) => ({ indexes, key: (current?.key ?? 0) + 1 }));

    const scrollRef = usePageScrollRef();
    const headerHeight = useHeaderHeight();
    // Верх каждого блока текста (событие — `e{номер}`, «Дополнительно» —
    // `extra`, источники — `sources`) относительно колонки текста.
    const blockTops = useRef<Record<string, number>>({});
    // Узлы тех же блоков — для веба (см. scroll-block.web).
    const blockNodes = useRef<Record<string, unknown>>({});
    const stopFollow = useRef<(() => void) | null>(null);
    const pendingScroll = useRef<string | null>(null);

    const tryScroll = () => {
        const key = pendingScroll.current;
        if (key === null) return;

        if (Platform.OS === 'web') {
            const node = blockNodes.current[key];
            if (!node) return;
            stopFollow.current?.();
            stopFollow.current = scrollBlockToTop(node, Spacing.three);
            if (stopFollow.current) {
                pendingScroll.current = null;
                return;
            }
        }

        const top = blockTops.current[key];
        if (top === undefined) return;

        pendingScroll.current = null;
        // На iOS шапка прозрачная и контент начинается под ней, на остальных
        // платформах — после неё.
        const covered = Platform.OS === 'ios' ? headerHeight : 0;
        scrollRef.current?.scrollTo({ y: textTop.current + top - covered - Spacing.three, animated: true });
    };

    const scrollToBlock = (key: string) => {
        pendingScroll.current = key;
        tryScroll();
    };
    const scrollToEvent = (index: number) => scrollToBlock(`e${index}`);
    const onBlockLayout = (key: string, { nativeEvent }: LayoutChangeEvent) => {
        blockTops.current[key] = nativeEvent.layout.y;
        tryScroll();
    };
    const setBlockNode = (key: string, node: unknown) => {
        blockNodes.current[key] = node;
    };

    // Поиск по тексту биографии — полем в шапке (см. useEffect ниже). Блоки
    // в порядке страницы; у каждого — номер его первого совпадения.
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const needle = pageNeedle(query);
    const [active, setActive] = useState(0);

    const search = useMemo(() => {
        const blocks: { key: string; first: number; count: number }[] = [];
        let total = 0;
        const add = (key: string, texts: string[]) => {
            const count = needle ? texts.reduce((sum, text) => sum + findMatches(text, needle).length, 0) : 0;
            blocks.push({ key, first: total, count });
            total += count;
        };

        personEvents.forEach((event, index) => add(`e${index}`, eventTexts(event)));
        add('extra', [person?.дополнительный_текст ?? '']);
        add('sources', sourceTexts(person?.Все_источники));

        return { first: Object.fromEntries(blocks.map((block) => [block.key, block.first])), blocks, total };
    }, [needle, personEvents, person]);

    // Новый запрос — с первого совпадения.
    const [lastNeedle, setLastNeedle] = useState(needle);
    if (lastNeedle !== needle) {
        setLastNeedle(needle);
        setActive(0);
    }

    const current = search.total > 0 ? Math.min(active, search.total - 1) : null;
    const step = (delta: number) => {
        if (search.total === 0) return;
        setActive((value) => (Math.min(value, search.total - 1) + delta + search.total) % search.total);
    };

    // К блоку с текущим совпадением.
    useEffect(() => {
        if (current === null) return;
        const block = search.blocks.find((item) => current >= item.first && current < item.first + item.count);
        if (block) scrollToBlock(block.key);
    }, [current, search]); // eslint-disable-line react-hooks/exhaustive-deps

    const stepRef = useRef(step);
    useEffect(() => {
        stepRef.current = step;
    });

    useEffect(() => {
        if (!person) return;
        const onChangeText = (event: { nativeEvent: { text: string } }) => setQuery(event.nativeEvent.text);
        const next = () => stepRef.current(1);

        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Найти в биографии',
                cancelButtonText: 'Отмена',
                autoCapitalize: 'none',
                onChangeText,
                // Enter — к следующему совпадению: на телефоне (кнопка «Найти»)
                // и в вебе.
                onSearchButtonPress: next,
                onSubmitEditing: next,
                onCancelButtonPress: () => setQuery(''),
                onClose: () => setQuery(''),
            },
        });
    }, [navigation, Boolean(person)]); // eslint-disable-line react-hooks/exhaustive-deps

    // С общей карты — сразу к первому подсвеченному событию, один раз: при
    // обновлении страницы свайпом прыгать обратно незачем.
    const scrolledFor = useRef<string | null>(null);
    useEffect(() => {
        if (paramHighlight.length === 0 || scrolledFor.current === eventsParam) return;
        scrolledFor.current = eventsParam ?? null;
        scrollToEvent(paramHighlight[0]);
        flashEvents(paramHighlight);
    }, [paramHighlight, eventsParam]); // eslint-disable-line react-hooks/exhaustive-deps

    const menu = number === null ? null : <PersonMenu number={number} name={name} />;

    const share = async () => {
        if (number === null) return;

        const result = await shareLink({ title: name, url: personUrl(number) });
        if (result !== 'copied') return;

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const years = [person?.Рождение?.год, person?.Кончина?.год]
        .map((year) => year ?? '...')
        .join('–');

    // HTML этой страницы собирается один на все номера, без номера: при
    // сборке и гидратации — загрузка, а не «не найден» (см. useIsClient).
    const isClient = useIsClient();

    const placeholder = loading || !isClient ? (
        <BlockLoading />
    ) : error ? (
        <BlockError error={error} onRetry={refresh} />
    ) : notFound || !person ? (
        <ThemedView style={styles.center}>
            <ThemedText>Новомученик не найден</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
                Дело №{String(id ?? '—')} отсутствует в базе
            </ThemedText>
        </ThemedView>
    ) : null;

    return (
        <View style={styles.root}>
            <PageScrollView
                ref={scrollRef}
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={[styles.scroll, { backgroundColor: theme.background }]}
                contentContainerStyle={[styles.content, placeholder && styles.contentFill]}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        tintColor={theme.textSecondary}
                        colors={[theme.text]}
                        progressBackgroundColor={theme.backgroundElement}
                    />
                }>
                {placeholder ? (
                    <>
                        {menu}
                        {placeholder}
                    </>
                ) : person && (
                    <ThemedView style={styles.container}>
                        {menu}
                        {stale && <OfflineNotice updatedAt={updatedAt} onRetry={refresh} />}

                        <PersonPhotos photos={person.Фотографии} name={person.ФИО} fullWidth />

                        <View
                            style={styles.containerText}
                            onLayout={(event) => {
                                textTop.current = event.nativeEvent.layout.y;
                                updateTitleBottom();
                                tryScroll();
                            }}>
                            <View style={styles.containerTextMain}>
                                <PersonRankLine holiness={holiness} style={styles.holiness} />
                                <ThemedText
                                    style={styles.title}
                                    onLayout={(event) => {
                                        titleHeight.current = event.nativeEvent.layout.height;
                                        updateTitleBottom();
                                    }}>
                                    {title}
                                </ThemedText>
                                <ThemedText style={styles.subtitle}>
                                    {years}
                                    {person.сан_церк_служение ? `, ${person.сан_церк_служение}` : ''}
                                </ThemedText>
                            </View>

                            {personEvents.map((event, index) => (
                                <EventRow
                                    key={index}
                                    event={event}
                                    flashKey={flash?.indexes.includes(index) ? flash.key : null}
                                    onLayout={(event) => onBlockLayout(`e${index}`, event)}
                                    viewRef={(node) => setBlockNode(`e${index}`, node)}
                                    needle={needle}
                                    first={search.first[`e${index}`] ?? 0}
                                    active={current}
                                />
                            ))}

                            {person.дополнительный_текст && (
                                <View
                                ref={(node) => setBlockNode('extra', node)}
                                style={styles.event}
                                onLayout={(event) => onBlockLayout('extra', event)}>
                                    <ThemedText type="smallBold" style={styles.eventDate}>
                                        Дополнительно
                                    </ThemedText>
                                    <HighlightedText
                                        type="small"
                                        style={styles.eventText}
                                        needle={needle}
                                        first={search.first.extra}
                                        active={current}>
                                        {person.дополнительный_текст}
                                    </HighlightedText>
                                </View>
                            )}

                            <View ref={(node) => setBlockNode('sources', node)} onLayout={(event) => onBlockLayout('sources', event)}>
                                <PersonSources
                                    sources={person.Все_источники}
                                    needle={needle}
                                    first={search.first.sources}
                                    active={current}
                                />
                            </View>
                        </View>

                        {number !== null && (
                            <PersonMap
                                number={number}
                                events={personEvents}
                                onShowInText={(index) => {
                                    scrollToEvent(index);
                                    flashEvents([index]);
                                }}
                            />
                        )}

                        <View style={styles.actions}>
                            <ThemedText type="smallBold" style={styles.actionTitle}>
                                Подробнее
                            </ThemedText>
                            <ListButton label='Поделиться' onPress={share} />
                            <ListButton label="Уточнить сведения" onPress={() => router.push('/help')} />
                        </View>
                    </ThemedView>
                )}
            </PageScrollView>

            {needle !== '' && person && (
                <SearchCounter
                    current={current}
                    total={search.total}
                    onStep={step}
                    style={{ bottom: insets.bottom + Spacing.three }}
                />
            )}
        </View>
    );
}

/** «3 из 12» и стрелки к соседним совпадениям — внизу, поверх страницы. */
function SearchCounter({
    current,
    total,
    onStep,
    style,
}: {
    current: number | null;
    total: number;
    onStep: (delta: number) => void;
    style?: { bottom: number };
}) {
    const theme = useTheme();

    return (
        <View
            pointerEvents="box-none"
            style={[styles.counterHost, style]}>
            <View style={[styles.counter, { backgroundColor: theme.backgroundRaised }]}>
                <ThemedText type="small" style={styles.counterText}>
                    {current === null ? 'Не найдено' : `${current + 1} из ${total}`}
                </ThemedText>
                {total > 1 && (
                    <>
                        <Pressable
                            onPress={() => onStep(-1)}
                            hitSlop={Spacing.one}
                            accessibilityRole="button"
                            accessibilityLabel="Предыдущее совпадение"
                            style={({ pressed }) => [styles.counterButton, styles.chevronUp, pressed && styles.pressed]}>
                            <Chevron direction="down" size={8} />
                        </Pressable>
                        <Pressable
                            onPress={() => onStep(1)}
                            hitSlop={Spacing.one}
                            accessibilityRole="button"
                            accessibilityLabel="Следующее совпадение"
                            style={({ pressed }) => [styles.counterButton, pressed && styles.pressed]}>
                            <Chevron direction="down" size={8} />
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    counterHost: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingLeft: Spacing.three,
        paddingRight: Spacing.one,
        paddingVertical: Spacing.one,
        borderRadius: 999,
        boxShadow: SurfaceShadow,
    },
    counterText: {
        fontWeight: '600',
        marginRight: Spacing.one,
        minWidth: 64,
        textAlign: 'center',
    },
    counterButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chevronUp: {
        transform: [{ rotate: '180deg' }],
    },
    pressed: {
        opacity: 0.6,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingBottom: Spacing.six,
        maxWidth: MaxContentWidth,
        width: '100%',
        alignSelf: 'center',
    },
    contentFill: {
        flexGrow: 1,
    },
    container: {
        width: '100%',
    },
    containerText: {
        paddingHorizontal: Spacing.three,
    },
    containerTextMain: {
        marginBottom: Spacing.five,
    },
    title: {
        fontSize: 28,
        lineHeight: 39,
        fontFamily: HeadingFonts.bold,
        marginBottom: Spacing.two,
    },
    holiness: {
        fontSize: 20,
        lineHeight: 25,
        fontWeight: '400',
        marginBottom: Spacing.one,
    },
    subtitle: {
        fontSize: 20,
        lineHeight: 25,
        marginBottom: Spacing.three,
        fontWeight: '400',
        opacity: 0.6,
    },
    event: {
        gap: Spacing.half,
        paddingVertical: Spacing.three,
    },
    eventRow: {
        marginHorizontal: -Spacing.three,
        paddingHorizontal: Spacing.three,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
    },
    eventDate: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '600',
        marginBottom: Spacing.two,
    },
    eventText: {
        fontWeight: '400',
        fontSize: 17,
        lineHeight: 22,
        marginBottom: Spacing.two,
    },
    eventPlace: {
        fontWeight: '400',
        fontSize: 17,
        lineHeight: 22,
        marginBottom: Spacing.two,
    },
    actions: {
        width: '100%',
        paddingTop: Spacing.six,
    },
    actionTitle: {
        marginBottom: Spacing.three,
        paddingHorizontal: Spacing.three,
        fontSize: 24,
        lineHeight: 28,
    },
});
