import { create } from "zustand";

export interface ChannelMember {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  lastSeenAt: string;
  isOnline?: boolean;
}

export interface Channel {
  id: string;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  type: "DM" | "GROUP";
  isPrivate: boolean;
  createdById: string;
  myRole: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
  lastRead: string;
  members: ChannelMember[];
  dmUser?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
  };
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  type: "TEXT" | "FILE" | "IMAGE" | "SYSTEM";
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMime?: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  reactions: MessageReaction[];
}

export interface ActiveCall {
  channelId: string;
  callType: "VIDEO" | "VOICE";
}

export interface IncomingCall {
  channelId: string;
  callType: "VIDEO" | "VOICE";
  roomName: string;
  startedBy: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface ChatState {
  channels: Channel[];
  activeChannelId: string | null;
  onlineUsers: Set<string>;
  typingUsers: Record<string, string[]>;
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;

  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;
  setActiveChannelId: (id: string | null) => void;
  setOnlineUser: (userId: string, isOnline: boolean) => void;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  setActiveCall: (call: ActiveCall | null) => void;
  setIncomingCall: (call: IncomingCall | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  channels: [],
  activeChannelId: null,
  onlineUsers: new Set<string>(),
  typingUsers: {},
  activeCall: null,
  incomingCall: null,

  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((state) => {
    if (state.channels.some(c => c.id === channel.id)) return {};
    return { channels: [...state.channels, channel] };
  }),
  updateChannel: (channelId, updates) => set((state) => ({
    channels: state.channels.map((c) =>
      c.id === channelId ? { ...c, ...updates } : c
    )
  })),
  removeChannel: (channelId) => set((state) => ({
    channels: state.channels.filter((c) => c.id !== channelId),
    activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId
  })),
  setActiveChannelId: (id) => set({ activeChannelId: id }),
  setOnlineUser: (userId, isOnline) => set((state) => {
    const next = new Set(state.onlineUsers);
    if (isOnline) {
      next.add(userId);
    } else {
      next.delete(userId);
    }
    // Update online presence flag in the cached channels array
    const updatedChannels = state.channels.map(channel => {
      const updatedMembers = channel.members.map(member => {
        if (member.userId === userId) {
          return { ...member, isOnline };
        }
        return member;
      });
      return { ...channel, members: updatedMembers };
    });
    return { onlineUsers: next, channels: updatedChannels };
  }),
  setTyping: (channelId, userId, isTyping) => set((state) => {
    const current = state.typingUsers[channelId] || [];
    const next = isTyping
      ? Array.from(new Set([...current, userId]))
      : current.filter((id) => id !== userId);
    return {
      typingUsers: {
        ...state.typingUsers,
        [channelId]: next
      }
    };
  }),
  setActiveCall: (call) => set({ activeCall: call }),
  setIncomingCall: (call) => set({ incomingCall: call })
}));
