/** Same customer-facing password rules as registration. */
export function validateRegistrationPassword(
  password: string,
  confirmPassword?: string
): string | null {
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return 'Passwords do not match';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return null;
}
