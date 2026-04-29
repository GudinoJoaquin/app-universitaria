import { AuthProvider } from "./src/modules/auth/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import Notification from "./src/modules/notifications/components/Notification";

export default function App() {
  return (
    <AuthProvider>
      <Notification />
      <AppNavigator />
    </AuthProvider>
  );
}
