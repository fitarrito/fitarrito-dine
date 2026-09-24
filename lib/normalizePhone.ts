export function normalizeIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("91") && digits.length >= 12) {
    return `+${digits.slice(0, 12)}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return phone.trim().startsWith("+") ? phone.trim() : `+${digits}`;
}

export function isValidIndianMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return /^91[6-9]\d{9}$/.test(digits);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return /^0[6-9]\d{9}$/.test(digits);
  }

  return false;
}
