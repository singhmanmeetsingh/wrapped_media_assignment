export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email address';
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone || !phone.trim()) {
    return 'Phone number is required';
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) {
    return 'Phone number must have at least 7 digits';
  }
  if (digits.length > 15) {
    return 'Phone number must have 15 digits or fewer';
  }
  return null;
}

export function validateYear(year: string): string | null {
  const num = parseInt(year, 10);
  if (isNaN(num)) {
    return 'Year is required';
  }
  if (num < 1900 || num > 2027) {
    return 'Year must be between 1900 and 2027';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}
