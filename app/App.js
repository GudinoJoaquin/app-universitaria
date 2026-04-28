import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import Notification from "./src/components/Notification";

export default function App() {
  return (
    <AuthProvider>
      <Notification />
      <AppNavigator />
    </AuthProvider>
  );
}
