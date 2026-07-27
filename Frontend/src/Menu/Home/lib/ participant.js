const API_URL = "http://127.0.0.1:8000/api";

const getHeaders = () => ({
    "Content-Type": "application/json",
});

export const selectRole = async (roomCode, userId, selectedRole) => {
    const response = await fetch(
        `${API_URL}/participant/select-role`,
        {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                room_code: roomCode,
                user_id: userId,
                selected_role: selectedRole,
            }),
        }
    );

    return await response.json();
};



export const generateQR = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/payment/${roomCode}/qr`,
        {
            method: "POST",
            headers: getHeaders(),
        }
    );

    return await response.json();
};

export const verifyPayment = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/payment/${roomCode}/verify`,
        {
            method: "POST",
            headers: getHeaders(),
        }
    );

    return await response.json();
};

export const releaseFunds = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/payment/${roomCode}/release`,
        {
            method: "POST",
            headers: getHeaders(),
        }
    );

    return await response.json();
};
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

    return await response.json();
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

    return await response.json();
};