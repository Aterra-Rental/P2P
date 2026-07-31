import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { getUserProfile } from "../lib/profile";
import { socket } from "../lib/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
    const refreshInProgress = useRef(false);
  const refreshUser = useCallback(async () => {
   
  if (refreshInProgress.current) {
    return null;
  }

  refreshInProgress.current = true;

  const userId = localStorage.getItem("user_id");

    if (!userId) {
  setUser(null);
  setLoading(false);
  refreshInProgress.current = false;
  return null;
}

    try {
      const profile = await getUserProfile();

      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const updatedUser = profile
        ? {
            ...storedUser,
            ...profile,
            user_id: Number(userId),
            profile_completed: true,
          }
        : {
            ...storedUser,
            user_id: Number(userId),
            profile_completed: false,
          };

      setUser(updatedUser);

      return updatedUser;
    } catch (error) {
      console.error("Failed to refresh user:", error);

      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const fallbackUser = {
        ...storedUser,
        user_id: Number(userId),
        profile_completed: false,
      };

      setUser(fallbackUser);

      return fallbackUser;
    } finally {
  refreshInProgress.current = false;
  setLoading(false);
}
  }, []);

  // Load the account only once when the application starts.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Listen globally for profile and verification changes.
  useEffect(() => {
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      return;
    }

    const joinUserRoom = () => {
      socket.emit("join_user", {
        user_id: userId,
      });
    };

   const handleUserUpdate = async (data) => {
      console.log("verification_updated received:", data);
  if (!data?.user_id) {
    return;
  }

  if (String(data.user_id) !== String(userId)) {
    return;
  }

  await refreshUser();
};

    if (socket.connected) {
      joinUserRoom();
    }

    socket.on("connect", joinUserRoom);
    // socket.on("profile_updated", handleUserUpdate);
    // socket.on("verification_updated", handleUserUpdate);

    return () => {
      socket.off("connect", joinUserRoom);
    //   socket.off("profile_updated", handleUserUpdate);
    //   socket.off("verification_updated", handleUserUpdate);
    };
  }, [refreshUser]);

  const logout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("email");
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};