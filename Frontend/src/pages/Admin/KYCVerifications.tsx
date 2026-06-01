import React, { useState, useEffect } from 'react';
import { 
  Shield, Clock, CheckCircle, X, ChevronRight, Search, Activity
} from 'lucide-react';
import { Header } from '../../components/admin/Header';
import { KycListItem } from '../../components/admin/KycListItem';
import { KycModal } from '../../components/admin/KycModal';
import { adminGetAllKYC, adminGetKYCStats, adminUpdateKYCStatus } from '../../services/api';

const KYCVerifications: React.FC = () => {
  const [kycList, setKycList] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedKyc, setSelectedKyc] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        adminGetAllKYC(),
        adminGetKYCStats()
      ]);
      setKycList(list);
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching KYC data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await adminUpdateKYCStatus(id, status);
      await fetchData(); 
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const filteredList = kycList.filter(item => item.status === activeTab);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans text-gray-800">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* --- HEADER SECTION --- */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-gradient-to-br from-[#A989C8] to-[#A87DC2] rounded-xl shadow-sm">
                <Shield className="text-white" size={20} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">KYC Verifications</h1>
            </div>
            <p className="text-gray-500 font-medium">Review and manage user verification requests</p>
          </div>
        </div>

        {/* --- STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                  <Clock size={22} />
                </div>
                <div className="flex items-center gap-1 text-green-500 text-xs font-bold">
                  <ActivityIcon size={14} /> +12%
                </div>
             </div>
             <h4 className="text-4xl font-black text-gray-900">{stats.pending}</h4>
             <p className="text-sm font-bold text-gray-500 tracking-tight mt-1">Pending Reviews</p>
             <div className="mt-4 text-[10px] font-black text-orange-500 uppercase tracking-wider bg-orange-50 w-fit px-2 py-0.5 rounded">Urgent</div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-[#F3EDF9] rounded-lg text-[#A989C8]">
                  <CheckCircle size={22} />
                </div>
             </div>
             <h4 className="text-4xl font-black text-gray-900">{stats.approved}</h4>
             <p className="text-sm font-bold text-gray-500 tracking-tight mt-1">Total Approved</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-50 rounded-lg text-red-500">
                  <X size={22} />
                </div>
             </div>
             <h4 className="text-4xl font-black text-gray-900">{stats.rejected}</h4>
             <p className="text-sm font-bold text-gray-500 tracking-tight mt-1">Total Rejected</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                  <Activity size={22} />
                </div>
             </div>
             <h4 className="text-4xl font-black text-gray-900">
               {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
             </h4>
             <p className="text-sm font-bold text-gray-500 tracking-tight mt-1">Approval Rate</p>
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-10">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Verification Requests</h3>
              <p className="text-xs text-gray-400 font-medium">Manage and review incoming user documents</p>
            </div>
            <div className="bg-orange-50 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full border border-orange-100 uppercase tracking-widest">
              {stats.pending} Pending
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap border-b border-gray-100">
            {(['pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`sm:flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${
                  activeTab === tab ? 'text-[#A989C8]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-[#F3EDF9] text-[#A989C8]' : 'bg-gray-100 text-gray-400'
                }`}>
                  {tab === 'pending' ? stats.pending : tab === 'approved' ? stats.approved : stats.rejected}
                </span>
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#A989C8] to-[#A87DC2]" />}
              </button>
            ))}
          </div>

          {/* List Content */}
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-400 font-bold italic animate-pulse">Loading...</div>
            ) : filteredList.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-sm">No {activeTab} requests</p>
              </div>
            ) : (
              filteredList.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-0 sm:bg-transparent sm:border-0 sm:shadow-none">
                  <KycListItem
                    id={item.id}
                    name={item.full_name}
                    role={item.user_info.user_type}
                    email={item.user_info.email}
                    phone={item.phone_number}
                    citizenship={item.citizenship_number}
                    docsCount={1 + (item.document_back_image ? 1 : 0) + (item.selfie_image ? 1 : 0)}
                    submittedAt={new Date(item.submitted_at).toLocaleDateString()}
                    avatarUrl={item.selfie_image || `https://i.pravatar.cc/150?u=${item.user_info.email}`}
                    status={item.status}
                    onReview={() => { setSelectedKyc(item); setIsModalOpen(true); }}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- RECENT ACTIVITY SECTION --- */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-8">Recent Activity</h3>
          <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-100">
            {kycList.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex gap-6 items-start relative z-10">
                <div className={`p-2 rounded-full border-4 border-white shadow-sm ${
                  item.status === 'approved' ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'
                }`}>
                  {item.status === 'approved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">
                      {item.status === 'approved' ? 'Verification approved' : 'New verification submitted'}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {item.full_name} &bull; {new Date(item.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      </main>

      {selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg mx-auto">
            <KycModal
              kyc={selectedKyc}
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onApprove={(id) => handleStatusUpdate(id, 'approved')}
              onReject={(id) => handleStatusUpdate(id, 'rejected')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityIcon = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

export default KYCVerifications;
