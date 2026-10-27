import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { INFO_INSET, InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { ThemedText } from '@/components/themed-text';
import { PlateButton } from '@/components/ui/plate-button';
import { ButtonRadius, Spacing } from '@/constants/theme';
import { useColorSchemePreference, type ColorSchemePreference } from '@/context/color-scheme';
import { useTheme } from '@/hooks/use-theme';

import { Metadata } from "expo-router/server";
import { SITE_URL } from "@/constants/site";

export function generateMetadata(): Metadata {
    const title = 'Настройки и скачивание базы - Память новомучеников.';
    const description = 'Настройте тему оформления и скачайте базу новомучеников для просмотра без интернета: выберите нужные месяцы и наличие фотографий.';

    const url = `${SITE_URL}/settings`;

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

const THEME_OPTIONS: { value: ColorSchemePreference; label: string }[] = [
    { value: 'system', label: 'Системная' },
    { value: 'light', label: 'Светлая' },
    { value: 'dark', label: 'Тёмная' },
];

// Примерный объём в мегабайтах, пока нет данных от API
const MONTHS = [
    { name: 'Январь', text: 0.4, photos: 28 },
    { name: 'Февраль', text: 0.5, photos: 34 },
    { name: 'Март', text: 0.6, photos: 41 },
    { name: 'Апрель', text: 0.4, photos: 27 },
    { name: 'Май', text: 0.4, photos: 25 },
    { name: 'Июнь', text: 0.3, photos: 22 },
    { name: 'Июль', text: 0.4, photos: 26 },
    { name: 'Август', text: 0.6, photos: 39 },
    { name: 'Сентябрь', text: 0.7, photos: 45 },
    { name: 'Октябрь', text: 0.6, photos: 40 },
    { name: 'Ноябрь', text: 0.8, photos: 52 },
    { name: 'Декабрь', text: 0.7, photos: 47 },
];

export default function SettingsScreen() {
    return (
        <InfoPage>
            <ThemeSection />
            <DownloadSection />
        </InfoPage>
    );
}

function ThemeSection() {
    const theme = useTheme();
    const { preference, setPreference } = useColorSchemePreference();

    return (
        <InfoSection title="Тема оформления" style={styles.section}>
            {/* Варианты в ряд, поровну на всю ширину. Выбранный — на плашке,
                как активная вкладка в веб-шапке. */}
            <View accessibilityRole="radiogroup" style={styles.segments}>
                {THEME_OPTIONS.map((option) => {
                    const selected = option.value === preference;
                    return (
                        <Pressable
                            key={option.value}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            onPress={() => setPreference(option.value)}
                            style={({ pressed }) => [
                                styles.segment,
                                selected && { backgroundColor: theme.backgroundElement },
                                pressed && styles.pressed,
                            ]}>
                            <ThemedText
                                themeColor={selected ? 'text' : 'textSecondary'}
                                style={[styles.optionText, selected && styles.segmentSelected]}>
                                {option.label}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>
        </InfoSection>
    );
}

function DownloadSection() {
    const theme = useTheme();
    const [selected, setSelected] = useState<number[]>([]);
    const [withPhotos, setWithPhotos] = useState(false);

    const allSelected = selected.length === MONTHS.length;

    const toggleMonth = (index: number) =>
        setSelected((current) =>
            current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
        );

    const toggleAll = () => setSelected(allSelected ? [] : MONTHS.map((_, index) => index));

    const size = selected.reduce(
        (sum, index) => sum + MONTHS[index].text + (withPhotos ? MONTHS[index].photos : 0),
        0,
    );

    const startDownload = () => {
        const message = 'Скачивание базы появится в следующих версиях приложения.';
        if (Platform.OS === 'web') {
            window.alert(message);
        } else {
            Alert.alert('Скачивание', message);
        }
    };

    return (
        <InfoSection title="Скачать базу" style={styles.section}>
            <InfoParagraph>
                Сведения сохранятся на устройстве и будут доступны без интернета, например в поездке. Выберите месяцы, которые вам нужны.
            </InfoParagraph>

            <View style={styles.monthsHeader}>
                <ThemedText themeColor="textSecondary" style={styles.note}>
                    Выбрано месяцев: {selected.length}
                </ThemedText>
                <PlateButton label={allSelected ? 'Снять все' : 'Выбрать все'} onPress={toggleAll} />
            </View>

            <View style={styles.months}>
                {MONTHS.map((month, index) => {
                    const active = selected.includes(index);
                    return (
                        <Pressable
                            key={month.name}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: active }}
                            onPress={() => toggleMonth(index)}
                            // Как вкладки веб-шапки: серые плашки без обводки,
                            // выбранные — инверсные.
                            style={({ pressed }) => [
                                styles.month,
                                { backgroundColor: active ? theme.text : theme.backgroundElement },
                                pressed && styles.pressed,
                            ]}>
                            <ThemedText
                                themeColor={active ? 'background' : 'textSecondary'}
                                style={styles.monthText}>
                                {month.name}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>

            <View style={[styles.group, styles.photosRow, { borderColor: theme.separator }]}>
                <View style={styles.photosLabel}>
                    <ThemedText style={styles.optionText}>С фотографиями</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.note}>
                        Займёт заметно больше места
                    </ThemedText>
                </View>
                <Switch value={withPhotos} onValueChange={setWithPhotos} />
            </View>

            <View style={styles.summary}>
                <ThemedText themeColor="textSecondary" style={styles.note}>
                    Объём загрузки
                </ThemedText>
                <ThemedText style={styles.size}>{selected.length ? formatSize(size) : 'ничего не выбрано'}</ThemedText>
            </View>

            {selected.length > 0 && (
                // Главное действие страницы — самая заметная кнопка на ней:
                // инверсная, во всю ширину колонки.
                <Pressable
                    accessibilityRole="button"
                    onPress={startDownload}
                    style={({ pressed }) => [
                        styles.download,
                        { backgroundColor: theme.text },
                        pressed && styles.pressed,
                    ]}>
                    <ThemedText themeColor="background" style={styles.downloadText}>
                        Скачать
                    </ThemedText>
                </Pressable>
            )}
        </InfoSection>
    );
}

function formatSize(megabytes: number) {
    if (megabytes >= 1024) return `около ${(megabytes / 1024).toFixed(1).replace('.', ',')} ГБ`;
    return `около ${megabytes.toFixed(1).replace('.', ',')} МБ`;
}

// Отступы крупнее, чем на текстовых страницах, — как между блоками на
// странице новомученика: настройки читаются блоками, а не сплошным текстом.
const styles = StyleSheet.create({
    section: {
        marginTop: Spacing.six,
        gap: Spacing.three,
    },
    segments: {
        flexDirection: 'row',
        gap: Spacing.one,
        paddingHorizontal: INFO_INSET,
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.two + Spacing.one,
        borderRadius: Spacing.two,
    },
    segmentSelected: {
        fontWeight: '600',
    },
    pressed: {
        opacity: 0.7,
    },
    group: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionText: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '400',
    },
    note: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
    },
    monthsHeader: {
        paddingHorizontal: INFO_INSET,
        marginTop: Spacing.two,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    months: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
        paddingHorizontal: INFO_INSET,
        marginBottom: Spacing.four,
    },
    month: {
        flexBasis: '30%',
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: Spacing.two + Spacing.one,
        borderRadius: ButtonRadius,
    },
    monthText: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '400',
    },
    photosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        paddingHorizontal: INFO_INSET,
    },
    photosLabel: {
        flex: 1,
        gap: Spacing.half,
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: Spacing.four,
        paddingHorizontal: INFO_INSET,
    },
    download: {
        marginTop: Spacing.four,
        marginHorizontal: INFO_INSET,
        alignItems: 'center',
        paddingVertical: Spacing.three,
        borderRadius: ButtonRadius,
    },
    downloadText: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '600',
    },
    size: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '600',
    },
});
