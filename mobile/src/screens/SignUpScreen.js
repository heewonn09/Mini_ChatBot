import { useState } from "react";
import { Button, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function SignUpScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register, isLoading, error } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>회원가입</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" />
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="password" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={isLoading ? "가입 중..." : "가입하고 시작"}
          onPress={() => register({ username, email, password })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "#f8fafc" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 10 },
  error: { color: "#dc2626" },
});
