import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BackButton } from '@/components/header-buttons';
import { FONT_SOURCES } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { CardViewProvider } from '@/context/card-view';
import { ColorSchemeProvider } from '@/context/color-scheme';
import { LoginProvider } from '@/context/login';
import { NameOrderProvider } from '@/context/name-order';
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
                <NameOrderProvider>
                    <RootNavigator />
                </NameOrderProvider>
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
    if (!fontsLoaded && !fontsError) return null;

    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    const navigationTheme = {
        ...base,
        colors: { ...base.colors, background: colors.background },
    };

    return (
        <ThemeProvider value={navigationTheme}>
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
