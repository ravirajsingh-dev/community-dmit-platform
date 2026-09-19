export const getAppointmentId = (session) => {
  const apt = session?.appointmentId;
  return typeof apt === "object" ? apt?._id : apt;
};

/**
 * Display for whom the SBI PRO session is - name, phone and memberId (if available).
 * Matches the shapes returned by `SbiProSession` populate calls.
 */
export const getForWhomDisplay = (session) => {
  if (!session) return { primary: "-", secondary: null };

  const isSelf = session.beneficiaryType === "SELF" || !session.beneficiaryType;

  if (isSelf) {
    const u = session.userId;
    const name = u?.name || "-";
    const phone = u?.phone || "-";
    return {
      primary: `${name} • ${phone}`,
      secondary: u?.memberId ? `(${u.memberId})` : null,
    };
  }

  const name = session.beneficiaryName || "—";
  const phone = session.beneficiaryPhone || "—";

  return {
    primary: `${name} • ${phone}`,
    secondary: session.requesterId
      ? `Booked by: ${session.requesterId.name || "-"}`
      : null,
  };
};

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-";

