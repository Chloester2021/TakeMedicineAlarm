/** Use the device locale for all alarm text and speech. */
export function systemLocale() {
  try { return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US'; }
  catch { return 'en-US'; }
}
export function resolveLanguage() { return systemLocale(); }
export function speechLanguage() { return systemLocale(); }
