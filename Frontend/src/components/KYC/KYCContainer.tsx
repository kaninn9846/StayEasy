import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import KYCStep1 from "./KYCStep1";
import KYCStep2 from "./KYCStep2";
import KYCStep3 from "./KYCStep3";
import axios from "axios";
import { getKYCStatus } from "../../services/api";

// ✅ KYC Form Data Type
export interface KYCFormData {
  full_name: string;
  phone_number: string;
  citizenship_number: string;
  document_image: File | null;
  document_back_image: File | null;
  selfie_image: File | null;
}

function KYCProgress({ step }: { step: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full mr-2 overflow-hidden">
          <div
            className="h-2 bg-[#A87DC2] transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <span className="text-sm text-[#A87DC2]">
          {Math.round((step / 3) * 100)}% Complete
        </span>
      </div>

      <div className="flex justify-between text-sm text-gray-500">
        <span className={step >= 1 ? "text-[#A87DC2]" : ""}>Personal Info</span>
        <span className={step >= 2 ? "text-[#A87DC2]" : ""}>ID Verification</span>
        <span className={step >= 3 ? "text-[#A87DC2]" : ""}>Document</span>
      </div>
    </div>
  );
}

export default function KYCContainer() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ KYC Form State
  const [formData, setFormData] = useState<KYCFormData>({
    full_name: "",
    phone_number: "",
    citizenship_number: "",
    document_image: null,
    document_back_image: null,
    selfie_image: null,
  });

  /* 🔹 STEP NAVIGATION */
  const nextStep = () => {
    setError(null);

    if (step === 1) {
      if (!formData.citizenship_number.trim()) {
        setError("You must fill this field to continue.");
        return;
      }
    }

    if (step === 2) {
      if (!formData.document_image) {
        setError("Please upload the front of your citizenship document.");
        return;
      }
      if (!formData.document_back_image) {
        setError("Please upload the back of your citizenship document.");
        return;
      }
    }

    if (step === 3) {
      if (!formData.selfie_image) {
        setError("Please upload a photo of yourself.");
        return;
      }
    }

    if (step < 3) setStep(step + 1);
    else checkStatusAndSubmit();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  /* 🔹 UPDATE FORM DATA */
  const updateFormData = (data: Partial<KYCFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  /* 🔹 SAVE & EXIT */
  const saveAndExit = () => {
    navigate("/dashboard");
  };

  /* 🔹 CHECK KYC STATUS BEFORE SUBMIT */
  const checkStatusAndSubmit = async () => {
    setError(null);
    try {
      const status = await getKYCStatus();
      if (status?.status && status.status !== 'not_submitted') {
        alert("Your KYC has already been submitted.");
        navigate("/dashboard");
        return;
      }
    } catch {
      // continue with submit
    }
    handleSubmit();
  };

  /* 🔹 SUBMIT TO DJANGO BACKEND */
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ Validate form data
      if (!formData.full_name.trim()) {
        throw new Error("Full name is required");
      }
      if (!formData.phone_number.trim()) {
        throw new Error("Phone number is required");
      }
      if (!formData.citizenship_number.trim()) {
        throw new Error("Citizenship number is required");
      }
      if (!formData.document_image) {
        throw new Error("Document image is required");
      }

      // ✅ Create FormData for multipart/form-data
      const submitData = new FormData();
      submitData.append("full_name", formData.full_name);
      submitData.append("phone_number", formData.phone_number);
      submitData.append("citizenship_number", formData.citizenship_number);
      submitData.append("document_image", formData.document_image);
      if (formData.document_back_image) {
        submitData.append("document_back_image", formData.document_back_image);
      }
      if (formData.selfie_image) {
        submitData.append("selfie_image", formData.selfie_image);
      }

      // ✅ Get JWT token from localStorage
      const token = localStorage.getItem("access");
      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      // ✅ Send to Django API
      const response = await axios.post(
        "http://localhost:8000/api/users/kyc/submit/",
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // ✅ Success - redirect to dashboard
      alert("KYC submitted successfully! It will be reviewed by an admin.");
      navigate("/dashboard");
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to submit KYC";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-6">
      <div className="w-full max-w-xl">
        <KYCProgress step={step} />

        {/* ✅ ERROR MESSAGE */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          {step === 1 && (
            <KYCStep1 formData={formData} onUpdate={updateFormData} />
          )}
          {step === 2 && (
            <KYCStep2 formData={formData} onUpdate={updateFormData} />
          )}
          {step === 3 && (
            <KYCStep3 formData={formData} onUpdate={updateFormData} />
          )}

          {/* 🔘 BUTTONS */}
          <div className="flex justify-between mt-6">
            {/* BACK */}
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="px-6 py-2 rounded-xl border text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            <div className="flex space-x-2">
              {/* SAVE & CONTINUE LATER */}
              <button
                onClick={saveAndExit}
                className="px-6 py-2 rounded-xl border bg-white text-gray-600 hover:bg-gray-100"
                disabled={loading}
              >
                Cancel
              </button>

              {/* CONTINUE / SUBMIT */}
              <button
                onClick={nextStep}
                disabled={loading}
                className="px-6 py-2 rounded-xl bg-[#A87DC2] text-white hover:bg-[#8A64B2] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading
                  ? "Submitting..."
                  : step === 3
                  ? "Submit"
                  : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
