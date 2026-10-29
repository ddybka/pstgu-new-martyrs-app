
import { apiFetch } from '@/utils/api-fetch';
import { dayOfYearFilter } from '@/hooks/use-persons';
import {
    saveMonth,
    loadMonth,
    savePerson,
    loadPerson,
} from './offline-storage';
import { API_URL, ensureToken } from '@/utils/api-fetch';
import { getPersonPhotos } from '@/hooks/use-image-person';
import { downloadPhoto } from './offline-photos';

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
 * Скачивает все сжатые фотографии одной биографии.
 */
async function downloadPersonPhotos(
    person: { Фотографии?: unknown },
    forceUpdate = false
): Promise<void> {
    const photos = getPersonPhotos(person.Фотографии);

    if (photos.length === 0) return;

    const token = await ensureToken();

    for (const photo of photos) {
        const url = `${API_URL}files/${photo.fileId}/content`;

        await downloadPhoto(
            photo.fileId,
            url,
            token,
            forceUpdate
        );
    }
}

/**
 * Скачивает полную карточку новомученика.
 * При withPhotos = true также сохраняет фотографии.
 */
export async function downloadPerson(
    number: number,
    forceUpdate = false,
    withPhotos = false
): Promise<void> {
    let person: { Фотографии?: unknown } | null = null;

    // Сначала проверяем локально сохранённую карточку.
    if (!forceUpdate) {
        person = await loadPerson<{ Фотографии?: unknown }>(number);
    }

    // Если карточки нет или требуется обновление,
    // получаем её с сервера.
    if (person === null) {
        person = await apiFetch<{ Фотографии?: unknown }>(
            `public/dela/${number}`
        );

        await savePerson(number, person);

        console.log(`Карточка ${number} сохранена`);
    } else {
        console.log(`Карточка ${number} уже сохранена`);
    }

    // Фотографии скачиваются только по запросу пользователя.
    if (withPhotos) {
        await downloadPersonPhotos(person, forceUpdate);
        console.log(`Фотографии карточки ${number} обработаны`);
    }
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
    onProgress?: (progress: DownloadProgress) => void,
    forceUpdate = false,
    withPhotos = false
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

        await downloadPerson(number, forceUpdate, withPhotos);

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
    onProgress?: (progress: MonthDownloadProgress) => void,
    forceUpdate = false,
    withPhotos = false
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

        await downloadDayPersons(
            month,
            day,
            (progress) => {
                onProgress?.({
                    month,
                    day,
                    totalDays,
                    completedDays: day - 1,
                    completedPersons: completedPersons + progress.completed,
                    totalPersons,
                });
            },
            forceUpdate,
            withPhotos
        );


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