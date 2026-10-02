import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const options: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export async function getSecureItem(key: string): Promise<string | null> {
    if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;

    try {
        return await SecureStore.getItemAsync(key, options);
    } catch {
        return null;
    }
}

export async function setSecureItem(key: string, value: string) {
    if (isWeb) {
        globalThis.localStorage?.setItem(key, value);
        return;
    }

    await SecureStore.setItemAsync(key, value, options);
}

export async function removeSecureItem(key: string) {
    if (isWeb) {
        globalThis.localStorage?.removeItem(key);
        return;
    }

    await SecureStore.deleteItemAsync(key, options);
}
