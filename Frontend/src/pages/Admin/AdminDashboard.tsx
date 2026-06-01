import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Clock, Users, Home, 
  DollarSign, FileText, ArrowRight
} from 'lucide-react';
import { Header } from '../../components/admin/Header';
import { StatCard, ActionCard } from '../../components/admin/Cards';
import { adminGetAllKYC, adminGetKYCStats, adminGetAllProperties } from '../../services/api';

interface PropertyData {
  id: number;
  title: string;
  price: number;
  available: boolean;
  status?: string;
  property_type: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [kycList, setKycList] = useState<any[]>([]);
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [list, statsData, propsData] = await Promise.all([
          adminGetAllKYC(),
          adminGetKYCStats(),
          adminGetAllProperties()
        ]);
        setKycList(list);
        setStats(statsData);
        setProperties(propsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pendingKyc = kycList.filter(k => k.status === 'pending');
  const availableProps = properties.filter(p => p.available).length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans text-gray-800">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* --- WELCOME HEADER --- */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-gradient-to-br from-[#A989C8] to-[#A87DC2] rounded-xl shadow-sm">
                <Shield className="text-white" size={20} />
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
            </div>
            <p className="text-gray-500 font-medium">Welcome back! Here's your platform overview</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Last updated</p>
            <p className="text-sm font-bold text-gray-700">{new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* --- CORE STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div onClick={() => navigate('/admin/kyc')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <StatCard 
              title="Pending KYC Reviews" 
              value={stats.pending} 
              icon={<Clock size={22} />} 
              isUrgent={stats.pending > 0}
              linkText="Review Now →"
            />
          </div>
          <div onClick={() => navigate('/admin/users')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <StatCard title="Total Users" value={stats.total} icon={<Users size={22} />} trend="+23%" linkText="Manage Users →" />
          </div>
          <div onClick={() => navigate('/admin/properties')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <StatCard title="Total Properties" value={properties.length} icon={<Home size={22} />} trend="+8%" linkText="View Listings →" />
          </div>
          <div onClick={() => navigate('/admin/bookings')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <StatCard title="Available Properties" value={availableProps} icon={<DollarSign size={22} />} trend="+15%" linkText="View Listings →" />
          </div>
        </div>

        {/* --- QUICK ACTIONS --- */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-gray-900 mb-5 ml-1">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div onClick={() => navigate('/admin/kyc')} className="cursor-pointer transform transition-all active:scale-95 hover:shadow-md rounded-3xl">
              <ActionCard title="KYC Verifications" subtext={`${stats.pending} pending`} icon={<Shield size={20} className="text-orange-500"/>} iconBg="bg-orange-50" />
            </div>
            <div onClick={() => navigate('/admin/users')} className="cursor-pointer transform transition-all active:scale-95 hover:shadow-md rounded-3xl">
              <ActionCard title="User Management" subtext={`${stats.total} total users`} icon={<Users size={20} className="text-[#A989C8]"/>} iconBg="bg-[#F3EDF9]" />
            </div>
            <div onClick={() => navigate('/admin/properties')} className="cursor-pointer transform transition-all active:scale-95 hover:shadow-md rounded-3xl">
              <ActionCard title="Properties" subtext={`${properties.length} listings`} icon={<Home size={20} className="text-blue-500"/>} iconBg="bg-blue-50" />
            </div>
            <div onClick={() => navigate('/admin/bookings')} className="cursor-pointer transform transition-all active:scale-95 hover:shadow-md rounded-3xl">
              <ActionCard title="Available" subtext={`${availableProps} available`} icon={<FileText size={20} className="text-green-500"/>} iconBg="bg-green-50" />
            </div>
          </div>
        </div>

        {/* --- BOTTOM SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* KYC Preview */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Pending KYC Verifications</h3>
              <button 
                onClick={() => navigate('/admin/kyc')} 
                className="flex items-center gap-1 text-[#A989C8] text-xs font-black hover:underline underline-offset-4 uppercase tracking-wider"
              >
                View all <ArrowRight size={14} />
              </button>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="h-32 flex items-center justify-center text-gray-400">Loading...</div>
              ) : pendingKyc.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-gray-400 font-medium">No pending requests</div>
              ) : (
                pendingKyc.slice(0, 2).map((kyc) => (
                  <div key={kyc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      {kyc.selfie_image ? (
                        <img src={kyc.selfie_image} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#F3EDF9] border-2 border-white shadow-sm flex items-center justify-center text-[#A989C8] font-bold text-xs">
                          {kyc.user_info.first_name?.[0] || ''}{kyc.user_info.last_name?.[0] || ''}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-800">{kyc.full_name}</p>
                        <p className="text-[11px] text-gray-400 font-medium">Submitted {new Date(kyc.submitted_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/admin/kyc/${kyc.id}`)} 
                      className="bg-[#A989C8]/10 text-[#A989C8] text-[10px] font-black px-4 py-2 rounded-xl hover:bg-[#A989C8] hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Review
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bookings Preview */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3>
              <button 
                onClick={() => navigate('/admin/bookings')} 
                className="flex items-center gap-1 text-[#A989C8] text-xs font-black hover:underline underline-offset-4 uppercase tracking-wider"
              >
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-50 rounded-3xl">
              <FileText className="text-gray-200 mb-2" size={32} />
              <p className="text-gray-400 text-sm font-medium">No recent bookings found</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
