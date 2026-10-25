import { router } from 'expo-router';
import { Suspense, lazy, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListButton } from './list-button';
import { KIND_COLORS, POINT_KINDS, kindColor } from './map/map-config';
import { ThemedText } from './themed-text';
import { Expandable } from './ui/expandable';
import { PlateButton } from './ui/plate-button';

import { HeadingFonts, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { boundsOf, usePersonMapPoints } from '@/hooks/use-map-points';
import type { PersonEvent } from '@/hooks/use-persons';
import { useTheme } from '@/hooks/use-theme';
import { matchEvent } from '@/utils/match-events';

const MartyrsMap = lazy(() => import('@/components/map/martyrs-map'));

const KIND_LABELS: Record<string, string> = Object.fromEntries(
    POINT_KINDS.map(({ kind, label }) => [kind, label])
);

function sameIds(a: readonly number[], b: readonly number[]) {
    return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * Карта на странице новомученика: его места.
 *
 * Карта без жестов — она внутри прокрутки страницы, и сдвиг пальцем спорил бы
 * с ней. Нажатие на точку раскрывает под картой, что случилось в этом месте;
 * повторное нажатие на ту же точку сворачивает. Общая карта — строкой-кнопкой
 * ниже, как «Поделиться».
 */
export function PersonMap({
    number,
    events,
    onShowInText,
}: {
    number: number;
    /** События биографии из API — с ними сопоставляются точки. */
    events: readonly PersonEvent[];
    /** Прокрутить биографию к событию и подсветить его. */
    onShowInText: (index: number) => void;
}) {
    const theme = useTheme();
    const points = usePersonMapPoints(number);
    const colors = KIND_COLORS[useColorScheme()];
    const [open, setOpen] = useState(false);
    // Показанные точки живут дольше, чем `open`: пока блок сворачивается,
    // в нём должно оставаться прежнее содержимое.
    const [shownIds, setShownIds] = useState<number[]>([]);

    const shown = useMemo(() => {
        const wanted = new Set(shownIds);
        return points
            .filter((point) => wanted.has(point.id))
            .map((point) => ({ point, match: matchEvent(point, events) }));
    }, [points, shownIds, events]);

    if (points.length === 0) return null;

    const select = (ids: number[]) => {
        if (open && sameIds(ids, shownIds)) {
            setOpen(false);
            return;
        }
        setShownIds(ids);
        setOpen(true);
    };

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
                        selected={open ? shownIds : []}
                        onEventsPress={select}
                    />
                </Suspense>
            </View>

            <Expandable
                open={open}
                style={[styles.events, { backgroundColor: theme.backgroundSubtle, borderColor: theme.separator }]}>
                {shown.map(({ point, match }) => (
                    <View key={point.id} style={styles.event}>
                        <View style={styles.meta}>
                            <View style={[styles.dot, { backgroundColor: kindColor(colors, point.kind) }]} />
                            <ThemedText type="small" themeColor="textSecondary">
                                {[KIND_LABELS[point.kind] ?? point.kind, point.dating].filter(Boolean).join(' · ')}
                            </ThemedText>
                        </View>
                        {point.text !== '' && <ThemedText style={styles.text}>{point.text}</ThemedText>}
                        {match !== null && (
                            <PlateButton
                                label="Показать в биографии"
                                icon={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
                                background="backgroundSelected"
                                onPress={() => onShowInText(match)}
                                style={styles.showInText}
                            />
                        )}
                    </View>
                ))}
            </Expandable>

            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                Нажмите на точку, чтобы увидеть, что случилось в этом месте.
            </ThemedText>

            <ListButton
                label="Открыть на общей карте"
                onPress={() => router.push({ pathname: '/map', params: { person: number } })}
                last
            />
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
        overflow: 'hidden',
    },
    events: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
        gap: Spacing.four,
    },
    event: {
        gap: Spacing.two,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    text: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: 400,
    },
    showInText: {
        alignSelf: 'flex-start',
        marginTop: Spacing.one,
    },
    hint: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
        fontWeight: 400,
    },
});
