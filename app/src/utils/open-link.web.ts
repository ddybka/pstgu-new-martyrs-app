/**
 * Внешняя ссылка в вебе — новая вкладка (см. `open-link.ts`). Не через
 * expo-web-browser: тот открывает маленькое окно посреди экрана (window.open
 * с размерами) и вдобавок весит лишнее в общем чанке каждой страницы.
 */
export function openLink(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer');
}
