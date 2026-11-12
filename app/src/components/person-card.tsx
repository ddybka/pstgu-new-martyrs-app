import { useState, type ReactNode } from "react";
import {
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import { CardPressable } from "./card-pressable";
import { CARD_MENU_NAVIGATES, PersonCardMenu } from "./person-card-menu";
import { PersonPhotos, PersonThumbnail } from "./person-photos";
import { PersonRankLine } from "./person-rank-line";
import { ThemedText } from "./themed-text";
import { HeadingFonts, Spacing } from "@/constants/theme";
import { useCardView, type CardView } from "@/context/card-view";
import { useNameOrder } from "@/context/name-order";
import { usePhotoLayout } from "@/context/photo-layout";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { holinessOf, type Person } from "@/hooks/use-persons";
import { capitalize, formatPersonHeading, formatPersonName } from "@/utils/person-name";
import { router } from "expo-router";

const COMPACT_PHOTO_SIZE = 48;

export function PersonCard({
    person,
    view: viewOverride,
    extra,
}: {
    person: Person;
    /**
     * Вид карточки. Настройки показывают пример так же, как он выглядит в
     * списке; `view` позволяет показать подробный вид независимо от выбора
     * (например, в разделе про фотографию).
     */
    view?: CardView;
    /** Дополнительный блок внутри карточки — фрагмент биографии в поиске. */
    extra?: ReactNode;
}) {
    const colorScheme = useColorScheme();
    const theme = useTheme();
    const { view: currentView } = useCardView();
    const view = viewOverride ?? currentView;
    const { order } = useNameOrder();
    const compact = view === 'compact';
    // Чин святости — не в имени, а строкой над ним (см. PersonRankLine).
    const heading = formatPersonName(person.ФИО, order) ?? person.Заголовок;
    const { width } = useWindowDimensions();
    // Высота карточки нужна только превью меню на iOS (см. person-card-menu).
    const [height, setHeight] = useState<number | undefined>(undefined);

    const content = (
        <>
            {compact
                ? <CompactContent person={person} heading={heading} />
                : <DetailedContent person={person} heading={heading} />}
            {extra}
        </>
    );

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

    // Долгое нажатие — меню «Поделиться» и «Уточнить сведения»
    // (см. person-card-menu).
    return (
        <PersonCardMenu
            person={person}
            name={formatPersonHeading(person.ФИО, holinessOf(person), order) ?? heading ?? `Дело №${person.Номер}`}
            preview={preview}
            previewHeight={height}>
            {(onLongPress) => (
                <CardPressable
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
                    containerStyle={[
                        styles.container,
                        compact && styles.containerCompact,
                        { borderColor: theme.separator },
                    ]}
                    background={theme.background}
                    pressedBackground={pressedColor}>
                    {content}
                </CardPressable>
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
    const { layout } = usePhotoLayout();
    const compactPhoto = layout === 'compact';
    // Место под снимок резервируем только если он действительно есть:
    // у дел без фотографий имя не должно сужаться.
    const showCompactPhoto = compactPhoto && Array.isArray(person.Фотографии) && person.Фотографии.length > 0;

    return (
        <>
            {!compactPhoto && <PersonPhotos photos={person.Фотографии} name={person.ФИО} />}

            {/* Сан здесь — в строке с годами, над именем только чин. */}
            <View style={showCompactPhoto ? styles.headCompact : undefined}>
                <PersonRankLine holiness={holinessOf(person)} style={styles.rank} />
                <ThemedText style={styles.title}>
                    {heading ?? '—'}
                </ThemedText>
                {showCompactPhoto && (
                    // Абсолютно, а не второй колонкой: иначе высота снимка
                    // растягивает строку имени и под ней появляется пустой отступ.
                    <View style={styles.compactThumbnail}>
                        <PersonThumbnail
                            photos={person.Фотографии}
                            name={person.ФИО}
                            size={COMPACT_PHOTO_SIZE}
                        />
                    </View>
                )}
            </View>
            {(person?.Рождение?.год || person?.Кончина?.год || person?.сан_церк_служение) && (
                <ThemedText style={[styles.subtitle, showCompactPhoto && styles.subtitleCompact]}>
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
    headCompact: {
        position: 'relative',
        // Место под абсолютный снимок, чтобы имя не заезжало под него.
        paddingRight: COMPACT_PHOTO_SIZE + Spacing.three,
    },
    compactThumbnail: {
        position: 'absolute',
        top: 0,
        right: 0,
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
    subtitleCompact: {
        // Снимок чуть ниже имени и заходит на первую строку годов.
        paddingRight: COMPACT_PHOTO_SIZE + Spacing.three,
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
