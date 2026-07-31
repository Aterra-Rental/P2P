import { API_URL } from "../lib/api"

export const getWallet = async () => {
    const userId = localStorage.getItem("user_id");

    const response = await fetch(`${API_URL}/wallet/${userId}`);

    if (!response.ok) {
        throw new Error("Failed to fetch wallet");
    }

    return await response.json();
};