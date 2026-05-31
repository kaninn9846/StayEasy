import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, MoreVertical, Trash2, X, Smile, ChevronLeft, Home, ExternalLink,
} from "lucide-react";
import socketService from "../../services/socketService";
import chatService from "../../services/chatService";
import { canChat, getJwtPayload } from "../../utils/chatUtils";
import ImageUploader from "./ImageUploader";
import EmojiPicker from "./EmojiPicker";
import type { ConversationView, MessageData, MessagePayload, User } from "../../type";

interface Props {
  conversation: ConversationView;
  currentUser: User;
  onClose: () => void;
  onDelete: (id: string) => void;
  onMessageSent?: () => void;
  inline?: boolean;
  onMinimize?: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatMsgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ConversationWindow({
  conversation,
  currentUser,
  onClose,
  onDelete,
  onMessageSent,
  inline = false,
  onMinimize,
}: Props) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomId = conversation.roomId || chatService.generateRoomId(currentUser.id, conversation.participantId);
  const jwtLandlordId = getJwtPayload()?.landlord_id as number | undefined;
  const myLandlordId = conversation.myLandlordId || jwtLandlordId;
  const effectiveUserType = myLandlordId ? "landlord" : "user";
  const displayName = conversation.currentUserName || currentUser.first_name || currentUser.username;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => {
    if (!conversation) return;
    if (!canChat(currentUser)) return;

    socketService.connect();
    socketService.joinRoom({
      roomId,
      userId: currentUser.id,
      userName: displayName,
      userType: effectiveUserType,
      receiverUserId: conversation.participantUserId,
    });

    const convId = Number(conversation.id);
    if (convId) {
      chatService.getConversationMessages(convId).then((msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });
    }

    const handleMessage = (msg: MessagePayload) => {
      setMessages((prev) => {
        if (msg.userId === currentUser.id) return prev;
        if (prev.some((m) => m.id === Number(msg.id) || m.id === Number(msg.senderId))) return prev;
        return [
          ...prev,
          {
            id: Number(msg.id) || Date.now(),
            content: msg.message || msg.content || "",
            sender_name: msg.userName || msg.sender_name || "",
            sender_type: (msg.userType || msg.sender_type || "user") as "user" | "landlord",
            sender_user: msg.userType === "user" ? (msg.userId ?? null) : null,
            sender_landlord: msg.userType === "landlord" ? (msg.userId ?? null) : null,
            image_url: msg.imageUrl || "",
            caption: msg.caption || "",
            is_read: false,
            created_at: msg.timestamp || msg.created_at || new Date().toISOString(),
          },
        ];
      });
      scrollToBottom();
    };

    const handleTyping = (data: { userId: number; userName: string; isTyping: boolean }) => {
      if (data.userId !== currentUser.id) setTyping(data.isTyping);
    };

    socketService.onMessageReceived(handleMessage);
    socketService.onImageReceived(handleMessage);
    socketService.onHistoryReceived((data) => {
      if (data.messages?.length) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => String(m.id)));
          const newMsgs: MessageData[] = data.messages
            .filter((m: MessagePayload) => !existingIds.has(String(m.id)))
            .map((m: MessagePayload) => ({
              id: Number(m.id) || Date.now(),
              content: m.message || m.content || "",
              sender_name: m.userName || m.sender_name || "",
              sender_type: (m.userType || m.sender_type || "user") as "user" | "landlord",
              sender_user: m.userType === "user" ? (m.userId ?? null) : null,
              sender_landlord: m.userType === "landlord" ? (m.userId ?? null) : null,
              image_url: m.imageUrl || "",
              caption: m.caption || "",
              is_read: true,
              created_at: m.timestamp || m.created_at || new Date().toISOString(),
            }));
          return [...newMsgs, ...prev];
        });
        scrollToBottom();
      }
    });
    socketService.onTyping(handleTyping);

    return () => {
      socketService.removeListener("receive-message", handleMessage);
      socketService.removeListener("receive-image", handleMessage);
      socketService.removeListener("chat-history");
      socketService.removeListener("user-typing-indicator", handleTyping as any);
      socketService.leaveRoom({ roomId, userId: currentUser.id, userName: displayName });
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || uploading) return;
    const text = input.trim();
    setInput("");
    setShowEmoji(false);

    const optimisticMsg: MessageData = {
      id: -Date.now(),
      content: text,
      sender_name: displayName,
      sender_type: effectiveUserType as "user" | "landlord",
      sender_user: effectiveUserType === "user" ? currentUser.id : null,
      sender_landlord: effectiveUserType === "landlord" ? myLandlordId ?? null : null,
      image_url: "",
      caption: "",
      is_read: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    const convId = Number(conversation.id);
    if (convId) {
      await chatService.saveMessage(convId, text);
    }

    socketService.sendMessage({
      roomId,
      message: text,
      userId: currentUser.id,
      userName: displayName,
      userType: effectiveUserType,
      receiverUserId: conversation.participantUserId,
    });

    onMessageSent?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImageSend = async (file: File, caption?: string) => {
    setUploading(true);
    try {
      const res = await socketService.uploadImage(file);
      if (res?.imageUrl) {
        const optimisticMsg: MessageData = {
          id: -Date.now(),
          content: caption || "",
          sender_name: displayName,
          sender_type: effectiveUserType as "user" | "landlord",
          sender_user: effectiveUserType === "user" ? currentUser.id : null,
          sender_landlord: effectiveUserType === "landlord" ? myLandlordId ?? null : null,
          image_url: res.imageUrl,
          caption: caption || "",
          is_read: true,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        scrollToBottom();
        const convId = Number(conversation.id);
        if (convId) {
          await chatService.saveMessage(convId, "", res.imageUrl, caption);
        }
        socketService.sendImage({
          roomId, imageUrl: res.imageUrl, userId: currentUser.id,
          userName: displayName, userType: effectiveUserType, caption,
          receiverUserId: conversation.participantUserId,
        });
        onMessageSent?.();
      }
    } catch (e) {
      console.error("Image upload failed", e);
    }
    setUploading(false);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    socketService.setTyping({ roomId, userId: currentUser.id, userName: displayName, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketService.setTyping({ roomId, userId: currentUser.id, userName: displayName, isTyping: false });
    }, 2000);
  };

  const isOwn = (msg: MessageData): boolean => {
    if (msg.sender_user != null) return msg.sender_user === currentUser.id;
    if (msg.sender_landlord != null) return msg.sender_landlord === myLandlordId;
    if (msg.sender_type === "landlord") return !!myLandlordId;
    if (msg.sender_type === "user") return false;
    return false;
  };

  const groupMessagesByDate = (msgs: MessageData[]) => {
    const groups: { date: string; messages: MessageData[] }[] = [];
    let lastDate = "";
    for (const msg of msgs) {
      const dateKey = new Date(msg.created_at).toDateString();
      if (dateKey !== lastDate) {
        groups.push({ date: msg.created_at, messages: [msg] });
        lastDate = dateKey;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  };

  // Booking inquiry highlight card
  const showBookingInquiry = conversation.subject?.toLowerCase().includes("payment") ||
    conversation.subject?.toLowerCase().includes("inquiry") ||
    false;

  const messageList = (
    <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 space-y-1">
      {/* Booking Inquiry Card */}
      {showBookingInquiry && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-lg">📋</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-amber-900">Booking Inquiry</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Payment was unsuccessful. This user would like to discuss booking arrangements.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="text-xs font-semibold text-white bg-[#A989C8] px-3 py-1.5 rounded-lg hover:bg-[#8d6aa9] transition">
                  Reply
                </button>
                {conversation.propertyId && (
                  <button
                    onClick={() => navigate(`/property/${conversation.propertyId}`)}
                    className="text-xs font-semibold text-[#A989C8] border border-[#A989C8] px-3 py-1.5 rounded-lg hover:bg-[#A989C8]/5 transition flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Property
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {groupMessagesByDate(messages).map((group) => (
        <div key={group.date}>
          <div className="flex justify-center my-3">
            <span className="text-[10px] text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border">
              {formatDate(group.date)}
            </span>
          </div>
          {group.messages.map((msg, idx) => {
            const mine = isOwn(msg);
            const showReadReceipt = mine && msg.is_read && msg.id > 0;
            const showSenderName = !mine && (idx === 0 || isOwn(group.messages[idx - 1]));
            return (
              <div key={msg.id} className={`message-enter flex flex-col ${mine ? "items-end" : "items-start"} mb-1`}>
                {showSenderName && msg.sender_name && (
                  <span className="text-[11px] text-gray-500 px-1 mb-0.5">{msg.sender_name}</span>
                )}
                <div className={`flex items-end gap-2 max-w-[75%] ${mine ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl break-words ${
                      mine
                        ? "bg-[#A989C8] text-white rounded-br-md"
                        : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
                    }`}
                  >
                    {msg.image_url ? (
                      <>
                        <img
                          src={msg.image_url}
                          alt="chat-img"
                          className="max-h-48 rounded-lg mb-1 cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPreviewImage(msg.image_url!)}
                        />
                        {msg.caption && <p className="text-xs mt-1 opacity-90">{msg.caption}</p>}
                      </>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                    <div className={`flex items-center gap-1.5 mt-1 ${mine ? "justify-end" : ""}`}>
                      <span className={`text-[10px] ${mine ? "text-white/60" : "text-gray-400"}`}>
                        {formatMsgTime(msg.created_at)}
                      </span>
                      {showReadReceipt && (
                        <span className="text-[10px] text-blue-300">read</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {typing && (
        <div className="flex items-start pl-1 mt-2">
          <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-1">
            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const inputBar = (
    <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-2 shrink-0">
      <ImageUploader
        roomId={roomId} userId={currentUser.id} userName={displayName}
        userType={effectiveUserType}
        onUploadStart={() => setUploading(true)}
        onUploadComplete={(file) => { setUploading(false); if (file) handleImageSend(file); }}
      />
      <div className="relative">
        <button
          type="button"
          className="p-1.5 text-gray-500 hover:text-[#A989C8] transition"
          onClick={() => setShowEmoji((v) => !v)}
          disabled={uploading}
        >
          <Smile className="w-5 h-5" />
        </button>
        {showEmoji && (
          <div className="absolute bottom-10 left-0 z-20">
            <EmojiPicker
              onEmojiSelect={(emoji) => setInput((prev) => prev + emoji)}
              onClose={() => setShowEmoji(false)}
            />
          </div>
        )}
      </div>
      <input
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#A989C8] focus:ring-1 focus:ring-[#A989C8]/20 transition"
        disabled={uploading}
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || uploading}
        className="bg-[#A989C8] text-white p-2.5 rounded-full disabled:opacity-50 hover:bg-[#8d6aa9] transition shadow-sm"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );

  const menuDropdown = (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-white/20 rounded-lg transition">
        <MoreVertical className="w-4 h-4" />
      </button>
      {showMenu && (
        <div className="absolute right-0 top-8 bg-white text-black rounded-xl shadow-xl border border-gray-100 z-10 py-1 min-w-[140px]">
          <button
            onClick={() => onDelete(conversation.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition w-full"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );

  const chatContent = (
    <>
      {/* Header with property info */}
      <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#A989C8] to-[#8d6aa9] flex items-center justify-center text-white shrink-0 shadow-sm relative">
              <Home className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-gray-900 truncate">{conversation.participantName}</h2>
              {conversation.propertyTitle && (
                <p className="text-[12px] text-[#A989C8] font-medium truncate">{conversation.propertyTitle}</p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${typing ? "bg-green-400 animate-pulse" : conversation.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-[11px] text-gray-400">
                  {typing ? "typing..." : conversation.isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
        {menuDropdown}
      </div>
      {messageList}
      {inputBar}
    </>
  );

  return (
    <>
      {inline ? (
        <div className="flex flex-col h-full">{chatContent}</div>
      ) : (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 md:bg-black/10"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div className="w-full h-full md:w-[480px] md:h-[600px] md:rounded-2xl md:shadow-2xl bg-white flex flex-col overflow-hidden">
            {chatContent}
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
