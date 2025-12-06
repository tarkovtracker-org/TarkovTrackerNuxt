<template>
  <div class="container mx-auto min-h-[calc(100vh-250px)] max-w-7xl p-4">
    <!-- Hero Section with Main Progress -->
    <div
      class="from-primary-900/40 via-surface-900/90 to-surface-900 border-primary-700/30 relative mb-6 overflow-hidden rounded-2xl border bg-linear-to-br shadow-2xl"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-primary-500),0.1),transparent_50%)]"
      ></div>
      <div class="relative p-8">
        <div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-3">
          <!-- Main Progress Circle -->
          <div class="flex flex-col items-center justify-center">
            <div class="relative">
              <svg class="h-48 w-48 -rotate-90 transform">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  class="text-surface-800"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="progressOffset"
                  class="text-primary-500 transition-all duration-1000 ease-out"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="text-5xl font-bold text-white">{{ totalTasksPercentage }}%</div>
                <div class="text-surface-400 text-sm tracking-wider uppercase">
                  {{ $t('page.dashboard.hero.overall') }}
                </div>
              </div>
            </div>
          </div>
          <!-- Stats Overview -->
          <div class="space-y-6 lg:col-span-2">
            <div>
              <h1 class="mb-2 text-4xl font-bold text-white">
                {{ $t('page.dashboard.hero.welcome') }}
              </h1>
              <p class="text-surface-400 text-lg">
                {{ $t('page.dashboard.hero.subtitle') }}
              </p>
            </div>
            <!-- Quick Stats Grid -->
            <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div class="bg-surface-800/50 border-surface-700/50 rounded-xl border p-4">
                <div class="text-primary-400 text-3xl font-bold">
                  {{ dashboardStats.completedTasks }}
                </div>
                <div class="text-surface-400 mt-1 text-xs tracking-wide uppercase">
                  {{ $t('page.dashboard.hero.tasksComplete') }}
                </div>
              </div>
              <div class="bg-surface-800/50 border-surface-700/50 rounded-xl border p-4">
                <div class="text-success-400 text-3xl font-bold">
                  {{ dashboardStats.availableTasksCount }}
                </div>
                <div class="text-surface-400 mt-1 text-xs tracking-wide uppercase">
                  {{ $t('page.dashboard.hero.available') }}
                </div>
              </div>
              <div class="bg-surface-800/50 border-surface-700/50 rounded-xl border p-4">
                <div class="text-error-400 text-3xl font-bold">
                  {{ dashboardStats.failedTasksCount }}
                </div>
                <div class="text-surface-400 mt-1 text-xs tracking-wide uppercase">
                  {{ $t('page.dashboard.hero.failed') }}
                </div>
              </div>
              <div class="bg-surface-800/50 border-surface-700/50 rounded-xl border p-4">
                <div class="text-warning-400 text-3xl font-bold">
                  {{ currentLevel }}
                </div>
                <div class="text-surface-400 mt-1 text-xs tracking-wide uppercase">
                  {{ $t('page.dashboard.hero.level') }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Progress Breakdown Section -->
    <div class="mb-6">
      <h2 class="mb-4 flex items-center text-2xl font-bold text-white">
        <UIcon name="i-mdi-chart-line" class="text-primary-500 mr-2 h-6 w-6" />
        {{ $t('page.dashboard.progress.title') }}
      </h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <!-- Tasks Progress -->
        <div
          class="bg-surface-900 border-surface-700/30 hover:border-primary-700/50 cursor-pointer rounded-xl border p-6 shadow-lg transition-colors"
          @click="router.push('/tasks')"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center">
              <div
                class="bg-primary-600/15 mr-3 flex h-10 w-10 items-center justify-center rounded-lg"
              >
                <UIcon
                  name="i-mdi-checkbox-marked-circle-outline"
                  class="text-primary-400 h-5 w-5"
                />
              </div>
              <div>
                <div class="text-surface-400 text-sm tracking-wider uppercase">
                  {{ $t('page.dashboard.progress.tasks') }}
                </div>
                <div class="text-2xl font-bold text-white">
                  {{ dashboardStats.completedTasks }}/{{ dashboardStats.totalTasks }}
                </div>
              </div>
            </div>
            <div class="text-primary-400 text-3xl font-bold">{{ totalTasksPercentage }}%</div>
          </div>
          <div class="bg-surface-800 relative h-3 overflow-hidden rounded-full">
            <div
              class="from-primary-600 to-primary-400 absolute inset-y-0 left-0 rounded-full bg-linear-to-r transition-all duration-1000 ease-out"
              :style="{ width: `${totalTasksPercentage}%` }"
            ></div>
          </div>
        </div>
        <!-- Objectives Progress -->
        <div
          class="bg-surface-900 border-surface-700/30 hover:border-info-700/50 cursor-pointer rounded-xl border p-6 shadow-lg transition-colors"
          @click="router.push('/tasks')"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center">
              <div
                class="bg-info-600/15 mr-3 flex h-10 w-10 items-center justify-center rounded-lg"
              >
                <UIcon name="i-mdi-briefcase-search" class="text-info-400 h-5 w-5" />
              </div>
              <div>
                <div class="text-surface-400 text-sm tracking-wider uppercase">
                  {{ $t('page.dashboard.progress.objectives') }}
                </div>
                <div class="text-2xl font-bold text-white">
                  {{ dashboardStats.completedObjectives }}/{{ dashboardStats.totalObjectives }}
                </div>
              </div>
            </div>
            <div class="text-info-400 text-3xl font-bold">{{ totalObjectivesPercentage }}%</div>
          </div>
          <div class="bg-surface-800 relative h-3 overflow-hidden rounded-full">
            <div
              class="from-info-600 to-info-400 absolute inset-y-0 left-0 rounded-full bg-linear-to-r transition-all duration-1000 ease-out"
              :style="{ width: `${totalObjectivesPercentage}%` }"
            ></div>
          </div>
        </div>
        <!-- Task Items Progress -->
        <div
          class="bg-surface-900 border-surface-700/30 hover:border-success-700/50 cursor-pointer rounded-xl border p-6 shadow-lg transition-colors"
          @click="router.push('/neededitems')"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center">
              <div
                class="bg-success-600/15 mr-3 flex h-10 w-10 items-center justify-center rounded-lg"
              >
                <UIcon name="i-mdi-package-variant" class="text-success-400 h-5 w-5" />
              </div>
              <div>
                <div class="text-surface-400 text-sm tracking-wider uppercase">
                  {{ $t('page.dashboard.progress.items') }}
                </div>
                <div class="text-2xl font-bold text-white">
                  {{ dashboardStats.completedTaskItems }}/{{ dashboardStats.totalTaskItems }}
                </div>
              </div>
            </div>
            <div class="text-success-400 text-3xl font-bold">{{ totalTaskItemsPercentage }}%</div>
          </div>
          <div class="bg-surface-800 relative h-3 overflow-hidden rounded-full">
            <div
              class="from-success-600 to-success-400 absolute inset-y-0 left-0 rounded-full bg-linear-to-r transition-all duration-1000 ease-out"
              :style="{ width: `${totalTaskItemsPercentage}%` }"
            ></div>
          </div>
        </div>
        <!-- Kappa Progress -->
        <div
          class="bg-surface-900 border-surface-700/30 hover:border-warning-700/50 cursor-pointer rounded-xl border p-6 shadow-lg transition-colors"
          @click="router.push('/tasks')"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center">
              <div
                class="bg-warning-600/15 mr-3 flex h-10 w-10 items-center justify-center rounded-lg"
              >
                <UIcon name="i-mdi-trophy" class="text-warning-400 h-5 w-5" />
              </div>
              <div>
                <div class="text-surface-400 text-sm tracking-wider uppercase">
                  {{ $t('page.dashboard.progress.kappa') }}
                </div>
                <div class="text-2xl font-bold text-white">
                  {{ dashboardStats.completedKappaTasks }}/{{ dashboardStats.totalKappaTasks }}
                </div>
              </div>
            </div>
            <div class="text-warning-400 text-3xl font-bold">{{ totalKappaTasksPercentage }}%</div>
          </div>
          <div class="bg-surface-800 relative h-3 overflow-hidden rounded-full">
            <div
              class="from-warning-600 to-warning-400 absolute inset-y-0 left-0 rounded-full bg-linear-to-r transition-all duration-1000 ease-out"
              :style="{ width: `${totalKappaTasksPercentage}%` }"
            ></div>
          </div>
        </div>
        <!-- Lightkeeper Progress -->
        <div
          class="bg-surface-900 border-surface-700/30 cursor-pointer rounded-xl border p-6 shadow-lg transition-colors hover:border-purple-700/50"
          @click="router.push('/tasks')"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center">
              <div
                class="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/15"
              >
                <UIcon name="i-mdi-lighthouse" class="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div class="text-surface-400 text-sm tracking-wider uppercase">
                  {{ $t('page.dashboard.progress.lightkeeper') }}
                </div>
                <div class="text-2xl font-bold text-white">
                  {{ dashboardStats.completedLightkeeperTasks }}/{{
                    dashboardStats.totalLightkeeperTasks
                  }}
                </div>
              </div>
            </div>
            <div class="text-3xl font-bold text-purple-400">
              {{ totalLightkeeperTasksPercentage }}%
            </div>
          </div>
          <div class="bg-surface-800 relative h-3 overflow-hidden rounded-full">
            <div
              class="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-purple-600 to-purple-400 transition-all duration-1000 ease-out"
              :style="{ width: `${totalLightkeeperTasksPercentage}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
    <!-- Trader Progress Section -->
    <div class="mb-6">
      <h2 class="mb-4 flex items-center text-2xl font-bold text-white">
        <UIcon name="i-mdi-account-group" class="text-primary-500 mr-2 h-6 w-6" />
        {{ $t('page.dashboard.traders.title') }}
      </h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <div
          v-for="trader in traderStats"
          :key="trader.id"
          class="bg-surface-900 border-surface-700/30 hover:border-primary-700/30 cursor-pointer rounded-lg border p-3 shadow-sm transition-all hover:shadow-md"
          :title="`View ${trader.name}'s tasks`"
          @click="navigateToTraderTasks(trader.id)"
        >
          <div class="mb-2 flex items-center gap-3">
            <img
              v-if="trader.imageLink"
              :src="trader.imageLink"
              :alt="trader.name"
              class="bg-surface-800 border-surface-700 h-10 w-10 rounded-full border"
            />
            <div class="min-w-0 flex-1">
              <div class="truncate text-xs font-semibold text-white">
                {{ trader.name }}
              </div>
              <div class="text-surface-400 text-xs">
                {{ trader.completedTasks }}/{{ trader.totalTasks }}
              </div>
            </div>
          </div>
          <div class="bg-surface-800 relative h-1.5 overflow-hidden rounded-full">
            <div
              class="from-primary-600 to-primary-400 absolute inset-y-0 left-0 rounded-full bg-linear-to-r transition-all duration-700 ease-out"
              :style="{ width: `${trader.percentage}%` }"
            ></div>
          </div>
          <div class="text-primary-400 mt-1 text-right text-xs font-medium">
            {{ trader.percentage }}%
          </div>
        </div>
      </div>
    </div>
    <!-- Milestones Section -->
    <div>
      <h2 class="mb-4 flex items-center text-2xl font-bold text-white">
        <UIcon name="i-mdi-star-circle" class="text-primary-500 mr-2 h-6 w-6" />
        {{ $t('page.dashboard.milestones.title') }}
      </h2>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <!-- 25% Milestone -->
        <div
          :class="[
            'relative overflow-hidden rounded-xl border p-6 transition-all',
            parseFloat(totalTasksPercentage) >= 25
              ? 'from-primary-900/40 to-surface-900 border-primary-600/50 shadow-primary-900/20 bg-linear-to-br shadow-lg'
              : 'bg-surface-900/50 border-surface-700/30 opacity-50',
          ]"
        >
          <div class="relative z-10">
            <UIcon
              :name="
                parseFloat(totalTasksPercentage) >= 25
                  ? 'i-mdi-check-circle'
                  : 'i-mdi-circle-outline'
              "
              :class="[
                'mb-3 h-12 w-12',
                parseFloat(totalTasksPercentage) >= 25 ? 'text-primary-400' : 'text-surface-600',
              ]"
            />
            <div class="mb-1 text-3xl font-bold text-white">25%</div>
            <div class="text-surface-400 text-xs tracking-wider uppercase">
              {{ $t('page.dashboard.milestones.starter') }}
            </div>
          </div>
        </div>
        <!-- 50% Milestone -->
        <div
          :class="[
            'relative overflow-hidden rounded-xl border p-6 transition-all',
            parseFloat(totalTasksPercentage) >= 50
              ? 'from-info-900/40 to-surface-900 border-info-600/50 shadow-info-900/20 bg-linear-to-br shadow-lg'
              : 'bg-surface-900/50 border-surface-700/30 opacity-50',
          ]"
        >
          <div class="relative z-10">
            <UIcon
              :name="
                parseFloat(totalTasksPercentage) >= 50
                  ? 'i-mdi-check-circle'
                  : 'i-mdi-circle-outline'
              "
              :class="[
                'mb-3 h-12 w-12',
                parseFloat(totalTasksPercentage) >= 50 ? 'text-info-400' : 'text-surface-600',
              ]"
            />
            <div class="mb-1 text-3xl font-bold text-white">50%</div>
            <div class="text-surface-400 text-xs tracking-wider uppercase">
              {{ $t('page.dashboard.milestones.halfway') }}
            </div>
          </div>
        </div>
        <!-- 75% Milestone -->
        <div
          :class="[
            'relative overflow-hidden rounded-xl border p-6 transition-all',
            parseFloat(totalTasksPercentage) >= 75
              ? 'from-success-900/40 to-surface-900 border-success-600/50 shadow-success-900/20 bg-linear-to-br shadow-lg'
              : 'bg-surface-900/50 border-surface-700/30 opacity-50',
          ]"
        >
          <div class="relative z-10">
            <UIcon
              :name="
                parseFloat(totalTasksPercentage) >= 75
                  ? 'i-mdi-check-circle'
                  : 'i-mdi-circle-outline'
              "
              :class="[
                'mb-3 h-12 w-12',
                parseFloat(totalTasksPercentage) >= 75 ? 'text-success-400' : 'text-surface-600',
              ]"
            />
            <div class="mb-1 text-3xl font-bold text-white">75%</div>
            <div class="text-surface-400 text-xs tracking-wider uppercase">
              {{ $t('page.dashboard.milestones.veteran') }}
            </div>
          </div>
        </div>
        <!-- Kappa Milestone -->
        <div
          :class="[
            'relative overflow-hidden rounded-xl border p-6 transition-all',
            parseFloat(totalKappaTasksPercentage) >= 100
              ? 'from-warning-900/40 to-surface-900 border-warning-600/50 shadow-warning-900/20 bg-linear-to-br shadow-lg'
              : 'bg-surface-900/50 border-surface-700/30 opacity-50',
          ]"
        >
          <div class="relative z-10">
            <UIcon
              :name="
                parseFloat(totalKappaTasksPercentage) >= 100
                  ? 'i-mdi-trophy'
                  : 'i-mdi-trophy-outline'
              "
              :class="[
                'mb-3 h-12 w-12',
                parseFloat(totalKappaTasksPercentage) >= 100
                  ? 'text-warning-400'
                  : 'text-surface-600',
              ]"
            />
            <div class="mb-1 text-3xl font-bold text-white">
              {{ $t('page.dashboard.milestones.kappa.title') }}
            </div>
            <div class="text-surface-400 text-xs tracking-wider uppercase">
              {{ $t('page.dashboard.milestones.kappa.subtitle') }}
            </div>
          </div>
        </div>
        <!-- Lightkeeper Milestone -->
        <div
          :class="[
            'relative overflow-hidden rounded-xl border p-6 transition-all',
            parseFloat(totalLightkeeperTasksPercentage) >= 100
              ? 'to-surface-900 border-purple-600/50 bg-linear-to-br from-purple-900/40 shadow-lg shadow-purple-900/20'
              : 'bg-surface-900/50 border-surface-700/30 opacity-50',
          ]"
        >
          <div class="relative z-10">
            <UIcon
              :name="
                parseFloat(totalLightkeeperTasksPercentage) >= 100
                  ? 'i-mdi-lighthouse'
                  : 'i-mdi-lighthouse-on'
              "
              :class="[
                'mb-3 h-12 w-12',
                parseFloat(totalLightkeeperTasksPercentage) >= 100
                  ? 'text-purple-400'
                  : 'text-surface-600',
              ]"
            />
            <div class="mb-1 text-3xl font-bold text-white">
              {{ $t('page.dashboard.milestones.lightkeeper.title') }}
            </div>
            <div class="text-surface-400 text-xs tracking-wider uppercase">
              {{ $t('page.dashboard.milestones.lightkeeper.subtitle') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { useDashboardStats } from '@/composables/useDashboardStats';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  // Dashboard statistics composable
  const dashboardStats = useDashboardStats();
  const tarkovStore = useTarkovStore();
  const router = useRouter();
  const preferencesStore = usePreferencesStore();
  // Navigate to tasks page filtered by trader
  const navigateToTraderTasks = (traderId: string) => {
    preferencesStore.setTaskPrimaryView('traders');
    preferencesStore.setTaskTraderView(traderId);
    router.push('/tasks');
  };
  // Get current level
  const currentLevel = computed(() => {
    const currentMode = tarkovStore.currentGameMode;
    return tarkovStore[currentMode]?.level || 1;
  });
  // Unwrap trader stats for template usage
  const traderStats = computed(() => dashboardStats.traderStats.value || []);
  // Helper function to calculate percentage
  const calculatePercentage = (completed: number, total: number): string => {
    return total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
  };
  // Percentage calculations
  const totalTasksPercentage = computed(() =>
    calculatePercentage(dashboardStats.completedTasks.value, dashboardStats.totalTasks.value)
  );
  const totalObjectivesPercentage = computed(() =>
    calculatePercentage(
      dashboardStats.completedObjectives.value,
      dashboardStats.totalObjectives.value
    )
  );
  const totalTaskItemsPercentage = computed(() =>
    calculatePercentage(
      dashboardStats.completedTaskItems.value,
      dashboardStats.totalTaskItems.value
    )
  );
  const totalKappaTasksPercentage = computed(() =>
    calculatePercentage(
      dashboardStats.completedKappaTasks.value,
      dashboardStats.totalKappaTasks.value
    )
  );
  const totalLightkeeperTasksPercentage = computed(() =>
    calculatePercentage(
      dashboardStats.completedLightkeeperTasks.value,
      dashboardStats.totalLightkeeperTasks.value
    )
  );
  // Circle progress calculation
  const circumference = 2 * Math.PI * 88; // radius = 88
  const progressOffset = computed(() => {
    const progress = parseFloat(totalTasksPercentage.value) / 100;
    return circumference * (1 - progress);
  });
</script>
