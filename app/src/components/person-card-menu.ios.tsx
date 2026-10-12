import { Button, ContextMenu, Host, RNHostView } from '@expo/ui/swift-ui';

import type { PersonCardMenuProps } from './person-card-menu';
import { personMenuItems } from './person-menu-items';

/**
 * Системное контекстное меню карточки: по долгому нажатию карточка
 * приподнимается с системной анимацией, фон размывается, рядом появляются
 * действия.
 */
export function PersonCardMenu({ person, name, preview, children }: PersonCardMenuProps) {
    return (
        // Ширина — от списка, высота — по карточке: текст в ней
        // переносится по ширине экрана.
        <Host matchContents={{ vertical: true }} ignoreSafeArea="all">
            <ContextMenu>
                <ContextMenu.Trigger>
                    <RNHostView matchContents={{ vertical: true }}>{children()}</RNHostView>
                </ContextMenu.Trigger>
                <ContextMenu.Preview>
                    <RNHostView matchContents>{preview}</RNHostView>
                </ContextMenu.Preview>
                <ContextMenu.Items>
                    {personMenuItems(person.Номер, name).map((item) => (
                        <Button
                            key={item.key}
                            label={item.label}
                            systemImage={item.sfSymbol}
                            onPress={() => void item.run()}
                        />
                    ))}
                </ContextMenu.Items>
            </ContextMenu>
        </Host>
    );
}
