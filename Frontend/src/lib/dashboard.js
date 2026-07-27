const API_URL = "http://localhost:8000/api";

export const getDashboard = async () => {
    const userId = localStorage.getItem("user_id");

    const res = await fetch(`${API_URL}/dashboard/${userId}`);

    if (!res.ok) {
        throw new Error("Unable to load dashboard");
    }

    return await res.json();
};