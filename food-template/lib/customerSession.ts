export const CUSTOMER_SESSION_CHANGED = "culinara:customer-session-changed";

export function notifyCustomerSessionChanged() {
  window.dispatchEvent(new Event(CUSTOMER_SESSION_CHANGED));
}
