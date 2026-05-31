import { useEffect, useState, useCallback } from "react";
import { Plus, Home, Users, TrendingUp, ShieldCheck, Eye, Edit, Trash2, MessageCircle, Calendar, Mail, Phone, BookOpen, Heart, ArrowRight, Building2, Ban, Clock, Flag, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import PublicNavbar from "../../components/Navbar/PublicNavbar";
import Footer from "../../components/Footer";
import { useAuth } from "../../context/AuthContext";
import { useProperties } from "../../context/PropertyContext";
import socketService from "../../services/socketService";

import StatCard from "../../components/Dashboard/StatCard";
import QuickActions from "../../components/Dashboard/QuickActions";
import RecentActivity from "../../components/Dashboard/RecentActivity";

import ProfileCard from "../../components/Profile/ProfileCard";
import chatService from "../../services/chatService";
import { toConversationView } from "../../utils/chatUtils";
import { getKYCStatus, getLandlordDashboard, deleteProperty, getUserBookings, getUserFavorites, getSuspensionStatus, getUserWarnings, markWarningRead } from "../../services/api";
import API from "../../services/api";
import type { ConversationView } from "../../type";

interface DashboardData {
  kyc_status?: string;
  total_properties: number;
  available_properties: number;
  can_add_property: boolean;
}

function RecentMessages({ userId, userType }: { userId: number; userType?: string }) {
  const [conversations, setConversations] = useState<ConversationView[]>([]);

  const loadRecent = useCallback(() => {
    if (!userId) return;
    chatService.getConversations().then((data) => {
      const views = data.map((c) => toConversationView(c, userId, userType));
      setConversations(views.slice(0, 5));
    });
  }, [userId, userType]);

  useEffect(() => {
    if (!userId) return;
    loadRecent();
    socketService.connect();
    socketService.joinUserRoom(userId);
    const handleNotification = () => loadRecent();
    socketService.onNewNotification(handleNotification);
    const pollInterval = setInterval(() => loadRecent(), 10000);
    return () => {
      socketService.removeListener("new-notification", handleNotification as any);
      clearInterval(pollInterval);
    };
  }, [userId, loadRecent]);
  if (!userId) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
      <h3 className="font-bold text-lg mb-3 text-gray-900">Recent Messages</h3>
      {conversations.length === 0 ? (
        <div className="text-gray-400 text-sm flex items-center gap-2 py-2">
          <MessageCircle className="w-4 h-4" /> No recent messages
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => window.location.href = "/chat"}
              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -mx-2 transition"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A989C8] to-[#8d6aa9] flex items-center justify-center text-white font-bold shrink-0 text-sm">
                {conv.participantName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-900 truncate">{conv.participantName}</span>
                  {conv.lastMessageTime && (
                    <span className="text-[10px] text-gray-400 shrink-0">{conv.lastMessageTime}</span>
                  )}
                </div>
                {conv.propertyTitle && (
                  <p className="text-[11px] text-[#A989C8] truncate">{conv.propertyTitle}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs truncate flex-1 ${conv.unreadCount > 0 ? "font-semibold text-gray-800" : "text-gray-500"}`}>
                    {conv.lastMessage || "No messages yet"}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 text-right">
        <a href="/chat" className="text-[#A989C8] text-sm font-medium hover:underline">View all messages →</a>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { properties, fetchProperties } = useProperties();
  const [kyc, setKyc] = useState<any>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [suspension, setSuspension] = useState<any>(null);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [chatUnread, setChatUnread] = useState(0);

  const userType = user?.user_type || "tenant";
  const isOwner = userType === "owner";
  const fullName = user ? `${user.first_name}` : "User";

  const handleDeleteProperty = async (propertyId: number, propertyTitle: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${propertyTitle}"? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteProperty(propertyId);
      await fetchProperties();
      const dashData = await getLandlordDashboard();
      setDashboard(dashData);
      alert("Property deleted successfully!");
    } catch (error) {
      console.error("Failed to delete property:", error);
      alert("Failed to delete property. Please try again.");
    }
  };

  useEffect(() => {
    chatService.getConversations().then((data) => {
      setChatUnread(data.reduce((sum, c) => sum + (c.unread_count || 0), 0));
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check suspension status
        const suspData = await getSuspensionStatus();
        setSuspension(suspData);
        
        // Get user warnings
        const warnData = await getUserWarnings();
        setWarnings(warnData.results || []);
        
        if (isOwner) {
          const kycData = await getKYCStatus();
          setKyc(kycData);
          const dashData = await getLandlordDashboard();
          setDashboard(dashData);
          await fetchProperties();
          try {
            const bookingsRes = await API.get('landlord/bookings/');
            const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : (bookingsRes.data.results || []);
            setRecentTenants(bookings);
          } catch (e) {}
        } else {
          try {
            const bookings = await getUserBookings();
            setUserBookings(Array.isArray(bookings) ? bookings : (bookings.results || []));
          } catch (e) {}
          try {
            const favs = await getUserFavorites();
            setWishlistCount(Array.isArray(favs) ? favs.length : 0);
          } catch (e) {}
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };
    fetchData();
  }, [fetchProperties, isOwner]);

  const kycLabel = kyc
    ? kyc.status === "approved" ? "Verified"
      : kyc.status === "pending" ? "Pending"
      : "Rejected"
    : "Not Submitted";

  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen py-6 sm:py-8 font-inter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold font-poppins">
              Welcome back, {fullName}!
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              {isOwner ? "Manage your properties and tenants" : "Browse and manage your rentals"}
            </p>
          </div>

          {/* Unread Warnings */}
          {warnings.filter(w => !w.is_read).length > 0 && (
            <div className="mb-6 space-y-2">
              {warnings.filter(w => !w.is_read).map((w: any) => (
                <div key={w.id} className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                    <Flag size={16} className="text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-yellow-800 text-sm">Warning: {w.reason_display}</h4>
                        <p className="text-sm text-yellow-700 mt-0.5">{w.message}</p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await markWarningRead(w.id);
                            setWarnings(prev => prev.map(x => x.id === w.id ? { ...x, is_read: true } : x));
                          } catch (e) {}
                        }}
                        className="text-xs text-yellow-600 hover:text-yellow-800 font-medium shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="text-xs text-yellow-500 mt-1">
                      By {w.issued_by_name} · {new Date(w.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suspension Banner */}
          {suspension?.is_suspended && suspension?.suspension && (
            <div className="mb-6 p-4 sm:p-5 rounded-xl bg-red-50 border-2 border-red-200">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Ban size={24} className="text-red-500" />
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-lg font-bold text-red-800">Account Suspended</h3>
                  <p className="text-sm text-red-700 mt-1">{suspension.suspension.reason}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-red-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} />
                      Duration: {suspension.suspension.duration_display}
                    </span>
                    {suspension.suspension.expires_at && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={13} />
                        Expires: {new Date(suspension.suspension.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 p-3 bg-red-100/50 rounded-lg">
                    <p className="text-xs text-red-700 font-medium">
                      While suspended, you cannot create bookings, list properties, edit listings, or make payments.
                    </p>
                  </div>
                </div>
                <a
                  href="mailto:support@stayeasy.com"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors shrink-0"
                >
                  Contact Support
                </a>
              </div>
            </div>
          )}

          {isOwner ? (
            <>
              {/* Owner Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={Home} label="Total Properties" value={dashboard?.total_properties.toString() || "0"} />
                <StatCard icon={Users} label="Available" value={dashboard?.available_properties.toString() || "0"} />
                <StatCard icon={TrendingUp} label="Total Tenants" value={recentTenants.length > 0 ? new Map(recentTenants.map((b: any) => [b.user_info?.id, true])).size.toString() : "0"} />
                <StatCard icon={ShieldCheck} label="KYC Status" value={kycLabel} />
              </div>

              {/* KYC Warning */}
              {kyc && kyc.status !== "approved" && (
                <div className="mb-6 p-4 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-800">
                  {kyc.status === "pending" ? (
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">KYC Verification Required</p>
                        <p className="text-sm mt-1">Your KYC is under review. You cannot add new properties until it is approved.</p>
                      </div>
                    </div>
                  ) : kyc.status === "rejected" ? (
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
                      <div className="w-full">
                        <p className="font-bold">KYC Rejected</p>
                        <p className="text-sm mt-1">Your KYC verification was rejected. Please resubmit valid documents to add properties.</p>
                        <button onClick={() => navigate('/kyc')}
                          className="w-full sm:w-auto mt-2 px-4 py-1.5 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded-lg text-sm font-medium transition">
                          Resubmit KYC
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
                      <div className="w-full">
                        <p className="font-bold">KYC Not Submitted</p>
                        <p className="text-sm mt-1">You must submit KYC verification before adding properties.</p>
                        <button onClick={() => navigate('/kyc')}
                          className="w-full sm:w-auto mt-2 px-4 py-1.5 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded-lg text-sm font-medium transition">
                          Submit KYC
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Owner Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {properties.length === 0 ? (
                    <div className="bg-white rounded-2xl border p-10 flex flex-col items-center justify-center min-h-[300px]">
                      <div className="w-20 h-20 bg-[#F3E8FF] rounded-full flex items-center justify-center mb-6">
                        <Plus size={28} className="text-[#A989C8]" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">No Properties Listed Yet</h2>
                      <p className="text-gray-500 max-w-md mx-auto mb-6 text-center leading-relaxed">
                        Start building your rental portfolio by adding your first property.
                      </p>
                      <button
                        className="flex items-center gap-2 bg-[#A989C8] hover:bg-[#9b7bb8] text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-[#A989C8]/20 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => navigate("/add-property")}
                        disabled={dashboard ? !dashboard.can_add_property : false}
                      >
                        <Plus size={20} /> Add Your First Property
                      </button>
                      {dashboard && !dashboard.can_add_property && (
                        <p className="text-red-500 text-sm mt-4">*Approve your KYC first to add properties</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Your Properties</h2>
                        <button
                          className="flex items-center gap-2 bg-[#A989C8] hover:bg-[#9b7bb8] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
                          onClick={() => navigate("/add-property")}
                        >
                          <Plus size={16} /> Add Property
                        </button>
                      </div>
                      {properties.map((property) => (
                        <div key={property.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg transition-shadow">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-32 h-40 sm:h-32 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                              {property.images && property.images.length > 0 ? (
                                <img src={`http://127.0.0.1:8000${property.images[0].image}`} alt={property.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-sm">No image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-900">{property.title}</h3>
                              <p className="text-gray-600 text-sm">{property.address}</p>
                              <div className="flex items-center gap-4 mt-3 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  property.has_confirmed_booking ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {property.has_confirmed_booking ? 'Booked' : 'Available'}
                                </span>
                                <span className="text-gray-700 font-semibold">NPR {property.price.toLocaleString()}/month</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="text-[#A989C8] hover:text-[#9b7bb8] p-2 rounded-lg hover:bg-gray-100" onClick={() => navigate(`/property/${property.id}`)} title="View"><Eye size={20} /></button>
                              <button className="text-orange-500 hover:text-orange-700 p-2 rounded-lg hover:bg-orange-50" onClick={() => navigate(`/add-property/${property.id}`)} title="Edit"><Edit size={20} /></button>
                              <button className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50" onClick={() => handleDeleteProperty(property.id, property.title)} title="Delete"><Trash2 size={20} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <QuickActions />
                  {recentTenants.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <Users size={18} className="text-[#A989C8]" /> Recent Tenants
                        </h3>
                        <button onClick={() => navigate('/tenant')} className="text-xs text-[#A989C8] font-medium hover:underline">View All ({recentTenants.length})</button>
                      </div>
                      <div className="space-y-3">
                        {recentTenants.slice(0, 5).map((booking: any) => {
                          const first = booking.user_info?.first_name || '';
                          const last = booking.user_info?.last_name || '';
                          const name = `${first} ${last}`.trim() || booking.user_info?.email || 'Unknown';
                          const initial = (first[0] || last[0] || '?').toUpperCase();
                          const kycOk = booking.user_info?.kyc_status === 'approved';
                          return (
                            <div key={booking.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                              <div className={`w-10 h-10 rounded-full ${kycOk ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{initial}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Home size={11} />{booking.property_info?.title || 'Property'}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'pending' || booking.status === 'processing' ? 'bg-purple-100 text-purple-700' :
                                'bg-red-100 text-red-700'
                              }`}>{booking.status === 'confirmed' ? 'Booked' : booking.status === 'pending' ? 'Processing' : booking.status}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <RecentActivity />
                  {user && <RecentMessages userId={user.id} userType={user.user_type} />}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Tenant Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={BookOpen} label="My Bookings" value={userBookings.length.toString()} />
                <StatCard icon={Home} label="Active Rentals" value={userBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'processing').length.toString()} />
                <StatCard icon={Heart} label="Wishlist" value={wishlistCount.toString()} />
                <StatCard icon={MessageCircle} label="Messages" value="0" />
              </div>

              {/* Tenant Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">My Recent Bookings</h2>
                    <button onClick={() => navigate('/my-bookings')} className="text-sm text-[#A989C8] font-medium hover:underline flex items-center gap-1">
                      View All <ArrowRight size={14} />
                    </button>
                  </div>
                  {userBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl border p-10 flex flex-col items-center justify-center min-h-[250px]">
                      <div className="w-16 h-16 bg-[#F3E8FF] rounded-full flex items-center justify-center mb-4">
                        <Home size={28} className="text-[#A989C8]" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Bookings Yet</h3>
                      <p className="text-gray-500 text-sm mb-6">Start by browsing available properties</p>
                      <button onClick={() => navigate('/properties')}
                        className="flex items-center gap-2 bg-[#A989C8] hover:bg-[#9b7bb8] text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-[#A989C8]/20">
                        <Building2 size={18} /> Browse Properties
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userBookings.slice(0, 5).map((booking: any) => (
                        <div key={booking.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-gray-900">{booking.property_title || `Property #${booking.property}`}</h4>
                              <p className="text-sm text-gray-500 mt-0.5">
                                <Calendar size={13} className="inline mr-1" />
                                {new Date(booking.check_in).toLocaleDateString()} – {new Date(booking.check_out).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                booking.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>{booking.status}</span>
                              <span className="text-sm font-semibold text-gray-700">NPR {Number(booking.total_price).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <button onClick={() => navigate('/favorites')}
                      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow text-left">
                      <Heart size={20} className="text-red-400 mb-2" />
                      <p className="font-bold text-gray-900">Wishlist</p>
                      <p className="text-xs text-gray-500">{wishlistCount} saved properties</p>
                    </button>
                    <button onClick={() => navigate('/chat')}
                      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow text-left relative">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle size={20} className="text-[#A989C8]" />
                        {chatUnread > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shadow-sm">
                            {chatUnread > 9 ? "9+" : chatUnread}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-gray-900">Messages</p>
                      <p className="text-xs text-gray-500">{chatUnread > 0 ? `${chatUnread} unread` : "Chat with landlords"}</p>
                    </button>
                    <button onClick={() => navigate('/agreements')}
                      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow text-left">
                      <FileText size={20} className="text-[#A989C8] mb-2" />
                      <p className="font-bold text-gray-900">Agreements</p>
                      <p className="text-xs text-gray-500">View rental agreements</p>
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  <QuickActions />
                  <RecentActivity />
                  {user && <RecentMessages userId={user.id} userType={user.user_type} />}
                </div>
              </div>
            </>
          )}
        </div>
        <ProfileCard name={fullName} />
      </main>
      <Footer />
    </>
  );
};

export default Dashboard;
