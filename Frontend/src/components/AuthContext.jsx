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

export const AuthContext = createContext(null);

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
      const cachedPic = localStorage.getItem(`profile_picture_${userId}`);
      const profile = await getUserProfile();
      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const updatedUser = profile
        ? {
            ...storedUser,
            ...profile,
            profile_picture: profile.profile_picture || profile.url || profile.path || cachedPic || storedUser.profile_picture,
            user_id: Number(userId),
            profile_completed: true,
          }
        : {
            ...storedUser,
            profile_picture: cachedPic || storedUser.profile_picture,
            user_id: Number(userId),
            profile_completed: false,
          };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error("Failed to refresh user:", error);

      const cachedPic = localStorage.getItem(`profile_picture_${userId}`);
      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const fallbackUser = {
        ...storedUser,
        profile_picture: cachedPic || storedUser.profile_picture,
        user_id: Number(userId),
        profile_completed: false,
      };

      setUser(fallbackUser);
      localStorage.setItem("user", JSON.stringify(fallbackUser));

      return fallbackUser;
    } finally {
      refreshInProgress.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

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

    if (socket.connected) {
      joinUserRoom();
    }

    socket.on("connect", joinUserRoom);

    return () => {
      socket.off("connect", joinUserRoom);
    };
  }, [refreshUser]);

  const logout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("email");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    // Note: We intentionally do NOT remove profile_picture_${userId} so it stays remembered when logging back in

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

export default AuthProvider;