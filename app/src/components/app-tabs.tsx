import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AppTabs() {
    const scheme = useColorScheme();
    const colors = Colors[scheme];

    return (
        <NativeTabs
            backgroundColor={colors.background}
            disableTransparentOnScrollEdge={!isLiquidGlassAvailable()}
            indicatorColor={colors.backgroundElement}
            iconColor={{ selected: colors.text }}
            labelStyle={{ selected: { color: colors.text } }}>
            <NativeTabs.Trigger name="(today)">
                <NativeTabs.Trigger.Label>Сегодня</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="text.rectangle.page.fill" md="schedule" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="calendar">
                <NativeTabs.Trigger.Label>Календарь</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="map">
                <NativeTabs.Trigger.Label>Карта</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="map.fill" md="map" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="about" hidden />
            <NativeTabs.Trigger name="help" hidden />
        </NativeTabs>
    );
}
