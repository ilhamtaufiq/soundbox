import * as SecureStore from 'expo-secure-store';

// Token disimpan di penyimpanan terenkripsi perangkat
const KEY = 'admin_token';

export function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export function setToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(KEY, token);
}

export function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(KEY);
}
