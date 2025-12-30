<template>
  <div
    class="quest-node absolute flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center shadow-lg transition-transform duration-150 hover:-translate-y-0.5"
    :class="statusClass"
    :style="nodeStyle"
    role="button"
    @click="$emit('select', task.id)"
  >
    <div
      v-if="task.kappaRequired"
      class="quest-tag quest-tag-top"
    >
      {{ t('page.tasks.questtree.kappa', 'Kappa') }}
    </div>
    <div
      v-if="task.lightkeeperRequired"
      class="quest-tag quest-tag-bottom"
    >
      {{ t('page.tasks.questtree.lightkeeper', 'Lightkeeper') }}
    </div>
    <p class="line-clamp-2 text-xs font-semibold text-white">
      {{ task.name || t('page.tasks.questtree.unknown_name', 'Unknown task') }}
    </p>
  </div>
</template>
<script setup lang="ts">
  import type { CSSProperties } from 'vue';
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import type { Task } from '@/types/tarkov';

  const props = defineProps<{
    task: Task;
    status: 'available' | 'locked' | 'completed';
    nodeStyle?: CSSProperties;
  }>();

  defineEmits(['select']);

  const { t } = useI18n({ useScope: 'global' });

  const statusClass = computed(() => {
    if (props.status === 'completed') {
      return 'quest-node-completed';
    }
    if (props.status === 'available') {
      return 'quest-node-available';
    }
    return 'quest-node-locked';
  });

</script>
<style scoped>
.quest-node {
  min-height: 70px;
  width: 160px;
  backdrop-filter: blur(10px);
  overflow: visible;
  left: 0;
  top: 0;
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
.quest-tag {
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  text-align: center;
}
.quest-tag-top {
  top: 0;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}
.quest-tag-bottom {
  bottom: 0;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}
</style>
