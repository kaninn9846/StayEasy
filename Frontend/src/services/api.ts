import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/users/",
});

// 🔐 Attach JWT token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ================= AUTH APIs =================
export const signupApi = (data: any) => API.post("register/", data);
export const loginApi = (data: any) => API.post("login/", data);
export const verifyEmailApi = (email: string, code: string) =>
  API.post("verify-email/", { email, code });
export const forgotPasswordApi = (email: string) =>
  API.post("forgot-password/", { email });
export const resetPasswordApi = (data: { token?: string; password: string; password2: string }) =>
  API.post("reset-password/", data);
export const getRecentActivity = async () => {
  try {
    const response = await API.get("recent-activity/");
    return response.data || [];
  } catch (error) {
    return [];
  }
};
export const getRefundRequests = async () => {
  try {
    const response = await API.get("landlord/refunds/");
    return response.data || [];
  } catch (error) {
    return [];
  }
};
export const getProfile = async () => {
  try {
    const response = await API.get("profile/");
    return response.data;
  } catch (error) {
    console.error("Profile fetch error:", error);
    throw error;
  }
};

export const updateProfile = async (data: any) => {
  try {
    const response = await API.put("profile/", data);
    return response.data;
  } catch (error) {
    console.error("Profile update error:", error);
    throw error;
  }
};

export const changePassword = async (data: { old_password: string; new_password: string }) => {
  try {
    const response = await API.post("change-password/", data);
    return response.data;
  } catch (error) {
    console.error("Password change error:", error);
    throw error;
  }
};

export const getKYCDetail = async () => {
  try {
    const response = await API.get("kyc/detail/");
    return response.data;
  } catch (error) {
    console.error("KYC detail fetch error:", error);
    return { status: "not_submitted" };
  }
};

// ================= KYC API =================
export const getKYCStatus = async () => {
  try {
    const response = await API.get("kyc/status/");
    return response.data;
  } catch (error) {
    console.error("KYC fetch error:", error);
    return null;
  }
};

export const submitKYC = async (formData: FormData) => {
  try {
    const response = await API.post("kyc/submit/", formData);
    return response.data;
  } catch (error: any) {
    console.error("KYC submit error:", error);
    console.error("KYC error response data:", JSON.stringify(error.response?.data));
    console.error("KYC error status:", error.response?.status);
    throw error;
  }
};

// ================= ADMIN KYC API =================
export const adminGetAllKYC = async (status?: string) => {
  try {
    const url = status ? `admin/kyc/?status=${status}` : "admin/kyc/";
    const response = await API.get(url);
    return response.data;
  } catch (error) {
    console.error("Admin KYC fetch error:", error);
    throw error;
  }
};

export const adminGetKYCDetail = async (id: number) => {
  try {
    const response = await API.get(`admin/kyc/${id}/`);
    return response.data;
  } catch (error) {
    console.error("KYC detail fetch error:", error);
    throw error;
  }
};

export const adminUpdateKYCStatus = async (id: number, status: 'approved' | 'rejected' | 'pending') => {
  try {
    const response = await API.patch(`admin/kyc/${id}/update-status/`, { status });
    return response.data;
  } catch (error) {
    console.error("KYC status update error:", error);
    throw error;
  }
};

export const adminGetKYCStats = async () => {
  try {
    const response = await API.get("admin/kyc/stats/");
    return response.data;
  } catch (error) {
    console.error("KYC stats fetch error:", error);
    throw error;
  }
};

// ================= PROPERTY APIs =================
export const getProperties = async (propertyType?: string) => {
  try {
    const url = propertyType ? `properties/?type=${propertyType}` : "properties/";
    const response = await API.get(url);
    return response.data;
  } catch (error) {
    console.error("Properties fetch error:", error);
    throw error;
  }
};

export const getPropertyDetail = async (id: number) => {
  try {
    const response = await API.get(`properties/${id}/`);
    return response.data;
  } catch (error) {
    console.error("Property detail fetch error:", error);
    throw error;
  }
};

export const createProperty = async (formData: FormData) => {
  try {
    const response = await API.post("property/add/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Property create error:", error);
    throw error;
  }
};

// Uses landlord endpoint for PATCH (for landlord-created properties)
export const updateProperty = async (id: number, data: FormData | any) => {
  try {
    const response = await API.patch(`landlord/properties/${id}/update/`, data);
    return response.data;
  } catch (error) {
    console.error("Property update error:", error);
    throw error;
  }
};

export const deleteProperty = async (id: number) => {
  try {
    const response = await API.delete(`landlord/properties/${id}/delete/`);
    return response.data;
  } catch (error) {
    console.error("Property delete error:", error);
    throw error;
  }
};

// ================= LANDLORD APIs =================
export const getLandlordProperties = async () => {
  try {
    const response = await API.get("landlord/properties/");
    return response.data;
  } catch (error) {
    console.error("Landlord properties fetch error:", error);
    throw error;
  }
};

export const getLandlordPropertyDetail = async (propertyId: number) => {
  try {
    const response = await API.get(`landlord/properties/${propertyId}/`);
    return response.data;
  } catch (error) {
    console.error("Landlord property detail fetch error:", error);
    throw error;
  }
};

export const createLandlordProperty = async (formData: FormData) => {
  try {
    const response = await API.post("landlord/properties/create/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Create property error:", error);
    throw error;
  }
};

export const updateLandlordProperty = async (propertyId: number, data: any) => {
  try {
    const response = await API.patch(`landlord/properties/${propertyId}/update/`, data);
    return response.data;
  } catch (error) {
    console.error("Update property error:", error);
    throw error;
  }
};

export const deleteLandlordProperty = async (propertyId: number) => {
  try {
    const response = await API.delete(`landlord/properties/${propertyId}/delete/`);
    return response.data;
  } catch (error) {
    console.error("Delete property error:", error);
    throw error;
  }
};

export const getLandlordPropertyBookings = async (propertyId: number) => {
  try {
    const response = await API.get(`landlord/properties/${propertyId}/bookings/`);
    return response.data;
  } catch (error) {
    console.error("Landlord property bookings fetch error:", error);
    throw error;
  }
};

export const getLandlordDashboard = async () => {
  try {
    const properties = await getLandlordProperties();
    const totalProperties = Array.isArray(properties) ? properties.length : 0;
    const availableProperties = Array.isArray(properties) 
      ? properties.filter((p: any) => p.available === true).length 
      : 0;
    
    let canAddProperty = false;
    try {
      const kyc = await getKYCStatus();
      canAddProperty = kyc?.status === 'approved';
    } catch {
      canAddProperty = false;
    }

    return {
      total_properties: totalProperties,
      available_properties: availableProperties,
      can_add_property: canAddProperty,
    };
  } catch (error) {
    console.error("Landlord dashboard fetch error:", error);
    throw error;
  }
};

// ================= ADMIN PROPERTY APIs =================
export const adminGetAllProperties = async (propertyType?: string, availableOnly?: boolean) => {
  try {
    let url = "admin/properties/";
    const params = new URLSearchParams();
    if (propertyType) params.append("type", propertyType);
    if (availableOnly) params.append("available", "true");
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await API.get(url);
    return response.data;
  } catch (error) {
    console.error("Admin properties fetch error:", error);
    throw error;
  }
};

// ================= BOOKING APIs =================
export const createBooking = async (propertyId: number, checkIn: string, checkOut: string, totalPrice: number) => {
  try {
    const response = await API.post("bookings/create/", {
      property: propertyId,
      check_in: checkIn,
      check_out: checkOut,
      total_price: totalPrice,
    });
    return response.data;
  } catch (error) {
    console.error("Booking create error:", error);
    throw error;
  }
};

export const getUserBookings = async () => {
  try {
    const response = await API.get("bookings/");
    return response.data;
  } catch (error) {
    console.error("User bookings fetch error:", error);
    throw error;
  }
};

export const getLandlordBookings = async () => {
  try {
    const response = await API.get("landlord/bookings/");
    return response.data;
  } catch (error) {
    console.error("Landlord bookings fetch error:", error);
    throw error;
  }
};

export const getBookingDetail = async (id: number) => {
  try {
    const response = await API.get(`bookings/${id}/`);
    return response.data;
  } catch (error) {
    console.error("Booking detail fetch error:", error);
    throw error;
  }
};

export const updateBooking = async (id: number, data: any) => {
  try {
    const response = await API.patch(`bookings/${id}/`, data);
    return response.data;
  } catch (error) {
    console.error("Booking update error:", error);
    throw error;
  }
};

export const cancelBooking = async (id: number) => {
  try {
    const response = await API.delete(`bookings/${id}/`);
    return response.data;
  } catch (error) {
    console.error("Booking cancel error:", error);
    throw error;
  }
};

// ================= FAVORITE APIs =================
export const getUserFavorites = async () => {
  try {
    const response = await API.get("favorites/");
    return response.data;
  } catch (error) {
    console.error("User favorites fetch error:", error);
    return [];
  }
};

export const addFavorite = async (propertyId: number) => {
  try {
    const response = await API.post("favorites/toggle/", {
      property: propertyId,
    });
    return response.data;
  } catch (error) {
    console.error("Add favorite error:", error);
    throw error;
  }
};

export const removeFavorite = async (propertyId: number) => {
  try {
    const response = await API.delete("favorites/toggle/", {
      data: { property_id: propertyId },
    });
    return response.data;
  } catch (error) {
    console.error("Remove favorite error:", error);
    throw error;
  }
};

// ================= VIEWED PROPERTY APIs =================
export const getViewedProperties = async () => {
  try {
    const response = await API.get("viewed-properties/");
    return response.data;
  } catch (error) {
    console.error("Viewed properties fetch error:", error);
    return [];
  }
};

export const trackPropertyView = async (propertyId: number) => {
  try {
    const response = await API.post("view-property/", {
      property_id: propertyId,
    });
    return response.data;
  } catch (error) {
    console.error("Track view error:", error);
    throw error;
  }
};

export default API;

// ================= MODERATION APIs =================
export const getSuspensionStatus = async () => {
  try {
    const response = await API.get("suspension-status/");
    return response.data;
  } catch (error) {
    return { is_suspended: false, suspension: null };
  }
};

export const getUserWarnings = async () => {
  try {
    const response = await API.get("warnings/");
    return response.data;
  } catch (error) {
    return { count: 0, results: [] };
  }
};

export const markWarningRead = async (warningId: number) => {
  try {
    const response = await API.post(`warnings/${warningId}/mark-read/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Admin moderation APIs
export const adminWarnUser = async (userId: number, data: { reason: string; custom_reason?: string; message: string }) => {
  try {
    const response = await API.post(`admin/users/${userId}/warn/`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const adminSuspendUser = async (userId: number, data: { reason: string; duration: string }) => {
  try {
    const response = await API.post(`admin/users/${userId}/suspend/`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const adminLiftSuspension = async (suspensionId: number) => {
  try {
    const response = await API.post(`admin/suspensions/${suspensionId}/lift/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const adminAddNote = async (userId: number, note: string) => {
  try {
    const response = await API.post(`admin/users/${userId}/note/`, { note });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const adminGetModerationHistory = async (userId: number) => {
  try {
    const response = await API.get(`admin/users/${userId}/moderation-history/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const adminTogglePropertyVisibility = async (propertyId: number, hide: boolean, reason?: string) => {
  try {
    const response = await API.post(`admin/properties/${propertyId}/toggle-visibility/`, { hide, reason });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// =====================================================
// RENTAL AGREEMENT APIS
// =====================================================

export const getAgreements = async () => {
  try {
    const response = await API.get('agreements/');
    return response.data.results || response.data || [];
  } catch (error) {
    return [];
  }
};

export const getAgreementDetail = async (id: number) => {
  try {
    const response = await API.get(`agreements/${id}/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const tenantSignAgreement = async (agreementId: number, signature: string, ipAddress?: string, deviceInfo?: string) => {
  try {
    const response = await API.post(`agreements/${agreementId}/sign-tenant/`, {
      signature,
      ip_address: ipAddress || '',
      device_info: deviceInfo || '',
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const landlordSignAgreement = async (agreementId: number, signature: string, ipAddress?: string, deviceInfo?: string) => {
  try {
    const response = await API.post(`agreements/${agreementId}/sign-landlord/`, {
      signature,
      ip_address: ipAddress || '',
      device_info: deviceInfo || '',
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const downloadAgreementPDF = async (agreementId: number) => {
  try {
    const response = await API.get(`agreements/${agreementId}/pdf/`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rental_agreement_${agreementId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to download PDF:', error);
    return false;
  }
};

// ================= NOTIFICATION APIs =================
export const getNotifications = async () => {
  try {
    const response = await API.get("notifications/");
    return response.data;
  } catch (error) {
    return [];
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const response = await API.get("notifications/unread-count/");
    return response.data;
  } catch (error) {
    return { unread_count: 0 };
  }
};

export const markNotificationRead = async (id: number) => {
  try {
    await API.patch(`notifications/${id}/`, { is_read: true });
  } catch (error) {
    console.error("Failed to mark notification read:", error);
  }
};

export const markAllNotificationsRead = async () => {
  try {
    await API.post("notifications/mark-all-read/");
  } catch (error) {
    console.error("Failed to mark all notifications read:", error);
  }
};

// ================= PAYMENT FAILURE INQUIRY =================
export const createPaymentFailureInquiry = async (bookingId: number) => {
  try {
    const response = await API.post("payment-failure-inquiry/", { booking_id: bookingId });
    return response.data;
  } catch (error) {
    throw error;
  }
};