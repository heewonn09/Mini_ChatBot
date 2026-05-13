import { useState } from "react";
import { Button, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("demo@mindflow.app");
  const [password, setPassword] = useState("Passw0rd!");
  const { signIn, isLoading, error } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Mindflow Mobile</Text>
        <TextInput style={styles.input} value={usernameOrEmail} onChangeText={setUsernameOrEmail} autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isLoading ? "로그인 중..." : "로그인"} onPress={() => signIn(usernameOrEmail, password)} />
        <Button title="회원가입" onPress={() => navigation.navigate("SignUp")} />
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
