export const ROOT_MEMBER_ID = "G999999999";
export const DEFAULT_PAGE_SIZE = 20;

/** Shared initial params for CustomDataTable - use with useState(initialSortingParams) */
export const initialSortingParams = {
  limit: DEFAULT_PAGE_SIZE,
  page: 1,
  orderBy: "displayOrder",
  ascending: "asc",
  query: "",
};

/** Override specific fields if needed: getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }) */
export const getInitialSortingParams = (overrides = {}) => ({
  ...initialSortingParams,
  ...overrides,
});

export const PAGE_SIZE_OPTIONS = [
  {
    text: "10",
    page: 10,
  },
  {
    text: "20",
    page: 20,
  },
  {
    text: "50",
    page: 50,
  },
  {
    text: "100",
    page: 100,
  },
];
