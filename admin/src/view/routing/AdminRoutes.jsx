import AdminDashboard from "@src/view/admin/components/AdminDashboard";
import NoAccessPage from "@src/view/admin/components/NoAccessPage";

// Application Settings
import ApplicationSettings from "@src/view/admin/components/ApplicationSettings/ApplicationSettings";

// Users Section
import UsersList from "@src/view/admin/components/users/UsersList";
import UserEditLayout from "@src/view/admin/components/users/UserEditLayout";
import AddUserLayout from "@src/view/admin/components/users/AddUserLayout";

// Media Management
import SliderList from "../admin/components/Slider/SliderList";
import GalleryList from "../admin/components/Gallery/GalleryList";
import VideoList from "../admin/components/Video/VideoList";
import AddVideoLayout from "../admin/components/Video/AddVideoLayout";
import EditVideoLayout from "../admin/components/Video/EditVideoLayout";
import TrainingList from "../admin/components/Training/TrainingList";
import NewsList from "../admin/components/News/NewsList";
import AddNewsLayout from "../admin/components/News/AddNewsLayout";
import EditNewsLayout from "../admin/components/News/EditNewsLayout";
import PDFList from "../admin/components/PDF/PDFList";

// Donation Management
import DonationButtonsList from "../admin/components/Donation/DonationButtonsList";
import DonationRequestsList from "../admin/components/Donation/DonationRequestsList";

// Sub-Admin Management
import SubAdminsList from "../admin/components/subAdmins/SubAdminsList";
import CreateSubAdmin from "../admin/components/subAdmins/CreateSubAdmin";
import EditSubAdmin from "../admin/components/subAdmins/EditSubAdmin";

// Community Management
import CommunityList from "../admin/components/Community/CommunityList";
import CommunityForm from "../admin/components/Community/CommunityForm";
import VanshList from "../admin/components/Vansh/VanshList";
import VanshForm from "../admin/components/Vansh/VanshForm";
import KulList from "../admin/components/Kul/KulList";
import KulForm from "../admin/components/Kul/KulForm";
import KhampList from "../admin/components/Khamp/KhampList";
import KhampForm from "../admin/components/Khamp/KhampForm";
import GotraList from "../admin/components/Gotra/GotraList";
import GotraForm from "../admin/components/Gotra/GotraForm";
import ChangePassword from "../admin/components/ChangePassword/ChangePassword";
import MatrimonialApplicationsList from "../admin/components/Matrimonial/MatrimonialApplicationsList";
import WalletSettings from "../admin/components/WalletSettings/WalletSettings";
import ManageWallets from "../admin/components/walletManagement/ManageWallets";
import AdminWalletDetails from "../admin/components/walletManagement/AdminWalletDetails";
import AdminMemberBalance from "../admin/components/walletManagement/AdminMemberBalance";
import AdminTransferReport from "../admin/components/walletManagement/AdminTransferReport";
import AdminWithdrawalRequests from "../admin/components/walletManagement/AdminWithdrawalRequests";
import LevelCommissionManagement from "../admin/components/LevelCommission/LevelCommissionManagement";
import ReferralSummary from "../admin/components/referral/ReferralSummary";
import AdminTeamDashboard from "../admin/components/Team/AdminTeamDashboard";
import AdminDirectTeam from "../admin/components/Team/AdminDirectTeam";
import AdminFullTeam from "../admin/components/Team/AdminFullTeam";
import AdminLevelWiseTeam from "../admin/components/Team/AdminLevelWiseTeam";
import AdminStructureExplorer from "../admin/components/Team/AdminStructureExplorer";
import FamilyManager from "../admin/components/Family/FamilyManager";
import EPinList from "../admin/components/EPin/EPinList";
import EPinCreate from "../admin/components/EPin/EPinCreate";
import EPinBulkTransfer from "../admin/components/EPin/EPinBulkTransfer";
import EPinBulkDelete from "../admin/components/EPin/EPinBulkDelete";
import EPinTransfersList from "../admin/components/EPin/EPinTransfersList";
import EPinTransferDetails from "../admin/components/EPin/EPinTransferDetails";
import AdminDesignationManagement from "../admin/components/Designations/AdminDesignationManagement";
import AdminDesignationFilters from "../admin/components/Designations/AdminDesignationFilters";
import AdminRankManagement from "../admin/components/Ranks/AdminRankManagement";
import AdminCommissionManagement from "../admin/components/Commission/AdminCommissionManagement";
import AdminAppointmentManagement from "../admin/components/Appointments/AdminAppointmentManagement";
import AdminSlotManagement from "../admin/components/Appointments/AdminSlotManagement";
import AdminSbiProSessionsList from "../admin/components/SbiPro/AdminSbiProSessionsList";
import AdminCounsellingSessionsList from "../admin/components/Counselling/AdminCounsellingSessionsList";

// Location Management
import CountryList from "../admin/components/Country/CountryList";
import CountryForm from "../admin/components/Country/CountryForm";
import StateList from "../admin/components/State/StateList";
import StateForm from "../admin/components/State/StateForm";
import DistrictList from "../admin/components/District/DistrictList";
import DistrictForm from "../admin/components/District/DistrictForm";
import VillageList from "../admin/components/Village/VillageList";
import VillageForm from "../admin/components/Village/VillageForm";
import PendingLocationApprovals from "../admin/components/Location/PendingLocationApprovals";

const AdminRoutes = [
  {
    path: "dashboard",
    name: "Admin Dashboard",
    element: <AdminDashboard />,
  },

  // Application Settings
  {
    path: "application-settings",
    name: "Application Settings",
    element: <ApplicationSettings />,
  },

  // Users Section
  {
    path: "users-list",
    name: "Users List",
    element: <UsersList />,
  },
  {
    path: "users/add",
    name: "Add User",
    element: <AddUserLayout />,
  },
  {
    path: "users/edit/:user_id/*",
    name: "Users All Details",
    element: <UserEditLayout />,
  },

  // Media Management
  {
    path: "slider",
    name: "Slider Banners",
    element: <SliderList />,
  },
  {
    path: "gallery",
    name: "Image Gallery",
    element: <GalleryList />,
  },
  {
    path: "video",
    name: "Videos",
    element: <VideoList />,
  },
  {
    path: "video/add",
    name: "Add Video",
    element: <AddVideoLayout />,
  },
  {
    path: "video/edit/:id",
    name: "Edit Video",
    element: <EditVideoLayout />,
  },
  {
    path: "training-videos",
    name: "Training Content",
    element: <TrainingList />,
  },
  {
    path: "news",
    name: "News",
    element: <NewsList />,
  },
  {
    path: "news/add",
    name: "Add News",
    element: <AddNewsLayout />,
  },
  {
    path: "news/edit/:id",
    name: "Edit News",
    element: <EditNewsLayout />,
  },
  {
    path: "pdfs",
    name: "PDF Documents",
    element: <PDFList />,
  },

  // Donation Management
  {
    path: "donation/buttons",
    name: "Donation Buttons",
    element: <DonationButtonsList />,
  },
  {
    path: "donation/requests",
    name: "Donation Requests",
    element: <DonationRequestsList />,
  },

  // Matrimonial Management
  {
    path: "matrimonial/applications",
    name: "Matrimonial Applications",
    element: <MatrimonialApplicationsList />,
  },

  // Sub-Admin Management
  {
    path: "sub-admins",
    name: "Sub-Admins",
    element: <SubAdminsList />,
  },
  {
    path: "sub-admins/create",
    name: "Create Sub-Admin",
    element: <CreateSubAdmin />,
  },
  {
    path: "sub-admins/edit/:id",
    name: "Edit Sub-Admin",
    element: <EditSubAdmin />,
  },
  // Community Management
  {
    path: "communities",
    name: "Communities",
    element: <CommunityList />,
  },
  {
    path: "communities/add",
    name: "Add Community",
    element: <CommunityForm />,
  },
  {
    path: "communities/edit/:id",
    name: "Edit Community",
    element: <CommunityForm />,
  },
  {
    path: "vansh",
    name: "Vansh",
    element: <VanshList />,
  },
  {
    path: "vansh/add",
    name: "Add Vansh",
    element: <VanshForm />,
  },
  {
    path: "vansh/edit/:id",
    name: "Edit Vansh",
    element: <VanshForm />,
  },
  {
    path: "kul",
    name: "Kul",
    element: <KulList />,
  },
  {
    path: "kul/add",
    name: "Add Kul",
    element: <KulForm />,
  },
  {
    path: "kul/edit/:id",
    name: "Edit Kul",
    element: <KulForm />,
  },
  {
    path: "khamp",
    name: "Khamp",
    element: <KhampList />,
  },
  {
    path: "khamp/add",
    name: "Add Khamp",
    element: <KhampForm />,
  },
  {
    path: "khamp/edit/:id",
    name: "Edit Khamp",
    element: <KhampForm />,
  },
  {
    path: "gotra",
    name: "Gotra",
    element: <GotraList />,
  },
  {
    path: "gotra/add",
    name: "Add Gotra",
    element: <GotraForm />,
  },
  {
    path: "gotra/edit/:id",
    name: "Edit Gotra",
    element: <GotraForm />,
  },

  // Change Password
  {
    path: "change-password",
    name: "Change Password",
    element: <ChangePassword />,
  },

  {
    path: "wallet-settings",
    name: "Wallet Settings",
    element: <WalletSettings />,
  },
  {
    path: "wallet-management/manage",
    name: "Manage Wallets",
    element: <ManageWallets />,
  },
  {
    path: "wallet-management/details",
    name: "Wallet Details",
    element: <AdminWalletDetails />,
  },
  {
    path: "wallet-management/member-balance",
    name: "Member Balance",
    element: <AdminMemberBalance />,
  },
  {
    path: "wallet-management/transfer-report",
    name: "Transfer Report",
    element: <AdminTransferReport />,
  },
  {
    path: "wallet-management/withdrawal-requests",
    name: "Withdrawal Requests",
    element: <AdminWithdrawalRequests />,
  },
  {
    path: "level-commission",
    name: "Level Commission",
    element: <LevelCommissionManagement />,
  },

  // Referral Analytics
  {
    path: "referrals",
    name: "Referral Analytics",
    element: <ReferralSummary />,
  },
  // Team Explorer
  {
    path: "team",
    name: "Team Explorer",
    element: <AdminTeamDashboard />,
  },
  {
    path: "team/direct/:userId",
    name: "Admin Direct Team",
    element: <AdminDirectTeam />,
  },
  {
    path: "team/all/:userId",
    name: "Admin Full Team",
    element: <AdminFullTeam />,
  },
  {
    path: "team/level/:userId",
    name: "Admin Level-Wise Team",
    element: <AdminLevelWiseTeam />,
  },
  {
    path: "team/structure/:userId",
    name: "Admin Structure Explorer",
    element: <AdminStructureExplorer />,
  },
  // E-PIN Management
  {
    path: "epins",
    name: "E-PIN Management",
    element: <EPinList />,
  },
  {
    path: "epins/add",
    name: "Create E-PINs",
    element: <EPinCreate />,
  },
  {
    path: "epins/transfer-bulk",
    name: "Bulk Transfer E-PINs",
    element: <EPinBulkTransfer />,
  },
  {
    path: "epins/delete-bulk",
    name: "Bulk Delete E-PINs",
    element: <EPinBulkDelete />,
  },
  {
    path: "epins/transfers",
    name: "E-PIN Transfer Audit",
    element: <EPinTransfersList />,
  },
  {
    path: "epins/transfers/:transferId",
    name: "Transfer E-PIN Details",
    element: <EPinTransferDetails />,
  },
  {
    path: "designations",
    name: "Designations",
    element: <AdminDesignationManagement />,
  },
  {
    path: "designations/filters",
    name: "Designation Filters",
    element: <AdminDesignationFilters />,
  },
  {
    path: "ranks",
    name: "Rank Management",
    element: <AdminRankManagement />,
  },
  {
    path: "commission-payout",
    name: "Commission Payout Management",
    element: <AdminCommissionManagement />,
  },
  {
    path: "appointments",
    name: "Appointments",
    element: <AdminAppointmentManagement />,
  },
  {
    path: "slots",
    name: "Slot Management",
    element: <AdminSlotManagement />,
  },
  {
    path: "sbi-pro-sessions",
    name: "SBI PRO Sessions",
    element: <AdminSbiProSessionsList />,
  },
  {
    path: "counselling-sessions",
    name: "Counselling Sessions",
    element: <AdminCounsellingSessionsList />,
  },

  // Family / Vanshavriksh
  {
    path: "family",
    name: "Family Management",
    element: <FamilyManager />,
  },

  // Location Management
  {
    path: "countries",
    name: "Countries",
    element: <CountryList />,
  },
  {
    path: "countries/add",
    name: "Add Country",
    element: <CountryForm />,
  },
  {
    path: "countries/edit/:id",
    name: "Edit Country",
    element: <CountryForm />,
  },
  {
    path: "states",
    name: "States",
    element: <StateList />,
  },
  {
    path: "states/add",
    name: "Add State",
    element: <StateForm />,
  },
  {
    path: "states/edit/:id",
    name: "Edit State",
    element: <StateForm />,
  },
  {
    path: "districts",
    name: "Districts",
    element: <DistrictList />,
  },
  {
    path: "districts/add",
    name: "Add District",
    element: <DistrictForm />,
  },
  {
    path: "districts/edit/:id",
    name: "Edit District",
    element: <DistrictForm />,
  },
  {
    path: "villages",
    name: "Villages",
    element: <VillageList />,
  },
  {
    path: "location-pending-approvals",
    name: "Pending Location Approvals",
    element: <PendingLocationApprovals />,
  },
  {
    path: "villages/add",
    name: "Add Village",
    element: <VillageForm />,
  },
  {
    path: "villages/edit/:id",
    name: "Edit Village",
    element: <VillageForm />,
  },

  // No Access Page
  {
    path: "no-access",
    name: "No Access",
    element: <NoAccessPage />,
  },
];

export default AdminRoutes;
