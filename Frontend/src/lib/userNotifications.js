import apiFetch from "./api";


const requireUserSession = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Your login session is missing. Please log in again."
    );
  }
};


const readResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Notification request failed."
    );
  }

  return data;
};


export const getUserNotifications = async () => {
  requireUserSession();

  const response = await apiFetch("/notifications");

  return readResponse(response);
};


export const markUserNotificationRead = async (
  notificationId
) => {
  requireUserSession();

  const response = await apiFetch(
    `/notifications/${notificationId}/read`,
    {
      method: "PUT",
    }
  );

  return readResponse(response);
};


export const markAllUserNotificationsRead = async () => {
  requireUserSession();

  const response = await apiFetch(
    "/notifications/read-all",
    {
      method: "PUT",
    }
  );

  return readResponse(response);
};


export const deleteUserNotification = async (
  notificationId
) => {
  requireUserSession();

  const response = await apiFetch(
    `/notifications/${notificationId}`,
    {
      method: "DELETE",
    }
  );

  return readResponse(response);
};


export const deleteAllUserNotifications = async () => {
  requireUserSession();

  const response = await apiFetch(
    "/notifications",
    {
      method: "DELETE",
    }
  );

  return readResponse(response);
};