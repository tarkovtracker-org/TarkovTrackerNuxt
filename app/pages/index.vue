<template>
  <div class="container mx-auto min-h-[calc(100vh-250px)] max-w-7xl p-4">
    <!-- Hero Section with Main Progress -->
    <div
      class="border-accent-800/60 dark:from-accent-900/40 dark:via-surface-900/90 dark:to-surface-900 dark:border-accent-700/30 relative mb-6 overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-transparent dark:bg-linear-to-br"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-accent-500),0.1),transparent_50%)]"
      ></div>
      <div class="relative p-4 sm:p-6 lg:p-8">
        <div class="grid grid-cols-1 items-center gap-6 lg:grid-cols-3 lg:gap-8">
          <!-- Main Progress Circle -->
          <div class="flex flex-col items-center justify-center">
            <div class="relative">
              <svg
                class="h-32 w-32 -rotate-90 transform md:h-48 md:w-48"
                viewBox="0 0 192 192"
                role="progressbar"
                :aria-valuenow="totalTasksPercentageNum"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Overall task completion: ${totalTasksPercentage}%`"
              >
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  class="text-surface-200 dark:text-surface-800"
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
                  class="text-accent-500 transition-all duration-1000 ease-out"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="text-3xl font-bold text-gray-900 md:text-5xl dark:text-white">
                  {{ totalTasksPercentage }}%
                </div>
                <div
                  class="dark:text-surface-400 text-xs tracking-wider text-gray-600 uppercase md:text-sm"
                >
                  {{ $t('page.dashboard.hero.overall') }}
                </div>
              </div>
            </div>
          </div>
          <!-- Stats Overview -->
          <div class="space-y-4 lg:col-span-2 lg:space-y-6">
            <div>
              <h1 class="mb-2 text-2xl font-bold text-gray-900 md:text-4xl dark:text-white">
                {{ $t('page.dashboard.hero.welcome') }}
              </h1>
              <p class="dark:text-surface-400 text-sm text-gray-600 md:text-lg">
                {{ $t('page.dashboard.hero.subtitle') }}
              </p>
            </div>
            <!-- Quick Stats Grid -->
            <div class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <div
                class="dark:border-surface-700/50 dark:bg-surface-800/50 rounded-xl border border-gray-200 bg-gray-100 p-3 md:p-4"
              >
                <div class="text-success-600 dark:text-success-400 text-xl font-bold md:text-3xl">
                  {{ dashboardStats.completedTasks.value }}
                </div>
                <div
                  class="dark:text-surface-300 mt-1 text-[10px] tracking-wide text-gray-600 uppercase md:text-xs"
                >
                  {{ $t('page.dashboard.hero.tasksComplete') }}
                </div>
              </div>
              <div
                class="dark:border-surface-700/50 dark:bg-surface-800/50 rounded-xl border border-gray-200 bg-gray-100 p-3 md:p-4"
              >
                <div class="text-accent-600 dark:text-accent-400 text-xl font-bold md:text-3xl">
                  {{ dashboardStats.availableTasksCount.value }}
                </div>
                <div
                  class="dark:text-surface-300 mt-1 text-[10px] tracking-wide text-gray-600 uppercase md:text-xs"
                >
                  {{ $t('page.dashboard.hero.available') }}
                </div>
              </div>
              <div
                class="dark:border-surface-700/50 dark:bg-surface-800/50 rounded-xl border border-gray-200 bg-gray-100 p-3 md:p-4"
              >
                <div class="text-error-600 dark:text-error-400 text-xl font-bold md:text-3xl">
                  {{ dashboardStats.failedTasksCount.value }}
                </div>
                <div
                  class="dark:text-surface-300 mt-1 text-[10px] tracking-wide text-gray-600 uppercase md:text-xs"
                >
                  {{ $t('page.dashboard.hero.failed') }}
                </div>
              </div>
              <div
                class="dark:border-surface-700/50 dark:bg-surface-800/50 rounded-xl border border-gray-200 bg-gray-100 p-3 md:p-4"
              >
                <div class="text-xl font-bold text-gray-900 md:text-3xl dark:text-white">
                  {{ currentLevel }}
                </div>
                <div
                  class="dark:text-surface-300 mt-1 text-[10px] tracking-wide text-gray-600 uppercase md:text-xs"
                >
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
      <h2 class="mb-4 flex items-center text-2xl font-bold text-gray-900 dark:text-white">
        <UIcon name="i-mdi-chart-line" class="text-accent-600 dark:text-accent-500 mr-2 h-6 w-6" />
        {{ $t('page.dashboard.progress.title') }}
      </h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardProgressCard
          icon="i-mdi-checkbox-marked-circle-outline"
          :label="$t('page.dashboard.progress.tasks')"
          :completed="dashboardStats.completedTasks.value"
          :total="dashboardStats.totalTasks.value"
          :percentage="totalTasksPercentageNum"
          color="accent"
          @click="router.push('/tasks')"
        />
        <DashboardProgressCard
          icon="i-mdi-briefcase-search"
          :label="$t('page.dashboard.progress.objectives')"
          :completed="dashboardStats.completedObjectives.value"
          :total="dashboardStats.totalObjectives.value"
          :percentage="totalObjectivesPercentageNum"
          color="success"
          @click="router.push('/tasks')"
        />
        <DashboardProgressCard
          icon="i-mdi-package-variant"
          :label="$t('page.dashboard.progress.items')"
          :completed="dashboardStats.completedTaskItems.value"
          :total="dashboardStats.totalTaskItems.value"
          :percentage="totalTaskItemsPercentageNum"
          color="item"
          @click="router.push('/neededitems')"
        />
        <DashboardProgressCard
          icon="i-mdi-trophy"
          :label="$t('page.dashboard.progress.kappa')"
          :completed="dashboardStats.completedKappaTasks.value"
          :total="dashboardStats.totalKappaTasks.value"
          :percentage="totalKappaTasksPercentageNum"
          color="kappa"
          @click="router.push('/tasks')"
        />
        <DashboardProgressCard
          icon="i-mdi-lighthouse"
          :label="$t('page.dashboard.progress.lightkeeper')"
          :completed="dashboardStats.completedLightkeeperTasks.value"
          :total="dashboardStats.totalLightkeeperTasks.value"
          :percentage="totalLightkeeperTasksPercentageNum"
          color="lightkeeper"
          @click="router.push('/tasks')"
        />
      </div>
    </div>
    <!-- Trader Progress Section -->
    <div class="mb-6">
      <h2 class="mb-4 flex items-center text-2xl font-bold text-gray-900 dark:text-white">
        <UIcon
          name="i-mdi-account-group"
          class="text-accent-600 dark:text-accent-500 mr-2 h-6 w-6"
        />
        {{ $t('page.dashboard.traders.title') }}
      </h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <div
          v-for="trader in traderStats"
          :key="trader.id"
          v-tooltip="$t('page.dashboard.traders.viewTasks', { name: trader.name })"
          role="button"
          tabindex="0"
          class="hover-effect dark:border-accent-700/30 dark:bg-surface-800 cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all"
          :aria-label="$t('page.dashboard.traders.viewTasks', { name: trader.name })"
          @click="navigateToTraderTasks(trader.id)"
          @keydown.enter="navigateToTraderTasks(trader.id)"
          @keydown.space.prevent="navigateToTraderTasks(trader.id)"
        >
          <div class="mb-2 flex items-center gap-3">
            <img
              v-if="trader.imageLink"
              :src="trader.imageLink"
              :alt="trader.name"
              class="dark:border-surface-700 dark:bg-surface-800 h-10 w-10 rounded-full border border-gray-200 bg-gray-100"
            />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {{ trader.name }}
              </div>
              <div class="dark:text-surface-300 text-sm text-gray-500">
                {{ trader.completedTasks }}/{{ trader.totalTasks }}
              </div>
            </div>
          </div>
          <div class="dark:bg-surface-700 relative h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              :class="
                holidayEffectsEnabled
                  ? 'candy-cane'
                  : 'from-accent-600 to-accent-400 bg-linear-to-r'
              "
              :style="{ width: `${trader.percentage}%` }"
            ></div>
          </div>
          <div class="text-accent-600 dark:text-accent-400 mt-1 text-right text-sm font-medium">
            {{ trader.percentage }}%
          </div>
        </div>
      </div>
    </div>
    <!-- Milestones Section -->
    <div>
      <h2 class="mb-4 flex items-center text-2xl font-bold text-gray-900 dark:text-white">
        <UIcon name="i-mdi-star-circle" class="text-accent-600 dark:text-accent-500 mr-2 h-6 w-6" />
        {{ $t('page.dashboard.milestones.title') }}
      </h2>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <DashboardMilestoneCard
          title="25%"
          :subtitle="$t('page.dashboard.milestones.starter')"
          :is-achieved="totalTasksPercentageNum >= 25"
          achieved-icon="i-mdi-check-circle"
          unachieved-icon="i-mdi-circle-outline"
          color="accent"
        />
        <DashboardMilestoneCard
          title="50%"
          :subtitle="$t('page.dashboard.milestones.halfway')"
          :is-achieved="totalTasksPercentageNum >= 50"
          achieved-icon="i-mdi-check-circle"
          unachieved-icon="i-mdi-circle-outline"
          color="info"
        />
        <DashboardMilestoneCard
          title="75%"
          :subtitle="$t('page.dashboard.milestones.veteran')"
          :is-achieved="totalTasksPercentageNum >= 75"
          achieved-icon="i-mdi-check-circle"
          unachieved-icon="i-mdi-circle-outline"
          color="success"
        />
        <DashboardMilestoneCard
          :title="$t('page.dashboard.milestones.kappa.title')"
          :subtitle="$t('page.dashboard.milestones.kappa.subtitle')"
          :is-achieved="totalKappaTasksPercentageNum >= 100"
          achieved-icon="i-mdi-trophy"
          unachieved-icon="i-mdi-trophy-outline"
          color="kappa"
        />
        <DashboardMilestoneCard
          :title="$t('page.dashboard.milestones.lightkeeper.title')"
          :subtitle="$t('page.dashboard.milestones.lightkeeper.subtitle')"
          :is-achieved="totalLightkeeperTasksPercentageNum >= 100"
          achieved-icon="i-mdi-lighthouse"
          unachieved-icon="i-mdi-lighthouse-on"
          color="lightkeeper"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { useXpCalculation } from '@/composables/useXpCalculation';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { calculatePercentage, calculatePercentageNum } from '@/utils/formatters';
  // Page metadata
  useSeoMeta({
    title: 'Dashboard',
    description:
      'Your Escape from Tarkov progress dashboard. View overall stats, recent completions, and quick access to tasks, hideout, and needed items.',
  });
  // Dashboard statistics composable
  const dashboardStats = useDashboardStats();
  const tarkovStore = useTarkovStore();
  const router = useRouter();
  const preferencesStore = usePreferencesStore();
  const xpCalculation = useXpCalculation();
  // Holiday effects
  const holidayEffectsEnabled = computed(() => preferencesStore.getEnableHolidayEffects);
  // Navigate to tasks page filtered by trader
  const navigateToTraderTasks = (traderId: string) => {
    // Reset "sticky" filters in the store to ensure a clean view from the dashboard
    preferencesStore.setTaskSearch('');
    preferencesStore.setTaskId(null);
    // Set the specific view and trader
    preferencesStore.setTaskPrimaryView('traders');
    preferencesStore.setTaskTraderView(traderId);
    // Navigate directly to the desired state.
    // usePageFilters will use defaults for omitted parameters.
    router.push({
      path: '/tasks',
      query: {
        view: 'traders',
        trader: traderId,
      },
    });
  };
  // Get current level - respect automatic calculation setting
  const useAutomaticLevel = computed(() => preferencesStore.getUseAutomaticLevelCalculation);
  const currentLevel = computed(() => {
    return useAutomaticLevel.value ? xpCalculation.derivedLevel.value : tarkovStore.playerLevel();
  });
  // Unwrap trader stats for template usage
  const traderStats = computed(() => dashboardStats.traderStats.value || []);
  // Percentage calculations (numeric)
  const totalTasksPercentageNum = computed(() =>
    calculatePercentageNum(dashboardStats.completedTasks.value, dashboardStats.totalTasks.value)
  );
  const totalObjectivesPercentageNum = computed(() =>
    calculatePercentageNum(
      dashboardStats.completedObjectives.value,
      dashboardStats.totalObjectives.value
    )
  );
  const totalTaskItemsPercentageNum = computed(() =>
    calculatePercentageNum(
      dashboardStats.completedTaskItems.value,
      dashboardStats.totalTaskItems.value
    )
  );
  const totalKappaTasksPercentageNum = computed(() =>
    calculatePercentageNum(
      dashboardStats.completedKappaTasks.value,
      dashboardStats.totalKappaTasks.value
    )
  );
  const totalLightkeeperTasksPercentageNum = computed(() =>
    calculatePercentageNum(
      dashboardStats.completedLightkeeperTasks.value,
      dashboardStats.totalLightkeeperTasks.value
    )
  );
  // Percentage calculations (formatted strings for display)
  const totalTasksPercentage = computed(() =>
    calculatePercentage(dashboardStats.completedTasks.value, dashboardStats.totalTasks.value)
  );
  // Circle progress calculation
  const circumference = 2 * Math.PI * 88; // radius = 88
  const progressOffset = computed(() => {
    const progress = totalTasksPercentageNum.value / 100;
    return circumference * (1 - progress);
  });
</script>
