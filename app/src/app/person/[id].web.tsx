import type { Metadata } from "expo-router/server";
import personsIndexData from "@/data/persons-index.json";

import { SITE_URL } from "@/constants/site";
import PersonPage from "@/screens/person-page";

type PersonIndexEntry = [number, string, string, number, number];
type PersonsIndex = { persons: PersonIndexEntry[] };

function loadPersonsIndex(): PersonsIndex {
    return personsIndexData as PersonsIndex;
}

export default PersonPage;

export async function generateStaticParams(): Promise<{ id: string }[]> {
    const { persons } = await loadPersonsIndex();
    return persons.slice(0, 100).map(([number]) => ({ id: String(number) }));
}

export async function generateMetadata(
    _request: undefined,
    params: { id: string },
): Promise<Metadata> {
    const { persons } = await loadPersonsIndex();
    const person = persons.find(([id]) => id === Number(params.id));

    if (!person) {
        return {
            title: "Новомученик не найден",
            robots: { index: false, follow: false },
        };
    }

    const [, name, rank, born, died] = person;
    const years = born && died
        ? `${born}–${died}`
        : born
            ? `с ${born} года`
            : died
                ? `до ${died} года`
                : "";

    const title = `${name} — житие и биография`;
    const description = [
        name,
        years,
        rank,
        "Биографические сведения и места, связанные с жизнью новомученика.",
    ]
        .filter(Boolean)
        .join(". ");
    const url = `${SITE_URL}/person/${params.id}`;

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            siteName: "Память новомучеников",
            locale: "ru_RU",
            type: "website",
        },
    };
}
