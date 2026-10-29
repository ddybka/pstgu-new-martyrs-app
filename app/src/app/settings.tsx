import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { INFO_INSET, InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { ThemedText } from '@/components/themed-text';
import { PlateButton } from '@/components/ui/plate-button';
import { ButtonRadius, Spacing } from '@/constants/theme';
import { useColorSchemePreference, type ColorSchemePreference } from '@/context/color-scheme';
import { NAME_ORDERS, useNameOrder } from '@/context/name-order';
import { useApiResource } from '@/hooks/use-api-resource';
import { useTheme } from '@/hooks/use-theme';
import { apiFetch } from '@/utils/api-fetch';
import {
    cancelDownload,
    clearDownloads,
    startDownload,
    useDownloadState,
    useManifest,
} from '@/utils/offline-download';
import { photosSize } from '@/utils/offline-photos';
import { plural } from '@/utils/plural';

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

const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/**
 * Средний вес на одного человека, по выборке из базы: биография в JSON —
 * около 15 КБ, фотографий в среднем 0,4 на человека по 70 КБ.
 */
const TEXT_MB_PER_PERSON = 15 / 1024;
const PHOTOS_MB_PER_PERSON = (0.4 * 70) / 1024;

/** Сколько дел в каждом месяце — по одному короткому запросу на месяц. */
async function fetchMonthCounts(): Promise<number[]> {
    return Promise.all(
        MONTH_NAMES.map(async (_, index) => {
            const params = new URLSearchParams({
                data_format: 'item',
                fields: 'Заголовок',
                filter: JSON.stringify({ 'death.month': index + 1 }),
                take: '1',
            });
            const page = await apiFetch<{ total_docs_count: number }>(`public/dela?${params.toString()}`);
            return page.total_docs_count;
        })
    );
}

export default function SettingsScreen() {
    return (
        <InfoPage>
            <ThemeSection />
            <NameOrderSection />
            {/* В вебе скачивания нет: localStorage вмещает около 5 МБ, а без
                сети сайт и не откроется — для этого нужен service worker. */}
            {Platform.OS !== 'web' && <DownloadSection />}
        </InfoPage>
    );
}

function ThemeSection() {
    const { preference, setPreference } = useColorSchemePreference();

    return (
        <InfoSection title="Тема оформления" style={styles.section}>
            <Segments options={THEME_OPTIONS} value={preference} onChange={setPreference} />
        </InfoSection>
    );
}

function NameOrderSection() {
    const { order, setOrder } = useNameOrder();
    const example = NAME_ORDERS.find((option) => option.value === order)?.example;

    return (
        <InfoSection title="Отображение ФИО" style={styles.section}>
            <Segments options={NAME_ORDERS} value={order} onChange={setOrder} />
            <ThemedText themeColor="textSecondary" style={[styles.note, styles.inset]}>
                Пример: {example}
            </ThemedText>
        </InfoSection>
    );
}

/** Варианты в ряд, поровну на всю ширину. Выбранный — на плашке, как активная вкладка в веб-шапке. */
function Segments<T extends string>({
    options,
    value,
    onChange,
}: {
    options: readonly { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    const theme = useTheme();

    return (
        <View accessibilityRole="radiogroup" style={styles.segments}>
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => onChange(option.value)}
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
    );
}

function DownloadSection() {
    const theme = useTheme();
    const [selected, setSelected] = useState<number[]>([]);
    const [withPhotos, setWithPhotos] = useState(false);
    const download = useDownloadState();
    const manifest = useManifest();
    const { data: counts } = useApiResource<number[]>('downloads/month-counts', { fetcher: fetchMonthCounts });

    const running = download.status === 'running';
    const allSelected = selected.length === MONTH_NAMES.length;
    const downloadedMonths = Object.keys(manifest).map(Number);
    // Папка фотографий пересчитывается, когда меняются скачанные месяцы.
    const savedPhotos = useMemo(() => (downloadedMonths.length > 0 ? photosSize() : 0), [manifest]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleMonth = (index: number) =>
        setSelected((current) =>
            current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
        );

    const toggleAll = () => setSelected(allSelected ? [] : MONTH_NAMES.map((_, index) => index));

    const persons = selected.reduce((sum, index) => sum + (counts?.[index] ?? 0), 0);
    const size = persons * (TEXT_MB_PER_PERSON + (withPhotos ? PHOTOS_MB_PER_PERSON : 0));

    const start = () => {
        void startDownload(selected.map((index) => index + 1), withPhotos);
        setSelected([]);
    };

    const confirmClear = () => {
        const message = 'Скачанные фотографии будут удалены, а отметки о месяцах сброшены.';
        if (Platform.OS === 'web') {
            if (window.confirm(message)) void clearDownloads();
            return;
        }
        Alert.alert('Удалить скачанное?', message, [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Удалить', style: 'destructive', onPress: () => void clearDownloads() },
        ]);
    };

    return (
        <InfoSection title="Скачать базу" style={styles.section}>
            <InfoParagraph>
                Биографии сохранятся на устройстве и будут открываться без интернета, например в поездке. Месяц — это дни памяти: скачаются все, кого поминают в этом месяце.
            </InfoParagraph>

            <View style={styles.monthsHeader}>
                <ThemedText themeColor="textSecondary" style={styles.note}>
                    Выбрано месяцев: {selected.length}
                </ThemedText>
                <PlateButton label={allSelected ? 'Снять все' : 'Выбрать все'} onPress={toggleAll} />
            </View>

            <View style={styles.months}>
                {MONTH_NAMES.map((name, index) => {
                    const active = selected.includes(index);
                    const saved = manifest[index + 1];
                    return (
                        <Pressable
                            key={name}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: active, disabled: running }}
                            accessibilityLabel={saved ? `${name}, скачан` : name}
                            disabled={running}
                            onPress={() => toggleMonth(index)}
                            // Как вкладки веб-шапки: серые плашки без обводки,
                            // выбранные — инверсные.
                            style={({ pressed }) => [
                                styles.month,
                                { backgroundColor: active ? theme.text : theme.backgroundElement },
                                (pressed || running) && styles.pressed,
                            ]}>
                            <ThemedText
                                themeColor={active ? 'background' : 'textSecondary'}
                                style={styles.monthText}>
                                {saved ? `${name} ✓` : name}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>

            <View style={[styles.group, styles.photosRow, { borderColor: theme.separator }]}>
                <View style={styles.photosLabel}>
                    <ThemedText style={styles.optionText}>С фотографиями</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.note}>
                        Займёт примерно втрое больше места
                    </ThemedText>
                </View>
                <Switch value={withPhotos} onValueChange={setWithPhotos} disabled={running} />
            </View>

            {running ? (
                <DownloadProgressView state={download} />
            ) : (
                <>
                    <View style={styles.summary}>
                        <ThemedText themeColor="textSecondary" style={styles.note}>
                            Объём загрузки
                        </ThemedText>
                        <ThemedText style={styles.size}>
                            {selected.length === 0
                                ? 'ничего не выбрано'
                                : counts
                                    ? `${plural(persons, 'человек', 'человека', 'человек')}, ${formatSize(size)}`
                                    : 'считаем…'}
                        </ThemedText>
                    </View>

                    {download.status === 'done' && (
                        <ThemedText themeColor="textSecondary" style={[styles.note, styles.inset]}>
                            {download.failed === 0
                                ? 'Готово: всё скачано.'
                                : `Готово, но ${plural(download.failed, 'запись', 'записи', 'записей')} не скачалось — повторите загрузку при хорошей связи.`}
                        </ThemedText>
                    )}
                    {download.status === 'error' && (
                        <ThemedText themeColor="textSecondary" style={[styles.note, styles.inset]}>
                            Загрузка прервалась: {download.error.message}
                        </ThemedText>
                    )}
                    {download.status === 'cancelled' && (
                        <ThemedText themeColor="textSecondary" style={[styles.note, styles.inset]}>
                            Загрузка остановлена. Скачанные месяцы отмечены галочкой.
                        </ThemedText>
                    )}
                </>
            )}

            {running ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={cancelDownload}
                    style={({ pressed }) => [
                        styles.download,
                        { backgroundColor: theme.backgroundElement },
                        pressed && styles.pressed,
                    ]}>
                    <ThemedText style={styles.downloadText}>Остановить</ThemedText>
                </Pressable>
            ) : selected.length > 0 && (
                // Главное действие страницы — самая заметная кнопка на ней:
                // инверсная, во всю ширину колонки.
                <Pressable
                    accessibilityRole="button"
                    onPress={start}
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

            {!running && downloadedMonths.length > 0 && (
                <View style={[styles.summary, styles.saved]}>
                    <ThemedText themeColor="textSecondary" style={[styles.note, styles.savedText]}>
                        Скачано: {plural(downloadedMonths.length, 'месяц', 'месяца', 'месяцев')}
                        {savedPhotos > 0 ? `, фотографии — ${formatSize(savedPhotos / 1024 / 1024)}` : ''}
                    </ThemedText>
                    <PlateButton label="Удалить" onPress={confirmClear} />
                </View>
            )}
        </InfoSection>
    );
}

function DownloadProgressView({ state }: { state: Extract<ReturnType<typeof useDownloadState>, { status: 'running' }> }) {
    const theme = useTheme();
    const share = state.total > 0 ? state.done / state.total : 0;

    return (
        <View style={[styles.progress, styles.inset]}>
            <View style={styles.progressHeader}>
                <ActivityIndicator size="small" />
                <ThemedText style={styles.optionText}>
                    {MONTH_NAMES[state.month - 1]}
                    {state.monthsTotal > 1 ? ` (${state.monthsDone + 1} из ${state.monthsTotal})` : ''}
                </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.progressBar, { width: `${Math.round(share * 100)}%`, backgroundColor: theme.text }]} />
            </View>
            <ThemedText themeColor="textSecondary" style={styles.note}>
                {state.stage}: {state.done} из {state.total}
            </ThemedText>
        </View>
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
    inset: {
        paddingHorizontal: INFO_INSET,
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
        flexShrink: 1,
        textAlign: 'right',
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '600',
    },
    saved: {
        alignItems: 'center',
        gap: Spacing.three,
    },
    savedText: {
        flex: 1,
    },
    progress: {
        marginTop: Spacing.four,
        gap: Spacing.two,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
    },
});
