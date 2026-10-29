
import { Directory, File, Paths } from 'expo-file-system';

// Основная папка офлайн-данных
const OFFLINE_DIRECTORY = 'offline';

// Папка для сохранённых месяцев
const MONTHS_DIRECTORY = 'months';

/**
 * Возвращает папку, в которой хранятся месяцы.
 * При необходимости создаёт её.
 */
function getMonthsDirectory(): Directory {
    const directory = new Directory(
        Paths.document,
        OFFLINE_DIRECTORY,
        MONTHS_DIRECTORY
    );

    if (!directory.exists) {
        directory.create({ intermediates: true });
    }

    return directory;
}

/**
 * Возвращает объект файла для указанного месяца.
 * Например: 1 -> 01.json, 10 -> 10.json.
 */
function getMonthFile(month: number): File {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('Номер месяца должен быть от 1 до 12');
    }

    const directory = getMonthsDirectory();
    const fileName = `${String(month).padStart(2, '0')}.json`;

    return new File(directory, fileName);
}

/**
 * Сохраняет данные месяца в JSON-файл.
 */
export async function saveMonth<T>(
    month: number,
    data: T
): Promise<void> {
    const file = getMonthFile(month);
    const json = JSON.stringify(data);

    if (json === undefined) {
        throw new Error('Данные нельзя преобразовать в JSON');
    }

    if (!file.exists) {
        file.create();
    }

    file.write(json);
}

/**
 * Читает сохранённые данные месяца.
 * Возвращает null, если файла нет.
 */
export async function loadMonth<T>(
    month: number
): Promise<T | null> {
    const file = getMonthFile(month);

    if (!file.exists) {
        return null;
    }

    const json = await file.text();

    return JSON.parse(json) as T;
}

/**
 * Возвращает папку с полными карточками новомучеников.
 * Если папки нет, создаёт её.
 */
function getPersonsDirectory(): Directory {
    const directory = new Directory(
        Paths.document,
        'offline',
        'persons'
    );

    if (!directory.exists) {
        directory.create({ intermediates: true });
    }

    return directory;
}

/**
 * Возвращает файл карточки по номеру дела.
 * Например: 123 -> persons/123.json
 */
function getPersonFile(number: number): File {
    if (!Number.isSafeInteger(number) || number <= 0) {
        throw new Error('Некорректный номер дела');
    }

    const directory = getPersonsDirectory();

    return new File(directory, `${number}.json`);
}

/**
 * Сохраняет полную карточку новомученика.
 */
export async function savePerson<T>(
    number: number,
    data: T
): Promise<void> {
    const file = getPersonFile(number);

    const json = JSON.stringify(data);

    if (json === undefined) {
        throw new Error('Данные нельзя преобразовать в JSON');
    }

    if (!file.exists) {
        file.create();
    }

    file.write(json);
}

/**
 * Читает сохранённую карточку.
 * Если файл отсутствует, возвращает null.
 */
export async function loadPerson<T>(
    number: number
): Promise<T | null> {
    const file = getPersonFile(number);

    if (!file.exists) {
        return null;
    }

    const json = await file.text();

    return JSON.parse(json) as T;
}
