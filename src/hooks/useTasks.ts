import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export const taskKeys = {
  all: ["tasks"] as const,
  byList: (listId: string, filters: any = {}) => ["tasks", "list", listId, filters] as const,
  detail: (taskId: string) => ["tasks", "detail", taskId] as const,
  assignees: (taskId: string) => ["tasks", "assignees", taskId] as const,
  eligibleAssignees: (taskId: string) => ["tasks", "eligibleAssignees", taskId] as const,
};

export function useTasks(listId: string | null, filters: any = {}) {
  return useQuery({
    queryKey: taskKeys.byList(listId || "", filters),
    queryFn: async () => {
      if (!listId) return [];
      const { data } = await api.get("/tasks", { params: { listId, ...filters } });
      return data;
    },
    enabled: !!listId,
  });
}

export function useTaskDetails(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(taskId || ""),
    queryFn: async () => {
      if (!taskId) return null;
      const { data } = await api.get(`/tasks/${taskId}`);
      return data;
    },
    enabled: !!taskId,
  });
}

export function useTaskAssignees(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.assignees(taskId || ""),
    queryFn: async () => {
      if (!taskId) return [];
      const { data } = await api.get(`/tasks/${taskId}/assignees`);
      return data;
    },
    enabled: !!taskId,
  });
}

export function useEligibleAssignees(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.eligibleAssignees(taskId || ""),
    queryFn: async () => {
      if (!taskId) return [];
      const { data } = await api.get(`/tasks/${taskId}/eligible-assignees`);
      return data;
    },
    enabled: !!taskId,
  });
}

export function useTaskMutations() {
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: async (taskData: {
      listId: string;
      name: string;
      description?: string;
      priority?: string;
      dueDate?: string;
      assigneeIds?: string[];
      position?: number;
    }) => {
      const { data } = await api.post("/tasks", taskData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "list", variables.listId] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, updateData }: { taskId: string; updateData: any }) => {
      const { data } = await api.patch(`/tasks/${taskId}`, updateData);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ["tasks", "list", data.listId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async ({ taskId, listId }: { taskId: string; listId: string }) => {
      const { data } = await api.delete(`/tasks/${taskId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "list", variables.listId] });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { content });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
  });

  const logTime = useMutation({
    mutationFn: async ({
      taskId,
      startedAt,
      endedAt,
      description,
      billable,
    }: {
      taskId: string;
      startedAt: string;
      endedAt: string;
      description?: string;
      billable?: boolean;
    }) => {
      const { data } = await api.post(`/tasks/${taskId}/time-entries`, {
        startedAt,
        endedAt,
        description,
        billable,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
  });

  const toggleAssignee = useMutation({
    mutationFn: async ({ taskId, userId, isAssigned }: { taskId: string; userId: string; isAssigned: boolean }) => {
      if (isAssigned) {
        const { data } = await api.delete(`/tasks/${taskId}/assignees/${userId}`);
        return data;
      } else {
        const { data } = await api.post(`/tasks/${taskId}/assignees`, { userId });
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.assignees(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
    addComment,
    logTime,
    toggleAssignee,
  };
}
