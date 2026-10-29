import { loadMonth, loadPerson } from './offline-storage';
import { getPersonPhotos } from '@/hooks/use-image-person';
import { getOfflinePhotoUri } from './offline-photos';

type MonthData = {
    month: number;
    days: Record<string, number[]>;
};

export type MonthVerification = {
    totalDays: number;
    savedDays: number;
    totalPersons: number;
    savedPersons: number;
    missingPersons: number[];
    complete: boolean;
};

export async function verifyMonth(
    month: number
): Promise<MonthVerification> {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('Некорректный номер месяца');
    }

    const totalDays = new Date(2024, month, 0).getDate();

    const data = await loadMonth<MonthData>(month);

    let savedDays = 0;
    const numbers = new Set<number>();

    // Проверяем все дни месяца
    for (let day = 1; day <= totalDays; day++) {
        const dayKey = String(day).padStart(2, '0');
        const dayNumbers = data?.days?.[dayKey];

        if (Array.isArray(dayNumbers)) {
            savedDays++;

            for (const number of dayNumbers) {
                numbers.add(number);
            }
        }
    }

    const missingPersons: number[] = [];
    let savedPersons = 0;

    // Проверяем каждую уникальную карточку
    for (const number of numbers) {
        try {
            const person = await loadPerson<unknown>(number);

            if (person === null) {
                missingPersons.push(number);
            } else {
                savedPersons++;
            }
        } catch {
            // Файл отсутствует или содержит некорректный JSON
            missingPersons.push(number);
        }
    }

    return {
        totalDays,
        savedDays,
        totalPersons: numbers.size,
        savedPersons,
        missingPersons,
        complete:
            savedDays === totalDays &&
            missingPersons.length === 0,
    };
}


export type PhotosVerificationResult = {
    totalPhotos: number;
    savedPhotos: number;
    missingPhotos: string[];
    complete: boolean;
};

/**
 * Проверяет фотографии всех биографий
 * за выбранный месяц.
 */
export async function verifyMonthPhotos(
    month: number
): Promise<PhotosVerificationResult> {
    const monthData = await loadMonth<{
        month: number;
        days: Record<string, number[]>;
    }>(month);

    if (!monthData) {
        return {
            totalPhotos: 0,
            savedPhotos: 0,
            missingPhotos: [],
            complete: false,
        };
    }

    // Собираем уникальные номера дел.
    const personNumbers = new Set<number>();

    for (const numbers of Object.values(monthData.days)) {
        for (const number of numbers) {
            personNumbers.add(number);
        }
    }

    // Собираем уникальные идентификаторы фотографий.
    const photoIds = new Set<string>();
    let missingPersons = false;

    for (const number of personNumbers) {
        const person = await loadPerson<{
            Фотографии?: unknown;
        }>(number);

        if (!person) {
            missingPersons = true;
            continue;
        }

        const photos = getPersonPhotos(person.Фотографии);

        for (const photo of photos) {
            photoIds.add(photo.fileId);
        }
    }

    const missingPhotos: string[] = [];

    for (const fileId of photoIds) {
        if (!getOfflinePhotoUri(fileId)) {
            missingPhotos.push(fileId);
        }
    }

    return {
        totalPhotos: photoIds.size,
        savedPhotos: photoIds.size - missingPhotos.length,
        missingPhotos,
        complete: !missingPersons && missingPhotos.length === 0,
    };
}
