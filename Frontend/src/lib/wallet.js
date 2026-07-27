const API_URL = "http://localhost:8000/api";

export const getWallet = async () => {
    const userId = localStorage.getItem("user_id");

    const response = await fetch(`${API_URL}/wallet/${userId}`);

    if (!response.ok) {
        throw new Error("Failed to fetch wallet");
    }

    return await response.json();
};