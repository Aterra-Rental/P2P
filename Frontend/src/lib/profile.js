import { API_URL } from "../lib/api";

export const getUserProfile = async () => {
  console.count("getUserProfile request");
console.trace("getUserProfile caller");
  const userId = localStorage.getItem("user_id");

  if (!userId) {
    return null;
  }
  const callerStack = new Error("getUserProfile caller").stack;

console.log(
  "GET PROFILE CALLED AT:",
  new Date().toISOString(),
  callerStack
);

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