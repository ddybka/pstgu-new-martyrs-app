import { router } from 'expo-router';
import { Suspense, lazy } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { HeadingFonts, Spacing } from '@/constants/theme';
import { boundsOf, usePersonMapPoints } from '@/hooks/use-map-points';

const MartyrsMap = lazy(() => import('@/components/map/martyrs-map'));

export function PersonMap({ number }: { number: number }) {
    const points = usePersonMapPoints(number);
    if (points.length === 0) return null;

    return (
        <View style={styles.container}>
            <ThemedText type="smallBold" style={styles.title}>
                На карте
            </ThemedText>

            <View style={styles.map}>
                <Suspense fallback={null}>
                    <MartyrsMap
                        points={points}
                        bounds={boundsOf(points)}
                        interactive={false}
                        onPress={() =>
                            router.push({ pathname: '/map', params: { person: number } })
                        }
                    />
                </Suspense>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.six,
    },
    title: {
        fontFamily: HeadingFonts.bold,
        marginBottom: Spacing.three,
        paddingHorizontal: Spacing.three,
        fontSize: 24,
        lineHeight: 28,
    },
    map: {
        height: 260,
        marginHorizontal: -Spacing.three,
        overflow: 'hidden',
    },
    caption: {
        fontSize: 11,
        lineHeight: 14,
        paddingTop: Spacing.two,
    },
});
