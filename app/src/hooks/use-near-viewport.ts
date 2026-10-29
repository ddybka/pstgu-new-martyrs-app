import type { RefCallback } from 'react';

/**
 * Близко ли блок к экрану — чтобы не грузить тяжёлое (точки карты) раньше,
 * чем до него докрутят. На телефоне грузить заранее не дорого: точки лежат в
 * приложении, поэтому здесь — всегда «да». Веб-вариант — в `.web.ts`.
 */
export function useNearViewport(): [RefCallback<unknown>, boolean] {
    return [() => { }, true];
}
