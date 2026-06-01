import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText, Home, User, Building2, CreditCard, CheckCircle2,
  Circle, Download, Printer, ArrowLeft, Clock, Shield,
  ChevronRight, Banknote, Calendar, Hash, AlertCircle,
} from "lucide-react";
import { getAgreementDetail, tenantSignAgreement, landlordSignAgreement, downloadAgreementPDF } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PublicNavbar from "../../components/Navbar/PublicNavbar";
import SignaturePad from "../../components/Agreements/SignaturePad";

interface Agreement {
  id: number;
  tenant: number;
  landlord: number;
  status: string;
  agreement_content: string;
  monthly_rent: string;
  security_deposit: string;
  lease_duration_months: number;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  tenant_citizenship: string;
  landlord_name: string;
  landlord_email: string;
  landlord_phone: string;
  landlord_kyc_verified: boolean;
  property_name: string;
  property_address: string;
  property_type: string;
  transaction_id: string;
  payment_date: string;
  amount_paid: string;
  tenant_signature: string | null;
  landlord_signature: string | null;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100", icon: FileText },
  pending_tenant: { label: "Pending Your Signature", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  pending_landlord: { label: "Pending Landlord Signature", color: "text-purple-600", bg: "bg-purple-50", icon: Clock },
  active: { label: "Active", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  expired: { label: "Expired", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
  terminated: { label: "Terminated", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
};

const TIMELINE_STEPS = [
  { key: "payment", label: "Payment Completed", icon: CreditCard },
  { key: "generated", label: "Agreement Generated", icon: FileText },
  { key: "tenant_signed", label: "Tenant Signed", icon: CheckCircle2 },
  { key: "landlord_signed", label: "Landlord Signed", icon: CheckCircle2 },
  { key: "active", label: "Agreement Active", icon: CheckCircle2 },
];

function getTimelineStatus(agreement: Agreement): { key: string; done: boolean }[] {
  return TIMELINE_STEPS.map((step) => {
    if (step.key === "payment") return { key: step.key, done: true };
    if (step.key === "generated") return { key: step.key, done: true };
    if (step.key === "tenant_signed") return { key: step.key, done: !!agreement.tenant_signature };
    if (step.key === "landlord_signed") return { key: step.key, done: !!agreement.landlord_signature };
    if (step.key === "active") return { key: step.key, done: agreement.status === "active" };
    return { key: step.key, done: false };
  });
}

const STATUS_ORDER = ["draft", "pending_tenant", "pending_landlord", "active", "expired", "terminated"];

export default function AgreementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAgreementDetail(Number(id))
      .then(setAgreement)
      .catch(() => setError("Agreement not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const isTenant = agreement && user && (agreement.tenant === user.id);
  const isLandlord = agreement && user && (agreement.landlord === user.id);
  const isAdmin = user?.role === "admin" || user?.user_type === "admin";

  const canSign = isTenant && agreement?.status === "pending_tenant";
  const canSignAsLandlord = isLandlord && agreement?.status === "pending_landlord";
  const statusInfo = agreement ? STATUS_CONFIG[agreement.status] || STATUS_CONFIG.draft : STATUS_CONFIG.draft;
  const StatusIcon = statusInfo.icon;

  const handleSign = async (signatureDataUrl: string) => {
    if (!agreement || !id) return;
    setSigning(true);
    try {
      const ipAddress = "";
      const deviceInfo = navigator.userAgent;
      if (agreement.status === "pending_tenant") {
        await tenantSignAgreement(agreement.id, signatureDataUrl, ipAddress, deviceInfo);
      } else if (agreement.status === "pending_landlord") {
        await landlordSignAgreement(agreement.id, signatureDataUrl, ipAddress, deviceInfo);
      }
      setSigned(true);
      const updated = await getAgreementDetail(Number(id));
      setAgreement(updated);
      setShowSignaturePad(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to sign agreement");
    }
    setSigning(false);
  };

  const handleDownloadPDF = async () => {
    if (!agreement) return;
    await downloadAgreementPDF(agreement.id);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A989C8]" />
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Agreement Not Found</h2>
          <p className="text-gray-500 mt-2">{error || "This agreement does not exist or you don't have access."}</p>
          <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2 bg-[#A989C8] text-white rounded-lg text-sm font-medium hover:bg-[#9678b5]">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const timeline = getTimelineStatus(agreement);
  const currentStepIndex = timeline.findIndex((s) => !s.done);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      {signed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSigned(false)}>
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Signed Successfully!</h3>
            <p className="text-gray-500 mt-2">Your signature has been recorded.</p>
            <button
              onClick={() => setSigned(false)}
              className="mt-6 px-6 py-2 bg-[#A989C8] text-white rounded-lg text-sm font-bold hover:bg-[#9678b5]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showSignaturePad && (
        <SignaturePad
          userName={isTenant ? agreement.tenant_name : agreement.landlord_name}
          onSave={handleSign}
          onClose={() => setShowSignaturePad(false)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rental Agreement</h1>
              <p className="text-sm text-gray-500">AGR-{String(agreement.id).padStart(6, "0")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusInfo.label}
            </span>
            <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content — agreement document */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#A989C8]" />
                <h2 className="font-bold text-gray-800 text-sm">Agreement Document</h2>
              </div>
              <div className="px-6 py-6">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {agreement.agreement_content}
                </pre>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#A989C8]" /> Signatures
                </h2>
              </div>
              <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Tenant Signature */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tenant</p>
                  <p className="text-sm font-semibold text-gray-900">{agreement.tenant_name}</p>
                  <div className="mt-3 min-h-[60px] flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
                    {agreement.tenant_signature ? (
                      <img src={agreement.tenant_signature} alt="Tenant signature" className="max-h-16" />
                    ) : (
                      <span className="text-xs text-gray-400">Not signed yet</span>
                    )}
                  </div>
                  {agreement.tenant_signed_at && (
                    <p className="text-[10px] text-gray-400 mt-2">
                      Signed: {new Date(agreement.tenant_signed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Landlord Signature */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Landlord</p>
                  <p className="text-sm font-semibold text-gray-900">{agreement.landlord_name}</p>
                  <div className="mt-3 min-h-[60px] flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
                    {agreement.landlord_signature ? (
                      <img src={agreement.landlord_signature} alt="Landlord signature" className="max-h-16" />
                    ) : (
                      <span className="text-xs text-gray-400">Not signed yet</span>
                    )}
                  </div>
                  {agreement.landlord_signed_at && (
                    <p className="text-[10px] text-gray-400 mt-2">
                      Signed: {new Date(agreement.landlord_signed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sign Action */}
            {(canSign || canSignAsLandlord) && (
              <div className="bg-gradient-to-br from-[#A989C8] to-[#8b6faa] rounded-xl shadow-sm p-6 text-white">
                <h3 className="font-bold text-lg">Ready to Sign?</h3>
                <p className="text-sm text-white/80 mt-1">
                  {canSign ? "Review the agreement and add your signature." : "The tenant has signed. Now it's your turn."}
                </p>
                <button
                  onClick={() => setShowSignaturePad(true)}
                  disabled={signing}
                  className="mt-4 w-full px-4 py-3 bg-white text-[#A989C8] rounded-lg font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {signing ? "Processing..." : "Sign Agreement"}
                </button>
              </div>
            )}

            {/* Status Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-sm">Status Timeline</h3>
              </div>
              <div className="px-5 py-4">
                {TIMELINE_STEPS.map((step, i) => {
                  const done = timeline[i]?.done || false;
                  const isCurrent = i === currentStepIndex;
                  return (
                    <div key={step.key} className="flex items-start gap-3 mb-4 last:mb-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          done ? "bg-green-100" : isCurrent ? "bg-[#A989C8]/10" : "bg-gray-100"
                        }`}>
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Circle className={`w-4 h-4 ${isCurrent ? "text-[#A989C8]" : "text-gray-300"}`} />
                          )}
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 ${done ? "bg-green-200" : "bg-gray-200"}`} />
                        )}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className={`text-xs font-medium ${done ? "text-green-600" : isCurrent ? "text-[#A989C8]" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#A989C8]" />
                <h3 className="font-bold text-gray-800 text-sm">Property</h3>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="font-semibold text-gray-900 text-sm">{agreement.property_name}</p>
                <p className="text-xs text-gray-500">{agreement.property_address}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400">Type</p>
                    <p className="text-xs font-medium text-gray-700">{agreement.property_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Rent/Month</p>
                    <p className="text-xs font-medium text-gray-700">NPR {agreement.monthly_rent}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Deposit</p>
                    <p className="text-xs font-medium text-gray-700">NPR {agreement.security_deposit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Lease</p>
                    <p className="text-xs font-medium text-gray-700">{agreement.lease_duration_months} mo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <User className="w-4 h-4 text-[#A989C8]" />
                <h3 className="font-bold text-gray-800 text-sm">Tenant</h3>
              </div>
              <div className="px-5 py-4 space-y-1.5">
                <p className="font-semibold text-gray-900 text-sm">{agreement.tenant_name}</p>
                <p className="text-xs text-gray-500">{agreement.tenant_email}</p>
                {agreement.tenant_phone && <p className="text-xs text-gray-500">{agreement.tenant_phone}</p>}
              </div>
            </div>

            {/* Landlord Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#A989C8]" />
                <h3 className="font-bold text-gray-800 text-sm">Landlord</h3>
              </div>
              <div className="px-5 py-4 space-y-1.5">
                <p className="font-semibold text-gray-900 text-sm">{agreement.landlord_name}</p>
                <p className="text-xs text-gray-500">{agreement.landlord_email}</p>
                {agreement.landlord_phone && <p className="text-xs text-gray-500">{agreement.landlord_phone}</p>}
                <span className={`inline-flex items-center gap-1 text-xs mt-1 ${
                  agreement.landlord_kyc_verified ? "text-green-600" : "text-yellow-600"
                }`}>
                  <Shield className="w-3 h-3" />
                  {agreement.landlord_kyc_verified ? "KYC Verified" : "KYC Pending"}
                </span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[#A989C8]" />
                <h3 className="font-bold text-gray-800 text-sm">Payment</h3>
              </div>
              <div className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Transaction ID</span>
                  <span className="text-xs font-medium text-gray-700 font-mono">{agreement.transaction_id || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Amount Paid</span>
                  <span className="text-xs font-bold text-gray-900">NPR {agreement.amount_paid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Payment Date</span>
                  <span className="text-xs text-gray-700">
                    {agreement.payment_date ? new Date(agreement.payment_date).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
