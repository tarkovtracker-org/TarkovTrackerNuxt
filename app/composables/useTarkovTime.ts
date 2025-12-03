import { useNow } from '@vueuse/core';
import { computed } from 'vue';
const ONE_HOUR = 60 * 60 * 1000;
const TARKOV_RATE = 7;
const MOSCOW_OFFSET = 3 * ONE_HOUR;
const SECONDARY_OFFSET = 12;
const pad = (value: number) => value.toString().padStart(2, '0');
export function useTarkovTime(intervalMs = 3000) {
  const now = useNow({ interval: intervalMs });
  const tarkovTime = computed(() => {
    const tarkovMs = (now.value.getTime() * TARKOV_RATE + MOSCOW_OFFSET) % (24 * ONE_HOUR);
    const tarkovDate = new Date(tarkovMs);
    const hour = tarkovDate.getUTCHours();
    const minute = tarkovDate.getUTCMinutes();
    const secondaryHour = (hour + SECONDARY_OFFSET) % 24;
    return `${pad(hour)}:${pad(minute)} / ${pad(secondaryHour)}:${pad(minute)}`;
  });
  return { tarkovTime };
}
