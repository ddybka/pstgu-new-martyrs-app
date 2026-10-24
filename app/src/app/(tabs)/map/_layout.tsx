import { Stack } from 'expo-router';

// Без шапки: она оставляла светлую полосу поверх карты
export default function MapLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
