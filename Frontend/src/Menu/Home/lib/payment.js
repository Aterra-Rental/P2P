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


export const generateQR = async (roomCode) => {
  const response = await fetch(
    `${API_URL}/payment/${roomCode}/qr`,
    {
      method: "POST",
      headers: getAuthenticatedHeaders(),
    }
  );

  return readResponse(response);
};


export const verifyPayment = async (roomCode) => {
  const response = await fetch(
    `${API_URL}/payment/${roomCode}/verify`,
    {
      method: "POST",
      headers: getAuthenticatedHeaders(),
    }
  );

  return readResponse(response);
};


export const releaseFunds = async (roomCode) => {
  const response = await fetch(
    `${API_URL}/payment/${roomCode}/release`,
    {
      method: "POST",
      headers: getAuthenticatedHeaders(),
    }
  );

  return readResponse(response);
};