<template>
  <div class="flex flex-col divide-y divide-white/5">
    <div v-for="row in rows" :key="row.key" class="py-2">
      <TaskObjectiveItemGroup
        v-if="row.kind === 'itemGroup'"
        :title="row.title"
        :icon-name="row.iconName"
        :objectives="row.objectives"
      />
      <TaskObjective v-else :objective="row.objective" />
    </div>
    <div v-if="irrelevantCount > 0" class="flex w-full items-center p-1 opacity-50">
      <UIcon name="i-mdi-eye-off" class="mr-1 h-4 w-4" />
      <i18n-t
        keypath="page.tasks.questcard.objectiveshidden"
        :plural="irrelevantCount"
        scope="global"
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
    const itemGroupTypes = new Set(['giveItem']);
    const groups = new Map<
      string,
      { objectives: TaskObjectiveType[]; title: string; iconName: string }
    >();
    const firstIndexByKey = new Map<string, number>();
    props.objectives.forEach((objective, index) => {
      const type = objective.type ?? '';
      if (!itemGroupTypes.has(type)) return;
      const foundInRaid = objective.foundInRaid === true;
      const key = `${type}:${foundInRaid ? 1 : 0}`;
      if (!groups.has(key)) {
        groups.set(key, {
          objectives: [],
          title: foundInRaid
            ? t('page.tasks.questcard.handOverFir', 'Hand over found in raid')
            : t('page.tasks.questcard.handOver', 'Hand over'),
          iconName: 'mdi-package-variant-closed',
        });
        firstIndexByKey.set(key, index);
      }
      groups.get(key)!.objectives.push(objective);
    });
    const out: Row[] = [];
    const inserted = new Set<string>();
    props.objectives.forEach((objective, index) => {
      const type = objective.type ?? '';
      const foundInRaid = objective.foundInRaid === true;
      const key = `${type}:${foundInRaid ? 1 : 0}`;
      if (itemGroupTypes.has(type)) {
        if (!inserted.has(key) && firstIndexByKey.get(key) === index) {
          const group = groups.get(key)!;
          out.push({
            kind: 'itemGroup',
            key: `group:${key}`,
            title: group.title,
            iconName: group.iconName,
            objectives: group.objectives,
          });
          inserted.add(key);
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
