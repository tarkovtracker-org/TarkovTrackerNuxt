/**
 * Skill Calculation Composable
 *
 * Provides reactive skill level calculations based on:
 * 1. Completed task rewards (skillLevelReward from finishRewards)
 * 2. User manual offsets for passive in-game skill gains
 *
 * Mirrors the pattern established in useXpCalculation.ts
 *
 * @module composables/useSkillCalculation
 */
import { computed } from 'vue';
import { useMetadataStore } from '@/stores/useMetadata';
import { useTarkovStore } from '@/stores/useTarkov';
import type { Skill, SkillRequirement, TaskObjective } from '@/types/tarkov';
import { logger } from '@/utils/logger';
/**
 * Extended TaskObjective with GraphQL __typename discriminator
 */
interface TaskObjectiveWithTypename extends TaskObjective {
  __typename?: string;
}
/**
 * TaskObjectiveSkill - objective type that requires a skill level
 */
interface TaskObjectiveSkill extends TaskObjectiveWithTypename {
  __typename: 'TaskObjectiveSkill';
  skillLevel?: SkillRequirement & {
    skill?: Skill;
  };
}
/**
 * Type guard to check if an objective is a TaskObjectiveSkill
 */
function isTaskObjectiveSkill(
  objective: TaskObjectiveWithTypename
): objective is TaskObjectiveSkill {
  return objective.__typename === 'TaskObjectiveSkill';
}
export interface SkillMetadata {
  name: string;
  requiredByTasks: string[];
  requiredLevels: number[];
  rewardedByTasks: string[];
  imageLink?: string;
}
export function useSkillCalculation() {
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const isTaskSuccessful = (taskId: string) =>
    tarkovStore.isTaskComplete(taskId) && !tarkovStore.isTaskFailed(taskId);
  // Computed: Skills from completed quest rewards
  const calculatedQuestSkills = computed(() => {
    const skills: { [skillName: string]: number } = {};
    metadataStore.tasks
      .filter((task) => isTaskSuccessful(task.id))
      .forEach((task) => {
        const skillRewards = task.finishRewards?.skillLevelReward || [];
        skillRewards.forEach((reward) => {
          // Skip null/undefined rewards (sparse array data from API)
          if (!reward?.name) return;
          const skillName = reward.name;
          const level = reward.level || 0;
          // Accumulate skill levels from all completed tasks
          skills[skillName] = (skills[skillName] || 0) + level;
        });
      });
    return skills;
  });
  // Computed: Total skills (calculated + offsets)
  const totalSkills = computed(() => {
    const result: { [skillName: string]: number } = {};
    const offsets = tarkovStore.getAllSkillOffsets();
    // Start with quest-derived skills
    Object.entries(calculatedQuestSkills.value).forEach(([skillName, level]) => {
      result[skillName] = level;
    });
    // Add or update with manual offsets
    Object.entries(offsets).forEach(([skillName, offset]) => {
      result[skillName] = (result[skillName] || 0) + offset;
    });
    return result;
  });
  // Helper: Get total skill level for a specific skill
  const getSkillLevel = (skillName: string): number => {
    return totalSkills.value[skillName] || 0;
  };
  // Helper: Get quest-derived level for a specific skill
  const getQuestSkillLevel = (skillName: string): number => {
    return calculatedQuestSkills.value[skillName] || 0;
  };
  // Helper: Get offset for a specific skill
  const getSkillOffset = (skillName: string): number => {
    return tarkovStore.getSkillOffset(skillName);
  };
  // Action: Set skill offset
  const setSkillOffset = (skillName: string, offset: number) => {
    tarkovStore.setSkillOffset(skillName, offset);
  };
  // Action: Set total skill level (calculates and stores offset)
  // This mirrors the XP pattern - user enters their actual game value
  const setTotalSkillLevel = (skillName: string, totalLevel: number) => {
    // Validation: Ensure totalLevel is a finite number and >= 0
    if (typeof totalLevel !== 'number' || !Number.isFinite(totalLevel) || totalLevel < 0) {
      logger.warn(
        `[useSkillCalculation] Invalid totalLevel "${totalLevel}" for skill "${skillName}"`
      );
      return;
    }
    // Coerce to integer as skill levels in Tarkov are whole numbers (0-51)
    const validatedLevel = Math.floor(totalLevel);
    const questLevel = calculatedQuestSkills.value[skillName] || 0;
    const offset = validatedLevel - questLevel;
    tarkovStore.setSkillOffset(skillName, offset);
  };
  // Action: Reset skill offset to 0
  const resetSkillOffset = (skillName: string) => {
    tarkovStore.resetSkillOffset(skillName);
  };
  // Computed: ALL skills from game data (requirements + rewards)
  const allGameSkills = computed<SkillMetadata[]>(() => {
    const skillsMap = new Map<string, SkillMetadata>();
    metadataStore.tasks.forEach((task) => {
      const taskName = task.name;
      if (!taskName) return;
      // Extract skills from task objectives (requirements)
      task.objectives?.forEach((objective) => {
        const objectiveWithType = objective as TaskObjectiveWithTypename;
        if (isTaskObjectiveSkill(objectiveWithType) && objectiveWithType.skillLevel?.name) {
          const skillName = objectiveWithType.skillLevel.name;
          const requiredLevel = objectiveWithType.skillLevel.level || 0;
          const imageLink = objectiveWithType.skillLevel?.skill?.imageLink;
          if (!skillsMap.has(skillName)) {
            skillsMap.set(skillName, {
              name: skillName,
              requiredByTasks: [],
              requiredLevels: [],
              rewardedByTasks: [],
              imageLink,
            });
          } else if (imageLink && !skillsMap.get(skillName)!.imageLink) {
            // Update imageLink if we didn't have it before
            skillsMap.get(skillName)!.imageLink = imageLink;
          }
          skillsMap.get(skillName)!.requiredByTasks.push(taskName);
          // Track unique required levels
          if (
            requiredLevel > 0 &&
            !skillsMap.get(skillName)!.requiredLevels.includes(requiredLevel)
          ) {
            skillsMap.get(skillName)!.requiredLevels.push(requiredLevel);
          }
        }
      });
      // Extract skills from finish rewards
      task.finishRewards?.skillLevelReward?.forEach((reward) => {
        // Skip null/undefined rewards (sparse array data from API)
        if (reward?.name) {
          const skillName = reward.name;
          const imageLink = reward.skill?.imageLink;
          if (!skillsMap.has(skillName)) {
            skillsMap.set(skillName, {
              name: skillName,
              requiredByTasks: [],
              requiredLevels: [],
              rewardedByTasks: [],
              imageLink,
            });
          } else if (imageLink && !skillsMap.get(skillName)!.imageLink) {
            // Update imageLink if we didn't have it before
            skillsMap.get(skillName)!.imageLink = imageLink;
          }
          skillsMap.get(skillName)!.rewardedByTasks.push(taskName);
        }
      });
    });
    // Sort required levels for each skill
    skillsMap.forEach((skill) => {
      skill.requiredLevels.sort((a, b) => a - b);
    });
    // Sort: required skills first, then alphabetically within each group
    return Array.from(skillsMap.values()).sort((a, b) => {
      const aRequired = a.requiredByTasks.length > 0;
      const bRequired = b.requiredByTasks.length > 0;
      if (aRequired !== bRequired) return bRequired ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  });
  // Computed: List of all known skills (from game data + manual offsets)
  const allSkillNames = computed(() => {
    const names = new Set<string>();
    // Add all skills from game data
    allGameSkills.value.forEach((skill) => names.add(skill.name));
    // Add skills that have manual offsets (in case user tracks skills not in game data)
    Object.keys(tarkovStore.getAllSkillOffsets()).forEach((name) => names.add(name));
    return Array.from(names).sort();
  });
  // Helper: Get skill metadata (requirements and rewards)
  const getSkillMetadata = (skillName: string) => {
    return allGameSkills.value.find((skill) => skill.name === skillName) || null;
  };
  return {
    // Computed values
    calculatedQuestSkills,
    totalSkills,
    allSkillNames,
    allGameSkills,
    // Helper functions
    getSkillLevel,
    getQuestSkillLevel,
    getSkillOffset,
    getSkillMetadata,
    // Actions
    setSkillOffset,
    setTotalSkillLevel,
    resetSkillOffset,
  };
}
