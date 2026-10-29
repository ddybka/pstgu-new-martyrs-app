import { SymbolView, type SymbolViewProps } from 'expo-symbols';

/**
 * Иконка: на iOS — SF Symbol, на Android — Material Symbol. Веб-вариант —
 * в `icon.web.tsx`: там вместо шрифта Material Symbols встроенный SVG.
 */
export type IconProps = Pick<SymbolViewProps, 'name' | 'size' | 'tintColor' | 'weight' | 'style'>;

export function Icon(props: IconProps) {
    return <SymbolView {...props} />;
}
