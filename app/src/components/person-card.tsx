import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    View,
    useColorScheme,
    useWindowDimensions,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { PersonCardMenu } from "./person-card-menu";
import { PersonPhotos } from "./person-photos";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { HeadingFonts, Spacing } from "@/constants/theme";
import { useCardView } from "@/context/card-view";
import { useTheme } from "@/hooks/use-theme";
import { Person } from "@/hooks/use-persons";
import { capitalize, formatPersonName, formatRank } from "@/utils/person-name";
import { router } from "expo-router";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN = { duration: 60, easing: Easing.out(Easing.quad) };
const PRESS_OUT = { duration: 120, easing: Easing.out(Easing.quad) };

export function PersonCard({ person }: { person: Person }) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const [pressed, setPressed] = useState(false);
    const colorScheme = useColorScheme();
    const theme = useTheme();
    const { view } = useCardView();
    const compact = view === 'compact';
    const { width } = useWindowDimensions();

    const content = compact ? <CompactContent person={person} /> : <DetailedContent person={person} />;

    // Копия карточки для поднятого вида в меню на iOS — без нажатия, рамки и
    // анимаций, на фоне страницы и во всю ширину, как в списке.
    const preview = (
        <View
            style={[
                styles.container,
                compact && styles.containerCompact,
                styles.preview,
                { width, backgroundColor: theme.background },
            ]}>
            {content}
        </View>
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    // Долгое нажатие — меню «Поделиться» и «Уточнить сведения»
    // (см. person-card-menu).
    return (
        <PersonCardMenu
            person={person}
            name={formatPersonName(person.ФИО) ?? person.Заголовок ?? `Дело №${person.Номер}`}
            preview={preview}>
            {(onLongPress) => (
                <AnimatedPressable
                    onPress={() => router.push({ pathname: '/person/[id]', params: { id: person?.Номер } })}
                    onLongPress={onLongPress}
                    onPressIn={() => {
                        setPressed(true);
                        scale.value = withTiming(0.99, PRESS_IN);
                        opacity.value = withTiming(0.75, PRESS_IN);
                    }}
                    onPressOut={() => {
                        setPressed(false);
                        scale.value = withTiming(1, PRESS_OUT);
                        opacity.value = withTiming(1, PRESS_OUT);
                    }}
                    style={styles.card}
                >
                    <ThemedView
                        style={[
                            styles.container,
                            compact && styles.containerCompact,
                            {
                                backgroundColor: pressed
                                    ? colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7"
                                    : undefined,
                                borderColor: theme.separator,
                            },
                        ]}
                    >
                        <Animated.View style={[styles.content, animatedStyle]}>
                            {content}
                        </Animated.View>
                    </ThemedView>
                </AnimatedPressable>
            )}
        </PersonCardMenu>
    );
}

/**
 * Краткий вид: сан над именем и имя в привычном порядке — «ФОМА
 * Константинович Артемьев» (см. `formatPersonName`). Без фотографии и дат.
 */
function CompactContent({ person }: { person: Person }) {
    const rank = formatRank(person.сан_церк_служение);

    return (
        <>
            {rank && <ThemedText style={styles.rank}>{rank}</ThemedText>}
            <ThemedText style={[styles.title, styles.titleCompact]}>
                {formatPersonName(person.ФИО) ?? person.Заголовок ?? '—'}
            </ThemedText>
        </>
    );
}

/** Подробный вид: фотографии, годы жизни и тексты о рождении и кончине. */
function DetailedContent({ person }: { person: Person }) {
    return (
        <>
            <PersonPhotos photos={person.Фотографии} name={person.ФИО} />

            <ThemedText style={styles.title}>
                {formatPersonName(person.ФИО) ?? person.Заголовок ?? '—'}
            </ThemedText>
            {(person?.Рождение?.год || person?.Кончина?.год || person?.сан_церк_служение) && (
                <ThemedText style={styles.subtitle}>
                    {person?.Рождение?.год ?? "..."}-{person?.Кончина?.год ?? "..."}
                    {person?.сан_церк_служение ? `, ${person?.сан_церк_служение}` : ''}
                </ThemedText>
            )}
            {(person?.Рождение?.текст || person?.Кончина?.текст) && (
                <View style={styles.textContainer}>
                    <ThemedText style={[styles.text, { marginBottom: Spacing.half }]}>
                        {capitalize(person?.Рождение?.текст) ?? 'Нет данных о рождении.'}
                    </ThemedText>
                    <ThemedText style={styles.text}>
                        {capitalize(person?.Кончина?.текст) ?? 'Нет данных о кончине.'}
                    </ThemedText>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        textAlign: 'left',
        flex: 1,
        width: '100%',
        borderTopWidth: .5,
        paddingVertical: Spacing.five,
        paddingHorizontal: Spacing.three,
    },
    containerCompact: {
        paddingVertical: Spacing.three,
    },
    preview: {
        flex: 0,
        borderTopWidth: 0,
    },
    content: {
        width: '100%',
    },
    card: {
    },
    title: {
        fontSize: 19,
        lineHeight: 24,
        fontFamily: HeadingFonts.bold,
        marginBottom: Spacing.one,
    },
    titleCompact: {
        marginBottom: 0,
    },
    rank: {
        fontSize: 15,
        lineHeight: 20,
        marginBottom: Spacing.half,
        opacity: .6,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: Spacing.three,
        lineHeight: 21,
        opacity: .6
    },
    textContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: Spacing.two,
    },
    text: {
        fontWeight: 400,
        fontSize: 17,
        lineHeight: 22,
    },
});
