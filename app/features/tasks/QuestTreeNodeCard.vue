<template>
  <div class="quest-node absolute rounded-xl border p-3 shadow-lg transition hover:-translate-y-0.5" :class="statusClass">
    <div class="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
      <span>{{ statusLabel }}</span>
      <span class="text-white/50">#{{ task.tarkovDataId || '—' }}</span>
    </div>
    <p class="mt-2 line-clamp-2 text-sm font-bold text-white">
      {{ task.name || t('page.tasks.questtree.unknown_name') }}
    </p>
    <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
      <span v-if="task.kappaRequired" class="tag tag-kappa">{{ t('page.tasks.questtree.kappa') }}</span>
      <span v-if="task.lightkeeperRequired" class="tag tag-lightkeeper">
        {{ t('page.tasks.questtree.lightkeeper') }}
      </span>
    </div>
    <div class="mt-3 flex items-center justify-between text-[11px] text-white/60">
      <span class="truncate">
        {{ task.trader?.name || t('page.tasks.questtree.unknown_trader') }}
      </span>
      <span v-if="task.minPlayerLevel" class="level-pill">
        {{ t('page.tasks.questtree.min_level', { level: task.minPlayerLevel }) }}
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
          {{ t('page.tasks.questtree.finish') }}
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          class="flex-1 font-semibold text-white"
          :disabled="status === 'locked'"
          @click="$emit('cancel', task.id)"
        >
          {{ t('page.tasks.questtree.cancel') }}
        </UButton>
      </div>
      <UButton
        size="xs"
        variant="soft"
        color="primary"
        class="w-full font-semibold"
        @click="toggleObjectives"
      >
        {{ expanded ? t('page.tasks.questtree.collapse') : t('page.tasks.questtree.expand') }}
      </UButton>
    </div>
    <Transition name="quest-details">
      <div v-if="expanded" class="quest-objectives mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/60">
          {{ t('page.tasks.questtree.objectives') }}
        </p>
        <ul class="mt-2 space-y-1 text-xs text-white/80">
          <li
            v-for="objective in task.objectives || []"
            :key="objective.id"
            class="rounded border border-white/5 px-2 py-1"
          >
            <span class="font-semibold text-white">{{ objective.description || t('page.tasks.questtree.objective_unknown') }}</span>
            <span v-if="objective.count" class="text-white/60">
              - {{ objective.count }}x
            </span>
            <span v-if="objective.type" class="text-white/50">({{ objective.type }})</span>
          </li>
          <li v-if="!task.objectives || task.objectives.length === 0" class="text-white/50">
            {{ t('page.tasks.questtree.no_objectives') }}
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import type { Task } from '@/types/tarkov';

  const props = defineProps<{
    task: Task;
    status: 'available' | 'locked' | 'completed';
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
    if (props.status === 'completed') return t('page.tasks.questtree.completed');
    if (props.status === 'available') return t('page.tasks.questtree.available');
    return t('page.tasks.questtree.locked');
  });

  const toggleObjectives = () => {
    expanded.value = !expanded.value;
  };
</script>
<style scoped>
.quest-node {
  min-height: 150px;
  width: 220px;
  backdrop-filter: blur(10px);
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
