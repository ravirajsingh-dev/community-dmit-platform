import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  countries: [],
  states: {},
  districts: {},
  villages: {},
  loadingCountries: false,
  loadingStates: {},
  loadingDistricts: {},
  loadingVillages: {},
};

const locationDropdownSlice = createSlice({
  name: "locationDropdown",
  initialState: initialState,
  reducers: {
    setCountries(state, action) {
      state.countries = action.payload;
      state.loadingCountries = false;
    },
    setStates(state, action) {
      const { countryId, data } = action.payload;
      state.states[countryId] = data;
      state.loadingStates[countryId] = false;
    },
    setDistricts(state, action) {
      const { stateId, data } = action.payload;
      state.districts[stateId] = data;
      state.loadingDistricts[stateId] = false;
    },
    setVillages(state, action) {
      const { districtId, data } = action.payload;
      state.villages[districtId] = data;
      state.loadingVillages[districtId] = false;
    },
    loadingCountries(state) {
      state.loadingCountries = true;
    },
    loadingStates(state, action) {
      state.loadingStates[action.payload] = true;
    },
    loadingDistricts(state, action) {
      state.loadingDistricts[action.payload] = true;
    },
    loadingVillages(state, action) {
      state.loadingVillages[action.payload] = true;
    },
    resetLocationDropdown(state) {
      return initialState;
    },
  },
});

export const {
  setCountries,
  setStates,
  setDistricts,
  setVillages,
  loadingCountries,
  loadingStates,
  loadingDistricts,
  loadingVillages,
  resetLocationDropdown,
} = locationDropdownSlice.actions;
export default locationDropdownSlice.reducer;
