<template>
  <div>
    <template v-if="!xs">
      <div class="m-0 p-0">
        <div class="mb-2 flex text-lg">
          <div class="w-full">
            <task-link :task="task" />
          </div>
        </div>
        <InfoRow
          v-if="task.minPlayerLevel != 0"
          :tooltip="t('page.tasks.questcard.min_level_required')"
          icon="mdi-menu-right"
          class="text-sm text-gray-400"
        >
          <i18n-t keypath="page.tasks.questcard.level" scope="global">
            <template #count>{{ task.minPlayerLevel }}</template>
          </i18n-t>
        </InfoRow>
        <!-- Previous quests (locked before) -->
        <InfoRow
          v-if="preferencesStore.getShowPreviousQuests && task?.predecessors?.length"
          icon="mdi-lock-open-outline"
          class="mb-1 text-sm text-gray-400"
        >
          <i18n-t keypath="page.tasks.questcard.lockedbefore" scope="global">
            <template #count>{{ lockedBefore }}</template>
          </i18n-t>
        </InfoRow>
        <!-- Previous Task(s) links (immediate parents only) -->
        <div v-if="preferencesStore.getShowPreviousQuests && parentTasks.length" class="mb-1">
          <div class="flex items-start text-sm text-gray-400">
            <UIcon name="i-mdi-arrow-left" class="mt-0.5 mr-1 h-4 w-4 shrink-0" />
            <div>
              <span class="text-gray-500">
                {{ t('page.tasks.questcard.previoustasks', 'Previous Task(s):') }}
              </span>
              <div class="flex flex-col">
                <router-link
                  v-for="parent in parentTasks"
                  :key="parent.id"
                  :to="`/tasks?task=${parent.id}`"
                  class="text-accent-400 hover:text-accent-300"
                  @contextmenu="(e: MouseEvent) => handleTaskContextMenu(e, parent)"
                >
                  {{ parent.name }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
        <!-- Next quests (locked behind) -->
        <InfoRow
          v-if="preferencesStore.getShowNextQuests && task?.successors?.length"
          icon="mdi-lock"
          class="mb-1 text-sm text-gray-400"
        >
          <i18n-t keypath="page.tasks.questcard.lockedbehind" scope="global">
            <template #count>{{ lockedBehind }}</template>
          </i18n-t>
        </InfoRow>
        <!-- Next Quest(s) links (immediate children only) -->
        <div v-if="preferencesStore.getShowNextQuests && childTasks.length" class="mb-1">
          <div class="flex items-start text-sm text-gray-400">
            <UIcon name="i-mdi-arrow-right" class="mt-0.5 mr-1 h-4 w-4 shrink-0" />
            <div>
              <span class="text-gray-500">
                {{ t('page.tasks.questcard.nexttasks', 'Next Task(s):') }}
              </span>
              <div class="flex flex-col">
                <router-link
                  v-for="child in childTasks"
                  :key="child.id"
                  :to="`/tasks?task=${child.id}`"
                  class="text-accent-400 hover:text-accent-300"
                  @contextmenu="(e: MouseEvent) => handleTaskContextMenu(e, child)"
                >
                  {{ child.name }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
        <InfoRow v-if="task?.factionName != 'Any'" class="mb-1 text-sm text-gray-400">
          <template #icon>
            <img :src="factionImage" class="mx-1 h-6 w-6 invert dark:invert-0" />
          </template>
          {{ task.factionName }}
        </InfoRow>
        <!-- Required labels (Kappa, Lightkeeper) -->
        <div v-if="preferencesStore.getShowRequiredLabels" class="mb-1 flex flex-wrap gap-1">
          <GameBadge
            v-if="task.kappaRequired"
            variant="solid"
            color="gray"
            icon="i-mdi-trophy"
            badge-class="badge-soft-kappa"
            :label="t('page.tasks.questcard.kapparequired', 'KAPPA REQUIRED')"
          />
          <GameBadge
            v-if="task.lightkeeperRequired"
            variant="solid"
            color="gray"
            icon="i-mdi-lighthouse"
            badge-class="badge-soft-lightkeeper"
            :label="t('page.tasks.questcard.lightkeeperrequired', 'LIGHTKEEPER REQUIRED')"
          />
        </div>
        <!-- Not Required label (Non-Kappa) -->
        <div v-if="preferencesStore.getShowNotRequiredLabels && nonKappa" class="mb-1 flex">
          <div class="mr-1">
            <GameBadge variant="outline" color="error" :label="t('page.tasks.questcard.nonkappa')" />
          </div>
        </div>
        <InfoRow
          v-if="activeUserView === 'all' && neededBy.length > 0"
          icon="mdi-account-multiple-outline"
          class="mb-1 text-sm text-gray-400"
        >
          <i18n-t keypath="page.tasks.questcard.neededby" scope="global">
            <template #names>{{ neededBy.join(', ') }}</template>
          </i18n-t>
        </InfoRow>
        <!-- Task ID -->
        <div v-if="preferencesStore.getShowTaskIds" class="mt-2 text-xs text-content-secondary">
          ID: {{ task.id }}
        </div>
      </div>
    </template>
    <template v-else>
      <task-link :task="task" class="flex justify-center" />
    </template>
    <!-- Task Link Context Menu -->
    <ContextMenu ref="taskLinkContextMenu">
      <template #default="{ close }">
        <ContextMenuItem
          icon="i-mdi-open-in-new"
          label="View Task"
          @click="
            navigateToTask();
            close();
          "
        />
        <ContextMenuItem
          v-if="selectedTask?.wikiLink"
          icon="/img/logos/wikilogo.webp"
          label="View Task on Wiki"
          @click="
            openTaskWiki();
            close();
          "
        />
      </template>
    </ContextMenu>
  </div>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import ContextMenu from '@/components/ui/ContextMenu.vue';
  import ContextMenuItem from '@/components/ui/ContextMenuItem.vue';
  import GameBadge from '@/components/ui/GameBadge.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import type { Task } from '@/types/tarkov';
  import InfoRow from './InfoRow.vue';
  import TaskLink from './TaskLink.vue';
  const props = defineProps<{
    task: Task;
    xs: boolean;
    lockedBefore: number;
    lockedBehind: number;
    factionImage: string;
    nonKappa: boolean;
    neededBy: string[];
    activeUserView: string;
  }>();
  const { t } = useI18n({ useScope: 'global' });
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  // Get immediate parent task objects (direct previous quests) for display
  const parentTasks = computed(() => {
    if (!props.task?.parents?.length) return [];
    return props.task.parents
      .map((id) => metadataStore.tasks.find((t) => t.id === id))
      .filter((t): t is Task => t !== undefined);
  });
  // Get immediate child task objects (direct next quests) for display
  const childTasks = computed(() => {
    if (!props.task?.children?.length) return [];
    return props.task.children
      .map((id) => metadataStore.tasks.find((t) => t.id === id))
      .filter((t): t is Task => t !== undefined);
  });
  // Context menu state
  const router = useRouter();
  const taskLinkContextMenu = ref();
  const selectedTask = ref<Task | null>(null);
  const handleTaskContextMenu = (event: MouseEvent, task: Task) => {
    selectedTask.value = task;
    taskLinkContextMenu.value?.open(event);
  };
  const navigateToTask = () => {
    if (selectedTask.value) {
      router.push(`/tasks?task=${selectedTask.value.id}`);
    }
  };
  const openTaskWiki = () => {
    if (selectedTask.value?.wikiLink) {
      window.open(selectedTask.value.wikiLink, '_blank');
    }
  };
</script>
