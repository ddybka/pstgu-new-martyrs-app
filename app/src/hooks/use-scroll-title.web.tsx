import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type TextStyle } from 'react-native';

import { useReportScroll } from '@/hooks/use-header-shadow';
import { DETAIL_TITLE_STYLE } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';

/** Место, занятое кнопками шапки по бокам: заголовок не должен на них залезать. */
const HEADER_SIDES = 160;

function ScrollTitle({ title, shown }: { title: string; shown: boolean }) {
    const theme = useTheme();
    const { width } = useWindowDimensions();

    return (
        <Text
            numberOfLines={1}
            style={[
                styles.title,
                { color: theme.text, maxWidth: width - HEADER_SIDES },
                shown ? styles.shown : styles.hidden,
            ]}>
            {title}
        </Text>
    );
}

/**
 * Заголовок в шапке, который появляется, когда заголовок страницы ушёл под
 * шапку, — веб-вариант `use-scroll-title.tsx`: без reanimated, обычным
 * обработчиком прокрутки и CSS-переходом. Шапка в вебе непрозрачная, и
 * прокрутка считается от её нижнего края.
 *
 * Состояние меняется только на пересечении порога, а не на каждом кадре
 * прокрутки.
 */
export function useScrollTitle(title: string | null) {
    const navigation = useNavigation();
    const reportScroll = useReportScroll();
    const [shown, setShown] = useState(false);

    const scrollY = useRef(Number.NEGATIVE_INFINITY);
    const titleBottom = useRef(Number.MAX_SAFE_INTEGER);

    const update = () => {
        const next = scrollY.current >= titleBottom.current;
        setShown((prev) => (prev === next ? prev : next));
    };

    useEffect(() => {
        navigation.setOptions({
            headerTitle: title ? () => <ScrollTitle title={title} shown={shown} /> : '',
        });
    }, [navigation, title, shown]);

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
        reportScroll(scrollY.current);
        update();
    };

    const setTitleBottom = (bottom: number) => {
        titleBottom.current = bottom;
        update();
    };

    return { onScroll, setTitleBottom };
}

const styles = StyleSheet.create({
    // Как у остальных страниц поверх вкладок (см. useDetailHeaderOptions).
    title: {
        ...DETAIL_TITLE_STYLE,
        textAlign: 'center',
        // Как в системных приложениях iOS: заголовок не выскакивает, а
        // проявляется и чуть приподнимается на своё место.
        transitionProperty: 'opacity, transform',
        transitionDuration: '220ms',
        transitionTimingFunction: 'ease-out',
    } as TextStyle,
    shown: {
        opacity: 1,
        transform: [{ translateY: 0 }],
    },
    hidden: {
        opacity: 0,
        transform: [{ translateY: 6 }],
    },
});
