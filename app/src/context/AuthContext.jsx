import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "../services/supabase";
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

// Requerido para que el navegador se cierre correctamente después del login
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Revertimos a la misma configuración del otro proyecto
  const redirectTo = Linking.createURL("/");

  const fetchProfileAndSetUser = async (authUser) => {
    console.log("👤 [AuthContext] fetchProfileAndSetUser INIT:", authUser?.id);
    if (!authUser) {
      console.log("👤 [AuthContext] authUser is null, setting user to null");
      setUser(null);
      return;
    }
    // Pausa para evitar el Token Lock Deadlock de supabase-js
    await new Promise(r => setTimeout(r, 500));

    try {
      console.log("👤 [AuthContext] Ejecutando query a profiles...");
      // Timeout para evitar congelamiento de la app
      // Usamos limit(1) en lugar de single() por si la DB tiene filas duplicadas accidentalmente
      const fetchPromise = supabase.from("profiles").select("*").eq("id", authUser.id).limit(1);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout al obtener perfil")), 4000));
      
      const { data: responseData, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log("👤 [AuthContext] Query finalizada. Error:", error?.message || "Ninguno");

      const profileData = responseData && responseData.length > 0 ? responseData[0] : null;

      if (profileData) {
        // Si no tiene avatar_url en profiles, usamos el de Google
        const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        setUser({ 
          ...authUser, 
          ...profileData,
          avatar_url: profileData.avatar_url || googleAvatar || null
        });
      } else {
        const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email;
        setUser({
          ...authUser,
          name: googleName,
          avatar_url: googleAvatar || null
        });
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
      const googleAvatar = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;
      const googleName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email;
      setUser({
        ...authUser,
        name: googleName,
        avatar_url: googleAvatar || null
      });
    }
    console.log("👤 [AuthContext] fetchProfileAndSetUser DONE. User state updated.");
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          // No hay sesión local válida, no hacemos nada extra
          setLoading(false);
          return;
        }

        console.log("✅ [AuthContext] Sesión local encontrada y válida en caché.");
        setSession(session);
        await fetchProfileAndSetUser(session.user);
      } catch (err) {
        console.error("Error inesperado en initializeAuth:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Escuchar cambios en la sesión de Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Supabase Auth Event:", event);
        setSession(session);
        // NO llamamos a fetchProfileAndSetUser aquí directamente.
        // Lo dejamos al useEffect que vigila 'session' para evitar deadlocks de red en Supabase.
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Efecto separado para reaccionar a los cambios de sesión
  useEffect(() => {
    if (session?.user) {
      fetchProfileAndSetUser(session.user);
    } else {
      setUser(null);
    }
  }, [session?.access_token]); // Dependencia segura que cambia solo cuando el token cambia

  const updateUserProfileLocally = (updates) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updates,
        user_metadata: {
          ...prev.user_metadata,
          ...(updates.has_completed_setup !== undefined ? { has_completed_setup: updates.has_completed_setup } : {})
        }
      };
    });
  };
  useEffect(() => {
    const handleDeepLink = async (event) => {
      console.log("🔗 [AuthContext] Deep link capturado:", event.url);
      try {
        setLoading(true);
        const { params, errorCode } = QueryParams.getQueryParams(event.url);
        
        if (errorCode) {
          console.error("❌ [AuthContext] Error en la URL:", errorCode);
          setLoading(false);
          return;
        }

        let sessionData = null;

        // Si viene un código PKCE (flujo más seguro por defecto en Supabase)
        if (params?.code) {
          console.log("🔄 [AuthContext] Intercambiando código PKCE por sesión...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
          sessionData = data;
        } 
        // Si viene el token directamente (flujo implícito antiguo)
        else if (params?.access_token) {
          console.log("🔄 [AuthContext] Estableciendo sesión con access_token.");
          const { data, error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
          sessionData = data;
        } else {
          console.log("⚠️ [AuthContext] No se encontró code ni access_token en la URL.");
          setLoading(false);
          return;
        }

        // Si obtuvimos la sesión exitosamente, guardamos el perfil inicial
        if (sessionData?.session?.user) {
          const userObj = sessionData.session.user;
          const googleAvatar = userObj.user_metadata?.avatar_url || userObj.user_metadata?.picture;
          
          // Primero comprobamos si ya existe
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .eq('id', userObj.id)
            .single();

          // Solo insertamos si no existe, o actualizamos si le faltan datos básicos
          if (!existingProfile) {
            await supabase
              .from('profiles')
              .insert({ 
                id: userObj.id, 
                name: userObj.user_metadata?.full_name || userObj.email,
                email: userObj.email,
                avatar_url: googleAvatar || null,
                role: 'student' 
              });
          }
        }
      } catch (error) {
        console.error("❌ [AuthContext] Error procesando deep link:", error);
      } finally {
        setLoading(false);
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) handleDeepLink({ url: initialUrl });
    })();

    return () => subscription.remove();
  }, []);

  const createSessionFromUrl = async (url) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) throw new Error(errorCode);
    const { access_token, refresh_token } = params;

    if (!access_token) return null;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) throw error;
    
    // Guardamos en la tabla perfiles si es un login exitoso
    if (data.session?.user) {
      const userObj = data.session.user;
      const googleAvatar = userObj.user_metadata?.avatar_url || userObj.user_metadata?.picture;

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userObj.id)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            id: userObj.id, 
            name: userObj.user_metadata?.full_name || userObj.email,
            email: userObj.email,
            avatar_url: googleAvatar || null,
            role: 'student' 
          });
          
        if (profileError) console.error("Error guardando perfil:", profileError);
      }
    }

    return data.session;
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      console.log("🚀 [AuthContext] Iniciando Google OAuth con Supabase...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        console.log("📲 [AuthContext] Abriendo URL de OAuth de Supabase:", data.url);
        await Linking.openURL(data.url);
      }
      
      return { success: true };
    } catch (error) {
      console.error("❌ [AuthContext] Error en login con Google:", error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: name } }
      });
      if (error) throw error;
      
      if (data.user) {
        // Guardamos el perfil
        await supabase.from('profiles').upsert({ 
          id: data.user.id, 
          name: name,
          email: email,
          role: 'student' 
        });
      }
      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        register,
        loginWithGoogle,
        logout,
        loading,
        updateUserProfileLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
