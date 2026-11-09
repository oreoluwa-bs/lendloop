// Loan dates are plain calendar days ("YYYY-MM-DD") with no time or zone.
// "Today" is evaluated in one place so the server validation, the overdue
// check, and the client's date picker all agree on where the day boundary is.
// Set this to your community's IANA zone (e.g. "America/Los_Angeles").
export const APP_TIMEZONE = "UTC"

/** Today as a "YYYY-MM-DD" calendar day in APP_TIMEZONE. */
export function today(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")}`
}
