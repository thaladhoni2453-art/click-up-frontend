import React, { useState, useEffect } from "react";
import { useUIStore } from "../../stores/uiStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { 
  Calendar as CalendarIcon, CheckSquare, Plus, Clock, 
  Trash, ArrowLeft, ArrowRight, Sparkles, AlertCircle, CalendarDays, Inbox,
  X, ShieldAlert, Award
} from "lucide-react";

export const PlannerView: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeListId, activeWorkspaceId } = useUIStore();
  
  // Selected list in Planner view (defaults to activeListId, 'all' stands for Show All)
  const [selectedListId, setSelectedListId] = useState<string | null>("all");
  const [availableLists, setAvailableLists] = useState<any[]>([]);
  
  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active side drawer task details state
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [drawerName, setDrawerName] = useState("");
  const [drawerDescription, setDrawerDescription] = useState("");
  const [drawerPriority, setDrawerPriority] = useState("NORMAL");
  const [drawerEnergy, setDrawerEnergy] = useState("Low");
  const [drawerHours, setDrawerHours] = useState("1");

  // Inline Quick Add state per Day (Mon-Sun: 0 to 6)
  const [activeAddDay, setActiveAddDay] = useState<number | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState("NORMAL");
  const [quickEnergy, setQuickEnergy] = useState("Low");
  const [quickHours, setQuickHours] = useState("1");

  // Drag over target tracker for column visual drops
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Current Week Start state (always a Monday Date object)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const current = new Date();
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Fetch all lists for the workspace to populate dropdown
  useEffect(() => {
    const fetchWorkspaceLists = async () => {
      if (!activeWorkspaceId) return;
      try {
        const { data } = await api.get(`/workspaces/${activeWorkspaceId}/hierarchy`);
        const allLists: any[] = [];
        data.forEach((space: any) => {
          if (space.lists) allLists.push(...space.lists);
          if (space.folders) {
            space.folders.forEach((f: any) => {
              if (f.lists) allLists.push(...f.lists);
            });
          }
        });

        // Auto-provision a default list if none exist
        if (allLists.length === 0 && data.length > 0) {
          const firstSpace = data[0];
          try {
            const newListRes = await api.post(`/workspaces/spaces/${firstSpace.id}/lists`, {
              name: "Planner Tasks"
            });
            const createdList = {
              id: newListRes.data.id,
              name: newListRes.data.name,
              spaceId: firstSpace.id
            };
            allLists.push(createdList);
          } catch (createErr) {
            console.error("Auto-provisioning list failed", createErr);
          }
        }

        setAvailableLists(allLists);
      } catch (e) {
        console.error("Failed to load planner lists", e);
      }
    };
    fetchWorkspaceLists();
  }, [activeWorkspaceId]);

  // Sync selectedListId with store if changed and not custom
  useEffect(() => {
    if (activeListId) {
      setSelectedListId(activeListId);
    }
  }, [activeListId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch Tasks for the selected list (or all workspace lists parallel)
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["planner-tasks", selectedListId, availableLists.map(l => l.id).join(",")],
    queryFn: async () => {
      if (!selectedListId) return [];
      
      if (selectedListId === "all") {
        if (availableLists.length === 0) return [];
        const promises = availableLists.map(async (l) => {
          try {
            const { data } = await api.get("/tasks", { params: { listId: l.id } });
            return data.map((t: any) => ({ ...t, listName: l.name, listId: l.id }));
          } catch (e) {
            return [];
          }
        });
        const results = await Promise.all(promises);
        return results.flat();
      } else {
        const { data } = await api.get("/tasks", { params: { listId: selectedListId } });
        const listName = availableLists.find(l => l.id === selectedListId)?.name || "Task";
        return data.map((t: any) => ({ ...t, listName, listId: selectedListId }));
      }
    },
    enabled: !!selectedListId && (selectedListId !== "all" || availableLists.length > 0)
  });

  // Helper metadata parser (energy tags serialization)
  const parseTaskMetadata = (desc: string | null) => {
    if (!desc) return { description: "", energyTag: "Low" };
    const tagMatch = desc.match(/__ENERGY_TAG__:\s*([A-Za-z]+)/);
    const energyTag = tagMatch ? tagMatch[1] : "Low";
    const cleanDescription = desc.replace(/__ENERGY_TAG__:\s*[A-Za-z]+/, "").trim();
    return { description: cleanDescription, energyTag };
  };

  const stringifyTaskMetadata = (cleanDesc: string, tag: string) => {
    return `${cleanDesc.trim()}\n\n__ENERGY_TAG__: ${tag}`;
  };

  // Date Navigation Helpers
  const getWeekDates = (start: Date) => {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(start);
      nextDay.setDate(start.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeekStart);
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(next);
  };

  // Filter tasks into scheduled week columns and unplanned backlog
  const scheduledTasksByDay = weekDates.map((date) => {
    return tasks.filter((t: any) => {
      if (!t.dueDate) return false;
      const tDate = new Date(t.dueDate);
      return tDate.getFullYear() === date.getFullYear() &&
             tDate.getMonth() === date.getMonth() &&
             tDate.getDate() === date.getDate();
    });
  });

  const backlogTasks = tasks.filter((t: any) => !t.dueDate);

  // Load Capacity Calculator
  const getDayTotalHours = (dayTasks: any[]) => {
    return dayTasks.reduce((sum, t) => {
      const { energyTag } = parseTaskMetadata(t.description);
      const hrs = t.timeEstimate || (energyTag === "Deep" ? 3 : energyTag === "Quick" ? 0.5 : 1);
      return sum + hrs;
    }, 0);
  };

  // Schedule/Unschedule Mutation triggers
  const handleScheduleTask = async (taskId: string, date: Date) => {
    try {
      const targetDate = new Date(date);
      targetDate.setHours(12, 0, 0, 0);

      await api.patch(`/tasks/${taskId}`, { dueDate: targetDate.toISOString() });
      queryClient.invalidateQueries({ queryKey: ["planner-tasks"] });
      
      // Update drawer sync if selected
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev: any) => ({ ...prev, dueDate: targetDate.toISOString() }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnscheduleTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}`, { dueDate: null });
      queryClient.invalidateQueries({ queryKey: ["planner-tasks"] });

      if (selectedTask?.id === taskId) {
        setSelectedTask((prev: any) => ({ ...prev, dueDate: null }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Click handler to open Task details Side Drawer
  const handleOpenDrawer = (task: any) => {
    const { description: cleanDesc, energyTag } = parseTaskMetadata(task.description);
    setSelectedTask(task);
    setDrawerName(task.name || "");
    setDrawerDescription(cleanDesc);
    setDrawerPriority(task.priority || "NORMAL");
    setDrawerEnergy(energyTag);
    setDrawerHours((task.timeEstimate || 1).toString());
  };

  const handleCloseDrawer = () => {
    setSelectedTask(null);
  };

  const handleDrawerSave = async (fields: any) => {
    if (!selectedTask) return;
    try {
      let finalDescription = drawerDescription;
      if (fields.description !== undefined || fields.energyTag !== undefined) {
        const desc = fields.description !== undefined ? fields.description : drawerDescription;
        const tag = fields.energyTag !== undefined ? fields.energyTag : drawerEnergy;
        finalDescription = stringifyTaskMetadata(desc, tag);
      }

      const patchData: any = {};
      if (fields.name !== undefined) patchData.name = fields.name;
      if (fields.priority !== undefined) patchData.priority = fields.priority;
      if (fields.description !== undefined || fields.energyTag !== undefined) {
        patchData.description = finalDescription;
      }
      if (fields.timeEstimate !== undefined) {
        patchData.timeEstimate = parseFloat(fields.timeEstimate) || 1;
      }

      await api.patch(`/tasks/${selectedTask.id}`, patchData);
      
      // Sync local updates
      setSelectedTask((prev: any) => ({ ...prev, ...patchData }));
      queryClient.invalidateQueries({ queryKey: ["planner-tasks"] });
    } catch (e) {
      console.error(e);
    }
  };

  // Inline Quick Add Trigger
  const handleCreateQuickTask = async (dayIdx: number) => {
    if (!quickTitle.trim() || !selectedListId) return;

    let listIdToUse = selectedListId === "all" ? availableLists[0]?.id : selectedListId;
    
    // Auto-provision a default list if none exist
    if (!listIdToUse) {
      if (!activeWorkspaceId) {
        triggerToast("Please select a workspace first!");
        return;
      }
      try {
        const { data } = await api.get(`/workspaces/${activeWorkspaceId}/hierarchy`);
        if (data && data.length > 0) {
          const firstSpace = data[0];
          triggerToast("Creating a default task list 'Planner Tasks'...");
          const newListRes = await api.post(`/workspaces/spaces/${firstSpace.id}/lists`, {
            name: "Planner Tasks"
          });
          const createdList = {
            id: newListRes.data.id,
            name: newListRes.data.name,
            spaceId: firstSpace.id
          };
          setAvailableLists([createdList]);
          listIdToUse = createdList.id;
        } else {
          // If absolutely no spaces exist, let's create a "General Space" first
          triggerToast("Creating workspace space...");
          const newSpaceRes = await api.post(`/workspaces/${activeWorkspaceId}/spaces`, {
            name: "General Space"
          });
          const newSpace = newSpaceRes.data;
          triggerToast("Creating task list 'Planner Tasks'...");
          const newListRes = await api.post(`/workspaces/spaces/${newSpace.id}/lists`, {
            name: "Planner Tasks"
          });
          const createdList = {
            id: newListRes.data.id,
            name: newListRes.data.name,
            spaceId: newSpace.id
          };
          setAvailableLists([createdList]);
          listIdToUse = createdList.id;
        }
      } catch (err) {
        console.error("On-the-fly list auto-provisioning failed", err);
        triggerToast("Failed to auto-create list. Please create one manually.");
        return;
      }
    }

    try {
      const targetDate = weekDates[dayIdx];
      targetDate.setHours(12, 0, 0, 0);

      const metadataDesc = stringifyTaskMetadata("", quickEnergy);
      const estHours = parseFloat(quickHours) || 1;

      await api.post("/tasks", {
        listId: listIdToUse,
        name: quickTitle.trim(),
        priority: quickPriority,
        dueDate: targetDate.toISOString(),
        description: metadataDesc,
        timeEstimate: estHours
      });

      queryClient.invalidateQueries({ queryKey: ["planner-tasks"] });

      // Reset
      setQuickTitle("");
      setQuickHours("1");
      setActiveAddDay(null);
      triggerToast("Task added to schedule!");
    } catch (e) {
      console.error(e);
      triggerToast("Failed to create task");
    }
  };

  // Toggle task completion status dynamically via REST API
  const handleToggleTaskComplete = async (task: any) => {
    const isCompleted = task.statusId === "done-status" || task.status?.name === "COMPLETE" || task.status?.name === "DONE";
    let targetStatusId = isCompleted ? "todo-status" : "done-status";

    try {
      // Fetch space statuses if possible, to find the "COMPLETE" or "DONE" status
      const { data: listData } = await api.get(`/workspaces/lists/${task.listId}`);
      const { data: spaceData } = await api.get(`/workspaces/spaces/${listData.spaceId}`);
      const doneStatus = spaceData?.statuses?.find((s: any) => s.name === "COMPLETE" || s.name === "DONE" || s.id.includes("done"));
      const todoStatus = spaceData?.statuses?.find((s: any) => s.name === "TO DO" || s.name === "TODO" || s.id.includes("todo"));
      
      if (isCompleted) {
        if (todoStatus) targetStatusId = todoStatus.id;
      } else {
        if (doneStatus) targetStatusId = doneStatus.id;
      }
    } catch (e) {
      console.warn("Failed to retrieve dynamic space statuses, falling back to mock IDs", e);
    }

    try {
      await api.patch(`/tasks/${task.id}`, { statusId: targetStatusId });
      queryClient.invalidateQueries({ queryKey: ["planner-tasks"] });
      triggerToast(isCompleted ? "Task moved back to To-Do" : "Task resolved & logged in Completed list!");
      
      // Dispatch immediate custom event to force dashboard update
      window.dispatchEvent(new CustomEvent("refetch-dashboard-stats"));
    } catch (err) {
      console.error("Failed to toggle task completion", err);
      triggerToast("Failed to update task status");
    }
  };

  // Colors mapping for color space/project dots
  const getSpaceColor = (listName?: string) => {
    if (!listName) return "hsl(var(--primary-hsl))";
    const sum = listName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "#7C3AED", "#06B6D4", "#EC4899", "#10B981", 
      "#F59E0B", "#3B82F6", "#F43F5E", "#8B5CF6"
    ];
    return colors[sum % colors.length];
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "URGENT": return "#f87171";
      case "HIGH": return "#fbbf24";
      case "NORMAL": return "#60a5fa";
      case "LOW": return "#9ca3af";
      default: return "#4b5563";
    }
  };

  // Smart Auto-Scheduler "Plan My Week"
  const handleSmartPlanWeek = async () => {
    if (backlogTasks.length === 0) {
      triggerToast("All backlog tasks are already scheduled!");
      return;
    }

    // Weights mappings
    const priorityWeights: any = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1, NONE: 0 };
    const energyWeights: any = { Deep: 3, Quick: 2, Low: 1 };

    // Sort backlog tasks: Priority weights first, then Energy weight
    const sortedTasks = [...backlogTasks].sort((a: any, b: any) => {
      const prioA = priorityWeights[a.priority] || 0;
      const prioB = priorityWeights[b.priority] || 0;
      if (prioA !== prioB) return prioB - prioA; // Highest priority first

      const energyA = energyWeights[parseTaskMetadata(a.description).energyTag] || 0;
      const energyB = energyWeights[parseTaskMetadata(b.description).energyTag] || 0;
      return energyB - energyA; // Deep first
    });

    // Track loads for Monday to Friday (index 0 to 4)
    const dayLoads = [0, 1, 2, 3, 4].map(idx => getDayTotalHours(scheduledTasksByDay[idx]));
    
    let scheduledCounter = 0;
    let overflowCounter = 0;

    const schedulingPromises = sortedTasks.map(async (task) => {
      const { energyTag } = parseTaskMetadata(task.description);
      const estHours = task.timeEstimate || (energyTag === "Deep" ? 3 : energyTag === "Quick" ? 0.5 : 1);

      // Distribute preferred days
      let preferredDays = [0, 1, 2, 3, 4];
      if (energyTag === "Deep") {
        preferredDays = [0, 1, 2, 3, 4]; // Mon, Tue, Wed...
      } else if (energyTag === "Low") {
        preferredDays = [3, 4, 2, 1, 0]; // Thu, Fri, Wed...
      } else {
        // Quick: prefer least loaded columns
        preferredDays = [0, 1, 2, 3, 4].sort((a, b) => dayLoads[a] - dayLoads[b]);
      }

      // Find first day with remaining room (Daily cap = 6h)
      const fittedDay = preferredDays.find(d => dayLoads[d] + estHours <= 6.0);
      
      if (fittedDay !== undefined) {
        dayLoads[fittedDay] += estHours;
        scheduledCounter++;
        const dateToSet = weekDates[fittedDay];
        dateToSet.setHours(12, 0, 0, 0);

        return api.patch(`/tasks/${task.id}`, { dueDate: dateToSet.toISOString() });
      } else {
        overflowCounter++;
        return null;
      }
    });

    await Promise.all(schedulingPromises.filter(p => p !== null));
    queryClient.invalidateQueries({ queryKey: ["planner-tasks"] });

    if (overflowCounter > 0) {
      triggerToast(`Successfully scheduled ${scheduledCounter} tasks. ${overflowCounter} could not fit due to capacity!`);
    } else {
      triggerToast(`Planned! ${scheduledCounter} backlog tasks scheduled across your work week!`);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", height: "100%", overflow: "hidden", position: "relative" }}>

      {/* 2. CENTER WEEKLY PLANNING COLUMNS GRID */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "rgba(0,0,0,0.05)" }}>
        
        {/* Planner Actions Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid hsl(var(--border-hsl))", display: "flex", justifyContent: "flex-start", alignItems: "center", background: "rgba(10, 11, 18, 0.4)", backdropFilter: "blur(8px)" }}>
          {/* Week Date Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button 
              onClick={handlePrevWeek} 
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid hsl(var(--border-hsl))", color: "white", width: "32px", height: "32px", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ArrowLeft size={14} />
            </button>
            
            <h2 style={{ fontSize: "14.5px", fontWeight: "700", color: "white", minWidth: "160px", textAlign: "center", letterSpacing: "-0.01em" }}>
              {weekDates[0].toLocaleDateString([], { month: "short", day: "numeric" })} — {weekDates[6].toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </h2>

            <button 
              onClick={handleNextWeek} 
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid hsl(var(--border-hsl))", color: "white", width: "32px", height: "32px", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Daily Columns viewport scroll */}
        <div 
          style={{ 
            flex: 1, 
            overflowX: "auto", 
            padding: "20px", 
            display: "grid", 
            gridTemplateColumns: "repeat(7, minmax(250px, 1fr))", 
            gap: "14px"
          }}
        >
          {dayNames.map((name, idx) => {
            const date = weekDates[idx];
            const tasksForDay = scheduledTasksByDay[idx] || [];
            const isToday = new Date().toDateString() === date.toDateString();
            
            // capacity loads
            const totalHours = getDayTotalHours(tasksForDay);
            const percentage = Math.min((totalHours / 6.0) * 100, 100);
            const loadColor = totalHours >= 6.0 ? "#ef4444" : totalHours >= 4.8 ? "#fbbf24" : "#10b981";

            const columnId = `day-${idx}`;

            return (
              <div 
                key={name}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverDay(columnId);
                }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverDay(null);
                  const taskId = e.dataTransfer.getData("text/plain");
                  handleScheduleTask(taskId, date);
                }}
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "10px", 
                  background: isToday ? "rgba(124, 106, 247, 0.04)" : "rgba(20, 22, 33, 0.3)", 
                  border: dragOverDay === columnId 
                    ? "2px dashed hsl(var(--primary-hsl))" 
                    : isToday 
                      ? "1px solid rgba(124, 106, 247, 0.3)" 
                      : "1px solid hsl(var(--border-hsl))",
                  boxShadow: dragOverDay === columnId ? "0 0 14px rgba(124, 106, 247, 0.2)" : "none",
                  borderRadius: "var(--radius-lg)",
                  padding: "12px",
                  overflowY: "auto",
                  minWidth: "250px",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Column Day details */}
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: isToday ? "hsl(var(--primary-light-hsl))" : "white" }}>
                      {name}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "hsl(var(--text-muted-hsl))", fontWeight: "600" }}>
                      {date.getDate()} {date.toLocaleDateString([], { month: "short" })}
                    </span>
                  </div>

                  {/* load level indicators */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                    <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginRight: "8px" }}>
                      <div style={{ width: `${percentage}%`, height: "100%", background: loadColor, transition: "width 0.3s ease" }} />
                    </div>
                    <span style={{ fontSize: "9.5px", color: "hsl(var(--text-muted-hsl))", fontWeight: "600" }}>
                      {totalHours.toFixed(1)}h/6h
                    </span>
                  </div>
                </div>

                {/* Day tasks card list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, justifyContent: tasksForDay.length === 0 ? "center" : "flex-start" }}>
                  {tasksForDay.length > 0 ? (
                    tasksForDay.map((t: any) => {
                      const { energyTag } = parseTaskMetadata(t.description);
                      const estimate = t.timeEstimate || (energyTag === "Deep" ? 3 : energyTag === "Quick" ? 0.5 : 1);
                      const isCompleted = t.statusId === "done-status" || t.status?.name === "COMPLETE" || t.status?.name === "DONE";

                      return (
                        <div 
                          key={t.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", t.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => handleOpenDrawer(t)}
                          className="animate-fade-in"
                          style={{
                            padding: "10px",
                            background: isCompleted ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.02)",
                            border: "1px solid hsl(var(--border-hsl))",
                            borderRadius: "var(--radius-sm)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            cursor: "grab",
                            transition: "var(--transition-smooth)",
                            opacity: isCompleted ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(124,106,247,0.3)"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = "hsl(var(--border-hsl))"}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: getSpaceColor(t.listName), marginTop: "5px", flexShrink: 0 }} />
                            <span 
                              style={{ 
                                fontSize: "12px", 
                                fontWeight: "600", 
                                color: isCompleted ? "hsl(var(--text-muted-hsl))" : "white", 
                                flex: 1, 
                                lineHeight: "1.3",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                whiteSpace: "normal",
                                textDecoration: isCompleted ? "line-through" : "none"
                              }}
                            >
                              {t.name}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <span style={{ fontSize: "9px", color: "white", background: getPriorityColor(t.priority), padding: "0.5px 4px", borderRadius: "3px", fontWeight: "700" }}>
                                {t.priority}
                              </span>
                              <span style={{ fontSize: "9px", color: "hsl(var(--text-secondary-hsl))", background: "rgba(255,255,255,0.04)", padding: "0.5px 4px", borderRadius: "3px" }}>
                                {estimate}h
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnscheduleTask(t.id);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "rgba(239,68,68,0.7)",
                                cursor: "pointer",
                                fontSize: "9px",
                                padding: "2px",
                                fontWeight: "600"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#f87171"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "rgba(239,68,68,0.7)"}
                              title="Move back to backlog"
                            >
                              Unplan
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Centered empty day state button/form */
                    activeAddDay === idx ? (
                      <div 
                        style={{ 
                          background: "rgba(20, 20, 30, 0.75)", 
                          border: "1.5px solid hsl(var(--primary-hsl))", 
                          borderRadius: "var(--radius-md)", 
                          padding: "14px", 
                          display: "flex", 
                          flexDirection: "column", 
                          gap: "12px",
                          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                          backdropFilter: "blur(10px)",
                          width: "100%",
                          alignSelf: "center",
                          boxSizing: "border-box"
                        }}
                      >
                        {/* Task name field */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Task Title</span>
                          <input 
                            type="text"
                            placeholder="What needs to be done?"
                            value={quickTitle}
                            onChange={(e) => setQuickTitle(e.target.value)}
                            className="input-field"
                            style={{ fontSize: "12px", height: "34px", padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateQuickTask(idx);
                              if (e.key === "Escape") setActiveAddDay(null);
                            }}
                            autoFocus
                          />
                        </div>

                        {/* Priority Selector */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Priority</span>
                          <select 
                            value={quickPriority}
                            onChange={(e) => setQuickPriority(e.target.value)}
                            style={{
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "6px",
                              color: "white",
                              fontSize: "12px",
                              padding: "6px 10px",
                              height: "34px",
                              width: "100%",
                              cursor: "pointer",
                              outline: "none"
                            }}
                          >
                            <option value="LOW" style={{ background: "#161622", color: "white" }}>Low Priority</option>
                            <option value="NORMAL" style={{ background: "#161622", color: "white" }}>Normal Priority</option>
                            <option value="HIGH" style={{ background: "#161622", color: "white" }}>High Priority</option>
                            <option value="URGENT" style={{ background: "#161622", color: "white" }}>Urgent Priority</option>
                          </select>
                        </div>

                        {/* Energy Selector */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Energy Required</span>
                          <select 
                            value={quickEnergy}
                            onChange={(e) => setQuickEnergy(e.target.value)}
                            style={{
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "6px",
                              color: "white",
                              fontSize: "12px",
                              padding: "6px 10px",
                              height: "34px",
                              width: "100%",
                              cursor: "pointer",
                              outline: "none"
                            }}
                          >
                            <option value="Low" style={{ background: "#161622", color: "white" }}>Low Energy ⚡</option>
                            <option value="Quick" style={{ background: "#161622", color: "white" }}>Quick Energy ⚡⚡</option>
                            <option value="Deep" style={{ background: "#161622", color: "white" }}>Deep Energy ⚡⚡⚡</option>
                          </select>
                        </div>

                        {/* Estimated Hours */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Est. Hours</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            <button 
                              type="button"
                              onClick={() => {
                                const val = parseFloat(quickHours) || 0;
                                if (val > 0) setQuickHours(String(Math.max(0, val - 0.5)));
                              }}
                              style={{
                                width: "32px",
                                height: "34px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "6px 0 0 6px",
                                color: "white",
                                fontSize: "15px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                outline: "none",
                                userSelect: "none"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                            >
                              -
                            </button>
                            <input 
                              type="text" 
                              value={quickHours} 
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*\.?\d*$/.test(val)) setQuickHours(val);
                              }}
                              className="input-field"
                              style={{ 
                                fontSize: "12px", 
                                height: "34px", 
                                width: "45px", 
                                textAlign: "center", 
                                padding: "6px 0", 
                                background: "rgba(0,0,0,0.35)", 
                                borderTop: "1px solid rgba(255,255,255,0.12)",
                                borderBottom: "1px solid rgba(255,255,255,0.12)",
                                borderLeft: "none",
                                borderRight: "none",
                                borderRadius: "0",
                                color: "white"
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const val = parseFloat(quickHours) || 0;
                                setQuickHours(String(val + 0.5));
                              }}
                              style={{
                                width: "32px",
                                height: "34px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "0 6px 6px 0",
                                color: "white",
                                fontSize: "15px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                outline: "none",
                                userSelect: "none"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                            >
                              +
                            </button>
                            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginLeft: "8px" }}>hours</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                          <button 
                            onClick={() => setActiveAddDay(null)} 
                            style={{ 
                              background: "rgba(255,255,255,0.05)", 
                              border: "none", 
                              color: "white", 
                              fontSize: "12px", 
                              padding: "8px 14px", 
                              borderRadius: "6px", 
                              cursor: "pointer",
                              fontWeight: "600",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleCreateQuickTask(idx)}
                            style={{ 
                              background: "hsl(var(--primary-hsl))", 
                              border: "none", 
                              color: "white", 
                              fontSize: "12px", 
                              padding: "8px 14px", 
                              borderRadius: "6px", 
                              cursor: "pointer", 
                              fontWeight: "600",
                              transition: "all 0.2s",
                              boxShadow: "0 4px 12px rgba(124, 106, 247, 0.3)"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "hsl(var(--primary-light-hsl))"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "hsl(var(--primary-hsl))"}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setActiveAddDay(idx);
                          setQuickTitle("");
                        }}
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px dashed rgba(255,255,255,0.12)",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "12px 16px",
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          alignSelf: "center",
                          width: "85%",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          transition: "all 0.2s ease-in-out"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "hsl(var(--primary-hsl))";
                          e.currentTarget.style.background = "rgba(124, 106, 247, 0.1)";
                          e.currentTarget.style.transform = "scale(1.03)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        <Plus size={14} style={{ color: "hsl(var(--primary-light-hsl))" }} />
                        <span>Add task</span>
                      </button>
                    )
                  )}
                </div>

                {/* Inline Quick Add form at bottom when tasks exist */}
                {tasksForDay.length > 0 && (
                  activeAddDay === idx ? (
                    <div 
                      style={{ 
                        background: "rgba(20, 20, 30, 0.75)", 
                        border: "1.5px solid hsl(var(--primary-hsl))", 
                        borderRadius: "var(--radius-md)", 
                        padding: "14px", 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "12px",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                        backdropFilter: "blur(10px)",
                        width: "100%",
                        alignSelf: "center",
                        boxSizing: "border-box",
                        marginTop: "8px"
                      }}
                    >
                      {/* Task name field */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Task Title</span>
                        <input 
                          type="text"
                          placeholder="What needs to be done?"
                          value={quickTitle}
                          onChange={(e) => setQuickTitle(e.target.value)}
                          className="input-field"
                          style={{ fontSize: "12px", height: "34px", padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateQuickTask(idx);
                            if (e.key === "Escape") setActiveAddDay(null);
                          }}
                          autoFocus
                        />
                      </div>

                      {/* Priority Selector */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Priority</span>
                        <select 
                          value={quickPriority}
                          onChange={(e) => setQuickPriority(e.target.value)}
                          style={{
                            background: "rgba(0,0,0,0.35)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "6px",
                            color: "white",
                            fontSize: "12px",
                            padding: "6px 10px",
                            height: "34px",
                            width: "100%",
                            cursor: "pointer",
                            outline: "none"
                          }}
                        >
                          <option value="LOW" style={{ background: "#161622", color: "white" }}>Low Priority</option>
                          <option value="NORMAL" style={{ background: "#161622", color: "white" }}>Normal Priority</option>
                          <option value="HIGH" style={{ background: "#161622", color: "white" }}>High Priority</option>
                          <option value="URGENT" style={{ background: "#161622", color: "white" }}>Urgent Priority</option>
                        </select>
                      </div>

                      {/* Energy Selector */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Energy Required</span>
                        <select 
                          value={quickEnergy}
                          onChange={(e) => setQuickEnergy(e.target.value)}
                          style={{
                            background: "rgba(0,0,0,0.35)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "6px",
                            color: "white",
                            fontSize: "12px",
                            padding: "6px 10px",
                            height: "34px",
                            width: "100%",
                            cursor: "pointer",
                            outline: "none"
                          }}
                        >
                          <option value="Low" style={{ background: "#161622", color: "white" }}>Low Energy ⚡</option>
                          <option value="Quick" style={{ background: "#161622", color: "white" }}>Quick Energy ⚡⚡</option>
                          <option value="Deep" style={{ background: "#161622", color: "white" }}>Deep Energy ⚡⚡⚡</option>
                        </select>
                      </div>

                      {/* Estimated Hours */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Est. Hours</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                          <button 
                            type="button"
                            onClick={() => {
                              const val = parseFloat(quickHours) || 0;
                              if (val > 0) setQuickHours(String(Math.max(0, val - 0.5)));
                            }}
                            style={{
                              width: "32px",
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "6px 0 0 6px",
                              color: "white",
                              fontSize: "15px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              outline: "none",
                              userSelect: "none"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                          >
                            -
                          </button>
                          <input 
                            type="text" 
                            value={quickHours} 
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^\d*\.?\d*$/.test(val)) setQuickHours(val);
                            }}
                            className="input-field"
                            style={{ 
                              fontSize: "12px", 
                              height: "34px", 
                              width: "45px", 
                              textAlign: "center", 
                              padding: "6px 0", 
                              background: "rgba(0,0,0,0.35)", 
                              borderTop: "1px solid rgba(255,255,255,0.12)",
                              borderBottom: "1px solid rgba(255,255,255,0.12)",
                              borderLeft: "none",
                              borderRight: "none",
                              borderRadius: "0",
                              color: "white"
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const val = parseFloat(quickHours) || 0;
                              setQuickHours(String(val + 0.5));
                            }}
                            style={{
                              width: "32px",
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "0 6px 6px 0",
                              color: "white",
                              fontSize: "15px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              outline: "none",
                              userSelect: "none"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                          >
                            +
                          </button>
                          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginLeft: "8px" }}>hours</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                        <button 
                          onClick={() => setActiveAddDay(null)} 
                          style={{ 
                            background: "rgba(255,255,255,0.05)", 
                            border: "none", 
                            color: "white", 
                            fontSize: "12px", 
                            padding: "8px 14px", 
                            borderRadius: "6px", 
                            cursor: "pointer",
                            fontWeight: "600",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleCreateQuickTask(idx)}
                          style={{ 
                            background: "hsl(var(--primary-hsl))", 
                            border: "none", 
                            color: "white", 
                            fontSize: "12px", 
                            padding: "8px 14px", 
                            borderRadius: "6px", 
                            cursor: "pointer", 
                            fontWeight: "600",
                            transition: "all 0.2s",
                            boxShadow: "0 4px 12px rgba(124, 106, 247, 0.3)"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "hsl(var(--primary-light-hsl))"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "hsl(var(--primary-hsl))"}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setActiveAddDay(idx);
                        setQuickTitle("");
                      }}
                      style={{
                        background: "rgba(255,255,255,0.01)",
                        border: "1px dashed rgba(255,255,255,0.06)",
                        color: "hsl(var(--text-secondary-hsl))",
                        fontSize: "11px",
                        padding: "6px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        marginTop: "6px",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(124, 106, 247, 0.3)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                        e.currentTarget.style.color = "hsl(var(--text-secondary-hsl))";
                      }}
                    >
                      <Plus size={12} />
                      <span>Add task</span>
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. RIGHT PANEL: WEEKLY ACHIEVEMENTS LOG */}
      <div style={{ borderLeft: "1px solid hsl(var(--border-hsl))", padding: "20px", background: "rgba(10, 11, 18, 0.4)", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>
        
        {/* Achievements header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Award size={18} style={{ color: "#10B981" }} />
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "white", margin: 0 }}>Completed This Week</h3>
        </div>

        {/* List of resolved/completed tasks this week */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {(() => {
            const endOfWeek = new Date(currentWeekStart);
            endOfWeek.setDate(currentWeekStart.getDate() + 7);

            const completedTasksThisWeek = tasks.filter((t: any) => {
              if (!t.dueDate) return false;
              const tDate = new Date(t.dueDate);
              const isCompleted = t.statusId === "done-status" || t.status?.name === "COMPLETE" || t.status?.name === "DONE";
              return isCompleted && tDate >= currentWeekStart && tDate < endOfWeek;
            });

            if (completedTasksThisWeek.length === 0) {
              return (
                <div style={{ 
                  fontSize: "11.5px", 
                  color: "hsl(var(--text-muted-hsl))", 
                  textAlign: "center", 
                  padding: "48px 16px", 
                  fontStyle: "italic",
                  background: "rgba(255,255,255,0.01)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed rgba(255,255,255,0.05)"
                }}>
                  No resolved tasks logged for this week yet. Completing day-to-day agenda items will populate your achievements log here!
                </div>
              );
            }

            return completedTasksThisWeek.map((t: any) => {
              const date = t.dueDate ? new Date(t.dueDate) : null;
              const dayStr = date ? date.toLocaleDateString([], { weekday: "short", day: "numeric" }) : "";
              return (
                <div 
                  key={t.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "12px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(16, 185, 129, 0.04)",
                    border: "1px solid rgba(16, 185, 129, 0.15)",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "black", fontSize: "9px", fontWeight: "bold", flexShrink: 0, marginTop: "2px" }}>✓</div>
                    <span style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", textDecoration: "line-through", wordBreak: "break-word", flex: 1 }}>
                      {t.name}
                    </span>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "6px", marginTop: "2px" }}>
                    <span style={{ fontSize: "10px", color: "hsl(var(--text-muted-hsl))" }}>
                      {t.listName || "Task"}
                    </span>
                    <span style={{ fontSize: "9.5px", background: "rgba(255,255,255,0.04)", color: "hsl(var(--text-secondary-hsl))", padding: "1px 6px", borderRadius: "3px" }}>
                      Resolved {dayStr}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* 4. TASK DETAILS RIGHT SLIDING SIDE DRAWER */}
      {selectedTask && (
        <div 
          style={{ 
            position: "absolute", 
            top: 0, 
            right: 0, 
            width: "360px", 
            height: "100%", 
            background: "#121420", 
            borderLeft: "1px solid hsl(var(--border-hsl))", 
            boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            animation: "slide-left 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>Task Details</span>
            <button 
              onClick={handleCloseDrawer}
              style={{ background: "transparent", border: "none", color: "hsl(var(--text-muted-hsl))", cursor: "pointer", display: "flex", alignItems: "center" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "white"}
              onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--text-muted-hsl))"}
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Content */}
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1 }}>
            
            {/* Title */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Task Title</label>
              <input
                type="text"
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                onBlur={() => handleDrawerSave({ name: drawerName })}
                className="input-field"
                style={{ fontSize: "13px", height: "36px", padding: "8px 12px", background: "rgba(0,0,0,0.2)" }}
              />
            </div>

            {/* Description */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Description</label>
              <textarea
                value={drawerDescription}
                onChange={(e) => setDrawerDescription(e.target.value)}
                onBlur={() => handleDrawerSave({ description: drawerDescription })}
                className="input-field"
                rows={4}
                style={{ fontSize: "12.5px", padding: "8px 12px", background: "rgba(0,0,0,0.2)", resize: "none", fontFamily: "inherit" }}
                placeholder="What is this task about?"
              />
            </div>

            {/* Project list indicators info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Workspace List</label>
              <span style={{ fontSize: "13px", color: "white", background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--border-hsl))" }}>
                {selectedTask.listName || "Unassigned Space"}
              </span>
            </div>

            {/* Priority Select (Premium pill chips) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Priority</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["NONE", "LOW", "NORMAL", "HIGH", "URGENT"].map((p) => {
                  const active = drawerPriority === p;
                  const color = p === "URGENT" ? "#f87171" : p === "HIGH" ? "#fbbf24" : p === "NORMAL" ? "#60a5fa" : p === "LOW" ? "#9ca3af" : "#4b5563";
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        setDrawerPriority(p);
                        handleDrawerSave({ priority: p });
                      }}
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        fontWeight: "700",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid",
                        borderColor: active ? color : "rgba(255,255,255,0.06)",
                        background: active ? `${color}20` : "rgba(255,255,255,0.02)",
                        color: active ? "white" : "hsl(var(--text-secondary-hsl))",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: active ? `0 0 10px ${color}30` : "none"
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Energy Level Select (Premium pill chips) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Energy Level Tag</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { tag: "Low", label: "⚡ Low Energy", subtitle: "Thu/Fri auto-scheduler focus" },
                  { tag: "Quick", label: "⚡ Quick Target", subtitle: "Least-loaded daily slot focus" },
                  { tag: "Deep", label: "⚡ Deep Focus", subtitle: "Mon/Tue/Wed auto-scheduler focus" }
                ].map((item) => {
                  const active = drawerEnergy === item.tag;
                  return (
                    <button
                      key={item.tag}
                      onClick={() => {
                        setDrawerEnergy(item.tag);
                        handleDrawerSave({ energyTag: item.tag });
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid",
                        borderColor: active ? "hsl(var(--primary-light-hsl))" : "rgba(255,255,255,0.06)",
                        background: active ? "rgba(124, 106, 247, 0.12)" : "rgba(255,255,255,0.02)",
                        color: "white",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                        boxShadow: active ? "0 0 12px rgba(124, 106, 247, 0.2)" : "none"
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: "700", color: active ? "hsl(var(--primary-light-hsl))" : "white" }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: "10.5px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>
                        {item.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time estimate Hours */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Estimated Hours</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  step="0.5"
                  value={drawerHours}
                  onChange={(e) => setDrawerHours(e.target.value)}
                  onBlur={() => handleDrawerSave({ timeEstimate: drawerHours })}
                  className="input-field"
                  style={{ fontSize: "12.5px", height: "36px", width: "80px", padding: "8px 12px", background: "rgba(0,0,0,0.2)" }}
                />
                <span style={{ fontSize: "13px", color: "hsl(var(--text-muted-hsl))" }}>hours estimate</span>
              </div>
            </div>

            {/* Footer with "Mark Completed" Action */}
            {(() => {
              const isCompleted = selectedTask.statusId === "done-status" || selectedTask.status?.name === "COMPLETE" || selectedTask.status?.name === "DONE";
              return (
                <div 
                  style={{ 
                    padding: "16px 0 0 0", 
                    borderTop: "1px solid rgba(255,255,255,0.06)", 
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginTop: "8px"
                  }}
                >
                  <button
                    onClick={async () => {
                      await handleToggleTaskComplete(selectedTask);
                      handleCloseDrawer();
                    }}
                    style={{
                      width: "100%",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: isCompleted ? "rgba(16, 185, 129, 0.12)" : "hsl(var(--success-hsl))",
                      border: isCompleted ? "1px solid rgba(16, 185, 129, 0.25)" : "none",
                      borderRadius: "6px",
                      color: isCompleted ? "#10B981" : "black",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: isCompleted ? "none" : "0 4px 14px rgba(16, 185, 129, 0.35)"
                    }}
                    onMouseEnter={(e) => {
                      if (!isCompleted) {
                        e.currentTarget.style.background = "#059669";
                        e.currentTarget.style.boxShadow = "0 6px 18px rgba(16, 185, 129, 0.45)";
                      } else {
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCompleted) {
                        e.currentTarget.style.background = "hsl(var(--success-hsl))";
                        e.currentTarget.style.boxShadow = "0 4px 14px rgba(16, 185, 129, 0.35)";
                      } else {
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.12)";
                      }
                    }}
                  >
                    {isCompleted ? (
                      <>
                        <span>Task Completed</span>
                        <span style={{ fontSize: "14px" }}>✓</span>
                      </>
                    ) : (
                      <>
                        <span>Mark Task as Completed</span>
                        <span style={{ fontSize: "14px" }}>✓</span>
                      </>
                    )}
                  </button>

                  {isCompleted && (
                    <button
                      onClick={async () => {
                        await handleToggleTaskComplete(selectedTask);
                        handleCloseDrawer();
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "hsl(var(--text-muted-hsl))",
                        fontSize: "11px",
                        cursor: "pointer",
                        textDecoration: "underline",
                        alignSelf: "center",
                        padding: "4px 0"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "white"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--text-muted-hsl))"}
                    >
                      Reopen Task
                    </button>
                  )}
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* 5. GORGEOUS FLOATING TOAST NOTIFICATION CARD */}
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

export default PlannerView;
