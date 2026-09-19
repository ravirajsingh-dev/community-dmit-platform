import React, { useEffect } from "react";
import { useSelector } from "react-redux";

/**
 * TitleManager Component
 * Manages dynamic document title updates based on Application Settings
 * Automatically updates title when settings are loaded
 */
const TitleManager = () => {
  const { commonSettings, loadingCommonSettings } = useSelector((state) => ({
    commonSettings: state.adminCommonSettings.commonSettings,
    loadingCommonSettings: state.adminCommonSettings.loadingCommonSettings,
  }));

  useEffect(() => {
    // Update document title based on settings
    if (loadingCommonSettings) {
      document.title = "Loading...";
      return;
    }

    const appName = commonSettings?.abbreviation || "";
    const title = appName ? `${appName} Admin` : "";
    document.title = title;
  }, [commonSettings?.abbreviation, loadingCommonSettings]);

  // This component doesn't render anything
  return null;
};

export default TitleManager;
