const API_URL = "http://127.0.0.1:8000/api";

const getHeaders = () => ({
    "Content-Type": "application/json",
});

export const generateQR = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/payment/${roomCode}/qr`,
        {
            method: "POST",
            headers: getHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to generate QR.");
    }

    return data;
};

export const verifyPayment = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/payment/${roomCode}/verify`,
        {
            method: "POST",
            headers: getHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || data.error || "Payment verification failed.");
    }

    return data;
};

export const releaseFunds = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/payment/${roomCode}/release`,
        {
            method: "POST",
            headers: getHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to release funds.");
    }

    return data;
};