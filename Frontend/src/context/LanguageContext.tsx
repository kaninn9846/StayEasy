import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'np';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

// Nepali translations
const translations: Translations = {
  // Navbar
  navbar_home: {
    en: 'Home',
    np: 'होम',
  },
  navbar_properties: {
    en: 'Properties',
    np: 'सम्पत्तिहरू',
  },
  navbar_bookings: {
    en: 'My Bookings',
    np: 'मेरो बुकिङ्‍हरू',
  },
  navbar_wishlist: {
    en: 'Wishlist',
    np: 'इच्छा सूची',
  },
  navbar_dashboard: {
    en: 'Dashboard',
    np: 'ड्यासबोर्ड',
  },
  navbar_profile: {
    en: 'Profile',
    np: 'प्रोफाइल',
  },
  navbar_logout: {
    en: 'Logout',
    np: 'लगआउट',
  },
  navbar_login: {
    en: 'Login',
    np: 'लगइन',
  },
  navbar_signup: {
    en: 'Sign Up',
    np: 'साइन अप',
  },

  // Profile Page
  profile_title: {
    en: 'Profile',
    np: 'प्रोफाइल',
  },
  profile_personal_info: {
    en: 'Personal Information',
    np: 'व्यक्तिगत जानकारी',
  },
  profile_login_security: {
    en: 'Login & Security',
    np: 'लगइन र सुरक्षा',
  },
  profile_preferences: {
    en: 'Languages & Currency',
    np: 'भाषा र मुद्रा',
  },
  profile_edit: {
    en: 'Edit',
    np: 'सम्पादन गर्नुहोस्',
  },
  profile_save: {
    en: 'Save',
    np: 'सेवा गर्नुहोस्',
  },
  profile_cancel: {
    en: 'Cancel',
    np: 'रद्द गर्नुहोस्',
  },
  profile_first_name: {
    en: 'First Name',
    np: 'पहिलो नाम',
  },
  profile_last_name: {
    en: 'Last Name',
    np: 'अन्तिम नाम',
  },
  profile_email: {
    en: 'Email',
    np: 'इमेल',
  },
  profile_phone: {
    en: 'Phone',
    np: 'फोन',
  },
  profile_address: {
    en: 'Address',
    np: 'ठेगाना',
  },
  profile_dob: {
    en: 'Date of Birth',
    np: 'जन्म मिति',
  },

  // Password Change
  password_change: {
    en: 'Change Password',
    np: 'पासवर्ड परिवर्तन गर्नुहोस्',
  },
  password_current: {
    en: 'Current Password',
    np: 'वर्तमान पासवर्ड',
  },
  password_new: {
    en: 'New Password',
    np: 'नयाँ पासवर्ड',
  },
  password_confirm: {
    en: 'Confirm New Password',
    np: 'नयाँ पासवर्ड पुष्टि गर्नुहोस्',
  },
  password_save: {
    en: 'Save Password',
    np: 'पासवर्ड सेवा गर्नुहोस्',
  },
  password_success: {
    en: 'Password changed successfully!',
    np: 'पासवर्ड सफलतापूर्वक परिवर्तन गरिएको!',
  },
  password_mismatch: {
    en: 'New passwords do not match.',
    np: 'नयाँ पासवर्ड मेल खाइरहेन।',
  },
  password_min_length: {
    en: 'New password must be at least 8 characters long.',
    np: 'नयाँ पासवर्ड कम्तीमा 8 वर्णको हुनुपर्छ।',
  },
  password_fill_all: {
    en: 'Please fill all fields.',
    np: 'कृपया सबै क्षेत्र भर्नुहोस्।',
  },

  // Language & Currency
  language_title: {
    en: 'Preferred language',
    np: 'मनपरेको भाषा',
  },
  currency_title: {
    en: 'Preferred currency',
    np: 'मनपरेको मुद्रा',
  },
  language_english: {
    en: 'English',
    np: 'अंग्रेजी',
  },
  language_nepali: {
    en: 'Nepali',
    np: 'नेपाली',
  },
  currency_rs: {
    en: 'Nepali Rupee (Rs)',
    np: 'नेपाली रुपेया (रु)',
  },

  // Properties
  properties_title: {
    en: 'Properties',
    np: 'सम्पत्तिहरू',
  },
  properties_add: {
    en: 'Add Property',
    np: 'सम्पत्ति जोड्नुहोस्',
  },
  navbar_properties_add: {
    en: 'Add Property',
    np: 'सम्पत्ति जोड्नुहोस्',
  },
  properties_edit: {
    en: 'Edit',
    np: 'सम्पादन गर्नुहोस्',
  },
  properties_delete: {
    en: 'Delete',
    np: 'हटाउनुहोस्',
  },
  properties_price: {
    en: 'Price',
    np: 'मूल्य',
  },
  properties_bedrooms: {
    en: 'Bedrooms',
    np: 'सुत कोठाहरू',
  },
  properties_bathrooms: {
    en: 'Bathrooms',
    np: 'नुहाउने कोठाहरू',
  },

  // Bookings
  bookings_title: {
    en: 'My Bookings',
    np: 'मेरो बुकिङ्‍हरू',
  },
  bookings_cancel: {
    en: 'Cancel Booking',
    np: 'बुकिङ्‌ रद्द गर्नुहोस्',
  },
  bookings_confirm: {
    en: 'Are you sure you want to cancel this booking?',
    np: 'के तपाई यो बुकिङ्‌ रद्द गर्न चाहनुहुन्छ?',
  },

  // Navbar Menu Items
  navbar_about: {
    en: 'About Us',
    np: 'हामी सम्बन्धे',
  },
  navbar_favorites: {
    en: 'Favorites',
    np: 'मनपर्ने चीजहरू',
  },
  navbar_messages: {
    en: 'Messages',
    np: 'सन्देशहरू',
  },
  navbar_profile_settings: {
    en: 'Profile Settings',
    np: 'प्रोफाइल सेटिङ्‍हरू',
  },
  navbar_complete_kyc: {
    en: 'Complete KYC',
    np: 'KYC पूरा गर्नुहोस्',
  },
  navbar_view_tenants: {
    en: 'View Tenants',
    np: 'किरायेदारहरू हेर्नुहोस्',
  },
  navbar_agreements: {
    en: 'Agreements',
    np: 'सम्झौताहरू',
  },
  navbar_payment_history: {
    en: 'Payment History',
    np: 'भुक्तानी इतिहास',
  },
  navbar_refund_requests: {
    en: 'Refund Requests',
    np: 'फिर्ता अनुरोधहरू',
  },
  navbar_account: {
    en: 'Account',
    np: 'खाता',
  },
  navbar_management: {
    en: 'Management',
    np: 'व्यवस्थापन',
  },
  navbar_actions: {
    en: 'Actions',
    np: 'कार्यहरू',
  },
  navbar_pending: {
    en: 'pending',
    np: 'प्रतीक्षमा',
  },
  navbar_sign_in: {
    en: 'Sign In',
    np: 'साइन इन गर्नुहोस्',
  },

  // Common
  loading: {
    en: 'Loading...',
    np: 'लोड हुँदैछ...',
  },
  saving: {
    en: 'Saving...',
    np: 'सेवा गर्दैछ...',
  },
  error: {
    en: 'Error',
    np: 'त्रुटि',
  },
  success: {
    en: 'Success',
    np: 'सफलता',
  },
  submit: {
    en: 'Submit',
    np: 'सबमिट गर्नुहोस्',
  },
  close: {
    en: 'Close',
    np: 'बन्द गर्नुहोस्',
  },
  delete_confirm: {
    en: 'Confirm Delete',
    np: 'हटाउन पुष्टि गर्नुहोस्',
  },
  yes: {
    en: 'Yes',
    np: 'हो',
  },
  no: {
    en: 'No',
    np: 'होइन',
  },

  // Form Labels
  form_name: {
    en: 'Name',
    np: 'नाम',
  },
  form_email: {
    en: 'Email Address',
    np: 'इमेल पता',
  },
  form_phone: {
    en: 'Phone Number',
    np: 'फोन नम्बर',
  },
  form_password: {
    en: 'Password',
    np: 'पासवर्ड',
  },
  form_submit: {
    en: 'Submit',
    np: 'सबमिट गर्नुहोस्',
  },
  form_cancel: {
    en: 'Cancel',
    np: 'रद्द गर्नुहोस्',
  },
  form_reset: {
    en: 'Reset',
    np: 'रिसेट गर्नुहोस्',
  },

  // Search & Filter
  search_placeholder: {
    en: 'Search...',
    np: 'खोज्नुहोस्...',
  },
  filter: {
    en: 'Filter',
    np: 'फिल्टर गर्नुहोस्',
  },
  sort: {
    en: 'Sort',
    np: 'क्रमबद्ध गर्नुहोस्',
  },

  // Status Messages
  status_pending: {
    en: 'Pending',
    np: 'प्रतीक्षमा',
  },
  status_approved: {
    en: 'Approved',
    np: 'स्वीकृत',
  },
  status_rejected: {
    en: 'Rejected',
    np: 'अस्वीकृत',
  },
  status_completed: {
    en: 'Completed',
    np: 'पूर्ण',
  },
  status_active: {
    en: 'Active',
    np: 'सक्रिय',
  },
  status_inactive: {
    en: 'Inactive',
    np: 'निष्क्रिय',
  },

  // Dates & Time
  today: {
    en: 'Today',
    np: 'आज',
  },
  yesterday: {
    en: 'Yesterday',
    np: 'हिजो',
  },
  tomorrow: {
    en: 'Tomorrow',
    np: 'भोली',
  },

  // Actions
  action_edit: {
    en: 'Edit',
    np: 'सम्पादन गर्नुहोस्',
  },
  action_delete: {
    en: 'Delete',
    np: 'हटाउनुहोस्',
  },
  action_view: {
    en: 'View',
    np: 'हेर्नुहोस्',
  },
  action_download: {
    en: 'Download',
    np: 'डाउनलोड गर्नुहोस्',
  },
  action_upload: {
    en: 'Upload',
    np: 'अपलोड गर्नुहोस्',
  },
  action_share: {
    en: 'Share',
    np: 'साझेदारी गर्नुहोस्',
  },
  action_print: {
    en: 'Print',
    np: 'छाप्नुहोस्',
  },

  // Pagination
  pagination_previous: {
    en: 'Previous',
    np: 'अघिल्लो',
  },
  pagination_next: {
    en: 'Next',
    np: 'अगलो',
  },
  pagination_page: {
    en: 'Page',
    np: 'पृष्ठ',
  },
  pagination_of: {
    en: 'of',
    np: 'को',
  },

  // Messages
  msg_success: {
    en: 'Operation successful!',
    np: 'कार्य सफलतापूर्वक सम्पन्न!',
  },
  msg_error: {
    en: 'Something went wrong. Please try again.',
    np: 'केही गलत भयो। कृपया पुनः प्रयास गर्नुहोस्।',
  },
  msg_confirm: {
    en: 'Are you sure?',
    np: 'के तपाई निश्चित हुनुहुन्छ?',
  },
  msg_deleted: {
    en: 'Deleted successfully!',
    np: 'सफलतापूर्वक हटाइयो!',
  },
  msg_updated: {
    en: 'Updated successfully!',
    np: 'सफलतापूर्वक अद्यावधिक गरिएको!',
  },
  msg_created: {
    en: 'Created successfully!',
    np: 'सफलतापूर्वक सृजना गरिएको!',
  },

  // Validation
  validation_required: {
    en: 'This field is required.',
    np: 'यो क्षेत्र आवश्यक छ।',
  },
  validation_email: {
    en: 'Please enter a valid email address.',
    np: 'कृपया मान्य इमेल पता प्रविष्ट गर्नुहोस्।',
  },
  validation_phone: {
    en: 'Please enter a valid phone number.',
    np: 'कृपया मान्य फोन नम्बर प्रविष्ट गर्नुहोस्।',
  },
  validation_password_short: {
    en: 'Password must be at least 8 characters.',
    np: 'पासवर्ड कम्तीमा 8 वर्णको हुनुपर्छ।',
  },
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Load from localStorage or default to English
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  // Update localStorage and document language when language changes
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'np' ? 'ltr' : 'ltr'; // Both LTR for now
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
