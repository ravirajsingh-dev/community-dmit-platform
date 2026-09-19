import { format, parseISO } from "date-fns";

export const STATUS_VARIANTS = {
  PENDING: "warning",
  ACCEPTED: "info",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED_BY_USER: "danger",
  CANCELLED_BY_HOLDER: "danger",
  CANCELLED_BY_ADMIN: "danger",
  CANCELLED_BY_SYSTEM: "danger",
  CANCEL_REQUESTED: "warning",
  // Counselling session statuses
  CREATED: "secondary",
  COUNSELLOR_COMPLETED: "info",
  USER_CONFIRMATION_PENDING: "warning",
  ISSUE_REPORTED: "danger",
  RECOUNSELLING_PENDING: "warning",
  RECOUNSELLING_IN_PROGRESS: "info",
  CLOSED: "success",
  // SBI PRO session statuses
  UPLOADING: "info",
  UPLOADED: "primary",
  VERIFICATION_PENDING: "warning",
  REOPENED: "info",
  ANALYSIS_PENDING: "dark",
};

export const getStatusDisplay = (status) => {
  if (!status) return { label: "-", variant: "secondary" };
  return {
    label: status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase()),
    variant: STATUS_VARIANTS[status] || "secondary",
  };
};

export const getBookedSlotDisplay = (appointment) => {
  if (!appointment) return "-";

  const slotStart = appointment?.slotId?.startTime;
  const slotEnd = appointment?.slotId?.endTime;
  const slotDateKey =
    appointment?.dateKey ||
    (appointment?.sessionStartTime
      ? format(parseISO(appointment.sessionStartTime), "yyyy-MM-dd")
      : null);

  const formatSlotTime = (time) => {
    if (!time || !slotDateKey) return null;
    return format(parseISO(`${slotDateKey}T${time}:00.000Z`), "hh:mm a");
  };

  const slotStartDisplay = formatSlotTime(slotStart);
  const slotEndDisplay = formatSlotTime(slotEnd);

  if (appointment?.sessionStartTime && slotStart && slotEnd) {
    return `${format(parseISO(appointment.sessionStartTime), "dd/MM/yyyy")}, ${slotStartDisplay || slotStart} - ${slotEndDisplay || slotEnd}`;
  }
  if (slotStart && slotEnd && appointment?.dateKey) {
    return `${format(parseISO(`${appointment.dateKey}T00:00:00.000Z`), "dd/MM/yyyy")}, ${slotStartDisplay || slotStart} - ${slotEndDisplay || slotEnd}`;
  }
  if (appointment?.sessionStartTime) {
    return format(parseISO(appointment.sessionStartTime), "dd/MM/yyyy, hh:mm a");
  }
  if (appointment?.dateKey) {
    return format(parseISO(`${appointment.dateKey}T00:00:00.000Z`), "dd/MM/yyyy");
  }
  return "-";
};


export const getHolderDisplay = (holderOrAppointment) => {
  if (!holderOrAppointment)
    return { primary: "-", secondary: null };

  // Support both shapes:
  // 1) appointment-like: { assignedTo: user }
  // 2) direct user: { name, phone, memberId, ... }
  const h =
    holderOrAppointment.assignedTo ?? holderOrAppointment;

  if (!h) return { primary: "-", secondary: null };

  return {
    primary: `${h.name || "-"} • ${h.phone || "-"}`,
    secondary: h?.memberId ? `(${h.memberId})` : null,
  };
};