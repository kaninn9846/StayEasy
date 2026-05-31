import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, MessageCircle,
  Calendar, User, Home, FileText, ChevronRight,
} from "lucide-react";
import { getReceivedBookingRequests, actionBookingRequest } from "../../services/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pending", color: "text-orange-600", bg: "bg-orange-50", icon: Clock },
  approved: { label: "Approved", color: "text-blue-600", bg: "bg-blue-50", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
  payment_pending: { label: "Payment Pending", color: "text-yellow-600", bg: "bg-yellow-50", icon: AlertTriangle },
  confirmed: { label: "Confirmed", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-gray-600", bg: "bg-gray-100", icon: XCircle },
};

export default function BookingRequestsSection() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deadlineInput, setDeadlineInput] = useState("");

  const fetch = async () => {
    setLoading(true);
    const data = await getReceivedBookingRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setActionLoading(id);
    try {
      if (action === "approve") {
        const days = prompt("Set payment deadline (in days from now):", "3");
        if (!days) { setActionLoading(null); return; }
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + parseInt(days));
        await actionBookingRequest(id, "approve", deadline.toISOString());
      } else {
        if (!window.confirm("Reject this booking request?")) { setActionLoading(null); return; }
        await actionBookingRequest(id, "reject");
      }
      await fetch();
    } catch (err: any) {
      alert(err.response?.data?.error || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Booking Requests</h3>
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[10px] font-bold">
            {pendingCount} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#A989C8]" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No booking requests yet</p>
      ) : (
        <div className="space-y-3">
          {requests.slice(0, 5).map((req) => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={req.id} className="border border-gray-200 rounded-xl p-3 hover:border-[#A989C8]/30 transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-[#F3E8FF] rounded-lg flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#A989C8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{req.tenant_name}</p>
                      <p className="text-xs text-gray-500 truncate">{req.property_title}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color} shrink-0`}>
                    <Icon size={10} /> {cfg.label}
                  </span>
                </div>

                {req.message && (
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mb-2 line-clamp-2">{req.message}</p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar size={10} /> Move-in: {req.preferred_move_in}</span>
                  <span className="flex items-center gap-1"><Calendar size={10} /> Pay by: {req.expected_payment_date}</span>
                </div>

                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(req.id, "approve")}
                      disabled={actionLoading === req.id}
                      className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition"
                    >
                      {actionLoading === req.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "reject")}
                      disabled={actionLoading === req.id}
                      className="flex-1 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 disabled:opacity-50 transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => navigate("/chat")}
                      className="py-1.5 px-3 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                )}

                {req.status === "payment_pending" && (
                  <p className="text-[10px] text-yellow-600 font-medium">Awaiting tenant payment</p>
                )}
                {req.status === "approved" && req.payment_deadline && (
                  <p className="text-[10px] text-blue-600 font-medium">
                    Payment deadline: {new Date(req.payment_deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
          {requests.length > 5 && (
            <button
              onClick={() => navigate("/tenant")}
              className="w-full py-2 text-xs text-[#A989C8] font-bold hover:bg-gray-50 rounded-lg transition flex items-center justify-center gap-1"
            >
              View all <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
