import { router, Stack } from 'expo-router';
import { Platform } from 'react-native';

import { TAB_HEADER_MENU_ITEMS } from './tab-header-menu-items';

import { CARD_VIEWS, useCardView } from '@/context/card-view';
import { PERSON_SORTS, usePersonSort } from '@/context/person-sort';
import { useTheme } from '@/hooks/use-theme';

/**
 * Кнопки в шапке вкладок
 */

export function TabHeaderMenu() {
    const theme = useTheme();
    const { view, setView } = useCardView();
    const { sort, setSort } = usePersonSort();
    const isIos = Platform.OS === 'ios';

    return (
        <Stack.Toolbar placement="right">
            {/* На телефоне одна кнопка вместо двух: сортировка сразу в меню,
                вид карточек — вложенным подменю с собственным заголовком. */}
            <Stack.Toolbar.Menu
                icon={isIos ? 'line.3.horizontal.decrease' : require('@/assets/images/icons/sort.png')}
                tintColor={theme.text}
                title="Сортировка"
                accessibilityLabel="Сортировка и вид карточек">
                {PERSON_SORTS.map((option) => (
                    <Stack.Toolbar.MenuAction
                        key={option.value}
                        isOn={option.value === sort}
                        onPress={() => setSort(option.value)}>
                        {!isIos && option.value === sort ? `✓  ${option.label}` : option.label}
                    </Stack.Toolbar.MenuAction>
                ))}

                <Stack.Toolbar.Menu title="Вид карточек" accessibilityLabel="Вид карточек">
                    {CARD_VIEWS.map((option) => (
                        <Stack.Toolbar.MenuAction
                            key={option.value}
                            icon={isIos ? option.sfSymbol : undefined}
                            isOn={option.value === view}
                            onPress={() => setView(option.value)}>
                            {!isIos && option.value === view ? `✓  ${option.label}` : option.label}
                        </Stack.Toolbar.MenuAction>
                    ))}
                </Stack.Toolbar.Menu>
            </Stack.Toolbar.Menu>

            <Stack.Toolbar.Menu
                icon={isIos ? 'ellipsis' : require('@/assets/images/icons/more-horiz.png')}
                tintColor={theme.text}
                accessibilityLabel="Ещё">
                {TAB_HEADER_MENU_ITEMS.map((item) => (
                    <Stack.Toolbar.MenuAction
                        key={item.key}
                        icon={isIos ? item.sfSymbol : undefined}
                        onPress={() => router.push(item.href)}>
                        {item.label}
                    </Stack.Toolbar.MenuAction>
                ))}
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
