import React from "react";
import { RouterProvider } from "react-router-dom";

import store from "./store.jsx";
import PortalRoutes from "./views/Routing/PortalRoutes.jsx";

import { initializeAuth } from "@src/actions/auth";
import { getCommonSettings } from "@src/actions/commonActions";
import FaviconManager from "@src/components/FaviconManager";
import TitleManager from "@src/components/TitleManager";

const App = () => {
  React.useEffect(() => {
    store.dispatch(initializeAuth(PortalRoutes));
    // Fetch common settings (including logo) on app initialization
    store.dispatch(getCommonSettings());
  }, []);

  return (
    <>
      <FaviconManager />
      <TitleManager />
      <RouterProvider router={PortalRoutes} />
    </>
  );
};

export default App;
