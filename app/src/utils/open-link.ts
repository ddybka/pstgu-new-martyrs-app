import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

/**
 * Внешняя ссылка: на телефоне — встроенный браузер поверх приложения, чтобы
 * из него было легко вернуться. Веб-вариант — в `open-link.web.ts`: там
 * новая вкладка, а expo-web-browser в веб-сборку не попадает вовсе.
 */
export function openLink(href: string) {
    void openBrowserAsync(href, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
}
