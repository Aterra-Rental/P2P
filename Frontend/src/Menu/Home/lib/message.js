const API_URL = "http://127.0.0.1:8000/api";

const getHeaders = () => ({
    "Content-Type": "application/json",
});

export const getMessages = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/messages/${roomCode}`,
        {
            headers: getHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Backend Error:", data);
        throw new Error(
            data.message || data.error || "Failed to load messages."
        );
    }

    return data;
};

export const sendMessage = async (messageData) => {
    const response = await fetch(
        `${API_URL}/messages`,
        {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(messageData),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Backend Error:", data);
        throw new Error(
            data.message || data.error || "Failed to send message."
        );
    }

    return data;
};