import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_KEY = "mindflow_reminder_time";

export async function getReminderTime() {
  const raw = await AsyncStorage.getItem(REMINDER_KEY);
  if (!raw) return { hour: 21, minute: 0 };
  try {
    const parsed = JSON.parse(raw);
    const hour = Number(parsed.hour);
    const minute = Number(parsed.minute);
    if (Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return { hour, minute };
    }
  } catch {}
  return { hour: 21, minute: 0 };
}

export async function setReminderTime(hour, minute) {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify({ hour, minute }));
}
