import { useState, type FormEvent } from "react";
import { X, Send, Calendar, MessageSquare, FileText } from "lucide-react";
import { createBookingRequest } from "../../services/api";

interface Props {
  propertyId: number;
  propertyTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestBookingModal({ propertyId, propertyTitle, onClose, onSuccess }: Props) {
  const [message, setMessage] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !moveIn || !paymentDate) return;
    setLoading(true);
    setError("");
    try {
      await createBookingRequest({
        property_id: propertyId,
        message: message.trim(),
        preferred_move_in: moveIn,
        expected_payment_date: paymentDate,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message?.[0] || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Request to Book</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Send a booking request for <strong className="text-gray-800">{propertyTitle}</strong>. The landlord will review and approve your request.
          </p>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <MessageSquare size={15} /> Message to Landlord <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I want to book this room. I will complete the payment within 3 days."
              rows={3}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#A989C8] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <Calendar size={15} /> Preferred Move-in <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={moveIn}
                onChange={(e) => setMoveIn(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#A989C8]"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <Calendar size={15} /> Expected Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#A989C8]"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <FileText size={15} /> Optional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information for the landlord..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#A989C8] resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !message.trim() || !moveIn || !paymentDate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#A989C8] text-white rounded-xl text-sm font-bold hover:bg-[#9678b5] disabled:opacity-50 transition"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <><Send size={16} /> Send Request</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
