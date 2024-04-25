<template>
  <div class="wrapper" style="background-color: black;">

    <div class="input-container">
      <input class="input" v-model="lastPrompt" :placeholder="placeHolder" />
    </div>

    <div class="button-container">
      <button class="btn templateControlButton" @click="addMessageToList">
        使用
      </button>
      <button class="btn templateControlButton" @click="saveTemplate">
        保存模板
      </button>
      <button class="btn templateControlButton" @click="toggleTemplateRepository">模板仓库</button>
      <button class="btn templateControlButton" @click="hideTemplate">返回</button>
    </div>

    <div id="resultsContainer" v-show="isRepositoryVisible" class="results-container">
      <div v-for="(prompt, index) in prompts" :key="index" class="prompt-item">
        <div class="prompt-content">
          <h3 v-if="prompt.title">{{ prompt.title }}</h3>
          <p>{{ prompt.content }}</p>
          <div class="button-group">
            <button @click="usePrompt(prompt.content)" class="btn">使用</button>
            <!-- 有标题，而且没找到我不希望删的标题 -->
            <button @click="deletePrompt(prompt.id)" class="btn" v-show="!prompt.isPredefined">删除</button>

          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ChatMessage } from '@/types';
import { defineProps, defineEmits } from 'vue';
import { presetPrompts } from '@/components/PresetPrompts.js'; // 从 PresetPrompts.js 导入 presetPrompts

// 定义属性和事件
const props = defineProps<{ messageList: ChatMessage[] }>();
const emit = defineEmits(['update:messageList', 'update:hidePromptTemplate']);

// 定义 reactive 状态
const placeHolder = ref('输入Prompt，这将决定GPT在之后对话的个性');
const lastPrompt = ref('');
const isRepositoryVisible = ref(false);
const prompts = ref<Array<{ id: number; title: string; content: string; isPredefined: boolean }>>(presetPrompts);
const protectedPresets = ref([]);

// 初始化 IndexedDB
const openDB = async () => {
  const request = indexedDB.open('PromptDB', 1);
  return new Promise((resolve, reject) => {
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('PromptList')) {
        db.createObjectStore('PromptList', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event);
  });
};

// 从数据库加载用户自己保存的 Prompts
const loadUserPrompts = async () => {
  const db: IDBDatabase = await openDB();
  const tx = db.transaction('PromptList', 'readonly');
  const store = tx.objectStore('PromptList');
  const userPrompts: Array<{ id: number; title: string; content: string; isPredefined: boolean }> = [];

  return new Promise((resolve, reject) => {
    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursor;
      if (cursor) {
        const value = cursor.value;
        userPrompts.push({ id: cursor.key as number, title: value.title, content: value.content, isPredefined: value.isPredefined });
        cursor.continue();
      } else {
        resolve(userPrompts);
      }
    };
    cursorRequest.onerror = (event) => {
      console.error('Error loading user prompts:', event);
      reject(event);
    };
  });
};

// 合并预定义的 prompts 和用户保存的 prompts
const mergePrompts = (presetPrompts: Array<{ id: number; title: string; content: string; isPredefined: boolean }>, userPrompts: Array<{ id: number; title: string; content: string; isPredefined: boolean }>) => {
  const mergedPrompts = [...presetPrompts];

  // 使用 Map 通过 title 和 content 过滤重复的 prompts
  const promptMap = new Map<string, { id: number; title: string; content: string; isPredefined: boolean }>();
  mergedPrompts.forEach(prompt => {
    const key = `${prompt.title}-${prompt.content}`;
    promptMap.set(key, prompt);
  });

  userPrompts.forEach(prompt => {
    const key = `${prompt.title}-${prompt.content}`;
    if (!promptMap.has(key)) {
      promptMap.set(key, prompt);
    }
  });

  return Array.from(promptMap.values());
};

// 刷新 prompts 列表
const refreshPrompts = async () => {
  // 从 IndexedDB 中加载用户自己保存的 prompts
  const userPromptsList = await loadUserPrompts();

  // 合并预定义的 prompts 和用户保存的 prompts
  prompts.value = mergePrompts(presetPrompts, userPromptsList);
};

// 添加新的 Prompt 到数据库
const addPrompt = async (prompt: { title: string; content: string; isPredefined: boolean }) => {
  const db: IDBDatabase = await openDB();
  const tx = db.transaction('PromptList', 'readwrite');
  const store = tx.objectStore('PromptList');

  await store.add(prompt);
  await tx.done;

  // 完成后刷新 prompts 列表
  refreshPrompts();
};

// 删除指定的 Prompt
const deletePrompt = async (id: number) => {
  const db: IDBDatabase = await openDB();
  const tx = db.transaction('PromptList', 'readwrite');
  const store = tx.objectStore('PromptList');

  await store.delete(id);
  await tx.done;

  // 删除后刷新 prompts 列表
  refreshPrompts();
};

// 保存 Prompt
const saveTemplate = async () => {
  const promptTitle = prompt('请输入 Prompt 标题：');
  if (promptTitle) {
    const prompt = {
      title: promptTitle,
      content: lastPrompt.value,
      isPredefined: false
    };

    await addPrompt(prompt);

    // 更新界面
    lastPrompt.value = '';
    refreshPrompts();
  }
};

// 使用 Prompt
const usePrompt = (promptContent: string) => {
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

// 隐藏模板仓库
const hideTemplate = () => {
  emit('update:hidePromptTemplate');
};

onMounted(async () => {
  // 加载并合并预定义的 prompts 和用户保存的 prompts
  await refreshPrompts();
});
</script>




<style scoped>
.wrapper {
  margin-bottom: 10px;
}

.input-container,
.button-container {
  display: flex;
  margin-bottom: 10px;
}

.input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

.btn {
  margin-right: 10px;
  background-color: black;
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
    gap: 10px;
    margin-top: 10px;
  }

  .btn {
    width: 100%;
    margin-right: 0;
  }
}

.templateControlButton {
  width: 25%;
  max-width: 1000px;
}

.prompt-content p {
  white-space: nowrap;
  /* 将文本限制在一行内 */
  overflow: hidden;
  /* 隐藏溢出的文本 */
  text-overflow: ellipsis;
  /* 添加省略号 */
}

.prompt-content p:hover {
  white-space: normal;
  /* 在悬停时取消单行限制 */
  overflow: visible;
  /* 允许溢出文本可见 */
}
</style>