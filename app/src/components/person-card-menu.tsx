import type { ReactElement } from 'react';

import type { Person } from '@/hooks/use-persons';

export type PersonCardMenuProps = {
    person: Person;
    name: string;
    preview: ReactElement;
    /** Высота карточки — превью в меню iOS иначе занимает весь экран. */
    previewHeight?: number;
    children: (onLongPress?: () => void) => ReactElement;
};

/**
 * Меню само открывает страницу новомученика по нажатию на карточку (iOS:
 * карточка — это `Link`). Тогда своего перехода у карточки быть не должно:
 * `Link` складывает обработчики нажатия, и страница открылась бы дважды.
 */
export const CARD_MENU_NAVIGATES = false;

/**
 * Меню карточки по долгому нажатию: «Поделиться» и «Уточнить сведения» — те
 * же пункты, что в «⋯» на странице новомученика (`person-menu-items`).
 *
 * На iOS — системное контекстное меню с подъёмом карточки
 * (`person-card-menu.ios.tsx`), на Android — Material-меню у карточки
 * (`person-card-menu.android.tsx`). В вебе долгого нажатия нет — карточка как
 * есть.
 */
export function PersonCardMenu({ children }: PersonCardMenuProps) {
    return children();
}
