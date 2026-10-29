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

/**
 * Через сколько после запуска готовить карту. Не сразу: первым должен
 * отрисоваться список дня, а разбор восьми тысяч точек занимает JS-поток.
 */
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
    const SettingsOptions = useDetailHeaderOptions('Настройки');

    // На телефоне — файлы из assets/fonts; в вебе список пуст, и отрисовка
    // шрифт не ждёт: он подключён через @font-face со swap (см. global.css).
    const [fontsLoaded, fontsError] = useFonts(FONT_SOURCES);

    // Карту готовим заранее: к моменту, когда откроют вкладку, точки уже
    // разобраны, а стиль подложки лежит в памяти. В вебе — нет (см.
    // preload-map.web): там это лишние мегабайты для тех, кто до карты не дойдёт.
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
                        name="settings"
                        options={{ ...SettingsOptions, headerLeft: webBackButton }}
                    />
                </Stack>
            </LoginProvider>
        </ThemeProvider>
    );
}
