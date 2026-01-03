<template>
  <div class="pointer-events-none fixed inset-0 z-100 overflow-hidden" aria-hidden="true">
    <div
      v-for="i in snowflakeCount"
      :key="i"
      class="snowflake absolute text-white/80"
      :style="getSnowflakeStyle(i)"
    >
      <span class="snowflake-inner" :style="getInnerStyle(i)">
        {{ getSnowflakeChar(i) }}
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
  const snowflakeCount = 50;
  const snowflakeChars = ['*', '\u2744', '\u2745', '\u2746', '\u00B7'];
  // Seeded random for consistent snowflake positions
  function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  }
  const getSnowflakeChar = (index: number): string => {
    return snowflakeChars[index % snowflakeChars.length] ?? '*';
  };
  const getSnowflakeStyle = (index: number) => {
    const left = seededRandom(index * 1.1) * 100;
    const animationDelay = seededRandom(index * 2.2) * 10;
    const animationDuration = 10 + seededRandom(index * 3.3) * 20;
    const fontSize = 10 + seededRandom(index * 4.4) * 20;
    const opacity = 0.4 + seededRandom(index * 5.5) * 0.6;
    return {
      left: `${left}%`,
      animationDelay: `${animationDelay}s`,
      animationDuration: `${animationDuration}s`,
      fontSize: `${fontSize}px`,
      opacity,
      top: '-5%',
    };
  };
  const getInnerStyle = (index: number) => {
    const swayDuration = 3 + seededRandom(index * 6.6) * 4;
    return {
      animationDuration: `${swayDuration}s`,
    };
  };
</script>
<style scoped>
  .snowflake {
    animation: snowfall linear infinite;
    will-change: transform;
  }
  .snowflake-inner {
    display: inline-block;
    animation: sway ease-in-out infinite;
  }
  @keyframes snowfall {
    0% {
      transform: translateY(0) rotate(0deg);
    }
    100% {
      transform: translateY(105vh) rotate(360deg);
    }
  }
  @keyframes sway {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(20px);
    }
  }
</style>
