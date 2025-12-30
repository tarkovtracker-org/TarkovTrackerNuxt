<template>
  <div class="container mx-auto min-h-[calc(100vh-250px)] max-w-7xl p-4">
    <!-- Hero Section with Main Progress -->
    <div
      class="border-primary-800/60 relative mb-6 overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-transparent dark:from-primary-900/40 dark:via-surface-900/90 dark:to-surface-900 dark:bg-linear-to-br dark:border-primary-700/30"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-primary-500),0.1),transparent_50%)]"
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
                  class="text-primary-500 transition-all duration-1000 ease-out"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="text-3xl font-bold text-gray-900 dark:text-white md:text-5xl">
                  {{ totalTasksPercentage }}%
                </div>
                <div class="text-xs tracking-wider uppercase text-gray-600 dark:text-surface-400 md:text-sm">
                  {{ $t('page.dashboard.hero.overall') }}
                </div>
              </div>
            </div>
          </div>
          <!-- Stats Overview -->
          <div class="space-y-4 lg:col-span-2 lg:space-y-6">
            <div>
              <h1 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white md:text-4xl">
                {{ $t('page.dashboard.hero.welcome') }}
              </h1>
              <p class="text-sm text-gray-600 dark:text-surface-400 md:text-lg">
                {{ $t('page.dashboard.hero.subtitle') }}
              </p>
            </div>
            <!-- Quick Stats Grid -->
            <div class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <div class="rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-surface-700/50 dark:bg-surface-800/50 md:p-4">
                <div class="text-xl font-bold text-primary-600 dark:text-primary-400 md:text-3xl">
                  {{ dashboardStats.completedTasks.value }}
                </div>
                <div class="mt-1 text-[10px] tracking-wide uppercase text-gray-600 dark:text-surface-300 md:text-xs">
                  {{ $t('page.dashboard.hero.tasksComplete') }}
                </div>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-surface-700/50 dark:bg-surface-800/50 md:p-4">
                <div class="text-xl font-bold text-success-600 dark:text-success-400 md:text-3xl">
                  {{ dashboardStats.availableTasksCount.value }}
                </div>
                <div class="mt-1 text-[10px] tracking-wide uppercase text-gray-600 dark:text-surface-300 md:text-xs">
                  {{ $t('page.dashboard.hero.available') }}
                </div>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-surface-700/50 dark:bg-surface-800/50 md:p-4">
                <div class="text-xl font-bold text-error-600 dark:text-error-400 md:text-3xl">
                  {{ dashboardStats.failedTasksCount.value }}
                </div>
                <div class="mt-1 text-[10px] tracking-wide uppercase text-gray-600 dark:text-surface-300 md:text-xs">
                  {{ $t('page.dashboard.hero.failed') }}
                </div>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-surface-700/50 dark:bg-surface-800/50 md:p-4">
                <div class="text-xl font-bold text-warning-600 dark:text-warning-400 md:text-3xl">
                  {{ currentLevel }}
                </div>
                <div class="mt-1 text-[10px] tracking-wide uppercase text-gray-600 dark:text-surface-300 md:text-xs">
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
        <UIcon name="i-mdi-chart-line" class="mr-2 h-6 w-6 text-primary-600 dark:text-primary-500" />
        {{ $t('page.dashboard.progress.title') }}
      </h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardProgressCard
          icon="i-mdi-checkbox-marked-circle-outline"
          :label="$t('page.dashboard.progress.tasks')"
          :completed="dashboardStats.completedTasks.value"
          :total="dashboardStats.totalTasks.value"
          :percentage="totalTasksPercentageNum"
          color="primary"
          @click="router.push('/tasks')"
        />
        <DashboardProgressCard
          icon="i-mdi-briefcase-search"
          :label="$t('page.dashboard.progress.objectives')"
          :completed="dashboardStats.completedObjectives.value"
          :total="dashboardStats.totalObjectives.value"
          :percentage="totalObjectivesPercentageNum"
          color="info"
          @click="router.push('/tasks')"
        />
        <DashboardProgressCard
          icon="i-mdi-package-variant"
          :label="$t('page.dashboard.progress.items')"
          :completed="dashboardStats.completedTaskItems.value"
          :total="dashboardStats.totalTaskItems.value"
          :percentage="totalTaskItemsPercentageNum"
          color="success"
          @click="router.push('/neededitems')"
        />
        <DashboardProgressCard
          icon="i-mdi-trophy"
          :label="$t('page.dashboard.progress.kappa')"
          :completed="dashboardStats.completedKappaTasks.value"
          :total="dashboardStats.totalKappaTasks.value"
          :percentage="totalKappaTasksPercentageNum"
          color="warning"
          @click="router.push('/tasks')"
        />
        <DashboardProgressCard
          icon="i-mdi-lighthouse"
          :label="$t('page.dashboard.progress.lightkeeper')"
          :completed="dashboardStats.completedLightkeeperTasks.value"
          :total="dashboardStats.totalLightkeeperTasks.value"
          :percentage="totalLightkeeperTasksPercentageNum"
          color="purple"
          @click="router.push('/tasks')"
        />
      </div>
    </div>
    <!-- Trader Progress Section -->
    <div class="mb-6">
      <h2 class="mb-4 flex items-center text-2xl font-bold text-gray-900 dark:text-white">
        <UIcon name="i-mdi-account-group" class="mr-2 h-6 w-6 text-primary-600 dark:text-primary-500" />
        {{ $t('page.dashboard.traders.title') }}
      </h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <AppTooltip
          v-for="trader in traderStats"
          :key="trader.id"
          :text="$t('page.dashboard.traders.viewTasks', { name: trader.name })"
        >
          <div
            role="button"
            tabindex="0"
            class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all outline-none hover:border-primary-500/30 hover:shadow-md focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:border-primary-700/30 dark:bg-surface-800 dark:hover:border-primary-700/50"
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
                class="h-10 w-10 rounded-full border border-gray-200 bg-gray-100 dark:border-surface-700 dark:bg-surface-800"
              />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {{ trader.name }}
                </div>
                <div class="text-sm text-gray-500 dark:text-surface-300">
                  {{ trader.completedTasks }}/{{ trader.totalTasks }}
                </div>
              </div>
            </div>
            <div class="relative h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-surface-700">
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                :class="
                  holidayEffectsEnabled
                    ? 'candy-cane'
                    : 'from-primary-600 to-primary-400 bg-linear-to-r'
                "
                :style="{ width: `${trader.percentage}%` }"
              ></div>
            </div>
            <div class="mt-1 text-right text-sm font-medium text-primary-600 dark:text-primary-400">
              {{ trader.percentage }}%
            </div>
          </div>
        </AppTooltip>
      </div>
    </div>
    <!-- Milestones Section -->
    <div>
      <h2 class="mb-4 flex items-center text-2xl font-bold text-gray-900 dark:text-white">
        <UIcon name="i-mdi-star-circle" class="mr-2 h-6 w-6 text-primary-600 dark:text-primary-500" />
        {{ $t('page.dashboard.milestones.title') }}
      </h2>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <DashboardMilestoneCard
          title="25%"
          :subtitle="$t('page.dashboard.milestones.starter')"
          :is-achieved="totalTasksPercentageNum >= 25"
          achieved-icon="i-mdi-check-circle"
          unachieved-icon="i-mdi-circle-outline"
          color="primary"
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
          color="warning"
        />
        <DashboardMilestoneCard
          :title="$t('page.dashboard.milestones.lightkeeper.title')"
          :subtitle="$t('page.dashboard.milestones.lightkeeper.subtitle')"
          :is-achieved="totalLightkeeperTasksPercentageNum >= 100"
          achieved-icon="i-mdi-lighthouse"
          unachieved-icon="i-mdi-lighthouse-on"
          color="purple"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
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
  // Holiday effects
  const holidayEffectsEnabled = computed(() => preferencesStore.getEnableHolidayEffects);
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
