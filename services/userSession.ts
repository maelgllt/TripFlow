import * as SecureStore from 'expo-secure-store';

const KEY = 'sessionUserId';

export async function rememberUser(userId: number) {
  await SecureStore.setItemAsync(KEY, String(userId));
}

export async function forgetUser() {
  await SecureStore.deleteItemAsync(KEY);
}

export async function getRememberedUserId(): Promise<number | null> {
  const userId = await SecureStore.getItemAsync(KEY);
  if (!userId) return null;
  const userIdNum = Number(userId);
  return Number.isFinite(userIdNum) ? userIdNum : null;
}
