const API_URL = "http://localhost:8000/api";

export const getUserProfile = async () => {

  const userId = localStorage.getItem("user_id");

  if (!userId) {
    return null;
  }

  const response = await fetch(`${API_URL}/profile/${userId}`);

  // User has not completed profile yet
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch profile.");
  }

  return await response.json();

};