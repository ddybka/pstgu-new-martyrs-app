import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/hooks/use-stack-header';

export default function SearchLayout() {
    const options = useStackHeaderOptions('Поиск');

    return (
        <Stack>
            <Stack.Screen name="index" options={options} />
        </Stack>
    );
}
