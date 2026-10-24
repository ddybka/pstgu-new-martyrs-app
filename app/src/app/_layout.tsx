import { PTSerif_400Regular } from '@expo-google-fonts/pt-serif/400Regular';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BackButton } from '@/components/header-buttons';
import { Colors } from '@/constants/theme';
import { CardViewProvider } from '@/context/card-view';
import { ColorSchemeProvider } from '@/context/color-scheme';
import { LoginProvider } from '@/context/login';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDetailHeaderOptions } from '@/hooks/use-stack-header';

SplashScreen.preventAutoHideAsync();

const webBackButton = Platform.OS === 'web' ? () => <BackButton /> : undefined;

export default function RootLayout() {
    return (
        <ColorSchemeProvider>
            <CardViewProvider>
                <RootNavigator />
            </CardViewProvider>
        </ColorSchemeProvider>
    );
}

function RootNavigator() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const personOptions = useDetailHeaderOptions();
    const aboutOptions = useDetailHeaderOptions('О проекте', { large: true });
    const helpOptions = useDetailHeaderOptions('Помочь проекту', { large: true });
    const SettingsOptions = useDetailHeaderOptions('Настройки', { large: true });

    const [fontsLoaded, fontsError] = useFonts({ PTSerif_400Regular, PTSerif_700Bold });
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
