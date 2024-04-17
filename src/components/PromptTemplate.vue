<template>
  <div class="flex">
    <input class="input" v-model="lastPrompt" :placeholder="placeHolder" />

    <button class="btn" style="margin-right: 10px;" @click="addMessageToList">
      设置Prompt
    </button>

    <button class="btn" style="margin-right: 10px;" @click="saveTemplate">
      保存模板
    </button>

    <button class="btn" @click="toggleTemplateRepository">模板仓库</button>
  </div>

  <div id="resultsContainer" v-show="isRepositoryVisible">
    <!-- 在这个容器中渲染 prompts -->
    <div v-for="prompt in prompts" :key="prompt.title" class="prompt">
      <div style="border: 1px solid black;border-radius: 25px;padding: 5px 20px 5px 20px">
        <h3 class="p">{{ prompt.title }}</h3>
        <p style="color:grey;">{{ prompt.content }}</p>
        <button @click="usePrompt(prompt.content)" class="btn">使用</button>
      <button @click="deletePrompt(prompt)" class="btn">删除</button>
      </div>

      <p>=== ===</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ChatMessage } from '@/types';

// 定义属性和事件
const props = defineProps<{ messageList: ChatMessage[] }>();
const emit = defineEmits(['update:messageList']);

// 定义 reactive 状态
let placeHolder = ref('输入Prompt，这将决定GPT在之后对话的个性');
let lastPrompt = ref('');
let isRepositoryVisible = ref(false);
let prompts = ref([]);

// 初始化 IndexedDB
const openDB = async () => {
  const request = indexedDB.open('PromptDB', 1);
  return new Promise((resolve, reject) => {
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('PromptList')) {
        db.createObjectStore('PromptList', { autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(request.result);
    request.onerror = (event) => reject(event);
  });
};

// 从数据库加载 Prompts
const loadPrompts = async () => {
  const db = await openDB();
  const tx = db.transaction('PromptList', 'readonly');
  const store = tx.objectStore('PromptList');
  const prompts = [];

  return new Promise((resolve, reject) => {
    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        prompts.push(cursor.value);
        cursor.continue();
      } else {
        resolve(prompts);
      }
    };
    cursorRequest.onerror = (event) => {
      console.error('Error loading prompts:', event);
      reject(event);
    };
  });
};

// 添加新的 Prompt 到数据库
const addPrompt = async (prompt) => {
  const db = await openDB();
  const tx = db.transaction('PromptList', 'readwrite');
  const store = tx.objectStore('PromptList');

  await store.add(prompt);
  await tx.done;

  // 完成后刷新 Prompts 列表
  refreshPrompts();
};

// 删除指定的 Prompt
const deletePrompt = async (prompt) => {
  const db = await openDB();
  const tx = db.transaction('PromptList', 'readwrite');
  const store = tx.objectStore('PromptList');

  const key = await findPromptKey(store, prompt);
  if (key !== null) {
    await store.delete(key);
  }

  await tx.done;

  // 删除后刷新 Prompts 列表
  refreshPrompts();
};

// 查找 Prompt 的键
const findPromptKey = async (store, prompt) => {
  const cursorRequest = store.openCursor();
  return new Promise((resolve, reject) => {
    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const data = cursor.value;
        if (data.title === prompt.title && data.content === prompt.content) {
          resolve(cursor.key);
        }
        cursor.continue();
      } else {
        resolve(null);
      }
    };
    cursorRequest.onerror = (event) => {
      console.error('Error finding prompt key:', event);
      reject(event);
    };
  });
};

// 刷新 Prompts 列表
const refreshPrompts = async () => {
  prompts.value = await loadPrompts();
};

// 保存 Prompt
const saveTemplate = async () => {
  const promptTitle = prompt('请输入 Prompt 标题：');
  if (promptTitle) {
    const prompt = {
      title: promptTitle,
      content: lastPrompt.value,
    };

    await addPrompt(prompt);

    // 更新界面
    lastPrompt.value = '';
    refreshPrompts();
  }
};

// 使用 Prompt
const usePrompt = (promptContent) => {
  lastPrompt.value = promptContent;

  // 隐藏模板仓库容器
  isRepositoryVisible.value = false;
};

// 切换模板仓库的显示状态
const toggleTemplateRepository = async () => {
  isRepositoryVisible.value = !isRepositoryVisible.value;

  if (isRepositoryVisible.value) {
    await refreshPrompts();

    if (prompts.value.length === 0) {
      alert('模板仓库中没有任何模板。');
      isRepositoryVisible.value = false;
    }
  }
};

// 添加新的消息到消息列表
const addMessageToList = () => {
  if (lastPrompt.value.trim()) {
    const newChatMessage: ChatMessage = {
      role: 'system',
      content: lastPrompt.value.trim(),
    };

    const updatedMessageList = [newChatMessage, ...props.messageList];
    const filteredMessageList = updatedMessageList.filter(
      (message, index) => message.role !== 'system' || index === 0
    );

    emit('update:messageList', filteredMessageList);
    placeHolder.value = lastPrompt.value;
    lastPrompt.value = '';
  }
};
</script>

<style scoped>
.flex {
  display: flex;
}

.input {
  margin-right: 10px;
}

.btn {
  margin-right: 10px;
}

.prompt {
  display: inline-block;
  margin-right: 10px;
}
</style>
