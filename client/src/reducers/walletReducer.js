import {
  WALLET_DETAILS_REQUEST,
  WALLET_DETAILS_SUCCESS,
  WALLET_DETAILS_ERROR,
  WALLET_TRANSFER_REQUEST,
  WALLET_TRANSFER_SUCCESS,
  WALLET_TRANSFER_ERROR,
  WALLET_CLUB_TRANSFER_REQUEST,
  WALLET_CLUB_TRANSFER_SUCCESS,
  WALLET_CLUB_TRANSFER_ERROR,
  WALLET_TRANSACTIONS_REQUEST,
  WALLET_TRANSACTIONS_SUCCESS,
  WALLET_TRANSACTIONS_ERROR,
  WALLET_LEVEL_INCOME_REQUEST,
  WALLET_LEVEL_INCOME_SUCCESS,
  WALLET_LEVEL_INCOME_ERROR,
  SET_APPLIED_PARAMS_WALLET_TRANSACTIONS,
  WALLET_CLUB_INFO_REQUEST,
  WALLET_CLUB_INFO_SUCCESS,
  WALLET_CLUB_INFO_ERROR,
} from "@src/actions/walletActions";

const initialState = {
  mainBalance: 0,
  clubBalances: [],
  availableClubs: [],
  loadingDetails: false,
  loadingTransfer: false,
  loadingClubTransfer: false,
  loadingTransactions: false,
  transactions: [],
  pagination: {},
  totalCr: "0.00",
  totalDr: "0.00",
  appliedParamsWalletTransactions: null,
  levelIncomeTransactions: [],
  levelIncomePagination: {},
  loadingLevelIncome: false,
  error: null,
  clubInfo: [],
  totalClubIncomeThisMonth: "0.00",
  clubBenefitCalculation: null,
  loadingClubInfo: false,
};

const walletReducer = (state = initialState, action) => {
  switch (action.type) {
    case WALLET_DETAILS_REQUEST:
      return { ...state, loadingDetails: true, error: null };
    case WALLET_DETAILS_SUCCESS:
      return {
        ...state,
        loadingDetails: false,
        mainBalance: action.payload?.mainBalance ?? 0,
        clubBalances: action.payload?.clubBalances ?? [],
        availableClubs: action.payload?.availableClubs ?? [],
        error: null,
      };
    case WALLET_DETAILS_ERROR:
      return { ...state, loadingDetails: false };
    case WALLET_TRANSFER_REQUEST:
      return { ...state, loadingTransfer: true };
    case WALLET_TRANSFER_SUCCESS:
    case WALLET_TRANSFER_ERROR:
      return { ...state, loadingTransfer: false };
    case WALLET_CLUB_TRANSFER_REQUEST:
      return { ...state, loadingClubTransfer: true };
    case WALLET_CLUB_TRANSFER_SUCCESS:
    case WALLET_CLUB_TRANSFER_ERROR:
      return { ...state, loadingClubTransfer: false };
    case WALLET_TRANSACTIONS_REQUEST:
      return { ...state, loadingTransactions: true };
    case WALLET_TRANSACTIONS_SUCCESS:
      return {
        ...state,
        loadingTransactions: false,
        transactions: action.payload?.transactions ?? [],
        pagination: action.payload?.pagination ?? {},
        totalCr: action.payload?.totalCr ?? "0.00",
        totalDr: action.payload?.totalDr ?? "0.00",
      };
    case WALLET_TRANSACTIONS_ERROR:
      return { ...state, loadingTransactions: false };
    case WALLET_LEVEL_INCOME_REQUEST:
      return { ...state, loadingLevelIncome: true };
    case WALLET_LEVEL_INCOME_SUCCESS:
      return {
        ...state,
        loadingLevelIncome: false,
        levelIncomeTransactions: action.payload?.transactions ?? [],
        levelIncomePagination: action.payload?.pagination ?? {},
      };
    case WALLET_LEVEL_INCOME_ERROR:
      return { ...state, loadingLevelIncome: false };
    case SET_APPLIED_PARAMS_WALLET_TRANSACTIONS:
      return { ...state, appliedParamsWalletTransactions: action.payload };
    case WALLET_CLUB_INFO_REQUEST:
      return { ...state, loadingClubInfo: true };
    case WALLET_CLUB_INFO_SUCCESS:
      return {
        ...state,
        loadingClubInfo: false,
        clubInfo: action.payload?.clubs ?? [],
        totalClubIncomeThisMonth:
          action.payload?.totalClubIncomeThisMonth ?? "0.00",
        clubBenefitCalculation: action.payload?.clubBenefitCalculation ?? null,
      };
    case WALLET_CLUB_INFO_ERROR:
      return { ...state, loadingClubInfo: false };
    default:
      return state;
  }
};

export default walletReducer;
