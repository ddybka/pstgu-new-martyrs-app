import { useApiResource } from '@/hooks/use-api-resource';
import type { Person } from '@/hooks/use-persons';

export function normalizePersonNumber(id: string | string[] | number | undefined) {
    const raw = Array.isArray(id) ? id[0] : id;
    if (raw === undefined || raw === null || raw === '') return null;

    const number = Number(raw);
    return Number.isInteger(number) ? number : null;
}

/**
 * Одно дело по номеру: `GET public/dela/{number}`.
 */
export function usePerson(id: string | string[] | number | undefined) {
    const number = normalizePersonNumber(id);
    const { data, absent, ...resource } = useApiResource<Person>(
        number === null ? null : `public/dela/${number}`
    );

    return {
        ...resource,
        person: data,
        number,
        notFound: absent,
        reload: resource.refresh,
    };
}
