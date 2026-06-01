import { useEffect, useState, useCallback, useRef } from "react";
import {
  Home, ChevronDown, LogOut, Settings, MessageCircle, Menu, X, FileText,
  Shield, Users, CreditCard, RotateCcw, PlusCircle,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import chatService from "../../services/chatService";
import socketService from "../../services/socketService";
import { getKYCStatus, getAgreements, getRefundRequests } from "../../services/api";
import NotificationsDropdown from "./NotificationsDropdown";
import type { MessagePayload } from "../../type";

export default function PublicNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [newMessage, setNewMessage] = useState(false);
  const newMsgTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [kycPending, setKycPending] = useState(false);
  const [unsignedCount, setUnsignedCount] = useState(0);
  const [pendingRefundCount, setPendingRefundCount] = useState(0);

  const refreshUnread = useCallback(() => {
    if (!user?.id) return;
    chatService.getConversations().then((conversations) => {
      const count = conversations.reduce(
        (sum, c) => sum + (c.unread_count || 0), 0
      );
      setUnread(count);
    });
  }, [user]);

  const fetchBadges = useCallback(async () => {
    if (!user) return;
    const isOwner = user.user_type === "owner";
    if (isOwner) {
      const kyc = await getKYCStatus();
      setKycPending(kyc?.status === "pending" || kyc?.status === "not_submitted");
      const ags = await getAgreements();
      setUnsignedCount(ags.filter((a: any) => a.status === "pending_landlord").length);
      const refunds = await getRefundRequests();
      setPendingRefundCount(refunds.filter((r: any) => r.status === "pending").length);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    refreshUnread();
    fetchBadges();
  }, [user, refreshUnread, fetchBadges]);

  useEffect(() => {
    if (!user?.id) return;
    socketService.connect();
    socketService.joinUserRoom(user.id);

    const handleMessage = (msg: MessagePayload) => {
      if (msg.userId !== user.id) {
        refreshUnread();
        setNewMessage(true);
        if (newMsgTimer.current) clearTimeout(newMsgTimer.current);
        newMsgTimer.current = setTimeout(() => setNewMessage(false), 4000);
      }
    };
    const handleNotification = () => { refreshUnread(); fetchBadges(); };

    socketService.onMessageReceived(handleMessage);
    socketService.onNewNotification(handleNotification);

    const pollInterval = setInterval(() => { refreshUnread(); fetchBadges(); }, 15000);

    return () => {
      socketService.removeListener("receive-message", handleMessage);
      socketService.removeListener("new-notification", handleNotification as any);
      clearInterval(pollInterval);
      if (newMsgTimer.current) clearTimeout(newMsgTimer.current);
    };
  }, [user, refreshUnread, fetchBadges]);

  const role = user?.user_type;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNav = (to: string) => {
    setIsMenuOpen(false);
    if (location.pathname === to) {
      navigate(0);
    } else {
      navigate(to);
    }
  };

  const avatar = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "U";

  const fullName = user ? `${user.first_name} ${user.last_name}` : "User";

  const navLinks = role === "owner"
    ? [
        { to: "/dashboard", label: t('navbar_dashboard') },
        { to: "/properties", label: t('navbar_properties') },
        { to: "/about", label: t('navbar_about') },
      ]
    : [
        { to: "/home", label: t('navbar_home') },
        ...(role === "tenant"
          ? [
              { to: "/my-bookings", label: t('navbar_bookings') },
              { to: "/favorites", label: t('navbar_favorites') },
            ]
          : []),
        { to: "/about", label: t('navbar_about') },
      ];

  const isOwner = role === "owner";

  const menuItems = isOwner
    ? [
        { section: t('navbar_account'), items: [
          { label: t('navbar_profile_settings'), icon: Settings, to: "/profile" },
          { label: t('navbar_complete_kyc'), icon: Shield, to: "/kyc", badge: kycPending ? "pending" : null },
        ]},
        { section: t('navbar_management'), items: [
          { label: t('navbar_view_tenants'), icon: Users, to: "/tenant" },
          { label: t('navbar_agreements'), icon: FileText, to: "/landlord/agreements", badge: unsignedCount > 0 ? unsignedCount : null },
          { label: t('navbar_payment_history'), icon: CreditCard, to: "/payment-history" },
          { label: t('navbar_refund_requests'), icon: RotateCcw, to: "/refunds", badge: pendingRefundCount > 0 ? pendingRefundCount : null },
        ]},
        { section: t('navbar_actions'), items: [
          { label: t('navbar_properties_add'), icon: PlusCircle, to: "/add-property" },
        ]},
      ]
    : [
        { section: "", items: [
          { label: t('navbar_profile_settings'), icon: Settings, to: "/profile" },
          { label: t('navbar_agreements'), icon: FileText, to: "/agreements" },
        ]},
      ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* LOGO */}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate(window.location.pathname, { replace: true }); }} className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#A989C8] rounded-xl flex items-center justify-center shadow-md">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-800">StayEasy</span>
          </a>

          {/* DESKTOP NAV LINKS */}
          <div className="hidden md:flex items-center gap-8 lg:gap-12">
            {navLinks.map((link) => (
              <NavItem key={link.to} to={link.to} label={link.label} currentPath={location.pathname} />
            ))}
          </div>

          {/* USER SECTION */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <>
                <Link
                  to="/chat"
                  className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-lg transition relative group ${
                    newMessage ? "bg-red-50" : "hover:bg-gray-100"
                  }`}
                  title="Messages"
                >
                  <MessageCircle className={`w-5 h-5 transition-colors ${
                    newMessage ? "text-red-500" : "text-gray-700 group-hover:text-[#A989C8]"
                  }`} />
                  {unread > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm ${
                      newMessage ? "animate-pulse ring-2 ring-red-300" : ""
                    }`}>
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <div className="hidden sm:block"><NotificationsDropdown /></div>
              </>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 bg-[#A989C8] text-white rounded-xl flex items-center justify-center font-bold text-sm">
                    {avatar}
                  </div>
                  <span className="hidden lg:block font-medium text-gray-800 text-sm">
                    {fullName}
                  </span>
                  <ChevronDown className={`text-gray-400 w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-[300px] bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn">
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                      <div className="w-10 h-10 bg-[#A989C8] text-white rounded-xl flex items-center justify-center font-bold text-sm">
                        {avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
                      </div>
                    </div>

                    {/* Menu sections */}
                    {menuItems.map((section, si) => (
                      <div key={si}>
                        {section.section && (
                          <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {section.section}
                          </p>
                        )}
                        {section.items.map((item, ii) => (
                          <button
                            key={`${si}-${ii}`}
                            onClick={() => handleNav(item.to)}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#A989C8] transition text-left"
                          >
                            <item.icon size={17} className="shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge != null && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                typeof item.badge === "number"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {typeof item.badge === "number" ? item.badge : "pending"}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}

                    {/* Divider before Logout */}
                    <hr className="my-1 mx-4 border-gray-100" />

                    {/* Logout */}
                    <button
                      onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
                    >
                      <LogOut size={17} className="shrink-0" />
                      <span className="font-medium">{t('navbar_logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-[#A989C8] text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-[#9b7bb8]"
              >
                {t('navbar_sign_in')}
              </Link>
            )}

            {/* Mobile hamburger */}
            {user && (
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              >
                {mobileOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
              </button>
            )}
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileOpen && user && (
          <div className="md:hidden pb-4 border-t border-gray-100">
            <div className="flex flex-col gap-1 pt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    location.pathname === link.to || location.pathname.startsWith(link.to + "/")
                      ? "text-[#A989C8] bg-[#F3E8FF]"
                      : "text-gray-700 hover:text-[#A989C8] hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 flex flex-col gap-2">
              <Link
                to="/chat"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-[#A989C8] hover:bg-gray-50"
              >
                <MessageCircle size={18} />
                {t('navbar_messages')}
                {unread > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{unread}</span>
                )}
              </Link>
              {menuItems.map((section, si) => (
                <div key={si}>
                  {section.items.map((item, ii) => (
                    <button
                      key={`${si}-${ii}`}
                      onClick={() => { setMobileOpen(false); handleNav(item.to); }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-[#A989C8] hover:bg-gray-50 text-left"
                    >
                      <item.icon size={18} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge != null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          typeof item.badge === "number"
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {typeof item.badge === "number" ? item.badge : "pending"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full text-left"
              >
                <LogOut size={18} />
                {t('navbar_logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/* NAV ITEM */
function NavItem({ to, label, currentPath }: { to: string; label: string; currentPath?: string }) {
  const isActive = currentPath === to || currentPath?.startsWith(to + "/");
  return (
    <Link
      to={to}
      className={`font-medium transition text-sm lg:text-base ${
        isActive ? "text-[#A989C8]" : "text-gray-700 hover:text-[#A989C8]"
      }`}
    >
      {label}
    </Link>
  );
}
