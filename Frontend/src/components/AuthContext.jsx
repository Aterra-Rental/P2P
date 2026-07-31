import { createContext, useContext, useEffect, useState } from "react";
import { getUserProfile } from "../lib/profile";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        const userId = localStorage.getItem("user_id");

        if (!userId) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
    const profile = await getUserProfile();

    const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    if (profile) {
        setUser({
            ...storedUser,
            ...profile,
            user_id: Number(userId),
            profile_completed: true,
        });
    } else {
        setUser({
            ...storedUser,
            user_id: Number(userId),
            profile_completed: false,
        });
    }
} catch (error) {
    console.error("Failed to refresh user:", error);

    const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    setUser({
        ...storedUser,
        user_id: Number(userId),
        profile_completed: false,
    });
} finally {
    setLoading(false);
}
    };

    useEffect(() => {
        refreshUser();
    }, []);

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

export const useAuth = () => useContext(AuthContext);