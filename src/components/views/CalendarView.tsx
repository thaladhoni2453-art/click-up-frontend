import React from "react";
import { useTasks } from "../../hooks/useTasks";
import { useUIStore } from "../../stores/uiStore";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

export const CalendarView: React.FC = () => {
  const { activeListId, setSelectedTaskId } = useUIStore();
  const { data: tasks = [], isLoading } = useTasks(activeListId);

  if (!activeListId) return null;

  // Simple current month grid calculation
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Get total days in month
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const daysArray = Array.from({ length: 35 }).map((_, idx) => {
    const dayNumber = idx - firstDayIndex + 1;
    if (dayNumber > 0 && dayNumber <= totalDays) {
      return dayNumber;
    }
    return null;
  });

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header bar controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Calendar Planner</h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>Plan team deadlines, track calendar timelines and manage schedule slots.</p>
        </div>
        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 12px", borderRadius: "var(--radius-sm)" }}>
          <ChevronLeft size={16} style={{ cursor: "pointer", color: "hsl(var(--text-secondary-hsl))" }} />
          <span style={{ fontWeight: 600, fontSize: "13px" }}>{today.toLocaleString("default", { month: "long" })} {currentYear}</span>
          <ChevronRight size={16} style={{ cursor: "pointer", color: "hsl(var(--text-secondary-hsl))" }} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted-hsl))" }}>Loading schedule planner...</div>
      ) : (
        <div className="glass-panel" style={{ flex: 1, display: "grid", gridTemplateRows: "32px 1fr", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))", overflow: "hidden" }}>
          {/* Days of Week headings */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid hsl(var(--border-hsl))", textAlign: "center", alignItems: "center", fontWeight: "600", fontSize: "11px", color: "hsl(var(--text-muted-hsl))", textTransform: "uppercase" }}>
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days numbers calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(5, 1fr)", flex: 1 }}>
            {daysArray.map((day, idx) => {
              // Find matching tasks due on this day
              const dayTasks = tasks.filter((t: any) => {
                if (!t.dueDate || !day) return false;
                const taskDate = new Date(t.dueDate);
                return taskDate.getDate() === day && taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
              });

              return (
                <div
                  key={idx}
                  style={{
                    borderRight: (idx + 1) % 7 !== 0 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    borderBottom: idx < 28 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    overflow: "hidden",
                    minHeight: "80px",
                  }}
                >
                  {/* Day label */}
                  {day && (
                    <span style={{ fontSize: "12px", fontWeight: "600", color: day === today.getDate() ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))" }}>
                      {day}
                    </span>
                  )}

                  {/* Day tasks listings */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", flex: 1 }}>
                    {dayTasks.map((task: any) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        title={task.name}
                        style={{
                          background: "linear-gradient(135deg, rgba(142, 70, 229, 0.15) 0%, rgba(0, 199, 255, 0.08) 100%)",
                          border: "1px solid hsla(263, 90%, 64%, 0.3)",
                          borderRadius: "4px",
                          padding: "4px 6px",
                          fontSize: "11px",
                          fontWeight: "500",
                          color: "white",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                        }}
                      >
                        {task.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
