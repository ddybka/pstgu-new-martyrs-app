import {
    Tabs,
    TabList,
    TabTrigger,
    TabSlot,
    TabTriggerSlotProps,
    TabListProps,
} from 'expo-router/ui';
import { router, usePathname, type Href } from 'expo-router';
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

const COMPACT_WIDTH = 768;
const MENU_DURATION = 220;

const BUTTON_HEIGHT = 20 + Spacing.one * 2;
const MENU_ICON_SIZE = 28;
const MENU_BUTTON_SIZE = 44;
const OPEN_MENU_PADDING_BOTTOM = 22;
const HEADER_RADIUS = SurfaceRadius;
const BUTTON_RADIUS = ButtonRadius;
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

const CompactMenu = createContext(false);

export function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
    const inMenu = useContext(CompactMenu);

    return (
        <Pressable {...props} ref={ref as Ref<ComponentRef<typeof Pressable>>} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
                type={isFocused ? 'text' : 'backgroundElement'}
                style={[styles.tabButtonView, inMenu && styles.tabButtonInMenu]}>
                <ThemedText type="small" themeColor={isFocused ? 'background' : 'textSecondary'}>
                    {children}
                </ThemedText>
            </ThemedView>
        </Pressable>
    );
}

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

const DOT_SIZE = 4;

/**
 * Пункт про приложения есть только в вебе: на телефоне приложение уже
 * установлено, а на сайте это ссылка на RuStore, App Store и веб-версию.
 */
const APPS_ITEM = {
    key: 'apps',
    value: 'apps',
    label: 'Приложения',
    href: '/apps' as Href,
};

const MORE_MENU = [
    ...TAB_HEADER_MENU_ITEMS.map((item) => ({ value: item.key, label: item.label, href: item.href })),
    APPS_ITEM,
];

function MoreButton() {
    const theme = useTheme();

    return (
        <Dropdown
            options={MORE_MENU}
            onSelect={(key) => {
                const item = MORE_MENU.find((it) => it.value === key);
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

    const [wasCompact, setWasCompact] = useState(compact);
    if (wasCompact !== compact) {
        setWasCompact(compact);
        setOpen(false);
    }

    const pathname = usePathname();
    const [lastPath, setLastPath] = useState(pathname);
    if (lastPath !== pathname) {
        setLastPath(pathname);
        setOpen(false);
    }

    return (
        <View {...props} style={styles.tabListContainer}>
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
                    <View style={[styles.menu, styles.menuEnter]}>
                        <CompactMenu.Provider value>
                            {props.children}
                            <hr style={{ width: '90%', flex: 1, border: 'none', borderWidth: '1px', borderColor: colors.separator, borderStyle: 'solid', }} />
                            {TAB_HEADER_MENU_ITEMS.map((item) => (
                                <TabButton key={item.key} onPress={() => router.push(item.href)}>
                                    {item.label}
                                </TabButton>
                            ))}
                            <TabButton onPress={() => router.push(APPS_ITEM.href)}>
                                {APPS_ITEM.label}
                            </TabButton>
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
