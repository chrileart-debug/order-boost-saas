/**
 * Checks if an establishment is currently open based on:
 * 1. Manual is_open toggle
 * 2. Operating hours schedule for current day/time
 */

export interface DaySchedule {
  open: string;   // "HH:mm"
  close: string;  // "HH:mm"
  is_closed: boolean;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const dayKeys: Record<number, keyof OperatingHours> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const dayLabels: Record<keyof OperatingHours, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

export interface StoreStatusResult {
  isOpen: boolean;
  reason: "manual_closed" | "schedule_closed" | "open";
  message: string;
  todaySchedule: DaySchedule | null;
}

export function checkStoreStatus(establishment: any): StoreStatusResult {
  // Manual toggle check
  if (!establishment.is_open) {
    return {
      isOpen: false,
      reason: "manual_closed",
      message: "Loja fechada no momento.",
      todaySchedule: null,
    };
  }

  const hours = establishment.operating_hours as OperatingHours | null;
  if (!hours) {
    // No schedule configured — rely only on manual toggle
    return { isOpen: true, reason: "open", message: "", todaySchedule: null };
  }

  const now = new Date();
  const dayKey = dayKeys[now.getDay()];
  const schedule = hours[dayKey];

  if (!schedule || schedule.is_closed) {
    // Find next open day
    const nextOpen = getNextOpenDay(hours, now.getDay());
    return {
      isOpen: false,
      reason: "schedule_closed",
      message: nextOpen
        ? `Fechado hoje. Abre ${nextOpen.label} às ${nextOpen.open}.`
        : "Loja fechada no momento.",
      todaySchedule: schedule || null,
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = schedule.open.split(":").map(Number);
  const [closeH, closeM] = schedule.close.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  if (currentMinutes < openMin) {
    return {
      isOpen: false,
      reason: "schedule_closed",
      message: `Abre hoje às ${schedule.open}.`,
      todaySchedule: schedule,
    };
  }

  if (currentMinutes >= closeMin) {
    const nextOpen = getNextOpenDay(hours, now.getDay());
    return {
      isOpen: false,
      reason: "schedule_closed",
      message: nextOpen
        ? `Fechado. Abre ${nextOpen.label} às ${nextOpen.open}.`
        : "Loja fechada no momento.",
      todaySchedule: schedule,
    };
  }

  return { isOpen: true, reason: "open", message: "", todaySchedule: schedule };
}

function getNextOpenDay(
  hours: OperatingHours,
  currentDayIndex: number
): { label: string; open: string } | null {
  const orderedKeys: (keyof OperatingHours)[] = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
  ];

  for (let offset = 1; offset <= 7; offset++) {
    const idx = (currentDayIndex + offset) % 7;
    const key = orderedKeys[idx];
    const schedule = hours[key];
    if (schedule && !schedule.is_closed) {
      const label = offset === 1 ? "amanhã" : dayLabels[key];
      return { label, open: schedule.open };
    }
  }
  return null;
}

export { dayLabels };
export const orderedDays: (keyof OperatingHours)[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];
