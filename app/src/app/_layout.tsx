// Импорт по подпапкам, а не из корня пакета: корневой index тянет `require`
// всех четырёх начертаний, и курсивы, которые мы не используем, всё равно
// попадали бы в сборку (~700 КБ).
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

/**
 * Провайдер темы стоит выше всего остального, поэтому навигатор вынесен в
 * отдельный компонент: хуки темы должны вызываться уже под провайдером, иначе
 * они увидят значение по умолчанию, а не системное.
 */
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

    // Заголовочный шрифт — до первого экрана: иначе заголовки успевают
    // отрисоваться системным шрифтом и на глазах перескакивают на PT Serif.
    // Ошибку не превращаем в вечный сплэш — без засечек приложение работает.
    const personOptions = useDetailHeaderOptions();
    const aboutOptions = useDetailHeaderOptions('О проекте', { large: true });
    const helpOptions = useDetailHeaderOptions('Помочь проекту', { large: true });

    const [fontsLoaded, fontsError] = useFonts({ PTSerif_400Regular, PTSerif_700Bold });
    if (!fontsLoaded && !fontsError) return null;

    // Фон навигатора — наш, а не из темы react-navigation: у неё в светлом
    // варианте он серый (#f2f2f2). Экраны с ThemedView его перекрывали, а
    // страница новомученика — нет, отсюда и расхождение с главной.
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
                        // На iOS фон шапке не задаётся: с ним вместо системного
                        // стекла iOS 26 выходит глухая плашка цвета страницы.
                        headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: colors.background },
                        headerTintColor: colors.text,
                        headerShadowVisible: false,
                        contentStyle: { backgroundColor: colors.background },
                        // «Назад» — одна стрелка, без подписи и без меню истории
                        // по долгому нажатию, на всех экранах сразу.
                        headerBackTitle: '',
                        headerBackButtonDisplayMode: 'minimal',
                        headerBackButtonMenuEnabled: false,
                    }}>
                    {/* Табы рисуют себя сами, шапка Stack им не нужна */}
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="person/[id]"
                        options={{
                            ...personOptions,
                            // В вебе кнопку «назад» рисует не система, а стек, и
                            // только когда есть история. По прямой ссылке её нет
                            // — человек попадает в тупик, поэтому выход свой.
                            headerLeft: webBackButton,
                        }}
                    />
                    {/* Текстовые страницы — поверх вкладок, как страница персоны,
                        а не отдельные вкладки: из них возвращаются, а не переключаются. */}
                    <Stack.Screen
                        name="about"
                        options={{ ...aboutOptions, headerLeft: webBackButton }}
                    />
                    <Stack.Screen
                        name="help"
                        options={{ ...helpOptions, headerLeft: webBackButton }}
                    />
                </Stack>
            </LoginProvider>
        </ThemeProvider>
    );
}
