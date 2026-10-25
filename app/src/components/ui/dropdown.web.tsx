import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, SurfaceRadius, SurfaceShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DropdownOption<T> = {
    value: T;
    label: string;
};

type Anchor = { x: number; y: number; width: number; height: number };

const ITEM_HEIGHT = 40;
const MAX_VISIBLE_ITEMS = 7;
const GAP = Spacing.two;
/** Отступ пунктов от края панели: подсветка пункта не прилипает к краю. */
const INSET = Spacing.one;

/** Как у плавающей шапки (`app-tabs.web`): едва скруглено, без обводки, с тенью. */
const MENU_RADIUS = SurfaceRadius;
const ITEM_RADIUS = 6;

/**
 * Веб-вариант выпадающего списка: своя панель под кнопкой. На iOS и Android
 * список системный — см. `dropdown.tsx`.
 *
 * Список открывается поверх всего в `Modal`, а место ему берётся из положения
 * кнопки на экране (`measureInWindow`), поэтому он не обрезается ни лентой, ни
 * соседними ячейками. Длинный список прокручивается и открывается сразу на
 * выбранном пункте.
 */
export function Dropdown<T extends string | number>({
    options,
    value,
    onSelect,
    children,
    align = 'left',
    accessibilityLabel,
    minWidth = 180,
}: {
    options: DropdownOption<T>[];
    value?: T;
    onSelect: (value: T) => void;
    /** Содержимое кнопки. */
    children: ReactNode;
    /** К какому краю кнопки прижат список. */
    align?: 'left' | 'right';
    accessibilityLabel?: string;
    minWidth?: number;
}) {
    const theme = useTheme();
    const window = useWindowDimensions();
    const trigger = useRef<ComponentRef<typeof Pressable>>(null);
    const list = useRef<ComponentRef<typeof ScrollView>>(null);
    const [anchor, setAnchor] = useState<Anchor | null>(null);

    const open = () => {
        trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
    };
    const close = () => setAnchor(null);

    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    const visible = Math.min(options.length, MAX_VISIBLE_ITEMS);
    const listHeight = visible * ITEM_HEIGHT + INSET * 2;
    const initialOffset = Math.max(0, (selectedIndex - Math.floor(visible / 2)) * ITEM_HEIGHT);

    // Список ложится под кнопку, если помещается, иначе над кнопкой.
    const below = anchor ? anchor.y + anchor.height + GAP : 0;
    const top = anchor && below + listHeight > window.height - Spacing.three
        ? Math.max(Spacing.three, anchor.y - GAP - listHeight)
        : below;

    // Выбранный пункт должен быть виден сразу. `contentOffset` react-native-web
    // не применяет, а прокрутка в момент монтирования теряется, пока Modal ещё
    // не показан, — поэтому кадром позже, когда список уже на экране.
    const isOpen = anchor !== null;
    useEffect(() => {
        if (!isOpen) return;

        const frame = requestAnimationFrame(() => list.current?.scrollTo({ y: initialOffset, animated: false }));
        return () => cancelAnimationFrame(frame);
    }, [isOpen, initialOffset]);

    const position = anchor
        ? align === 'left'
            ? { left: Math.min(anchor.x, window.width - minWidth - Spacing.three) }
            : { right: Math.max(Spacing.three, window.width - anchor.x - anchor.width) }
        : null;

    return (
        <>
            <Pressable
                ref={trigger}
                onPress={open}
                hitSlop={Spacing.two}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ expanded: anchor !== null }}
                style={({ pressed }) => pressed && styles.pressed}>
                {children}
            </Pressable>

            <Modal transparent visible={anchor !== null} animationType="fade" onRequestClose={close}>
                <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Закрыть список" />
                {anchor && (
                    <View
                        style={[
                            styles.menu,
                            position,
                            {
                                top,
                                minWidth,
                                maxHeight: listHeight,
                                backgroundColor: theme.backgroundRaised,
                            },
                        ]}>
                        <ScrollView
                            ref={list}
                            contentContainerStyle={styles.content}
                            showsVerticalScrollIndicator={options.length > MAX_VISIBLE_ITEMS}>
                            {options.map((option) => {
                                const selected = option.value === value;

                                return (
                                    <Pressable
                                        key={String(option.value)}
                                        accessibilityRole="menuitem"
                                        accessibilityState={{ selected }}
                                        onPress={() => {
                                            close();
                                            if (!selected) onSelect(option.value);
                                        }}
                                        style={({ pressed, hovered }) => [
                                            styles.item,
                                            selected && { backgroundColor: theme.backgroundElement },
                                            (pressed || hovered) && { backgroundColor: theme.backgroundSelected },
                                        ]}>
                                        <ThemedText
                                            type="small"
                                            themeColor={selected ? 'text' : 'textSecondary'}
                                            style={styles.label}>
                                            {option.label}
                                        </ThemedText>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    pressed: {
        opacity: 0.7,
    },
    menu: {
        position: 'absolute',
        borderRadius: MENU_RADIUS,
        boxShadow: SurfaceShadow,
        overflow: 'hidden',
    },
    content: {
        padding: INSET,
    },
    // Выбранный пункт отмечен так же, как активная вкладка в шапке: плашкой
    // и основным цветом текста, а не галочкой.
    item: {
        height: ITEM_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.three,
        borderRadius: ITEM_RADIUS,
    },
    label: {
        flex: 1,
    },
});
