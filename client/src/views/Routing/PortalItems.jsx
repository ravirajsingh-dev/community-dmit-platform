const PortalItems = [
  {
    label: "Dashboard",
    path: "/user/dashboard",
    isAuth: true,
  },
  {
    label: "Family",
    isAuth: true,
    children: [
      {
        label: "Search Member",
        path: "/user/search-member",
        isAuth: true,
      },
      {
        label: "Add Family",
        path: "/user/family",
        isAuth: true,
      },
      {
        label: "Family Tree",
        path: "/user/family-tree",
        isAuth: true,
      },
      {
        label: "Matrimonial",
        path: "/user/matrimonial",
        isAuth: true,
      },
    ],
  },

  {
    label: "Team",
    isAuth: true,
    children: [
      {
        label: "Direct Team",
        path: "/user/team/direct",
        isAuth: true,
      },
      {
        label: "My Team",
        path: "/user/team/all",
        isAuth: true,
      },
      {
        label: "Level-Wise",
        path: "/user/team/level",
        isAuth: true,
      },
      {
        label: "Structure",
        path: "/user/team/structure",
        isAuth: true,
      },
    ],
  },
  {
    label: "Wallet",
    path: "/user/wallet",
    isAuth: true,
  },
  {
    label: "Achievements",
    isAuth: true,
    children: [
      {
        label: "Designations",
        path: "/user/designations",
        isAuth: true,
      },
      {
        label: "Levels",
        path: "/user/levels",
        isAuth: true,
      },
      {
        label: "Rank",
        path: "/user/ranks",
        isAuth: true,
      },
      {
        label: "Clubs",
        path: "/user/clubs",
        isAuth: true,
      },
    ],
  },
  {
    label: "Training Videos",
    path: "/user/training-videos",
    isAuth: true,
  },
  {
    label: "Appointments",
    isAuth: true,
    children: [
      {
        label: "Book Appointment",
        subtitle: "I'm the Client – book a session",
        path: "/user/appointments/book",
        isAuth: true,
        iconKey: "calendar",
      },
      {
        label: "My Bookings",
        subtitle: "Appointments I requested",
        path: "/user/appointments/my",
        isAuth: true,
        iconKey: "clipboard",
      },
      {
        label: "My Counselling",
        subtitle: "Counselling sessions – confirm & close",
        path: "/user/appointments/counselling",
        isAuth: true,
        iconKey: "counselling",
      },
      {
        label: "Assigned to Me",
        subtitle: "I'm the Trainer – clients book with me",
        path: "/user/appointments/assigned",
        isAuth: true,
        iconKey: "personCheck",
      },
      {
        label: "SBI PRO",
        subtitle: "Fingerprint sessions & reports",
        path: "/user/sbi-pro",
        isAuth: true,
        iconKey: "fingerprint",
      },
    ],
  },
  {
    label: "E-PIN",
    path: "/user/epins",
    isAuth: true,
  },
  {
    label: "User",
    isAuth: true,
    children: [
      {
        label: "Profile",
        path: "/user/profile",
      },
      {
        label: "Login Password",
        path: "/user/change-login-password",
      },
    ],
  },
];

export default PortalItems;
