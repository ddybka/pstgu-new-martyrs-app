import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MONTHS_FOR_DATE, MonthCalendar, type CalendarDate } from '@/components/calendar/month-calendar';
import { TabHeaderMenu } from '@/components/tab-header-menu';
import { ShowCards } from '@/components/show-cards';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { dayOfYearFilter, usePersons } from '@/hooks/use-persons';

function todayDate(): CalendarDate {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export default function CalendarScreen() {
    const [selected, setSelected] = useState<CalendarDate>(todayDate);

    const { persons, loading, refreshing, error, stale, updatedAt, refresh } = usePersons({
        filter: dayOfYearFilter(selected.month, selected.day),
    });

    const header = (
        <View style={styles.header}>
            <MonthCalendar value={selected} onChange={setSelected} />

            <View style={styles.titleRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.dateTitle}>
                    {formatMartyrsCount(persons.length, `${selected.day} ${MONTHS_FOR_DATE[selected.month - 1].toLowerCase()}`)}
                </ThemedText>
                <TabHeaderMenu />
            </View>
        </View>
    );

    return (
        <ShowCards
            persons={persons}
            header={header}
            loading={loading}
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

    return `Найдено ${count} ${noun},\n${singular ? 'поминаемый' : 'поминаемых'} ${date}.`;
}
