import React from "react";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import PublicNavbar from "../../Navbar/PublicNavbar";
import Confirmations from "./Conformations";
import Details from "./Details";
import Payment from "./Payment";
import Success from "./Success";
import { getPropertyDetail } from "../../../services/api";

export default function Booking() {
  const { id: propertyId } = useParams<{ id: string }>();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);

  const [bookingData, setBookingData] = useState<any>({
    propertyId: propertyId,
    moveInDate: "",
    moveOutDate: "",
    fullName: "",
    email: "",
    phone: "",
  });

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  // ✅ FETCH REAL PROPERTY DATA
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        if (!propertyId) return;

        const data = await getPropertyDetail(Number(propertyId));

        setProperty(data);

        // 🔥 PRE-FILL REAL DATA INTO BOOKING
        setBookingData((prev: any) => ({
          ...prev,
          propertyId: data.id,
          propertyTitle: data.title,
          price: data.price,
          city: data.city,
          ownerName: data.owner_name,
          ownerEmail: data.owner_email,
        }));
      } catch (err) {
        console.error("Failed to load property", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading booking details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-inter pb-20">
      <PublicNavbar />

      <div className="max-w-[1200px] mx-auto pt-6 md:pt-10 px-4 md:px-6">

        {/* STEP INDICATOR */}
        {step <= 3 && (
          <div className="flex items-center justify-center mb-8 md:mb-12 overflow-x-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all ${step >= s ? "bg-[#A989C8] text-white" : "bg-gray-200 text-gray-500"}`}>
                    {s}
                  </div>
                  <span className={`text-xs md:text-sm font-bold hidden sm:inline ${step >= s ? "text-gray-800" : "text-gray-400"}`}>
                    {s === 1 ? "Details" : s === 2 ? "Payment" : "Confirmation"}
                  </span>
                </div>
                {s < 3 && <div className="w-8 md:w-16 h-[2px] bg-gray-200 mx-2 md:mx-4 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {/* CONTENT */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* STEP 1 */}
          {step === 1 && (
            <Details
              property={property}   // ✅ REAL DATA PASSED
              bookingData={bookingData}
              setBookingData={setBookingData}
              onNext={(data: any) => {
                setBookingData({ ...bookingData, ...data });
                setStep(2);
              }}
              onBack={() => window.history.back()}
            />
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <Payment
              bookingData={bookingData}  // ✅ REAL DATA
              onBack={handleBack}
            />
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <Success
              bookingData={bookingData}
              onSignAgreement={() => setStep(4)}
            />
          )}

          {step === 4 && (
            React.createElement(Confirmations as any, {
              bookingData: bookingData,
              property: property,
              onBack: () => setStep(3),
            })
          )}
          

        </div>
      </div>
    </div>
  );
}