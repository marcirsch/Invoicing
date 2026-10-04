/** Checks that an IPC sender is the app renderer or the configured local dev renderer. */
export function isTrustedSenderUrl(
  senderUrl: string,
  developmentUrl: string | undefined,
  packagedRendererUrl: string,
): boolean {
  if (developmentUrl) {
    try {
      return new URL(senderUrl).origin === new URL(developmentUrl).origin;
    } catch {
      return false;
    }
  }
  return senderUrl === packagedRendererUrl;
}
