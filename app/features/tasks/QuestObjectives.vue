<template>
  <div class="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
    <component
      :is="row.kind === 'itemGroup' ? TaskObjectiveItemGroup : TaskObjective"
      v-for="row in rows"
      :key="row.key"
      v-bind="
        row.kind === 'itemGroup'
          ? { title: row.title, iconName: row.iconName, objectives: row.objectives }
          : { objective: row.objective }
      "
      class="my-2"
    />
    <div
      v-if="irrelevantCount > 0"
      class="hover:text-primary-500 hover:bg-gray-50 dark:hover:bg-white/5 my-2 flex w-full cursor-pointer items-center gap-4 rounded-md px-2 py-2 transition-colors hover:underline"
      role="button"
      @click.stop="$emit('view-all-objectives')"
    >
      <UIcon name="i-mdi-eye-off" class="text-gray-400 h-5 w-5 shrink-0" />
      <i18n-t
        keypath="page.tasks.questcard.objectiveshidden"
        :plural="irrelevantCount"
        scope="global"
        class="text-sm text-gray-500 dark:text-gray-400"
      >
        <template #count>{{ irrelevantCount }}</template>
        <template #uncompleted>{{ uncompletedIrrelevant }}</template>
      </i18n-t>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import TaskObjective from '@/features/tasks/TaskObjective.vue';
  import TaskObjectiveItemGroup from '@/features/tasks/TaskObjectiveItemGroup.vue';
  import type { TaskObjective as TaskObjectiveType } from '@/types/tarkov';
  const props = defineProps<{
    objectives: TaskObjectiveType[];
    irrelevantCount: number;
    uncompletedIrrelevant: number;
  }>();
  const { t } = useI18n({ useScope: 'global' });
  type Row =
    | {
        kind: 'objective';
        key: string;
        objective: TaskObjectiveType;
      }
    | {
        kind: 'itemGroup';
        key: string;
        title: string;
        iconName: string;
        objectives: TaskObjectiveType[];
      };
  const rows = computed<Row[]>(() => {
    // Types that should be grouped together with item display
    const itemGroupTypes = new Set(['giveItem', 'findItem', 'findQuestItem', 'giveQuestItem']);
    const findTypes = new Set(['findItem', 'findQuestItem']);
    const giveTypes = new Set(['giveItem', 'giveQuestItem']);
    // Helper to get the item ID from an objective (handles item, markerItem, and questItem)
    const getItemId = (objective: TaskObjectiveType): string | undefined => {
      return (
        objective.item?.id ||
        objective.items?.[0]?.id ||
        objective.markerItem?.id ||
        objective.questItem?.id
      );
    };
    // Helper to get group title based on category
    const getGroupTitle = (
      category: 'both' | 'findOnly' | 'giveOnly',
      foundInRaid: boolean
    ): { title: string; iconName: string } => {
      if (category === 'both') {
        return {
          title: foundInRaid
            ? t('page.tasks.questcard.findAndHandOverFir', 'Find and Hand over found in raid')
            : t('page.tasks.questcard.findAndHandOver', 'Find and Hand over'),
          iconName: 'mdi-package-variant-closed',
        };
      }
      if (category === 'giveOnly') {
        return {
          title: foundInRaid
            ? t('page.tasks.questcard.handOverFir', 'Hand over found in raid')
            : t('page.tasks.questcard.handOver', 'Hand over'),
          iconName: 'mdi-package-variant-closed',
        };
      }
      // findOnly
      return {
        title: foundInRaid
          ? t('page.tasks.questcard.findFir', 'Find in raid')
          : t('page.tasks.questcard.find', 'Find'),
        iconName: 'mdi-magnify',
      };
    };
    // First pass: analyze each item to determine what objective types it has
    // Key: itemId:foundInRaid, Value: { types, objectives }
    const itemAnalysis = new Map<
      string,
      { types: Set<string>; objectives: TaskObjectiveType[]; foundInRaid: boolean }
    >();
    props.objectives.forEach((objective) => {
      const type = objective.type ?? '';
      if (!itemGroupTypes.has(type)) return;
      const itemId = getItemId(objective);
      if (!itemId) return;
      const foundInRaid = objective.foundInRaid === true;
      const key = `${itemId}:${foundInRaid ? 1 : 0}`;
      if (!itemAnalysis.has(key)) {
        itemAnalysis.set(key, {
          types: new Set(),
          objectives: [],
          foundInRaid,
        });
      }
      const analysis = itemAnalysis.get(key)!;
      analysis.types.add(type);
      analysis.objectives.push(objective);
    });
    // Second pass: categorize items and build groups
    // Key: category:foundInRaid, Value: { objectives, category, foundInRaid }
    type Category = 'both' | 'findOnly' | 'giveOnly';
    const categoryGroups = new Map<
      string,
      { objectives: TaskObjectiveType[]; category: Category; foundInRaid: boolean }
    >();
    const firstIndexByGroup = new Map<string, number>();
    // Track which objectives belong to which group
    const objectiveToGroup = new Map<string, string>();
    itemAnalysis.forEach((analysis, _itemKey) => {
      const hasFind = [...analysis.types].some((t) => findTypes.has(t));
      const hasGive = [...analysis.types].some((t) => giveTypes.has(t));
      let category: Category;
      if (hasFind && hasGive) {
        category = 'both';
      } else if (hasGive) {
        category = 'giveOnly';
      } else {
        category = 'findOnly';
      }
      const groupKey = `${category}:${analysis.foundInRaid ? 1 : 0}`;
      if (!categoryGroups.has(groupKey)) {
        categoryGroups.set(groupKey, {
          objectives: [],
          category,
          foundInRaid: analysis.foundInRaid,
        });
      }
      const group = categoryGroups.get(groupKey)!;
      analysis.objectives.forEach((obj) => {
        group.objectives.push(obj);
        objectiveToGroup.set(obj.id, groupKey);
      });
    });
    // Find first index for each group
    props.objectives.forEach((objective, index) => {
      const groupKey = objectiveToGroup.get(objective.id);
      if (groupKey && !firstIndexByGroup.has(groupKey)) {
        firstIndexByGroup.set(groupKey, index);
      }
    });
    // Third pass: build output, inserting groups at first occurrence
    const out: Row[] = [];
    const inserted = new Set<string>();
    props.objectives.forEach((objective, index) => {
      const groupKey = objectiveToGroup.get(objective.id);
      if (groupKey) {
        if (!inserted.has(groupKey) && firstIndexByGroup.get(groupKey) === index) {
          const group = categoryGroups.get(groupKey)!;
          const config = getGroupTitle(group.category, group.foundInRaid);
          out.push({
            kind: 'itemGroup',
            key: `group:${groupKey}`,
            title: config.title,
            iconName: config.iconName,
            objectives: group.objectives,
          });
          inserted.add(groupKey);
        }
        return;
      }
      out.push({
        kind: 'objective',
        key: objective.id,
        objective,
      });
    });
    return out;
  });
</script>
