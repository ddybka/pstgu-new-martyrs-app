import { useRef } from 'react';
import { ScrollView } from 'react-native';

/** Прокрутка страницы новомученика в вебе (см. `page-scroll-view.tsx`). */
export const PageScrollView = ScrollView;

export function usePageScrollRef() {
    return useRef<ScrollView>(null);
}
