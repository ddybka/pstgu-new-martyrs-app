import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Раскрывающийся по высоте блок в вебе — CSS-переходом высоты, без
 * reanimated (см. `expandable.tsx`). Содержимое меряется в невидимом слое,
 * как и на телефоне, а высота и прозрачность доезжают сами.
 */
export function Expandable({
    open,
    children,
    style,
}: {
    open: boolean;
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    const [height, setHeight] = useState(0);

    return (
        <View style={[styles.clip, { height: open ? height : 0, opacity: open ? 1 : 0 }]}>
            <View style={[styles.measure, style]} onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    clip: {
        overflow: 'hidden',
        // Как TIMING в expandable.tsx: 280 мс, плавное замедление (ease-out cubic).
        transitionProperty: 'height, opacity',
        transitionDuration: '280ms',
        transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
    } as ViewStyle,
    measure: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
});
