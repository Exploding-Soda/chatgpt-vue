<template>
  <div class="wrapper">
    <div class="input-container">
      <input class="input" v-model="lastPrompt" :placeholder="placeHolder" />
    </div>
    <div class="button-container">
      <button class="btn" @click="addMessageToList">
        设置Prompt
      </button>
      <button class="btn" @click="saveTemplate">
        保存模板
      </button>
      <button class="btn" @click="toggleTemplateRepository">模板仓库</button>
    </div>

    <div id="resultsContainer" v-show="isRepositoryVisible" class="results-container">
      <div v-for="(prompt, index) in prompts" :key="index" class="prompt-item">
        <div class="prompt-content">
          <h3 v-if="prompt.title">{{ prompt.title }}</h3>
          <p>{{ prompt.content }}</p>
          <div class="button-group">
            <button @click="usePrompt(prompt.content)" class="btn">使用</button>
            <button @click="deletePrompt(prompt)" class="btn">删除</button>
          </div>
        </div>
      </div>
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
let prompts = ref<ChatMessage[]>([]);

// 初始化 IndexedDB
const openDB = async () => {
  const request = indexedDB.open('PromptDB', 1);
  return new Promise((resolve, reject) => {
    request.onupgradeneeded = () => {
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
  const db: IDBDatabase = await openDB();
  const tx = db.transaction('PromptList', 'readonly');
  const store = tx.objectStore('PromptList');
  const prompts: ChatMessage[] = [];

  return new Promise((resolve, reject) => {
    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = (event: IDBRequestEvent) => {
      const cursor = (event.target as IDBRequest<ChatMessage>).result as IDBCursor<ChatMessage>;

      if (cursor) {
        prompts.push(cursor.value);
        cursor.continue();
      } else {
        resolve(prompts);
      }
    };

    cursorRequest.onerror = (event: IDBRequestEvent) => {
      console.error('Error loading prompts:', event);
      reject(event);
    };

  });
};

// 添加新的 Prompt 到数据库
const addPrompt = async (prompt) => {
  const db: IDBDatabase = await openDB();
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
const findPromptKey = async (store: IDBObjectStore, prompt: ChatMessage) => {
  const cursorRequest = store.openCursor();
  return new Promise((resolve, reject) => {
    cursorRequest.onsuccess = (event: Event) => {
      const cursor = (event.target as IDBRequest<ChatMessage>).result;
      if (cursor) {
        prompts.push(cursor.value);
        cursor.continue();
      } else {
        resolve(prompts);
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
.wrapper {
  margin-bottom: 10px;
}

.input-container,
.button-container {
  margin-bottom: 10px;
}

.input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

.btn {
  margin-right: 10px;
}

.results-container {
  padding-top: 10px;
}

.prompt-item {
  border: 1px solid #000;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
}

.prompt-content h3 {
  margin: 0;
}

.prompt-content p {
  color: grey;
  margin: 5px 0;
}

.button-group {
  display: flex;
  justify-content: flex-end;
}

/* 响应式布局 */
@media (max-width: 400px) {
  .button-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }

  .btn {
    width: 100%;
    margin-right: 0;
  }
}
</style>