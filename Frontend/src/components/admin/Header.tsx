import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, Settings, ChevronDown, Home, Menu, X, Check, Loader } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from '../../services/api';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setNotifLoading(true);
    const [notifs, countData] = await Promise.all([
      getNotifications(),
      getUnreadNotificationCount()
    ]);
    setNotifications(Array.isArray(notifs) ? notifs.slice(0, 10) : []);
    setUnreadCount(countData?.unread_count || 0);
    setNotifLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifToggle = () => {
    const next = !isNotifOpen;
    setIsNotifOpen(next);
    if (next) fetchNotifications();
  };

  const handleNotifClick = async (n: any) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.related_entity_type === 'booking_cancelled' || n.related_entity_type === 'booking_confirmed') {
      navigate('/admin/bookings');
    } else if (n.related_entity_type === 'kyc') {
      navigate('/admin/kyc');
    }
    setIsNotifOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const avatar = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "AD";

  return (
    <header className="w-full bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 relative">
        
        {/* Left: Brand */}
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#A989C8] to-[#A87DC2] rounded-xl flex items-center justify-center shadow-md">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">StayEasy</span>
        </Link>

        {/* Center: Label */}
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
          <span className="text-[11px] font-bold text-[#A989C8] uppercase tracking-[0.2em]">Admin Panel</span>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="md:hidden p-2 text-gray-500 hover:text-[#A989C8] transition-colors"
          aria-label="Toggle navigation"
        >
          {isMobileNavOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Right: User Actions */}
        <div className={`items-center gap-4 ${isMobileNavOpen ? 'hidden' : 'flex'}`}>
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleNotifToggle}
              className="relative p-2 text-gray-400 hover:text-[#A989C8] transition-colors"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <h4 className="font-bold text-gray-900 text-sm">Notifications</h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-[#A989C8] hover:text-[#A87DC2] uppercase tracking-wider flex items-center gap-1"
                    >
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader size={20} className="animate-spin text-[#A989C8]" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-12 text-center">
                      <Bell size={24} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-sm text-gray-400 font-medium">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/80 transition-colors flex items-start gap-3 ${
                          !n.is_read ? 'bg-[#F3EDF9]/50' : ''
                        }`}
                      >
                        <div className={`min-w-[8px] mt-1.5 h-2 w-2 rounded-full ${!n.is_read ? 'bg-[#A989C8]' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-300 font-medium mt-1">
                            {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#A989C8] to-[#A87DC2] text-white rounded-lg flex items-center justify-center text-xs font-bold">
                {avatar}
              </div>
              <span className="hidden sm:block font-bold text-gray-700 text-sm">Admin</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <Link to="/admin/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"><Settings size={16} /> Settings</Link>
                <hr className="my-1 border-gray-50" />
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full text-left font-bold"><LogOut size={16} /> Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden border-t border-gray-100 mt-3 pt-3 pb-4 space-y-2">
          <Link
            to="/admin"
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => setIsMobileNavOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            to="/admin/kyc"
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => setIsMobileNavOpen(false)}
          >
            KYC Verifications
          </Link>
          <Link
            to="/admin/properties"
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => setIsMobileNavOpen(false)}
          >
            Properties
          </Link>
          <Link
            to="/admin/bookings"
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => setIsMobileNavOpen(false)}
          >
            Bookings
          </Link>
          <Link
            to="/admin/settings"
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => setIsMobileNavOpen(false)}
          >
            Settings
          </Link>
          <button
            onClick={() => { handleLogout(); setIsMobileNavOpen(false); }}
            className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
};
