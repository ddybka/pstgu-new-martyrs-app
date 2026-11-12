import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { readStored, writeStored } from '@/utils/storage';

/**
 * Как показывать фотографию в подробной карточке списка:
 *
 * - `large` — большой снимок сверху, как на главной;
 * - `compact` — маленькая миниатюра справа от имени, как в выдаче поиска.
 */
export type PhotoLayout = 'large' | 'compact';

export const PHOTO_LAYOUTS: { value: PhotoLayout; label: string }[] = [
    { value: 'large', label: 'Крупно' },
    { value: 'compact', label: 'Компактно' },
];

const DEFAULT_LAYOUT: PhotoLayout = 'large';
const STORAGE_KEY = 'settings.photo-layout';

type PhotoLayoutContextType = {
    layout: PhotoLayout;
    setLayout: (layout: PhotoLayout) => void;
};

const PhotoLayoutContext = createContext<PhotoLayoutContextType>({
    layout: DEFAULT_LAYOUT,
    setLayout: () => { },
});

function isPhotoLayout(value: unknown): value is PhotoLayout {
    return value === 'large' || value === 'compact';
}

export function PhotoLayoutProvider({ children }: { children: ReactNode }) {
    const [layout, setLayoutState] = useState<PhotoLayout>(DEFAULT_LAYOUT);
    // Выбор, сделанный до того, как хранилище ответило, важнее сохранённого.
    const chosen = useRef(false);

    useEffect(() => {
        let cancelled = false;

        readStored(STORAGE_KEY).then((stored) => {
            if (!cancelled && !chosen.current && isPhotoLayout(stored)) setLayoutState(stored);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const setLayout = (next: PhotoLayout) => {
        chosen.current = true;
        setLayoutState(next);
        void writeStored(STORAGE_KEY, next);
    };

    return <PhotoLayoutContext value={{ layout, setLayout }}>{children}</PhotoLayoutContext>;
}

export function usePhotoLayout() {
    return useContext(PhotoLayoutContext);
}
