import { useContext } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { canChat } from "../../utils/chatUtils";
import ChatInbox from "../../components/Chat/ChatInbox";
import PublicNavbar from "../../components/Navbar/PublicNavbar";

export default function Chat() {
  const { user } = useContext(AuthContext) || {};
  const location = useLocation();
  const initialConversationId = (location.state as { conversationId?: number })?.conversationId;

  if (!canChat(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        <ChatInbox initialConversationId={initialConversationId} />
      </div>
    </div>
  );
}
