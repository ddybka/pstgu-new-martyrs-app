import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/hooks/use-stack-header';

export default function TodayLayout() {
    const options = useStackHeaderOptions('Сегодня');

    return (
        <Stack>
            <Stack.Screen name="index" options={options} />
        </Stack>
    );
}
