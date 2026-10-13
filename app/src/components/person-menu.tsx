import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { personMenuItems } from './person-menu-items';

import { useTheme } from '@/hooks/use-theme';

/**
 * Меню «⋯» в шапке страницы новомученика — нативное: на iOS это UIMenu, на
 * Android выпадающее меню Material. Веб-вариант — в `person-menu.web.tsx`.
 *
 * На Android меню в шапке принимает только картинку, SF Symbols там нет —
 * отсюда своя иконка из трёх точек.
 */
export function PersonMenu({ number, name }: { number: number; name?: string }) {
    const theme = useTheme();
    const isIos = Platform.OS === 'ios';

    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu
                icon={isIos ? 'ellipsis' : require('@/assets/images/icons/more-horiz.png')}
                tintColor={theme.text}
                accessibilityLabel="Ещё">
                {personMenuItems(number, name).map((item) => (
                    <Stack.Toolbar.MenuAction
                        key={item.key}
                        icon={isIos ? item.sfSymbol : undefined}
                        onPress={() => void item.run()}>
                        {item.label}
                    </Stack.Toolbar.MenuAction>
                ))}
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
