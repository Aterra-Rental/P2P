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
      || "Unable to load transaction report."
    );
  }

  return data;
};

export const getAdminTransactionReport = async ({
  period = "month",
  page = 1,
  perPage = 25,
} = {}) => {
  const token = getAdminToken();

  const query = new URLSearchParams({
    period,
    page: String(page),
    per_page: String(perPage),
  });

  const response = await fetch(
    `${API_URL}/admin/transactions/report?${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return readResponse(response);
};