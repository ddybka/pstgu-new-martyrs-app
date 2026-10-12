import type { SFSymbol } from 'expo-symbols';
import { Alert, Platform } from 'react-native';

import { personUrl } from '@/constants/site';
import { shareLink, type ShareResult } from '@/utils/share-link';
import { router } from 'expo-router';

/**
 * Пункты меню «⋯» на странице новомученика — общие для нативного меню в шапке
 * (`person-menu.tsx`), веб-варианта (`person-menu.web.tsx`) и меню карточки
 * в списке по долгому нажатию (`person-card-menu`).
 */
export type PersonMenuItem = {
    key: string;
    label: string;
    /** SF Symbol для iOS. На Android пункты меню без иконок. */
    sfSymbol: SFSymbol;
    run: () => Promise<ShareResult | void> | void;
};

function placeholder(label: string) {
    const message = `«${label}» появится в следующих версиях`;

    // Alert в react-native-web ничего не показывает.
    if (Platform.OS === 'web') {
        globalThis.alert?.(message);
        return;
    }

    Alert.alert('Скоро', message);
}

export function personMenuItems(number: number, name?: string): PersonMenuItem[] {
    return [
        {
            key: 'share',
            label: 'Поделиться',
            sfSymbol: 'square.and.arrow.up',
            run: () => shareLink({ title: name ?? `Дело №${number}`, url: personUrl(number) }),
        },
        {
            key: 'report',
            label: 'Уточнить сведения',
            sfSymbol: 'exclamationmark.bubble',
            run: () => router.push('/help'),
        },
    ];
}
