/**
 * Этот хук нужен для того, чтобы в вебе не было мигания приложения,
 * данные берутся из конекста color-scheme, который берет данные из системной темы.
 */

export { useColorSchemeValue as useColorScheme } from '@/context/color-scheme';
