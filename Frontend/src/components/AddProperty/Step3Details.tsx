import React, { useState } from 'react';

interface Props {
  formData: any;
  setFormData: any;
}

const Step3Details: React.FC<Props> = ({ formData, setFormData }) => {
  const [inputValue, setInputValue] = useState('');

  const amenities = [
    'WiFi', 'Parking', 'Water Supply', 'Electricity', 'Security', 'AC', 'Balcony', 'Garden'
  ];

  const landFeatures = [
    'Road Access', 'Boundary Wall', 'Drainage', 'Water Access', 'Electricity Nearby', 'Road Width', 'Flat Plot', 'Soil Suitable'
  ];

  const isLand = formData.propertyType === 'land';
  const activeList = isLand ? landFeatures : amenities;

  const handleToggle = (value: string) => {
    const current = formData.amenities || [];

    const updated = current.includes(value)
      ? current.filter((i: string) => i !== value)
      : [...current, value];

    setFormData({ ...formData, amenities: updated });
  };

  const handleAddCustom = () => {
    const value = inputValue.trim();
    if (!value) return;

    const current = formData.amenities || [];

    if (!current.includes(value)) {
      setFormData({
        ...formData,
        amenities: [...current, value]
      });
    }

    setInputValue('');
  };

  const handleRemove = (value: string) => {
    const updated = (formData.amenities || []).filter((i: string) => i !== value);
    setFormData({ ...formData, amenities: updated });
  };

  const inputClass = "w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A87DC2] outline-none";

  const isSelected = (value: string) => (formData.amenities || []).includes(value);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Details</h2>
        <p className="text-gray-500">
          {isLand ? 'Land features & infrastructure' : 'Property amenities & comfort features'}
        </p>
      </div>

      {/* Basic Inputs */}
      {!isLand ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="number"
            placeholder="Bedrooms"
            value={formData.bedrooms || ''}
            onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Bathrooms"
            value={formData.bathrooms || ''}
            onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Area (Sq Ft)"
            value={formData.areaSize || ''}
            onChange={(e) => setFormData({ ...formData, areaSize: e.target.value })}
            className={inputClass}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Land Size - NUMBER ONLY */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Land Size"
              value={formData.areaSize || ''}
              onChange={(e) => setFormData({ ...formData, areaSize: e.target.value })}
              className={inputClass}
            />
            <span className="text-gray-500 text-sm whitespace-nowrap">Sq Ft</span>
          </div>

          <input
            type="text"
            placeholder="Land Type"
            value={formData.landType || ''}
            onChange={(e) => setFormData({ ...formData, landType: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      {/* Features Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {isLand ? 'Land Features' : 'Amenities'}
        </label>

        {/* Quick Select */}
        <div className="flex flex-wrap gap-2 mb-4">
          {activeList.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleToggle(item)}
              className={`px-4 py-2 rounded-full border text-sm transition-all
                ${isSelected(item)
                  ? 'bg-[#A87DC2] text-white border-[#A87DC2]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#A87DC2] hover:text-[#A87DC2]'
                }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isLand ? "Add custom land feature" : "Add custom amenity"}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="px-5 py-3 bg-[#A87DC2] text-white rounded-xl hover:opacity-90"
          >
            Add
          </button>
        </div>

        {/* Selected Items */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(formData.amenities || []).map((item: string) => (
            <span
              key={item}
              className="px-4 py-2 rounded-full bg-[#A87DC2]/10 text-[#A87DC2] border border-[#A87DC2] text-sm flex items-center gap-2"
            >
              {item}
              <button onClick={() => handleRemove(item)} className="text-xs font-bold">
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step3Details;