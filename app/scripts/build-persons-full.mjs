
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    renameSync,
    writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = (
    process.env.EXPO_PUBLIC_API_URL || 'https://api.nmbook.ru'
).replace(/\/?$/, '/');

const LOGIN = process.env.EXPO_PUBLIC_API_LOGIN;
const PASSWORD = process.env.EXPO_PUBLIC_API_PASSWORD;

const BATCH_SIZE = 50;
const WORKERS = 4;
const OUTPUT_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'data',
    'persons-full',
);
const INDEX_PATH = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'data',
    'persons-index.json',
);

if (!LOGIN || !PASSWORD) {
    throw new Error(
        'Не найдены EXPO_PUBLIC_API_LOGIN и EXPO_PUBLIC_API_PASSWORD. Проверь .env.',
    );
}

if (!existsSync(INDEX_PATH)) {
    throw new Error(`Не найден индекс: ${INDEX_PATH}`);
}

const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
const persons = index.persons;

if (!Array.isArray(persons) || persons.length === 0) {
    throw new Error('Индекс не содержит список persons.');
}

mkdirSync(OUTPUT_DIR, { recursive: true });

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login() {
    const response = await fetch(`${API_URL}login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            username: LOGIN,
            password: PASSWORD,
        }),
    });

    if (!response.ok) {
        throw new Error(`Ошибка входа в API: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.access_token) {
        throw new Error('API не вернул access_token.');
    }

    return data.access_token;
}

async function fetchPerson(number, token) {
    const url = `${API_URL}public/dela/${number}`;

    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const person = await response.json();

                if (Number(person.Номер) !== number) {
                    throw new Error(
                        `Для номера ${number} API вернул другую запись.`,
                    );
                }

                return person;
            }

            if (
                response.status !== 429 &&
                response.status < 500
            ) {
                throw new Error(
                    `Запись №${number}: HTTP ${response.status}`,
                );
            }

            console.warn(
                `Запись №${number}: HTTP ${response.status}, попытка ${attempt}/5`,
            );
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes(`Запись №${number}: HTTP`)
            ) {
                throw error;
            }

            if (attempt === 5) {
                throw error;
            }

            console.warn(
                `Ошибка записи №${number}, попытка ${attempt}/5:`,
                error instanceof Error ? error.message : error,
            );
        }

        if (attempt < 5) {
            await sleep(1000 * 2 ** (attempt - 1));
        }
    }

    throw new Error(`Не удалось получить запись №${number}`);
}

async function main() {
    const token = await login();

    const batches = [];

    for (let i = 0; i < persons.length; i += BATCH_SIZE) {
        batches.push({
            number: Math.floor(i / BATCH_SIZE),
            entries: persons.slice(i, i + BATCH_SIZE),
        });
    }

    let completed = 0;
    let downloaded = 0;
    let failed = false;
    let nextBatch = 0;

    // Уже сохранённые пакеты пропускаем.
    const existing = new Set(
        readdirSync(OUTPUT_DIR)
            .filter((name) => /^chunk-\d+\.json$/.test(name)),
    );

    completed = existing.size;

    console.log(`Всего записей: ${persons.length}`);
    console.log(`Пакетов: ${batches.length}`);
    console.log(`Уже сохранено пакетов: ${completed}`);
    console.log(`Параллельных работников: ${WORKERS}`);

    async function worker() {
        while (!failed) {
            const batchIndex = nextBatch++;

            if (batchIndex >= batches.length) return;

            const batch = batches[batchIndex];
            const filename = `chunk-${String(batch.number).padStart(4, '0')}.json`;
            const outputPath = join(OUTPUT_DIR, filename);

            if (existing.has(filename)) continue;

            try {
                const records = [];

                for (const entry of batch.entries) {
                    const number = Number(entry[0]);
                    records.push(await fetchPerson(number, token));
                    downloaded++;
                }

                // Временный файл предотвращает появление частично записанного JSON.
                const temporaryPath = `${outputPath}.tmp`;

                writeFileSync(
                    temporaryPath,
                    JSON.stringify(records),
                    'utf8',
                );

                renameSync(temporaryPath, outputPath);

                completed++;

                console.log(
                    `Пакет ${batch.number + 1}/${batches.length} готов. ` +
                    `Записей загружено в этом запуске: ${downloaded}. ` +
                    `Готовых пакетов: ${completed}/${batches.length}`,
                );
            } catch (error) {
                failed = true;

                console.error(
                    `Ошибка в пакете ${batch.number + 1}:`,
                    error instanceof Error ? error.message : error,
                );

                console.error(
                    'Исправь проблему и запусти скрипт повторно. ' +
                    'Уже сохранённые пакеты будут пропущены.',
                );
            }
        }
    }

    await Promise.all(
        Array.from({ length: WORKERS }, () => worker()),
    );

    if (failed) {
        process.exitCode = 1;
        return;
    }

    console.log('Загрузка завершена.');
    console.log(`Всего готовых пакетов: ${completed}/${batches.length}`);
    console.log(`Данные сохранены в: ${OUTPUT_DIR}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
