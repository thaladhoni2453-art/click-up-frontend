import React from "react";
import { useTasks } from "../../hooks/useTasks";
import { useUIStore } from "../../stores/uiStore";
import { Calendar, Clock, BarChart } from "lucide-react";

export const GanttView: React.FC = () => {
  const { activeListId, setSelectedTaskId } = useUIStore();
  const { data: tasks = [], isLoading } = useTasks(activeListId);

  if (!activeListId) return null;

  // Simple day math helper to plot on week timeline grid
  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

  const getDayOffset = (dateString: string | null) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const diffTime = Math.abs(date.getTime() - startOfWeek.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(diffDays, 0), 14); // Clamp within 2 weeks grid display
  };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header Description */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Gantt Chart Timeline</h2>
        <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>Plan, schedule, and view dependencies along interactive horizontal task timeline scopes.</p>
      </div>

      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted-hsl))" }}>Loading timeline grid...</div>
      ) : (
        <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))", overflow: "hidden" }}>
          {/* Gantt Header Titles bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2.8fr", height: "46px", borderBottom: "1px solid hsl(var(--border-hsl))", background: "rgba(255,255,255,0.02)", alignItems: "center" }}>
            {/* Left side list label */}
            <div style={{ paddingLeft: "20px", fontWeight: "600", color: "hsl(var(--text-muted-hsl))", fontSize: "12px" }}>Tasks backlog</div>
            {/* Right side week headings */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", height: "100%", borderLeft: "1px solid hsl(var(--border-hsl))", alignItems: "center", textAlign: "center", fontSize: "10px", color: "hsl(var(--text-muted-hsl))", fontWeight: "600" }}>
              {Array.from({ length: 14 }).map((_, idx) => {
                const day = new Date(startOfWeek);
                day.setDate(day.getDate() + idx);
                return (
                  <div key={idx} style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", borderRight: idx < 13 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                    <span>{day.toLocaleDateString(undefined, { weekday: "short" })}</span>
                    <span style={{ fontSize: "9px", opacity: 0.7 }}>{day.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gantt Row Lists body */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {tasks.map((task: any) => {
              const dayOffset = getDayOffset(task.dueDate || task.startDate);
              const barSpan = 2; // Default horizontal bar length

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  style={{ display: "grid", gridTemplateColumns: "1.2fr 2.8fr", borderBottom: "1px solid rgba(255,255,255,0.03)", minHeight: "44px", alignItems: "center", cursor: "pointer", transition: "var(--transition-smooth)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.01)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Left Column task name */}
                  <div style={{ paddingLeft: "20px", fontSize: "13px", fontWeight: "500", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {task.name}
                  </div>

                  {/* Right Column timeline bar container */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", height: "100%", borderLeft: "1px solid hsl(var(--border-hsl))", position: "relative", alignItems: "center" }}>
                    {/* Background columns grid lines */}
                    {Array.from({ length: 14 }).map((_, idx) => (
                      <div key={idx} style={{ height: "100%", borderRight: idx < 13 ? "1px solid rgba(255,255,255,0.02)" : "none", gridColumnStart: idx + 1 }}></div>
                    ))}

                    {/* Timeline task horizontal bar */}
                    <div
                      style={{
                        gridColumnStart: Math.max(dayOffset, 1),
                        gridColumnEnd: `span ${barSpan}`,
                        height: "24px",
                        background: "linear-gradient(90deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))",
                        borderRadius: "var(--radius-sm)",
                        boxShadow: "0 2px 10px hsla(263, 90%, 64%, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 10px",
                        color: "white",
                        fontSize: "11px",
                        fontWeight: "600",
                        zIndex: 10,
                        position: "absolute",
                        width: "calc(100% - 4px)",
                        margin: "0 2px",
                      }}
                    >
                      <BarChart size={10} style={{ marginRight: "4px" }} />
                      Timeline bar
                    </div>
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 && (
              <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted-hsl))" }}>
                No tasks to schedule inside this timeline.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
