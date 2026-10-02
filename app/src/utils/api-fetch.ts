import { getSecureItem, removeSecureItem, setSecureItem } from './secure-cache';

export const API_URL = 'https://api.nmbook.ru/';

const API_LOGIN = 'mobile-app';
const API_PASSWORD = 'm0b1le0323';

const TOKEN_KEY = 'nmbook.accessToken';

type CachedToken = {
    token: string;
    expiresAt: number | null;
};

/**
 * Кол-во миллисек. до истечения срока действия токена.
 */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Сколько ждём ответа от сервера.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Паузы перед повторными попытками связи с сервером при сетевых ошибках.
 */
const RETRY_DELAYS_MS = [400, 1200];

/** Сервер ответил не так, как ожидалось. */
export class ApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/** Ошибки сети. */
export class NetworkError extends Error {
    readonly reason: 'offline' | 'timeout';

    constructor(message: string, reason: 'offline' | 'timeout', cause?: unknown) {
        super(message);
        this.name = 'NetworkError';
        this.reason = reason;
        this.cause = cause;
    }
}

export function describeError(error: unknown): string {
    if (error instanceof NetworkError) {
        return error.reason === 'timeout'
            ? 'Сервер не ответил вовремя. Проверьте подключение к интернету'
            : 'Нет связи с сервером. Проверьте подключение к интернету';
    }

    if (error instanceof ApiError) {
        if (error.status === 0) return error.message;
        if (error.status === 401 || error.status === 403) return 'Сервер базы данных не принял доступ приложения';
        if (error.status >= 500) return 'Сервер базы данных временно недоступен';
        return `Сервер базы данных ответил ошибкой ${error.status}`;
    }

    return 'Не удалось получить данные';
}

function readTokenExpiry(token: string) {
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;

        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const { exp } = JSON.parse(globalThis.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));

        return typeof exp === 'number' ? exp * 1000 : null;
    } catch {
        return null;
    }
}

/**
 * Разделение fetch на разные ошибки, чтобы отличать серверные ошибки и клиентские.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new NetworkError(`Сервер не ответил за ${REQUEST_TIMEOUT_MS / 1000} с`, 'timeout', error);
        }

        throw new NetworkError('Не удалось связаться с сервером', 'offline', error);
    } finally {
        clearTimeout(timer);
    }
}

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
            return await run();
        } catch (error) {
            if (!(error instanceof NetworkError)) throw error;

            lastError = error;

            const delay = RETRY_DELAYS_MS[attempt];
            if (delay === undefined) break;

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Токен в памяти процесса, чтобы не каждый раз не читать его из SecureStore.
 */
let memoryToken: CachedToken | null = null;

function isUsable(cached: CachedToken | null): cached is CachedToken {
    if (!cached) return false;
    if (cached.expiresAt === null) return true;

    return cached.expiresAt - EXPIRY_SKEW_MS > Date.now();
}

async function readCachedToken(): Promise<CachedToken | null> {
    if (memoryToken) return memoryToken;

    const raw = await getSecureItem(TOKEN_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.token !== 'string') return null;

        memoryToken = parsed as CachedToken;
        return memoryToken;
    } catch {
        return null;
    }
}

export async function getToken(): Promise<string | null> {
    const cached = await readCachedToken();
    return isUsable(cached) ? cached.token : null;
}

export async function clearToken() {
    memoryToken = null;
    await removeSecureItem(TOKEN_KEY).catch(() => { });
}

async function requestToken() {
    if (!API_LOGIN || !API_PASSWORD) {
        throw new ApiError('Приложение собрано без доступа к базе данных', 0);
    }

    const body = `username=${encodeURIComponent(API_LOGIN)}&password=${encodeURIComponent(API_PASSWORD)}`;

    const response = await withRetry(() =>
        fetchWithTimeout(`${API_URL}login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        })
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || typeof data?.access_token !== 'string') {
        throw new ApiError('Не удалось войти в базу данных', response.status);
    }

    const token: string = data.access_token;
    const cached: CachedToken = { token, expiresAt: readTokenExpiry(token) };

    memoryToken = cached;

    // Если SecureStore недоступен, то токен все равно сохранится в памяти процесса.
    await setSecureItem(TOKEN_KEY, JSON.stringify(cached)).catch((error) => {
        console.warn('Не удалось сохранить токен:', error);
    });

    return token;
}

let loginPromise: Promise<string> | null = null;

export function login(): Promise<string> {
    if (!loginPromise) {
        loginPromise = requestToken().finally(() => {
            loginPromise = null;
        });
    }

    return loginPromise;
}

export async function ensureToken() {
    return (await getToken()) ?? (await login());
}

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
    const send = async (token: string) =>
        withRetry(() =>
            fetchWithTimeout(`${API_URL}${url.replace(/^\//, '')}`, {
                ...options,
                headers: {
                    Accept: 'application/json',
                    ...options.headers,
                    Authorization: `Bearer ${token}`,
                },
            })
        );

    let response = await send(await ensureToken());

    if (response.status === 401 || response.status === 403) {
        await clearToken();
        response = await send(await login());
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError('Ошибка при получении данных', response.status);
    }

    return data as T;
}
