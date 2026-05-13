export function parseReminderTime(hourInput, minuteInput) {
  const hour = Number(hourInput);
  const minute = Number(minuteInput);
  const isValid = Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
  return { isValid, hour, minute };
}

export function formatReminderTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
