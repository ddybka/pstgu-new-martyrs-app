import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

/**
 * Пункты меню «⋯» в шапке вкладок «Сегодня» и «Календарь» — общие для нативного меню и для веба.
 */
export type TabHeaderMenuItem = {
    key: string;
    label: string;
    /** SF Symbol нужен для IOS */
    sfSymbol: SFSymbol;
    href: Href;
};

export const TAB_HEADER_MENU_ITEMS: TabHeaderMenuItem[] = [
    { key: 'help', label: 'Помочь проекту', sfSymbol: 'heart', href: '/help' },
    { key: 'about', label: 'О проекте', sfSymbol: 'info.circle', href: '/about' },
];
