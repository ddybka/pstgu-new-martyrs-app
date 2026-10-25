import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { personMenuItems } from './person-menu-items';
import { ThemedText } from './themed-text';
import { Dropdown } from './ui/dropdown';

import { ButtonRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Веб-вариант меню «⋯»: `Stack.Toolbar` в вебе ничего не рисует, поэтому
 * кнопка ставится в шапку через `headerRight`.
 */
export function PersonMenu({ number, name }: { number: number; name?: string }) {
    const navigation = useNavigation();

    useEffect(() => {
        navigation.setOptions({ headerRight: () => <MenuButton number={number} name={name} /> });
    }, [navigation, number, name]);

    return null;
}

/** Высота плашки — как у «⋯» в шапке вкладок: строка `small` и отступы. */
const BUTTON_HEIGHT = 20 + Spacing.one * 2;
const DOT_SIZE = 4;
const COPIED_MS = 2000;

/**
 * Кнопка «⋯» — та же серая плашка, что в шапке вкладок, а список — общий
 * выпадающий (`Dropdown`): он открывается под самой кнопкой, где бы она ни
 * стояла, и оформлен как остальные списки.
 *
 * Если «Поделиться» скопировало ссылку (браузер без системного «Поделиться»),
 * плашка на пару секунд говорит об этом вместо точек.
 */
function MenuButton({ number, name }: { number: number; name?: string }) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);
    const items = personMenuItems(number, name);

    return (
        <Dropdown
            options={items.map((item) => ({ value: item.key, label: item.label }))}
            onSelect={async (key) => {
                const result = await items.find((item) => item.key === key)?.run();
                if (result !== 'copied') return;

                setCopied(true);
                setTimeout(() => setCopied(false), COPIED_MS);
            }}
            align="right"
            minWidth={200}
            accessibilityLabel="Ещё">
            <View style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
                {copied ? (
                    <ThemedText type="small">Ссылка скопирована</ThemedText>
                ) : (
                    [0, 1, 2].map((dot) => (
                        <View key={dot} style={[styles.dot, { backgroundColor: theme.text }]} />
                    ))
                )}
            </View>
        </Dropdown>
    );
}

const styles = StyleSheet.create({
    button: {
        height: BUTTON_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: Spacing.three,
        borderRadius: ButtonRadius,
        // Правый край — по краю текста страницы, а не вплотную к краю шапки.
        marginRight: Spacing.three,
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
    },
});
