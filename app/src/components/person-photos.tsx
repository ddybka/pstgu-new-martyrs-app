import { Image } from "expo-image";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";

import { ThemedText } from "./themed-text";
import { Chevron } from "@/components/ui/chevron";
import { Spacing } from "@/constants/theme";
import { usePersonPhotos, type PersonPhotoItem } from "@/hooks/use-image-person";
import { useTheme } from "@/hooks/use-theme";
import { markHttpsUnavailable } from "@/utils/api-fetch";

const STRIP_HEIGHT = 200;

/**
 * С какой ширины окна у слайдера появляются стрелки — как у календаря. В вебе
 * они есть всегда: мышью ленту не пролистать.
 */
const ARROWS_MIN_WIDTH = 700;
const ARROW_SIZE = 40;

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
    const { photos: items } = usePersonPhotos(photos);

    if (items.length === 0) return null;

    return fullWidth ? (
        <PhotoPager items={items} name={name} />
    ) : (
        <PhotoSingle key={items[0].fileId} item={items[0]} name={name} />
    );
}

/**
 * Миниатюра первого снимка — для выдачи поиска: по лицу человека находят
 * быстрее, чем по строчке ФИО. Нет снимка или он не загрузился — ничего.
 */
export function PersonThumbnail({ photos, name, size = 64 }: { photos?: unknown; name?: string; size?: number }) {
    const theme = useTheme();
    const { photos: items } = usePersonPhotos(photos);
    const item = items[0];
    const photo = usePhotoSource(item);

    if (!item || photo.failed) return null;

    return (
        <View
            style={[
                styles.thumbnail,
                { width: size, height: Math.round(size * 1.25), backgroundColor: theme.backgroundElement },
            ]}>
            <Image
                source={photo.source}
                style={styles.fill}
                contentFit="cover"
                contentPosition="top"
                transition={150}
                recyclingKey={item.fileId}
                accessibilityLabel={photoLabel(name, 0, 1)}
                onLoad={photo.onLoad}
                onError={photo.onError}
            />
        </View>
    );
}

/**
 * Сколько ждать снимок по HTTPS, прежде чем взять его по HTTP. Ошибки при
 * этом может и не быть: когда HTTPS к серверу режут по пути, соединение
 * просто висит, и ошибка загрузки пришла бы через минуты.
 */
const HTTPS_PHOTO_TIMEOUT_MS = 6000;

/**
 * Какой адрес снимка показывать: основной (HTTPS) или запасной (HTTP) — если
 * основной не загрузился или не успел за HTTPS_PHOTO_TIMEOUT_MS. Переход на
 * HTTP запоминается для всего приложения (см. `markHttpsUnavailable`), и
 * следующие снимки сразу берутся по нему.
 */
function usePhotoSource(item: PersonPhotoItem | undefined) {
    // 0 — основной адрес, 1 — запасной, дальше — не загрузилась.
    const [attempt, setAttempt] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const canFallback = Boolean(item?.fallback);

    const toFallback = () => {
        markHttpsUnavailable();
        setAttempt((value) => Math.max(value, 1));
    };

    useEffect(() => {
        if (loaded || attempt !== 0 || !canFallback) return;
        const timer = setTimeout(toFallback, HTTPS_PHOTO_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [loaded, attempt, canFallback]);

    return {
        source: attempt >= 1 && item?.fallback ? item.fallback : item?.source,
        failed: attempt > 1 || (attempt === 1 && !canFallback),
        onLoad: () => setLoaded(true),
        onError: () => (attempt === 0 && canFallback ? toFallback() : setAttempt(2)),
    };
}

/**
 * Первый снимок для карточки списка — как было до слайдера: высотой
 * STRIP_HEIGHT, шириной по пропорциям, прижат влево. Остальные снимки
 * на странице новомученика.
 */
function PhotoSingle({ item, name }: { item: PersonPhotoItem; name?: string }) {
    const photo = usePhotoSource(item);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);

    if (photo.failed) return null;

    // Ширина — по пропорциям снимка, но не шире карточки: это делает сама
    // раскладка (`aspectRatio` и `maxWidth`), без замера рамки и лишней
    // перерисовки на каждую карточку.
    const size = aspectRatio ? { aspectRatio, maxWidth: '100%' as const } : styles.singleImagePending;

    return (
        <View style={styles.single}>
            <Image
                source={photo.source}
                style={[styles.singleImage, size]}
                contentFit="contain"
                contentPosition="left"
                transition={200}
                accessibilityLabel={photoLabel(name, 0, 1)}
                onLoad={({ source }) => {
                    photo.onLoad();
                    if (source.width && source.height) setAspectRatio(source.width / source.height);
                }}
                onError={photo.onError}
            />

            {!aspectRatio && <ActivityIndicator style={styles.singleLoader} />}
        </View>
    );
}

function PhotoPager({ items, name }: { items: PersonPhotoItem[]; name?: string }) {
    const theme = useTheme();
    const windowWidth = useWindowDimensions().width;
    const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
    const [width, setWidth] = useState(0);
    const [index, setIndex] = useState(0);
    const [ratios, setRatios] = useState<Record<string, number>>({});
    const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

    const single = items.length === 1;
    const current = items[Math.min(index, items.length - 1)];
    const showArrows = !single && (Platform.OS === 'web' || windowWidth > ARROWS_MIN_WIDTH);

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
                                    <PagerImage
                                        item={item}
                                        accessibilityLabel={photoLabel(name, itemIndex, items.length)}
                                        onRatio={(ratio) => setRatios((prev) => ({ ...prev, [item.fileId]: ratio }))}
                                        onFailed={() => setFailed((prev) => new Set(prev).add(item.fileId))}
                                    />
                                )}

                                {!ratios[item.fileId] && !failed.has(item.fileId) && (
                                    <ActivityIndicator style={StyleSheet.absoluteFill} />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                )}

                {showArrows && width > 0 && (
                    <>
                        {index > 0 && (
                            <PagerArrow direction="left" onPress={() => goTo(index - 1)} />
                        )}
                        {index < items.length - 1 && (
                            <PagerArrow direction="right" onPress={() => goTo(index + 1)} />
                        )}
                    </>
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

/** Снимок слайдера: свой адрес, свой таймаут HTTPS (см. usePhotoSource). */
function PagerImage({
    item,
    accessibilityLabel,
    onRatio,
    onFailed,
}: {
    item: PersonPhotoItem;
    accessibilityLabel?: string;
    onRatio: (ratio: number) => void;
    onFailed: () => void;
}) {
    const photo = usePhotoSource(item);

    useEffect(() => {
        if (photo.failed) onFailed();
    }, [photo.failed]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Image
            source={photo.source}
            style={styles.fill}
            contentFit="contain"
            transition={200}
            accessibilityLabel={accessibilityLabel}
            onLoad={({ source }) => {
                photo.onLoad();
                if (source.width && source.height) onRatio(source.width / source.height);
            }}
            onError={photo.onError}
        />
    );
}

function PagerArrow({ direction, onPress }: { direction: 'left' | 'right'; onPress: () => void }) {
    const theme = useTheme();

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={direction === 'left' ? 'Предыдущая фотография' : 'Следующая фотография'}
            style={({ pressed, hovered }) => [
                styles.arrow,
                direction === 'left' ? styles.arrowLeft : styles.arrowRight,
                { backgroundColor: theme.backgroundRaised },
                (pressed || hovered) && styles.arrowActive,
            ]}>
            {/* Повёрнутый уголок визуально тяжелее со стороны острия —
                сдвиг на пиксель назад ставит его по центру кружка. */}
            <View style={direction === 'left' ? styles.chevronLeft : styles.chevronRight}>
                <Chevron direction={direction} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    arrow: {
        position: 'absolute',
        top: '50%',
        width: ARROW_SIZE,
        height: ARROW_SIZE,
        marginTop: -ARROW_SIZE / 2,
        borderRadius: ARROW_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.85,
        boxShadow: '0 1px 6px rgba(0, 0, 0, 0.2)',
    },
    arrowLeft: {
        left: Spacing.three,
    },
    arrowRight: {
        right: Spacing.three,
    },
    chevronLeft: {
        transform: [{ translateX: 2 }, { translateY: -1 }],
    },
    chevronRight: {
        transform: [{ translateX: -2 }, { translateY: -1 }],
    },
    arrowActive: {
        opacity: 1,
    },
    thumbnail: {
        borderRadius: Spacing.one + Spacing.half,
        overflow: 'hidden',
    },
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
