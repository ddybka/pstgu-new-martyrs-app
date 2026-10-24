import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { LinkRow } from '@/components/link-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorSchemePreference, type ColorSchemePreference } from '@/context/color-scheme';
import { useTheme } from '@/hooks/use-theme';

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
        <InfoSection title="Тема оформления">
            <View style={[styles.group, { borderColor: theme.separator }]}>
                {THEME_OPTIONS.map((option, index) => {
                    const selected = option.value === preference;
                    return (
                        <Pressable
                            key={option.value}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            onPress={() => setPreference(option.value)}
                            style={({ pressed }) => [
                                styles.optionRow,
                                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.separator },
                                { opacity: pressed ? 0.7 : 1 },
                            ]}>
                            <ThemedText style={styles.optionText}>{option.label}</ThemedText>
                            {selected && (
                                <SymbolView
                                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                                    size={18}
                                    tintColor={theme.text}
                                    weight="semibold"
                                />
                            )}
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
        <InfoSection title="Скачать базу">
            <InfoParagraph>
                Сведения сохранятся на устройстве и будут доступны без интернета, например в поездке. Выберите месяцы, которые вам нужны.
            </InfoParagraph>

            <View style={styles.monthsHeader}>
                <ThemedText themeColor="textSecondary" style={styles.note}>
                    Выбрано месяцев: {selected.length}
                </ThemedText>
                <Pressable accessibilityRole="button" onPress={toggleAll} hitSlop={8}>
                    <ThemedText style={styles.selectAll}>{allSelected ? 'Снять все' : 'Выбрать все'}</ThemedText>
                </Pressable>
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
                            style={({ pressed }) => [
                                styles.month,
                                {
                                    borderColor: active ? theme.text : theme.separator,
                                    backgroundColor: active ? theme.backgroundSelected : 'transparent',
                                    opacity: pressed ? 0.7 : 1,
                                },
                            ]}>
                            <ThemedText style={styles.monthText}>{month.name}</ThemedText>
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

            {selected.length > 0 && <LinkRow label="Скачать" onPress={startDownload} />}
        </InfoSection>
    );
}

function formatSize(megabytes: number) {
    if (megabytes >= 1024) return `около ${(megabytes / 1024).toFixed(1).replace('.', ',')} ГБ`;
    return `около ${megabytes.toFixed(1).replace('.', ',')} МБ`;
}

const styles = StyleSheet.create({
    group: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.three,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectAll: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    months: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
        marginBottom: Spacing.three,
    },
    month: {
        flexBasis: '30%',
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: Spacing.two + Spacing.one,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: Spacing.two,
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
    },
    photosLabel: {
        flex: 1,
        gap: Spacing.half,
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: Spacing.three,
    },
    size: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '600',
    },
});
