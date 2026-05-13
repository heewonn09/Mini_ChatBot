import { Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function ReminderCard({ notice, hour, minute, onChangeHour, onChangeMinute, onEnable, onDisable }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>데일리 리마인더</Text>
      <Text style={styles.desc}>원하는 시간에 기록 알림을 받을 수 있어요.</Text>
      <View style={styles.row}>
        <TextInput style={styles.input} keyboardType="numeric" value={String(hour)} onChangeText={onChangeHour} placeholder="시" />
        <Text style={styles.colon}>:</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={String(minute)} onChangeText={onChangeMinute} placeholder="분" />
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.actions}>
        <Button title="알림 켜기" onPress={onEnable} />
        <Button title="알림 끄기" onPress={onDisable} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 8 },
  title: { fontSize: 16, fontWeight: "600" },
  desc: { color: "#475569" },
  notice: { color: "#0369a1" },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 70, textAlign: "center" },
  colon: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
});
