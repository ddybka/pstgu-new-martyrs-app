import { type ComponentRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
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

/** Стрелки перелистывания — только на широком экране: на телефоне листают свайпом. */
const ARROWS_MIN_WIDTH = 700;

/** Сколько месяцев смонтировано по обе стороны от открытого. */
const PAGES_AROUND = 12;

/**
 * В вебе страницы докручивает не CSS scroll-snap, а сам календарь: через
 * столько миллисекунд после последнего события прокрутки (жест и инерция
 * тачпада закончились) и если страницу сдвинули хотя бы на эту долю ширины.
 */
const WEB_SETTLE_DELAY = 120;
const WEB_SETTLE_THRESHOLD = 0.08;

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

                        // День памяти от года не зависит: выбранное число
                        // отмечено в любом году, а не только в том, где его нажали.
                        const isSelected = month === value.month && day === value.day;
                        const isToday = isCurrentMonth && day === today.getDate();

                        return (
                            <Pressable
                                key={day}
                                onPress={() => onChange({ year, month, day })}
                                style={styles.cell}
                                accessibilityRole="button"
                                accessibilityLabel={`${day} ${MONTHS_FOR_DATE[month - 1]} ${year}`}
                                accessibilityState={{ selected: isSelected }}>
                                {/* Фон задан всегда, а `collapsable` выключен: иначе
                                    Android схлопывает пустой кружок (view flattening),
                                    и когда у него появляется фон, скругление иногда
                                    теряется — выделение выходит квадратным. */}
                                <View
                                    collapsable={false}
                                    style={[
                                        styles.dayCircle,
                                        { backgroundColor: isSelected ? theme.text : 'transparent' },
                                    ]}>
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

function ArrowButton({ direction, accessibilityLabel, disabled, onPress }: {
    direction: 'left' | 'right';
    accessibilityLabel: string;
    disabled: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            hitSlop={Spacing.one}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled }}
            style={({ pressed }) => [styles.arrow, (pressed || disabled) && styles.arrowDimmed]}>
            <Chevron direction={direction} />
        </Pressable>
    );
}

export function MonthCalendar({ value, onChange }: MonthCalendarProps) {
    const theme = useTheme();
    const showArrows = useWindowDimensions().width > ARROWS_MIN_WIDTH;
    const firstYear = FIRST_YEAR;
    const [lastYear] = useState(() => new Date().getFullYear() + YEARS_AHEAD);
    const yearCount = lastYear - firstYear + 1;
    const pageCount = yearCount * 12;

    const pageOf = (year: number, month: number) =>
        Math.min(pageCount - 1, Math.max(0, (year - firstYear) * 12 + month - 1));

    const [width, setWidth] = useState(0);
    const [page, setPage] = useState(() => pageOf(value.year, value.month));
    const [jump, setJump] = useState(() => ({ page, key: 0 }));

    // Не виртуализированный список на все месяцы с 1900 года, а окно вокруг
    // открытого: в вебе pagingEnabled — это CSS scroll-snap, и Safari заново
    // привязывается к ближайшей странице всякий раз, когда виртуализация
    // подменяет ячейки и распорки. Каждый раз — на страницу левее, так что
    // календарь сам уезжал к 1900 году. Дошли до края окна — пересоздаём его.
    const firstPage = Math.max(0, jump.page - PAGES_AROUND);
    const lastPage = Math.min(pageCount - 1, jump.page + PAGES_AROUND);
    const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, i) => firstPage + i);

    const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
    const initialOffset = (jump.page - firstPage) * width;
    // Страница, на которой лента последний раз стояла ровно: от неё в вебе
    // считается, в какую сторону листали.
    const restPage = useRef(jump.page);
    const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useLayoutEffect(() => {
        clearTimeout(settleTimer.current);
        restPage.current = jump.page;
        if (width > 0) scrollRef.current?.scrollTo({ x: initialOffset, animated: false });
        // Только при пересоздании окна: дальше страницу листает пользователь.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jump.key, width]);

    useEffect(() => () => clearTimeout(settleTimer.current), []);

    const scrollToPage = (target: number) => {
        scrollRef.current?.scrollTo({ x: (target - firstPage) * width, animated: true });
    };

    // CSS scroll-snap в Safari на маке листал несимметрично: лёгкий жест
    // вправо докручивался до следующего месяца, а влево — отскакивал назад.
    // Поэтому в вебе привязки нет, а докручиваем сами: любой заметный сдвиг
    // от страницы, где стояли, — переход в ту сторону, куда тянули.
    const settle = (x: number) => {
        const position = x / width;
        const nearest = Math.round(position);
        if (Math.abs(position - nearest) * width < 1) {
            restPage.current = firstPage + nearest;
            return;
        }

        const rest = restPage.current - firstPage;
        const shift = position - rest;
        const local =
            Math.abs(shift) < WEB_SETTLE_THRESHOLD ? rest : shift > 0 ? Math.ceil(position) : Math.floor(position);
        scrollToPage(firstPage + Math.min(lastPage - firstPage, Math.max(0, local)));
    };
    const visibleYear = firstYear + Math.floor(page / 12);
    const visibleMonth = (page % 12) + 1;

    // По возрастанию: старые годы сверху, новые снизу. Список открывается
    // сразу на выбранном году, так что листать от 1900 не приходится.
    const yearOptions = Array.from({ length: yearCount }, (_, i) => ({
        value: firstYear + i,
        label: String(firstYear + i),
    }));

    const goTo = (year: number, month: number) => {
        const next = pageOf(year, month);
        if (next === page) return;

        setPage(next);
        setJump((current) => ({ page: next, key: current.key + 1 }));
    };

    const selectedVisible = value.month === visibleMonth;

    // Смена года — списком или свайпом через январь — сдвигает и выбранную
    // дату: число то же, год новый. Число не трогаем даже для 29 февраля в
    // невисокосном году: день памяти от этого меняться не должен.
    const followYear = (year: number) => {
        if (year !== value.year) onChange({ ...value, year });
    };

    const changeYear = (year: number) => {
        goTo(year, visibleMonth);
        followYear(year);
    };

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Ширина уже другая, а список ещё не пересоздан — смещение посчитано
        // для старых страниц и указывает не туда.
        if (width === 0 || Math.abs(event.nativeEvent.layoutMeasurement.width - width) > 1) return;

        const x = event.nativeEvent.contentOffset.x;
        if (Platform.OS === 'web') {
            clearTimeout(settleTimer.current);
            settleTimer.current = setTimeout(() => settle(x), WEB_SETTLE_DELAY);
        }

        const local = Math.round(x / width);
        const index = Math.min(lastPage, Math.max(firstPage, firstPage + local));

        // Остановились на крайней странице окна, а дальше ещё есть месяцы.
        const settled = Math.abs(x - local * width) < 1;
        const atEdge = (index === firstPage && firstPage > 0) || (index === lastPage && lastPage < pageCount - 1);
        if (settled && atEdge && index !== jump.page) {
            setJump((current) => ({ page: index, key: current.key + 1 }));
        }

        if (index === page) return;
        setPage(index);
        followYear(firstYear + Math.floor(index / 12));
    };

    const onLayout = (event: LayoutChangeEvent) => {
        const next = event.nativeEvent.layout.width;
        if (next <= 0 || next === width) return;

        // Страницы меняют ширину, а смещение прокрутки остаётся прежним — и
        // указывает уже на другой месяц. Пересоздаём список на текущей
        // странице. В Safari ширина скачет, когда появляется и пропадает
        // вертикальный скроллбар (scrollbar-width: none там не везде работает):
        // без этого календарь листался, менял дату, список новомучеников
        // менял высоту, скроллбар снова пропадал — и так по кругу.
        if (width > 0) setJump((current) => ({ page, key: current.key + 1 }));
        setWidth(next);
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
                    onSelect={changeYear}
                />

                {/* Возврат к дате и стрелки — одной группой у правого края. */}
                <View style={styles.trailing}>
                    {!selectedVisible && (
                        <ReturnButton
                            label={`${value.day} ${MONTHS_FOR_DATE[value.month - 1]}`}
                            accessibilityLabel={`Вернуться к ${value.day} ${MONTHS_FOR_DATE[value.month - 1]}`}
                            onPress={() => goTo(visibleYear, value.month)}
                        />
                    )}

                    {showArrows && (
                        <View style={styles.arrows}>
                            <ArrowButton
                                direction="left"
                                accessibilityLabel="Предыдущий месяц"
                                disabled={page <= 0}
                                onPress={() => scrollToPage(page - 1)}
                            />
                            <ArrowButton
                                direction="right"
                                accessibilityLabel="Следующий месяц"
                                disabled={page >= pageCount - 1}
                                onPress={() => scrollToPage(page + 1)}
                            />
                        </View>
                    )}
                </View>
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
                <ScrollView
                    key={jump.key}
                    ref={scrollRef}
                    horizontal
                    pagingEnabled={Platform.OS !== 'web'}
                    showsHorizontalScrollIndicator={false}
                    contentOffset={{ x: initialOffset, y: 0 }}
                    onScroll={onScroll}
                    scrollEventThrottle={32}>
                    {pages.map((item) => (
                        <MonthGrid
                            key={item}
                            year={firstYear + Math.floor(item / 12)}
                            month={(item % 12) + 1}
                            width={width}
                            value={value}
                            onChange={onChange}
                        />
                    ))}
                </ScrollView>
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
    trailing: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        gap: Spacing.two,
    },
    arrows: {
        flexDirection: 'row',
        gap: Spacing.one,
    },
    arrow: {
        width: HEADER_ROW_HEIGHT,
        height: HEADER_ROW_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowDimmed: {
        opacity: 0.3,
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
