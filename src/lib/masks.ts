/**
 * Applies Brazilian phone mask: (99) 99999-9999
 */
export const maskPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

/**
 * Strips non-digit characters for DB storage.
 */
export const unmaskPhone = (value: string): string => value.replace(/\D/g, "");

/**
 * Applies CEP mask: 00000-000
 */
export const maskCep = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};
