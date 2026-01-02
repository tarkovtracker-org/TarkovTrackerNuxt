<template>
  <GenericCard icon="mdi-database-import-outline" icon-color="white">
    <template #title>Data Migration</template>
    <template #content>
      <p class="mb-4">Migrate your progress data from the old TarkovTracker site.</p>
      <div class="mb-3 rounded-lg bg-gray-800 p-4">
        <MigrationSteps />
        <form @submit.prevent="migration.fetchWithApiToken">
          <UInput
            v-model="migration.apiToken.value"
            label="API Token from Old Site"
            placeholder="Paste your API token here..."
            :disabled="migration.fetchingApi?.value"
            :error="!!migration.apiError?.value"
            class="mb-4"
            :type="migration.showToken?.value ? 'text' : 'password'"
            :ui="{ icon: { trailing: { pointer: '' } } }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                icon="i-mdi-eye"
                :padded="false"
                @click="
                  migration.showToken && (migration.showToken.value = !migration.showToken.value)
                "
              />
            </template>
          </UInput>
          <div class="flex items-center justify-between">
            <div v-if="migration.fetchingApi?.value" class="flex items-center">
              <UIcon name="i-mdi-loading" class="text-primary mr-2 h-6 w-6 animate-spin" />
              <span>Fetching data...</span>
            </div>
            <UAlert
              v-else-if="migration.apiFetchSuccess?.value"
              color="green"
              variant="soft"
              class="mt-0 mr-4 mb-0 grow"
              title="Data ready to import"
            />
            <div v-else class="grow"></div>
            <UButton
              color="primary"
              :loading="migration.fetchingApi?.value"
              :disabled="!migration.apiToken?.value || migration.fetchingApi?.value"
              class="px-4"
              @click="migration.fetchWithApiToken"
            >
              Fetch Data
            </UButton>
          </div>
        </form>
      </div>
      <ImportConfirmDialog
        v-model:show="migration.confirmDialog.value"
        :data="migration.importedData.value"
        :completed-tasks="migration.countCompletedTasks.value"
        :failed-tasks="migration.countFailedTasks.value"
        :task-objectives="migration.countTaskObjectives.value"
        :hideout-modules="migration.countHideoutModules.value"
        :hideout-parts="migration.countHideoutParts.value"
        :importing="migration.importing.value"
        @confirm="migration.confirmImport"
        @show-objectives-details="migration.showObjectivesDetails.value = true"
        @show-failed-tasks-details="migration.showFailedTaskDetails.value = true"
      />
      <UModal v-model:open="migration.showObjectivesDetails.value">
        <template #header>
          <div class="text-xl font-medium">Task Objectives Information</div>
        </template>
        <template #body>
          <div class="space-y-3">
            <p>
              The count of {{ migration.countTaskObjectives.value }} task objectives represents all
              objective data in your import.
            </p>
            <p>
              The dashboard may show a different number because it only counts unique task
              objectives that are currently relevant to your progress.
            </p>
            <p>
              This difference is normal and doesn't indicate any problem with your data migration.
            </p>
          </div>
        </template>
        <template #footer="{ close }">
          <div class="flex justify-end">
            <UButton color="primary" variant="solid" @click="close">Close</UButton>
          </div>
        </template>
      </UModal>
      <UModal v-model:open="migration.showFailedTaskDetails.value">
        <template #header>
          <div class="text-xl font-medium">Failed Task Details</div>
        </template>
        <template #body>
          <div class="space-y-3">
            <p>
              These tasks are marked as "failed" in your data. This typically happens when you chose
              a different quest branch or when a task became unavailable.
            </p>
            <div class="mt-2 space-y-2">
              <div
                v-for="task in migration.failedTasks.value"
                :key="task.id"
                class="border-b border-gray-700 pb-2 last:border-0"
              >
                <div class="flex items-center">
                  <span>Task ID: {{ task.id }}</span>
                  <GameBadge variant="solid" color="error" size="xs" label="Failed" badge-class="ml-2" />
                </div>
                <div class="text-sm text-gray-400">
                  This task will remain marked as failed after migration.
                </div>
              </div>
            </div>
            <p>
              <strong>Note:</strong>
              This is normal for tasks that are mutually exclusive with other tasks you've
              completed.
            </p>
          </div>
        </template>
        <template #footer="{ close }">
          <div class="flex justify-end">
            <UButton color="primary" variant="solid" @click="close">Close</UButton>
          </div>
        </template>
      </UModal>
    </template>
  </GenericCard>
</template>
<script setup>
  import GenericCard from '@/components/ui/GenericCard.vue';
  import GameBadge from '@/components/ui/GameBadge.vue';
  import { useDataMigration } from '@/composables/useDataMigration';
  import ImportConfirmDialog from './ImportConfirmDialog.vue';
  import MigrationSteps from './MigrationSteps.vue';
  const migration = useDataMigration();
</script>
