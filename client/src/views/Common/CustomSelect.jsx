import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import axios from "axios";
import { useSelector } from "react-redux";

const CustomSelect = ({
  value,
  onChange,
  loadOptions,
  isCreatable = false,
  isDisabled = false,
  isRequired = false,
  placeholder = "Select...",
  error = null,
  className = "",
  cacheOptions = false,
  defaultOptions = false,
  onInputChange = null,
  filterOption = null,
  noOptionsMessage = null,
  formatOptionLabel = null,
  /** Typing and selected label display use uppercase (e.g. Address Details) */
  inputUppercase = false,
}) => {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const loadOptionsRef = useRef(loadOptions);

  useEffect(() => {
    loadOptionsRef.current = loadOptions;
  }, [loadOptions]);

  const fetchOptions = useCallback(async () => {
    const currentLoadOptions = loadOptionsRef.current;
    if (!currentLoadOptions) return;

    setIsLoading(true);
    try {
      const response = await currentLoadOptions();
      let optionsData = [];
      
      if (response && response.data && Array.isArray(response.data)) {
        optionsData = response.data;
      } else if (response && Array.isArray(response)) {
        optionsData = response;
      } else if (response && response.response && Array.isArray(response.response)) {
        optionsData = response.response;
      }
      
      setOptions(optionsData);
    } catch (error) {
      console.error("Error loading options:", error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load once when enabled (first paint or Edit turned on), not when loadOptions identity changes.
  const prevDisabledRef = useRef(undefined);
  useEffect(() => {
    if (!loadOptionsRef.current) return;
    const wasDisabled = prevDisabledRef.current;
    prevDisabledRef.current = isDisabled;

    if (isDisabled) return;

    const initialOpen = wasDisabled === undefined;
    const turnedOn = wasDisabled === true;
    if (initialOpen || turnedOn) {
      fetchOptions();
    }
  }, [isDisabled, fetchOptions]);

  const handleChange = (selectedOption) => {
    onChange(selectedOption);
  };

  const handleCreate = async (inputValue) => {
    if (!isCreatable) return null;

    setIsLoading(true);
    try {
      if (onInputChange) {
        await onInputChange(inputValue, { action: "create-option" });
        // Refresh options after creation
        if (loadOptions) {
          try {
            const response = await loadOptions();
            let optionsData = [];
            
            if (response && response.data && Array.isArray(response.data)) {
              optionsData = response.data;
            } else if (response && Array.isArray(response)) {
              optionsData = response;
            } else if (response && response.response && Array.isArray(response.response)) {
              optionsData = response.response;
            }
            
            setOptions(optionsData);
          } catch (error) {
            console.error("Error refreshing options:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error creating option:", error);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const handleInputChange = useCallback(
    (newValue, actionMeta) => {
      let v = newValue;
      if (inputUppercase && actionMeta?.action === "input-change") {
        v = String(newValue ?? "").toUpperCase();
      }
      setInputValue(v);
      if (
        onInputChange &&
        actionMeta?.action !== "input-blur" &&
        actionMeta?.action !== "menu-close"
      ) {
        onInputChange(v, actionMeta);
      }
    },
    [inputUppercase, onInputChange],
  );

  const customStyles = useMemo(
    () => ({
      control: (provided, state) => ({
        ...provided,
        padding: "5px 0",
        background: "var(--theme-surface, #190100)",
        color: "var(--theme-primary, #ffe082)",
        borderColor: error
          ? "rgba(220, 53, 69, 0.5)"
          : state.isFocused
          ? "rgba(var(--theme-primary-rgb, 255, 224, 130), 0.5)"
          : "rgba(var(--theme-primary-rgb, 255, 224, 130), 0.3)",
        boxShadow: error
          ? "0 0 0 1px rgba(220, 53, 69, 0.3)"
          : state.isFocused
          ? "0 0 0 1px rgba(var(--theme-primary-rgb, 255, 224, 130), 0.3)"
          : "none",
        "&:hover": {
          borderColor: error
            ? "rgba(220, 53, 69, 0.5)"
            : "rgba(var(--theme-primary-rgb, 255, 224, 130), 0.5)",
        },
      }),
      option: (provided, state) => ({
        ...provided,
        color:
          state.isSelected || state.isFocused
            ? "var(--theme-surface, #190100)"
            : "var(--theme-primary, #ffe082)",
        background:
          state.isSelected || state.isFocused
            ? "var(--theme-primary, #ffe082)"
            : "var(--theme-surface, #190100)",
        ...(inputUppercase ? { textTransform: "uppercase" } : {}),
      }),
      singleValue: (provided) => ({
        ...provided,
        color: "var(--theme-primary, #ffe082)",
        ...(inputUppercase ? { textTransform: "uppercase" } : {}),
      }),
      placeholder: (provided) => ({
        ...provided,
        color: "var(--theme-text, #777777)",
      }),
      input: (provided) => ({
        ...provided,
        color: "var(--theme-primary, #ffe082)",
        ...(inputUppercase ? { textTransform: "uppercase" } : {}),
      }),
      dropdownIndicator: (provided) => ({
        ...provided,
        color: "var(--theme-primary, #ffe082)",
      }),
      clearIndicator: (provided) => ({
        ...provided,
        color: "var(--theme-primary, #ffe082)",
        cursor: "pointer",
        "&:hover": {
          color: "var(--theme-primary, #ffe082)",
        },
      }),
      menu: (provided) => ({
        ...provided,
        background: "var(--theme-surface, #190100)",
        zIndex: 9999,
      }),
      menuList: (provided) => ({
        ...provided,
        background: "var(--theme-surface, #190100)",
      }),
      menuPortal: (provided) => ({
        ...provided,
        zIndex: 9999,
      }),
    }),
    [error, inputUppercase],
  );

  const SelectComponent = isCreatable ? CreatableSelect : Select;

  const formatCreateLabel = (inputValue) => `Create "${inputValue}"`;

  const defaultFormatOptionLabel = ({ label, status }) => {
    if (formatOptionLabel) {
      return formatOptionLabel({ label, status });
    }
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
        {...(inputUppercase ? { inputValue } : {})}
        onInputChange={handleInputChange}
        filterOption={filterOption || ((option, inputValue) => {
          if (!inputValue) return true;
          const searchValue = inputValue.toLowerCase();
          return option.label?.toLowerCase().includes(searchValue);
        })}
        noOptionsMessage={noOptionsMessage || (() => "No options available")}
        formatOptionLabel={defaultFormatOptionLabel}
        formatCreateLabel={formatCreateLabel}
        cacheOptions={cacheOptions}
        defaultOptions={defaultOptions}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      />
      {error && <div className="invalid-feedback d-block">{error}</div>}
      {isRequired && !value && (
        <div className="text-danger small mt-1">This field is required</div>
      )}
    </div>
  );
};

export default CustomSelect;
