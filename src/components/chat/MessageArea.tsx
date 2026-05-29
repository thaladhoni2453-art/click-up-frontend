import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Paperclip, Video, Phone, Users, Settings, Hash, Lock, 
  Smile, Trash2, File, Loader2, ArrowUpCircle, Check
} from "lucide-react";
import { useChatStore, Message, Channel } from "../../stores/chatStore";
import { useSocket } from "../../hooks/useSocket";
import { api } from "../../lib/api";
import { useAuth } from "../../app/providers";
import { MembersPanel } from "./MembersPanel";
import { EditGroupModal } from "./EditGroupModal";

export const MessageArea: React.FC = () => {
  const { user } = useAuth();
  const { activeChannelId, channels, updateChannel, onlineUsers, setActiveCall, setOnlineUser, setTyping, typingUsers } = useChatStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // UI Panels toggles
  const [membersOpen, setMembersOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  
  // Hover and Emoji state
  const [activeEmojiMenuId, setActiveEmojiMenuId] = useState<string | null>(null);

  const messagesListRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // 1. WebSocket Hook Integration
  const socketHandlers = {
    "message:new": (msg: Message) => {
      if (msg.channelId === activeChannelId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(scrollToBottom, 50);
        markRead(activeChannelId);
      }
    },
    "message:deleted": ({ messageId, channelId }: { messageId: string, channelId: string }) => {
      if (channelId === activeChannelId) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, isDeleted: true, content: "This message was deleted" } : m
        ));
      }
    },
    "message:reaction": ({ messageId, reactions }: { messageId: string, reactions: any[] }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, reactions } : m
      ));
    }
  };

  const { joinChannel, leaveChannel, startTyping, stopTyping, markRead } = useSocket(socketHandlers);

  // 2. Fetch Messages on Channel selection change
  useEffect(() => {
    if (!activeChannelId) return;

    const fetchMessages = async () => {
      setMessages([]);
      setHasMore(false);
      try {
        const { data } = await api.get(`/chat/channels/${activeChannelId}/messages?limit=50`);
        setMessages(data.messages || []);
        setHasMore(data.hasMore);
        
        joinChannel(activeChannelId);
        markRead(activeChannelId);
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error("Failed to load channel messages", err);
      }
    };

    fetchMessages();

    return () => {
      leaveChannel(activeChannelId);
    };
  }, [activeChannelId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadOlderMessages = async () => {
    if (messages.length === 0 || loadingHistory || !activeChannelId) return;
    setLoadingHistory(true);
    
    // Save scroll state
    const container = messagesListRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;
    const oldScrollTop = container ? container.scrollTop : 0;

    try {
      const beforeTime = messages[0].createdAt;
      const { data } = await api.get(`/chat/channels/${activeChannelId}/messages?limit=50&before=${beforeTime}`);
      
      const newMsgs = data.messages || [];
      setMessages(prev => [...newMsgs, ...prev]);
      setHasMore(data.hasMore);

      // Restore scroll height post-render
      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - oldScrollHeight + oldScrollTop;
        }
      }, 50);
    } catch (err) {
      console.error("Failed to load older chat history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !activeChannelId) return;

    const msgContent = text.trim();
    setText("");
    
    // Clear active typing intervals
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      stopTyping(activeChannelId);
    }

    try {
      await api.post(`/chat/channels/${activeChannelId}/messages`, { content: msgContent });
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleTypingInput = () => {
    if (!activeChannelId) return;
    
    startTyping(activeChannelId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(activeChannelId);
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/chat/channels/${activeChannelId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      // Clear file field
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Attachment upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await api.delete(`/chat/messages/${messageId}`);
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  const handleEmojiReact = async (messageId: string, emoji: string) => {
    try {
      await api.post(`/chat/messages/${messageId}/react`, { emoji });
      setActiveEmojiMenuId(null);
    } catch (err) {
      console.error("Emoji reaction dispatch failed", err);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getGroupedMessages = () => {
    const groups: { [date: string]: Message[] } = {};
    messages.forEach(m => {
      const dateStr = new Date(m.createdAt).toDateString();
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(m);
    });
    return groups;
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  // Typing state mapping
  const getTypingLabel = () => {
    if (!activeChannelId) return null;
    const typers = typingUsers[activeChannelId] || [];
    const activeTypers = typers.filter(tid => tid !== user?.id);
    
    if (activeTypers.length === 0) return null;

    const names = activeTypers.map(tid => {
      const member = activeChannel?.members?.find(m => m.userId === tid);
      return member ? member.fullName : "Someone";
    });

    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return "Several people are typing...";
  };

  if (!activeChannel) return null;

  const isDm = activeChannel.type === "DM";
  const myRole = activeChannel.myRole;
  const isOwnerOrAdmin = myRole === "OWNER" || myRole === "ADMIN";
  const typingLabel = getTypingLabel();

  const otherMember = activeChannel.members?.find(m => m.userId !== user?.id);
  
  let otherName = "";
  if (otherMember && otherMember.fullName) {
    otherName = otherMember.fullName;
  } else if (activeChannel.dmUser && activeChannel.dmUser.fullName) {
    otherName = activeChannel.dmUser.fullName;
  } else {
    // Try resolving from description
    const desc = activeChannel.description || "";
    const emailMatch = desc.match(/invited\s+([^\s]+)/i);
    let partnerEmail = emailMatch ? emailMatch[1] : "member@wavework.ai";
    const inviterMatch = desc.match(/^([^\s]+)\s+invited/i) || desc.match(/^([^\s]+)\s+has\s+invited/i);
    const inviterEmail = inviterMatch ? inviterMatch[1] : null;
    if (inviterEmail && user?.email && inviterEmail !== user.email) {
      partnerEmail = inviterEmail;
    }
    const partnerName = partnerEmail.split("@")[0];
    otherName = partnerName.charAt(0).toUpperCase() + partnerName.slice(1);
  }

  if (!otherName || otherName.startsWith("dm:") || otherName === "Chat Partner" || otherName === "Member" || otherName === "M Member") {
    otherName = activeChannel.name || "Colleague";
  }

  const isOnline = isDm ? otherOnline(activeChannel, onlineUsers, user?.id) : false;

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      
      {/* Messages Canvas */}
      <div className="message-area">
        
        {/* Header bar */}
        <div className="message-header" style={{ padding: "12px 24px", height: "64px", borderBottom: "1px solid hsl(var(--border-hsl))", background: "rgba(10, 11, 18, 0.4)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="message-header-left">
            {isDm ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Sleek glowing Avatar */}
                <div 
                  style={{ 
                    position: "relative", 
                    width: "40px", 
                    height: "40px", 
                    borderRadius: "50%", 
                    background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "15px",
                    color: "white",
                    boxShadow: isOnline ? "0 0 12px rgba(16, 185, 129, 0.3)" : "none",
                    border: "2px solid rgba(255,255,255,0.05)"
                  }}
                >
                  {otherName.charAt(0).toUpperCase()}
                  <div 
                    style={{ 
                      position: "absolute", 
                      bottom: "-2px", 
                      right: "-2px", 
                      width: "12px", 
                      height: "12px", 
                      borderRadius: "50%", 
                      background: isOnline ? "#10b981" : "#64748b",
                      border: "2.5px solid #0f111a",
                      boxShadow: isOnline ? "0 0 8px #10b981" : "none"
                    }} 
                  />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "14.5px", fontWeight: "700", color: "white" }}>
                    {otherName}
                  </span>
                  <span style={{ fontSize: "11.5px", color: isOnline ? "#34d399" : "hsl(var(--text-muted-hsl))", fontWeight: "500" }}>
                    {isOnline ? "Active now" : "Offline"}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="message-header-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {activeChannel.isPrivate ? (
                    <Lock size={15} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                  ) : (
                    <Hash size={15} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                  )}
                  <span style={{ fontWeight: "700", color: "white", fontSize: "14px" }}>
                    {activeChannel.name}
                  </span>
                </div>
                <div className="message-header-info" style={{ marginLeft: "8px" }}>
                  {`${activeChannel.memberCount} members`}
                </div>
              </div>
            )}
          </div>

          <div className="message-header-actions">
            {!isDm && (
              <button onClick={() => setMembersOpen(!membersOpen)} className={`header-action-btn ${membersOpen ? "active" : ""}`} title="View channel members">
                <Users size={16} />
              </button>
            )}
            {!isDm && isOwnerOrAdmin && (
              <button onClick={() => setEditGroupOpen(true)} className="header-action-btn" title="Channel settings">
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable messages container */}
        <div className="messages-list-wrapper" ref={messagesListRef}>
          {hasMore && (
            <button onClick={loadOlderMessages} className="sidebar-invite-btn" style={{ alignSelf: "center", width: "auto", padding: "6px 14px", borderStyle: "solid", borderWidth: "1px", marginBottom: "12px", fontSize: "12px" }}>
              <ArrowUpCircle size={13} />
              <span>Load older messages</span>
            </button>
          )}

          {messages.length === 0 ? (
            isDm ? (
              <div className="welcome-screen" style={{ padding: "80px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", textAlign: "center" }}>
                <div 
                  style={{ 
                    position: "relative", 
                    width: "72px", 
                    height: "72px", 
                    borderRadius: "50%", 
                    background: "linear-gradient(135deg, rgba(124, 106, 247, 0.15), rgba(6, 182, 212, 0.15))", 
                    border: "1.5px dashed rgba(124, 106, 247, 0.3)",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "32px",
                    boxShadow: "0 0 24px rgba(124, 106, 247, 0.1)",
                    color: "white",
                    fontWeight: "bold"
                  }}
                >
                  {otherName.charAt(0).toUpperCase()}
                  <div 
                    style={{ 
                      position: "absolute", 
                      bottom: "0px", 
                      right: "0px", 
                      width: "18px", 
                      height: "18px", 
                      borderRadius: "50%", 
                      background: isOnline ? "#10b981" : "#64748b",
                      border: "3px solid #0f111a",
                      boxShadow: isOnline ? "0 0 8px #10b981" : "none"
                    }} 
                  />
                </div>
                <h3 className="welcome-title" style={{ margin: 0 }}>
                  Chat with {otherName}
                </h3>
                <p className="welcome-subtitle" style={{ maxWidth: "340px", margin: 0 }}>
                  This is the absolute beginning of your secure, private 1-on-1 direct conversation with {otherName}. Send a message to connect!
                </p>
              </div>
            ) : (
              <div className="welcome-screen" style={{ padding: "80px 40px" }}>
                <div className="welcome-emoji">💬</div>
                <span className="welcome-title">
                  {`Welcome to #${activeChannel.name}!`}
                </span>
                <span className="welcome-subtitle">
                  {"Send the first message to kickstart collaboration."}
                </span>
              </div>
            )
          ) : (
            Object.entries(getGroupedMessages()).map(([dateStr, msgs]) => (
              <React.Fragment key={dateStr}>
                <div className="message-date-divider">
                  <span className="message-date-label">{formatDateLabel(dateStr)}</span>
                </div>
                
                {msgs.map((m, idx) => {
                  const prevMsg = msgs[idx - 1];
                  const consecutive = prevMsg && 
                                      prevMsg.authorId === m.authorId && 
                                      (new Date(m.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 300000); // 5 min
                  const isMine = m.authorId === user?.id;

                  return (
                    <div 
                      key={m.id} 
                      className={`message-row ${consecutive ? "consecutive" : ""}`}
                    >
                      <div className="message-avatar">
                        {m.author.fullName.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="message-content">
                        <div className="message-meta">
                          <span className="message-author">{m.author.fullName}</span>
                          <span className="message-time">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="message-body">
                          {m.isDeleted ? (
                            <span className="message-deleted">This message was deleted</span>
                          ) : m.type === "IMAGE" ? (
                            <div className="message-text">
                              <img src={m.fileUrl || ""} alt={m.fileName || "Image"} onClick={() => window.open(m.fileUrl || "", "_blank")} />
                              {m.fileName && <div style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>{m.fileName}</div>}
                            </div>
                          ) : m.type === "FILE" ? (
                            <a href={m.fileUrl || ""} target="_blank" rel="noreferrer" className="message-file-chip" style={{ textDecoration: "none" }}>
                              <File size={22} style={{ color: "hsl(var(--primary-light-hsl))", flexShrink: 0 }} />
                              <div className="message-file-details">
                                <span className="message-file-name">{m.fileName}</span>
                                <span className="message-file-size">{formatFileSize(m.fileSize)}</span>
                              </div>
                            </a>
                          ) : (
                            <p className="message-text">{m.content}</p>
                          )}
                        </div>

                        {/* Reactions chips */}
                        {m.reactions && m.reactions.length > 0 && (
                          <div className="reactions-row">
                            {groupReactions(m.reactions, user?.id).map(r => (
                              <div
                                key={r.emoji}
                                onClick={() => handleEmojiReact(m.id, r.emoji)}
                                className={`reaction-chip ${r.isMine ? "mine" : ""}`}
                                title={r.users.join(", ")}
                              >
                                <span>{r.emoji}</span>
                                <span style={{ fontWeight: "700", fontSize: "11px" }}>{r.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hover action menu overlay */}
                      {!m.isDeleted && (
                        <div className="message-actions">
                          <button onClick={() => setActiveEmojiMenuId(activeEmojiMenuId === m.id ? null : m.id)} className="msg-action-btn" title="Add emoji reaction">
                            <Smile size={14} />
                          </button>
                          {isMine && (
                            <button onClick={() => handleDeleteMessage(m.id)} className="msg-action-btn delete" title="Delete message">
                              <Trash2 size={14} />
                            </button>
                          )}

                          {activeEmojiMenuId === m.id && (
                            <div className="emoji-picker-menu">
                              {["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "✅"].map(emoji => (
                                <button key={emoji} onClick={() => handleEmojiReact(m.id, emoji)} className="emoji-btn">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form area */}
        <div className="chat-input-container">
          
          {/* Bouncing typing indicator */}
          <div className="typing-indicator">
            {typingLabel && (
              <>
                <div className="bouncing-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>{typingLabel}</span>
              </>
            )}
          </div>

          {/* Form wrapper */}
          <div className="chat-input-row">
            <button onClick={() => fileInputRef.current?.click()} className="chat-input-action" title="Attach file or photo">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onInput={handleTypingInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isDm ? `Message ${activeChannel.name}` : `Message #${activeChannel.name}`}
              rows={1}
              className="chat-textarea"
              style={{ height: "32px" }}
            />

            <button onClick={() => handleSend()} disabled={!text.trim() || uploading} className="chat-input-action" style={{ background: "hsl(var(--primary-hsl))", color: "white", padding: "6px" }} title="Send Message">
              <Send size={14} />
            </button>
          </div>

        </div>

      </div>

      {/* Auxiliary members list panel */}
      {!isDm && membersOpen && (
        <MembersPanel channelId={activeChannel.id} onClose={() => setMembersOpen(false)} />
      )}

      {/* Edit Group Card overlay */}
      {!isDm && editGroupOpen && (
        <EditGroupModal
          channel={activeChannel}
          onClose={() => setEditGroupOpen(false)}
          onSaved={(updated) => {
            updateChannel(activeChannel.id, updated);
            setEditGroupOpen(false);
          }}
        />
      )}

    </div>
  );
};

// DM other user online selector check helper
const otherOnline = (channel: Channel, onlineUsers: Set<string>, myId?: string): boolean => {
  if (channel.type !== "DM") return false;
  const other = channel.members.find(m => m.userId !== myId) || channel.members[0];
  return other ? onlineUsers.has(other.userId) : false;
};

// Reactions grouper
interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  isMine: boolean;
}

const groupReactions = (reactions: any[], myId?: string): ReactionGroup[] => {
  const groups: { [emoji: string]: ReactionGroup } = {};
  reactions.forEach(r => {
    const em = r.emoji;
    const nameObj = r.user;
    if (!groups[em]) {
      groups[em] = { emoji: em, count: 0, users: [], isMine: false };
    }
    groups[em].count += 1;
    if (nameObj) groups[em].users.push(nameObj.fullName);
    if (r.userId === myId) groups[em].isMine = true;
  });
  return Object.values(groups);
};
export default MessageArea;
