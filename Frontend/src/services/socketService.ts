import io, { Socket } from "socket.io-client";
import type { MessagePayload } from "../type";

const SOCKET_URL = "http://localhost:3001";
const UPLOAD_URL = "http://localhost:3001/api/upload-image";

interface JoinRoomData {
  roomId: string;
  userId: number;
  userName: string;
  userType: string;
  receiverUserId?: number;
}

interface SendMessageData {
  roomId: string;
  message: string;
  userId: number;
  userName: string;
  userType: string;
  receiverUserId?: number;
}

interface SendImageData {
  roomId: string;
  imageUrl: string;
  userId: number;
  userName: string;
  userType: string;
  caption?: string;
  receiverUserId?: number;
}

interface TypingData {
  roomId: string;
  userId: number;
  userName: string;
  isTyping: boolean;
}

interface HistoryRequestData {
  roomId: string;
  limit?: number;
}

interface LeaveRoomData {
  roomId: string;
  userId: number;
  userName: string;
}

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) {
      if (this.socket.connected) return this.socket;
      if (!this.socket.connected) {
        this.socket.connect();
        return this.socket;
      }
    }

    this.socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      if (process.env.NODE_ENV === 'development') {
        console.log("✅ Socket connected:", this.socket?.id);
      }
    });

    this.socket.on("disconnect", () => {
      if (process.env.NODE_ENV === 'development') {
        console.log("❌ Socket disconnected");
      }
    });

    this.socket.on("connect_error", () => {
      // silently retry — socket server may not be running
    });

    return this.socket;
  }

  joinRoom(data: JoinRoomData) {
    if (!this.socket) this.connect();
    this.socket?.emit("join-room", data);
  }

  joinUserRoom(userId: number) {
    const sock = this.connect();
    sock?.emit("join-user-room", { userId });
  }

  sendMessage(data: SendMessageData) {
    if (!this.socket) {
      console.error("Socket not connected");
      return;
    }
    this.socket.emit("send-message", data);
  }

  sendImage(data: SendImageData) {
    if (!this.socket) {
      console.error("Socket not connected");
      return;
    }
    this.socket.emit("send-image", data);
  }

  async uploadImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(UPLOAD_URL, { method: "POST", body: formData });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Upload failed");
    }
    return response.json();
  }

  setTyping(data: TypingData) {
    this.socket?.emit("user-typing", data);
  }

  requestHistory(data: HistoryRequestData) {
    this.socket?.emit("request-history", data);
  }

  leaveRoom(data: LeaveRoomData) {
    this.socket?.emit("leave-room", data);
  }

  onMessageReceived(callback: (msg: MessagePayload) => void) {
    this.socket?.on("receive-message", callback);
  }

  onImageReceived(callback: (msg: MessagePayload) => void) {
    this.socket?.on("receive-image", callback);
  }

  onHistoryReceived(callback: (data: { messages: MessagePayload[] }) => void) {
    this.socket?.on("chat-history", callback);
  }

  onRoomJoined(callback: (data: { roomId: string }) => void) {
    this.socket?.on("room-joined", callback);
  }

  onError(callback: (err: { message: string }) => void) {
    this.socket?.on("error", callback);
  }

  onNewNotification(callback: (msg: MessagePayload) => void) {
    this.socket?.on("new-notification", callback);
  }

  onTyping(callback: (data: { userId: number; userName: string; isTyping: boolean }) => void) {
    this.socket?.on("user-typing-indicator", callback);
  }

  removeListener(event: string, callback?: Function) {
    if (callback) {
      this.socket?.off(event, callback as any);
    } else {
      this.socket?.off(event);
    }
  }

  removeAllListeners() {
    if (!this.socket) return;
    this.socket.off("receive-message");
    this.socket.off("receive-image");
    this.socket.off("chat-history");
    this.socket.off("new-notification");
    this.socket.off("user-joined");
    this.socket.off("user-left");
    this.socket.off("user-typing-indicator");
    this.socket.off("room-joined");
    this.socket.off("error");
  }

  disconnect() {
    if (this.socket?.connected) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
