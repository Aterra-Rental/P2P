import { API_URL } from "./api";


const getAdminToken = () => {
  try {
    const admin = JSON.parse(
      localStorage.getItem("admin")
    );

    return admin?.token || "";
  } catch {
    return "";
  }
};


const readResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Announcement request failed."
    );
  }

  return data;
};


export const getAnnouncements = async () => {
  const response = await fetch(
    `${API_URL}/announcements`
  );

  return readResponse(response);
};


export const createAnnouncement = async (
  title,
  message
) => {
  const token = getAdminToken();

  if (!token) {
    throw new Error(
      "Your admin session is missing. Please log in again."
    );
  }

  const response = await fetch(
    `${API_URL}/admin/announcements`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        message,
      }),
    }
  );

  return readResponse(response);
};