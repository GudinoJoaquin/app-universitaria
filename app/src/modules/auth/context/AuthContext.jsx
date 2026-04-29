import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "../../shared/services/supabase";
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const redirectTo = Linking.createURL("/");

  // ─── Helper: cargar perfil + estados del usuario ──────────────────────────
  const fetchProfileAndSetUser = async (authUser) => {
    console.log("👤 [AuthContext] fetchProfileAndSetUser INIT:", authUser?.id);
    if (!authUser) { setUser(null); return; }

    // Pausa para evitar Token Lock Deadlock de supabase-js
    await new Promise(r => setTimeout(r, 500));

    try {
      // Cargar perfil
      const fetchPromise = supabase
        .from("profiles")
        .select("id, name, email, role, avatar_url")
        .eq("id", authUser.id)
        .single();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout al obtener perfil")), 5000)
      );

      const { data: profileData, error: profileError } = await Promise.race([fetchPromise, timeoutPromise]);
      console.log("👤 [AuthContext] Profile error:", profileError?.message ?? "Ninguno");

      if (profileData && !profileError) {
        // Cargar estados del usuario desde user_states
        const { data: userStatesData } = await supabase
          .from("user_states")
          .select("state_id, states(id, name, color, is_default)")
          .eq("user_id", authUser.id);

        let states = userStatesData?.map(us => us.states).filter(Boolean) ?? [];

        // Si no tiene estados, asignar el default
        if (states.length === 0) {
          console.warn("⚠️ [AuthContext] Sin estados. Asignando estado default...");
          const { data: defaultState } = await supabase
            .from("states")
            .select("id, name, color, is_default")
            .eq("is_default", true)
            .maybeSingle();

          if (defaultState) {
            await supabase
              .from("user_states")
              .insert({ user_id: authUser.id, state_id: defaultState.id })
              .then(() => {});
            states = [defaultState];
            console.log("✅ [AuthContext] Estado default asignado:", defaultState.name);
          }
        }

        const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        setUser({
          ...authUser,
          ...profileData,
          avatar_url: profileData.avatar_url || googleAvatar || null,
          states, // array de estados
        });
        console.log("👤 [AuthContext] User cargado. Role:", profileData.role, "| States:", states.map(s => s.name));
      } else {
        // Sin perfil en DB — usar datos de authUser
        const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email;
        setUser({ ...authUser, name: googleName, avatar_url: googleAvatar || null, states: [] });
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
      const googleAvatar = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;
      const googleName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email;
      setUser({ ...authUser, name: googleName, avatar_url: googleAvatar || null, states: [] });
    }
    console.log("👤 [AuthContext] fetchProfileAndSetUser DONE.");
  };

  // ─── Helper: crear perfil + asignar estado default ────────────────────────
  const createProfileWithDefaultState = async (userObj, extraData = {}) => {
    const googleAvatar = userObj.user_metadata?.avatar_url || userObj.user_metadata?.picture;

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userObj.id)
      .single();

    if (!existing) {
      // Crear perfil
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userObj.id,
        name: extraData.name || userObj.user_metadata?.full_name || userObj.email,
        email: userObj.email,
        avatar_url: extraData.avatar_url || googleAvatar || null,
        role: "User",
      });
      if (profileError) { console.error("Error creando perfil:", profileError); return; }

      // Asignar estado default en user_states
      const { data: defaultState } = await supabase
        .from("states")
        .select("id")
        .eq("is_default", true)
        .maybeSingle();

      if (defaultState) {
        await supabase.from("user_states").insert({ user_id: userObj.id, state_id: defaultState.id });
      }
    }
  };

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { setLoading(false); return; }
        setSession(session);
        await fetchProfileAndSetUser(session.user);
      } catch (err) {
        console.error("Error en initializeAuth:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Supabase Auth Event:", event);
      setSession(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProfileAndSetUser(session.user);
    } else {
      setUser(null);
    }
  }, [session?.access_token]);

  // ─── Deep Link handler (Google OAuth) ─────────────────────────────────────
  useEffect(() => {
    const handleDeepLink = async (event) => {
      console.log("🔗 [AuthContext] Deep link:", event.url);
      try {
        setLoading(true);
        const { params, errorCode } = QueryParams.getQueryParams(event.url);
        if (errorCode) { setLoading(false); return; }

        let sessionData = null;
        if (params?.code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
          sessionData = data;
        } else if (params?.access_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
          sessionData = data;
        } else {
          setLoading(false);
          return;
        }

        if (sessionData?.session?.user) {
          await createProfileWithDefaultState(sessionData.session.user);
        }
      } catch (error) {
        console.error("❌ Error en deep link:", error);
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

  // ─── updateUserProfileLocally ──────────────────────────────────────────────
  const updateUserProfileLocally = (updates) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updates,
        user_metadata: {
          ...prev.user_metadata,
          ...(updates.has_completed_setup !== undefined
            ? { has_completed_setup: updates.has_completed_setup }
            : {}),
        },
      };
    });
  };

  // ─── Auth actions ──────────────────────────────────────────────────────────
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
        options: { data: { full_name: name } },
      });
      if (error) throw error;

      if (data.user) {
        // Crear perfil
        await supabase.from("profiles").upsert({
          id: data.user.id,
          name,
          email,
          role: "User",
        });

        // Asignar estado default
        const { data: defaultState } = await supabase
          .from("states")
          .select("id")
          .eq("is_default", true)
          .maybeSingle();

        if (defaultState) {
          await supabase.from("user_states").insert({
            user_id: data.user.id,
            state_id: defaultState.id,
          }).then(() => {});
        }
      }
      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      if (data?.url) await Linking.openURL(data.url);
      return { success: true };
    } catch (error) {
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

  // ─── Helpers de permisos (acceso rápido en pantallas) ─────────────────────
  const isAdmin = () => user?.role === "Admin";
  const isHelper = () => user?.role === "Helper";
  const isOrganizer = () => user?.role === "Organizer";
  const canManageStates = () => ["Admin", "Helper", "Organizer"].includes(user?.role);
  const canManageAllEvents = () => ["Admin", "Helper", "Organizer"].includes(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        updateUserProfileLocally,
        isAdmin,
        isHelper,
        isOrganizer,
        canManageStates,
        canManageAllEvents,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


