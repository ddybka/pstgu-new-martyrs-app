import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { INFO_INSET, InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { ThemedText } from '@/components/themed-text';
import { PlateButton } from '@/components/ui/plate-button';
import { ButtonRadius, Spacing } from '@/constants/theme';
import { useColorSchemePreference, type ColorSchemePreference } from '@/context/color-scheme';
import { useTheme } from '@/hooks/use-theme';

import {
    saveMonth,
    loadMonth,
    loadPerson,
} from '@/utils/offline/offline-storage';
import {
    downloadDay,
    downloadPerson,
    downloadDayPersons,
    downloadMonth,
} from '@/utils/offline/offline-downloader';

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

    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({
        completed: 0,
        total: 0,
    });
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

    const startDownload = async () => {
        if (monthDownloading || selected.length === 0) return;

        setMonthDownloading(true);

        try {
            for (const index of selected) {
                // Индексы массива начинаются с 0,
                // а номера месяцев — с 1.
                const month = index + 1;

                await downloadMonth(month, (progress) => {
                    setMonthProgress({
                        month: progress.month,
                        day: progress.day,
                        completedDays: progress.completedDays,
                        totalDays: progress.totalDays,
                    });
                });
            }

            Alert.alert(
                'Готово',
                'Выбранные месяцы сохранены для офлайн-доступа.'
            );
        } catch (error) {
            console.error('Ошибка скачивания месяца:', error);
            Alert.alert('Ошибка', String(error));
        } finally {
            setMonthDownloading(false);
        }
    };



async function testDownloadDay() {
    try {
        await downloadDay(10, 15);

        const data = await loadMonth(10);

        console.log('Скачанные данные:', data);

        Alert.alert(
            'Загрузка завершена',
            JSON.stringify(data, null, 2)
        );
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        Alert.alert('Ошибка', String(error));
    }
}


async function testDownloadPerson() {
    try {
        // Получаем номера дел за 15 октября
        const monthData = await loadMonth<{
            month: number;
            days: Record<string, number[]>;
        }>(10);

        const numbers = monthData?.days['15'] ?? [];

        if (numbers.length === 0) {
            Alert.alert(
                'Нет данных',
                'Сначала скачай список дел за 15 октября.'
            );
            return;
        }

        // Берём первое дело из сохранённого списка
        const number = numbers[0];

        await downloadPerson(number);

        const person = await loadPerson<unknown>(number);

        console.log('Сохранённая карточка:', person);

        Alert.alert(
            'Проверка завершена',
            `Карточка №${number} сохранена и прочитана.`
        );
    } catch (error) {
        console.error('Ошибка скачивания карточки:', error);
        Alert.alert('Ошибка', String(error));
    }
}



async function testDownloadAllPersons() {
    if (downloading) return;

    setDownloading(true);
    setDownloadProgress({
        completed: 0,
        total: 0,
    });

    try {
        await downloadDayPersons(
            10,
            15,
            (progress) => {
                setDownloadProgress({
                    completed: progress.completed,
                    total: progress.total,
                });

                console.log(
                    `Загружено ${progress.completed} из ${progress.total}`
                );
            }
        );

        Alert.alert(
            'Готово',
            'Все карточки за 15 октября сохранены.'
        );
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        Alert.alert('Ошибка', String(error));
    } finally {
        setDownloading(false);
    }
}


    return (
        <InfoSection title="Скачать базу" style={styles.section}>
            <InfoParagraph>
                Сведения сохранятся на устройстве и будут доступны без интернета, например в поездке. Выберите месяцы, которые вам нужны.
            </InfoParagraph>



            <PlateButton
                label="Скачать данные за 15 октября"
                onPress={testDownloadDay}
            />

            <PlateButton
                label="Скачать одну полную карточку"
                onPress={testDownloadPerson}
            />
            <PlateButton
                label={
                    downloading
                        ? 'Скачивание...'
                        : 'Скачать все карточки за 15 октября'
                }
                onPress={testDownloadAllPersons}
            />

            {downloading && (
                <ThemedText>
                    Загружено {downloadProgress.completed} из {downloadProgress.total}
                </ThemedText>
            )}

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
});
