import React from 'react';
import { Eye } from 'lucide-react';

interface KycListItemProps {
  id?: number;
  name: string;
  role: 'Tenant' | 'Landlord';
  email: string;
  phone: string;
  citizenship: string;
  docsCount: number;
  submittedAt: string;
  avatarUrl: string;
  status?: 'pending' | 'approved' | 'rejected';
  onReview?: (id: number) => void;
}
export const KycListItem: React.FC<KycListItemProps> = ({
  id,
  name,
  role,
  email,
  phone,
  citizenship,
  docsCount,
  submittedAt,
  avatarUrl,
  status = 'pending',
  onReview,
}) => {
  const isTenant = role === 'Tenant';
  
  const getStatusBadgeColor = () => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-600 border-green-100';
      case 'rejected':
        return 'bg-red-50 text-red-600 border-red-100';
      default:
        return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'approved':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Needs Review';
    }
  };
  
  return (
    <div className="border border-gray-100 rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:shadow-md transition-shadow">
      <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-50" />
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h4 className="text-base font-bold text-gray-900">{name}</h4>
          <span className={`${isTenant ? 'bg-blue-50 text-blue-600' : 'bg-[#F3EDF9] text-[#A989C8]'} text-[10px] px-2 py-0.5 rounded font-medium`}>
            {role}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${getStatusBadgeColor()}`}>
            {getStatusText()}
          </span>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <p>{email}</p>
          <p>{phone}</p>
          <p>Citizenship: {citizenship} &bull; {docsCount} document{docsCount > 1 ? 's' : ''}</p>
          <p className="text-gray-400 mt-2">Submitted: {submittedAt}</p>
        </div>
      </div>
      <button 
        onClick={() => id && onReview?.(id)}
        className="bg-gradient-to-r from-[#A989C8] to-[#A87DC2] hover:from-[#A87DC2] hover:to-[#9668B8] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors w-full sm:w-auto justify-center shadow-sm"
      >
        <Eye size={16} /> Review
      </button>
    </div>
  );
};
