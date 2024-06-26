<template>
  <div class="hand-watch" @click="closeWatch">
    <div class="watchContent watch-time">
      <span>{{ formattedTime.split(' : ')[0] }}</span>
      <span class="time-separator"> : </span>
      <span>{{ formattedTime.split(' : ')[1] }}</span>

    </div>
    <span class="time-separator"></span>
    <span class="second">{{ formattedTime.split(' : ')[2] }}</span>

    <div class="time-display">
      <div class="watchContent">{{ formattedDate }}</div>
      <div class="watchContent">{{ formattedDayOfWeek }}</div>
    </div>
    <div class="timezone-selector">
      <!-- 时区选择器（如果还需要可以在这里添加） -->
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, defineProps, defineEmits } from 'vue';

// 组件的属性和事件
const isHandWatchVisible = ref(false);
const emit = defineEmits(['close-watch']);
defineProps<{ isHandWatchVisible: boolean }>();

function closeWatch() {
  emit('close-watch');
}

// 用于显示当前的本地时间
const currentDateTime = ref(new Date());

// 定义每秒更新时间的定时器
const timer = ref<number | null>(null);

// 初始化时设置计时器，每秒更新时间
onMounted(() => {
  timer.value = setInterval(() => {
    currentDateTime.value = new Date();
  }, 1000); // 每秒（1000毫秒）更新一次时间
});

// 在组件卸载前清除定时器
onBeforeUnmount(() => {
  if (timer.value !== null) {
    clearInterval(timer.value);
    timer.value = null;
  }
});

// 计算格式化后的日期
const formattedDate = computed(() => {
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  return currentDateTime.value.toLocaleDateString('zh-CN', options);
});

// 计算格式化后的时间，包括时、分、秒
const formattedTime = computed(() => {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const timeString = currentDateTime.value.toLocaleTimeString('zh-CN', options);
  // 在时间的各部分之间添加空格
  return timeString.replace(/:/g, ' : ');
});

// 计算格式化后的星期
const formattedDayOfWeek = computed(() => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
  return currentDateTime.value.toLocaleDateString('zh-CN', options);
});
</script>




<style scoped>
/* 全局样式 */
.hand-watch {

  position: fixed;
  z-index: 10;
  width: 100vw;
  height: 100vh;
  background: black;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  animation: breathing 5s infinite ease-in-out;
  /* 调整动画的持续时间和速度 */
}

/* 动画定义 */
@keyframes breathing {
  0% {
    background: black;
    /* 初始状态是黑色 */
  }

  50% {
    background: rgb(41, 41, 41);
    /* 中间状态是灰色 */
  }

  100% {
    background: black;
    /* 最终状态是黑色 */
  }
}

/* 大的时间显示样式 */
.watchContent.watch-time {
  font-size: 5rem;
  /* 字体大小 */
  margin-bottom: 1rem;
  /* 底部留白 */
}

/* 日期和星期显示样式 */
.time-display {
  display: flex;
  justify-content: center;
  gap: 1rem;
  /* 两个元素之间的间距 */
}

.watchContent {
  color: white;
  padding: 0.5rem;
  /* 内边距 */
  border-radius: 0.5rem;
  /* 边框半径 */
}

/* 响应式布局 */
@media (max-width: 768px) {
  /* 在较小的屏幕上调整样式 */

  /* 调整时间显示样式 */
  .watchContent.watch-time {
    font-size: 3rem;
    /* 减小字体大小 */
  }

  /* 调整日期和星期显示样式 */
  .time-display {
    flex-direction: column;
    /* 垂直布局 */
    gap: 0.5rem;
    /* 减少元素之间的间距 */
  }

  /* 其他样式调整 */
  .watchContent {
    padding: 0.3rem;
    /* 减少内边距 */
  }
}

/* 添加 CSS 动画，使冒号不停地闪动 */
@keyframes blink {
  0% {
    opacity: 1;
    /* 初始状态为完全可见 */
  }

  50% {
    opacity: 0;
    /* 50% 处为完全不可见 */
  }

  100% {
    opacity: 1;
    /* 最终状态为完全可见 */
  }
}

/* 使冒号元素应用闪动动画 */
.watchContent.watch-time .time-separator {
  animation: blink 1s infinite;
}

.second {
  position: relative;
  bottom: 25px;
  font-size: xx-large;
  color: gray;
}
</style>
