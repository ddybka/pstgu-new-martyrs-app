import { useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
    Easing,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReportScroll } from '@/hooks/use-header-shadow';
import { DETAIL_TITLE_STYLE } from '@/hooks/use-stack-header';
import { useTheme } from '@/hooks/use-theme';

/** Место, занятое кнопками шапки по бокам: заголовок не должен на них залезать. */
const HEADER_SIDES = 160;
const FADE = { duration: 220, easing: Easing.out(Easing.quad) };

function ScrollTitle({ title, progress }: { title: string; progress: SharedValue<number> }) {
    const theme = useTheme();
    const { width } = useWindowDimensions();

    // Как в системных приложениях iOS: заголовок не выскакивает, а
    // проявляется и чуть приподнимается на своё место.
    const style = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: (1 - progress.value) * 6 }],
    }));

    return (
        <Animated.Text
            numberOfLines={1}
            style={[styles.title, { color: theme.text, maxWidth: width - HEADER_SIDES }, style]}>
            {title}
        </Animated.Text>
    );
}

/**
 * Заголовок в шапке, который появляется, только когда заголовок самой
 * страницы ушёл под шапку.
 *
 * Пока имя видно на странице, дублировать его в шапке незачем. Порог —
 * нижний край заголовка страницы (`setTitleBottom`, в координатах
 * содержимого прокрутки).
 *
 * На iOS шапка прозрачная и содержимое начинается под ней: при
 * `contentInsetAdjustmentBehavior="automatic"` в самом верху прокрутка равна
 * минус высоте шапки, поэтому она к порогу прибавляется. На Android и в вебе
 * шапка непрозрачная и содержимое начинается сразу под ней.
 */
export function useScrollTitle(title: string | null) {
    const navigation = useNavigation();
    const headerHeight = useHeaderHeight();
    const inset = Platform.OS === 'ios' ? headerHeight : 0;

    // До первого события прокрутки положение неизвестно. Ноль тут не годится:
    // на iOS к нему прибавляется высота шапки, и короткий заголовок без
    // фотографии считался бы уже ушедшим под шапку — имя появлялось сразу при
    // переходе на страницу.
    const scrollY = useSharedValue(Number.NEGATIVE_INFINITY);
    const titleBottom = useSharedValue(Number.MAX_SAFE_INTEGER);
    const progress = useSharedValue(0);

    // Анимация запускается на переходе через порог, а не на каждом кадре
    // прокрутки: иначе каждый кадр перезапускал бы её с начала.
    useAnimatedReaction(
        () => scrollY.value + inset >= titleBottom.value,
        (shown, previous) => {
            if (shown !== previous) progress.value = withTiming(shown ? 1 : 0, FADE);
        },
        [inset]
    );

    // Тень под веб-шапкой, когда страницу прокрутили (см. ContainedHeader).
    // Сообщается только смена «наверху / прокручено», а не каждый кадр.
    const reportScroll = useReportScroll();
    useAnimatedReaction(
        () => scrollY.value > 0,
        (isScrolled, previous) => {
            if (isScrolled !== previous) scheduleOnRN(reportScroll, isScrolled ? 1 : 0);
        },
        [reportScroll]
    );

    useEffect(() => {
        navigation.setOptions({
            headerTitle: title ? () => <ScrollTitle title={title} progress={progress} /> : '',
        });
    }, [navigation, title, progress]);

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const setTitleBottom = (bottom: number) => {
        titleBottom.value = bottom;
    };

    return { onScroll, setTitleBottom };
}

const styles = StyleSheet.create({
    // Как у остальных страниц поверх вкладок (см. useDetailHeaderOptions).
    title: {
        ...DETAIL_TITLE_STYLE,
        textAlign: 'center',
    },
});
