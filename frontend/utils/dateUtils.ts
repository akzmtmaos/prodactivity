/**
 * Utility functions for date handling in the frontend
 */

/**
 * Get today's date in local timezone as YYYY-MM-DD string
 * This ensures consistent date handling across the app
 */
export const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert a Date object to YYYY-MM-DD string in local timezone
 */
export const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get timezone offset in minutes for backend communication
 */
export const getTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
}; 