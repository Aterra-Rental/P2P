const API_URL = "http://localhost:8000/api";

export const getUserProfile = async () => {
  const userId = localStorage.getItem("user_id");

  if (!userId) {
    throw new Error("No user logged in.");
  }

  const response = await fetch(`${API_URL}/profile/${userId}`);

  if (response.status === 404) {
    throw new Error("404");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch profile.");
  }

  return await response.json();
  
};