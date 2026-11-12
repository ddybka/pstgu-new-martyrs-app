import type { PersonSort } from '@/context/person-sort';
import type { Person } from '@/hooks/use-persons';
import { compareDisplayedNames, formatPersonName, type NameOrder } from '@/utils/person-name';
import { rankScore } from '@/utils/person-rank';

/**
 * Порядок карточек в списках.
 *
 * «По сану» — от высшего разряда к низшему (см. `rankScore`), внутри разряда
 * по алфавиту; «По алфавиту» — по тому, как ФИО показано сейчас (см.
 * `formatPersonName` и `compareDisplayedNames`).
 */
export function sortPersons(persons: Person[], order: NameOrder, sort: PersonSort) {
    const named = persons.map((person) => ({
        person,
        name: formatPersonName(person.ФИО, order) ?? person.Заголовок ?? '',
    }));

    named.sort((a, b) => {
        if (sort === 'rank') {
            const byRank = rankScore(b.person.сан_церк_служение) - rankScore(a.person.сан_церк_служение);
            if (byRank !== 0) return byRank;
        }

        return compareDisplayedNames(a.name, b.name);
    });

    return named.map(({ person }) => person);
}
