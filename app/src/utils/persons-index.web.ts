import type { SearchHit } from '@/hooks/use-person-search';

/**
 * В вебе списка имён нет: без сети сайт не откроется, а два мегабайта в
 * бандле — заметная цена. Поиск без сети здесь просто показывает ошибку.
 */
export const offlineSearchAvailable = false;

export function searchOffline(_query: string): SearchHit[] {
    return [];
}
