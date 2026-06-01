import { Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const LanguageCurrency = () => {
  const { language, setLanguage } = useLanguage();
  const [currency, setCurrency] = useState('Nepali Rupee (Rs)');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [isEditingLanguage, setIsEditingLanguage] = useState(false);
  const [isEditingCurrency, setIsEditingCurrency] = useState(false);

  const currencies = ['Nepali Rupee (Rs)']; // Only RS as requested

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const profile = await getProfile();
        setCurrency(profile.preferred_currency || 'Nepali Rupee (Rs)');
      } catch (err) {
        console.error('Failed to fetch preferences:', err);
      }
    };
    fetchPreferences();
  }, []);

  const handleSaveLanguage = async () => {
    setSaving(true);
    try {
      await updateProfile({ preferred_language: language });
      setMessage(
        language === 'np'
          ? 'भाषा प्राथमिकता अपडेट गरिएको!'
          : 'Language preference updated!'
      );
      setIsEditingLanguage(false);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage(
        language === 'np'
          ? 'भाषा प्राथमिकता सेवा गर्न असफल भयो'
          : 'Failed to save language preference'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCurrency = async () => {
    setSaving(true);
    try {
      await updateProfile({ preferred_currency: currency });
      setMessage(
        language === 'np'
          ? 'मुद्रा प्राथमिकता अपडेट गरिएको!'
          : 'Currency preference updated!'
      );
      setIsEditingCurrency(false);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage(
        language === 'np'
          ? 'मुद्रा प्राथमिकता सेवा गर्न असफल भयो'
          : 'Failed to save currency preference'
      );
    } finally {
      setSaving(false);
    }
  };

  const getLanguageLabel = (lang: string) => {
    if (lang === 'en') return 'English';
    if (lang === 'np') return 'नेपाली';
    return lang;
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 min-h-[400px]">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-[#A989C8]/10 rounded-xl flex items-center justify-center text-[#A989C8]">
          <Globe size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {language === 'np' ? 'भाषा र मुद्रा' : 'Languages & Currency'}
          </h2>
          <p className="text-gray-500 text-sm">
            {language === 'np'
              ? 'आपनो भाषा र मुद्रा प्राथमिकता व्यवस्थापन गर्नुहोस्'
              : 'Manage your language and currency preferences'}
          </p>
        </div>
      </div>

      {/* Language Section */}
      <div className="border-t border-gray-100 py-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-lg">
            {language === 'np' ? 'मनपरेको भाषा' : 'Preferred language'}
          </h3>
          <button
            className="px-4 py-1.5 bg-[#A989C8]/10 text-[#A989C8] rounded-lg text-sm font-medium hover:bg-[#A989C8] hover:text-white transition-all disabled:opacity-50"
            onClick={() => {
              if (isEditingLanguage) {
                handleSaveLanguage();
              } else {
                setIsEditingLanguage(true);
              }
            }}
            disabled={saving}
          >
            {isEditingLanguage
              ? language === 'np'
                ? 'सेवा गर्नुहोस्'
                : 'Save'
              : language === 'np'
              ? 'सम्पादन गर्नुहोस्'
              : 'Edit'}
          </button>
        </div>
        <div className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-800 font-medium">
          {isEditingLanguage ? (
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'np')}
              className="w-full p-2 border border-gray-300 rounded-lg"
              disabled={saving}
            >
              <option value="en">English</option>
              <option value="np">नेपाली</option>
            </select>
          ) : (
            getLanguageLabel(language)
          )}
        </div>
      </div>

      {/* Currency Section */}
      <div className="border-t border-gray-100 py-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-lg">
            {language === 'np' ? 'मनपरेको मुद्रा' : 'Preferred currency'}
          </h3>
          <button
            className="px-4 py-1.5 bg-[#A989C8]/10 text-[#A989C8] rounded-lg text-sm font-medium hover:bg-[#A989C8] hover:text-white transition-all disabled:opacity-50"
            onClick={() => {
              if (isEditingCurrency) {
                handleSaveCurrency();
              } else {
                setIsEditingCurrency(true);
              }
            }}
            disabled={saving}
          >
            {isEditingCurrency
              ? language === 'np'
                ? 'सेवा गर्नुहोस्'
                : 'Save'
              : language === 'np'
              ? 'सम्पादन गर्नुहोस्'
              : 'Edit'}
          </button>
        </div>
        <div className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-800 font-medium">
          {isEditingCurrency ? (
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              disabled={saving}
            >
              {currencies.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          ) : (
            currency
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
          {message}
        </div>
      )}
    </div>
  );
};

export default LanguageCurrency;
