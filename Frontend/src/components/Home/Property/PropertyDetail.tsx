import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import {
  MapPin,
  Star,
  ShieldCheck,
  Share2,
  Heart,
  Wifi,
  Droplets,
  Sofa,
  Car,
  Lock,
  CheckCircle2,
  Maximize,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  X,
  AlertCircle,
} from "lucide-react";

import PublicNavbar from "../../Navbar/PublicNavbar";
import Footer from "../../Footer";
import PropertyMapDisplay from '../../Map/PropertyMapDisplay';
import { getPropertyDetail } from "../../../services/api";
import { AuthContext } from "../../../context/AuthContext";
import chatService from "../../../services/chatService";
import { canChat, toConversationView } from "../../../utils/chatUtils";
import RequestBookingModal from "../../BookingRequest/RequestBookingModal";
import RequestSentModal from "../../BookingRequest/RequestSentModal";
import ConversationWindow from "../../Chat/ConversationWindow";
import type { ConversationView } from "../../../type";
import axios from "axios";

export default function PropertyDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const authContext = useContext(AuthContext);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [chatOverlay, setChatOverlay] = useState<ConversationView | null>(null);
  
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [refundInfo, setRefundInfo] = useState<{
    refund_amount: number;
    refund_percentage: number;
    policy_applied: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSentModal, setShowSentModal] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        if (!id) {
          setError("Property ID not found");
          return;
        }
        const data = await getPropertyDetail(Number(id));
        setProperty(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching property:", err);
        setError("Failed to load property details");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <PublicNavbar />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#A989C8] rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="text-gray-600 text-lg font-medium">Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <PublicNavbar />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
            <p className="text-red-500 text-lg font-medium mb-4">{error || "Property not found"}</p>
            <button
              onClick={() => navigate("/home")}
              className="px-6 py-2 bg-[#A989C8] text-white rounded-lg font-medium hover:bg-[#8d6aa9] transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const images = property.images && property.images.length > 0 ? property.images : [{ image: "/no-image.png" }];
  const currentImage = images[currentImageIndex];
  const imageUrl = currentImage?.image
    ? currentImage.image.startsWith("http")
      ? currentImage.image
      : `http://127.0.0.1:8000${currentImage.image}`
    : "/no-image.png";

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const amenities = [
    { icon: Wifi, label: "WiFi", available: true },
    { icon: Car, label: "Parking", available: true },
    { icon: Droplets, label: "Water 24/7", available: true },
    { icon: Lock, label: "Security", available: true },
    { icon: Sofa, label: "Furnished", available: true },
    { icon: CheckCircle2, label: "Balcony", available: true },
  ];

  // Handler for opening cancel modal and calculating refund
  const handleOpenCancelModal = async () => {
    if (!property.booking_id) return;

    setCancelError(null);
    setRefundInfo(null);

    try {
      // Use booking check-in date from property data
      // The backend now provides booking_check_in, booking_check_out, booking_total_price
      const moveInDate = new Date(property.booking_check_in || Date.now());
      const today = new Date();
      const daysUntilMoveIn = Math.floor(
        (moveInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Use booking total price from backend
      const totalAmount = property.booking_total_price || parseInt(property.price);
      let refundPercentage = 0;
      let policyText = "";

      // Debug logging
      console.log("🔍 [CANCEL MODAL DEBUG]");
      console.log("  Booking ID:", property.booking_id);
      console.log("  Booking Check-in:", property.booking_check_in);
      console.log("  Move-in Date:", moveInDate);
      console.log("  Days until move-in:", daysUntilMoveIn);
      console.log("  Total Amount:", totalAmount);

      if (daysUntilMoveIn >= 7) {
        refundPercentage = 100;
        policyText = "Full refund (7+ days before move-in)";
      } else if (daysUntilMoveIn >= 3) {
        refundPercentage = 50;
        policyText = "50% refund (3-6 days before move-in)";
      } else if (daysUntilMoveIn > 0) {
        refundPercentage = 0;
        policyText = "No refund (Less than 3 days before move-in)";
      } else {
        refundPercentage = 0;
        policyText = "No refund (Move-in date has passed)";
      }

      const refundAmount = totalAmount * (refundPercentage / 100);

      console.log("  Refund Percentage:", refundPercentage);
      console.log("  Refund Amount:", refundAmount);

      setRefundInfo({
        refund_amount: refundAmount,
        refund_percentage: refundPercentage,
        policy_applied: policyText,
      });

      setShowCancelModal(true);
    } catch (err) {
      console.error("Error calculating refund:", err);
      setCancelError("Failed to calculate refund. Please try again.");
    }
  };

  // Handler for confirming cancellation
  const handleConfirmCancel = async () => {
    if (!property.booking_id) return;

    setCancelLoading(true);
    setCancelError(null);

    try {
      const token = localStorage.getItem("access");
      if (!token) {
        setCancelError("Authentication token not found. Please login again.");
        setCancelLoading(false);
        return;
      }

      // Call the cancel booking API
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/bookings/${property.booking_id}/cancel/`,
        { reason: "User requested cancellation" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        // Success!
        setSuccessMessage(
          `Booking cancelled successfully. Refund of NPR ${refundInfo?.refund_amount.toLocaleString()} will be processed.`
        );

        // Update property state to show cancelled status
        setProperty((prev: any) => ({
          ...prev,
          has_confirmed_booking: false,
          booking_status: "cancelled",
        }));

        setShowCancelModal(false);

        // Show success message for 5 seconds then hide
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      }
    } catch (err: any) {
      console.error("Error cancelling booking:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to cancel booking. Please try again.";
      setCancelError(errorMsg);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <PublicNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex text-sm text-gray-500 gap-2 mb-8">
          <button onClick={() => navigate("/home")} className="hover:text-[#A989C8] transition font-medium">Home</button>
          <span>/</span>
          <button onClick={() => navigate("/properties")} className="hover:text-[#A989C8] transition font-medium">Properties</button>
          <span>/</span>
          <span className="text-gray-700 font-semibold">{property.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
              <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] bg-gray-200 overflow-hidden group">
                <img src={imageUrl} alt={property.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                  onClick={() => setShowLightbox(true)} onError={(e) => { e.currentTarget.src = "/no-image.png"; }} />
                {images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition">
                      <ChevronLeft className="w-6 h-6 text-gray-800" />
                    </button>
                    <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition">
                      <ChevronRight className="w-6 h-6 text-gray-800" />
                    </button>
                  </>
                )}
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">{currentImageIndex + 1} / {images.length}</div>
                <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"><Maximize className="w-4 h-4" /> Click to zoom</div>
              </div>
              {images.length > 1 && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img: any, idx: number) => (
                      <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`min-w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border-2 transition ${idx === currentImageIndex ? "border-[#A989C8] shadow-lg" : "border-gray-200 hover:border-[#A989C8]"}`}>
                        <img src={img.image?.startsWith("http") ? img.image : `http://127.0.0.1:8000${img.image}`} alt={`${property.title} ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/no-image.png"; }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

{showLightbox && (
  <div
    className="fixed inset-0 z-40 flex flex-col items-center justify-center"
    style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(40px)" }}
    onClick={() => setShowLightbox(false)}
  >
    <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-gray-500 text-sm" style={{ background: "rgba(0,0,0,0.06)", border: "0.5px solid rgba(0,0,0,0.08)" }}>
      {currentImageIndex + 1} / {images.length}
    </div>

    <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <img
        src={imageUrl}
        alt={property.title}
        style={{ maxHeight: "80vh", maxWidth: "90vw", borderRadius: "20px", objectFit: "contain", display: "block" }}
        className="sm:max-w-[75vw]"
        onError={(e) => { e.currentTarget.src = "/no-image.png"; }}
      />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-2 sm:-left-16 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.08)", border: "0.5px solid rgba(0,0,0,0.1)" }}>
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-2 sm:-right-16 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.08)", border: "0.5px solid rgba(0,0,0,0.1)" }}>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
          </button>
        </>
      )}
    </div>

    <div className="absolute bottom-8 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((_: any, idx: number) => (
            <button key={idx} onClick={() => setCurrentImageIndex(idx)} className="rounded-full transition-all duration-300" style={{ width: idx === currentImageIndex ? "24px" : "7px", height: "7px", background: idx === currentImageIndex ? "#A989C8" : "rgba(0,0,0,0.2)" }} />
          ))}
        </div>
      )}
    </div>
  </div>
)}

            {/* Header */}
            <div className="bg-white rounded-3xl shadow-lg p-8">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{property.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
                  <span className="flex items-center gap-2 text-gray-600"><MapPin className="w-5 h-5 text-[#A989C8]" /> {property.city}</span>
                  <span className="flex items-center gap-2 text-yellow-500 font-semibold"><Star className="w-5 h-5 fill-yellow-500" /> 4.8 (24 reviews)</span>
                  <span className="flex items-center gap-2 text-green-600 font-semibold"><ShieldCheck className="w-5 h-5" /> Verified</span>
                </div>
              </div>
              <div className="flex gap-3 mb-6">
                <button className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"><Share2 className="w-5 h-5" /> Share</button>
                <button className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"><Heart className="w-5 h-5" /> Save</button>
              </div>
              <div className="border-t border-gray-200 pt-6">
                <p className="text-gray-600 text-sm font-medium mb-2">Monthly Rent</p>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#A989C8] mb-4">NPR {parseInt(property.price).toLocaleString()}<span className="text-lg sm:text-xl lg:text-2xl text-gray-500 font-normal">/month</span></p>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-3xl shadow-lg p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">About this property</h2>
              <p className="text-gray-600 leading-relaxed text-lg mb-6">{property.description || `Beautiful ${property.property_type} located in ${property.city}. Fully furnished with modern amenities and excellent location.`}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-gray-200 pt-6">
                <div><p className="text-gray-500 text-sm font-medium mb-2">Type</p><p className="text-xl font-bold text-gray-900">{property.property_type}</p></div>
                <div><p className="text-gray-500 text-sm font-medium mb-2">Location</p><p className="text-xl font-bold text-gray-900">{property.city}</p></div>
                
                <div>
  <p className="text-gray-500 text-sm font-medium mb-2">Status</p>
  <p className={`text-xl font-bold capitalize flex items-center gap-2 ${
    property.has_confirmed_booking ? "text-red-500" : "text-green-600"
  }`}>
    <span className={`w-3 h-3 rounded-full ${property.has_confirmed_booking ? "bg-red-500" : "bg-green-500"}`} />
    {property.has_confirmed_booking ? "Booked" : "Available"}
  </p>
</div>

              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-3xl shadow-lg p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {amenities.map((amenity, idx) => {
                  const Icon = amenity.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-transparent rounded-xl border border-purple-100">
                      <div className="w-12 h-12 bg-[#A989C8] rounded-lg flex items-center justify-center"><Icon className="w-6 h-6 text-white" /></div>
                      <span className="font-semibold text-gray-800">{amenity.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

{/* Owner */}
<div className="bg-white rounded-3xl shadow-lg p-8">
  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
    Hosted by {property.owner_name || property.landlord_name || "Owner"}
  </h2>

  <div className="flex items-start justify-between mb-8">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-gradient-to-br from-[#A989C8] to-[#8d6aa9] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
        {(property.owner_name || property.landlord_name || "O").charAt(0).toUpperCase()}
      </div>

      <div>
        <p className="text-xl font-bold text-gray-900">
          {property.owner_name || "Property Owner"}
        </p>

        <p className="text-gray-600 flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          4.9 rating · 12 properties
        </p>
      </div>
    </div>
  </div>

  <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
    {canChat(authContext?.user || null) && (
      <button
        onClick={async () => {
          if (!authContext?.user) {
            navigate("/login");
            return;
          }

          try {
            const userId = authContext.user.id;
            const propertyId = parseInt(id || "0");

            const conv = await chatService.getOrCreateConversation(userId, property.landlord_id, propertyId);

            if (conv && authContext.user) {
              setChatOverlay(toConversationView(conv, authContext.user.id, authContext.user.user_type));
            }
          } catch (err) {
            console.error("Failed to start chat", err);
          }
        }}
        className="flex items-center justify-center gap-2 py-4 bg-[#A989C8] hover:bg-[#8d6aa9] text-white font-bold rounded-xl transition shadow-lg"
      >
        <MessageCircle className="w-5 h-5" />
        Chat with Owner
      </button>
    )}

    <button className="flex items-center justify-center gap-2 py-4 border-2 border-[#A989C8] text-[#A989C8] hover:bg-[#A989C8] hover:text-white font-bold rounded-xl transition">
      <Phone className="w-5 h-5" />
      Call Owner
    </button>
  </div>

  <p className="text-xs text-gray-400 text-center mt-4">
    Direct communication with property owner • Response within 2 hours
  </p>
</div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-3xl shadow-lg p-8">
                <p className="text-gray-600 text-sm font-medium mb-2">Starting from</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#A989C8] mb-6">NPR {parseInt(property.price).toLocaleString()}<span className="text-base sm:text-lg text-gray-500 font-normal block">/month</span></p>
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600"><span>Monthly Rent</span><span className="font-semibold text-gray-900">NPR {parseInt(property.price).toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-gray-600"><span>Security Deposit</span><span className="font-semibold text-gray-900">NPR {(parseInt(property.price) * 2).toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-gray-600"><span>Service Fee (5%)</span><span className="font-semibold text-gray-900">NPR {(parseInt(property.price) * 0.05).toLocaleString()}</span></div>
                </div>
                <div className="flex justify-between mb-6"><span className="font-bold text-gray-900">Total (First Month)</span><span className="text-2xl font-bold text-[#A989C8]">NPR {(parseInt(property.price) * 3.05).toLocaleString()}</span></div>
                <div className="mb-6"><label className="text-xs font-bold text-gray-700 uppercase block mb-2">Move-in Date</label><input type="date" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A989C8]" /></div>
                {property.booking_id && property.has_confirmed_booking ? (
                  <>
                    <button disabled className="w-full py-4 bg-gray-400 text-white font-bold rounded-xl shadow-lg mb-3 cursor-not-allowed flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white" /> Booked
                    </button>
                    <button
                      onClick={handleOpenCancelModal}
                      disabled={cancelLoading}
                      className="w-full py-4 bg-[#A989C8] hover:bg-[#8d6aa9] text-white font-bold rounded-xl shadow-lg mb-3 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {cancelLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <X size={18} />
                          Cancel Booking
                        </>
                      )}
                    </button>
                  </>
                ) : property.has_confirmed_booking ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-3 text-center">
                    <p className="text-orange-700 font-bold text-sm">Currently Booked</p>
                    <p className="text-orange-600 text-xs mt-1">This property is currently occupied</p>
                  </div>
                ) : authContext?.user?.user_type === "tenant" ? (
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => id && navigate(`/booking/${id}`)} className="flex-1 py-3 bg-[#A989C8] hover:bg-[#8d6aa9] text-white font-bold rounded-xl shadow-lg transition text-sm">Book Now</button>
                    <button onClick={() => setShowRequestModal(true)} className="flex-1 py-3 bg-white border-2 border-[#A989C8] text-[#A989C8] hover:bg-[#F3E8FF] font-bold rounded-xl transition text-sm">Request Booking</button>
                  </div>
                ) : (
                  <button onClick={() => id && navigate(`/booking/${id}`)} className="w-full py-4 bg-[#A989C8] hover:bg-[#8d6aa9] text-white font-bold rounded-xl shadow-lg transition mb-3">Book Now</button>
                )}
                <p className="text-xs text-gray-500 text-center mb-6">You won't be charged yet</p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-gray-900 text-sm">Flexible cancellation</p><p className="text-xs text-gray-600 mt-1">Full refund if you cancel 7 days before check-in</p></div></div>
                </div>
              </div>
              <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                <div className="h-80">
                  {property && property.city ? (
                    <PropertyMapDisplay 
                      latitude={property?.latitude}
                      longitude={property?.longitude}
                      propertyTitle={property?.title || 'Property'}
                      city={property?.city}
                      address={property?.address || ''}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A989C8] mx-auto mb-3"></div>
                        <p className="text-gray-600">Loading location...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#A989C8] to-[#8d6aa9] rounded-3xl shadow-lg p-6 text-white">
                <h3 className="font-bold mb-4">Quick Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> <span>Instant confirmation</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> <span>Verified landlord</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> <span>24/7 Support</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {chatOverlay && authContext?.user && (
        <ConversationWindow
          conversation={chatOverlay}
          currentUser={authContext.user}
          onClose={() => setChatOverlay(null)}
          onMinimize={() => setChatOverlay(null)}
          onDelete={() => setChatOverlay(null)}
        />
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 left-4 sm:left-auto bg-green-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-in">
          <CheckCircle2 size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Cancel your booking?</h2>
                <p className="text-gray-600 text-sm mt-1">Review the cancellation details below</p>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Booking Details */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Property</p>
                <p className="text-gray-900 font-semibold">{property.title}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Move-in Date</p>
                <p className="text-gray-900 font-semibold">
                  {property.booking_check_in 
                    ? new Date(property.booking_check_in).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })
                    : 'Not specified'
                  }
                </p>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Amount Paid</p>
                <p className="text-lg font-bold text-gray-900">
                  NPR {(property.booking_total_price || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Refund Information */}
            {refundInfo && (
              <div className={`rounded-xl p-6 mb-6 border-2 ${
                refundInfo.refund_percentage === 100 
                  ? 'bg-green-50 border-green-200'
                  : refundInfo.refund_percentage === 50 
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  {refundInfo.refund_percentage === 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{refundInfo.policy_applied}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="text-gray-700 font-semibold">Refund Amount:</span>
                  <span className="text-xl font-bold text-gray-900">
                    NPR {Math.round(refundInfo.refund_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {cancelError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{cancelError}</p>
              </div>
            )}

            {/* Cancellation Policy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-xs text-blue-900 font-medium">
                <strong>Cancellation Policy:</strong> Cancellations made 7+ days before check-in receive a full refund. 
                Cancellations made 3-6 days before receive 50% refund. Cancellations made less than 3 days before receive no refund.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
                disabled={cancelLoading}
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="flex-1 py-3 bg-[#A989C8] text-white font-bold rounded-xl hover:bg-[#8d6aa9] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cancelLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <X size={18} />
                    Yes, Cancel Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestModal && property && (
        <RequestBookingModal
          propertyId={property.id}
          propertyTitle={property.title}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => { setShowRequestModal(false); setShowSentModal(true); }}
        />
      )}
      {showSentModal && (
        <RequestSentModal onClose={() => setShowSentModal(false)} />
      )}
    </div>
  );
}
