/**
 * Family Tree feature – copy and constants.
 * Keeps UI strings in one place for maintainability and i18n readiness.
 * Design: Single root node; senior-most member(s) at root; descendants attached under parent.
 */

/** Root initialization – exact English copy required in UI (per product spec). */
export const ROOT_INIT_DESCRIPTION =
  "This is the starting point of your family tree. You can add the most senior person here. The entire family hierarchy will be created under this root member. You are free to start from any generation based on your family structure.";

/** Loader messages shown during async family operations. */
export const FAMILY_LOADER_MESSAGES = {
  INITIALIZING: "Initializing family tree…",
  ADDING_MEMBER: "Adding family member…",
  LOADING_TREE: "Loading family tree…",
  LOADING: "Loading…",
};
