// localStorage helper functions for saving admin credentials (matching client pattern)
export const saveAdminCredentials = (admin_id, password) => {
  try {
    localStorage.setItem("savedAdmin_id", admin_id);
    localStorage.setItem("savedAdminPassword", password);
    localStorage.setItem("rememberAdminPassword", "true");
  } catch (error) {
    console.error("Error saving admin credentials to localStorage:", error);
  }
};

export const getAdminCredentials = () => {
  try {
    const admin_id = localStorage.getItem("savedAdmin_id");
    const password = localStorage.getItem("savedAdminPassword");
    const rememberPassword =
      localStorage.getItem("rememberAdminPassword") === "true";

    return {
      admin_id: admin_id || "",
      password: password || "",
      rememberPassword,
    };
  } catch (error) {
    console.error("Error getting admin credentials from localStorage:", error);
    return {
      admin_id: "",
      password: "",
      rememberPassword: false,
    };
  }
};

export const removeAdminCredentials = () => {
  try {
    localStorage.removeItem("savedAdmin_id");
    localStorage.removeItem("savedAdminPassword");
    localStorage.removeItem("rememberAdminPassword");
  } catch (error) {
    console.error("Error removing admin credentials from localStorage:", error);
  }
};
