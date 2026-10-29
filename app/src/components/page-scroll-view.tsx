import Animated, { useAnimatedRef } from 'react-native-reanimated';

/**
 * Прокрутка страницы новомученика. На телефоне — Animated.ScrollView: на неё
 * вешается обработчик прокрутки на UI-потоке (см. `use-scroll-title`). В
 * вебе — обычная ScrollView (`page-scroll-view.web.tsx`), без reanimated.
 */
export const PageScrollView = Animated.ScrollView;

export function usePageScrollRef() {
    return useAnimatedRef<Animated.ScrollView>();
}
