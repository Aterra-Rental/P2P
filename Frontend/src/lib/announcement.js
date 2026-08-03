import { API_URL } from "./api";

export const getAnnouncements = async () => {
    const res = await fetch(`${API_URL}/announcements`);

    if (!res.ok) {
        throw new Error("Unable to load announcements");
    }

    return await res.json();
};

export const createAnnouncement = async (title, message) => {
    const adminId = localStorage.getItem("user_id");

    const res = await fetch(`${API_URL}/admin/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, created_by: adminId }),
    });

    if (!res.ok) {
        throw new Error("Unable to post announcement");
    }

    return await res.json();
};