import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type {
  DailyPlan,
  DailyPlanWithDetails,
  Target,
  TimeBlock,
  CreateTargetInput,
  UpdateTargetInput,
  UpdateDailyPlanInput,
  CreateTimeBlockInput,
  UpdateTimeBlockInput,
} from '@/lib/data/types';

export type {
  DailyPlan,
  DailyPlanWithDetails,
  Target,
  TimeBlock,
  CreateTargetInput,
  UpdateTargetInput,
  CreateTimeBlockInput,
  UpdateTimeBlockInput,
};

// ============= Daily Plan Hooks =============

export function useDailyPlanWithDetails(date: string) {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['daily-plan', date],
    queryFn: () => adapter.planning.getDailyPlanWithDetails(date),
    enabled: !!date,
  });
}

export function usePlansInRange(startDate: string, endDate: string) {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['plans-range', startDate, endDate],
    queryFn: () => adapter.planning.getPlansInRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function usePlansInMonth(date: Date) {
  const adapter = useDataAdapter();
  const startDate = format(date, 'yyyy-MM-01');
  const endDate = format(new Date(date.getFullYear(), date.getMonth() + 1, 0), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['plans-month', startDate, endDate],
    queryFn: () => adapter.planning.getPlansInRangeWithDetails(startDate, endDate),
    enabled: !!date,
  });
}

export function useUpdateDailyPlan() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateDailyPlanInput & { id: string }) =>
      adapter.planning.updateDailyPlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      queryClient.invalidateQueries({ queryKey: ['daily-plans-range'] });
    },
    onError: (error) => {
      toast.error('Failed to update daily plan: ' + error.message);
    },
  });
}

// ============= Target Hooks =============

export function useCreateTarget() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: (input: CreateTargetInput) => adapter.planning.createTarget(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
    },
    onError: (error) => {
      toast.error('Failed to create target: ' + error.message);
    },
  });
}

export function useUpdateTarget() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTargetInput & { id: string }) =>
      adapter.planning.updateTarget(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
    },
    onError: (error) => {
      toast.error('Failed to update target: ' + error.message);
    },
  });
}

export function useDeleteTarget() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: (id: string) => adapter.planning.deleteTarget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
    },
    onError: (error) => {
      toast.error('Failed to delete target: ' + error.message);
    },
  });
}

export function useReorderTargets() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: ({ dailyPlanId, orderedIds }: { dailyPlanId: string; orderedIds: string[] }) =>
      adapter.planning.reorderTargets(dailyPlanId, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
    },
    onError: (error) => {
      console.error('Reorder targets error:', error);
      toast.error('Failed to reorder targets: ' + (error?.message || 'Unknown error'));
    },
  });
}

// ============= Time Block Hooks =============

export function useCreateTimeBlock() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: (input: CreateTimeBlockInput) => adapter.planning.createTimeBlock(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
    },
    onError: (error) => {
      toast.error('Failed to create time block: ' + error.message);
    },
  });
}

export function useUpdateTimeBlock() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTimeBlockInput & { id: string }) =>
      adapter.planning.updateTimeBlock(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
    },
    onError: (error) => {
      toast.error('Failed to update time block: ' + error.message);
    },
  });
}

export function useDeleteTimeBlock() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: (id: string) => adapter.planning.deleteTimeBlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
    },
    onError: (error) => {
      toast.error('Failed to delete time block: ' + error.message);
    },
  });
}
