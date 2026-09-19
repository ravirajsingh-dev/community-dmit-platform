import React, { useEffect, useState } from "react";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Modal,
} from "react-bootstrap";
import { VscEdit } from "react-icons/vsc";
import { RiDeleteBin5Line } from "react-icons/ri";

import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AdminNoDataState from "@src/view/commonComponents/dataTable/AdminNoDataState";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import Errors from "@src/notifications/Errors";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import {
  getWalletSettings,
  updateRegistrationFee,
  updateRegistrationFeeEditable,
  updateGovernanceSettings,
  addLevel,
  updateLevel,
  deleteLevel,
  addRank,
  updateRank,
  deleteRank,
  addClub,
  updateClub,
  deleteClub,
  addDesignation,
  updateDesignation,
  deleteDesignation,
  resetComponentStore,
  updateAdminSurcharge,
} from "@src/actions/adminWalletSettingsActions";
import { initialSortingParams } from "@src/constants";

const formatMoney2Dec = (val) => {
  const n = parseFloat(val);
  if (isNaN(n) || n < 0) return "";
  return String(Math.round(n * 100) / 100);
};

const getTotalCommission = (levels, ranks, clubs, designations = []) => {
  const sum = (arr, key) => (arr || []).reduce((s, x) => s + (x[key] || 0), 0);
  return (
    sum(levels, "commissionPercent") +
    sum(ranks, "commissionPercent") +
    sum(clubs, "commissionPercent") +
    sum(designations, "commissionPercent")
  );
};

const WalletSettings = ({
  setErrorsList,
  removeErrors,
  errorList,
  getWalletSettings,
  updateRegistrationFee,
  updateRegistrationFeeEditable,
  updateGovernanceSettings,
  addLevel,
  updateLevel,
  deleteLevel,
  addRank,
  updateRank,
  deleteRank,
  addClub,
  updateClub,
  deleteClub,
  addDesignation,
  updateDesignation,
  deleteDesignation,
  resetComponentStore,
  adminWalletSettings: {
    walletSettings,
    loadingWalletSettings,
    loadingOnSubmit,
  },
  updateAdminSurcharge,
}) => {
  const [onlyOnce, setOnce] = useState(true);

  // Registration fee
  const [regFee, setRegFee] = useState("");
  const [showRegFeeModal, setShowRegFeeModal] = useState(false);

  // Governance
  const [govForm, setGovForm] = useState({
    maxAdminAdjustAmount: "",
    mainMinWithdrawal: "",
    mainMaxWithdrawal: "",
    maxUserTransactionsPerDay: "",
    freeAppointmentsPerUser: "",
    counsellingCharge: "",
    adminWithdrawalSurchargePercent: "",
    isWithdrawalEnabled: true,
  });
  const [showGovModal, setShowGovModal] = useState(false);
  const [showGovConfirm, setShowGovConfirm] = useState(false);

  // Levels
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelEditId, setLevelEditId] = useState(null);
  const [levelForm, setLevelForm] = useState({
    levelNumber: "",
    commissionPercent: "",
  });
  const [showDeleteLevelModal, setShowDeleteLevelModal] = useState(false);
  const [deleteLevelId, setDeleteLevelId] = useState(null);
  const [showDeleteLevelConfirm, setShowDeleteLevelConfirm] = useState(false);

  // Clubs
  const [showClubModal, setShowClubModal] = useState(false);
  const [clubEditId, setClubEditId] = useState(null);
  const [clubForm, setClubForm] = useState({
    name: "",
    commissionPercent: "",
    minimumRankCode: "",
    selfSaleRequired: "",
    monthlyTarget: "",
    capping: "",
    isAdminOnly: false,
    minWithdrawal: "",
    maxWithdrawal: "",
  });
  const [showDeleteClubModal, setShowDeleteClubModal] = useState(false);
  const [deleteClubId, setDeleteClubId] = useState(null);
  const [showDeleteClubConfirm, setShowDeleteClubConfirm] = useState(false);

  // Ranks
  const [showRankModal, setShowRankModal] = useState(false);
  const [rankEditId, setRankEditId] = useState(null);
  const [rankForm, setRankForm] = useState({
    name: "",
    commissionPercent: "",
    selfSaleRequired: "",
    teamSizeRequired: "",
    requiredRankCount: "",
    monthlyTarget: "",
    capping: "",
    requiredDesignations: [],
  });
  const [showDeleteRankConfirm, setShowDeleteRankConfirm] = useState(false);
  const [deleteRankId, setDeleteRankId] = useState(null);
  const [showRankConfirmModal, setShowRankConfirmModal] = useState(false);
  const [pendingRankData, setPendingRankData] = useState(null);
  const [showEnableRegFeeModal, setShowEnableRegFeeModal] = useState(false);

  // Designations
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [designationEditId, setDesignationEditId] = useState(null);
  const [designationForm, setDesignationForm] = useState({
    name: "",
    commissionPercent: "",
    selfSaleRequired: "",
    teamSizeRequired: "",
    requiredDesignationCode: "",
    requiredDesignationCount: "",
    monthlyTarget: "",
    isActive: true,
    freeSessionCount: "0",
    maxSessionsPerDay: "5",
  });
  const [showDeleteDesignationConfirm, setShowDeleteDesignationConfirm] =
    useState(false);
  const [deleteDesignationId, setDeleteDesignationId] = useState(null);
  const [showDesignationConfirmModal, setShowDesignationConfirmModal] =
    useState(false);
  const [pendingDesignationData, setPendingDesignationData] = useState(null);

  // Admin surcharge (stored in Wallet Settings)
  const [adminSurchargeInput, setAdminSurchargeInput] = useState("");
  const [isSurchargeEditable, setIsSurchargeEditable] = useState(false);
  const [showSurchargeModal, setShowSurchargeModal] = useState(false);

  const levels = walletSettings?.levels || [];
  const clubs = walletSettings?.clubs || [];
  const designations = walletSettings?.designations || [];
  const ranks = walletSettings?.ranks || [];

  const totalLevelsCommission = levels.reduce(
    (sum, l) => sum + (l.commissionPercent || 0),
    0,
  );
  const totalRanksCommission = ranks.reduce(
    (sum, r) => sum + (r.commissionPercent || 0),
    0,
  );
  const totalDesignationsCommission = designations.reduce(
    (sum, d) => sum + (d.commissionPercent || 0),
    0,
  );
  const totalClubsCommission = clubs.reduce(
    (sum, c) => sum + (c.commissionPercent || 0),
    0,
  );
  const totalCommissionAll =
    totalLevelsCommission +
    totalRanksCommission +
    totalDesignationsCommission +
    totalClubsCommission;

  const adminSurchargePercent =
    walletSettings?.adminSurchargePercent ?? null;

  useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }
    getWalletSettings();
  }, [getWalletSettings, resetComponentStore]);

  useEffect(() => {
    if (walletSettings && Object.keys(walletSettings).length > 0) {
      setRegFee(
        walletSettings.registrationFee !== undefined
          ? String(walletSettings.registrationFee)
          : "",
      );
      setGovForm({
        maxAdminAdjustAmount:
          walletSettings.maxAdminAdjustAmount != null
            ? String(walletSettings.maxAdminAdjustAmount)
            : "",
        mainMinWithdrawal:
          walletSettings.mainMinWithdrawal != null
            ? String(walletSettings.mainMinWithdrawal)
            : "",
        mainMaxWithdrawal:
          walletSettings.mainMaxWithdrawal != null
            ? String(walletSettings.mainMaxWithdrawal)
            : "",
        maxUserTransactionsPerDay:
          walletSettings.maxUserTransactionsPerDay != null
            ? String(walletSettings.maxUserTransactionsPerDay)
            : "",
        freeAppointmentsPerUser:
          walletSettings.freeAppointmentsPerUser != null
            ? String(walletSettings.freeAppointmentsPerUser)
            : "",
        counsellingCharge:
          walletSettings.counsellingCharge != null
            ? String(walletSettings.counsellingCharge)
            : "",
        adminWithdrawalSurchargePercent:
          walletSettings.adminWithdrawalSurchargePercent != null
            ? String(walletSettings.adminWithdrawalSurchargePercent)
            : "",
        isWithdrawalEnabled:
          walletSettings.isWithdrawalEnabled !== undefined
            ? Boolean(walletSettings.isWithdrawalEnabled)
            : true,
      });
    }
  }, [walletSettings]);

  useEffect(() => {
    if (
      adminSurchargePercent !== null &&
      adminSurchargePercent !== undefined &&
      !Number.isNaN(adminSurchargePercent)
    ) {
      setAdminSurchargeInput(String(adminSurchargePercent));
    } else {
      setAdminSurchargeInput("");
    }
  }, [adminSurchargePercent]);

  const configVersion = walletSettings?.configVersion ?? 1;
  const isRegFeeEditable = walletSettings?.isRegistrationFeeEditable === true;

  const handleSurchargeConfirm = (txn_password) => {
    const num = Number(adminSurchargeInput);
    if (adminSurchargeInput === "" || Number.isNaN(num)) {
      setErrorsList("Admin surcharge is required.", "withdrawalSurcharge");
      return;
    }
    if (!Number.isInteger(num) || num < 0 || num > 99) {
      setErrorsList(
        "Admin surcharge must be an integer between 0 and 99.",
        "withdrawalSurcharge",
      );
      return;
    }
    updateAdminSurcharge({
      adminSurchargePercent: num,
      configVersion,
      txn_password,
    });
    setShowSurchargeModal(false);
    setIsSurchargeEditable(false);
  };

  const openRegFeeModal = () => {
    if (!isRegFeeEditable) return;
    setShowRegFeeModal(true);
  };
  const closeRegFeeModal = () => setShowRegFeeModal(false);

  const handleEnableRegFeeEdit = (txn_password) => {
    updateRegistrationFeeEditable({
      isRegistrationFeeEditable: true,
      configVersion,
      txn_password,
    });
    setShowEnableRegFeeModal(false);
  };

  const handleRegFeeConfirm = (txn_password) => {
    const num = parseFloat(regFee);
    if (isNaN(num) || num === Infinity || num === -Infinity) {
      setErrorsList(
        "Registration fee must be a valid number",
        "registrationFee",
      );
      return;
    }
    if (num < 0) {
      setErrorsList("Registration fee must be >= 0", "registrationFee");
      return;
    }
    const decimals = (String(regFee).split(".")[1] || "").length;
    if (decimals > 2) {
      setErrorsList(
        "Registration fee must not have more than 2 decimal places",
        "registrationFee",
      );
      return;
    }
    const rounded = Math.round(num * 100) / 100;
    updateRegistrationFee({
      registrationFee: rounded,
      configVersion,
      txn_password,
    });
    setShowRegFeeModal(false);
  };

  const openAddLevel = () => {
    const nextNum =
      levels.length > 0 ? Math.max(...levels.map((l) => l.levelNumber)) + 1 : 1;
    setLevelForm({ levelNumber: nextNum, commissionPercent: "" });
    setLevelEditId(null);
    setShowLevelModal(true);
  };

  const openEditLevel = (level) => {
    setLevelForm({
      levelNumber: String(level.levelNumber),
      commissionPercent: String(level.commissionPercent),
    });
    setLevelEditId(level._id);
    setShowLevelModal(true);
  };

  const closeLevelModal = () => {
    setShowLevelModal(false);
    setLevelEditId(null);
    setLevelForm({ levelNumber: "", commissionPercent: "" });
  };

  const handleLevelSubmit = (e) => {
    e.preventDefault();
    removeErrors();
    const errors = [];
    const cp = parseFloat(levelForm.commissionPercent);
    if (
      !levelForm.commissionPercent ||
      levelForm.commissionPercent.toString().trim() === ""
    ) {
      errors.push({
        path: "commissionPercent",
        msg: "Commission % is required.",
      });
    } else if (isNaN(cp) || cp < 0 || cp > 100) {
      errors.push({
        path: "commissionPercent",
        msg: "Commission % must be between 0 and 100.",
      });
    }
    if (errors.length) {
      errors.forEach((err) => setErrorsList(err.msg, err.path));
      return;
    }
    const levels = walletSettings?.levels || [];
    const ranks = walletSettings?.ranks || [];
    const clubs = walletSettings?.clubs || [];
    const designationsArr = walletSettings?.designations || [];
    const currentTotal = getTotalCommission(
      levels,
      ranks,
      clubs,
      designationsArr,
    );
    const levelDelta = levelEditId
      ? cp -
        (levels.find((l) => String(l._id) === String(levelEditId))
          ?.commissionPercent || 0)
      : cp;
    if (currentTotal + levelDelta > 100) {
      setErrorsList(
        `Total commission cannot exceed 100%. Current total: ${currentTotal}%, change would result in ${currentTotal + levelDelta}%.`,
        "commissionPercent",
      );
      return;
    }
    if (levelEditId) {
      setPendingLevelData({
        commissionPercent: cp,
        editId: levelEditId,
      });
    } else {
      setPendingLevelData({ commissionPercent: cp });
    }
    setShowLevelModal(false);
    setShowLevelConfirmModal(true);
  };

  const [showLevelConfirmModal, setShowLevelConfirmModal] = useState(false);
  const [pendingLevelData, setPendingLevelData] = useState(null);

  const handleLevelConfirm = (txn_password) => {
    if (!pendingLevelData) return;
    const { editId, ...rest } = pendingLevelData;
    const data = { ...rest, configVersion, txn_password };
    if (editId) {
      updateLevel(editId, data);
    } else {
      addLevel(data);
    }
    setShowLevelConfirmModal(false);
    setPendingLevelData(null);
    setLevelEditId(null);
  };

  const openDeleteLevel = (level) => {
    setDeleteLevelId(level._id);
    setShowDeleteLevelConfirm(true);
  };

  const handleDeleteLevelConfirm = (txn_password) => {
    if (deleteLevelId) {
      deleteLevel(deleteLevelId, { configVersion, txn_password });
      setShowDeleteLevelConfirm(false);
      setDeleteLevelId(null);
    }
  };

  const openAddClub = () => {
    setClubForm({
      name: "",
      commissionPercent: "",
      minimumRankCode: "",
      selfSaleRequired: "",
      monthlyTarget: "",
      capping: "",
      isAdminOnly: false,
      minWithdrawal: "",
      maxWithdrawal: "",
    });
    setClubEditId(null);
    setShowClubModal(true);
  };

  const openEditClub = (club) => {
    setClubForm({
      name: club.name || "",
      commissionPercent: String(club.commissionPercent ?? ""),
      minimumRankCode:
        club.minimumRankCode != null ? String(club.minimumRankCode) : "",
      selfSaleRequired: String(club.selfSaleRequired ?? ""),
      monthlyTarget: String(club.monthlyTarget ?? ""),
      capping: String(club.capping ?? ""),
      isAdminOnly: Boolean(club.isAdminOnly),
      minWithdrawal:
        club.minWithdrawal != null ? String(club.minWithdrawal) : "",
      maxWithdrawal:
        club.maxWithdrawal != null ? String(club.maxWithdrawal) : "",
    });
    setClubEditId(club._id);
    setShowClubModal(true);
  };

  const closeClubModal = () => {
    setShowClubModal(false);
    setClubEditId(null);
    setClubForm({
      name: "",
      commissionPercent: "",
      minimumRankCode: "",
      selfSaleRequired: "",
      monthlyTarget: "",
      capping: "",
      isAdminOnly: false,
      minWithdrawal: "",
      maxWithdrawal: "",
    });
  };

  const parseMoney = (val) => {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return 0;
    return Math.round(n * 100) / 100;
  };

  const validateClubNumericField = (val, path, label) => {
    const errs = [];
    if (val !== "" && (isNaN(parseFloat(val)) || parseFloat(val) < 0)) {
      errs.push({ path, msg: `${label} must be >= 0.` });
    }
    if (val !== "" && (String(val).split(".")[1] || "").length > 2) {
      errs.push({
        path,
        msg: `${label} must not have more than 2 decimal places.`,
      });
    }
    return errs;
  };

  const handleClubSubmit = (e) => {
    e.preventDefault();
    removeErrors();
    const errors = [];
    if (!clubForm.name || !clubForm.name.trim()) {
      errors.push({ path: "name", msg: "Club name is required." });
    }
    const cp = parseFloat(clubForm.commissionPercent);
    if (
      !clubForm.commissionPercent ||
      clubForm.commissionPercent.toString().trim() === ""
    ) {
      errors.push({
        path: "commissionPercent",
        msg: "Commission % is required.",
      });
    } else if (isNaN(cp) || cp < 0 || cp > 100) {
      errors.push({
        path: "commissionPercent",
        msg: "Commission % must be between 0 and 100.",
      });
    }
    errors.push(
      ...validateClubNumericField(
        clubForm.minimumRankCode,
        "minimumRankCode",
        "Minimum Rank Code",
      ),
      ...validateClubNumericField(
        clubForm.selfSaleRequired,
        "selfSaleRequired",
        "Self Sale Required",
      ),
      ...validateClubNumericField(
        clubForm.monthlyTarget,
        "monthlyTarget",
        "Monthly Target",
      ),
      ...validateClubNumericField(clubForm.capping, "capping", "Capping"),
      ...validateClubNumericField(
        clubForm.minWithdrawal,
        "minWithdrawal",
        "Min Withdrawal",
      ),
      ...validateClubNumericField(
        clubForm.maxWithdrawal,
        "maxWithdrawal",
        "Max Withdrawal",
      ),
    );
    if (
      clubForm.minWithdrawal !== "" &&
      clubForm.maxWithdrawal !== "" &&
      parseFloat(clubForm.minWithdrawal) > parseFloat(clubForm.maxWithdrawal)
    ) {
      errors.push({
        path: "maxWithdrawal",
        msg: "Min Withdrawal must be <= Max Withdrawal.",
      });
    }
    const filteredErrors = errors.filter((err) => err.msg);
    if (filteredErrors.length) {
      filteredErrors.forEach((err) => setErrorsList(err.msg, err.path));
      return;
    }
    const minimumRankCode =
      clubForm.minimumRankCode === "" || clubForm.minimumRankCode == null
        ? null
        : parseMoney(clubForm.minimumRankCode);
    const levels = walletSettings?.levels || [];
    const ranks = walletSettings?.ranks || [];
    const clubs = walletSettings?.clubs || [];
    const designationsArr = walletSettings?.designations || [];
    const currentTotal = getTotalCommission(
      levels,
      ranks,
      clubs,
      designationsArr,
    );
    const clubDelta = clubEditId
      ? cp -
        (clubs.find((c) => String(c._id) === String(clubEditId))
          ?.commissionPercent || 0)
      : cp;
    if (currentTotal + clubDelta > 100) {
      setErrorsList(
        `Total commission cannot exceed 100%. Current total: ${currentTotal}%, change would result in ${currentTotal + clubDelta}%.`,
        "commissionPercent",
      );
      return;
    }
    const minWithdrawal =
      clubForm.minWithdrawal === "" ? null : parseMoney(clubForm.minWithdrawal);
    const maxWithdrawal =
      clubForm.maxWithdrawal === "" ? null : parseMoney(clubForm.maxWithdrawal);
    const data = {
      name: clubForm.name.trim(),
      commissionPercent: cp,
      minimumRankCode,
      selfSaleRequired: parseMoney(clubForm.selfSaleRequired) || 0,
      monthlyTarget: parseMoney(clubForm.monthlyTarget) || 0,
      capping: parseMoney(clubForm.capping) || 0,
      isAdminOnly: Boolean(clubForm.isAdminOnly),
      minWithdrawal,
      maxWithdrawal,
    };
    setPendingClubData({ ...data, editId: clubEditId });
    setShowClubModal(false);
    setShowClubConfirmModal(true);
  };

  const [showClubConfirmModal, setShowClubConfirmModal] = useState(false);
  const [pendingClubData, setPendingClubData] = useState(null);

  const handleClubConfirm = (txn_password) => {
    if (!pendingClubData) return;
    const { editId, ...rest } = pendingClubData;
    const data = { ...rest, configVersion, txn_password };
    if (editId) {
      updateClub(editId, data);
    } else {
      addClub(data);
    }
    setShowClubConfirmModal(false);
    setPendingClubData(null);
    setClubEditId(null);
  };

  const openDeleteClub = (club) => {
    setDeleteClubId(club._id);
    setShowDeleteClubConfirm(true);
  };

  const handleDeleteClubConfirm = (txn_password) => {
    if (deleteClubId) {
      deleteClub(deleteClubId, { configVersion, txn_password });
      setShowDeleteClubConfirm(false);
      setDeleteClubId(null);
    }
  };

  const openAddDesignation = () => {
    setDesignationForm({
      name: "",
      commissionPercent: "",
      selfSaleRequired: "",
      teamSizeRequired: "",
      requiredDesignationCode: "",
      requiredDesignationCount: "",
      monthlyTarget: "",
      isActive: true,
      freeSessionCount: "0",
      maxSessionsPerDay: "5",
    });
    setDesignationEditId(null);
    setShowDesignationModal(true);
  };
  const openEditDesignation = (des) => {
    setDesignationForm({
      name: des.name || "",
      commissionPercent: String(des.commissionPercent ?? ""),
      selfSaleRequired: String(des.selfSaleRequired ?? ""),
      teamSizeRequired: String(des.teamSizeRequired ?? ""),
      requiredDesignationCode:
        des.requiredDesignationCode != null
          ? String(des.requiredDesignationCode)
          : "",
      requiredDesignationCount: String(des.requiredDesignationCount ?? ""),
      monthlyTarget: String(des.monthlyTarget ?? ""),
      isActive: des.isActive !== false,
      freeSessionCount: String(des.freeSessionCount ?? 0),
      maxSessionsPerDay: String(des.maxSessionsPerDay ?? 5),
    });
    setDesignationEditId(des._id);
    setShowDesignationModal(true);
  };
  const closeDesignationModal = () => {
    setShowDesignationModal(false);
    setDesignationEditId(null);
  };
  const handleDesignationSubmit = (e) => {
    e.preventDefault();
    removeErrors();
    const errors = [];
    if (!designationForm.name || !designationForm.name.trim()) {
      errors.push({
        path: "designationName",
        msg: "Designation name is required.",
      });
    }
    const cp = parseFloat(designationForm.commissionPercent);
    if (
      !designationForm.commissionPercent ||
      designationForm.commissionPercent.toString().trim() === ""
    ) {
      errors.push({
        path: "designationCommission",
        msg: "Commission % is required.",
      });
    } else if (isNaN(cp) || cp < 0 || cp > 100) {
      errors.push({
        path: "designationCommission",
        msg: "Commission % must be between 0 and 100.",
      });
    }
    const currentTotal = getTotalCommission(levels, ranks, clubs, designations);
    const desDelta = designationEditId
      ? cp -
        (designations.find((d) => String(d._id) === String(designationEditId))
          ?.commissionPercent || 0)
      : cp;
    if (currentTotal + desDelta > 100) {
      errors.push({
        path: "designationCommission",
        msg: `Total commission cannot exceed 100%.`,
      });
    }
    if (errors.length) {
      errors.forEach((err) => setErrorsList(err.msg, err.path));
      return;
    }
    const reqDesCode =
      designationForm.requiredDesignationCode === "" ||
      designationForm.requiredDesignationCode == null
        ? null
        : parseInt(designationForm.requiredDesignationCode, 10);
    const reqDesCount =
      parseMoney(designationForm.requiredDesignationCount) || 0;
    if (reqDesCode == null && reqDesCount > 0) {
      errors.push({
        path: "requiredDesignationCount",
        msg: "requiredDesignationCount must be 0 when requiredDesignationCode is empty.",
      });
      setErrorsList(
        "requiredDesignationCount must be 0 when requiredDesignationCode is empty.",
        "requiredDesignationCount",
      );
      return;
    }
    const freeSessionCount = parseInt(designationForm.freeSessionCount, 10);
    if (
      designationForm.freeSessionCount !== "" &&
      (Number.isNaN(freeSessionCount) || freeSessionCount < 0)
    ) {
      errors.push({
        path: "freeSessionCount",
        msg: "Free session count must be >= 0.",
      });
      setErrorsList("Free session count must be >= 0.", "freeSessionCount");
      return;
    }
    const maxSessionsPerDay = parseInt(designationForm.maxSessionsPerDay, 10);
    if (
      !designationForm.maxSessionsPerDay ||
      designationForm.maxSessionsPerDay.toString().trim() === "" ||
      Number.isNaN(maxSessionsPerDay) ||
      maxSessionsPerDay < 1
    ) {
      errors.push({
        path: "maxSessionsPerDay",
        msg: "Max sessions per day is required and must be >= 1.",
      });
      setErrorsList(
        "Max sessions per day is required and must be >= 1.",
        "maxSessionsPerDay",
      );
      return;
    }
    setPendingDesignationData({
      name: designationForm.name.trim().toUpperCase(),
      commissionPercent: cp,
      selfSaleRequired: parseMoney(designationForm.selfSaleRequired) || 0,
      teamSizeRequired: parseMoney(designationForm.teamSizeRequired) || 0,
      requiredDesignationCode: reqDesCode,
      requiredDesignationCount: reqDesCount,
      monthlyTarget: parseMoney(designationForm.monthlyTarget) || 0,
      isActive: Boolean(designationForm.isActive),
      freeSessionCount: Number.isNaN(freeSessionCount) ? 0 : freeSessionCount,
      maxSessionsPerDay,
      editId: designationEditId,
    });
    setShowDesignationModal(false);
    setShowDesignationConfirmModal(true);
  };
  const handleDesignationConfirm = (txn_password) => {
    if (!pendingDesignationData) return;
    const { editId, ...rest } = pendingDesignationData;
    const data = { ...rest, configVersion, txn_password };
    if (editId) {
      updateDesignation(editId, data);
    } else {
      addDesignation(data);
    }
    setShowDesignationConfirmModal(false);
    setPendingDesignationData(null);
    setDesignationEditId(null);
  };
  const openDeleteDesignation = (des) => {
    setDeleteDesignationId(des._id);
    setShowDeleteDesignationConfirm(true);
  };
  const handleDeleteDesignationConfirm = (txn_password) => {
    if (deleteDesignationId) {
      deleteDesignation(deleteDesignationId, { configVersion, txn_password });
      setShowDeleteDesignationConfirm(false);
      setDeleteDesignationId(null);
    }
  };
  const maxDesignationCode =
    designations.length > 0
      ? Math.max(...designations.map((d) => d.designationCode || 0))
      : 0;

  const addRequiredDesignationRow = () => {
    setRankForm({
      ...rankForm,
      requiredDesignations: [
        ...(rankForm.requiredDesignations || []),
        { designationCode: "", minCount: 1 },
      ],
    });
  };
  const removeRequiredDesignationRow = (idx) => {
    setRankForm({
      ...rankForm,
      requiredDesignations: rankForm.requiredDesignations.filter(
        (_, i) => i !== idx,
      ),
    });
  };
  const updateRequiredDesignationRow = (idx, field, value) => {
    const arr = [...(rankForm.requiredDesignations || [])];
    if (!arr[idx]) arr[idx] = { designationCode: "", minCount: 1 };
    arr[idx] = { ...arr[idx], [field]: value };
    setRankForm({ ...rankForm, requiredDesignations: arr });
  };

  const nextRankCode =
    ranks.length > 0 ? Math.max(...ranks.map((r) => r.rankCode || 0)) + 1 : 1;
  const openAddRank = () => {
    setRankForm({
      name: "",
      commissionPercent: "",
      selfSaleRequired: "",
      teamSizeRequired: "",
      requiredRankCount: "",
      monthlyTarget: "",
      capping: "",
      requiredDesignations: [],
    });
    setRankEditId(null);
    setShowRankModal(true);
  };
  const openEditRank = (rank) => {
    setRankForm({
      name: rank.name || "",
      commissionPercent: String(rank.commissionPercent ?? ""),
      selfSaleRequired: String(rank.selfSaleRequired ?? ""),
      teamSizeRequired: String(rank.teamSizeRequired ?? ""),
      requiredRankCount: String(rank.requiredRankCount ?? ""),
      monthlyTarget: String(rank.monthlyTarget ?? ""),
      capping: String(rank.capping ?? ""),
      requiredDesignations: (rank.requiredDesignations || []).map((rd) => ({
        designationCode: rd.designationCode,
        minCount: rd.minCount ?? 1,
      })),
    });
    setRankEditId(rank._id);
    setShowRankModal(true);
  };
  const closeRankModal = () => {
    setShowRankModal(false);
    setRankEditId(null);
    setRankForm({
      name: "",
      commissionPercent: "",
      selfSaleRequired: "",
      teamSizeRequired: "",
      requiredRankCount: "",
      monthlyTarget: "",
      capping: "",
      requiredDesignations: [],
    });
  };
  const validateMoneyField = (val, path, label) => {
    const errors = [];
    const n = parseFloat(val);
    if (val !== "" && (isNaN(n) || n < 0)) {
      errors.push({ path, msg: `${label} must be >= 0.` });
    }
    if (val !== "" && (String(val).split(".")[1] || "").length > 2) {
      errors.push({
        path,
        msg: `${label} must not have more than 2 decimal places.`,
      });
    }
    return errors;
  };

  const handleRankSubmit = (e) => {
    e.preventDefault();
    removeErrors();
    const errors = [];
    if (!rankForm.name || !rankForm.name.trim()) {
      errors.push({ path: "rankName", msg: "Rank name is required." });
    }
    const cp = parseFloat(rankForm.commissionPercent);
    if (
      !rankForm.commissionPercent ||
      rankForm.commissionPercent.toString().trim() === ""
    ) {
      errors.push({ path: "rankCommission", msg: "Commission % is required." });
    } else if (isNaN(cp) || cp < 0 || cp > 100) {
      errors.push({
        path: "rankCommission",
        msg: "Commission % must be between 0 and 100.",
      });
    }
    const ssVal = parseFloat(rankForm.selfSaleRequired);
    if (
      rankForm.selfSaleRequired !== "" &&
      rankForm.selfSaleRequired.toString().trim() !== ""
    ) {
      if (isNaN(ssVal) || ssVal < 0) {
        errors.push({
          path: "rankSelfSale",
          msg: "Self Sale Required must be >= 0.",
        });
      } else if (
        (String(rankForm.selfSaleRequired).split(".")[1] || "").length > 2
      ) {
        errors.push({
          path: "rankSelfSale",
          msg: "Self Sale Required must not have more than 2 decimal places.",
        });
      }
    }
    if (
      rankForm.teamSizeRequired === "" ||
      rankForm.teamSizeRequired.toString().trim() === ""
    ) {
      errors.push({
        path: "rankTeamSize",
        msg: "Team Size Required is mandatory for all ranks.",
      });
    } else {
      errors.push(
        ...validateMoneyField(
          rankForm.teamSizeRequired,
          "rankTeamSize",
          "Team Size Required",
        ),
      );
    }
    errors.push(
      ...validateMoneyField(
        rankForm.requiredRankCount,
        "rankRequiredRankCount",
        "Required Rank Count",
      ),
    );
    errors.push(
      ...validateMoneyField(
        rankForm.monthlyTarget,
        "rankMonthlyTarget",
        "Monthly Target",
      ),
    );
    errors.push(
      ...validateMoneyField(rankForm.capping, "rankCapping", "Capping"),
    );
    const reqDes = rankForm.requiredDesignations || [];
    for (let i = 0; i < reqDes.length; i++) {
      const rd = reqDes[i];
      if (rd.designationCode != null && rd.designationCode !== "") {
        const mc = parseInt(rd.minCount, 10);
        if (isNaN(mc) || mc < 1) {
          errors.push({
            path: "rankRequiredDesignations",
            msg: `Required Designations row ${i + 1}: minCount must be >= 1`,
          });
        }
      }
    }
    const filteredErrors = errors.filter((e) => e.msg);
    if (filteredErrors.length) {
      filteredErrors.forEach((err) => setErrorsList(err.msg, err.path));
      return;
    }
    const levels = walletSettings?.levels || [];
    const clubs = walletSettings?.clubs || [];
    const designationsArr = walletSettings?.designations || [];
    const currentTotal = getTotalCommission(
      levels,
      ranks,
      clubs,
      designationsArr,
    );
    const rankDelta = rankEditId
      ? cp -
        (ranks.find((r) => String(r._id) === String(rankEditId))
          ?.commissionPercent || 0)
      : cp;
    if (currentTotal + rankDelta > 100) {
      setErrorsList(
        `Total commission cannot exceed 100%. Current total: ${currentTotal}%, change would result in ${currentTotal + rankDelta}%.`,
        "rankCommission",
      );
      return;
    }
    const selfSaleRequired =
      rankForm.selfSaleRequired === ""
        ? 0
        : parseMoney(rankForm.selfSaleRequired);
    const teamSizeRequired =
      rankForm.teamSizeRequired === ""
        ? 0
        : parseMoney(rankForm.teamSizeRequired);
    const requiredRankCount =
      rankForm.requiredRankCount === ""
        ? 0
        : parseMoney(rankForm.requiredRankCount);
    const monthlyTarget =
      rankForm.monthlyTarget === "" ? 0 : parseMoney(rankForm.monthlyTarget);
    const capping = rankForm.capping === "" ? 0 : parseMoney(rankForm.capping);
    const validatedReqDes = (rankForm.requiredDesignations || [])
      .filter((rd) => rd.designationCode != null && rd.designationCode !== "")
      .map((rd) => ({
        designationCode: Number(rd.designationCode),
        minCount: Math.max(1, parseInt(rd.minCount, 10) || 1),
      }));
    const seenDes = new Set();
    const dedupedReqDes = validatedReqDes.filter((rd) => {
      if (seenDes.has(rd.designationCode)) return false;
      seenDes.add(rd.designationCode);
      return true;
    });
    setPendingRankData({
      name: rankForm.name.trim().toUpperCase(),
      commissionPercent: cp,
      selfSaleRequired,
      teamSizeRequired,
      requiredRankCount,
      monthlyTarget,
      capping,
      requiredDesignations: dedupedReqDes,
      editId: rankEditId,
    });
    setShowRankModal(false);
    setShowRankConfirmModal(true);
  };
  const handleRankConfirm = (txn_password) => {
    if (!pendingRankData) return;
    const { editId, ...rest } = pendingRankData;
    const data = { ...rest, configVersion, txn_password };
    if (editId) {
      updateRank(editId, data);
    } else {
      addRank(data);
    }
    setShowRankConfirmModal(false);
    setPendingRankData(null);
    setRankEditId(null);
  };
  const maxRankCode =
    ranks.length > 0 ? Math.max(...ranks.map((r) => r.rankCode || 0)) : 0;
  const openDeleteRank = (rank) => {
    setDeleteRankId(rank._id);
    setShowDeleteRankConfirm(true);
  };
  const handleDeleteRankConfirm = (txn_password) => {
    if (deleteRankId) {
      deleteRank(deleteRankId, { configVersion, txn_password });
      setShowDeleteRankConfirm(false);
      setDeleteRankId(null);
    }
  };

  const levelsColumns = [
    { name: "Level #", selector: (l) => l.levelNumber, width: "100px" },
    {
      name: "walletKey",
      cell: (l) => <code>{l.walletKey || "-"}</code>,
      width: "150px",
    },
    {
      name: "Commission %",
      selector: (l) => l.commissionPercent,
      width: "150px",
    },
    {
      name: "Actions",
      width: "200px",
      cell: (l) => {
        const maxLevelNum =
          levels.length > 0
            ? Math.max(...levels.map((lev) => lev.levelNumber))
            : 0;
        const isLastLevel = l.levelNumber === maxLevelNum;
        return (
          <>
            <Button
              variant="outline-primary"
              size="sm"
              className="me-1"
              onClick={() => openEditLevel(l)}
              title="Edit"
            >
              <VscEdit size={16} />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => isLastLevel && openDeleteLevel(l)}
              disabled={!isLastLevel}
              title={
                isLastLevel
                  ? "Delete"
                  : "Only the last level can be deleted. Delete from end."
              }
            >
              <RiDeleteBin5Line size={16} />
            </Button>
          </>
        );
      },
    },
  ];

  const designationsColumns = [
    { name: "Code", selector: (d) => d.designationCode, width: "100px" },
    { name: "Name", selector: (d) => d.name, width: "200px" },
    {
      name: "walletKey",
      cell: (d) => <code>{d.walletKey || "-"}</code>,
      width: "150px",
    },
    {
      name: "Commission %",
      selector: (d) => d.commissionPercent,
      width: "150px",
    },
    {
      name: "Self Sale",
      selector: (d) => d.selfSaleRequired ?? "-",
      width: "120px",
    },
    {
      name: "Team Size",
      selector: (d) => d.teamSizeRequired ?? "-",
      width: "120px",
    },
    {
      name: "Req Des Code",
      selector: (d) =>
        d.requiredDesignationCode != null ? d.requiredDesignationCode : "-",
      width: "150px",
    },
    {
      name: "Req Des Count",
      selector: (d) => d.requiredDesignationCount ?? "-",
      width: "200px",
    },
    {
      name: "Monthly Target",
      selector: (d) => d.monthlyTarget ?? "-",
      width: "200px",
    },
    {
      name: "Active",
      selector: (d) => (d.isActive !== false ? "Yes" : "No"),
      width: "100px",
    },
    {
      name: "Actions",
      width: "200px",
      cell: (d) => {
        const isLastDes = (d.designationCode || 0) === maxDesignationCode;
        return (
          <>
            <Button
              variant="outline-primary"
              size="sm"
              className="me-1"
              onClick={() => openEditDesignation(d)}
              title="Edit"
            >
              <VscEdit size={16} />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => isLastDes && openDeleteDesignation(d)}
              disabled={!isLastDes}
              title={
                isLastDes
                  ? "Delete"
                  : "Only the last designation can be deleted."
              }
            >
              <RiDeleteBin5Line size={16} />
            </Button>
          </>
        );
      },
    },
  ];

  const ranksColumns = [
    { name: "Rank", selector: (r) => r.rankCode, width: "100px" },
    { name: "Name", selector: (r) => r.name, width: "200px" },
    {
      name: "walletKey",
      cell: (r) => <code>{r.walletKey || "-"}</code>,
      width: "150px",
    },
    {
      name: "Commission %",
      selector: (r) => r.commissionPercent,
      width: "150px",
    },
    {
      name: "Self Sale",
      selector: (r) =>
        r.selfSaleRequired != null && r.selfSaleRequired !== ""
          ? r.selfSaleRequired
          : "-",
      width: "120px",
    },
    {
      name: "Team Size",
      selector: (r) =>
        r.teamSizeRequired != null && r.teamSizeRequired !== ""
          ? r.teamSizeRequired
          : "-",
      width: "120px",
    },
    {
      name: "Req Rank Count",
      selector: (r) =>
        r.requiredRankCount != null && r.requiredRankCount !== ""
          ? r.requiredRankCount
          : "-",
      width: "150px",
    },
    {
      name: "Required Designations",
      selector: (r) =>
        (r.requiredDesignations || []).length > 0
          ? (r.requiredDesignations || [])
              .map((rd) => {
                const des = designations.find(
                  (d) => d.designationCode === rd.designationCode,
                );
                return des
                  ? `${des.designationCode}-${des.name}(${rd.minCount ?? 1})`
                  : `${rd.designationCode}(${rd.minCount ?? 1})`;
              })
              .join(", ")
          : "-",
      width: "250px",
    },
    {
      name: "Monthly Target",
      selector: (r) =>
        r.monthlyTarget != null && r.monthlyTarget !== ""
          ? r.monthlyTarget
          : "-",
      width: "200px",
    },
    {
      name: "Capping",
      selector: (r) =>
        r.capping != null && r.capping !== "" ? r.capping : "-",
      width: "120px",
    },
    {
      name: "Actions",
      width: "150px",
      cell: (r) => {
        const isLastRank = (r.rankCode || 0) === maxRankCode;
        return (
          <>
            <Button
              variant="outline-primary"
              size="sm"
              className="me-1"
              onClick={() => openEditRank(r)}
              title="Edit"
            >
              <VscEdit size={16} />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => isLastRank && openDeleteRank(r)}
              disabled={!isLastRank}
              title={
                isLastRank
                  ? "Delete"
                  : "Only the last rank can be deleted. Delete from end."
              }
            >
              <RiDeleteBin5Line size={16} />
            </Button>
          </>
        );
      },
    },
  ];

  const clubsColumns = [
    { name: "Name", selector: (c) => c.name || "-", width: "120px" },
    {
      name: "walletKey",
      cell: (c) => (
        <code>
          {c.walletKey ||
            (c.name || "")
              .replace(/\s+/g, "_")
              .replace(/[^A-Za-z0-9_]/g, "")
              .toUpperCase() ||
            "-"}
        </code>
      ),
      width: "150px",
    },
    {
      name: "Commission %",
      selector: (c) => c.commissionPercent,
      width: "150px",
    },
    {
      name: "Min Rank Code",
      selector: (c) => (c.minimumRankCode != null ? c.minimumRankCode : "-"),
      width: "200px",
    },
    {
      name: "Min/Max Withdrawal",
      selector: (c) =>
        c.minWithdrawal != null || c.maxWithdrawal != null
          ? `${c.minWithdrawal ?? "-"} / ${c.maxWithdrawal ?? "-"}`
          : "-",
      width: "250px",
    },
    {
      name: "Self Sale Required",
      selector: (c) => c.selfSaleRequired ?? "-",
      width: "200px",
    },
    {
      name: "Monthly Target",
      selector: (c) => c.monthlyTarget ?? "-",
      width: "200px",
    },
    { name: "Capping", selector: (c) => c.capping ?? "-", width: "150px" },
    {
      name: "Admin Only",
      selector: (c) => (c.isAdminOnly ? "Yes" : "-"),
      width: "150px",
    },
    {
      name: "Actions",
      width: "150px",
      cell: (c) => (
        <>
          <Button
            variant="outline-primary"
            size="sm"
            className="me-1"
            onClick={() => openEditClub(c)}
            title="Edit"
          >
            <VscEdit size={16} />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => openDeleteClub(c)}
            title="Delete"
          >
            <RiDeleteBin5Line size={16} />
          </Button>
        </>
      ),
    },
  ];

  if (loadingWalletSettings) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Wallet Settings"
          crumbs={[{ name: "Wallet Settings" }]}
        />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Wallet Settings"
        crumbs={[{ name: "Wallet Settings" }]}
      />

      <MainCard className="card-body">
        {/* Commission Summary & Admin Surcharge */}
        <Card className="mb-4">
          <Card.Header className="bg-secondary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Total Commission Summary</h5>
            {!isSurchargeEditable && (
              <Button
                variant="light"
                size="sm"
                onClick={() => {
                  removeErrors();
                  setIsSurchargeEditable(true);
                }}
                disabled={loadingOnSubmit}
              >
                Enable Edit
              </Button>
            )}
          </Card.Header>
          <Card.Body>
            <Row className="mb-2">
              <Col xs={12} md={6} lg={3}>
                <strong>Levels Total:</strong>{" "}
                <span>{totalLevelsCommission}%</span>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Ranks Total:</strong>{" "}
                <span>{totalRanksCommission}%</span>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Designations Total:</strong>{" "}
                <span>{totalDesignationsCommission}%</span>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Clubs Total:</strong>{" "}
                <span>{totalClubsCommission}%</span>
              </Col>
            </Row>
            <Row className="mb-2">
              <Col xs={12} md={6} lg={4}>
                <strong>Grand Total Commission:</strong>{" "}
                <span
                  className={totalCommissionAll > 100 ? "text-danger" : ""}
                >
                  {totalCommissionAll}%
                </span>
                {totalCommissionAll > 100 && (
                  <span className="text-danger ms-1">
                    (Exceeds 100% limit)
                  </span>
                )}
              </Col>
              <Col xs={12} md={6} lg={4}>
                <Form.Group className="form-group">
                  <Form.Label>Admin Surcharge %</Form.Label>
                  <div className="d-flex gap-2 align-items-end">
                    <Form.Control
                      type="text"
                      value={adminSurchargeInput}
                      disabled={!isSurchargeEditable}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d{0,2}$/.test(v)) {
                          setAdminSurchargeInput(v);
                        }
                      }}
                      placeholder="0"
                    />
                    <Button
                      variant="primary"
                      onClick={() => {
                        removeErrors();
                        setShowSurchargeModal(true);
                      }}
                      disabled={loadingOnSubmit || !isSurchargeEditable}
                    >
                      Update
                    </Button>
                  </div>
                  <Form.Text className="text-muted">
                    Integer only, max 2 digits (0–99). Requires transaction
                    password to save.
                  </Form.Text>
                  <Errors current_key="withdrawalSurcharge" />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Registration Fee */}
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Registration Fee</h5>
            {!isRegFeeEditable && (
              <Button
                variant="light"
                size="sm"
                onClick={() => setShowEnableRegFeeModal(true)}
                disabled={loadingOnSubmit}
              >
                Enable Edit
              </Button>
            )}
          </Card.Header>
          <Card.Body>
            <Row>
              <Col xs={12} md={6} lg={4}>
                <Form.Group className="form-group">
                  <Form.Label>Registration Fee</Form.Label>
                  <div className="d-flex gap-2 align-items-end">
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={regFee}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setRegFee(v);
                      }}
                      onBlur={() => {
                        if (regFee !== "" && !isNaN(parseFloat(regFee))) {
                          setRegFee(formatMoney2Dec(regFee));
                        }
                      }}
                      disabled={!isRegFeeEditable}
                      placeholder="0"
                    />
                    <Button
                      variant="primary"
                      onClick={openRegFeeModal}
                      disabled={loadingOnSubmit || !isRegFeeEditable}
                    >
                      Update
                    </Button>
                  </div>
                  <Form.Text className="text-muted">
                    {isRegFeeEditable
                      ? "Click Update to save. Edit will lock after save."
                      : "Locked. Click Enable Edit to unlock."}
                  </Form.Text>
                  <Errors current_key="registrationFee" />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Governance */}
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Governance</h5>
            <Button
              variant="light"
              size="sm"
              onClick={() => setShowGovModal(true)}
              disabled={loadingOnSubmit}
            >
              Edit
            </Button>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col xs={12} md={6} lg={3}>
                <strong>Max Admin Adjust:</strong>{" "}
                {walletSettings?.maxAdminAdjustAmount ?? "-"}
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Main Min Withdrawal:</strong>{" "}
                {walletSettings?.mainMinWithdrawal != null
                  ? walletSettings.mainMinWithdrawal
                  : "Unlimited"}
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Main Max Withdrawal:</strong>{" "}
                {walletSettings?.mainMaxWithdrawal != null
                  ? walletSettings.mainMaxWithdrawal
                  : "Unlimited"}
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Daily Txn Limit:</strong>{" "}
                {walletSettings?.maxUserTransactionsPerDay != null
                  ? walletSettings.maxUserTransactionsPerDay
                  : "Unlimited"}
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Free Appointments/User:</strong>{" "}
                {walletSettings?.freeAppointmentsPerUser != null
                  ? walletSettings.freeAppointmentsPerUser
                  : 0}
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Counselling Fee (₹):</strong>{" "}
                {walletSettings?.counsellingCharge != null &&
                walletSettings.counsellingCharge > 0
                  ? walletSettings.counsellingCharge
                  : "0 (paid counselling disabled)"}
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Admin Withdrawal Surcharge %:</strong>{" "}
                {walletSettings?.adminWithdrawalSurchargePercent ?? 0}
              </Col>
              <Col xs={12} md={6} lg={3}>
                <strong>Enable Withdrawal:</strong>{" "}
                {walletSettings?.isWithdrawalEnabled ? "Yes" : "No"}
              </Col>
            </Row>
            <Errors current_key="govForm" />
          </Card.Body>
        </Card>

        {/* Levels */}
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Levels</h5>
            <Button
              variant="light"
              size="sm"
              onClick={openAddLevel}
              disabled={loadingOnSubmit}
            >
              + Add Level
            </Button>
          </Card.Header>
          <Card.Body>
            {levels.length === 0 ? (
              <p className="text-muted mb-0">No levels added yet.</p>
            ) : (
              <CustomDataTable
                columns={levelsColumns}
                data={levels}
                count={levels.length}
                params={initialSortingParams}
                setParams={() => {}}
                pagination={false}
                responsive
                striped
                noDataComponent={<AdminNoDataState title="No levels added yet" />}
              />
            )}
          </Card.Body>
        </Card>

        {/* Designations */}
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Designations</h5>
            <Button
              variant="light"
              size="sm"
              onClick={openAddDesignation}
              disabled={loadingOnSubmit}
            >
              + Add Designation
            </Button>
          </Card.Header>
          <Card.Body>
            {designations.length === 0 ? (
              <p className="text-muted mb-0">No designations added yet.</p>
            ) : (
              <CustomDataTable
                columns={designationsColumns}
                data={[...designations].sort(
                  (a, b) => (a.designationCode || 0) - (b.designationCode || 0),
                )}
                count={designations.length}
                params={initialSortingParams}
                setParams={() => {}}
                pagination={false}
                responsive
                striped
                noDataComponent={
                  <AdminNoDataState title="No designations added yet" />
                }
              />
            )}
          </Card.Body>
        </Card>

        {/* Ranks */}
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Ranks</h5>
            <Button
              variant="light"
              size="sm"
              onClick={openAddRank}
              disabled={loadingOnSubmit}
            >
              + Add Rank
            </Button>
          </Card.Header>
          <Card.Body>
            {ranks.length === 0 ? (
              <p className="text-muted mb-0">No ranks added yet.</p>
            ) : (
              <CustomDataTable
                columns={ranksColumns}
                data={[...ranks].sort(
                  (a, b) => (a.rankCode || 0) - (b.rankCode || 0),
                )}
                count={ranks.length}
                params={initialSortingParams}
                setParams={() => {}}
                pagination={false}
                responsive
                striped
                noDataComponent={<AdminNoDataState title="No ranks added yet" />}
              />
            )}
          </Card.Body>
        </Card>

        {/* Clubs */}
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Clubs</h5>
            <Button
              variant="light"
              size="sm"
              onClick={openAddClub}
              disabled={loadingOnSubmit}
            >
              + Add Club
            </Button>
          </Card.Header>
          <Card.Body>
            {clubs.length === 0 ? (
              <p className="text-muted mb-0">No clubs added yet.</p>
            ) : (
              <CustomDataTable
                columns={clubsColumns}
                data={clubs}
                count={clubs.length}
                params={initialSortingParams}
                setParams={() => {}}
                pagination={false}
                responsive
                striped
                noDataComponent={<AdminNoDataState title="No clubs added yet" />}
              />
            )}
          </Card.Body>
        </Card>
      </MainCard>

      {/* Enable Registration Fee Edit Modal */}
      <VerificationConfirmModal
        show={showEnableRegFeeModal}
        handleClose={() => setShowEnableRegFeeModal(false)}
        handleConfirm={handleEnableRegFeeEdit}
        title="Enable Registration Fee Edit"
        body="Enter your transaction password to enable editing the registration fee."
        submitBtnText="Enable Edit"
      />

      {/* Registration Fee Confirm Modal */}
      <VerificationConfirmModal
        show={showRegFeeModal}
        handleClose={closeRegFeeModal}
        handleConfirm={handleRegFeeConfirm}
        title="Confirm Update"
        body="Enter your transaction password to update registration fee."
        submitBtnText="Update"
      />

      {/* Admin Surcharge Confirm Modal */}
      <VerificationConfirmModal
        show={showSurchargeModal}
        handleClose={() => setShowSurchargeModal(false)}
        handleConfirm={handleSurchargeConfirm}
        title="Update Admin Surcharge"
        body="Enter your transaction password to update admin surcharge %."
        submitBtnText="Update"
      />

      {/* Governance Modal */}
      <Modal
        show={showGovModal}
        onHide={() => setShowGovModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Governance Settings</Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            removeErrors();
            const errs = [];
            const maxAdj = parseInt(govForm.maxAdminAdjustAmount, 10);
            if (
              govForm.maxAdminAdjustAmount !== "" &&
              (isNaN(maxAdj) || maxAdj < 0)
            ) {
              errs.push({
                path: "govForm",
                msg: "Max Admin Adjust must be >= 0 integer.",
              });
            }
            if (govForm.maxAdminAdjustAmount !== "" && maxAdj > 100000000) {
              errs.push({
                path: "govForm",
                msg: "Max Admin Adjust cannot exceed 10 crore.",
              });
            }
            const mainMin = parseFloat(govForm.mainMinWithdrawal);
            const mainMax = parseFloat(govForm.mainMaxWithdrawal);
            if (
              govForm.mainMinWithdrawal !== "" &&
              (isNaN(mainMin) || mainMin < 0)
            ) {
              errs.push({
                path: "govForm",
                msg: "Main Min Withdrawal must be >= 0.",
              });
            }
            if (
              govForm.mainMaxWithdrawal !== "" &&
              (isNaN(mainMax) || mainMax < 0)
            ) {
              errs.push({
                path: "govForm",
                msg: "Main Max Withdrawal must be >= 0.",
              });
            }
            if (
              govForm.mainMinWithdrawal !== "" &&
              govForm.mainMaxWithdrawal !== "" &&
              mainMin > mainMax
            ) {
              errs.push({
                path: "govForm",
                msg: "Main Min must be <= Main Max.",
              });
            }
            const dailyLimit = parseInt(govForm.maxUserTransactionsPerDay, 10);
            if (
              govForm.maxUserTransactionsPerDay !== "" &&
              (isNaN(dailyLimit) || dailyLimit < 0)
            ) {
              errs.push({
                path: "govForm",
                msg: "Daily Txn Limit must be >= 0 integer.",
              });
            }
            const freeApt = parseInt(govForm.freeAppointmentsPerUser, 10);
            if (
              govForm.freeAppointmentsPerUser !== "" &&
              (isNaN(freeApt) || freeApt < 0)
            ) {
              errs.push({
                path: "govForm",
                msg: "Free Appointments Per User must be >= 0 integer.",
              });
            }
            const counsellingFee = parseFloat(govForm.counsellingCharge);
            if (
              govForm.counsellingCharge !== "" &&
              (isNaN(counsellingFee) || counsellingFee < 0)
            ) {
              errs.push({
                path: "govForm",
                msg: "Counselling Fee must be >= 0.",
              });
            }
            if (errs.length) {
              errs.forEach((err) => setErrorsList(err.msg, err.path));
              return;
            }
            setShowGovModal(false);
            setShowGovConfirm(true);
          }}
        >
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Max Admin Adjust Amount</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="1"
                value={govForm.maxAdminAdjustAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d+$/.test(v))
                    setGovForm({ ...govForm, maxAdminAdjustAmount: v });
                }}
                placeholder="999999"
              />
              <Form.Text className="text-muted">
                Max amount per admin adjust. Integer, max 10 crore. 0 = no
                limit.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Main Min Withdrawal</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={govForm.mainMinWithdrawal}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                    setGovForm({ ...govForm, mainMinWithdrawal: v });
                }}
                placeholder="Empty = unlimited"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Main Max Withdrawal</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={govForm.mainMaxWithdrawal}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                    setGovForm({ ...govForm, mainMaxWithdrawal: v });
                }}
                placeholder="Empty = unlimited"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Max User Transactions Per Day</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="1"
                value={govForm.maxUserTransactionsPerDay}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d+$/.test(v))
                    setGovForm({ ...govForm, maxUserTransactionsPerDay: v });
                }}
                placeholder="Empty = unlimited"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Free Appointments Per User</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="1"
                value={govForm.freeAppointmentsPerUser}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d+$/.test(v))
                    setGovForm({ ...govForm, freeAppointmentsPerUser: v });
                }}
                placeholder="0"
              />
              <Form.Text className="text-muted">
                Max free appointments each user can book. 0 = none.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Counselling Fee (₹)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={govForm.counsellingCharge}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                    setGovForm({ ...govForm, counsellingCharge: v });
                }}
                placeholder="0"
              />
              <Form.Text className="text-muted">
                Amount deducted from user wallet when free appointments are
                exhausted. 0 = paid counselling disabled
                (FREE_APPOINTMENT_LIMIT_REACHED).
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Check
                type="switch"
                id="isWithdrawalEnabled"
                label="Enable Withdrawal"
                checked={!!govForm.isWithdrawalEnabled}
                onChange={(e) =>
                  setGovForm({
                    ...govForm,
                    isWithdrawalEnabled: e.target.checked,
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Admin Withdrawal Surcharge %</Form.Label>
              <Form.Control
                type="text"
                value={govForm.adminWithdrawalSurchargePercent}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d{0,2}$/.test(v)) {
                    setGovForm({
                      ...govForm,
                      adminWithdrawalSurchargePercent: v,
                    });
                  }
                }}
                placeholder="0"
              />
              <Form.Text className="text-muted">
                Integer only, 0–99. Applied as admin withdrawal surcharge.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowGovModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <VerificationConfirmModal
        show={showGovConfirm}
        handleClose={() => setShowGovConfirm(false)}
        handleConfirm={(txn_password) => {
          const data = {
            configVersion,
            txn_password,
          };
          if (govForm.maxAdminAdjustAmount !== "") {
            data.maxAdminAdjustAmount = parseInt(
              govForm.maxAdminAdjustAmount,
              10,
            );
          }
          if (govForm.mainMinWithdrawal !== "") {
            data.mainMinWithdrawal = parseFloat(govForm.mainMinWithdrawal);
          } else {
            data.mainMinWithdrawal = null;
          }
          if (govForm.mainMaxWithdrawal !== "") {
            data.mainMaxWithdrawal = parseFloat(govForm.mainMaxWithdrawal);
          } else {
            data.mainMaxWithdrawal = null;
          }
          if (govForm.maxUserTransactionsPerDay !== "") {
            data.maxUserTransactionsPerDay = parseInt(
              govForm.maxUserTransactionsPerDay,
              10,
            );
          } else {
            data.maxUserTransactionsPerDay = null;
          }
          if (govForm.freeAppointmentsPerUser !== "") {
            data.freeAppointmentsPerUser = parseInt(
              govForm.freeAppointmentsPerUser,
              10,
            );
          }
          if (govForm.counsellingCharge !== "") {
            data.counsellingCharge = parseFloat(govForm.counsellingCharge);
          }
          data.isWithdrawalEnabled = !!govForm.isWithdrawalEnabled;
          if (govForm.adminWithdrawalSurchargePercent !== "") {
            data.adminWithdrawalSurchargePercent = parseInt(
              govForm.adminWithdrawalSurchargePercent,
              10,
            );
          }
          updateGovernanceSettings(data);
          setShowGovConfirm(false);
        }}
        title="Confirm"
        body="Enter your transaction password to update governance settings."
        submitBtnText="Update"
      />

      {/* Level Form Modal */}
      <Modal show={showLevelModal} onHide={closeLevelModal}>
        <Modal.Header closeButton>
          <Modal.Title>{levelEditId ? "Edit Level" : "Add Level"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleLevelSubmit}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Level Number</Form.Label>
              <Form.Control
                type="text"
                value={
                  levelEditId
                    ? `Level ${levelForm.levelNumber}`
                    : levelForm.levelNumber
                      ? `Level ${levelForm.levelNumber} (next in sequence)`
                      : "-"
                }
                readOnly
                disabled
                className="bg-light"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Commission % *</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={levelForm.commissionPercent}
                onChange={(e) =>
                  setLevelForm({
                    ...levelForm,
                    commissionPercent: e.target.value,
                  })
                }
                required
              />
            </Form.Group>
            <Errors current_key="commissionPercent" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeLevelModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {levelEditId ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Rank Form Modal */}
      <Modal show={showRankModal} onHide={closeRankModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{rankEditId ? "Edit Rank" : "Add Rank"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRankSubmit}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Rank Code</Form.Label>
              <Form.Control
                type="text"
                value={
                  rankEditId
                    ? (ranks.find((r) => String(r._id) === String(rankEditId))
                        ?.rankCode ?? "-")
                    : nextRankCode
                }
                readOnly
                disabled
                className="bg-light"
              />
              <Form.Text className="text-muted">
                Auto sequential. Required Rank Code = Rank Code - 1 (null for
                Rank 1).
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                value={rankForm.name}
                onChange={(e) =>
                  setRankForm({ ...rankForm, name: e.target.value })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Commission % *</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={rankForm.commissionPercent}
                onChange={(e) =>
                  setRankForm({
                    ...rankForm,
                    commissionPercent: e.target.value,
                  })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Self Sale Required</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={rankForm.selfSaleRequired}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                    setRankForm({ ...rankForm, selfSaleRequired: v });
                }}
                onBlur={() => {
                  if (
                    rankForm.selfSaleRequired !== "" &&
                    !isNaN(parseFloat(rankForm.selfSaleRequired))
                  ) {
                    setRankForm({
                      ...rankForm,
                      selfSaleRequired: formatMoney2Dec(
                        rankForm.selfSaleRequired,
                      ),
                    });
                  }
                }}
                placeholder="0"
              />
              <Form.Text className="text-muted">
                Optional. When provided, must be &gt;= 0.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Team Size Required *</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={rankForm.teamSizeRequired}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                    setRankForm({ ...rankForm, teamSizeRequired: v });
                }}
                onBlur={() => {
                  if (
                    rankForm.teamSizeRequired !== "" &&
                    !isNaN(parseFloat(rankForm.teamSizeRequired))
                  ) {
                    setRankForm({
                      ...rankForm,
                      teamSizeRequired: formatMoney2Dec(
                        rankForm.teamSizeRequired,
                      ),
                    });
                  }
                }}
                placeholder="0"
              />
              <Form.Text className="text-muted">
                Total downline count required for all ranks.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Required Rank Count</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={rankForm.requiredRankCount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                    setRankForm({ ...rankForm, requiredRankCount: v });
                }}
                onBlur={() => {
                  if (
                    rankForm.requiredRankCount !== "" &&
                    !isNaN(parseFloat(rankForm.requiredRankCount))
                  ) {
                    setRankForm({
                      ...rankForm,
                      requiredRankCount: formatMoney2Dec(
                        rankForm.requiredRankCount,
                      ),
                    });
                  }
                }}
                placeholder="0"
              />
              <Form.Text className="text-muted">
                How many of required rank must exist in downline. Admin
                editable.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Monthly Target</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={rankForm.monthlyTarget}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                    setRankForm({ ...rankForm, monthlyTarget: v });
                }}
                onBlur={() => {
                  if (
                    rankForm.monthlyTarget !== "" &&
                    !isNaN(parseFloat(rankForm.monthlyTarget))
                  ) {
                    setRankForm({
                      ...rankForm,
                      monthlyTarget: formatMoney2Dec(rankForm.monthlyTarget),
                    });
                  }
                }}
                placeholder="0"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Capping</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={rankForm.capping}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                    setRankForm({ ...rankForm, capping: v });
                }}
                onBlur={() => {
                  if (
                    rankForm.capping !== "" &&
                    !isNaN(parseFloat(rankForm.capping))
                  ) {
                    setRankForm({
                      ...rankForm,
                      capping: formatMoney2Dec(rankForm.capping),
                    });
                  }
                }}
                placeholder="0"
              />
              <Form.Text className="text-muted">
                Maximum payout allowed for this rank.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Required Designations</Form.Label>
              <div className="border rounded p-2 bg-light">
                {(rankForm.requiredDesignations || []).map((rd, idx) => (
                  <Row key={idx} className="mb-2 align-items-center">
                    <Col md={5}>
                      <Form.Select
                        value={rd.designationCode ?? ""}
                        onChange={(e) =>
                          updateRequiredDesignationRow(
                            idx,
                            "designationCode",
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                      >
                        <option value="">Select designation</option>
                        {designations.map((d) => (
                          <option key={d._id} value={d.designationCode}>
                            {d.designationCode} - {d.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <Form.Control
                        type="number"
                        min="1"
                        value={rd.minCount ?? 1}
                        onChange={(e) =>
                          updateRequiredDesignationRow(
                            idx,
                            "minCount",
                            e.target.value,
                          )
                        }
                        placeholder="minCount"
                      />
                    </Col>
                    <Col md={2}>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeRequiredDesignationRow(idx)}
                      >
                        Remove
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={addRequiredDesignationRow}
                >
                  + Add Designation Requirement
                </Button>
              </div>
              <Form.Text className="text-muted">
                Minimum count of users with each designation in downline.
                minCount &gt;= 1. No duplicates.
              </Form.Text>
            </Form.Group>
            <Errors current_key="rankName" />
            <Errors current_key="rankCommission" />
            <Errors current_key="rankSelfSale" />
            <Errors current_key="rankTeamSize" />
            <Errors current_key="rankRequiredRankCount" />
            <Errors current_key="rankMonthlyTarget" />
            <Errors current_key="rankCapping" />
            <Errors current_key="rankRequiredDesignations" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeRankModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {rankEditId ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Rank Confirm Modal */}
      <VerificationConfirmModal
        show={showRankConfirmModal}
        handleClose={() => {
          setShowRankConfirmModal(false);
          setPendingRankData(null);
        }}
        handleConfirm={handleRankConfirm}
        title="Confirm"
        body="Enter your transaction password to confirm."
        submitBtnText="Confirm"
      />

      {/* Delete Rank Confirm Modal */}
      <VerificationConfirmModal
        show={showDeleteRankConfirm}
        handleClose={() => {
          setShowDeleteRankConfirm(false);
          setDeleteRankId(null);
        }}
        handleConfirm={handleDeleteRankConfirm}
        title="Delete Rank"
        body="Enter your transaction password to delete this rank."
        submitBtnText="Delete"
      />

      {/* Level Confirm Modal */}
      <VerificationConfirmModal
        show={showLevelConfirmModal}
        handleClose={() => {
          setShowLevelConfirmModal(false);
          setPendingLevelData(null);
        }}
        handleConfirm={handleLevelConfirm}
        title="Confirm"
        body="Enter your transaction password to confirm."
        submitBtnText="Confirm"
      />

      {/* Delete Level Confirm Modal */}
      <VerificationConfirmModal
        show={showDeleteLevelConfirm}
        handleClose={() => {
          setShowDeleteLevelConfirm(false);
          setDeleteLevelId(null);
        }}
        handleConfirm={handleDeleteLevelConfirm}
        title="Delete Level"
        body="Enter your transaction password to delete this level."
        submitBtnText="Delete"
      />

      {/* Club Form Modal */}
      <Modal show={showClubModal} onHide={closeClubModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{clubEditId ? "Edit Club" : "Add Club"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleClubSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={clubForm.name}
                    onChange={(e) =>
                      setClubForm({ ...clubForm, name: e.target.value })
                    }
                    required
                  />
                  <Form.Text className="text-muted">
                    walletKey auto-derived from name (uppercase, spaces to _)
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Commission % *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={clubForm.commissionPercent}
                    onChange={(e) =>
                      setClubForm({
                        ...clubForm,
                        commissionPercent: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Min Withdrawal</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={clubForm.minWithdrawal}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                        setClubForm({ ...clubForm, minWithdrawal: v });
                    }}
                    placeholder="Empty = unlimited"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Max Withdrawal</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={clubForm.maxWithdrawal}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                        setClubForm({ ...clubForm, maxWithdrawal: v });
                    }}
                    placeholder="Empty = unlimited"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Minimum Rank Code</Form.Label>
                  <Form.Select
                    value={clubForm.minimumRankCode}
                    onChange={(e) =>
                      setClubForm({
                        ...clubForm,
                        minimumRankCode: e.target.value,
                      })
                    }
                  >
                    <option value="">None (no rank restriction)</option>
                    {[...ranks]
                      .sort((a, b) => (a.rankCode || 0) - (b.rankCode || 0))
                      .map((r) => (
                        <option key={r._id} value={r.rankCode}>
                          {r.rankCode} - {r.name || ""}
                        </option>
                      ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    User must have rankCode &gt;= this value. Null = no
                    restriction.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Self Sale Required</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={clubForm.selfSaleRequired}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                        setClubForm({ ...clubForm, selfSaleRequired: v });
                    }}
                    onBlur={() => {
                      if (
                        clubForm.selfSaleRequired !== "" &&
                        !isNaN(parseFloat(clubForm.selfSaleRequired))
                      ) {
                        setClubForm({
                          ...clubForm,
                          selfSaleRequired: formatMoney2Dec(
                            clubForm.selfSaleRequired,
                          ),
                        });
                      }
                    }}
                    placeholder="0"
                  />
                  <Form.Text className="text-muted">
                    Default 0. If 0, ignore in eligibility.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Monthly Target</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={clubForm.monthlyTarget}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                        setClubForm({ ...clubForm, monthlyTarget: v });
                    }}
                    onBlur={() => {
                      if (
                        clubForm.monthlyTarget !== "" &&
                        !isNaN(parseFloat(clubForm.monthlyTarget))
                      ) {
                        setClubForm({
                          ...clubForm,
                          monthlyTarget: formatMoney2Dec(
                            clubForm.monthlyTarget,
                          ),
                        });
                      }
                    }}
                    placeholder="0"
                  />
                  <Form.Text className="text-muted">
                    Complete downline monthly sale. Default 0. If 0, ignore.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Capping</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={clubForm.capping}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                        setClubForm({ ...clubForm, capping: v });
                    }}
                    onBlur={() => {
                      if (
                        clubForm.capping !== "" &&
                        !isNaN(parseFloat(clubForm.capping))
                      ) {
                        setClubForm({
                          ...clubForm,
                          capping: formatMoney2Dec(clubForm.capping),
                        });
                      }
                    }}
                    placeholder="0"
                  />
                  <Form.Text className="text-muted">
                    Max payout allowed. 0 = no cap.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group className="mb-2">
                  <Form.Check
                    type="checkbox"
                    id="clubIsAdminOnly"
                    label="Admin Only"
                    checked={clubForm.isAdminOnly}
                    onChange={(e) =>
                      setClubForm({
                        ...clubForm,
                        isAdminOnly: e.target.checked,
                      })
                    }
                  />
                  <Form.Text className="text-muted">
                    If checked: club excluded from user eligibility. Still
                    included in commission 100% cap.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Errors current_key="name" />
            <Errors current_key="commissionPercent" />
            <Errors current_key="minWithdrawal" />
            <Errors current_key="maxWithdrawal" />
            <Errors current_key="minimumRankCode" />
            <Errors current_key="selfSaleRequired" />
            <Errors current_key="monthlyTarget" />
            <Errors current_key="capping" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeClubModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {clubEditId ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Club Confirm Modal */}
      <VerificationConfirmModal
        show={showClubConfirmModal}
        handleClose={() => {
          setShowClubConfirmModal(false);
          setPendingClubData(null);
        }}
        handleConfirm={handleClubConfirm}
        title="Confirm"
        body="Enter your transaction password to confirm."
        submitBtnText="Confirm"
      />

      {/* Delete Club Confirm Modal */}
      <VerificationConfirmModal
        show={showDeleteClubConfirm}
        handleClose={() => {
          setShowDeleteClubConfirm(false);
          setDeleteClubId(null);
        }}
        handleConfirm={handleDeleteClubConfirm}
        title="Delete Club"
        body="Enter your transaction password to delete this club."
        submitBtnText="Delete"
      />

      {/* Designation Form Modal */}
      <Modal
        show={showDesignationModal}
        onHide={closeDesignationModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {designationEditId ? "Edit Designation" : "Add Designation"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleDesignationSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Designation Code</Form.Label>
                  <Form.Control
                    type="text"
                    value={
                      designationEditId
                        ? (designations.find(
                            (d) => String(d._id) === String(designationEditId),
                          )?.designationCode ?? "-")
                        : designations.length > 0
                          ? Math.max(
                              ...designations.map(
                                (d) => d.designationCode || 0,
                              ),
                            ) + 1
                          : 1
                    }
                    readOnly
                    disabled
                    className="bg-light"
                  />
                  <Form.Text className="text-muted">
                    Auto sequential. Not editable.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={designationForm.name}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Commission % *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={designationForm.commissionPercent}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        commissionPercent: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Required Designation Code</Form.Label>
                  <Form.Select
                    value={designationForm.requiredDesignationCode}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        requiredDesignationCode: e.target.value,
                      })
                    }
                  >
                    <option value="">None</option>
                    {designations
                      .filter(
                        (d) =>
                          !designationEditId ||
                          d.designationCode <
                            (designations.find(
                              (x) =>
                                String(x._id) === String(designationEditId),
                            )?.designationCode ?? 999),
                      )
                      .sort(
                        (a, b) =>
                          (a.designationCode || 0) - (b.designationCode || 0),
                      )
                      .map((d) => (
                        <option key={d._id} value={d.designationCode}>
                          {d.designationCode} - {d.name}
                        </option>
                      ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Required Designation Count</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={designationForm.requiredDesignationCount}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        requiredDesignationCount: e.target.value,
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Self Sale Required</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={designationForm.selfSaleRequired}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        selfSaleRequired: e.target.value,
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Team Size Required</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={designationForm.teamSizeRequired}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        teamSizeRequired: e.target.value,
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Monthly Target</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={designationForm.monthlyTarget}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        monthlyTarget: e.target.value,
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Free Session Count</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={designationForm.freeSessionCount}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        freeSessionCount: e.target.value,
                      })
                    }
                  />
                  <Form.Text className="text-muted">Default: 0</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>
                    Max Sessions Per Day <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={designationForm.maxSessionsPerDay}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        maxSessionsPerDay: e.target.value,
                      })
                    }
                  />
                  <Form.Text className="text-muted">Required, min 1</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Check
                    type="checkbox"
                    id="designationIsActive"
                    label="Active"
                    checked={designationForm.isActive}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        isActive: e.target.checked,
                      })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeDesignationModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {designationEditId ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <VerificationConfirmModal
        show={showDesignationConfirmModal}
        handleClose={() => {
          setShowDesignationConfirmModal(false);
          setPendingDesignationData(null);
        }}
        handleConfirm={handleDesignationConfirm}
        title="Confirm"
        body="Enter your transaction password to confirm."
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showDeleteDesignationConfirm}
        handleClose={() => {
          setShowDeleteDesignationConfirm(false);
          setDeleteDesignationId(null);
        }}
        handleConfirm={handleDeleteDesignationConfirm}
        title="Delete Designation"
        body="Enter your transaction password to delete this designation."
        submitBtnText="Delete"
      />
    </Container>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  adminWalletSettings: state.adminWalletSettings || {},
});

export default connect(mapStateToProps, {
  setErrorsList,
  removeErrors,
  getWalletSettings,
  updateRegistrationFee,
  updateRegistrationFeeEditable,
  updateGovernanceSettings,
  addLevel,
  updateLevel,
  deleteLevel,
  addRank,
  updateRank,
  deleteRank,
  addClub,
  updateClub,
  deleteClub,
  addDesignation,
  updateDesignation,
  deleteDesignation,
  resetComponentStore,
  updateAdminSurcharge,
})(WalletSettings);
