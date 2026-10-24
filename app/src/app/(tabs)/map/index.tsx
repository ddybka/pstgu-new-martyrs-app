import { router, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { Suspense, lazy, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { BlockLoading } from '@/components/block-loading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { boundsOf, useMapPoints, usePersonMapPoints } from '@/hooks/use-map-points';
import { normalizePersonNumber } from '@/hooks/use-person';

const MartyrsMap = lazy(() => import('@/components/map/martyrs-map'));

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    const isMissingNativeModule = /TurboModuleRegistry|could not be found/.test(error.message);

    return (
        <ThemedView style={styles.center}>
            <ThemedText>Карта не загрузилась</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                {isMissingNativeModule
                    ? 'Приложение собрано без нативного модуля карты. Нужна пересборка: npx expo run:ios'
                    : error.message}
            </ThemedText>
            <Pressable onPress={retry}>
                <ThemedText type="linkPrimary">Повторить</ThemedText>
            </Pressable>
        </ThemedView>
    );
}

export default function MapScreen() {
    const { person } = useLocalSearchParams<{ person?: string }>();
    const focusNumber = normalizePersonNumber(person);

    const points = useMapPoints();
    const focusPoints = usePersonMapPoints(focusNumber);

    const isClient = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false
    );

    if (!isClient) return <BlockLoading />;

    return (
        <ThemedView style={styles.container}>
            <Suspense fallback={<BlockLoading />}>
                <MartyrsMap
                    points={points}
                    bounds={boundsOf(focusPoints)}
                    onPersonPress={(number) =>
                        router.push({ pathname: '/person/[id]', params: { id: number } })
                    }
                />
            </Suspense>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    attribution: {
        position: 'absolute',
        left: Spacing.three,
        right: Spacing.three,
        bottom: BottomTabInset + Spacing.two,
        paddingVertical: Spacing.half,
        paddingHorizontal: Spacing.two,
        borderRadius: Spacing.two,
    },
    attributionText: {
        fontSize: 11,
        lineHeight: 14,
        textAlign: 'center',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
    },
    hint: {
        textAlign: 'center',
    },
});
