import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import OverviewScreen from "./src/screens/OverviewScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, isHydrating } = useAuth();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Screen name="Overview" component={OverviewScreen} options={{ title: "Mindflow" }} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: "로그인" }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "회원가입" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
