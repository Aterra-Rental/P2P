import { API_URL } from "../../../lib/api";


const getToken = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Your login session is missing. Please log in again."
    );
  }

  return token;
};


const getAuthenticatedHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});


const readJsonResponse = async (response) => {
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
      data.message
      || data.error
      || `Request failed (${response.status}).`
    );
  }

  return data;
};


export const getDisputeStatus = async (
  roomCode
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/dispute`,
    {
      headers: getAuthenticatedHeaders(),
    }
  );

  return readJsonResponse(response);
};


export const openDealDispute = async (
  roomCode,
  {
    reason,
    requestedResolution,
  }
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/dispute`,
    {
      method: "POST",
      headers: {
        ...getAuthenticatedHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason,
        requested_resolution: requestedResolution,
      }),
    }
  );

  return readJsonResponse(response);
};