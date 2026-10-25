import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/hooks/use-stack-header';

// Маленькая системная шапка, как у остальных вкладок: на iOS прозрачная, на
// системном материале, и карта уходит под неё (см. отступ фильтра в index).
// Фон у шапки всегда, а не только от прокрутки — под картой её нет: размытие
// до iOS 26, системное стекло на iOS 26 (его кладёт экран, см. HeaderGlass).
export default function MapLayout() {
    const options = useStackHeaderOptions('Карта событий', { large: false, material: true });

    return (
        <Stack>
            <Stack.Screen name="index" options={options} />
        </Stack>
    );
}
