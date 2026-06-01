import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Loader, Shield, Mail, Phone, Calendar, MapPin, CreditCard, ChevronLeft, FileText } from 'lucide-react';

interface KYCData {
  id: number;
  user_info: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    user_type: string;
  };
  full_name: string;
  phone_number: string;
  citizenship_number: string;
  document_image: string;
  document_back_image: string | null;
  selfie_image: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  verified_by_info: any;
  verified_at: string | null;
}

interface KycModalProps {
  kyc: KYCData;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}

export const KycModal: React.FC<KycModalProps> = ({
  kyc,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-50/95 overflow-y-auto pt-10 pb-20">
      <div className="w-full max-w-6xl px-6">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <button 
              onClick={onClose}
              className="flex items-center text-gray-500 hover:text-gray-800 transition text-sm font-medium mb-4"
            >
              <ChevronLeft size={16} className="mr-1" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#A989C8] to-[#A87DC2] rounded-lg shadow-sm">
                <Shield className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">KYC Verification Detail</h1>
            </div>
            <p className="text-gray-500 text-sm ml-14">Review user documents and approve or reject verification</p>
          </div>

          <div className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize ${
            kyc.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {kyc.status}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT COLUMN (8/12) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* 1. Personal Information Card */}
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Personal Information</h3>
              <div className="flex flex-col md:flex-row gap-8">
                {kyc.selfie_image ? (
                  <img 
                    src={kyc.selfie_image}
                    alt="User selfie"
                    className="w-24 h-24 rounded-xl object-cover ring-4 ring-gray-50"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-[#F3EDF9] flex items-center justify-center text-[#A989C8] font-bold text-2xl ring-4 ring-gray-50">
                    {kyc.user_info.first_name?.[0] || ''}{kyc.user_info.last_name?.[0] || ''}
                  </div>
                )}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl font-bold text-gray-900">{kyc.user_info.first_name} {kyc.user_info.last_name}</span>
                      <span className="bg-[#F3EDF9] text-[#A989C8] text-[10px] uppercase font-heavy px-2 py-0.5 rounded tracking-wider">
                        {kyc.user_info.user_type}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <InfoRow icon={<Mail size={14}/>} text={kyc.user_info.email} />
                      <InfoRow icon={<Calendar size={14}/>} text="DOB: August 22, 1992" />
                      <InfoRow icon={<MapPin size={14}/>} text="Patan, Lalitpur, Nepal" />
                    </div>
                  </div>
                  <div className="space-y-2.5 pt-0 md:pt-11">
                    <InfoRow icon={<Phone size={14}/>} text={kyc.phone_number} />
                    <InfoRow icon={<CreditCard size={14}/>} text={`Citizenship: ${kyc.citizenship_number}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Submitted Documents Card */}
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Submitted Documents</h3>
              <div className="border border-gray-100 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-2 bg-[#F3EDF9] text-[#A989C8] rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 leading-none mb-1">Citizenship Certificate</p>
                    <p className="text-xs text-gray-400 font-medium">Document Number: {kyc.citizenship_number}</p>
                    <p className="text-xs text-gray-400 font-medium">Issue Date: March 10, 2015</p>
                  </div>
                </div>
                
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Front Side</span>
                      {kyc.document_image ? (
                        <img src={kyc.document_image} alt="Document front" className="w-full rounded-xl border border-gray-200 object-cover" />
                      ) : (
                        <div className="aspect-[1.6/1] bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Back Side</span>
                      {kyc.document_back_image ? (
                        <img src={kyc.document_back_image} alt="Document back" className="w-full rounded-xl border border-gray-200 object-cover" />
                      ) : (
                        <div className="aspect-[1.6/1] bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                          No Image
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>

            {/* 3. Selfie Section */}
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Selfie with ID</h3>
              {kyc.selfie_image ? (
                <img 
                  src={kyc.selfie_image}
                  alt="Selfie verification" 
                  className="w-full max-w-md rounded-2xl object-cover aspect-square shadow-md"
                />
              ) : (
                <div className="w-full max-w-md aspect-square bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                  No selfie uploaded
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (4/12) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm sticky top-10">
              <h3 className="text-lg font-bold text-gray-900 mb-8">Submission Details</h3>
              
              <div className="space-y-6">
                <SidebarItem label="Submission ID" value={`ver-${kyc.id}`} />
                <SidebarItem label="Submitted On" value="March 14, 2026" />
                <SidebarItem label="Total Documents" value="2 (including selfie)" />
                
                <hr className="border-gray-50 my-2" />
                
                <SidebarItem label="Reviewed On" value="March 29, 2026" />
                <SidebarItem label="Reviewed By" value="Admin" />
              </div>

              {kyc.status === 'pending' && (
                <div className="mt-10 space-y-3">
                  <button 
                    onClick={() => onApprove(kyc.id)}
                    disabled={loading}
                    className="w-full py-3.5 bg-green-50 text-green-600 rounded-xl font-bold hover:bg-green-100 transition flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    Approve
                  </button>
                  <button 
                    onClick={() => onReject(kyc.id)}
                    disabled={loading}
                    className="w-full py-3.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : <XCircle size={18} />}
                    Reject
                  </button>
                </div>
              )}
              
              {error && <p className="mt-4 text-xs text-red-500 text-center font-medium">{error}</p>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium">
    <span className="text-gray-400">{icon}</span>
    {text}
  </div>
);

const SidebarItem = ({ label, value }: { label: string, value: string }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-gray-800">{value}</p>
  </div>
);
