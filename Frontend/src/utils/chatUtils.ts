import type { ConversationData, ConversationView, User } from "../type";

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function toConversationView(c: ConversationData, currentUserId: number, _currentUserType?: string): ConversationView {
  const landlordId = getJwtPayload()?.landlord_id as number | undefined;

  const isUserSide = c.user === currentUserId;
  const isLandlordSide = !!(landlordId && c.landlord === landlordId) || (!isUserSide && !!c.landlord);
  const selfLandlordId = isLandlordSide ? c.landlord : landlordId || undefined;

  const partnerId = isUserSide ? c.landlord : c.user;
  const partnerName = isUserSide ? c.landlord_name : c.user_name;
  const currentUserName = isUserSide ? c.user_name : c.landlord_name;

  const participantUserId = isUserSide
    ? (c.landlord_user_id ?? c.property?.owner ?? c.landlord)
    : c.user;

  const lastMsg = c.last_message;
  const lastMsgText = lastMsg?.content || (lastMsg?.image_url ? "[Image]" : "");
  const lastMsgTime = lastMsg?.created_at;
  const lastMsgSender = lastMsg?.sender_name;

  return {
    id: String(c.id),
    participantId: partnerId,
    participantName: partnerName || `User ${partnerId}`,
    participantUserId,
    lastMessage: lastMsgText,
    lastMessageTime: lastMsgTime ? formatRelativeTime(lastMsgTime) : undefined,
    lastMessageSender: lastMsgSender,
    unreadCount: c.unread_count || 0,
    isOnline: false,
    userType: isUserSide ? "user" : "landlord",
    roomId: c.room_id,
    currentUserName,
    myLandlordId: selfLandlordId,
    propertyTitle: c.property?.title,
    propertyCity: c.property?.city,
    propertyImage: undefined,
    propertyPrice: c.property?.price,
    propertyId: c.property?.id,
    subject: c.subject,
    updatedAt: c.updated_at,
  };
}

export function canChat(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.user_type === "tenant" || user.user_type === "owner") return true;
  const payload = getJwtPayload();
  if (payload?.landlord_id) return true;
  return false;
}

export function getJwtPayload(): Record<string, unknown> | null {
  try {
    const token = localStorage.getItem("access");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}
