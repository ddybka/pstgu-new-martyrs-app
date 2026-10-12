import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { personMenuItems } from './person-menu-items';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Веб-вариант меню «⋯»: `Stack.Toolbar` в вебе ничего не рисует, поэтому
 * кнопка ставится в шапку через `headerRight`, а список открывается поверх
 * страницы. Клик не по списку закроет его.
 */
export function PersonMenu({ number, name }: { number: number; name?: string }) {
    const navigation = useNavigation();

    useEffect(() => {
        navigation.setOptions({ headerRight: () => <MenuButton number={number} name={name} /> });
    }, [navigation, number, name]);

    return null;
}

function MenuButton({ number, name }: { number: number; name?: string }) {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    return (
        <>
            <Pressable
                hitSlop={Spacing.two}
                accessibilityRole="button"
                accessibilityLabel="Ещё"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen(true)}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                {(
                    <View style={styles.dots}>
                        {[0, 1, 2].map((dot) => (
                            <View key={dot} style={[styles.dot, { backgroundColor: theme.text }]} />
                        ))}
                    </View>
                )}
            </Pressable>

            <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Закрыть меню" />
                <View
                    style={[
                        styles.menu,
                        { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                    ]}>
                    {personMenuItems(number, name).map((item) => (
                        <Pressable
                            key={item.key}
                            accessibilityRole="menuitem"
                            onPress={async () => {
                                setOpen(false);
                                const result = await item.run();
                                if (result !== 'copied') return;

                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            style={({ pressed, hovered }) => [
                                styles.item,
                                (pressed || hovered) && { backgroundColor: theme.backgroundSelected },
                            ]}>
                            <ThemedText type="small">{item.label}</ThemedText>
                        </Pressable>
                    ))}
                </View>
            </Modal>
        </>
    );
}

const DOT_SIZE = 4;

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.7,
    },
    dots: {
        flexDirection: 'row',
        gap: 3,
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
    },
    // Под кнопкой в правом углу шапки: высота шапки react-navigation в вебе — 64.
    menu: {
        position: 'absolute',
        top: 56,
        right: Spacing.three,
        minWidth: 220,
        paddingVertical: Spacing.one,
        borderRadius: Spacing.three,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    item: {
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
    },
});
