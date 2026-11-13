import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BackButton } from '@/components/header-buttons';
import { FONT_SOURCES } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { CalendarDateProvider } from '@/context/calendar-date';
import { CardViewProvider } from '@/context/card-view';
import { ColorSchemeProvider } from '@/context/color-scheme';
import { LoginProvider } from '@/context/login';
import { NameOrderProvider } from '@/context/name-order';
import { PersonSortProvider } from '@/context/person-sort';
import { PhotoLayoutProvider } from '@/context/photo-layout';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDetailHeaderOptions } from '@/hooks/use-stack-header';
import { preloadMap } from '@/utils/preload-map';

SplashScreen.preventAutoHideAsync();

const MAP_PRELOAD_DELAY_MS = 1500;

const webBackButton = Platform.OS === 'web' ? () => <BackButton /> : undefined;

export default function RootLayout() {
    return (
        <ColorSchemeProvider>
            <CardViewProvider>
                <PhotoLayoutProvider>
                    <PersonSortProvider>
                        <NameOrderProvider>
                            <CalendarDateProvider>
                                <RootNavigator />
                            </CalendarDateProvider>
                        </NameOrderProvider>
                    </PersonSortProvider>
                </PhotoLayoutProvider>
            </CardViewProvider>
        </ColorSchemeProvider>
    );
}

function RootNavigator() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const personOptions = useDetailHeaderOptions();
    const aboutOptions = useDetailHeaderOptions('О проекте');
    const helpOptions = useDetailHeaderOptions('Помочь проекту');
    const appsOptions = useDetailHeaderOptions('Приложения');
    const SettingsOptions = useDetailHeaderOptions('Настройки');
    const privacyOptions = useDetailHeaderOptions('Политика конфиденциальности');
    const supportOptions = useDetailHeaderOptions('Поддержка');

    const [fontsLoaded, fontsError] = useFonts(FONT_SOURCES);

    const isDark = colorScheme === 'dark';
    useEffect(() => {
        const timer = setTimeout(() => preloadMap(isDark), MAP_PRELOAD_DELAY_MS);
        return () => clearTimeout(timer);
    }, [isDark]);

    // На Android полосы системы прозрачные (edge-to-edge), и за часами и
    // уведомлениями виден фон окна. По умолчанию он не знает о выбранной в
    // приложении теме — красим его в цвет страницы.
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    }, [colors.background]);

    if (!fontsLoaded && !fontsError) return null;

    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    const navigationTheme = {
        ...base,
        colors: { ...base.colors, background: colors.background },
    };

    return (
        <ThemeProvider value={navigationTheme}>
            {/* Часы и уведомления — по теме приложения, а не по системной:
                в светлой теме иначе белые иконки на белом фоне. */}
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <AnimatedSplashOverlay />
            <LoginProvider>
                <Stack
                    screenOptions={{
                        headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: colors.background },
                        headerTintColor: colors.text,
                        headerShadowVisible: false,
                        contentStyle: { backgroundColor: colors.background },
                        headerBackTitle: '',
                        headerBackButtonDisplayMode: 'minimal',
                        headerBackButtonMenuEnabled: false,
                    }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="person/[id]"
                        options={{
                            ...personOptions,
                            headerLeft: webBackButton,
                        }}
                    />
                    <Stack.Screen
                        name="about"
                        options={{ ...aboutOptions, headerLeft: webBackButton }}
                    />
                    <Stack.Screen
                        name="help"
                        options={{ ...helpOptions, headerLeft: webBackButton }}
                    />
                    <Stack.Screen
                        name="apps"
                        options={{ ...appsOptions, headerLeft: webBackButton }}
                    />
                    <Stack.Screen
                        name="settings"
                        options={{ ...SettingsOptions, headerLeft: webBackButton }}
                    />
                    <Stack.Screen
                        name="privacy"
                        options={{ ...privacyOptions, headerLeft: webBackButton }}
                    />
                    <Stack.Screen
                        name="support"
                        options={{ ...supportOptions, headerLeft: webBackButton }}
                    />
                </Stack>
            </LoginProvider>
        </ThemeProvider>
    );
}
