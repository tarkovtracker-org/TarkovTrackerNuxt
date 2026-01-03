<template>
  <GenericCard icon="mdi-account-wrench" icon-color="white" highlight-color="secondary">
    <template #title>
      {{ $t('page.team.card.teamoptions.title') }}
    </template>
    <template #content>
      <div class="space-y-4 p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium">{{ $t(taskHideAllLabel) }}</div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input v-model="taskHideAll" type="checkbox" class="peer sr-only" />
            <div
              class="peer h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-red-600 peer-focus:ring-2 peer-focus:ring-red-300 peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
            ></div>
          </label>
        </div>
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium">{{ $t(itemsHideAllLabel) }}</div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input v-model="itemsHideAll" type="checkbox" class="peer sr-only" />
            <div
              class="peer h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-red-600 peer-focus:ring-2 peer-focus:ring-red-300 peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
            ></div>
          </label>
        </div>
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium" :class="{ 'opacity-50': itemsHideAll }">
            {{ $t(itemsHideNonFIRLabel) }}
          </div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input
              v-model="itemsHideNonFIR"
              type="checkbox"
              :disabled="itemsHideAll"
              class="peer sr-only"
            />
            <div
              class="peer h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-red-600 peer-focus:ring-2 peer-focus:ring-red-300 peer-focus:outline-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
            ></div>
          </label>
        </div>
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium" :class="{ 'opacity-50': itemsHideAll }">
            {{ $t(itemsHideHideoutLabel) }}
          </div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input
              v-model="itemsHideHideout"
              type="checkbox"
              :disabled="itemsHideAll"
              class="peer sr-only"
            />
            <div
              class="peer h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-red-600 peer-focus:ring-2 peer-focus:ring-red-300 peer-focus:outline-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
            ></div>
          </label>
        </div>
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium">{{ $t(mapHideAllLabel) }}</div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input v-model="mapHideAll" type="checkbox" class="peer sr-only" />
            <div
              class="peer h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-red-600 peer-focus:ring-2 peer-focus:ring-red-300 peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
            ></div>
          </label>
        </div>
      </div>
    </template>
  </GenericCard>
</template>
<script setup>
  import { computed } from 'vue';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import { usePreferencesStore } from '@/stores/usePreferences';
  const preferencesStore = usePreferencesStore();
  const taskHideAll = computed({
    get: () => preferencesStore.taskTeamAllHidden,
    set: (value) => preferencesStore.setQuestTeamHideAll(value),
  });
  const taskHideAllLabel = computed(() =>
    preferencesStore.taskTeamAllHidden
      ? 'page.team.card.teamoptions.task_hide_all'
      : 'page.team.card.teamoptions.task_show_all'
  );
  const itemsHideAll = computed({
    get: () => preferencesStore.itemsTeamAllHidden,
    set: (value) => preferencesStore.setItemsTeamHideAll(value),
  });
  const itemsHideAllLabel = computed(() =>
    preferencesStore.itemsTeamAllHidden
      ? 'page.team.card.teamoptions.items_hide_all'
      : 'page.team.card.teamoptions.items_show_all'
  );
  const itemsHideNonFIR = computed({
    get: () => preferencesStore.itemsTeamNonFIRHidden,
    set: (value) => preferencesStore.setItemsTeamHideNonFIR(value),
  });
  const itemsHideNonFIRLabel = computed(() =>
    preferencesStore.itemsTeamNonFIRHidden
      ? 'page.team.card.teamoptions.items_hide_non_fir'
      : 'page.team.card.teamoptions.items_show_non_fir'
  );
  const itemsHideHideout = computed({
    get: () => preferencesStore.itemsTeamHideoutHidden,
    set: (value) => preferencesStore.setItemsTeamHideHideout(value),
  });
  const itemsHideHideoutLabel = computed(() =>
    preferencesStore.itemsTeamHideoutHidden
      ? 'page.team.card.teamoptions.items_hide_hideout'
      : 'page.team.card.teamoptions.items_show_hideout'
  );
  const mapHideAll = computed({
    get: () => preferencesStore.mapTeamAllHidden,
    set: (value) => preferencesStore.setMapTeamHideAll(value),
  });
  const mapHideAllLabel = computed(() =>
    preferencesStore.mapTeamAllHidden
      ? 'page.team.card.teamoptions.map_hide_all'
      : 'page.team.card.teamoptions.map_show_all'
  );
</script>
