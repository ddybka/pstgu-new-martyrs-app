import { useApiResource } from '@/hooks/use-api-resource';
import type { Person } from '@/hooks/use-persons';
import { loadPerson } from '@/utils/offline/offline-storage';
import { apiFetch } from '@/utils/api-fetch';

export function normalizePersonNumber(id: string | string[] | number | undefined) {
    const raw = Array.isArray(id) ? id[0] : id;
    if (raw === undefined || raw === null || raw === '') return null;

    const number = Number(raw);
    return Number.isInteger(number) ? number : null;
}

async function fetchPersonOfflineFirst(key: string): Promise<Person> {
    const number = Number(key.split('/').pop());

    if (Number.isInteger(number)) {
        try {
            const person = await loadPerson<Person>(number);

            if (person !== null) {
                console.log(`Карточка №${number} загружена из офлайн-базы`);
                return person;
            }
        } catch (error) {
            console.warn('Ошибка чтения офлайн-карточки:', error);
        }
    }

    return apiFetch<Person>(key);
}

/**
 * Одно дело по номеру: `GET public/dela/{number}`.
 */
export function usePerson(id: string | string[] | number | undefined) {
    const number = normalizePersonNumber(id);
    const { data, absent, ...resource } = useApiResource<Person>(
        number === null ? null : `public/dela/${number}`,
        { fetcher: fetchPersonOfflineFirst }
    );

    return {
        ...resource,
        person: data,
        number,
        notFound: absent,
        reload: resource.refresh,
    };
}
