/**
 * Подготовить карту заранее, пока пользователь на первом экране: точки
 * разобраны, стиль подложки скачан (см. корневой `_layout`). Модули карты
 * подключаются динамически — первому экрану они не нужны.
 *
 * В вебе — `preload-map.web.ts`, пустой: там это лишние мегабайты для тех,
 * кто до карты не дойдёт, и ссылка на модули карты из общего кода страниц.
 */
export function preloadMap(isDark: boolean) {
    void import('@/hooks/use-map-points').then(({ preloadMapPoints }) => preloadMapPoints());
    void import('@/components/map/map-style').then(({ preloadMapStyle }) => preloadMapStyle(isDark));
}
