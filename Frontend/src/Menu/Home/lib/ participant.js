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

    const data = await response.json();

    if (!response.ok) {
        console.error("Backend Error:", data);
        throw new Error(
            data.message || data.error || "Failed to select role."
        );
    }

    return data;
};



