import type { NativeStackHeaderProps } from 'expo-router';
import { Header, getHeaderTitle } from 'expo-router/react-navigation';
import { StyleSheet, View } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';
import { useIsScrolled } from '@/hooks/use-header-shadow';
import { useTheme } from '@/hooks/use-theme';

/**
 * Шапка внутренней страницы в вебе — «назад», заголовок, «⋯» — в той же
 * колонке, что и содержимое страницы (MaxContentWidth), а не по краям окна.
 *
 * Стандартная шапка стека растягивает свои кнопки на всю ширину: на широком
 * экране «назад» уезжал к левому краю окна, далеко от текста. Здесь фон
 * по-прежнему во всю ширину, а сама шапка — внутри колонки.
 *
 * Когда страницу прокрутили, под шапкой появляется тень — только вниз, без
 * ореола по бокам, — и шапка отделяется от проезжающего под ней текста.
 * В тёмной теме тени на чёрном не видно, поэтому там шапка заодно берёт фон
 * чуть светлее страницы, как плавающая шапка вкладок.
 */
export function ContainedHeader({ options, route, back }: NativeStackHeaderProps) {
    const theme = useTheme();
    const scrolled = useIsScrolled(route.key);
    const background = scrolled ? theme.backgroundRaised : theme.background;

    return (
        <View style={[styles.bar, { backgroundColor: background }, scrolled && styles.shadow]}>
            <View style={styles.column}>
                <Header
                    title={getHeaderTitle(options, route.name)}
                    headerTitle={options.headerTitle}
                    headerTitleAlign={options.headerTitleAlign}
                    headerTitleStyle={options.headerTitleStyle}
                    headerTintColor={options.headerTintColor}
                    headerLeft={options.headerLeft}
                    headerRight={options.headerRight}
                    headerShadowVisible={false}
                    headerStyle={{ backgroundColor: background }}
                    back={back}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Над содержимым страницы: иначе тень ушла бы под его фон.
    bar: {
        zIndex: 1,
        transitionProperty: 'box-shadow, background-color',
        transitionDuration: '200ms',
    },
    // Отрицательный разброс прячет тень по бокам — остаётся только низ.
    shadow: {
        boxShadow: '0 6px 8px -6px rgba(0, 0, 0, 0.18)',
    },
    column: {
        width: '100%',
        maxWidth: MaxContentWidth,
        alignSelf: 'center',
    },
});

/** Для `header` в опциях стека: шапка как компонент, со своими хуками. */
export function renderContainedHeader(props: NativeStackHeaderProps) {
    return <ContainedHeader {...props} />;
}
