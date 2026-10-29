
import type { Person, PersonsResponse } from '@/hooks/use-persons';
import { loadMonth, loadPerson } from './offline-storage';

type MonthData = {
    month: number;
    days: Record<string, number[]>;
};

/**
 * Собирает список новомучеников за день
 * из локально сохранённых JSON-файлов.
 *
 * Возвращает null, если данных недостаточно.
 */
export async function loadOfflinePersons(
    month: number,
    day: number
): Promise<PersonsResponse | null> {
    const monthData = await loadMonth<MonthData>(month);

    const dayKey = String(day).padStart(2, '0');
    const numbers = monthData?.days?.[dayKey];

    if (!Array.isArray(numbers)) {
        return null;
    }

    const persons: Person[] = [];

    for (const number of numbers) {
        try {
            const person = await loadPerson<Person>(number);

            if (person === null) {
                return null;
            }

            persons.push(person);
        } catch {
            return null;
        }
    }

    return {
        success: true,
        items: persons,
        items_count: persons.length,
        total_docs_count: persons.length,
        has_next: false,
        skip: 0,
        take: persons.length,
    };
}
