import React from "react";
import { useTasks, useTaskMutations } from "../../hooks/useTasks";
import { useUIStore } from "../../stores/uiStore";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { ArrowRight, Sparkles, User, Calendar } from "lucide-react";

export const BoardView: React.FC = () => {
  const { activeListId, setSelectedTaskId } = useUIStore();
  const { data: tasks = [], isLoading } = useTasks(activeListId);
  const { updateTask } = useTaskMutations();

  // Fetch all statuses mapping to build board columns
  const { data: spaceStatuses = [] } = useQuery({
    queryKey: ["statuses", activeListId],
    queryFn: async () => {
      if (!activeListId) return [];
      const { data } = await api.get(`/workspaces/lists/${activeListId}`);
      const { data: spaces } = await api.get(`/workspaces/spaces/${data.spaceId}`);
      return spaces?.statuses || [];
    },
    enabled: !!activeListId,
  });

  const moveTaskStatus = (taskId: string, targetStatusId: string) => {
    updateTask.mutate({ taskId, updateData: { statusId: targetStatusId } });
  };

  if (!activeListId) return null;

  // Group tasks by status ID
  const groupedTasks: Record<string, any[]> = {};
  spaceStatuses.forEach((st: any) => {
    groupedTasks[st.id] = [];
  });

  tasks.forEach((t: any) => {
    if (groupedTasks[t.statusId]) {
      groupedTasks[t.statusId].push(t);
    } else {
      // Fallback fallback if status is missing in groups
      groupedTasks[t.statusId] = [t];
    }
  });

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header Info */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Kanban Board</h2>
        <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>Drag tasks across status streams or click arrow keys to shift progress columns in real-time.</p>
      </div>

      {/* Board Scroll Grid columns */}
      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted-hsl))" }}>Loading board columns...</div>
      ) : (
        <div style={{ display: "flex", gap: "20px", flex: 1, overflowX: "auto", paddingBottom: "12px", alignItems: "flex-start" }}>
          {spaceStatuses.map((col: any) => {
            const colTasks = groupedTasks[col.id] || [];
            return (
              <div 
                key={col.id} 
                className="glass-panel" 
                style={{ width: "300px", minWidth: "300px", maxWeight: "100%", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))", padding: "16px", display: "flex", flexDirection: "column", maxHeight: "100%", background: "rgba(10, 12, 18, 0.4)" }}
              >
                {/* Column header title */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid hsl(var(--border-hsl))" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: col.color || "#8E8E93" }}></div>
                    <span style={{ fontWeight: "600", fontSize: "13px", color: "white", letterSpacing: "0.03em" }}>{col.name}</span>
                    <span style={{ fontSize: "11px", fontWeight: "600", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "var(--radius-sm)", color: "hsl(var(--text-muted-hsl))" }}>{colTasks.length}</span>
                  </div>
                </div>

                {/* Columns cards list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }}>
                  {colTasks.map((task: any) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="card animate-fade-in"
                      style={{ padding: "14px", cursor: "pointer", background: "hsl(var(--card-hsl))", display: "flex", flexDirection: "column", gap: "10px" }}
                    >
                      {/* Name */}
                      <div style={{ fontWeight: "500", fontSize: "13px", color: "white", lineHeight: "1.4" }}>
                        {task.name}
                      </div>

                      {/* Info indicators */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                        {/* Priority */}
                        {task.priority !== "NONE" ? (
                          <span className={`badge badge-priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        ) : (
                          <span></span>
                        )}

                        {/* Transition actions directly via button */}
                        <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                          {spaceStatuses.filter((s: any) => s.id !== col.id).map((otherCol: any) => (
                            <button
                              key={otherCol.id}
                              onClick={() => moveTaskStatus(task.id, otherCol.id)}
                              title={`Shift to ${otherCol.name}`}
                              style={{ width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid hsl(var(--border-hsl))", color: "hsl(var(--text-muted-hsl))", borderRadius: "4px", cursor: "pointer", fontSize: "9px" }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = otherCol.color; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--text-muted-hsl))"; e.currentTarget.style.borderColor = "hsl(var(--border-hsl))"; }}
                            >
                              <ArrowRight size={10} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Due Date display */}
                      {task.dueDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "hsl(var(--text-muted-hsl))", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "8px", marginTop: "4px" }}>
                          <Calendar size={11} />
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div style={{ border: "2px dashed hsl(var(--border-hsl))", borderRadius: "var(--radius-md)", padding: "20px 10px", textAlign: "center", color: "hsl(var(--text-muted-hsl))", fontSize: "12px" }}>
                      Drop items here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
