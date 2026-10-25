import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/hooks/use-stack-header';

// Шапка сплошная, цвета страницы: прозрачная оставляла светлую полосу поверх
// карты, а заголовок поверх подложки читался бы плохо.
export default function MapLayout() {
    const options = useStackHeaderOptions('Карта событий', { large: false, transparent: false });

    return (
        <Stack>
            <Stack.Screen name="index" options={options} />
        </Stack>
    );
}
