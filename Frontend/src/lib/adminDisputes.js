import { API_URL } from "./api";

const getAdminToken = () => {
  const storedAdmin = localStorage.getItem("admin");

  if (!storedAdmin) {
    throw new Error(
      "Your admin session is missing. Please log in again."
    );
  }

  let admin;

  try {
    admin = JSON.parse(storedAdmin);
  } catch (error) {
    throw new Error(
      "Your admin session is invalid. Please log in again.",
      {
        cause: error,
      }
    );
  }

  if (!admin?.token) {
    throw new Error(
      "Your admin session is missing. Please log in again."
    );
  }

  return admin.token;
};

const readResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
      || "Unable to process the dispute request."
    );
  }

  return data;
};

export const getAdminDisputes = async ({
  status = "Open",
  page = 1,
  perPage = 25,
} = {}) => {
  const token = getAdminToken();

  const query = new URLSearchParams({
    status,
    page: String(page),
    per_page: String(perPage),
  });

  const response = await fetch(
    `${API_URL}/admin/disputes?${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return readResponse(response);
};

export const getAdminDisputeDetail = async (
  disputeId
) => {
  const token = getAdminToken();

  const response = await fetch(
    `${API_URL}/admin/disputes/${disputeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return readResponse(response);
};

export const resolveAdminDispute = async (
  disputeId,
  {
    decision,
    resolutionNote,
  }
) => {
  const token = getAdminToken();

  const response = await fetch(
    `${API_URL}/admin/disputes/${disputeId}/resolve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision,
        resolution_note: resolutionNote,
      }),
    }
  );

  return readResponse(response);
};

export const getAdminDisputeProof = async (
  disputeId
) => {
  const token = getAdminToken();

  const response = await fetch(
    `${API_URL}/admin/disputes/${disputeId}/fulfillment-proof`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    let message = "Unable to load fulfillment proof.";

    try {
      const data = await response.json();
      message = data.message || message;
    } catch (error) {
      throw new Error(message, {
        cause: error,
      });
    }

    throw new Error(message);
  }

  return response.blob();
};