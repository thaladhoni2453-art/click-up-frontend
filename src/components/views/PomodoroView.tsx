import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { 
  Play, Pause, RotateCcw, Timer, Award, CheckCircle2, 
  Flame, Sparkles, BookOpen, Coffee, PlayCircle
} from "lucide-react";

export const PomodoroView: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Timer States
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Local achievements stats
  const [completedCount, setCompletedCount] = useState(0);
  const [focusStats, setFocusStats] = useState<Record<string, number>>({});

  // Audio Context Ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active workspace tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["pomodoro-active-tasks"],
    queryFn: async () => {
      try {
        const { data: workspaces } = await api.get("/workspaces");
        if (workspaces.length === 0) return [];
        const activeWs = workspaces[0].id;
        const { data: hierarchy } = await api.get(`/workspaces/${activeWs}/hierarchy`);
        const allLists: any[] = [];
        
        hierarchy.forEach((space: any) => {
          if (space.lists) allLists.push(...space.lists);
          if (space.folders) {
            space.folders.forEach((f: any) => {
              if (f.lists) allLists.push(...f.lists);
            });
          }
        });
        
        if (allLists.length === 0) return [];
        const promises = allLists.map(async (l) => {
          try {
            const { data } = await api.get("/tasks", { params: { listId: l.id } });
            return data.map((t: any) => ({ ...t, listName: l.name }));
          } catch {
            return [];
          }
        });
        const results = await Promise.all(promises);
        const activeTasks = results.flat().filter((t: any) => t.statusId !== "done-status" && t.status?.name !== "COMPLETE" && t.status?.name !== "DONE");
        return activeTasks;
      } catch (err) {
        console.error(err);
        return [];
      }
    }
  });

  // Selected Task Ref
  const activeTask = tasks.find((t: any) => t.id === selectedTaskId);

  // Load stats from LocalStorage
  useEffect(() => {
    const totalCount = localStorage.getItem("pomodoroTotalCount");
    if (totalCount) setCompletedCount(parseInt(totalCount, 10));

    const itemStats = localStorage.getItem("pomodoroTaskStats");
    if (itemStats) setFocusStats(JSON.parse(itemStats));
  }, []);

  // Synthesize soft focus bell chime using Web Audio API
  const playFocusChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Harmonized bell swoop
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.warn("Chime blocked by user interaction restrictions", e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Timer Core Hook
  useEffect(() => {
    if (isActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer Finished!
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive]);

  const handleTimerComplete = () => {
    setIsActive(false);
    playFocusChime();
    
    if (mode === "focus") {
      const nextCount = completedCount + 1;
      setCompletedCount(nextCount);
      localStorage.setItem("pomodoroTotalCount", nextCount.toString());

      if (selectedTaskId) {
        const nextStats = { ...focusStats, [selectedTaskId]: (focusStats[selectedTaskId] || 0) + 1 };
        setFocusStats(nextStats);
        localStorage.setItem("pomodoroTaskStats", JSON.stringify(nextStats));
        showToast(`Focus session completed! Added 1 log to: ${activeTask?.name}`);
      } else {
        showToast("Brilliant! Focus session completed!");
      }
      
      // Auto transition to short break
      handleSetMode("shortBreak");
    } else {
      showToast("Break completed! Ready to focus?");
      handleSetMode("focus");
    }
  };

  const handleSetMode = (newMode: "focus" | "shortBreak" | "longBreak") => {
    setMode(newMode);
    setIsActive(false);
    if (newMode === "focus") setTimeLeft(25 * 60);
    else if (newMode === "shortBreak") setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  const handleToggleTimer = () => {
    setIsActive(!isActive);
  };

  const handleResetTimer = () => {
    setIsActive(false);
    handleSetMode(mode);
  };

  // Resolve task directly from Pomodoro
  const handleResolveTask = async () => {
    if (!selectedTaskId || !activeTask) return;
    try {
      // Dynamic complete status lookup
      const { data: listData } = await api.get(`/workspaces/lists/${activeTask.listId}`);
      const { data: spaceData } = await api.get(`/workspaces/spaces/${listData.spaceId}`);
      const doneStatus = spaceData?.statuses?.find((s: any) => s.name === "COMPLETE" || s.name === "DONE" || s.id.includes("done"));
      
      const doneId = doneStatus ? doneStatus.id : "done-status";
      await api.patch(`/tasks/${selectedTaskId}`, { statusId: doneId });
      queryClient.invalidateQueries({ queryKey: ["pomodoro-active-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["planner-tasks"] });
      
      showToast(`Excellent job! "${activeTask.name}" marked as completed.`);
      setSelectedTaskId(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to complete task");
    }
  };

  // Format MM:SS helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // Circular progress calculations
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const maxDuration = mode === "focus" ? 25 * 60 : mode === "shortBreak" ? 5 * 60 : 15 * 60;
  const strokeDashoffset = circumference - (timeLeft / maxDuration) * circumference;

  return (
    <div 
      style={{ 
        flex: 1, 
        padding: "32px", 
        display: "grid", 
        gridTemplateColumns: "1fr 340px", 
        gap: "28px", 
        background: "rgba(10, 11, 18, 0.2)",
        height: "100%", 
        overflowY: "auto" 
      }}
    >
      
      {/* LEFT: TIMER & FOCUS PANEL */}
      <div 
        style={{ 
          background: "rgba(20, 22, 33, 0.4)", 
          borderRadius: "var(--radius-lg)", 
          border: "1px solid hsl(var(--border-hsl))", 
          padding: "40px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          gap: "24px",
          position: "relative",
          backdropFilter: "blur(12px)"
        }}
      >
        
        {/* Glow Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Timer size={24} style={{ color: "hsl(var(--primary-light-hsl))" }} />
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "white", margin: 0, letterSpacing: "-0.5px" }}>
            Pomodoro Focus Station
          </h2>
        </div>

        <p style={{ fontSize: "13px", color: "hsl(var(--text-muted-hsl))", textAlign: "center", maxWidth: "420px", margin: 0 }}>
          Engage in single-task focus blocks. Silence distractions, align your workspace, and lock in for 25 minutes of high-efficiency output.
        </p>

        {/* Mode Selectors */}
        <div style={{ display: "flex", gap: "6px", background: "rgba(0,0,0,0.35)", padding: "4px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { id: "focus", label: "Focus Session (25m)", icon: <Flame size={12} /> },
            { id: "shortBreak", label: "Short Break (5m)", icon: <Coffee size={12} /> },
            { id: "longBreak", label: "Long Break (15m)", icon: <BookOpen size={12} /> },
          ].map((btn) => {
            const active = mode === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => handleSetMode(btn.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "700",
                  borderRadius: "6px",
                  border: "none",
                  background: active ? "hsl(var(--primary-hsl))" : "transparent",
                  color: active ? "white" : "hsl(var(--text-secondary-hsl))",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom SVG Ring Countdown Timer */}
        <div style={{ position: "relative", width: "200px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "12px" }}>
          
          <svg width="200" height="200" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
            {/* Background Circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Active Glowing Circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="url(#timerGradient)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.3s linear" }}
            />
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary-hsl))" />
                <stop offset="100%" stopColor="hsl(var(--accent-hsl))" />
              </linearGradient>
            </defs>
          </svg>

          {/* Time digits text */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
            <span style={{ fontSize: "36px", fontWeight: "900", fontFamily: "monospace", color: "white", letterSpacing: "-1.5px" }}>
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: "9px", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", marginTop: "2px", letterSpacing: "1px" }}>
              {isActive ? "Locked In" : "Paused"}
            </span>
          </div>

        </div>

        {/* Timer Control Triggers */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleToggleTimer}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: isActive ? "rgba(255, 255, 255, 0.15)" : "white",
              color: isActive ? "white" : "black",
              border: isActive ? "1px solid rgba(255,255,255,0.2)" : "none",
              borderRadius: "50px",
              padding: "12px 32px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: isActive ? "none" : "0 4px 20px rgba(255, 255, 255, 0.3)"
            }}
          >
            {isActive ? (
              <>
                <Pause size={14} fill="white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={14} fill="black" />
                <span>Start Focus</span>
              </>
            )}
          </button>

          <button
            onClick={handleResetTimer}
            title="Reset Timer"
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
          >
            <RotateCcw size={15} />
          </button>
        </div>

      </div>

      {/* RIGHT: TASK ASSIGNMENT & ACHIEVEMENTS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Task Focus card block */}
        <div 
          style={{ 
            background: "rgba(20, 22, 33, 0.4)", 
            borderRadius: "var(--radius-lg)", 
            border: "1px solid hsl(var(--border-hsl))", 
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            backdropFilter: "blur(12px)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} style={{ color: "hsl(var(--warning-hsl))" }} />
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "white", margin: 0 }}>Focus Assignment</h3>
          </div>
          
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", margin: 0 }}>
            Connect your countdown timer to a specific workspace task to log completions and track stats:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase" }}>Select Focus Task</span>
            <select
              value={selectedTaskId || ""}
              onChange={(e) => setSelectedTaskId(e.target.value || null)}
              style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "6px",
                color: "white",
                fontSize: "12px",
                padding: "8px 12px",
                height: "36px",
                width: "100%",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="" style={{ background: "#121420" }}>-- Solo Session (No Task) --</option>
              {tasks.map((t: any) => (
                <option key={t.id} value={t.id} style={{ background: "#121420" }}>
                  [{t.listName || "Task"}] {t.name}
                </option>
              ))}
            </select>
          </div>

          {activeTask ? (
            <div 
              className="animate-fade-in"
              style={{
                padding: "16px",
                borderRadius: "var(--radius-md)",
                background: "rgba(124, 106, 247, 0.05)",
                border: "1px solid rgba(124, 106, 247, 0.2)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "4px"
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <CheckCircle2 size={15} style={{ color: "hsl(var(--primary-light-hsl))", flexShrink: 0, marginTop: "2px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "700", color: "white", lineHeight: "1.3" }}>
                    {activeTask.name}
                  </span>
                  <span style={{ fontSize: "10.5px", color: "hsl(var(--text-muted-hsl))" }}>
                    Workspace List: {activeTask.listName || "Sprint Backlog"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>
                  Logged Focus: {focusStats[activeTask.id] || 0} pomos
                </span>
                <button
                  onClick={handleResolveTask}
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "4px",
                    color: "#10B981",
                    fontSize: "10.5px",
                    fontWeight: "700",
                    padding: "4px 8px",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(16, 185, 129, 0.22)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(16, 185, 129, 0.12)"}
                >
                  Mark Task Complete ✓
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", padding: "14px", borderRadius: "var(--radius-sm)", color: "hsl(var(--text-muted-hsl))", fontSize: "11px", textAlign: "center", justifyContent: "center" }}>
              <PlayCircle size={14} />
              <span>No task selected. Focus stats will log to solo tally.</span>
            </div>
          )}

        </div>

        {/* Analytics achievements log */}
        <div 
          style={{ 
            background: "rgba(20, 22, 33, 0.4)", 
            borderRadius: "var(--radius-lg)", 
            border: "1px solid hsl(var(--border-hsl))", 
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            backdropFilter: "blur(12px)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={16} style={{ color: "#10B981" }} />
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "white", margin: 0 }}>Focus Achievement Log</h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "20px", fontWeight: "900", color: "#10B981" }}>{completedCount}</span>
              <span style={{ fontSize: "10.5px", color: "hsl(var(--text-muted-hsl))", fontWeight: "600", textTransform: "uppercase" }}>Completed cycles</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>
                {(completedCount * 25 / 60).toFixed(1)} hrs
              </span>
              <span style={{ fontSize: "10.5px", color: "hsl(var(--text-muted-hsl))", fontWeight: "600", textTransform: "uppercase" }}>Focus logged</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "white" }}>Recent Focus Stats per Task</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {Object.keys(focusStats).length === 0 ? (
                <div style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", fontStyle: "italic", padding: "10px 0" }}>
                  Focus cycles logged per task will appear here.
                </div>
              ) : (
                Object.entries(focusStats).map(([tId, count]) => {
                  const tObj = tasks.find((tk: any) => tk.id === tId);
                  const name = tObj ? tObj.name : "Focus Session";
                  return (
                    <div key={tId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", background: "rgba(255,255,255,0.02)", padding: "6px 10px", borderRadius: "4px" }}>
                      <span style={{ color: "hsl(var(--text-secondary-hsl))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{name}</span>
                      <span style={{ color: "#10B981", fontWeight: "700" }}>{count} pomo{count > 1 ? "s" : ""}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 5. FLOATING TOAST NOTIFICATION CARD */}
      {toastMessage && (
        <div 
          style={{ 
            position: "absolute", 
            bottom: "24px", 
            left: "50%", 
            transform: "translateX(-50%)", 
            background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "var(--radius-md)",
            padding: "12px 24px",
            color: "white",
            fontSize: "13px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "var(--shadow-lg), 0 0 20px rgba(124,106,247,0.4)",
            zIndex: 99999,
            animation: "slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          <Sparkles size={16} className="animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

export default PomodoroView;
