import { useCallback, useState, type RefCallback } from 'react';

/** Сколько пикселей до экрана — уже «близко»: пока докрутят, успеет загрузиться. */
const MARGIN_PX = 800;

/**
 * Близко ли блок к экрану (см. `use-near-viewport.ts`). В вебе тяжёлое —
 * четыреста килобайт точек карты — качается только когда до блока осталось
 * меньше MARGIN_PX, а не вместе со страницей. Раз приблизившись, блок так и
 * считается близким.
 */
export function useNearViewport(): [RefCallback<unknown>, boolean] {
    const [near, setNear] = useState(false);

    const ref = useCallback((node: unknown) => {
        if (!(node instanceof Element)) return;
        if (typeof IntersectionObserver === 'undefined') {
            setNear(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setNear(true);
                    observer.disconnect();
                }
            },
            { rootMargin: `${MARGIN_PX}px 0px` }
        );
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return [ref, near];
}
