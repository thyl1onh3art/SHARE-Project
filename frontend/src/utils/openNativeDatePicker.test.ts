import { openNativeDatePicker } from './openNativeDatePicker';

function makeDateInput(overrides: Partial<HTMLInputElement> = {}): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'date';
  input.value = '2026-09-28';
  Object.assign(input, overrides);
  document.body.appendChild(input);
  return input;
}

describe('openNativeDatePicker', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the input and calls showPicker when available', () => {
    const input = makeDateInput();
    const showPicker = jest.fn();
    input.showPicker = showPicker;

    openNativeDatePicker(input);

    expect(document.activeElement).toBe(input);
    expect(showPicker).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('2026-09-28');
  });

  it('focuses without throwing when showPicker is unavailable', () => {
    const input = makeDateInput();
    // jsdom typically has no showPicker
    expect(typeof input.showPicker).not.toBe('function');

    expect(() => openNativeDatePicker(input)).not.toThrow();
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('2026-09-28');
  });

  it('does not throw when showPicker rejects the call', () => {
    const input = makeDateInput();
    input.showPicker = jest.fn(() => {
      throw new Error('NotAllowedError');
    });

    expect(() => openNativeDatePicker(input)).not.toThrow();
    expect(document.activeElement).toBe(input);
  });

  it('does nothing for a disabled input', () => {
    const input = makeDateInput({ disabled: true });
    const showPicker = jest.fn();
    input.showPicker = showPicker;

    openNativeDatePicker(input);

    expect(showPicker).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(input);
  });
});
