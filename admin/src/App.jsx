import React, { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useDispatch } from "react-redux";

// Admin custom imports
import AdminLogin from "./view/auth/AdminLogin";
import AdminPrivateRoute from "./view/routing/AdminPrivateRoute";
import AdminLayout from "./view/admin/adminLayout/index";
import { initializeAdminAuth } from "./actions/adminAuth";
import { getCommonSettings } from "./actions/adminCommonSettingsActions";
import FaviconManager from "./components/FaviconManager";
import TitleManager from "./components/TitleManager";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // On mount, check authentication using cookies
    dispatch(initializeAdminAuth());
    // Fetch common settings (including logo) on app initialization
    dispatch(getCommonSettings());
  }, [dispatch]);

  return (
    <div id="App">
      <FaviconManager />
      <TitleManager />
      <Routes>
        {/* Admin routes */}
        <Route path="/" element={<AdminLogin />} />
        <Route element={<AdminPrivateRoute />}>
          <Route path="/admin/*" element={<AdminLayout />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
