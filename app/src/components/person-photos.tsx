import { Image } from "expo-image";
import { useRef, useState, type ComponentRef } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";

import { ThemedText } from "./themed-text";
import { Spacing } from "@/constants/theme";
import { usePersonPhotos, type PersonPhotoItem } from "@/hooks/use-image-person";
import { useTheme } from "@/hooks/use-theme";

const STRIP_HEIGHT = 200;

/** Пределы высоты слайдера относительно ширины. */
const PAGER_MIN_RATIO = 0.6;
const PAGER_MAX_RATIO = 1.4;

function photoLabel(name: string | undefined, index: number, count: number) {
    if (!name) return undefined;
    return count > 1
        ? `Фотография новомученика ${name}, ${index + 1} из ${count}`
        : `Фотография новомученика ${name}`;
}

/**
 * Фотографий у дела бывает > 1:
 * - в карточке списка — только первый, чтобы список оставался ровным;
 * - на странице новомученика — все, слайдером во всю ширину, с подписью к
 *   снимку и точками, по которым видно, сколько снимков и какой сейчас открыт.
 */
export function PersonPhotos({
    photos,
    name,
    fullWidth = false,
}: {
    photos?: unknown;
    name?: string;
    fullWidth?: boolean;
}) {
    const { photos: items, error } = usePersonPhotos(photos);

    if (items.length === 0 || error) return null;

    return fullWidth ? (
        <PhotoPager items={items} name={name} />
    ) : (
        <PhotoSingle key={items[0].fileId} item={items[0]} name={name} />
    );
}

/**
 * Первый снимок для карточки списка — как было до слайдера: высотой
 * STRIP_HEIGHT, шириной по пропорциям, прижат влево. Остальные снимки
 * на странице новомученика.
 */
function PhotoSingle({ item, name }: { item: PersonPhotoItem; name?: string }) {
    const [failed, setFailed] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);

    if (failed) return null;

    // Ширина — по пропорциям снимка, но не шире карточки: это делает сама
    // раскладка (`aspectRatio` и `maxWidth`), без замера рамки и лишней
    // перерисовки на каждую карточку.
    const size = aspectRatio ? { aspectRatio, maxWidth: '100%' as const } : styles.singleImagePending;

    return (
        <View style={styles.single}>
            {item.source && (
                <Image
                    source={item.source}
                    style={[styles.singleImage, size]}
                    contentFit="contain"
                    contentPosition="left"
                    transition={200}
                    accessibilityLabel={photoLabel(name, 0, 1)}
                    onLoad={({ source }) => {
                        if (source.width && source.height) setAspectRatio(source.width / source.height);
                    }}
                    onError={() => setFailed(true)}
                />
            )}

            {!aspectRatio && <ActivityIndicator style={styles.singleLoader} />}
        </View>
    );
}

function PhotoPager({ items, name }: { items: PersonPhotoItem[]; name?: string }) {
    const theme = useTheme();
    const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
    const [width, setWidth] = useState(0);
    const [index, setIndex] = useState(0);
    const [ratios, setRatios] = useState<Record<string, number>>({});
    const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

    const single = items.length === 1;
    const current = items[Math.min(index, items.length - 1)];

    // Высота — по первому снимку: открывается слайдер на нём, и он смотрится
    // так же, как одиночное фото. Остальные вписываются в ту же рамку, иначе
    // при листании страница прыгала бы вверх-вниз.
    const firstRatio = ratios[items[0].fileId];
    const height = width && firstRatio
        ? single
            ? width / firstRatio
            : Math.min(Math.max(width / firstRatio, width * PAGER_MIN_RATIO), width * PAGER_MAX_RATIO)
        : STRIP_HEIGHT;

    if (single && failed.has(items[0].fileId)) return null;

    const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!width) return;
        const next = Math.round(nativeEvent.contentOffset.x / width);
        if (next !== index && next >= 0 && next < items.length) setIndex(next);
    };

    const goTo = (next: number) => {
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        setIndex(next);
    };

    return (
        <View style={styles.pager}>
            <View style={{ height }} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
                {width > 0 && (
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        scrollEnabled={!single}
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}>
                        {items.map((item, itemIndex) => (
                            <View key={item.fileId} style={{ width, height }}>
                                {failed.has(item.fileId) ? (
                                    <View style={[styles.fill, styles.center, { backgroundColor: theme.backgroundElement }]}>
                                        <ThemedText type="small" themeColor="textSecondary">
                                            Не удалось загрузить фотографию
                                        </ThemedText>
                                    </View>
                                ) : (
                                    item.source && (
                                        <Image
                                            source={item.source}
                                            style={styles.fill}
                                            contentFit="contain"
                                            transition={200}
                                            accessibilityLabel={photoLabel(name, itemIndex, items.length)}
                                            onLoad={({ source }) => {
                                                if (source.width && source.height) {
                                                    const ratio = source.width / source.height;
                                                    setRatios((prev) => ({ ...prev, [item.fileId]: ratio }));
                                                }
                                            }}
                                            onError={() => setFailed((prev) => new Set(prev).add(item.fileId))}
                                        />
                                    )
                                )}

                                {!ratios[item.fileId] && !failed.has(item.fileId) && (
                                    <ActivityIndicator style={StyleSheet.absoluteFill} />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {(!single || current.caption) && (
                <View style={styles.pagerFooter}>
                    {!single && (
                        <View style={styles.dots} accessibilityLabel={`Фотография ${index + 1} из ${items.length}`}>
                            {items.map((item, dotIndex) => (
                                <Pressable
                                    key={item.fileId}
                                    hitSlop={6}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Фотография ${dotIndex + 1}`}
                                    onPress={() => goTo(dotIndex)}
                                    style={[
                                        styles.dot,
                                        {
                                            backgroundColor: theme.text,
                                            opacity: dotIndex === index ? 1 : 0.25,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {current.caption && (
                        <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
                            {current.caption}
                        </ThemedText>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    single: {
        width: '100%',
        height: STRIP_HEIGHT,
        marginBottom: Spacing.four,
        alignItems: 'flex-start',
    },
    singleImage: {
        height: STRIP_HEIGHT,
        borderRadius: Spacing.two,
    },
    singleImagePending: {
        width: '100%',
    },
    singleLoader: {
        position: 'absolute',
    },
    fill: {
        width: '100%',
        height: '100%',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pager: {
        width: '100%',
        marginBottom: Spacing.four,
    },
    pagerFooter: {
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.three,
        gap: Spacing.two,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.two,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    caption: {
        textAlign: 'center',
    },
});
