import { useEffect, useState } from "react";
import { Button, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createBehavior, fetchOverview } from "../api/client";
import { enqueueBehavior, flushBehaviorQueue } from "../api/offlineQueue";
import { useAuth } from "../context/AuthContext";
import ReminderCard from "../components/ReminderCard";
import { cancelReminder, scheduleDailyReminder } from "../services/notifications";
import { getReminderTime, setReminderTime } from "../services/reminderPreferences";
import { formatReminderTime, parseReminderTime } from "../utils/reminderTime";

export default function OverviewScreen() {
  const { user, signOut } = useAuth();
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState("calm");
  const [notice, setNotice] = useState("");
  const [hourInput, setHourInput] = useState("21");
  const [minuteInput, setMinuteInput] = useState("0");

  const loadOverview = async () => {
    const overview = await fetchOverview(user.id);
    setData(overview);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const pref = await getReminderTime();
        setHourInput(String(pref.hour));
        setMinuteInput(String(pref.minute));
        const result = await flushBehaviorQueue();
        if (result.sent > 0) setNotice(`오프라인 기록 ${result.sent}건 동기화 완료`);
        await loadOverview();
      } catch {
        setNotice("네트워크 연결 후 자동 동기화됩니다.");
      }
    };
    if (user?.id) init();
  }, [user?.id]);


  const parsedTime = parseReminderTime(hourInput, minuteInput);

  const submitLog = async () => {
    if (!text.trim()) return;
    const payload = { text, emotion, intensity: 5 };
    try {
      await createBehavior(user.id, payload);
      setNotice("기록이 저장되었습니다.");
      setText("");
      await loadOverview();
    } catch {
      const count = await enqueueBehavior(user.id, payload);
      setNotice(`오프라인으로 임시 저장됨 (${count}건 대기)`);
      setText("");
    }
  };


  const enableReminder = async () => {
    if (!parsedTime.isValid) {
      setNotice("시간 형식이 올바르지 않습니다. (00:00 ~ 23:59)");
      return;
    }
    const result = await scheduleDailyReminder(parsedTime.hour, parsedTime.minute);
    if (result.ok) {
      await setReminderTime(parsedTime.hour, parsedTime.minute);
      setNotice(`매일 ${formatReminderTime(parsedTime.hour, parsedTime.minute)} 리마인더 설정 완료`);
    } else setNotice("알림 권한이 없어 설정하지 못했습니다.");
  };

  const disableReminder = async () => {
    await cancelReminder();
    setNotice("리마인더가 해제되었습니다.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>안녕하세요, {user?.username || user?.email}</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>행동 기록 추가</Text>
          <TextInput style={styles.input} placeholder="오늘의 기록" value={text} onChangeText={setText} />
          <TextInput style={styles.input} placeholder="emotion (e.g. calm)" value={emotion} onChangeText={setEmotion} />
          <Button title="저장" onPress={submitLog} />
        </View>

        <ReminderCard
          notice={notice}
          hour={hourInput}
          minute={minuteInput}
          onChangeHour={setHourInput}
          onChangeMinute={setMinuteInput}
          onEnable={enableReminder}
          onDisable={disableReminder}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>오늘의 요약</Text>
          <Text>{data ? JSON.stringify(data.stat_cards || [], null, 2) : "불러오는 중..."}</Text>
        </View>

        <Button title="대기열 동기화 재시도" onPress={async () => {
          const r = await flushBehaviorQueue();
          setNotice(`동기화 완료: ${r.sent}건, 남음: ${r.remaining}건`);
          await loadOverview();
        }} />
        <Button title="로그아웃" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  notice: { color: "#0369a1" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 10 },
});
