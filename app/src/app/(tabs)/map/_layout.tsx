import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/hooks/use-stack-header';

// Маленькая системная шапка, как у остальных вкладок: на iOS прозрачная, на
// системном материале, и карта уходит под неё (см. отступ фильтра в index).
// Фон у шапки всегда, а не только от прокрутки — под картой её нет: размытие
// до iOS 26, системный край прокрутки на iOS 26 (см. EdgeEffectHost в index).
export default function MapLayout() {
    const options = useStackHeaderOptions('Карта событий', { large: false, material: true });

    return (
        <Stack>
            <Stack.Screen name="index" options={options} />
        </Stack>
    );
}
