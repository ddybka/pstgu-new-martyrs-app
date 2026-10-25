import { Link } from 'expo-router';

import type { PersonCardMenuProps } from './person-card-menu';
import { personMenuItems } from './person-menu-items';

/** См. `person-card-menu.tsx`: здесь переход по нажатию делает `Link`. */
export const CARD_MENU_NAVIGATES = true;

/**
 * Системное контекстное меню карточки: по долгому нажатию карточка
 * приподнимается с системной анимацией, фон размывается, рядом появляются
 * действия, а нажатие на превью открывает страницу новомученика.
 *
 * Меню — `Link.Menu` из expo-router, то есть обычное `UIContextMenuInteraction`
 * на UIKit, а не SwiftUI. Раньше здесь был `ContextMenu` из `@expo/ui`: он
 * оборачивал каждую карточку в свой SwiftUI-хост, и хост на каждом кадре
 * прокрутки пересчитывал своё положение на экране. В дни на сотню с лишним
 * новомучеников (14 декабря) список терял до 40% кадров, а без хоста —
 * меньше процента. Превью тоже дешевле: `Link.Preview` монтирует его, только
 * когда меню открыто, а не держит копию каждой карточки заранее.
 */
export function PersonCardMenu({ person, name, preview, previewHeight, children }: PersonCardMenuProps) {
    return (
        <Link href={{ pathname: '/person/[id]', params: { id: person.Номер } }} asChild>
            <Link.Trigger>{children()}</Link.Trigger>
            {/* Без высоты превью растягивается на весь экран, и карточка
                висела бы сверху над пустым полем. */}
            <Link.Preview style={previewHeight ? { height: previewHeight } : undefined}>{preview}</Link.Preview>
            <Link.Menu>
                {personMenuItems(person.Номер, name).map((item) => (
                    <Link.MenuAction key={item.key} icon={item.sfSymbol} onPress={() => void item.run()}>
                        {item.label}
                    </Link.MenuAction>
                ))}
            </Link.Menu>
        </Link>
    );
}
