import { MenuView } from '@expo/ui/community/menu';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export type DropdownOption<T> = {
    value: T;
    label: string;
};

/**
 * Выпадающий список — системный: на iOS это меню SwiftUI (`Menu`), на Android
 * — Material `DropdownMenu`. Выбранный пункт отмечает галочкой сама система.
 * Веб-вариант со своей панелью — в `dropdown.web.tsx`.
 */
export function Dropdown<T extends string | number>({
    options,
    value,
    onSelect,
    children,
    accessibilityLabel,
}: {
    options: DropdownOption<T>[];
    value?: T;
    onSelect: (value: T) => void;
    /** Содержимое кнопки. */
    children: ReactNode;
    /** К какому краю кнопки прижат список (только в вебе). */
    align?: 'left' | 'right';
    accessibilityLabel?: string;
    /** Минимальная ширина списка (только в вебе). */
    minWidth?: number;
}) {
    const colorScheme = useColorScheme();

    return (
        <MenuView
            colorScheme={colorScheme}
            actions={options.map((option) => ({
                id: String(option.value),
                title: option.label,
                state: value === undefined ? undefined : option.value === value ? 'on' : 'off',
            }))}
            onPressAction={({ nativeEvent }) => {
                const option = options.find((it) => String(it.value) === nativeEvent.event);
                if (option && option.value !== value) onSelect(option.value);
            }}>
            <View accessible accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
                {children}
            </View>
        </MenuView>
    );
}
