export const capitalizeFirst = (text) => {
  if (!text) return "";
  const [first, ...rest] = text;
  return first.toUpperCase() + rest.join("");
};

export const capitalizeAll = (text) => {
  if (!text) return "";
  return text
    .split("")
    .map((char) => char.toUpperCase())
    .join("");
};

export const isAdmin = (user) => {
  return user && (user.role === 2 || (typeof user.role === "number" && user.role === 2)) ? true : false;
};

export const isSubAdmin = (user) => {
  return user && (user.role === 3 || (typeof user.role === "number" && user.role === 3) || user.isSubAdmin) ? true : false;
};

export const isAdminOrSubAdmin = (user) => {
  return isAdmin(user) || isSubAdmin(user);
};

export const handleTableChange = (
  type,
  searchText,
  sortingParams,
  setUserParams,
  searchFields
) => {
  const { limit, page } = sortingParams;
  let params = {
    limit: limit,
    page: type === "search" ? 1 : page ? page : 1,
  };

  let filters = [];
  if (type === "search") {
    if (searchText.length > 0) {
      filters = sortingParams.filters.includes(type)
        ? sortingParams.filters
        : [...sortingParams.filters, type];

      const query = searchFields.reduce((acc, field) => {
        acc[field.name] = { value: searchText, type: field.type };
        return acc;
      }, {});

      params = {
        ...params,
        query: {
          ...sortingParams.query,
          [type]: query,
        },
        filters,
      };
    } else {
      filters = sortingParams.filters.filter((item) => item !== type);
      const temp = {};
      params = {
        ...sortingParams,
        filters,
      };
      for (const key in params.query) {
        if (key === type) continue;
        temp[key] = params.query[key];
      }
      params.query = temp;
    }
  }

  setUserParams(params);
};

export const formatIndianNumber = (number) => {
  if (number == null) return "0";
  const raw = number?.$numberDecimal ?? number;
  const roundedNumber = Math.round(parseFloat(raw) * 100) / 100;

  const [integerPart, decimalPart] = roundedNumber.toString().split(".");

  const lastThreeDigits = integerPart.slice(-3);
  const otherDigits = integerPart.slice(0, -3);

  const formattedNumber =
    otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
    (otherDigits ? "," : "") +
    lastThreeDigits;

  // Always show 2 decimal places if there was a decimal part, otherwise no decimals
  if (decimalPart !== undefined) {
    const formattedDecimal = decimalPart.padEnd(2, "0").slice(0, 2);
    return formattedNumber + "." + formattedDecimal;
  }

  return formattedNumber;
};

/**
 * Normalize errors to always be an array
 * Handles both array and object error formats from backend
 * @param {Array|Object|string|undefined} errors - Error data from API response
 * @returns {Array} Array of error objects with msg and optional path
 */
export const normalizeErrors = (errors) => {
  if (!errors) return [];
  
  if (Array.isArray(errors)) {
    return errors;
  }
  
  if (typeof errors === 'object') {
    // If it's an object like { msg: "..." }, convert to array
    return [errors];
  }
  
  // If it's a string or other value, convert to array with msg property
  return [{ msg: String(errors) }];
};
