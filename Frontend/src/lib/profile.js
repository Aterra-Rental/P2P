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
export const updateUserProfile = async (profileData) => {

  const userId = localStorage.getItem("user_id");

  if (!userId) {
    throw new Error("User not logged in.");
  }

  const response = await fetch(`${API_URL}/profile/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profileData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update profile.");
  }

  return data;
};