import { API_URL } from "../../../lib/api";


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


const readResponse = async (response) => {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed (${response.status}).`
    );
  }

  return data;
};


export const getMessages = async (roomCode) => {
  const response = await fetch(
    `${API_URL}/messages/${roomCode}`,
    {
      headers: getAuthenticatedHeaders(),
    }
  );

  return readResponse(response);
};


export const sendMessage = async (
  roomCode,
  message
) => {
  const response = await fetch(
    `${API_URL}/messages/${roomCode}`,
    {
      method: "POST",
      headers: getAuthenticatedHeaders(),
      body: JSON.stringify({ message }),
    }
  );

  return readResponse(response);
};