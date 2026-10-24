import { useState } from 'react';
import {
    FlatList,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chevron } from '@/components/ui/chevron';
import { Dropdown } from '@/components/ui/dropdown';

import { RETURN_BUTTON_HEIGHT, ReturnButton } from './return-button';
import { HeadingFonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const;

export const MONTHS_FOR_DATE = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const;

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const COLUMNS = 7;
const ROWS = 6;

const FIRST_YEAR = 1900;
const YEARS_AHEAD = 10;

const WEEKEND_FROM = 5;

export type CalendarDate = {
    year: number;
    month: number;
    day: number;
};

export type MonthCalendarProps = {
    value: CalendarDate;
    onChange: (date: CalendarDate) => void;
};

const HEADER_ROW_HEIGHT = Math.max(28, RETURN_BUTTON_HEIGHT);

const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: index + 1, label }));

function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

function firstWeekday(year: number, month: number) {
    return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

function MonthGrid({
    year,
    month,
    width,
    value,
    onChange,
}: {
    year: number;
    month: number;
    width: number;
    value: CalendarDate;
    onChange: (date: CalendarDate) => void;
}) {
    const theme = useTheme();

    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

    const offset = firstWeekday(year, month);
    const cells = Array.from({ length: ROWS * COLUMNS }, (_, index) => {
        const day = index - offset + 1;
        return day >= 1 && day <= daysInMonth(year, month) ? day : null;
    });

    const rows = Array.from({ length: ROWS }, (_, row) => cells.slice(row * COLUMNS, row * COLUMNS + COLUMNS));

    return (
        <View style={{ width }}>
            {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                    {row.map((day, column) => {
                        if (day === null) return <View key={`pad-${column}`} style={styles.cell} />;

                        const isSelected = year === value.year && month === value.month && day === value.day;
                        const isToday = isCurrentMonth && day === today.getDate();

                        return (
                            <Pressable
                                key={day}
                                onPress={() => onChange({ year, month, day })}
                                style={styles.cell}
                                accessibilityRole="button"
                                accessibilityLabel={`${day} ${MONTHS_FOR_DATE[month - 1]} ${year}`}
                                accessibilityState={{ selected: isSelected }}>
                                <View
                                    style={[styles.dayCircle, isSelected && { backgroundColor: theme.text }]}>
                                    <ThemedText
                                        style={[
                                            styles.dayText,
                                            column >= WEEKEND_FROM && { color: theme.textSecondary },
                                            isSelected && { color: theme.background },
                                            isToday && !isSelected && styles.todayText,
                                        ]}>
                                        {day}
                                    </ThemedText>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

function HeaderPicker({ label, accessibilityLabel, ...dropdown }: {
    label: string;
    accessibilityLabel: string;
    options: { value: number; label: string }[];
    value: number;
    onSelect: (value: number) => void;
}) {
    return (
        <Dropdown {...dropdown} accessibilityLabel={accessibilityLabel} minWidth={140}>
            <View style={styles.picker}>
                <ThemedText style={styles.monthTitle}>{label}</ThemedText>
                <Chevron direction="down" size={8} />
            </View>
        </Dropdown>
    );
}

export function MonthCalendar({ value, onChange }: MonthCalendarProps) {
    const theme = useTheme();
    const firstYear = FIRST_YEAR;
    const [lastYear] = useState(() => new Date().getFullYear() + YEARS_AHEAD);
    const yearCount = lastYear - firstYear + 1;
    const pageCount = yearCount * 12;

    const pageOf = (year: number, month: number) =>
        Math.min(pageCount - 1, Math.max(0, (year - firstYear) * 12 + month - 1));

    const [width, setWidth] = useState(0);
    const [page, setPage] = useState(() => pageOf(value.year, value.month));
    const [jump, setJump] = useState(() => ({ page, key: 0 }));

    const pages = Array.from({ length: pageCount }, (_, i) => i);
    const visibleYear = firstYear + Math.floor(page / 12);
    const visibleMonth = (page % 12) + 1;

    const yearOptions = Array.from({ length: yearCount }, (_, i) => ({
        value: lastYear - i,
        label: String(lastYear - i),
    }));

    const goTo = (year: number, month: number) => {
        const next = pageOf(year, month);
        if (next === page) return;

        setPage(next);
        setJump((current) => ({ page: next, key: current.key + 1 }));
    };

    const selectedVisible = value.year === visibleYear && value.month === visibleMonth;

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (width === 0) return;

        const index = Math.min(pageCount - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width)));
        if (index !== page) setPage(index);
    };

    const onLayout = (event: LayoutChangeEvent) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && next !== width) setWidth(next);
    };

    return (
        <View style={styles.container} onLayout={onLayout}>
            <View style={styles.header}>
                <HeaderPicker
                    label={MONTHS[visibleMonth - 1]}
                    accessibilityLabel="Выбрать месяц"
                    options={MONTH_OPTIONS}
                    value={visibleMonth}
                    onSelect={(month) => goTo(visibleYear, month)}
                />
                <HeaderPicker
                    label={String(visibleYear)}
                    accessibilityLabel="Выбрать год"
                    options={yearOptions}
                    value={visibleYear}
                    onSelect={(year) => goTo(year, visibleMonth)}
                />

                {!selectedVisible && (
                    <ReturnButton
                        label={`${value.day} ${MONTHS_FOR_DATE[value.month - 1]}`}
                        accessibilityLabel={`Вернуться к ${value.day} ${MONTHS_FOR_DATE[value.month - 1]}`}
                        onPress={() => goTo(value.year, value.month)}
                    />
                )}
            </View>

            <View style={styles.row}>
                {WEEKDAYS.map((weekday) => (
                    <View key={weekday} style={styles.cell}>
                        <ThemedText type="small" style={[styles.weekday, { color: theme.textSecondary }]}>
                            {weekday}
                        </ThemedText>
                    </View>
                ))}
            </View>

            {width > 0 && (
                <FlatList
                    key={jump.key}
                    data={pages}
                    keyExtractor={(index) => String(index)}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={jump.page}
                    getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                    onScroll={onScroll}
                    scrollEventThrottle={32}
                    renderItem={({ item }) => (
                        <MonthGrid
                            year={firstYear + Math.floor(item / 12)}
                            month={(item % 12) + 1}
                            width={width}
                            value={value}
                            onChange={onChange}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: Spacing.four,
        paddingTop: Spacing.two,
    },
    header: {
        height: HEADER_ROW_HEIGHT + Spacing.three,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingBottom: Spacing.three,
    },
    picker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.half,
    },
    monthTitle: {
        fontSize: 22,
        lineHeight: 28,
        fontFamily: HeadingFonts.bold,
    },
    weekday: {
        paddingBottom: Spacing.one,
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.half,
    },
    dayCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 17,
    },
    todayText: {
        fontFamily: HeadingFonts.bold,
    },
});
