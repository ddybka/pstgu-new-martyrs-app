import type { Metadata } from 'expo-router/server';
import PersonPage from '@/screens/person-page';

const title = 'Страница новомученика — Память новомучеников';
const description =
    'Узнайте подробнее о новомучениках и исповедниках Церкви Русской, их жизни и подвиге.';

export default PersonPage;

export async function generateMetadata(): Promise<Metadata> {
    return {
        title,
        description,
        keywords: [
            'новомученики',
            'исповедники Церкви Русской',
            'история Церкви',
        ],
        robots: { index: false, follow: true },
        openGraph: {
            title,
            description,
            siteName: 'Память новомучеников',
            locale: 'ru_RU',
            type: 'website',
        },
    };
}
