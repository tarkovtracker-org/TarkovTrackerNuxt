import { describe, expect, it } from 'vitest';
import type { Task, TaskObjective } from '@/types/tarkov';
import { computeInvalidProgress } from '@/utils/progressInvalidation';
describe('computeInvalidProgress', () => {
  it('treats empty requirement status as completion-required', () => {
    const objectiveA: TaskObjective = { id: 'A1' };
    const objectiveB: TaskObjective = { id: 'B1' };
    const tasks: Task[] = [
      {
        id: 'A',
        objectives: [objectiveA],
      } as Task,
      {
        id: 'B',
        objectives: [objectiveB],
        taskRequirements: [{ task: { id: 'A' }, status: [] }] as Task['taskRequirements'],
      } as Task,
    ];
    const result = computeInvalidProgress({
      tasks,
      taskCompletions: {
        A: { complete: true, failed: true },
      },
      pmcFaction: 'USEC',
    });
    expect(result.invalidTasks.B).toBe(true);
    expect(result.invalidObjectives.B1).toBe(true);
  });
});
