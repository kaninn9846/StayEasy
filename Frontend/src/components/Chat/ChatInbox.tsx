import { useEffect, useState, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle } from "lucide-react";
import socketService from "../../services/socketService";
import chatService from "../../services/chatService";
import { AuthContext } from "../../context/AuthContext";
import { canChat, toConversationView } from "../../utils/chatUtils";
import ConversationWindow from "./ConversationWindow";
import ChatToast from "./ChatToast";
import type { ConversationData, ConversationView, MessagePayload } from "../../type";

interface ChatInboxProps {
  initialConversationId?: number;
}

export default function ChatInbox({ initialConversationId }: ChatInboxProps) {
  const navigate = useNavigate();
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user ?? null;

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selected, setSelected] = useState<ConversationView | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialDone, setInitialDone] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ title: string; body: string; convId: string } | null>(null);

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch {
      setConversations([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      navigate("/login");
      return;
    }
    const hasChatRole = canChat(user);
    if (hasChatRole) {
      socketService.connect();
      socketService.joinUserRoom(user.id);
      loadChats();

      const handleMessage = (msg: MessagePayload) => {
        if (msg.userId !== user?.id) {
          loadChats();
          if (msg.userName && (msg.message || msg.content)) {
            setToastMsg({
              title: msg.userName,
              body: msg.message || msg.content || "",
              convId: "",
            });
          }
        }
      };

      const handleNotification = () => {
        loadChats();
      };

      socketService.onMessageReceived(handleMessage);
      socketService.onNewNotification(handleNotification);

      const pollInterval = setInterval(() => loadChats(), 10000);

      return () => {
        socketService.removeListener("receive-message", handleMessage);
        socketService.removeListener("new-notification", handleNotification as any);
        clearInterval(pollInterval);
      };
    }
  }, [user, loadChats, navigate]);

  useEffect(() => {
    if (!initialDone && !loading && conversations.length > 0 && initialConversationId) {
      const match = conversations.find((c) => c.id === initialConversationId);
      if (match) {
        setSelected(toConversationView(match, user!.id, user!.user_type));
        setShowSidebar(false);
        setInitialDone(true);
      }
    }
  }, [conversations, loading, initialConversationId, initialDone]);

  const filtered = conversations.filter((c) => {
    const view = toConversationView(c, user!.id, user!.user_type);
    return view.participantName.toLowerCase().includes(search.toLowerCase()) ||
           (view.propertyTitle || "").toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = async (c: ConversationData) => {
    setSelected(toConversationView(c, user!.id, user!.user_type));
    setShowSidebar(false);
    try {
      await chatService.markAsRead(c.id);
      loadChats();
    } catch {}
  };

  const handleClose = () => {
    setSelected(null);
    setShowSidebar(true);
  };

  const handleDelete = async (id: string) => {
    await chatService.deleteConversation(Number(id));
    setConversations((prev) => prev.filter((c) => String(c.id) !== id));
    setSelected(null);
    setShowSidebar(true);
  };

  const handleMessageSent = () => {
    loadChats();
  };

  if (!user) return null;

  return (
    <div className="flex gap-6">
      {/* ChatToast */}
      {toastMsg && user && (
        <ChatToast
          title={toastMsg.title}
          body={toastMsg.body}
          onViewChat={() => {
            setToastMsg(null);
            const conv = conversations.find((c) =>
              c.user_name === toastMsg.title || c.landlord_name === toastMsg.title
            );
            if (conv) handleSelect(conv);
          }}
          onDismiss={() => setToastMsg(null)}
        />
      )}

      {/* Left — Conversations Card */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } md:flex flex-col w-[340px] shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}
        style={{ height: "calc(100vh - 160px)" }}
      >
        {/* Search */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h1>
          <div className="flex items-center bg-gray-100 px-3.5 py-2.5 rounded-xl mt-3 focus-within:ring-2 focus-within:ring-[#A989C8]/30 focus-within:bg-white transition-all">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              className="ml-2.5 bg-transparent outline-none text-sm w-full placeholder-gray-400"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400 gap-2 mt-8">
              <MessageCircle className="w-8 h-8 opacity-50" />
              <span>{search ? "No conversations match" : "No conversations yet"}</span>
            </div>
          ) : (
            filtered.map((c) => {
              const view = toConversationView(c, user.id, user.user_type);
              const isSelected = selected?.id === String(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`px-5 py-4 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-[#A989C8]/10 border-l-[3px] border-l-[#A989C8]"
                      : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A989C8] to-[#8d6aa9] flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                      {view.participantName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {view.participantName}
                        </span>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {view.lastMessageTime || ""}
                        </span>
                      </div>
                      {/* Property name */}
                      {view.propertyTitle && (
                        <p className="text-[12px] text-[#A989C8] font-medium truncate mt-0.5">
                          {view.propertyTitle}
                          {view.propertyCity ? ` \u00B7 ${view.propertyCity}` : ""}
                        </p>
                      )}
                      {/* Bottom row */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm truncate flex-1 ${
                          view.unreadCount > 0 ? "font-semibold text-gray-800" : "text-gray-500"
                        }`}>
                          {view.lastMessage || "No messages yet"}
                        </span>
                        {view.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shrink-0 shadow-sm">
                            {view.unreadCount > 9 ? "9+" : view.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right — Chat Card */}
      <div
        className={`${
          !showSidebar || selected ? "flex" : "hidden"
        } md:flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fadeIn ${
          !selected ? "items-center justify-center" : ""
        }`}
        style={{ height: "calc(100vh - 160px)" }}
      >
        {selected ? (
          <ConversationWindow
            conversation={selected}
            currentUser={user}
            onClose={handleClose}
            onDelete={handleDelete}
            onMessageSent={handleMessageSent}
            inline
          />
        ) : (
          <div className="flex flex-col items-center gap-4 px-4">
            <div className="w-20 h-20 rounded-full bg-[#A989C8]/10 flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-[#A989C8]" />
            </div>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
