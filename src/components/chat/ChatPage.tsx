import React, { useState, useEffect } from "react";
import { useChatStore } from "../../stores/chatStore";
import { useUIStore } from "../../stores/uiStore";
import { ChatSidebar } from "./ChatSidebar";
import { MessageArea } from "./MessageArea";
import { InviteModal } from "./InviteModal";
import { CreateGroupModal } from "./CreateGroupModal";
import { X } from "lucide-react";
import { api } from "../../lib/api";
import { useSocket } from "../../hooks/useSocket";
import "../../styles/chat.css";

export const ChatPage: React.FC = () => {
  const { 
    activeChannelId, 
    setActiveChannelId, 
    setChannels, 
    addChannel,
    removeChannel, 
    updateChannel,
    setOnlineUser, 
    setTyping, 
    activeCall, 
    setActiveCall, 
    incomingCall, 
    setIncomingCall 
  } = useChatStore();

  const uiActiveChannelId = useUIStore(state => state.activeChannelId);
  const setUiActiveChannelId = useUIStore(state => state.setActiveChannelId);

  // Synchronize state from useUIStore to useChatStore
  useEffect(() => {
    if (uiActiveChannelId !== activeChannelId) {
      setActiveChannelId(uiActiveChannelId);
    }
  }, [uiActiveChannelId]);

  // Synchronize state from useChatStore to useUIStore
  useEffect(() => {
    if (activeChannelId !== uiActiveChannelId) {
      setUiActiveChannelId(activeChannelId);
    }
  }, [activeChannelId]);

  // Modal open states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteChannelId, setInviteChannelId] = useState<string | undefined>(undefined);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  // Fetch all channels on mount
  const fetchChannelsList = async () => {
    try {
      const { data } = await api.get("/chat/channels");
      setChannels(data.channels || []);
      
      // Auto-select first channel if none selected
      if (data.channels && data.channels.length > 0 && !activeChannelId) {
        setActiveChannelId(data.channels[0].id);
      }
    } catch (err) {
      console.error("Failed to load user chat channels", err);
    }
  };

  useEffect(() => {
    fetchChannelsList();

    const handleOpenCreateGroup = () => {
      setCreateGroupOpen(true);
    };

    const handleOpenInviteEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      setInviteChannelId(customEvent.detail || undefined);
      setInviteModalOpen(true);
    };

    const handleChannelDeletedEvent = (e: Event) => {
      const deletedId = (e as CustomEvent).detail;
      removeChannel(deletedId);
      fetchChannelsList();
      setActiveChannelId(null);
    };

    window.addEventListener("ww:open-create-group", handleOpenCreateGroup);
    window.addEventListener("ww:open-invite", handleOpenInviteEvent);
    window.addEventListener("ww:channel-deleted", handleChannelDeletedEvent);

    // Check URL query parameters for invitation accept token
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get("invite");
    if (inviteToken) {
      const acceptInvite = async () => {
        try {
          const { data } = await api.post(`/chat/invite/${inviteToken}/accept`);
          if (data.channelId) {
            setActiveChannelId(data.channelId);
          }
          // Reload channels
          fetchChannelsList();
          // Clean token from address bar
          window.history.pushState(null, "", "/chat");
        } catch (err) {
          console.error("Accepting invite token failed", err);
        }
      };
      acceptInvite();
    }

    return () => {
      window.removeEventListener("ww:open-create-group", handleOpenCreateGroup);
      window.removeEventListener("ww:open-invite", handleOpenInviteEvent);
      window.removeEventListener("ww:channel-deleted", handleChannelDeletedEvent);
    };
  }, []);

  // Socket relays handlers
  const pageSocketHandlers = {
    "channel:new": () => {
      fetchChannelsList();
    },
    "channel:removed": ({ channelId }: { channelId: string }) => {
      removeChannel(channelId);
    },
    "channel:updated": ({ channel }: { channel: any }) => {
      updateChannel(channel.id, channel);
    },
    "channel:member_added": () => {
      fetchChannelsList();
    },
    "presence:online": ({ userId }: { userId: string }) => {
      setOnlineUser(userId, true);
    },
    "presence:offline": ({ userId }: { userId: string }) => {
      setOnlineUser(userId, false);
    },
    "typing:start": ({ channelId, userId }: { channelId: string, userId: string }) => {
      setTyping(channelId, userId, true);
    },
    "typing:stop": ({ channelId, userId }: { channelId: string, userId: string }) => {
      setTyping(channelId, userId, false);
    }
  };

  // Connect socket event listeners
  useSocket(pageSocketHandlers);

  const handleOpenInvite = (channelId?: string) => {
    setInviteChannelId(channelId);
    setInviteModalOpen(true);
  };

  return (
    <div className="chat-layout">
      
      {/* Side directory navigation */}
      <ChatSidebar 
        onOpenInvite={handleOpenInvite} 
        onOpenCreateGroup={() => setCreateGroupOpen(true)} 
      />

      {/* Main viewport canvas */}
      <div className="chat-main">
        {activeChannelId ? (
          <MessageArea />
        ) : (
          <div className="welcome-screen">
            <div className="welcome-emoji">🌊</div>
            <h2 className="welcome-title">Welcome to WaveWork Chat</h2>
            <p className="welcome-subtitle">
              Initiate standard direct conversations with colleagues, or collaborate in real-time private workspaces!
            </p>
            <div className="welcome-buttons-row">
              <button onClick={() => setCreateGroupOpen(true)} className="sidebar-invite-btn" style={{ borderStyle: "solid", borderWidth: "1px", width: "auto", padding: "8px 24px", background: "hsl(var(--primary-hsl))", color: "white", borderColor: "hsl(var(--primary-hsl))" }}>
                Create a Channel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals Portal portal */}
      {inviteModalOpen && (
        <InviteModal 
          channelId={inviteChannelId} 
          onClose={() => {
            setInviteModalOpen(false);
            setInviteChannelId(undefined);
          }} 
        />
      )}

      {createGroupOpen && (
        <CreateGroupModal 
          onClose={() => setCreateGroupOpen(false)} 
          onCreated={(channel) => {
            setActiveChannelId(channel.id);
            setCreateGroupOpen(false);
            fetchChannelsList();
          }} 
        />
      )}

    </div>
  );
};

export default ChatPage;
