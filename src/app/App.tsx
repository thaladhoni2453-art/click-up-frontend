import React, { useState } from "react";
import { useAuth } from "./providers";
import { useUIStore } from "../stores/uiStore";
import { Sidebar } from "../components/layout/Sidebar";
import { TopNav } from "../components/layout/TopNav";
import { ListView } from "../components/views/ListView";
import { BoardView } from "../components/views/BoardView";
import { GanttView } from "../components/views/GanttView";
import { CalendarView } from "../components/views/CalendarView";
import { DocEditor } from "../components/views/DocEditor";
import { ChatPage } from "../components/chat/ChatPage";
import { DashboardBuilder } from "../components/views/DashboardBuilder";
import { GoalsTracker } from "../components/views/GoalsTracker";
import { PlannerView } from "../components/views/PlannerView";
import { InboxView } from "../components/views/InboxView";
import { RepliesView } from "../components/views/RepliesView";
import { AssignedCommentsView } from "../components/views/AssignedCommentsView";
import { MyTasksView } from "../components/views/MyTasksView";
import { PersonalSpaceView } from "../components/views/PersonalSpaceView";
import { PomodoroView } from "../components/views/PomodoroView";
import { TaskDetail } from "../components/tasks/TaskDetail";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { Sparkles, Layers, Kanban, Calendar, Settings2, Home, BookOpen, MessageSquare, Target, BarChart3, Users, Layout, ClipboardList, UserPlus, Settings, HelpCircle, Timer } from "lucide-react";
import { getSocket } from "../lib/socket";
import { api } from "../lib/api";

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const { activeViewId, activeListId, activeDocId, activeChannelId } = useUIStore();
  const [authScreen, setAuthScreen] = useState<"login" | "register">(() => {
    return window.location.pathname.startsWith("/signup") || window.location.search.includes("invite=") ? "register" : "login";
  });
  const [sessionActive, setSessionActive] = useState(false);

  // Identify active user over WebSocket connection
  React.useEffect(() => {
    if (user) {
      const socket = getSocket();
      socket.emit("identify", user.id);
    }
  }, [user]);

  // Resilient invitation accept flow on authentication
  React.useEffect(() => {
    if (!user) return;

    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get("invite");
    if (inviteToken) {
      const acceptInvite = async () => {
        try {
          const { data } = await api.post(`/chat/invite/${inviteToken}/accept`);
          // Clean the invite from URL and route to chat
          window.history.pushState(null, "", data.channelId ? `/chat/${data.channelId}` : "/chat");
          useUIStore.setState({ 
            activeViewId: "chat", 
            activeChannelId: data.channelId || "general",
            activeDocId: null
          });
        } catch (err) {
          console.error("Accepting invite token in App failed", err);
        }
      };
      acceptInvite();
    }
  }, [user]);

  // Synchronize Zustand UI state with the Browser URL (Deep linking & Back/Forward Support)
  React.useEffect(() => {
    const syncFromURL = () => {
      const path = window.location.pathname;
      const parts = path.split("/").filter(Boolean); // e.g. ["chat", "general"] or ["inbox"]
      
      if (parts.length === 0) {
        useUIStore.getState().setActiveViewId("inbox");
        return;
      }

      const view = parts[0];
      if (view === "docs") {
        const docId = parts[1] || "general";
        useUIStore.setState({ activeViewId: "docs", activeDocId: docId, activeChannelId: null });
      } else if (view === "chat") {
        const channelId = parts[1] || "general";
        useUIStore.setState({ activeViewId: "chat", activeChannelId: channelId, activeDocId: null });
      } else {
        // Standard views
        useUIStore.setState({ activeViewId: view, activeDocId: null, activeChannelId: null });
      }
    };

    // Run once on load
    syncFromURL();

    // Listen to browser Back/Forward navigation
    window.addEventListener("popstate", syncFromURL);
    return () => window.removeEventListener("popstate", syncFromURL);
  }, []);

  // State to URL push synchronizer: Whenever active state changes, push state to address bar
  React.useEffect(() => {
    let targetPath = "/";
    if (activeViewId === "docs" && activeDocId) {
      targetPath = `/docs/${activeDocId}`;
    } else if (activeViewId === "chat" && activeChannelId) {
      targetPath = `/chat/${activeChannelId}`;
    } else if (activeViewId) {
      targetPath = `/${activeViewId}`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  }, [activeViewId, activeDocId, activeChannelId]);

  if (loading) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "hsl(var(--background-hsl))", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <Sparkles className="animate-pulse" size={40} style={{ color: "hsl(var(--primary-light-hsl))" }} />
          <span style={{ fontSize: "14px", fontWeight: "600", fontFamily: "var(--font-display)" }}>Launching WaveWork.ai...</span>
        </div>
      </div>
    );
  }

  // Auth pages logic mapping
  if (!user && !sessionActive) {
    return (
      <div 
        style={{
          width: "100vw",
          height: "100vh",
          background: "radial-gradient(circle at 10% 20%, hsla(263, 90%, 64%, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, hsla(195, 100% 50%, 0.1) 0%, transparent 50%), hsl(var(--background-hsl))",
          overflow: "hidden",
        }}
      >
        {authScreen === "login" ? (
          <LoginPage 
            onToggleRegister={() => setAuthScreen("register")} 
            onSuccess={() => setSessionActive(true)} 
          />
        ) : (
          <RegisterPage 
            onToggleLogin={() => setAuthScreen("login")} 
            onSuccess={() => setSessionActive(true)} 
          />
        )}
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeViewId) {
      case "list":
        return <ListView />;
      case "board":
        return <BoardView />;
      case "gantt":
        return <GanttView />;
      case "calendar":
        return <CalendarView />;
      case "docs":
        return <DocEditor />;
      case "chat":
        return <ChatPage />;
      case "goals":
        return <GoalsTracker />;
      case "dashboards":
        return <DashboardBuilder />;
      case "inbox":
        return <InboxView />;
      case "replies":
        return <RepliesView />;
      case "assigned-comments":
        return <AssignedCommentsView />;
      case "my-tasks":
        return <MyTasksView />;
      case "personal-space":
        return <PersonalSpaceView />;
      case "planner":
        return <PlannerView />;
      case "pomodoro":
        return <PomodoroView />;
      default:
        return <ListView />;
    }
  };

  return (
    <div className="app-container">
      {/* Leftmost Slim Dock (ClickUp Style) */}
      <div 
        style={{
          width: "56px",
          background: "rgba(10, 11, 18, 0.95)",
          borderRight: "1px solid hsl(var(--border-hsl))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        {/* Top Icons */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
          {/* User Avatar */}
          <div 
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "13px",
              color: "white",
              boxShadow: "0 0 10px rgba(168, 85, 247, 0.4)",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
          >
            {user?.fullName?.charAt(0).toUpperCase() || "M"}
          </div>

          <div style={{ width: "24px", height: "1px", background: "rgba(255,255,255,0.08)" }}></div>

          {/* Navigation Icon List */}
          {[
            { id: "inbox", icon: <Home size={18} />, label: "Home Hub" },
            { id: "planner", icon: <Calendar size={18} />, label: "Planner" },
            { id: "chat", icon: <Users size={18} />, label: "Teams Chat" },
            { id: "docs", icon: <BookOpen size={18} />, label: "Docs Editor" },
            { id: "dashboards", icon: <BarChart3 size={18} />, label: "Dashboards" },
            { id: "list", icon: <Layout size={18} />, label: "Whiteboards" },
            { id: "pomodoro", icon: <Timer size={18} />, label: "Pomodoro Focus" },
          ].map((item) => {
            const isActive = activeViewId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "docs") {
                    useUIStore.getState().setActiveDocId("general");
                  } else if (item.id === "chat") {
                    useUIStore.getState().setActiveChannelId("general");
                  } else {
                    useUIStore.getState().setActiveViewId(item.id);
                  }
                }}
                title={item.label}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                  border: "none",
                  color: isActive ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "var(--transition-smooth)",
                  position: "relative",
                }}
              >
                {item.icon}
                {isActive && (
                  <div 
                    style={{
                      position: "absolute",
                      left: 0,
                      width: "3px",
                      height: "16px",
                      borderRadius: "0 2px 2px 0",
                      background: "hsl(var(--primary-hsl))",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Icons */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
          {/* Invite Button */}
          <button
            onClick={() => useUIStore.getState().setActiveViewId("inbox")}
            title="Invite People"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(79, 70, 229, 0.15)",
              border: "1px dashed rgba(79, 70, 229, 0.4)",
              color: "hsl(var(--primary-light-hsl))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "var(--transition-smooth)",
            }}
          >
            <UserPlus size={16} />
          </button>

          {/* Settings Button */}
          <button
            title="Workspace Settings"
            style={{
              width: "40px",
              height: "40px",
              background: "transparent",
              border: "none",
              color: "hsl(var(--text-muted-hsl))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "var(--transition-smooth)",
            }}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Sidebar navigation shell */}
      <Sidebar />

      {/* Main Right panel contents */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Navigation Breadcrumbs & AI Actions header bar */}
        <TopNav />

        {/* Dynamic task view buttons selectors sub-bar (Only shown when viewing Tasks view) */}
        {!activeDocId && !activeChannelId && (activeViewId === "list" || activeViewId === "board" || activeViewId === "gantt" || activeViewId === "calendar") && activeListId && (
          <div style={{ height: "46px", borderBottom: "1px solid hsl(var(--border-hsl))", padding: "0 24px", display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.01)" }}>
            <button
              onClick={() => useUIStore.getState().setActiveViewId("list")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: activeViewId === "list" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))", cursor: "pointer", fontSize: "13px", fontWeight: activeViewId === "list" ? "600" : "500", borderBottom: activeViewId === "list" ? "2px solid hsl(var(--primary-hsl))" : "none", height: "100%", padding: "0 4px" }}
            >
              <Layers size={13} />
              List
            </button>
            <button
              onClick={() => useUIStore.getState().setActiveViewId("board")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: activeViewId === "board" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))", cursor: "pointer", fontSize: "13px", fontWeight: activeViewId === "board" ? "600" : "500", borderBottom: activeViewId === "board" ? "2px solid hsl(var(--primary-hsl))" : "none", height: "100%", padding: "0 4px" }}
            >
              <Kanban size={13} />
              Board
            </button>
            <button
              onClick={() => useUIStore.getState().setActiveViewId("gantt")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: activeViewId === "gantt" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))", cursor: "pointer", fontSize: "13px", fontWeight: activeViewId === "gantt" ? "600" : "500", borderBottom: activeViewId === "gantt" ? "2px solid hsl(var(--primary-hsl))" : "none", height: "100%", padding: "0 4px" }}
            >
              <Settings2 size={13} />
              Gantt
            </button>
            <button
              onClick={() => useUIStore.getState().setActiveViewId("calendar")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: activeViewId === "calendar" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))", cursor: "pointer", fontSize: "13px", fontWeight: activeViewId === "calendar" ? "600" : "500", borderBottom: activeViewId === "calendar" ? "2px solid hsl(var(--primary-hsl))" : "none", height: "100%", padding: "0 4px" }}
            >
              <Calendar size={13} />
              Calendar
            </button>
          </div>
        )}

        {/* Main Content view panel canvas */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {renderActiveView()}
        </div>
      </div>

      {/* Sliding sliding detail side task drawer panel */}
      <TaskDetail />
    </div>
  );
};
