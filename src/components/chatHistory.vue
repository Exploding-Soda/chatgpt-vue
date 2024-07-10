<template>
  <div class="wrapper" style="background-color: black;">

    <div id="chatListContainer" class="results-container">
      <div v-for="(chat, index) in chatList" :key="chat.id" class="chat-item">
        <div class="chat-title" @click="selectChat(chat.id)">{{ chat.name }}</div>
        <button @click="deleteChat(chat.id)">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineExpose } from 'vue';
import type { ChatMessage } from '@/types';
import { defineProps, defineEmits } from 'vue';

// 定义属性和事件
const props = defineProps<{ messageList: ChatMessage[] }>();
const emit = defineEmits(['loadChat', 'update:hideChatHistory']);

// 定义 reactive 状态
const chatList = ref<Array<{ id: number; name: string; content: ChatMessage[] }>>([]);

// 初始化 IndexedDB
const openDB = async (): Promise<IDBDatabase> => {
  const request = indexedDB.open('ChatDB', 1);
  return new Promise((resolve, reject) => {
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('ChatList')) {
        db.createObjectStore('ChatList', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result as IDBDatabase);
    request.onerror = (event) => reject(event);
  });
};

// 从数据库加载对话列表
const loadChatList = async (): Promise<Array<{ id: number; name: string; content: ChatMessage[] }>> => {
  const db: IDBDatabase = await openDB();
  const tx = db.transaction('ChatList', 'readonly');
  const store = tx.objectStore('ChatList');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event);
  });
};

// 刷新对话列表
const refreshChatList = async () => {
  chatList.value = await loadChatList();
};

// 删除对话
const deleteChat = async (id: number) => {
  const db: IDBDatabase = await openDB();
  const tx = db.transaction('ChatList', 'readwrite');
  const store = tx.objectStore('ChatList');

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event);
    tx.oncomplete = () => resolve();
    tx.onerror = (event) => reject(event);
  });

  refreshChatList();
};

// 选择对话并触发 loadChat 事件
const selectChat = async (chatId: number) => {
  emit('loadChat', chatId);
};


onMounted(async () => {
  await refreshChatList();
});

// 定义 expose
defineExpose({
  refreshChatList
});
</script>

<style scoped>
.wrapper {
  margin-bottom: 10px;
}

.button-container {
  display: flex;
  margin-bottom: 10px;
}

.results-container {
  padding-top: 10px;
}

.chat-item {
  border: 1px solid #000;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
}

.chat-title {
  cursor: pointer;
  color: white;
  text-decoration: underline;
}

.chatControlButton {
  width: 25%;
  max-width: 1000px;
}
</style>
