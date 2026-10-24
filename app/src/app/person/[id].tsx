import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

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
import { normalizePersonNumber, usePerson } from "@/hooks/use-person";
import type { PersonEvent } from "@/hooks/use-persons";
import { useScrollTitle } from "@/hooks/use-scroll-title";
import { useTheme } from "@/hooks/use-theme";
import { formatPersonName } from "@/utils/person-name";

import { shareLink } from "@/utils/share-link";
import { personUrl } from "@/constants/site";

function formatEventDate(date: string | null | undefined) {
    if (date == null) return 'Дата неизвестна';
    if (/^\d{4}$/.test(date.trim())) return `${date} г.`;
    if (/^\d{4}\s*[-–—]\s*\d{4}$/.test(date.trim())) return `${date} гг.`;
    return date;
}

function EventRow({ event }: { event: PersonEvent }) {
    const places = (event.Места ?? [])
        .map((place) => place.адрес)
        .filter((address): address is string => Boolean(address));

    return (
        <View style={styles.event}>
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
    const { id } = useLocalSearchParams<{ id: string }>();
    const { person, loading, refreshing, notFound, error, stale, updatedAt, refresh } = usePerson(id);
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const number = normalizePersonNumber(id);
    const name = formatPersonName(person?.ФИО) ?? person?.Заголовок ?? '—';

    const { onScroll, setTitleBottom } = useScrollTitle(person ? name : null);
    const textTop = useRef(0);
    const titleHeight = useRef(0);
    const updateTitleBottom = () => setTitleBottom(textTop.current + titleHeight.current);

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

                        {(person.События ?? []).map((event, index) => (
                            <EventRow key={index} event={event} />
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

                    {number !== null && <PersonMap number={number} />}

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
