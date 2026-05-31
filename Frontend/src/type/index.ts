export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  user_type?: string;
  email_verified?: boolean;
  name?: string;
}

export interface LandlordUser {
  id: number;
  email: string;
  name: string;
  business_name?: string;
  phone?: string;
}

export interface PropertyMini {
  id: number;
  title: string;
  description?: string;
  city?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  sq_ft?: number;
  parking?: boolean;
  price?: string;
  owner?: number;
}

export interface MessageData {
  id: number;
  content?: string;
  image_url?: string;
  caption?: string;
  sender_user?: number | null;
  sender_landlord?: number | null;
  sender_name: string;
  sender_type: "user" | "landlord";
  is_read: boolean;
  created_at: string;
}

export interface MessagePayload {
  id?: string;
  roomId?: string;
  userId?: number;
  userName?: string;
  userType?: string;
  message?: string;
  content?: string;
  imageUrl?: string;
  caption?: string;
  timestamp?: string;
  type?: "text" | "image";
  senderId?: number;
  sender_name?: string;
  sender_type?: string;
  created_at?: string;
}

export interface ConversationData {
  id: number;
  user: number;
  user_name: string;
  landlord: number;
  landlord_name: string;
  landlord_user_id?: number | null;
  property?: PropertyMini | null;
  subject: string;
  is_active: boolean;
  messages: MessageData[];
  last_message: MessageData | null;
  unread_count: number;
  room_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationView {
  id: string;
  participantId: number;
  participantName: string;
  participantUserId: number;
  lastMessage: string;
  lastMessageTime?: string;
  lastMessageSender?: string;
  unreadCount: number;
  isOnline: boolean;
  userType: "user" | "landlord";
  roomId?: string | null;
  currentUserName?: string;
  myLandlordId?: number;
  propertyTitle?: string;
  propertyCity?: string;
  propertyImage?: string;
  propertyPrice?: string;
  propertyId?: number;
  subject?: string;
  updatedAt?: string;
}
