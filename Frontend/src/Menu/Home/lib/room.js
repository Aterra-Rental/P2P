import { API_URL } from "../../../lib/api";

const getHeaders = () => ({
    "Content-Type": "application/json",
});


const getAuthenticatedHeaders = () => {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error(
            "Your login session is missing. Please log in again."
        );
    }

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};
export const checkUser = async (userId) => {
    const response = await fetch(`${API_URL}/check-user/${userId}`, {
        headers: getAuthenticatedHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Backend Error:", data);
        throw new Error(data.message || "Unknown server error");
    }

    return data;
};
export const createRoom = async (roomData) => {
    const response = await fetch(`${API_URL}/rooms/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(roomData),
    });

    const data = await response.json();

    if (!response.ok) {
    console.error("Backend Error:", data);

    throw new Error(
        data.message ||
        data.error ||
        "Failed to create room"
    );
}
    return data;
};




export const getRooms = async (userId) => {
    const response = await fetch(
        `${API_URL}/rooms/?user_id=${userId}`,
        {
            headers: getHeaders(),
        }
    );
     const data = await response.json();


    return data;
};
export const getInvitations = async (userId) => {
    const response = await fetch(
        `${API_URL}/rooms/invitations/${userId}`,
        {
            headers: getAuthenticatedHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Failed to load invitations."
        );
    }

    return data;
};
export const getRoom = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/rooms/${roomCode}/`,
        {
            headers: getHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Backend Error:", data);
        throw new Error(data.message || "Failed to fetch room.");
    }

    return data;
};
export const acceptInvitation = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/rooms/${roomCode}/accept`,
        {
            method: "POST",
            headers: getAuthenticatedHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Failed to accept invitation"
        );
    }

    return data;
};
export const rejectInvitation = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/rooms/${roomCode}/reject`,
        {
            method: "POST",
            headers: getAuthenticatedHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Failed to reject invitation"
        );
    }

    return data;
};
export const updateRoom = async (roomCode, updates) => {
    const response = await fetch(
        `${API_URL}/rooms/${roomCode}/`,
        {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(updates),
        }
    );

    return await response.json();
};
export const deleteRoom = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/rooms/${roomCode}/`,
        {
            method: "DELETE",
            headers: getAuthenticatedHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Failed to delete room"
        );
    }

    return data;
};
export const reinviteRoom = async (roomCode, userId) => {
    const response = await fetch(
        `${API_URL}/rooms/${roomCode}/reinvite`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: userId,
            }),
        }
    );

    return await response.json();
};

export const remindPartner = async (roomCode) => {
    const response = await fetch(
        `${API_URL}/rooms/${roomCode}/remind`,
        {
            method: "POST",
            headers: getAuthenticatedHeaders(),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message || "Failed to send reminder."
        );

        error.remainingSeconds =
            data.remaining_seconds || 0;

        throw error;
    }

    return data;
};
export const markRoomRemindersRead = async (roomCode, userId) => {

    const response = await fetch(
        `${API_URL}/rooms/${roomCode}/reminders/read`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: userId
            })
        }
    );

    return response.json();
};