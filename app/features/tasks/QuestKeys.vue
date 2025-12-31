<template>
  <div class="flex flex-col gap-2">
    <div class="text-xs font-medium text-content-secondary">
      {{ $t('page.tasks.questcard.keysHeader', 'Suggested Keys') }}
      <span class="font-normal text-gray-500">
        {{ $t('page.tasks.questcard.keysSubtext', '(may help but not always required)') }}
      </span>
    </div>
    <div
      v-for="(keyMap, keyMapIndex) in neededKeys"
      :key="keyMapIndex"
      class="group flex items-center"
    >
      <i18n-t keypath="page.tasks.questcard.keysneeded" :plural="keyMap.keys.length" scope="global">
        <template #keys>
          <span v-for="(key, keyIndex) in keyMap.keys" :key="keyIndex" class="inline-block" :class="{ 'ml-2': keyMap.keys.length > 1 && keyIndex === 0 }">
            <GameItem
              :item-id="key.id"
              :item-name="key.shortName"
              :dev-link="key.link"
              :wiki-link="key.wikiLink"
              :count="1"
              size="xs"
              class="mr-2"
              :show-actions="true"
            />
          </span>
        </template>
        <template #map>
          {{ keyMap.map.name }}
        </template>
      </i18n-t>
    </div>
  </div>
</template>
<script setup>
  defineProps({
    neededKeys: { type: Array, required: true },
  });
</script>
