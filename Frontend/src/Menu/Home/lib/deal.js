import {API_URL} from '../../../lib/api'



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

export const getDealRoles = async (
  roomCode,
  userId
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/roles?user_id=${encodeURIComponent(userId)}`
  );

  return readResponse(response);
};

export const selectDealRole = async (
  roomCode,
  userId,
  role
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/select-role`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: Number(userId),
        role,
      }),
    }
  );

  return readResponse(response);
};

export const confirmDealRole = async (
  roomCode,
  userId
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/confirm-role`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: Number(userId),
      }),
    }
  );

  return readResponse(response);
};

export const resetDealRoles = async (
  roomCode,
  userId
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/reset-roles`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: Number(userId),
      }),
    }
  );

  return readResponse(response);
};