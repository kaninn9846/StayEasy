import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Loader } from "lucide-react";
import API from "../../../services/api";

export default function Details({ onNext, onBack }: any) {
  const { id: propertyId } = useParams() as any;

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    moveInDate: "",
    moveOutDate: "",
    fullName: "",
    email: "",
    phone: "",
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await API.get(`properties/${propertyId}/`);
        setProperty(res.data);
      } catch {
        setError("Failed to load property details");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  const validate = () => {
    const err: any = {};
    if (!formData.moveInDate) err.moveInDate = "Required";
    if (!formData.moveOutDate) err.moveOutDate = "Required";
    if (!formData.fullName) err.fullName = "Required";
    if (!formData.email) err.email = "Required";
    if (!formData.phone) err.phone = "Required";
    if (formData.moveInDate && formData.moveOutDate && new Date(formData.moveOutDate) <= new Date(formData.moveInDate)) {
      err.moveOutDate = "Move out must be after move in";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleProceed = () => {
    if (!validate()) return;

    const checkInDate = new Date(formData.moveInDate);
    const checkOutDate = new Date(formData.moveOutDate);

    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.max(1, Math.ceil(diffDays / 30));

    const monthlyPrice = Number(property?.price || 0);

    onNext({
      check_in: checkInDate.toISOString().split("T")[0],
      check_out: checkOutDate.toISOString().split("T")[0],
      total_price: monthlyPrice * months,
      ...formData,
    });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin" />
      </div>
    );

  if (error || !property)
    return (
      <div className="text-red-500 text-center font-bold p-6">
        {error || "Property not found"}
      </div>
    );

  const monthlyPrice = Number(property.price || 0);
  let totalPrice = 0;
  if (formData.moveInDate && formData.moveOutDate) {
    const inD = new Date(formData.moveInDate);
    const outD = new Date(formData.moveOutDate);
    const diffDays = Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.max(1, Math.ceil(diffDays / 30));
    totalPrice = monthlyPrice * months;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

      {/* BACK */}
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-gray-500">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT - FORM */}
        <div className="lg:col-span-7 space-y-6">

          {/* FORM CARD */}
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl border">
            <h2 className="text-xl font-bold mb-6">Booking Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Move In Date</label>
                <input
                  type="date"
                  className={`w-full border-2 p-3 rounded-xl ${
                    errors.moveInDate ? "border-red-500" : "border-gray-200"
                  }`}
                  value={formData.moveInDate}
                  onChange={(e) =>
                    setFormData({ ...formData, moveInDate: e.target.value })
                  }
                />
                {errors.moveInDate && (
                  <p className="text-red-500 text-sm">{errors.moveInDate}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Move Out Date</label>
                <input
                  type="date"
                  className={`w-full border-2 p-3 rounded-xl ${
                    errors.moveOutDate ? "border-red-500" : "border-gray-200"
                  }`}
                  value={formData.moveOutDate}
                  onChange={(e) =>
                    setFormData({ ...formData, moveOutDate: e.target.value })
                  }
                />
                {errors.moveOutDate && (
                  <p className="text-red-500 text-sm">{errors.moveOutDate}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <input
                className={`w-full border-2 p-3 rounded-xl ${
                  errors.fullName ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="Full Name"
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />

              <input
                className={`w-full border-2 p-3 rounded-xl ${
                  errors.email ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="Email"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />

              <input
                className={`w-full border-2 p-3 rounded-xl ${
                  errors.phone ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="Phone"
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleProceed}
            className="w-full bg-[#A989C8] text-white py-4 rounded-xl font-bold"
          >
            Proceed to Payment
          </button>
        </div>

        {/* RIGHT - CLEAN SIDEBAR */}
        <div className="lg:col-span-5 space-y-6">

          {/* PROPERTY CARD */}
          {/* PROPERTY CARD */}
<div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">

  {/* IMAGE */}
  <div className="w-full h-44 overflow-hidden rounded-xl bg-gray-100">
    <img
      src={
        property.images?.[0]?.image
          ? `http://127.0.0.1:8000${property.images[0].image}`
          : "/no-image.png"
      }
      className="w-full h-full object-cover"
      alt={property.title}
    />
  </div>

  {/* TITLE + CITY */}
  <div className="space-y-1">
    <h3 className="text-lg font-bold text-gray-900 leading-snug">
      {property.title}
    </h3>
    <p className="text-sm text-gray-500">{property.city}</p>
  </div>

  {/* PRICING */}
  <div className="border-t pt-4 space-y-3 text-sm">

    <div className="flex justify-between text-gray-600">
      <span>Rent</span>
      <span className="font-semibold text-gray-900">
        NPR {totalPrice.toLocaleString()}
      </span>
    </div>

    <div className="flex justify-between text-gray-600">
      <span>Deposit</span>
      <span className="font-semibold text-gray-900">
        NPR {monthlyPrice.toLocaleString()}
      </span>
    </div>

    <div className="flex justify-between pt-3 border-t">
      <span className="font-semibold text-gray-900">Total</span>
      <span className="font-bold text-[#A989C8] text-base">
        NPR {(totalPrice + monthlyPrice).toLocaleString()}
      </span>
    </div>

  </div>
</div>

          {/* DESCRIPTION */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border">
            <h3 className="font-bold mb-2">Description</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {property.description || "No description available"}
            </p>
          </div>

          {/* DETAILS */}
<div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 space-y-4">

  <h3 className="text-lg font-bold text-gray-900">
    Property Details
  </h3>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">

    <div>
      <p className="text-gray-400 text-xs">Type</p>
      <p className="font-medium text-gray-900">
        {property?.property_type || "N/A"}
      </p>
    </div>

    <div>
      <p className="text-gray-400 text-xs">Bedrooms</p>
      <p className="font-medium text-gray-900">
        {property?.bedrooms ?? "N/A"}
      </p>
    </div>

    <div>
      <p className="text-gray-400 text-xs">Bathrooms</p>
      <p className="font-medium text-gray-900">
        {property?.bathrooms ?? "N/A"}
      </p>
    </div>

    <div>
      <p className="text-gray-400 text-xs">Size</p>
      <p className="font-medium text-gray-900">
        {property?.sq_ft ? `${property.sq_ft} sqft` : "N/A"}
      </p>
    </div>

    <div>
      <p className="text-gray-400 text-xs">Parking</p>
      <p className="font-medium text-gray-900">
        {property?.parking === true
          ? "Available"
          : property?.parking === false
          ? "Not Available"
          : "N/A"}
      </p>
    </div>

    <div>
      <p className="text-gray-400 text-xs">City</p>
      <p className="font-medium text-gray-900">
        {property?.city || "N/A"}
      </p>
    </div>

  </div>
</div>

        </div>

      </div>
    </div>
  );
}