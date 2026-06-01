import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { getKYCStatus } from "../../services/api";

const QuickActions = () => {
  const navigate = useNavigate();

  const handleAddProperty = async () => {
    try {
      const data = await getKYCStatus();
      if (data?.status && data.status !== 'approved') {
        alert('Please verify your KYC first before adding a property.');
        navigate('/kyc');
        return;
      }
    } catch {
      navigate('/login');
      return;
    }
    navigate("/add-property");
  };

  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold mb-4">Quick Actions</h3>

      <div className="space-y-3">
        {/* ✅ Navigate to Add Property */}
        <button
          onClick={handleAddProperty}
          className="w-full bg-primary text-white py-2 rounded-lg"
        >
          Add Property
        </button>

        <button 
          onClick={() => navigate("/tenant")}
          className="w-full border py-2 rounded-lg text-sm"
        >
          View Tenants
        </button>

        <button 
          onClick={() => navigate("/payment-history")}
          className="w-full border py-2 rounded-lg text-sm"
        >
          Payment History
        </button>

        <button 
          onClick={() => navigate("/refunds")}
          className="w-full border py-2 rounded-lg text-sm text-red-600 border-red-200 hover:bg-red-50"
        >
          Refunds
        </button>

        <button
          onClick={() => navigate("/landlord/agreements")}
          className="w-full border py-2 rounded-lg text-sm flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" /> Agreements
        </button>

        {/* ✅ Navigate to KYC page */}
        <button
          onClick={() => navigate("/kyc")}
          className="w-full border py-2 rounded-lg text-sm"
        >
          Complete KYC
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
