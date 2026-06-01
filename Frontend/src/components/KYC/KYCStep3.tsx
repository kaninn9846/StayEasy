import { useRef, useState, useEffect } from "react";
import { Camera, Upload, X, Check } from "lucide-react";
import { KYCFooter } from "./KYCFooter";
import type { KYCFormData } from "./KYCContainer";

interface KYCStep3Props {
  formData: KYCFormData;
  onUpdate: (data: Partial<KYCFormData>) => void;
}

export default function KYCStep3({ formData, onUpdate }: KYCStep3Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!formData.selfie_image) setPreview(null);
  }, [formData.selfie_image]);

  const handleFile = (file: File) => {
    onUpdate({ selfie_image: file });
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearPhoto = () => {
    onUpdate({ selfie_image: null });
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Selfie Upload */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Upload photo of yourself <span className="text-red-500">*</span>
        </label>

        {preview ? (
          <div className="relative rounded-2xl border-2 border-green-200 bg-green-50 overflow-hidden">
            <img
              src={preview}
              alt="Your photo"
              className="w-full h-64 object-contain bg-white"
            />
            <div className="flex items-center justify-between px-4 py-3 bg-green-50">
              <span className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                <Check size={16} /> Photo uploaded
              </span>
              <button
                onClick={clearPhoto}
                className="p-1.5 hover:bg-green-100 rounded-full transition-colors"
              >
                <X size={16} className="text-green-700" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-[#F2E9FF] hover:border-[#A87DC2] transition-all group"
            >
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="text-gray-400 group-hover:text-[#A87DC2]" size={28} />
              </div>
              <p className="font-bold text-gray-700">Upload Photo</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
            </button>

            <button
              onClick={() => cameraRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-[#F2E9FF] hover:border-[#A87DC2] transition-all group"
            >
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera className="text-gray-400 group-hover:text-[#A87DC2]" size={28} />
              </div>
              <p className="font-bold text-gray-700">Open Camera</p>
              <p className="text-xs text-gray-400 mt-1">Take a photo right now</p>
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          hidden
          accept="image/*"
          onChange={handleUpload}
        />
        <input
          ref={cameraRef}
          type="file"
          hidden
          accept="image/*"
          capture="user"
          onChange={handleUpload}
        />
      </div>

      {/* Guidelines */}
      <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
        <h4 className="font-bold text-gray-800 mb-4">Submission Checklist:</h4>
        <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
          <li>Full name matches your ID document</li>
          <li>Phone number is correct and accessible</li>
          <li>Citizenship number is clearly visible</li>
          <li>Document image is clear and readable</li>
          <li>All required information is filled</li>
        </ul>
      </div>

      <KYCFooter />
    </div>
  );
}
