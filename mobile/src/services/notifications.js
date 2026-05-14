import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushPermission() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function scheduleDailyReminder(hour = 21, minute = 0) {
  const granted = await requestPushPermission();
  if (!granted) return { ok: false, reason: "permission_denied" };

  await Notifications.cancelAllScheduledNotificationsAsync();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Mindflow 리마인더",
      body: "오늘의 감정/행동 기록을 남겨볼까요?",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return { ok: true, id };
}

export async function cancelReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  return { ok: true };
}
