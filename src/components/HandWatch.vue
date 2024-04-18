<template>
  <!-- <div class="hand-watch" v-if="isHandWatchVisible"> -->
  <div class="hand-watch" @click="closeWatch">

    <div class="watchContent watch-time">
      <span>{{ formattedTime.split(' : ')[0] }}</span>
      <span class="time-separator"> : </span>
      <span>{{ formattedTime.split(' : ')[1] }}</span>
    </div>
    <div class="time-display">
      <div class="watchContent">{{ formattedDate }} </div>
      <div class="watchContent">{{ formattedDayOfWeek }}</div>
    </div>




    <div class="timezone-selector">
      <!-- 时区选择器 -->
    </div>
  </div>

</template>

<style scoped>
/* 全局样式 */
.hand-watch {
  position: absolute;
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
</style>



<!-- <style scoped>


.hider{
  position:absolute;
  width:100vw;
  height:100vh;
}

.hideWatch{
  position:absolute;
  height:100vh;
  width:100vw;
}

.time-display {
  border-radius: 50px;
}


.hand-watch {
  position: absolute;
  z-index: 10;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(to bottom, rgb(22, 22, 22), rgb(66, 66, 66));
  animation: breathing 4s infinite ease-in-out; /* 调整动画的持续时间和速度 */
}

.watchContent{
  color:white;
  font-size:5rem;
  width:100vw;
}

.watch-time{
  position:absolute;
  font-size: 20rem;
  text-align: right;
}

</style> -->


<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, defineProps, defineEmits } from 'vue';

// WIP
const isHandWatchVisible = ref(false);
const emit = defineEmits(['close-watch']);
defineProps<{ isHandWatchVisible: boolean }>();

function closeWatch() {
  emit('close-watch');
}
// WIP


// 时区列表，可根据需要添加或修改
const timeZones = [
  'Asia/Shanghai',
  // 更多时区...
];

// Timer用于每分钟刷新时间
const timer = ref<number | null>(null);


const selectedTimeZone = ref(localStorage.getItem('selectedTimeZone') || 'Asia/Shanghai'); // 获取上次保存的时区，默认 'Asia/Shanghai'
const currentDateTime = ref('');

const fetchTime = async (timeZone: string) => {
  try {
    const response = await fetch(`https://worldtimeapi.org/api/timezone/${timeZone}`);
    const data = await response.json();
    currentDateTime.value = data.datetime;
  } catch (error) {
    console.error('获取时间失败：', error);
  }
};

const updateTimeZone = () => {
  localStorage.setItem('selectedTimeZone', selectedTimeZone.value); // 保存选择的时区到 localStorage
  fetchTime(selectedTimeZone.value); // 更新当前时间
};

onBeforeUnmount(() => {
  if (timer.value !== null) {
    clearInterval(timer.value);
    timer.value = null;
  }
});


// 初始化时获取当前时间
onMounted(() => {
  fetchTime(selectedTimeZone.value);

  // 在onMounted中设置计时器，每分钟刷新时间
  timer.value = setInterval(() => {
    fetchTime(selectedTimeZone.value);
  }, 60000); // 每分钟（60,000 毫秒）刷新一次时间

});

// 监视时区选择变化
watch(selectedTimeZone, (newTimeZone) => {
  fetchTime(newTimeZone);
});

// 格式化日期时间字符串为规范的日期、时间和星期
let formattedDate = computed(() => {
  const date = new Date(currentDateTime.value);
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  return date.toLocaleDateString('zh-CN', options);
});

const formattedTime = computed(() => {
  const date = new Date(currentDateTime.value);
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const timeString = date.toLocaleTimeString('zh-CN', options);
  // 在小时和分钟之间添加两个空格
  return timeString.replace(':', ' : ');
});


const formattedDayOfWeek = computed(() => {
  const date = new Date(currentDateTime.value);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
  return date.toLocaleDateString('zh-CN', options);
});
</script>
