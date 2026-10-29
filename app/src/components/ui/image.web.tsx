import { useState, type CSSProperties } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Картинка в вебе — обычный <img> (см. `image.tsx`). Умеет только то, чем
 * пользуется приложение: `contentFit`, `contentPosition`, плавное появление
 * (`transition`), `onLoad` с размерами снимка и `onError`.
 *
 * Браузер сам кэширует картинки, сам откладывает загрузку тех, что ниже
 * экрана (`loading="lazy"`), и декодирует их вне главного потока
 * (`decoding="async"`) — то, ради чего на телефоне нужен expo-image.
 */

type Source = string | { uri?: string } | null | undefined;

function uriOf(source: Source): string | undefined {
    if (!source) return undefined;
    return typeof source === 'string' ? source : source.uri;
}

const POSITIONS: Record<string, string> = {
    top: 'center top',
    left: 'left center',
    center: 'center',
};

export function Image({
    source,
    style,
    contentFit = 'cover',
    contentPosition = 'center',
    transition = 0,
    accessibilityLabel,
    alt,
    onLoad,
    onError,
}: {
    source: Source;
    style?: StyleProp<ViewStyle>;
    contentFit?: 'cover' | 'contain';
    contentPosition?: 'top' | 'left' | 'center';
    transition?: number;
    accessibilityLabel?: string;
    alt?: string;
    onLoad?: (event: { source: { width: number; height: number } }) => void;
    onError?: () => void;
    /** Для совместимости с expo-image; в вебе не нужны. */
    recyclingKey?: string;
    accessibilityIgnoresInvertColors?: boolean;
}) {
    const uri = uriOf(source);
    // Загруженный адрес, а не флаг: новый снимок в том же месте снова
    // проявляется, а не появляется скачком.
    const [loadedUri, setLoadedUri] = useState<string | null>(null);
    const loaded = loadedUri === uri;

    const imageStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: contentFit,
        objectPosition: POSITIONS[contentPosition] ?? contentPosition,
        opacity: transition > 0 && !loaded ? 0 : 1,
        transition: transition > 0 ? `opacity ${transition}ms ease-out` : undefined,
    };

    return (
        <View style={[{ overflow: 'hidden' }, style]}>
            {uri && (
                <img
                    src={uri}
                    alt={alt ?? accessibilityLabel ?? ''}
                    loading="lazy"
                    decoding="async"
                    style={imageStyle}
                    onLoad={(event) => {
                        const image = event.currentTarget;
                        setLoadedUri(uri);
                        onLoad?.({ source: { width: image.naturalWidth, height: image.naturalHeight } });
                    }}
                    onError={() => onError?.()}
                />
            )}
        </View>
    );
}
