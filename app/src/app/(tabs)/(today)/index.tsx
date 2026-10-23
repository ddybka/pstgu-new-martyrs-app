import { BlockError } from '@/components/block-error';
import { TabHeaderMenu } from '@/components/tab-header-menu';
import { ListButton } from '@/components/list-button';
import { ShowCards } from '@/components/show-cards';
import { ThemedText } from '@/components/themed-text';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { usePersons } from '@/hooks/use-persons';
import Constants from 'expo-constants';

export default function HomeScreen() {
    const { persons, loading, refreshing, error, stale, updatedAt, refresh } = usePersons();

    if (error) {
        return <BlockError error={error} onRetry={refresh} />;
    }

    // Кнопки вида карточек и «⋯» на iOS и Android — в шапке экрана, а в вебе
    // здесь, справа от строки «Найдено…», только вид (см. tab-header-menu).
    const header = (
        <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
                {formatMartyrsCount(persons.length)}
            </ThemedText>
            <TabHeaderMenu />
        </View>
    );

    const footer = (
        <View style={styles.footer}>
            <ListButton label="Помочь проекту" onPress={() => router.push('/help')} />
            <ListButton label="О проекте" onPress={() => router.push('/about')} last />
            <ListButton label="Настройки" onPress={() => router.push('/settings')} last />
            <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.version}
            >
                v{Constants.expoConfig?.version ?? '0.0.0'}
            </ThemedText>
        </View>
    );

    return (
        <ShowCards
            persons={persons}
            header={header}
            footer={footer}
            loading={loading}
            refreshing={refreshing}
            onRefresh={refresh}
            stale={stale}
            updatedAt={updatedAt}
            emptyText="В этот день памяти нет записей"
        />
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: Spacing.three,
    },
    date: {
        flex: 1,
        padding: Spacing.three,
        fontSize: 17,
        lineHeight: 22,
    },
    footer: {
        width: '100%',
        paddingTop: Spacing.five,
    },
    version: {
        paddingTop: Spacing.five,
        textAlign: 'center',
    },
});

function formatMartyrsCount(count: number) {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    const noun =
        lastTwoDigits >= 11 && lastTwoDigits <= 14
            ? 'новомучеников'
            : lastDigit === 1
                ? 'новомученик'
                : lastDigit >= 2 && lastDigit <= 4
                    ? 'новомученика'
                    : 'новомучеников';

    const ending =
        lastDigit === 1 && lastTwoDigits !== 11
            ? ',\nпоминаемый сегодня.'
            : ',\nпоминаемых сегодня.';

    return `Найдено ${count} ${noun}${ending}`;
}
