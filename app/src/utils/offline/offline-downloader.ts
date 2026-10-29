
import { apiFetch } from '@/utils/api-fetch';
import { dayOfYearFilter } from '@/hooks/use-persons';
import {
    saveMonth,
    loadMonth,
    savePerson,
    loadPerson,
} from './offline-storage';

type PersonItem = {
    Номер: number;
    Заголовок?: string;
};

type PersonsApiResponse = {
    items: PersonItem[];
    has_next: boolean;
};

const PAGE_SIZE = 50;

/**
 * Получает все номера дел за указанный день.
 */
async function fetchAllDayNumbers(
    month: number,
    day: number
): Promise<number[]> {
    const filter = dayOfYearFilter(month, day);

    const numbers: number[] = [];
    let skip = 0;
    let hasNext = true;

    while (hasNext) {
        const params = new URLSearchParams({
            data_format: 'item',
            filter: JSON.stringify(filter),
            take: String(PAGE_SIZE),
            skip: String(skip),
        });

        const url = `public/dela?${params.toString()}`;

        const response = await apiFetch<PersonsApiResponse>(url);

        const pageNumbers = response.items.map(
            (person) => person.Номер
        );

        numbers.push(...pageNumbers);

        // Защита от бесконечного цикла,
        // если сервер вернул пустую страницу
        if (response.items.length === 0) {
            break;
        }

        skip += response.items.length;
        hasNext = response.has_next;
    }

    return [...new Set(numbers)];
}

/**
 * Скачивает список дел за один день
 * и сохраняет его в файл месяца.
 */
export async function downloadDay(
    month: number,
    day: number
): Promise<void> {
    const numbers = await fetchAllDayNumbers(month, day);

    const existing = await loadMonth<{
        month: number;
        days: Record<string, number[]>;
    }>(month);

    const dayKey = String(day).padStart(2, '0');

    await saveMonth(month, {
        month,
        days: {
            ...(existing?.days ?? {}),
            [dayKey]: numbers,
        },
    });

    console.log(
        `Сохранено ${numbers.length} дел за ${day}.${month}`
    );
}


/**
 * Скачивает полную карточку новомученика
 * и сохраняет её в локальный JSON-файл.
 */
export async function downloadPerson(
    number: number
): Promise<void> {
    // Проверяем, есть ли карточка на устройстве
    const savedPerson = await loadPerson<unknown>(number);

    if (savedPerson !== null) {
        console.log(`Карточка ${number} уже сохранена`);
        return;
    }

    // Запрашиваем полную карточку с сервера
    const person = await apiFetch<unknown>(
        `public/dela/${number}`
    );

    // Сохраняем полученные данные
    await savePerson(number, person);

    console.log(`Карточка ${number} сохранена`);
}

/**
 * Информация о ходе загрузки.
 */
export type DownloadProgress = {
    total: number;
    completed: number;
    currentNumber: number;
};

/**
 * Скачивает все полные карточки за указанный день.
 */
export async function downloadDayPersons(
    month: number,
    day: number,
    onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
    // Получаем сохранённый список номеров дел
    const monthData = await loadMonth<{
        month: number;
        days: Record<string, number[]>;
    }>(month);

    const dayKey = String(day).padStart(2, '0');
    const numbers = monthData?.days[dayKey];

    if (!numbers) {
        throw new Error(
            `Список дел за ${day}.${month} ещё не скачан`
        );
    }

    const total = numbers.length;

    // Скачиваем карточки по одной
    for (let index = 0; index < total; index++) {
        const number = numbers[index];

        await downloadPerson(number);

        // Сообщаем интерфейсу о прогрессе
        onProgress?.({
            total,
            completed: index + 1,
            currentNumber: number,
        });
    }

    console.log(
        `Загрузка карточек за ${day}.${month} завершена`
    );
}

export type MonthDownloadProgress = {
    month: number;
    day: number;
    totalDays: number;
    completedDays: number;
    completedPersons: number;
    totalPersons: number;
};

export async function downloadMonth(
    month: number,
    onProgress?: (progress: MonthDownloadProgress) => void
): Promise<void> {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('Некорректный номер месяца');
    }

    // Используем високосный год, чтобы февраль включал 29 число.
    const totalDays = new Date(2024, month, 0).getDate();

    let completedPersons = 0;
    let totalPersons = 0;

    for (let day = 1; day <= totalDays; day++) {
        // Получаем список номеров за день.
        await downloadDay(month, day);

        const monthData = await loadMonth<{
            month: number;
            days: Record<string, number[]>;
        }>(month);

        const dayKey = String(day).padStart(2, '0');
        const numbers = monthData?.days[dayKey] ?? [];

        totalPersons += numbers.length;

        // Скачиваем полные карточки.
        await downloadDayPersons(month, day, (progress) => {
            onProgress?.({
                month,
                day,
                totalDays,
                completedDays: day - 1,
                completedPersons: completedPersons + progress.completed,
                totalPersons,
            });
        });

        completedPersons += numbers.length;

        onProgress?.({
            month,
            day,
            totalDays,
            completedDays: day,
            completedPersons,
            totalPersons,
        });
    }

    console.log(`Месяц ${month} загружен`);
}