import React, { useState } from "react";
import { useTasks, useTaskMutations } from "../../hooks/useTasks";
import { useUIStore } from "../../stores/uiStore";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Plus, Clock, User, AlertCircle, Trash2, Edit } from "lucide-react";

export const ListView: React.FC = () => {
  const { activeListId, setSelectedTaskId } = useUIStore();
  const { data: tasks = [], isLoading, refetch } = useTasks(activeListId);
  const { createTask, updateTask, deleteTask } = useTaskMutations();

  const [newTaskName, setNewTaskName] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Fetch list statuses to allow selection
  const { data: spaceStatuses = [] } = useQuery({
    queryKey: ["statuses", activeListId],
    queryFn: async () => {
      if (!activeListId) return [];
      const { data } = await api.get(`/workspaces/lists/${activeListId}`);
      // Find list's space statuses
      const { data: spaces } = await api.get(`/workspaces/spaces/${data.spaceId}`);
      return spaces?.statuses || [];
    },
    enabled: !!activeListId,
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !activeListId) return;

    createTask.mutate({
      listId: activeListId,
      name: newTaskName,
      priority: "NONE",
    }, {
      onSuccess: () => {
        setNewTaskName("");
        setAddingTask(false);
      }
    });
  };

  const handleUpdateStatus = (taskId: string, statusId: string) => {
    updateTask.mutate({ taskId, updateData: { statusId } });
  };

  const handleUpdatePriority = (taskId: string, priority: string) => {
    updateTask.mutate({ taskId, updateData: { priority } });
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate({ taskId, listId: activeListId! });
    }
  };

  if (!activeListId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "hsl(var(--text-secondary-hsl))" }}>
        <Layers size={48} style={{ marginBottom: "16px", color: "hsl(var(--text-muted-hsl))", opacity: 0.5 }} />
        <h3>No List Selected</h3>
        <p style={{ fontSize: "13px", color: "hsl(var(--text-muted-hsl))", marginTop: "4px" }}>Choose a space list on the sidebar to start tracking work.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Task List</h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>Spreadsheet-style list mapping all active tasks, statuses, and custom variables.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddingTask(true)}>
          <Plus size={16} />
          Create Task
        </button>
      </div>

      {/* Inline Task Creation Form */}
      {addingTask && (
        <form onSubmit={handleCreateTask} className="glass-panel animate-slide-up" style={{ padding: "16px", borderRadius: "var(--radius-md)", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            className="input-field"
            style={{ flex: 1, height: "36px" }}
            required
            autoFocus
          />
          <button type="submit" className="btn btn-primary" style={{ height: "36px" }}>Save Task</button>
          <button type="button" className="btn btn-secondary" onClick={() => setAddingTask(false)} style={{ height: "36px" }}>Cancel</button>
        </form>
      )}

      {/* Spreadsheet List Grid */}
      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted-hsl))" }}>Loading task logs...</div>
      ) : tasks.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px", textAlign: "center", borderRadius: "var(--radius-md)" }}>
          <p style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "14px" }}>No tasks inside this backlog. Create one to begin!</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid hsl(var(--border-hsl))" }}>
          {/* Header titles */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 0.5fr", padding: "12px 20px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid hsl(var(--border-hsl))", fontWeight: "600", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.03em", color: "hsl(var(--text-muted-hsl))" }}>
            <div>Task Name</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Due Date</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>

          {/* Rows details */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {tasks.map((task: any) => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="animate-fade-in"
                style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 0.5fr", padding: "14px 20px", borderBottom: "1px solid hsl(var(--border-hsl))", cursor: "pointer", transition: "var(--transition-smooth)", alignItems: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Name */}
                <div style={{ fontWeight: "500", color: "white", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13.5px" }}>{task.name}</span>
                </div>

                {/* Status Selector */}
                <div onClick={(e) => e.stopPropagation()}>
                  <span 
                    style={{ background: task.status?.color ? `${task.status.color}20` : "#8E8E9320", color: task.status?.color || "#8E8E93", border: `1px solid ${task.status?.color || "#8E8E93"}40` }}
                    className="badge"
                  >
                    {task.status?.name || "TO DO"}
                  </span>
                </div>

                {/* Priority Selection badges */}
                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.priority}
                    onChange={(e) => handleUpdatePriority(task.id, e.target.value)}
                    style={{ background: "transparent", border: "none", color: "hsl(var(--text-secondary-hsl))", fontSize: "12.5px", outline: "none", cursor: "pointer" }}
                  >
                    <option value="NONE" style={{ background: "hsl(var(--card-hsl))" }}>None</option>
                    <option value="LOW" style={{ background: "hsl(var(--card-hsl))" }}>Low</option>
                    <option value="NORMAL" style={{ background: "hsl(var(--card-hsl))" }}>Normal</option>
                    <option value="HIGH" style={{ background: "hsl(var(--card-hsl))" }}>High</option>
                    <option value="URGENT" style={{ background: "hsl(var(--card-hsl))" }}>Urgent</option>
                  </select>
                </div>

                {/* Due Date Indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "hsl(var(--text-secondary-hsl))", fontSize: "13px" }}>
                  <Clock size={13} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}
                </div>

                {/* Actions Hub */}
                <div style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    style={{ background: "transparent", border: "none", color: "hsl(var(--error-hsl))", cursor: "pointer", padding: "4px", opacity: 0.7 }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Placeholder mapping so code runs nicely if Layers isn't loaded correctly
const Layers = Plus;
