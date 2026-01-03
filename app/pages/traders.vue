<template>
  <div class="relative -mx-2 -mb-2 min-h-full">
    <div class="container mx-auto space-y-6 p-4">
      <div v-if="loading" class="flex justify-center p-12">
        <UIcon name="i-heroicons-arrow-path" class="text-primary-500 animate-spin text-4xl" />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <TraderCard
          v-for="trader in sortedTraders"
          :key="trader.id"
          :trader="trader"
          :level="tarkovStore.getTraderLevel(trader.id)"
          :reputation="tarkovStore.getTraderReputation(trader.id)"
          @update:level="(l) => updateLevel(trader.id, l)"
          @update:reputation="(r) => updateReputation(trader.id, r)"
        />
      </div>
    </div>
    <div
      class="fixed inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-primary-500/10 via-primary-500/5 to-primary-500/10 text-center backdrop-blur-[2px]"
    >
      <div
        class="rounded-lg bg-white/80 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-md dark:bg-black/55 dark:shadow-black/40"
      >
        <div class="text-2xl font-semibold text-gray-900 dark:text-white">Work in Progress</div>
        <div class="mt-1 text-sm text-gray-600 dark:text-slate-200">
          Traders is not ready yet. Check back soon.
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { storeToRefs } from 'pinia';
  import TraderCard from '@/features/traders/TraderCard.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { useTarkovStore } from '@/stores/useTarkov';
  // Page metadata
  useSeoMeta({
    title: 'Traders',
    description:
      'Track trader levels and unlock requirements. View available items and services from each trader.',
  });
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const { sortedTraders, loading } = storeToRefs(metadataStore);
  const updateLevel = (traderId: string, level: number) => {
    tarkovStore.setTraderLevel(traderId, level);
  };
  const updateReputation = (traderId: string, reputation: number) => {
    tarkovStore.setTraderReputation(traderId, reputation);
  };
</script>
