import {
    Tabs,
    TabList,
    TabTrigger,
    TabSlot,
    TabTriggerSlotProps,
    TabListProps,
} from 'expo-router/ui';
import { router, usePathname } from 'expo-router';
import { Image } from '@/components/ui/image';
import { createContext, useContext, useState, type ComponentRef, type Ref } from 'react';
import { Pressable, View, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';

import { TAB_HEADER_MENU_ITEMS } from './tab-header-menu-items';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Dropdown } from './ui/dropdown';

import { Icon } from './ui/icon';
import { ButtonRadius, Colors, SurfaceRadius, HeadingFonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** Ширина, ниже которой вкладки не помещаются рядом с названием проекта. */
const COMPACT_WIDTH = 768;
const MENU_DURATION = 220;

/**
 * Высота кнопок-плашек в шапке («⋯», меню): строка текста `small` (20) плюс
 * вертикальные отступы — как у кнопок вкладок и вида карточек.
 */
const BUTTON_HEIGHT = 20 + Spacing.one * 2;
const MENU_ICON_SIZE = 28;
const MENU_BUTTON_SIZE = 44;
/** Отступ снизу у раскрытой компактной шапки. */
const OPEN_MENU_PADDING_BOTTOM = 22;
/** Скругление шапки и её кнопок — едва заметное, не капсулы. */
const HEADER_RADIUS = SurfaceRadius;
const BUTTON_RADIUS = ButtonRadius;
/** Иконка и название — одной высоты со строкой названия. */
const BRAND_SIZE = 28;

export default function AppTabs() {
    return (
        <Tabs>
            <TabSlot style={{ height: '100%' }} />
            <TabList asChild>
                <CustomTabList>
                    <TabTrigger name="home" href="/" asChild>
                        <TabButton>Сегодня</TabButton>
                    </TabTrigger>
                    <TabTrigger name="calendar" href="/calendar" asChild>
                        <TabButton>Календарь</TabButton>
                    </TabTrigger>
                    <TabTrigger name="map" href="/map" asChild>
                        <TabButton>Карта</TabButton>
                    </TabTrigger>
                    <TabTrigger name="search" href="/search" asChild>
                        <TabButton>Поиск</TabButton>
                    </TabTrigger>
                </CustomTabList>
            </TabList>
        </Tabs>
    );
}

/**
 * Признак «кнопка стоит в раскрытом меню, а не в строке шапки».
 *
 * Через контекст, а не пропсом: между списком и кнопкой лежит `TabTrigger`,
 * который подменяет своему потомку пропсы, и передать что-то мимо него нельзя.
 */
const CompactMenu = createContext(false);

export function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
    const inMenu = useContext(CompactMenu);

    return (
        // В expo-router ref описан как `Ref<View>`, а с RN 0.88 `View` —
        // функциональный компонент, и его экземпляр — `ReactNativeElement`.
        // Сам объект тот же, расходятся только типы.
        <Pressable {...props} ref={ref as Ref<ComponentRef<typeof Pressable>>} style={({ pressed }) => pressed && styles.pressed}>
            {/* Активная вкладка — инверсная плашка, как выбранный день в
                календаре: на фоне серых соседей её видно сразу. */}
            <ThemedView
                type={isFocused ? 'text' : 'backgroundElement'}
                style={[styles.tabButtonView, inMenu && styles.tabButtonInMenu]}>
                {/* Начертание одно: жирная активная вкладка шире, и при
                    переключении соседи сдвигались бы. */}
                <ThemedText type="small" themeColor={isFocused ? 'background' : 'textSecondary'}>
                    {children}
                </ThemedText>
            </ThemedView>
        </Pressable>
    );
}

/**
 * Кнопка меню компактной шапки: без плашки, просто крупная иконка
 * Material Symbols — «меню» или «закрыть».
 */
function MenuButton({ open, onPress }: { open: boolean; onPress: () => void }) {
    const theme = useTheme();

    return (
        <Pressable
            onPress={onPress}
            hitSlop={Spacing.two}
            accessibilityRole="button"
            accessibilityLabel={open ? 'Закрыть меню' : 'Открыть меню'}
            accessibilityState={{ expanded: open }}
            style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
            ]}>
            <Icon
                name={{ web: open ? 'close' : 'menu' }}
                size={MENU_ICON_SIZE}
                tintColor={theme.text}
            />
        </Pressable>
    );
}

const MORE_OPTIONS = TAB_HEADER_MENU_ITEMS.map((item) => ({ value: item.key, label: item.label }));
const DOT_SIZE = 4;

function MoreButton() {
    const theme = useTheme();

    return (
        <Dropdown
            options={MORE_OPTIONS}
            onSelect={(key) => {
                const item = TAB_HEADER_MENU_ITEMS.find((it) => it.key === key);
                if (item) router.push(item.href);
            }}
            align="right"
            accessibilityLabel="Ещё">
            <View style={[styles.more, { backgroundColor: theme.backgroundElement }]}>
                {[0, 1, 2].map((dot) => (
                    <View key={dot} style={[styles.dot, { backgroundColor: theme.text }]} />
                ))}
            </View>
        </Dropdown>
    );
}

export function CustomTabList(props: TabListProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme];
    const { width } = useWindowDimensions();
    const compact = width <= COMPACT_WIDTH;
    const [open, setOpen] = useState(false);

    // Меню закрывается вместе с переходом на широкий экран.
    const [wasCompact, setWasCompact] = useState(compact);
    if (wasCompact !== compact) {
        setWasCompact(compact);
        setOpen(false);
    }

    // Меню закрывается по факту перехода, а не по нажатию на пункт.
    const pathname = usePathname();
    const [lastPath, setLastPath] = useState(pathname);
    if (lastPath !== pathname) {
        setLastPath(pathname);
        setOpen(false);
    }

    return (
        <View {...props} style={styles.tabListContainer}>
            {/* Шапка лежит поверх ленты, а не над ней: лента проезжает под ней.
                Отделяет её от ленты не обводка, а мягкая тень, а в тёмной теме,
                где тени не видно, — фон чуть светлее страницы. */}
            <View
                style={[
                    styles.innerContainer,
                    compact && styles.innerContainerCompact,
                    compact && open && styles.innerContainerOpen,
                    { backgroundColor: colors.backgroundRaised },
                ]}>
                <View style={[styles.bar, !compact && styles.barWide]}>
                    <Pressable
                        onPress={() => router.navigate('/')}
                        accessibilityRole="link"
                        accessibilityLabel="Память — на главную"
                        style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
                        <Image
                            source={require('@/assets/images/CircleLogo.svg')}
                            style={styles.brandIcon}
                            accessibilityIgnoresInvertColors
                            alt="Логотип приложения"
                        />
                        <ThemedText type="smallBold" style={styles.brandText}>
                            Память
                        </ThemedText>
                    </Pressable>
                    {compact && <MenuButton open={open} onPress={() => setOpen((it) => !it)} />}
                </View>

                {!compact && props.children}
                {!compact && <MoreButton />}

                {compact && open && (
                    // Ссылки — те же самые TabTrigger, просто переложенные в
                    // столбец, поэтому подсветка активной вкладки работает без
                    // отдельной копии состояния.
                    // Появляется CSS-анимацией, без reanimated: этот файл —
                    // в коде каждой страницы сайта.
                    <View style={[styles.menu, styles.menuEnter]}>
                        <CompactMenu.Provider value>
                            {props.children}
                            {TAB_HEADER_MENU_ITEMS.map((item) => (
                                <TabButton key={item.key} onPress={() => router.push(item.href)}>
                                    {item.label}
                                </TabButton>
                            ))}
                        </CompactMenu.Provider>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    menuEnter: {
        animationKeyframes: [{ from: { opacity: 0 }, to: { opacity: 1 } }],
        animationDuration: `${MENU_DURATION}ms`,
        animationTimingFunction: 'ease-out',
    } as ViewStyle,
    tabListContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: Spacing.three,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    innerContainer: {
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.four,
        borderRadius: HEADER_RADIUS,
        flexDirection: 'row',
        alignItems: 'center',
        flexGrow: 1,
        gap: Spacing.two,
        maxWidth: MaxContentWidth,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
    },
    // В компактном виде панель раскрывается вниз, поэтому строка с названием и
    // список ссылок ложатся друг под друга.
    innerContainerCompact: {
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    innerContainerOpen: {
        paddingBottom: OPEN_MENU_PADDING_BOTTOM,
    },
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
    },
    barWide: {
        flex: 1,
    },
    brand: {
        marginRight: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
    },
    brandIcon: {
        width: BRAND_SIZE,
        height: BRAND_SIZE,
    },
    brandText: {
        fontSize: 22,
        lineHeight: BRAND_SIZE,
        fontFamily: HeadingFonts.bold,
    },
    more: {
        height: BUTTON_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: Spacing.three,
        borderRadius: BUTTON_RADIUS,
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
    },
    // Кнопка выше строки с названием, но шапку не раздвигает: лишнее уходит
    // в отрицательные поля, а иконка остаётся у правого края шапки.
    iconButton: {
        width: MENU_BUTTON_SIZE,
        height: MENU_BUTTON_SIZE,
        marginVertical: -(MENU_BUTTON_SIZE - BRAND_SIZE) / 2,
        marginRight: -(MENU_BUTTON_SIZE - MENU_ICON_SIZE) / 2,
        borderRadius: MENU_BUTTON_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menu: {
        gap: Spacing.two,
        paddingTop: Spacing.three,
        paddingHorizontal: Spacing.two,
    },
    pressed: {
        opacity: 0.7,
    },
    tabButtonView: {
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: BUTTON_RADIUS,
    },
    tabButtonInMenu: {
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: BUTTON_RADIUS,
    },
});
