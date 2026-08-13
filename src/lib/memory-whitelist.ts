// In-Memory Persistent Whitelist Cache across requests
export const inMemoryAuthorizedUsers = new Map<string, any>();

export function removeFromMemoryWhitelist(email: string) {
  inMemoryAuthorizedUsers.delete(email.toLowerCase().trim());
}
