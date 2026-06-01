import { User, Info } from "lucide-react";
import { KYCFooter } from "./KYCFooter";
import type { KYCFormData } from "./KYCContainer";

interface KYCStep1Props {
  formData: KYCFormData;
  onUpdate: (data: Partial<KYCFormData>) => void;
}

export default function KYCStep1({ formData, onUpdate }: KYCStep1Props) {
  return (
    <div className="space-y-6">
      {/* Personal Info Form */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Enter your full name"
            value={formData.full_name}
            onChange={(e) => onUpdate({ full_name: e.target.value })}
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A87DC2]/20 focus:border-[#A87DC2] transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          placeholder="Enter your 10-digit phone number"
          maxLength={10}
          value={formData.phone_number}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
            onUpdate({ phone_number: val });
          }}
          className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A87DC2]/20 focus:border-[#A87DC2] transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Citizenship Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Enter your citizenship/ID number"
          value={formData.citizenship_number}
          onChange={(e) => onUpdate({ citizenship_number: e.target.value })}
          className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A87DC2]/20 focus:border-[#A87DC2] transition-all"
        />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-center">
        <Info className="text-blue-500 shrink-0" size={20} />
        <p className="text-sm text-blue-700">
          Make sure the information matches your government-issued ID document exactly.
        </p>
      </div>

      {/* KYC Footer */}
      <KYCFooter />
    </div>
  );
}
