import React, { useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

const AsyncCustomSelect = ({
  value,
  onChange,
  options = [],
  isLoading = false,
  isCreatable = false,
  isDisabled = false,
  isRequired = false,
  placeholder = "Select...",
  error = null,
  className = "",
  onInputChange = null,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleChange = (selectedOption) => {
    onChange(selectedOption);
  };

  const handleCreate = async (inputValue) => {
    if (!isCreatable) return null;
    if (onInputChange) {
      await onInputChange(inputValue, { action: "create-option" });
    }
    return null;
  };

  const handleInputChange = (newValue, actionMeta) => {
    setInputValue(newValue);
    if (onInputChange && actionMeta?.action !== "input-blur" && actionMeta?.action !== "menu-close") {
      onInputChange(newValue, actionMeta);
    }
  };

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      padding: "5px 0",
      background: "#fff",
      color: "#212529",
      borderColor: error
        ? "#dc3545"
        : state.isFocused
        ? "#80bdff"
        : "#ced4da",
      boxShadow: error
        ? "0 0 0 0.2rem rgba(220, 53, 69, 0.25)"
        : state.isFocused
        ? "0 0 0 0.2rem rgba(0, 123, 255, 0.25)"
        : "none",
      "&:hover": {
        borderColor: error
          ? "#dc3545"
          : "#80bdff",
      },
    }),
    option: (provided, state) => ({
      ...provided,
      color: state.isSelected || state.isFocused ? "#fff" : "#212529",
      background:
        state.isSelected || state.isFocused
          ? "#007bff"
          : "#fff",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#212529",
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#6c757d",
    }),
    input: (provided) => ({
      ...provided,
      color: "#212529",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "#6c757d",
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: "#6c757d",
      cursor: "pointer",
      "&:hover": {
        color: "#212529",
      },
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
  };

  const SelectComponent = isCreatable ? CreatableSelect : Select;

  const formatCreateLabel = (inputValue) => `Create "${inputValue}"`;

  const defaultFormatOptionLabel = ({ label, status }) => {
    return (
      <div className="d-flex justify-content-between align-items-center">
        <span>{label}</span>
        {status === "pending" && (
          <span className="badge bg-warning text-dark ms-2" style={{ fontSize: "0.7rem" }}>
            Pending
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <SelectComponent
        className="basic-single"
        classNamePrefix="select"
        value={value}
        onChange={handleChange}
        onCreateOption={isCreatable ? handleCreate : undefined}
        options={options}
        isLoading={isLoading}
        isDisabled={isDisabled}
        isClearable={!isRequired}
        isSearchable={true}
        placeholder={placeholder}
        styles={customStyles}
        onInputChange={handleInputChange}
        filterOption={(option, inputValue) => {
          if (!inputValue) return true;
          const searchValue = inputValue.toLowerCase();
          return option.label?.toLowerCase().includes(searchValue);
        }}
        noOptionsMessage={() => "No options available"}
        formatOptionLabel={defaultFormatOptionLabel}
        formatCreateLabel={formatCreateLabel}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      />
      {error && <div className="invalid-feedback d-block">{error}</div>}
      {isRequired && !value && (
        <div className="text-danger small mt-1">This field is required</div>
      )}
    </div>
  );
};

export default AsyncCustomSelect;
