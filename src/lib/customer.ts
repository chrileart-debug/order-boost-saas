const CUSTOMER_KEY = "eprato_customer";

export interface CustomerData {
  phone: string;
  name: string;
}

export function getCustomer(): CustomerData | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomer(data: CustomerData) {
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data));
}
