import { router, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, RefreshControl, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
    Easing,
    useAnimatedRef,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from "react-native-reanimated";

import { BlockError } from "@/components/block-error";
import { BlockLoading } from "@/components/block-loading";
import { ListButton } from "@/components/list-button";
import { OfflineNotice } from "@/components/offline-notice";
import { PersonMap } from "@/components/person-map";
import { PersonMenu } from "@/components/person-menu";
import { PersonPhotos } from "@/components/person-photos";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { HeadingFonts, MaxContentWidth, Spacing } from "@/constants/theme";
import { usePersonMapPoints } from "@/hooks/use-map-points";
import { normalizePersonNumber, usePerson } from "@/hooks/use-person";
import type { PersonEvent } from "@/hooks/use-persons";
import { useScrollTitle } from "@/hooks/use-scroll-title";
import { useTheme } from "@/hooks/use-theme";
import { matchEvents } from "@/utils/match-events";
import { formatPersonName } from "@/utils/person-name";

import { shareLink } from "@/utils/share-link";
import { personUrl } from "@/constants/site";

import { Metadata } from "expo-router/server";
import { SITE_URL } from "@/constants/site";

export function generateMetadata(): Metadata {
    const title = 'Новомученик — житие, события и места служения';
    const description = 'Житие новомученика: события биографии, места служения, ареста и захоронения, фотографии и карта связанных мест.';

    const url = `${SITE_URL}/person/id`;

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

function formatEventDate(date: string | null | undefined) {
    if (date == null) return 'Дата неизвестна';
    if (/^\d{4}$/.test(date.trim())) return `${date} г.`;
    if (/^\d{4}\s*[-–—]\s*\d{4}$/.test(date.trim())) return `${date} гг.`;
    return date;
}

const FLASH_DELAY_MS = 300;
const FLASH_IN = { duration: 250 };
const FLASH_HOLD_MS = 2200;
const FLASH_OUT = { duration: 600, easing: Easing.out(Easing.quad) };

function EventRow({
    event,
    flashKey,
    onLayout,
}: {
    event: PersonEvent;
    flashKey: number | null;
    onLayout: (event: LayoutChangeEvent) => void;
}) {
    const theme = useTheme();
    const flash = useSharedValue(0);

    useEffect(() => {
        if (flashKey === null) return;
        flash.value = 0;
        flash.value = withSequence(
            withDelay(FLASH_DELAY_MS, withTiming(1, FLASH_IN)),
            withDelay(FLASH_HOLD_MS, withTiming(0, FLASH_OUT))
        );
    }, [flashKey, flash]);

    const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
    const places = (event.Места ?? [])
        .map((place) => place.адрес)
        .filter((address): address is string => Boolean(address));

    return (
        <View style={[styles.event, styles.eventRow]} onLayout={onLayout}>
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement }, flashStyle]}
            />
            <ThemedText type="smallBold" style={styles.eventDate}>
                {formatEventDate(event?.датировка)}
            </ThemedText>
            {event.текст && <ThemedText type="small" style={styles.eventText}>
                {event.текст}
            </ThemedText>}
            {places.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.eventPlace}>
                    {places.join(' · ')}
                </ThemedText>
            )}
        </View>
    );
}

export default function PagePerson() {
    const { id, events: eventsParam } = useLocalSearchParams<{ id: string; events?: string }>();
    const { person, loading, refreshing, notFound, error, stale, updatedAt, refresh } = usePerson(id);
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const number = normalizePersonNumber(id);
    const name = formatPersonName(person?.ФИО) ?? person?.Заголовок ?? '—';

    const { onScroll, setTitleBottom } = useScrollTitle(person ? name : null);
    const textTop = useRef(0);
    const titleHeight = useRef(0);
    const updateTitleBottom = () => setTitleBottom(textTop.current + titleHeight.current);

    const personEvents = useMemo(() => person?.События ?? [], [person]);
    const mapPoints = usePersonMapPoints(number);

    const paramHighlight = useMemo(() => {
        const ids = new Set((eventsParam ?? '').split(',').filter(Boolean).map(Number));
        if (ids.size === 0) return [];
        return matchEvents(mapPoints.filter((point) => ids.has(point.id)), personEvents);
    }, [eventsParam, mapPoints, personEvents]);

    const [flash, setFlash] = useState<{ indexes: number[]; key: number } | null>(null);
    const flashEvents = (indexes: number[]) =>
        setFlash((current) => ({ indexes, key: (current?.key ?? 0) + 1 }));

    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const headerHeight = useHeaderHeight();
    const eventTops = useRef<Record<number, number>>({});
    const pendingScroll = useRef<number | null>(null);

    const tryScroll = () => {
        const index = pendingScroll.current;
        if (index === null) return;
        const top = eventTops.current[index];
        if (top === undefined) return;

        pendingScroll.current = null;
        // На iOS шапка прозрачная и контент начинается под ней, на остальных
        // платформах — после неё.
        const covered = Platform.OS === 'ios' ? headerHeight : 0;
        scrollRef.current?.scrollTo({ y: textTop.current + top - covered - Spacing.three, animated: true });
    };

    const scrollToEvent = (index: number) => {
        pendingScroll.current = index;
        tryScroll();
    };

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

    const placeholder = loading ? (
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
        <Animated.ScrollView
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
                            <ThemedText
                                style={styles.title}
                                onLayout={(event) => {
                                    titleHeight.current = event.nativeEvent.layout.height;
                                    updateTitleBottom();
                                }}>
                                {name}
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
                                onLayout={({ nativeEvent }) => {
                                    eventTops.current[index] = nativeEvent.layout.y;
                                    tryScroll();
                                }}
                            />
                        ))}

                        {person.дополнительный_текст && (
                            <View style={styles.event}>
                                <ThemedText type="smallBold" style={styles.eventDate}>
                                    Дополнительно
                                </ThemedText>
                                <ThemedText type="small" style={styles.eventText}>
                                    {person.дополнительный_текст}
                                </ThemedText>
                            </View>
                        )}
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
                        <ListButton label="Уточнить сведения" onPress={() => router.push('/help')} last />
                    </View>
                </ThemedView>
            )}
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
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
        fontFamily: HeadingFonts.bold,
        marginBottom: Spacing.three,
        paddingHorizontal: Spacing.three,
        fontSize: 24,
        lineHeight: 28,
    },
});
