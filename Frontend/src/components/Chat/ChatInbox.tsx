import { useEffect, useState, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle } from "lucide-react";
import socketService from "../../services/socketService";
import chatService from "../../services/chatService";
import { AuthContext } from "../../context/AuthContext";
import { canChat, toConversationView } from "../../utils/chatUtils";
import ConversationWindow from "./ConversationWindow";
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
    return view.participantName.toLowerCase().includes(search.toLowerCase());
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
    <div className="flex h-[calc(100vh-80px)] bg-white">
      {/* Left sidebar — conversation list */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-96 border-r shrink-0`}
      >
        <div className="px-4 pt-6 pb-3 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Messages</h1>
          <div className="flex items-center bg-gray-100 px-3 py-2 rounded-full mt-3 focus-within:ring-2 focus-within:ring-[#A989C8]/30 focus-within:bg-white transition-all">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              className="ml-2 bg-transparent outline-none text-sm w-full placeholder-gray-400"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400 gap-2">
              <MessageCircle className="w-8 h-8" />
              No conversations yet
            </div>
          ) : (
            filtered.map((c) => {
              const view = toConversationView(c, user.id, user.user_type);
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`px-4 py-3 border-b cursor-pointer hover:bg-[#A989C8]/5 active:bg-[#A989C8]/10 transition-colors ${
                    selected?.id === String(c.id) ? "bg-[#A989C8]/10 border-l-2 border-l-[#A989C8]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A989C8] to-[#8d6aa9] flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                      {view.participantName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm truncate text-gray-800">
                          {view.participantName}
                        </span>
                        <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                          {c.updated_at
                            ? new Date(c.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-sm truncate flex-1 ${view.unreadCount > 0 ? "font-semibold text-gray-800" : "text-gray-500"}`}>
                          {view.lastMessage || "No messages yet"}
                        </span>
                        {view.unreadCount > 0 && (
                          <span className="bg-[#A989C8] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
                            {view.unreadCount}
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

      {/* Right panel — chat messages */}
      <div
        className={`${
          !showSidebar || selected ? "flex" : "hidden"
        } md:flex flex-col flex-1 animate-fadeIn ${
          !selected ? "items-center justify-center text-gray-400" : ""
        }`}
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
          <div className="flex flex-col items-center gap-3 px-4">
            <div className="w-16 h-16 rounded-full bg-[#A989C8]/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-[#A989C8]" />
            </div>
            <p className="text-sm text-gray-500 text-center">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
