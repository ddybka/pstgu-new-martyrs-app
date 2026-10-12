import { MenuView, type MenuComponentRef } from '@expo/ui/community/menu';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PersonCardMenuProps } from './person-card-menu';
import { personMenuItems } from './person-menu-items';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Меню карточки на Android — Material-меню у карточки по долгому нажатию.
 * Поднимать карточку, как на iOS, система здесь не умеет.
 *
 * Открывается из самой карточки (`onLongPress`), а не триггером `MenuView`:
 * карточка — свой `Pressable` с переходом по нажатию, и долгое нажатие до
 * обёртки вокруг неё не дошло бы.
*/
export function PersonCardMenu({ person, name, children }: PersonCardMenuProps) {
    const menu = useRef<MenuComponentRef>(null);
    const colorScheme = useColorScheme();
    const actions = personMenuItems(person.Номер, name);

    return (
        <View>
            {children(() => menu.current?.show())}
            <MenuView
                ref={menu}
                colorScheme={colorScheme}
                shouldOpenOnLongPress
                style={styles.anchor}
                actions={actions.map((action) => ({ id: action.key, title: action.label }))}
                onPressAction={({ nativeEvent }) => void actions.find((it) => it.key === nativeEvent.event)?.run()}>
                <View style={styles.anchorPoint} />
            </MenuView>
        </View>
    );
}

const styles = StyleSheet.create({
    anchor: {
        position: 'absolute',
        left: Spacing.three,
        bottom: 0,
    },
    anchorPoint: {
        width: 1,
        height: 1,
    },
});
