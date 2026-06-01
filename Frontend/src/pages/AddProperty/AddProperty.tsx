import { useState, useEffect } from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProperties } from '../../context/PropertyContext';
import { getPropertyDetail, getKYCStatus } from '../../services/api';

// Component Imports
import Stepper from '../../components/AddProperty/Stepper';
import Step1Type from '../../components/AddProperty/Step1Type';
import Step2BasicInfo from '../../components/AddProperty/Step2BasicInfo';
import Step3Details from '../../components/AddProperty/Step3Details';
import Step4Pricing from '../../components/AddProperty/Step4Pricing';
import Step5Images from '../../components/AddProperty/Step5Images';
import SuccessModal from '../../components/UI/SuccessModal';

// Define TypeScript type for formData
type FormDataType = {
  propertyType: string;
  title: string;
  description: string;
  province: string;
  district: string;
  city: string;
  area: string;
  fullAddress: string;
  bedrooms: string;
  bathrooms: string;
  areaSize: string;
  floorNumber: string;
  totalFloors: string;
  furnishing: string;
  amenities: string[];        // Array of strings
  availableFrom: string;
  leasePeriod: string;
  monthlyRent: string;
  securityDeposit: string;
  maintenanceFee: string;
  images: File[];             // Only File[]
};

const AddProperty = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { refreshProperties } = useProperties();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    message: string;
    isUpdate: boolean;
  } | null>(null);
  const [newPropertyId, setNewPropertyId] = useState<number | null>(null);

  const [existingImages, setExistingImages] = useState<Array<{id: number, image: string}>>([]);

  // KYC guard: redirect if not approved
  useEffect(() => {
    if (id) return; // editing existing property — skip KYC check
    const checkKYC = async () => {
      try {
        const data = await getKYCStatus();
        if (data?.status && data.status !== 'approved') {
          alert('Please verify your KYC first before adding a property.');
          navigate('/kyc');
        }
      } catch {
        navigate('/login');
      }
    };
    checkKYC();
  }, [id, navigate]);

  // Form State
  const [formData, setFormData] = useState<FormDataType>({
    propertyType: 'apartment',
    title: '', description: '', province: '', district: '', city: '', area: '', fullAddress: '',
    bedrooms: '', bathrooms: '', areaSize: '', floorNumber: '', totalFloors: '', furnishing: '',
    amenities: [], availableFrom: '', leasePeriod: '',
    monthlyRent: '', securityDeposit: '', maintenanceFee: '',
    images: []   // File[]
  });

  // Fetch property data if editing
  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const property = await getPropertyDetail(Number(id));
        setExistingImages(property.images || []);
        setFormData((prev) => ({
          ...prev,
          propertyType: property.property_type || 'apartment',
          title: property.title || '',
          description: property.description || '',
          province: property.province || '',
          district: property.district || '',
          city: property.city || '',
          area: property.area || '',
          fullAddress: property.address || '',
          bedrooms: property.bedrooms?.toString() || '',
          bathrooms: property.bathrooms?.toString() || '',
          areaSize: property.area_size?.toString() || '',
          floorNumber: property.floor_number?.toString() || '',
          totalFloors: property.total_floors?.toString() || '',
          furnishing: property.furnishing || '',
          amenities: property.amenities || [],
          features: property.amenities || [],
          availableFrom: property.available_from || '',
          leasePeriod: property.lease_period || '',
          monthlyRent: property.price?.toString() || '',
          securityDeposit: property.security_deposit?.toString() || '',
          maintenanceFee: property.maintenance_fee?.toString() || '',
          images: [], // Images are not pre-filled as File[]
        }));
      } catch (err) {
        alert('Failed to load property for editing.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProperty();
  }, [id, navigate]);

  const validateStep = (): boolean => {
    setError('');
    const missing: string[] = [];

    switch (currentStep) {
      case 2:
        if (!formData.title.trim()) missing.push('Property Title');
        if (!formData.description.trim()) missing.push('Description');
        if (!formData.city.trim()) missing.push('City');
        if (!formData.fullAddress.trim()) missing.push('Full Address');
        break;
      case 3:
        if (formData.propertyType !== 'land') {
          if (!formData.bedrooms.trim()) missing.push('Bedrooms');
          if (!formData.bathrooms.trim()) missing.push('Bathrooms');
        }
        if (!formData.areaSize.trim()) missing.push('Area Size');
        break;
      case 4:
        if (!formData.monthlyRent.trim()) missing.push('Monthly Rent');
        break;
      case 5:
        if ((!formData.images || formData.images.length === 0) && (!existingImages || existingImages.length === 0))
          missing.push('at least one photo');
        break;
    }

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo(0, 0);
  };

  const handlePrev = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  // -----------------------------
  // FULL SUBMIT HANDLER (TYPE SAFE)
  // -----------------------------
  const handleSubmit = async () => {
    const token = localStorage.getItem('access');
    if (!token) {
      alert('You must be logged in to add or edit a property');
      navigate('/login');
      return;
    }

    const formPayload = new FormData();
    formPayload.append('property_type', formData.propertyType);
    formPayload.append('title', formData.title);
    formPayload.append('description', formData.description);
    formPayload.append('address', formData.fullAddress || `${formData.city}, ${formData.district}`);
    formPayload.append('city', formData.city);
    formPayload.append('province', formData.province);
    formPayload.append('district', formData.district);
    formPayload.append('area', formData.area);
    if (formData.propertyType !== 'land') {
      if (formData.bedrooms) formPayload.append('bedrooms', formData.bedrooms);
      if (formData.bathrooms) formPayload.append('bathrooms', formData.bathrooms);
      if (formData.floorNumber) formPayload.append('floor_number', formData.floorNumber);
      if (formData.totalFloors) formPayload.append('total_floors', formData.totalFloors);
      if (formData.furnishing) formPayload.append('furnishing', formData.furnishing);
    }
    if (formData.areaSize) formPayload.append('area_size', formData.areaSize);
    const features = formData.amenities || [];
    if (features.length > 0) {
      formPayload.append('amenities', JSON.stringify(features));
    }
    if (formData.availableFrom) formPayload.append('available_from', formData.availableFrom);
    if (formData.leasePeriod) formPayload.append('lease_period', formData.leasePeriod);
    formPayload.append('price', formData.monthlyRent);
    if (formData.securityDeposit) formPayload.append('security_deposit', formData.securityDeposit);
    if (formData.maintenanceFee) formPayload.append('maintenance_fee', formData.maintenanceFee);
    formData.images.forEach((file: File) => {
      formPayload.append('images', file);
    });

    if (id && existingImages.length > 0) {
      const existingIds = existingImages.map(img => img.id);
      formPayload.append('existing_image_ids', JSON.stringify(existingIds));
    }

    try {
      setLoading(true);
      const url = id
        ? `http://127.0.0.1:8000/api/users/landlord/properties/${id}/update/`
        : 'http://127.0.0.1:8000/api/users/landlord/properties/create/';
      const method = id ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formPayload,
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Server error:', data);
        alert('Failed: ' + JSON.stringify(data.error || data));
        return;
      }

      // Show success modal
      const isUpdate = !!id;
      setNewPropertyId(data.id || newPropertyId);
      setSuccessMessage({
        title: isUpdate ? 'Property Updated Successfully!' : 'Property Added Successfully!',
        message: isUpdate
          ? 'Your property details have been updated successfully. The latest changes are now visible on your listing.'
          : 'Your property has been listed successfully and is now available for tenants to view and book.',
        isUpdate,
      });
      setShowSuccessModal(true);

      await refreshProperties();
    } catch (err: any) {
      console.error('Request error:', err);
      alert('Error: ' + (err.message || 'An error occurred. Check console for details.'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Type formData={formData} setFormData={setFormData} />;
      case 2: return <Step2BasicInfo formData={formData} setFormData={setFormData} />;
      case 3: return <Step3Details formData={formData} setFormData={setFormData} />;
      case 4: return <Step4Pricing formData={formData} setFormData={setFormData} />;
      case 5: return <Step5Images formData={formData} setFormData={setFormData} existingImages={existingImages} setExistingImages={setExistingImages} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      {/* Success Modal */}
      {successMessage && (
        <SuccessModal
          isOpen={showSuccessModal}
          title={successMessage.title}
          message={successMessage.message}
          isUpdate={successMessage.isUpdate}
          onClose={() => {
            setShowSuccessModal(false);
            navigate('/dashboard');
          }}
          onViewProperty={
            !successMessage.isUpdate && newPropertyId
              ? () => {
                  navigate(`/property/${newPropertyId}`);
                }
              : undefined
          }
        />
      )}

      {/* 1. Navigation Bar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl text-gray-800">
            <div className="bg-[#A87DC2] p-1.5 rounded-lg text-white">
              <Home size={20} />
            </div>
            StayEasy
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* 2. Header Title */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">{id ? 'Edit Property' : 'Add New Property'}</h1>
          <p className="text-gray-500">{id ? 'Update your property details' : 'List your property and reach thousands of verified tenants'}</p>
        </div>

        {/* 3. Stepper Progress Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
          <Stepper currentStep={currentStep} />
        </div>

        {/* 4. Main Form Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-sm border border-gray-100 mb-8 min-h-[400px]">
          {loading ? <div className="text-center text-gray-500">Loading property...</div> : renderStep()}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* 5. Footer Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm transition-colors ${
              currentStep === 1 
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>
          
          <button
            onClick={currentStep === 5 ? handleSubmit : handleNext}
            className={`w-full sm:w-auto px-8 py-3 text-white rounded-xl font-semibold text-sm shadow-md transition-all transform active:scale-95
              bg-[#A87DC2] hover:opacity-90 shadow-[#A87DC2]/30`}
          >
            {currentStep === 5 ? (id ? 'Update Property' : 'Submit Property') : 'Next Step'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProperty;