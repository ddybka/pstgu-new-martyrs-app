import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/hooks/use-stack-header';

export default function CalendarLayout() {
    const options = useStackHeaderOptions('Календарь');

    return (
        <Stack>
            <Stack.Screen name="index" options={options} />
        </Stack>
    );
}
