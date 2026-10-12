import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { clearToken, ensureToken } from '@/utils/api-fetch';

type LoginStatus = 'loading' | 'authenticated' | 'error';

type LoginContextType = {
    status: LoginStatus;
    error: Error | null;
    retry: () => Promise<void>;
};

const LoginContext = createContext<LoginContextType | null>(null);

/**
 * Токен авторизации хранится в хранилище, и его нужно подтягивать при старте
 * приложения. Если токена нет, экран авторизации покажет ошибку и кнопку «Повторить».
 */
export function LoginProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<LoginStatus>('loading');
    const [error, setError] = useState<Error | null>(null);

    const authenticate = useCallback(async () => {
        setStatus('loading');
        setError(null);

        try {
            await ensureToken();
            setStatus('authenticated');
        } catch (err) {
            console.error('Ошибка авторизации:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setStatus('error');
        }
    }, []);

    const retry = useCallback(async () => {
        await clearToken().catch(() => { });
        await authenticate();
    }, [authenticate]);

    useEffect(() => {
        authenticate();
    }, [authenticate]);

    return <LoginContext.Provider value={{ status, error, retry }}>{children}</LoginContext.Provider>;
}

export function useLogin() {
    const context = useContext(LoginContext);
    if (!context) throw new Error('useLogin должен использоваться внутри LoginProvider');
    return context;
}
