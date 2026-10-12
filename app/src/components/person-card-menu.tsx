import type { ReactElement } from 'react';

import type { Person } from '@/hooks/use-persons';

export type PersonCardMenuProps = {
    person: Person;
    name: string;
    preview: ReactElement;
    children: (onLongPress?: () => void) => ReactElement;
};

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
