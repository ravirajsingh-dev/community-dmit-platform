import api from "@src/utils/axiosSetup";

export const getSliderBanners = async (options = {}) => {
  try {
    const config = {
      headers: { "Content-Type": "application/json" },
      ...options,
    };
    const res = await api.get(`/api/common/slider-banners`, config);
    const raw = res.data && res.data.status === true ? res.data.response : [];
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    if (
      err.name === "CanceledError" ||
      err.name === "AbortError" ||
      err.code === "ERR_CANCELED"
    ) {
      throw err;
    }
    console.error("Error fetching slider banners:", err);
    return [];
  }
};

export const getGalleryImages = async (category = "") => {
  try {
    const config = {
      headers: { "Content-Type": "application/json" },
      params: category ? { category } : {},
    };
    const res = await api.get(`/api/common/gallery`, config);
    return res.data && res.data.status === true ? res.data.response : [];
  } catch (err) {
    console.error("Error fetching gallery images:", err);
    return [];
  }
};

export const getVideos = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/videos`, config);
    return res.data && res.data.status === true ? res.data.response : [];
  } catch (err) {
    console.error("Error fetching videos:", err);
    return [];
  }
};

export const getNews = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/news`, config);
    return res.data && res.data.status === true ? res.data.response : [];
  } catch (err) {
    console.error("Error fetching news:", err);
    return [];
  }
};

export const getPDFs = async (type = "") => {
  try {
    const config = {
      headers: { "Content-Type": "application/json" },
      params: type ? { type } : {},
    };
    const res = await api.get(`/api/common/pdfs`, config);
    return res.data && res.data.status === true ? res.data.response : [];
  } catch (err) {
    console.error("Error fetching PDFs:", err);
    return [];
  }
};
