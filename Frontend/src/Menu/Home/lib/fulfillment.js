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
      data.message ||
        data.error ||
        `Request failed (${response.status}).`
    );
  }

  return data;
};


export const getFulfillmentStatus = async (
  roomCode
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/fulfillment`,
    {
      headers: getAuthenticatedHeaders(),
    }
  );

  return readJsonResponse(response);
};


export const submitFulfillment = async (
  roomCode,
  {
    description,
    courierName,
    trackingNumber,
    proof,
  }
) => {
  const formData = new FormData();

  formData.append("description", description || "");

  if (courierName) {
    formData.append("courier_name", courierName);
  }

  if (trackingNumber) {
    formData.append(
      "tracking_number",
      trackingNumber
    );
  }

  formData.append("proof", proof);

  const response = await fetch(
    `${API_URL}/deals/${roomCode}/fulfillment`,
    {
      method: "POST",
      headers: getAuthenticatedHeaders(),
      body: formData,
    }
  );

  return readJsonResponse(response);
};


export const getFulfillmentProof = async (
  roomCode
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/fulfillment/proof`,
    {
      headers: getAuthenticatedHeaders(),
    }
  );

  if (!response.ok) {
    let message = "Unable to load fulfillment proof.";

    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // Keep the safe fallback message.
    }

    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    contentType:
      response.headers.get("Content-Type") || "",
  };
};


export const confirmDealReceived = async (
  roomCode
) => {
  const response = await fetch(
    `${API_URL}/deals/${roomCode}/confirm-received`,
    {
      method: "POST",
      headers: getAuthenticatedHeaders(),
    }
  );

  return readJsonResponse(response);
};