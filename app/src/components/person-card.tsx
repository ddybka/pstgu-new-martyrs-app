import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { CARD_MENU_NAVIGATES, PersonCardMenu } from "./person-card-menu";
import { PersonPhotos } from "./person-photos";
import { PersonRankLine } from "./person-rank-line";
import { ThemedText } from "./themed-text";
import { HeadingFonts, Spacing } from "@/constants/theme";
import { useCardView } from "@/context/card-view";
import { useNameOrder } from "@/context/name-order";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { holinessOf, type Person } from "@/hooks/use-persons";
import { capitalize, formatPersonHeading, formatPersonName } from "@/utils/person-name";
import { router } from "expo-router";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN = { duration: 60, easing: Easing.out(Easing.quad) };
const PRESS_OUT = { duration: 120, easing: Easing.out(Easing.quad) };

export function PersonCard({ person }: { person: Person }) {
    // Одно значение на всё нажатие: масштаб, прозрачность и фон считаются из
    // него на UI-потоке, без перерисовки карточки на каждое касание.
    const press = useSharedValue(0);
    const colorScheme = useColorScheme();
    const theme = useTheme();
    const { view } = useCardView();
    const { order } = useNameOrder();
    const compact = view === 'compact';
    // Чин святости — не в имени, а строкой над ним (см. PersonRankLine).
    const heading = formatPersonName(person.ФИО, order) ?? person.Заголовок;
    const { width } = useWindowDimensions();
    // Высота карточки нужна только превью меню на iOS (см. person-card-menu).
    const [height, setHeight] = useState<number | undefined>(undefined);

    const content = compact
        ? <CompactContent person={person} heading={heading} />
        : <DetailedContent person={person} heading={heading} />;

    // Копия карточки для поднятого вида в меню на iOS — без нажатия, рамки и
    // анимаций, на фоне страницы и во всю ширину, как в списке. Монтируется
    // только при открытом меню.
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

    const pressedColor = colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7";
    const background = theme.background;

    const contentStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 - 0.01 * press.value }],
        opacity: 1 - 0.25 * press.value,
    }));

    // Фон меняется скачком, как и раньше: плавное затухание фона под
    // пальцем читается как задержка.
    const backgroundStyle = useAnimatedStyle(() => ({
        backgroundColor: press.value > 0.5 ? pressedColor : background,
    }));

    // Долгое нажатие — меню «Поделиться» и «Уточнить сведения»
    // (см. person-card-menu).
    return (
        <PersonCardMenu
            person={person}
            name={formatPersonHeading(person.ФИО, holinessOf(person), order) ?? heading ?? `Дело №${person.Номер}`}
            preview={preview}
            previewHeight={height}>
            {(onLongPress) => (
                <AnimatedPressable
                    // На iOS карточка — это `Link`, и переход делает он.
                    onPress={
                        CARD_MENU_NAVIGATES
                            ? undefined
                            : () => router.push({ pathname: '/person/[id]', params: { id: person?.Номер } })
                    }
                    onLongPress={onLongPress}
                    onLayout={
                        CARD_MENU_NAVIGATES
                            ? ({ nativeEvent }) => setHeight(Math.round(nativeEvent.layout.height))
                            : undefined
                    }
                    onPressIn={() => {
                        press.value = withTiming(1, PRESS_IN);
                    }}
                    onPressOut={() => {
                        press.value = withTiming(0, PRESS_OUT);
                    }}
                    style={styles.card}
                >
                    <Animated.View
                        style={[
                            styles.container,
                            compact && styles.containerCompact,
                            { borderColor: theme.separator },
                            backgroundStyle,
                        ]}
                    >
                        <Animated.View style={[styles.content, contentStyle]}>
                            {content}
                        </Animated.View>
                    </Animated.View>
                </AnimatedPressable>
            )}
        </PersonCardMenu>
    );
}

/**
 * Краткий вид: над именем — чин святости бордовым и сан («Исповедник ·
 * епископ»), имя — в выбранном порядке (см. `formatPersonName`). Без
 * фотографии и дат.
 */
function CompactContent({ person, heading }: { person: Person; heading?: string }) {
    return (
        <>
            <PersonRankLine holiness={holinessOf(person)} rank={person.сан_церк_служение} style={styles.rank} />
            <ThemedText style={[styles.title, styles.titleCompact]}>
                {heading ?? '—'}
            </ThemedText>
        </>
    );
}

/** Подробный вид: фотографии, годы жизни и тексты о рождении и кончине. */
function DetailedContent({ person, heading }: { person: Person; heading?: string }) {
    return (
        <>
            <PersonPhotos photos={person.Фотографии} name={person.ФИО} />

            {/* Сан здесь — в строке с годами, над именем только чин. */}
            <PersonRankLine holiness={holinessOf(person)} style={styles.rank} />
            <ThemedText style={styles.title}>
                {heading ?? '—'}
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
