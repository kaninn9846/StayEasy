import { useRef, useState, useEffect } from "react";
import { FileText, Upload, X, Check, Info } from "lucide-react";
import { KYCFooter } from "./KYCFooter";
import type { KYCFormData } from "./KYCContainer";

interface KYCStep2Props {
  formData: KYCFormData;
  onUpdate: (data: Partial<KYCFormData>) => void;
}

export default function KYCStep2({ formData, onUpdate }: KYCStep2Props) {
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!formData.document_image) setFrontPreview(null);
    if (!formData.document_back_image) setBackPreview(null);
  }, [formData.document_image, formData.document_back_image]);

  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpdate({ document_image: file });
      setFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpdate({ document_back_image: file });
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const clearFront = () => {
    onUpdate({ document_image: null });
    setFrontPreview(null);
    if (frontRef.current) frontRef.current.value = "";
  };

  const clearBack = () => {
    onUpdate({ document_back_image: null });
    setBackPreview(null);
    if (backRef.current) backRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Upload ID Document <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-4">
          Please upload both the front and back sides of your citizenship document.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Front Side */}
          <div>
            <p className="text-xs font-bold text-gray-600 mb-2">Front Side</p>
            {frontPreview ? (
              <div className="relative rounded-2xl border-2 border-green-200 bg-green-50 overflow-hidden">
                <img
                  src={frontPreview}
                  alt="Front of ID"
                  className="w-full h-48 object-contain bg-white"
                />
                <div className="flex items-center justify-between px-3 py-2 bg-green-50">
                  <span className="flex items-center gap-1 text-xs font-bold text-green-700">
                    <Check size={14} /> Uploaded
                  </span>
                  <button
                    onClick={clearFront}
                    className="p-1 hover:bg-green-100 rounded-full transition-colors"
                  >
                    <X size={14} className="text-green-700" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => frontRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-[#F2E9FF] hover:border-[#A87DC2] transition-all cursor-pointer h-48"
              >
                <Upload className="text-gray-400 w-7 h-7 mb-2" />
                <p className="text-sm font-bold text-gray-600">Tap to upload</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
              </div>
            )}
            <input
              ref={frontRef}
              type="file"
              hidden
              accept="image/*"
              onChange={handleFrontUpload}
            />
          </div>

          {/* Back Side */}
          <div>
            <p className="text-xs font-bold text-gray-600 mb-2">Back Side</p>
            {backPreview ? (
              <div className="relative rounded-2xl border-2 border-green-200 bg-green-50 overflow-hidden">
                <img
                  src={backPreview}
                  alt="Back of ID"
                  className="w-full h-48 object-contain bg-white"
                />
                <div className="flex items-center justify-between px-3 py-2 bg-green-50">
                  <span className="flex items-center gap-1 text-xs font-bold text-green-700">
                    <Check size={14} /> Uploaded
                  </span>
                  <button
                    onClick={clearBack}
                    className="p-1 hover:bg-green-100 rounded-full transition-colors"
                  >
                    <X size={14} className="text-green-700" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => backRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-[#F2E9FF] hover:border-[#A87DC2] transition-all cursor-pointer h-48"
              >
                <Upload className="text-gray-400 w-7 h-7 mb-2" />
                <p className="text-sm font-bold text-gray-600">Tap to upload</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
              </div>
            )}
            <input
              ref={backRef}
              type="file"
              hidden
              accept="image/*"
              onChange={handleBackUpload}
            />
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start">
        <Info className="text-amber-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-amber-700">
          Make sure both sides are clear, readable, and match the personal information you entered.
        </p>
      </div>

      <KYCFooter />
    </div>
  );
}
