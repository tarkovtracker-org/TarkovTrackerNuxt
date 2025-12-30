<template>
  <div
    class="quest-node absolute rounded-xl border p-4 shadow-lg transition-all duration-200 hover:-translate-y-0.5"
    :class="[statusClass, { 'quest-node-expanded': expanded }]"
    :style="nodeStyle"
  >
    <div
      class="flex items-center justify-between gap-2 text-2xs font-semibold uppercase tracking-wide text-white/70"
    >
      <span>{{ statusLabel }}</span>
      <span class="text-white/40">#{{ task.tarkovDataId || '—' }}</span>
    </div>
    <p class="mt-2 line-clamp-2 text-sm font-bold text-white">
      {{ task.name || t('page.tasks.questtree.unknown_name', 'Unknown task') }}
    </p>
    <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
      <span v-if="task.kappaRequired" class="tag tag-kappa">
        {{ t('page.tasks.questtree.kappa', 'Kappa') }}
      </span>
      <span v-if="task.lightkeeperRequired" class="tag tag-lightkeeper">
        {{ t('page.tasks.questtree.lightkeeper', 'Lightkeeper') }}
      </span>
    </div>
    <div class="mt-3 flex items-center justify-between text-[11px] text-white/60">
      <span class="truncate">
        {{ task.trader?.name || t('page.tasks.questtree.unknown_trader', 'Unknown trader') }}
      </span>
      <span v-if="task.minPlayerLevel" class="level-pill">
        {{ t('page.tasks.questtree.min_level', { level: task.minPlayerLevel }, `Min ${task.minPlayerLevel}`) }}
      </span>
    </div>
    <div class="mt-4 space-y-2">
      <div class="flex gap-2">
        <UButton
          size="xs"
          color="success"
          class="flex-1 font-semibold"
          :disabled="status === 'completed'"
          @click="$emit('finish', task.id)"
        >
          {{ t('page.tasks.questtree.finish', 'Finish') }}
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          class="flex-1 font-semibold text-white"
          :disabled="status === 'locked'"
          @click="$emit('cancel', task.id)"
        >
          {{ t('page.tasks.questtree.cancel', 'Cancel') }}
        </UButton>
      </div>
      <UButton
        size="xs"
        variant="soft"
        color="primary"
        class="w-full font-semibold"
        :aria-pressed="expanded"
        @click="toggleObjectives"
      >
        {{
          expanded
            ? t('page.tasks.questtree.collapse', 'Collapse')
            : t('page.tasks.questtree.expand', 'Expand')
        }}
      </UButton>
    </div>
    <Transition name="quest-details">
      <div
        v-if="expanded"
        class="quest-details mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
      >
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-white/60">
            {{ t('page.tasks.questtree.objectives', 'Objectives') }}
          </p>
          <ul class="mt-2 space-y-1 text-xs text-white/80">
            <li
              v-for="objective in objectiveSummaries"
              :key="objective.id"
              class="rounded border border-white/5 px-2 py-1 leading-snug"
            >
              <span class="font-semibold text-white">
                {{ objective.title }}
              </span>
              <span v-if="objective.meta" class="text-white/50">
                · {{ objective.meta }}
              </span>
            </li>
            <li v-if="objectiveSummaries.length === 0" class="text-white/50">
              {{ t('page.tasks.questtree.no_objectives', 'No objectives') }}
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
  import type { CSSProperties } from 'vue';
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import type { Task } from '@/types/tarkov';

  const props = defineProps<{
    task: Task;
    status: 'available' | 'locked' | 'completed';
    nodeStyle?: CSSProperties;
  }>();

  defineEmits(['finish', 'cancel']);

  const { t } = useI18n({ useScope: 'global' });

  const expanded = ref(false);

  const statusClass = computed(() => {
    if (props.status === 'completed') {
      return 'quest-node-completed';
    }
    if (props.status === 'available') {
      return 'quest-node-available';
    }
    return 'quest-node-locked';
  });

  const statusLabel = computed(() => {
    if (props.status === 'completed') return t('page.tasks.questtree.completed', 'Completed');
    if (props.status === 'available') return t('page.tasks.questtree.available', 'Available');
    return t('page.tasks.questtree.locked', 'Locked');
  });

  const toggleObjectives = () => {
    expanded.value = !expanded.value;
  };

  const objectiveSummaries = computed(() => {
    const objectives = props.task.objectives || [];
    if (!objectives.length) return [];
    return objectives.map((objective, index) => {
      const baseTitle =
        objective.description?.trim() ||
        objective.location?.name ||
        objective.type ||
        t('page.tasks.questtree.objective_unknown', 'Objective');
      const metaParts: string[] = [];
      if (objective.count) metaParts.push(`${objective.count}x`);
      if (objective.location?.name) metaParts.push(objective.location.name);
      if (objective.maps?.length) {
        metaParts.push(
          objective.maps
            ?.map((map) => map?.name)
            .filter((name): name is string => Boolean(name))
            .join(', ') || ''
        );
      }
      return {
        id: objective.id || `${props.task.id}-objective-${index}`,
        title: baseTitle,
        meta: metaParts.filter(Boolean).join(' • '),
      };
    });
  });
</script>
<style scoped>
.quest-node {
  min-height: 160px;
  width: 210px;
  backdrop-filter: blur(10px);
  overflow: visible;
  left: 0;
  top: 0;
}
.quest-node-expanded {
  width: 320px;
}
.quest-node-available {
  border-color: rgba(148, 163, 184, 0.4);
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.3), rgba(148, 163, 184, 0.05));
}
.quest-node-locked {
  border-color: rgba(248, 113, 113, 0.4);
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.3), rgba(248, 113, 113, 0.05));
}
.quest-node-completed {
  border-color: rgba(34, 197, 94, 0.55);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(34, 197, 94, 0.08));
}
.tag {
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
}
.tag-kappa {
  background: rgba(236, 72, 153, 0.2);
  color: #f472b6;
  border: 1px solid rgba(236, 72, 153, 0.4);
}
.tag-lightkeeper {
  background: rgba(6, 182, 212, 0.2);
  color: #67e8f9;
  border: 1px solid rgba(6, 182, 212, 0.4);
}
.level-pill {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.1rem 0.55rem;
  text-transform: uppercase;
}
.quest-details-enter-active,
.quest-details-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.quest-details-enter-from,
.quest-details-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
