/**
 * Occupation dropdown and conditional fields for UserDetails.
 * Must match server OCCUPATION_VALUES and occupationDetails schema.
 */

export const OccupationOptions = [
  { label: "Student", value: "Student" },
  { label: "Government Job", value: "Government Job" },
  { label: "Private Job", value: "Private Job" },
  { label: "Business", value: "Business" },
];

/** Occupation value -> which occupationDetails fields to show (field key -> label) */
export const OccupationFieldConfig = {
  "Government Job": [
    { key: "department", label: "Department" },
    { key: "position", label: "Position / Post" },
    { key: "location", label: "Location" },
  ],
  "Private Job": [
    { key: "department", label: "Department" },
    { key: "position", label: "Position / Post" },
    { key: "location", label: "Location" },
  ],
  Business: [
    { key: "businessName", label: "Business Name" },
    { key: "businessType", label: "Business Type" },
    { key: "location", label: "Location" },
  ],
  Student: [],
};
