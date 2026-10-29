import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { INFO_INSET, InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { ThemedText } from '@/components/themed-text';
import { PlateButton } from '@/components/ui/plate-button';
import { ButtonRadius, Spacing } from '@/constants/theme';
import { useColorSchemePreference, type ColorSchemePreference } from '@/context/color-scheme';
import { useTheme } from '@/hooks/use-theme';

import { downloadMonth } from '@/utils/offline/offline-downloader';
import { verifyMonth, verifyMonthPhotos } from '@/utils/offline/offline-verifier';

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
    const [downloadedMonths, setDownloadedMonths] = useState<number[]>([]);
    const [withPhotos, setWithPhotos] = useState(false);

    const [monthDownloading, setMonthDownloading] = useState(false);
    const [monthProgress, setMonthProgress] = useState({
        month: 0,
        day: 0,
        completedDays: 0,
        totalDays: 0,
    });

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

    useEffect(() => {
    let active = true;

    async function checkDownloadedMonths() {
        const downloaded: number[] = [];

        for (let month = 1; month <= 12; month++) {
            try {
                const result = await verifyMonth(month);

                if (result.complete) {
                    downloaded.push(month);
                }
            } catch (error) {
                console.warn(`Ошибка проверки месяца ${month}:`, error);
            }
        }

        if (active) {
            setDownloadedMonths(downloaded);
        }
    }

    void checkDownloadedMonths();

    return () => {
        active = false;
    };
}, []);

const startDownload = async () => {
    if (monthDownloading || selected.length === 0) return;

    setMonthDownloading(true);

    try {
        for (const index of selected) {
            const month = index + 1;

            // Скачиваем списки и карточки за месяц.
            await downloadMonth(
                month,
                (progress) => {
                    setMonthProgress({
                        month: progress.month,
                        day: progress.day,
                        completedDays: progress.completedDays,
                        totalDays: progress.totalDays,
                    });
                },
                downloadedMonths.includes(month),
                withPhotos
            );

            // Проверяем сохранённые файлы.
            const result = await verifyMonth(month);

            if (!result.complete) {
                throw new Error(
                    `Не удалось полностью сохранить ${MONTHS[index].name}.\n` +
                    `Дней: ${result.savedDays} из ${result.totalDays}.\n` +
                    `Карточек: ${result.savedPersons} из ${result.totalPersons}.`
                );
            }


            if (withPhotos) {
                const photosResult = await verifyMonthPhotos(month);

                console.log(
                    `${MONTHS[index].name}: фотографии ` +
                    `${photosResult.savedPhotos}/${photosResult.totalPhotos}`
                );

                if (!photosResult.complete) {
                    throw new Error(
                        `Не все фотографии месяца ${MONTHS[index].name} скачаны.\n` +
                        `Фотографий: ${photosResult.savedPhotos} ` +
                        `из ${photosResult.totalPhotos}.`
                    );
                }
            }


            setDownloadedMonths((current) =>
                current.includes(month) ? current : [...current, month]
            );

            console.log(
                `${MONTHS[index].name}: проверка пройдена. ` +
                `Дней: ${result.savedDays}/${result.totalDays}, ` +
                `карточек: ${result.savedPersons}/${result.totalPersons}`
            );
        }

        Alert.alert(
            'Загрузка завершена',
            'Все выбранные месяцы скачаны и проверены.'
        );
    } catch (error) {
        console.error('Ошибка скачивания или проверки:', error);

        Alert.alert(
            'Ошибка загрузки',
            error instanceof Error ? error.message : String(error)
        );
    } finally {
        setMonthDownloading(false);
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
                    const downloaded = downloadedMonths.includes(index + 1);
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
                                {downloaded && (
                                    <ThemedText
                                        themeColor={active ? 'background' : 'textSecondary'}
                                        style={styles.downloadedLabel}>
                                        ✓
                                    </ThemedText>
                                )}
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
                    disabled={monthDownloading}
                    onPress={startDownload}
                    style={({ pressed }) => [
                        styles.download,
                        { backgroundColor: theme.text },
                        pressed && styles.pressed,
                    ]}>
                    <ThemedText themeColor="background" style={styles.downloadText}>
                        {monthDownloading ? 'Скачивание...' : 'Скачать'}
                    </ThemedText>
                </Pressable>
            )}

            {monthDownloading && (
                <View style={{ paddingHorizontal: INFO_INSET }}>
                    <ThemedText>
                        Месяц: {MONTHS[monthProgress.month - 1]?.name ?? 'Подготовка'}
                    </ThemedText>

                    <ThemedText>
                        Загружено дней: {monthProgress.completedDays}{' '}
                        из {monthProgress.totalDays}
                    </ThemedText>

                    <ThemedText themeColor="textSecondary">
                        Текущий день: {monthProgress.day}
                    </ThemedText>
                </View>
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
    downloadedLabel: {
    fontSize: 12,
    marginTop: 3,
    },
});
