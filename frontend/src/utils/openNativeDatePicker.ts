/**
 * Focus a native date input and open the browser picker when supported.
 * Does not change the value. Safe when showPicker is missing or throws.
 */
export function openNativeDatePicker(input: HTMLInputElement | null | undefined): void {
  if (!input || input.disabled) return;
  input.focus();
  if (typeof input.showPicker !== 'function') return;
  try {
    input.showPicker();
  } catch {
    // NotAllowedError / unsupported context — keep focus so the keyboard and calendar icon still work.
  }
}
