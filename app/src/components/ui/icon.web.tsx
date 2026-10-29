import { View } from 'react-native';

import type { IconProps } from './icon';

/**
 * Иконки в вебе — встроенным SVG, а не через `SymbolView`.
 *
 * `SymbolView` в вебе рисует иконку символом шрифта Material Symbols и на
 * первом показе догружает весь шрифт — около мегабайта ради пяти иконок, — а
 * до тех пор на месте иконки пусто. Здесь контуры тех же Material Symbols
 * (Outlined, 400, с fonts.gstatic.com) лежат прямо в коде: иконка видна в
 * первом же кадре и весит пару сотен байт.
 *
 * Новая иконка добавляется сюда по имени `web` из `name`; без контура здесь
 * она в вебе не нарисуется (в консоли — предупреждение).
 */
const PATHS: Record<string, string> = {
    close: 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
    menu: 'M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z',
    mail: 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z',
    open_in_new:
        'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z',
    arrow_upward: 'M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z',
    u_turn_left:
        'M640-120v-480q0-66-47-113t-113-47q-66 0-113 47t-47 113v168l64-64 56 56-160 160-160-160 56-56 64 64v-168q0-100 70-170t170-70q100 0 170 70t70 170v480h-80Z',
    chevron_right: 'M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z',
};

export function Icon({ name, size = 24, tintColor, style }: IconProps) {
    const key = typeof name === 'object' ? (name as { web?: string }).web : undefined;
    const path = key ? PATHS[key] : undefined;

    if (key && !path) console.warn(`Icon: нет SVG для «${key}» — добавьте контур в icon.web.tsx`);

    return (
        <View style={[{ width: size, height: size }, style]} aria-hidden>
            {path && (
                <svg width={size} height={size} viewBox="0 -960 960 960" fill={String(tintColor ?? 'currentColor')}>
                    <path d={path} />
                </svg>
            )}
        </View>
    );
}
