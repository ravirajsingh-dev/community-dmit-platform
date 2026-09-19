import { createBrowserRouter } from "react-router-dom";

// Layouts
import PublicLayout from "../Layout/PublicLayout";
import PortalLayout from "../Layout/PortalLayout";

// Auth Components
import Register from "../Auth/Register";
import Login from "../Auth/Login";

// Public Components
import Home from "../Layout/Home/Home";
import DonationPage from "../Layout/Donation/DonationPage";
import AboutUs from "../Layout/AboutUs/AboutUs";
import ContactUs from "../Layout/ContactUs/ContactUs";
import ComingSoon from "../Layout/ComingSoon/ComingSoon";

// Dashboard Component
import Dashboard from "../Layout/Dashboard/Dashboard";

// Profile Components
import Profile from "../Layout/Profile/Profile";

// Search Member Component
import SearchMember from "../Layout/SearchMember/SearchMember";
import MemberFiltersPage from "../Layout/SearchMember/MemberFiltersPage";
import MemberDetails from "../Layout/SearchMember/MemberDetails";

// Password Components
import ChangePassword from "../Layout/Passwords/ChangePassword";
import SetTransactionPassword from "../Layout/Passwords/SetTransactionPassword";
import ChangeTransactionPassword from "../Layout/Passwords/ChangeTransactionPassword";
import TransactionPasswordIndex from "../Layout/Passwords/TransactionPasswordIndex";
import FamilyManage from "../Layout/Family/FamilyManage";
import FamilyTreePage from "../Layout/Family/FamilyTreePage";
import EPinList from "../Layout/EPin/EPinList";
import EPinBulkTransfer from "../Layout/EPin/EPinBulkTransfer";
import WalletIndex from "../Layout/Wallet/WalletIndex";
import WalletTransactions from "../Layout/Wallet/WalletTransactions";
import WalletTransactionsFiltersPage from "../Layout/Wallet/WalletTransactionsFiltersPage";
import LevelIncome from "../Layout/Wallet/LevelIncome";
import WalletWithdrawal from "../Layout/Wallet/WalletWithdrawal";
import DirectTeam from "../Layout/Team/DirectTeam";
import DirectTeamFiltersPage from "../Layout/Team/DirectTeamFiltersPage";
import MemberDirectList from "../Layout/Team/MemberDirectList";
import MemberDownlineList from "../Layout/Team/MemberDownlineList";
import MyTeam from "../Layout/Team/MyTeam";
import MyTeamFiltersPage from "../Layout/Team/MyTeamFiltersPage";
import LevelWiseTeam from "../Layout/Team/LevelWiseTeam";
import LevelWiseTeamFiltersPage from "../Layout/Team/LevelWiseTeamFiltersPage";
import StructureView from "../Layout/Team/StructureView";
import MatrimonialIndex from "../Layout/Matrimonial/MatrimonialIndex";
import MatrimonialMatches from "../Layout/Matrimonial/MatrimonialMatches";
import MatrimonialList from "../Layout/Matrimonial/MatrimonialList";
import MatrimonialProfileView from "../Layout/Matrimonial/MatrimonialProfileView";
import DesignationsIndex from "../Layout/Designations/DesignationsIndex";
import LevelsIndex from "../Layout/LevelsRankClubs/LevelsIndex";
import RanksIndex from "../Layout/LevelsRankClubs/RanksIndex";
import ClubsIndex from "../Layout/LevelsRankClubs/ClubsIndex";
import TrainingVideosIndex from "../Layout/TrainingVideos/TrainingVideosIndex";
import BookAppointment from "../Layout/Appointments/BookAppointment";
import BookAppointmentFiltersPage from "../Layout/Appointments/BookAppointmentFiltersPage";
import MyAppointments from "../Layout/Appointments/MyAppointments";
import MyBookingsFiltersPage from "../Layout/Appointments/MyBookingsFiltersPage";
import AssignedAppointments from "../Layout/Appointments/AssignedAppointments";
import AssignedToMeFiltersPage from "../Layout/Appointments/AssignedToMeFiltersPage";
import MyCounselling from "../Layout/Appointments/MyCounselling";
import MyCounsellingFiltersPage from "../Layout/Appointments/MyCounsellingFiltersPage";
import SbiProIndex from "../Layout/SbiPro/SbiProIndex";
import SbiProSessionDetail from "../Layout/SbiPro/SbiProSessionDetail";

// Common Components
import NotFoundPage from "../Common/NotFound/NotFoundPage";

// Mobile Views
import SettingsLayout from "../Layout/MobileLayout/SettingsLayout";
import FamiliesLayout from "../Layout/MobileLayout/FamiliesLayout";
import MatrimonialLayout from "../Layout/MobileLayout/MatrimonialLayout";
import SearchMemberLayout from "../Layout/MobileLayout/SearchMemberLayout";

const PortalRoutes = createBrowserRouter([
  // Public Routes (Unauthenticated)
  {
    path: "/register",
    name: "Register",
    element: <Register />,
  },
  {
    path: "/login",
    name: "Login",
    element: <Login />,
  },
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        path: "/",
        name: "Home Page",
        element: <Home />,
      },
      {
        path: "/contact-us",
        name: "Contact US",
        element: <ContactUs />,
      },
      {
        path: "/donate",
        name: "Donate",
        element: <DonationPage />,
      },
      {
        path: "/about-us",
        name: "About US",
        element: <AboutUs />,
      },
      {
        path: "/coming-soon",
        name: "Coming Soon",
        element: <ComingSoon />,
      },
    ],
  },

  // Authenticated Routes (Protected by PortalLayout)
  {
    path: "/user",
    element: <PortalLayout />,
    children: [
      // Dashboard
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "team/direct",
        element: <DirectTeam />,
      },
      {
        path: "team/direct/filters",
        element: <DirectTeamFiltersPage />,
      },
      {
        path: "team/member/:userId/direct-list",
        element: <MemberDirectList />,
      },
      {
        path: "team/member/:userId/downline-list",
        element: <MemberDownlineList />,
      },
      {
        path: "team/all",
        element: <MyTeam />,
      },
      {
        path: "team/all/filters",
        element: <MyTeamFiltersPage />,
      },
      {
        path: "team/level",
        element: <LevelWiseTeam />,
      },
      {
        path: "team/level/filters",
        element: <LevelWiseTeamFiltersPage />,
      },
      {
        path: "team/structure",
        element: <StructureView />,
      },
      // Mobile View
      {
        path: "settings-layout",
        element: <SettingsLayout />,
      },
      {
        path: "families-layout",
        element: <FamiliesLayout />,
      },
      {
        path: "matrimonial-layout",
        element: <MatrimonialLayout />,
      },
      {
        path: "search-member-layout",
        element: <SearchMemberLayout />,
      },

      // Profile Section
      {
        path: "profile",
        element: <Profile />,
      },

      // Search Member Section
      {
        path: "search-member",
        element: <SearchMember />,
      },
      {
        path: "search-member/filters",
        element: <MemberFiltersPage />,
      },
      {
        path: "member-details/:user_id",
        element: <MemberDetails />,
      },

      // Password Management Section
      {
        path: "change-login-password",
        element: <ChangePassword />,
      },
      {
        path: "set-transaction-password",
        element: <SetTransactionPassword />,
      },
      {
        path: "change-transaction-password",
        element: <ChangeTransactionPassword />,
      },
      {
        path: "transaction-password",
        element: <TransactionPasswordIndex />,
      },
      {
        path: "family",
        element: <FamilyManage />,
      },
      {
        path: "family-tree",
        element: <FamilyTreePage />,
      },
      {
        path: "epins",
        element: <EPinList />,
      },
      {
        path: "epin/transfer",
        element: <EPinBulkTransfer />,
      },
      {
        path: "wallet",
        element: <WalletIndex />,
      },
      {
        path: "wallet/transactions",
        element: <WalletTransactions />,
      },
      {
        path: "wallet/transactions/filters",
        element: <WalletTransactionsFiltersPage />,
      },
      {
        path: "wallet/level-income",
        element: <LevelIncome />,
      },
      {
        path: "wallet/withdrawal",
        element: <WalletWithdrawal />,
      },
      {
        path: "designations",
        element: <DesignationsIndex />,
      },
      {
        path: "levels",
        element: <LevelsIndex />,
      },
      {
        path: "ranks",
        element: <RanksIndex />,
      },
      {
        path: "clubs",
        element: <ClubsIndex />,
      },
      {
        path: "training-videos",
        element: <TrainingVideosIndex />,
      },
      {
        path: "appointments/book",
        element: <BookAppointment />,
      },
      {
        path: "appointments/book/filters",
        element: <BookAppointmentFiltersPage />,
      },
      {
        path: "appointments/my",
        element: <MyAppointments />,
      },
      {
        path: "appointments/my/filters",
        element: <MyBookingsFiltersPage />,
      },
      {
        path: "appointments/assigned",
        element: <AssignedAppointments />,
      },
      {
        path: "appointments/assigned/filters",
        element: <AssignedToMeFiltersPage />,
      },
      {
        path: "appointments/counselling",
        element: <MyCounselling />,
      },
      {
        path: "appointments/counselling/filters",
        element: <MyCounsellingFiltersPage />,
      },
      {
        path: "sbi-pro",
        element: <SbiProIndex />,
      },
      {
        path: "sbi-pro-sessions",
        element: <SbiProIndex />,
      },
      {
        path: "sbi-pro-verify",
        element: <SbiProIndex />,
      },
      {
        path: "sbi-pro-sessions/:appointmentId",
        element: <SbiProSessionDetail />,
      },

      // Matrimonial
      {
        path: "matrimonial",
        element: <MatrimonialIndex />,
      },
      {
        path: "matrimonial/list",
        element: <MatrimonialList />,
      },
      {
        path: "matrimonial/matches",
        element: <MatrimonialMatches />,
      },
      {
        path: "matrimonial/profile/:id",
        element: <MatrimonialProfileView />,
      },

      // 404 Page
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default PortalRoutes;
