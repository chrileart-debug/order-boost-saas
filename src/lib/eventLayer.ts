/**
 * Event Layer — centralises analytics events so future integrations
 * (Facebook Pixel, GA4, etc.) can be plugged in without touching components.
 *
 * Each event carries the establishment_id to avoid cross-store collisions.
 */

export type EventName =
  | "view_menu"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "complete_order";

interface EventPayload {
  establishment_id: string;
  [key: string]: unknown;
}

type EventHandler = (name: EventName, payload: EventPayload) => void;

const handlers: EventHandler[] = [];

/** Register a handler (e.g. Facebook Pixel adapter) */
export function registerEventHandler(handler: EventHandler) {
  handlers.push(handler);
}

/** Fire an analytics event */
export function trackEvent(name: EventName, payload: EventPayload) {
  if (import.meta.env.DEV) {
    console.log(`[EventLayer] ${name}`, payload);
  }

  handlers.forEach((h) => {
    try {
      h(name, payload);
    } catch (err) {
      console.error("[EventLayer] handler error", err);
    }
  });
}
