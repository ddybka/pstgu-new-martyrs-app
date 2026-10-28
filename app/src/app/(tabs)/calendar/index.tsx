import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MONTHS_FOR_DATE, MonthCalendar, type CalendarDate } from '@/components/calendar/month-calendar';
import { TabHeaderMenu } from '@/components/tab-header-menu';
import { ShowCards } from '@/components/show-cards';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { dayOfYearFilter, usePersons } from '@/hooks/use-persons';
import { readStored, writeStored } from '@/utils/storage';
import { ListButton } from '@/components/list-button';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const STORAGE_KEY = 'calendar-selected-date';

function parseStored(raw: string | null): CalendarDate | null {
    try {
        const date = raw ? JSON.parse(raw) : null;
        const valid =
            Number.isInteger(date?.year) &&
            Number.isInteger(date?.month) && date.month >= 1 && date.month <= 12 &&
            Number.isInteger(date?.day) && date.day >= 1 && date.day <= 31;
        return valid ? { year: date.year, month: date.month, day: date.day } : null;
    } catch {
        return null;
    }
}

function todayDate(): CalendarDate {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export default function CalendarScreen() {
    const [selected, setSelected] = useState<CalendarDate>(todayDate);
    const [calendarKey, setCalendarKey] = useState(0);
    const touched = useRef(false);

    useEffect(() => {
        let active = true;
        readStored(STORAGE_KEY).then((raw) => {
            const stored = parseStored(raw);
            if (!active || !stored || touched.current) return;
            setSelected(stored);
            setCalendarKey((key) => key + 1);
        });
        return () => {
            active = false;
        };
    }, []);

    const select = (date: CalendarDate) => {
        touched.current = true;
        setSelected(date);
        void writeStored(STORAGE_KEY, JSON.stringify(date));
    };

    const { persons, total, hasNext, loading, refreshing, error, stale, updatedAt, refresh } = usePersons({
        filter: dayOfYearFilter(selected.month, selected.day),
    });

    const header = (
        <View style={styles.header}>
            <MonthCalendar key={calendarKey} value={selected} onChange={select} />

            <View style={styles.titleRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.dateTitle}>
                    {formatMartyrsCount(total, `${selected.day} ${MONTHS_FOR_DATE[selected.month - 1].toLowerCase()}`)}
                </ThemedText>
                <TabHeaderMenu />
            </View>
        </View>
    );

    const footer = (
        <View style={styles.footer}>
            <ListButton label="Помочь проекту" onPress={() => router.push('/help')} />
            <ListButton label="О проекте" onPress={() => router.push('/about')} />
            <ListButton label="Настройки" onPress={() => router.push('/settings')} />
            <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.version}
            >
                v{Constants.expoConfig?.version ?? '0.0.0'}
            </ThemedText>
        </View>
    );

    return (
        <ShowCards
            persons={persons}
            header={header}
            footer={footer}
            loading={loading}
            loadingMore={hasNext}
            refreshing={refreshing}
            onRefresh={refresh}
            error={error}
            stale={stale}
            updatedAt={updatedAt}
            horizontalPadding={Spacing.two}
        />
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: Spacing.two,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingRight: Spacing.three,
    },
    dateTitle: {
        flex: 1,
        paddingHorizontal: Spacing.three,
        paddingBottom: Spacing.three,
        fontSize: 17,
        lineHeight: 22,
    },
    footer: {
        width: '100%',
        paddingTop: Spacing.five,
    },
    version: {
        paddingTop: Spacing.five,
        textAlign: 'center',
    },
});

function formatMartyrsCount(count: number, date: string) {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    const singular = lastDigit === 1 && lastTwoDigits !== 11;
    const noun =
        lastTwoDigits >= 11 && lastTwoDigits <= 14
            ? 'новомучеников'
            : singular
                ? 'новомученик'
                : lastDigit >= 2 && lastDigit <= 4
                    ? 'новомученика'
                    : 'новомучеников';

    return `Найдено ${count} ${noun},\n${singular ? 'поминаемый' : 'поминаемых'} ${date}`;
}
