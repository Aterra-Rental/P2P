import { API_URL } from "../lib/api";

export const getDashboard = async () => {
    const userId = localStorage.getItem("user_id");

    const res = await fetch(`${API_URL}/dashboard/${userId}`);

    if (!res.ok) {
        throw new Error("Unable to load dashboard");
    }

    return await res.json();    
};

export const getSignupsByMonth = async () => {
    const res = await fetch(`${API_URL}/admin/dashboard/signups-by-month`);

    if (!res.ok) {
        throw new Error("Unable to load signups chart");
    }

    return await res.json();
};