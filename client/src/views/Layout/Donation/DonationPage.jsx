import React, { useEffect } from "react";
import Donation from "../Components/Donation";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";

const DonationPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <main className="donation-page" role="main">
      <AppBreadCrumb
        pageTitle="Donate"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Donate" },
        ]}
      />
      <Donation />
    </main>
  );
};

export default DonationPage;
