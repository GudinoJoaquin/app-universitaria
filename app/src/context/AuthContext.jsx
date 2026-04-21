//imports necesarios y creacion de del Contexto
import { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/authService";

//se crea el contenedor de datos compartidos
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  //estado global del usuario
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay sesión guardada al iniciar
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Verificar si el token sigue válido
        try {
          await authService.getProfile();
        } catch (error) {
          // Token inválido, cerrar sesión
          await logout();
        }
      }
    } catch (error) {
      console.log("Error checking stored auth:", error);
    } finally {
      setLoading(false);
    }
  };

  //funcion del login
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password);

      //guarda tanto el usuario como el token en el estado
      setUser(response.user);
      setToken(response.token);

      await AsyncStorage.setItem("token", response.token);
      await AsyncStorage.setItem("user", JSON.stringify(response.user));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Error en el login",
      };
    } finally {
      setLoading(false);
    }
  };

  //funcion del cierre de sesion
  const logout = async () => {
    //limpia el estado de usuario y token y se borra la persistencia
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  };
  //devuelve toda la info
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
