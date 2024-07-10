<template>
  <div class="mainWrapper">
    <div>
      <handWatch v-if="isHandWatchVisible" @close-watch="closeWatch" />
    </div>
    <div class="backgroundWrapper">
      <div class="chatArea" style="background-color: black;" ref="chatListDom">
        <!-- GPT标题  -->
        <div class="flex flex-nowrap w-full items-baseline top-0 px-6 py-4" id="gptHeader">
          <div class="text-2xl font-bold">ChatGPT</div>
          <div class="ml-4 text-sm">
            OpenAI 的 ChatGPT
          </div>
          <div class="ml-auto px-3 py-2 text-sm cursor-pointer hover:bg-white rounded-md" @click="clickConfig()">
            🛠️
          </div>
        </div>
        <!-- 滚动到底部 -->
        <div class='scrollToBottomWrapper'>
          <span>
            <button @click="scrollToBottom">
              <p class="btn noMarginRight scrollToBottom">底部</p>
            </button>
          </span>
        </div>
        <div class="chatContentRecord">
          <!-- 聊天记录区域 -->
          <div class="group flex flex-col px-4 py-3 hover:bg-gray-800 rounded-lg"
            v-for="(item, index) of messageListCopy.filter((v) => v.role !== 'system')" :key="index">
            <div class="flex justify-between items-center mb-2">
              <!-- 谁发送的信息 -->
              <div class="font-bold">{{ roleAlias[item.role] }}.</div>
              <!-- 复制内容按钮 -->
              <Copy class="invisible group-hover:visible" :content="item.content" />
            </div>
            <!-- 发送消息的正文内容 -->
            <div :class="{ forgotten: !(Math.abs(index - messageListCopy.length) < maxChatLength) }">
              <div v-if="item.content"
                v-html="md.render(typeof (item.content) == 'string' ? item.content : '等待GPT-4响应...')">
              </div>
              <Loding v-else />
            </div>
            <!-- 当复制体里面有图片的时候渲染出图片 -->
            <div v-if="item.imgURL != ''">
              <img :src="item.imgURL"></img>
            </div>
            <!-- 内容遗忘提示分界线 -->
            <div v-if="Math.abs(index - messageListCopy.length) == maxChatLength" style="text-align: center;">
              <hr style="margin-top:10px;">
              <p style="font-size: smaller;opacity: 0.5;">助手不记得上面的对话</p>
            </div>
          </div>
          <!-- 填充一项以免被工具栏挡住 -->
          <div style="height:200px;"></div>
        </div>
        <div class="chatboxArea" style="background-color:black">
          <div v-show="isToolBarVisible">
            <button class="toolBar" @click="togglePromptTemplateVisibility(0)">
              <p class="btn noMarginRight functionPromptTemplate">📋<br>模板</p>
            </button>
            <button class="toolBar" @click="toggleHandWatchVisibility">
              🕰️<br>手表
            </button>
            <button class="toolBar" @click="setMemoryLength">
              🕰️<br>记忆
            </button>
          </div>
          <div class="TinyWatchClass" v-if="true">
            <TinyWatch v-show="!isHandWatchVisible"></TinyWatch>
          </div>
          <div class="toolBarWrapper">
            <div class="toolBarWrapperLeft">
              <button class="toolBar" @click="toggleToolBarVisibility()">
                {{ isToolBarVisible ? "🚪" : "🧰" }}<br>功能
              </button>
            </div>
            <div class="toolBarWrapperRight">
              <button class="toolBar" @click="togglePromptTemplateVisibility(1)">
                📋<br>模板
              </button>
              <button class="toolBar" @click="clearConversation">
                💭<br>刷新
              </button>
              <button class="toolBar" @click="togglePicMode" :class="{ highlight: isGPT4Chat }">
                🖼️<br>GPT4o
              </button>
            </div>
          </div>
          <!-- 更长输入框模块 -->
          <div @click="toggleExtendedChatbox"
            style="max-height:20px;text-align: center;position:relative;padding-bottom:25px">{{ isExtendChatboxVisible ?
              '▲' : '▼' }}</div>
          <div v-if="isExtendChatboxVisible"
            style="height:100%;width:100%;word-wrap: break-word;white-space: normal;display:flex;">
            <textarea class="input" style="width:90%;min-height:200px;color:black" v-model="messageContent"></textarea>
            <button class="" style="min-width:100px;width:10%" :disabled="isTalking" @click="sendOrSave()">
              {{ isConfig ? "保存" : "发送" }}
            </button>
          </div>
          <!-- 更长输入框模块 -->
          <div class="-mt-2 mb-2 text-sm text-gray-500" v-if="isConfig">
            请输入 API Key：
          </div>
          <div class="flex" v-if="!isExtendChatboxVisible">
            <input :class="{ input: true, dontInput: disableInput }" :disabled="disableInput"
              :type="isConfig ? 'password' : 'text'" :placeholder="isConfig ? 'sk-xxxxxxxxxx' : '请输入'"
              v-model="messageContent" @keydown.enter="isTalking || sendOrSave()" />
            <ImageUploader v-show="isGPT4Chat" ref="ImageUploaderRef" :maxChatLength="maxChatLength" :apiKey="apiKey"
              :messageContent="messageContent" :messageList="messageList" @reply="handleReply"
              @letWait="ImageUploaderWait">
            </ImageUploader>
            <button v-if="!isGPT4Chat" class="" style="min-width:150px;" :disabled="isTalking" @click="sendOrSave()">
              {{ isConfig ? "保存" : "发送" }}
            </button>
          </div>
          <div style="height:5px;"></div>
          <!-- PromptTemplate提示词模块 -->
          <promptTemplate v-if="isPromptTemplateVisible" :messageList="messageList"
            @update:messageList="handleMessageListUpdate"
            @update:hidePromptTemplate="togglePromptTemplateVisibility(0)" />

          <chatHistory v-if="isChatHistoryVisible" :messageList="messageList" />
          <!-- PromptTemplate提示词模块 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from "@/types";
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { chat } from "@/libs/gpt";
import cryptoJS from "crypto-js";
import Loding from "@/components/Loding.vue";
import Copy from "@/components/Copy.vue";
import { md } from "@/libs/markdown";
import TinyWatch from "@/components/TinyWatch.vue";
import ImageUploader from '@/components/ImageUploader.vue';
// WIP
import PromptTemplate from '@/components/PromptTemplate.vue';
import chatHistory from '@/components/chatHistory.vue';
import HandWatch from "@/components/HandWatch.vue";

// 控制 handWatch 页面显示的状态变量
let isHandWatchVisible = ref(false);
let isPromptTemplateVisible = ref(false);
let isToolBarVisible = ref(false)
let isExtendChatboxVisible = ref(false)
let isGPT4Chat = ref(false)
let disableInput = ref(false)
let isChatHistoryVisible = ref(false)

// 切换 handWatch 页面显示的函数
const toggleHandWatchVisibility = () => {
  isHandWatchVisible.value = !isHandWatchVisible.value;
};

// 切换发图模式
const togglePicMode = () => {
  // clearMessageContent()
  isGPT4Chat.value = !isGPT4Chat.value
}

// Prompt模板，按钮可见性
const togglePromptTemplateVisibility = (operand: number) => {
  if (operand == 0) {
    // 代表是从工具菜单里点进来的，会在打开模板菜单后关闭工具菜单
    isPromptTemplateVisible.value = !isPromptTemplateVisible.value
    isToolBarVisible.value = false
  }
  if (operand == 1) {
    // 代表常规切换模板菜单可见性
    isPromptTemplateVisible.value = !isPromptTemplateVisible.value
  }
  scrollToBottom();
}

// 清空对话
const clearConversation = () => {
  if (templateFromPromptTemplate.length != 0) {
    // 用户自定义了Prompt的情况
    messageList.value[0] = templateFromPromptTemplate[0];
  } else {
    // 用户没自定义Prompt的情况
    messageList.value = [];
    messageList.value[0] = defaultPrompt[0];
  }
  alert('已清除记忆')
}

// 设置助手记忆长度
const setMemoryLength = () => {
  let memoryLength = prompt('指定助手的记忆长度为几条信息：')
  if (memoryLength != null) {
    let intMemoryLength: number = parseInt(memoryLength)
    if (!isNaN(intMemoryLength)) {
      maxChatLength.value = intMemoryLength + 2;
      console.log("助手记忆长度：", maxChatLength.value)
    } else {
      console.log("助手记忆长度：", maxChatLength.value)
    }
  }
}

// 齿轮标签打开的菜单
const toggleToolBarVisibility = (designitedTrueOrFalse?: number) => {
  // designitedTrueOrFalse = 0 只执行关闭菜单栏
  if (designitedTrueOrFalse == 0) {
    isToolBarVisible.value = false;
    return 1;
  }
  isToolBarVisible.value = !isToolBarVisible.value
  // 如果点击齿轮的时候 任何一个其他功能的菜单 已经被打开了
  // 那么就不打开 额外菜单 关闭所有的额外功能，回到GPT页面
  let anyMenuIsOn = (isPromptTemplateVisible.value == true)

  if (anyMenuIsOn) {
    isHandWatchVisible.value = false;
    isPromptTemplateVisible.value = false;
    isToolBarVisible.value = false;
  }
  scrollToBottom();
}

// 关闭手表页面
function closeWatch() {
  isHandWatchVisible.value = false;
}


// 延长的聊天输入框
const toggleExtendedChatbox = () => {
  isExtendChatboxVisible.value = !isExtendChatboxVisible.value
  setTimeout(() => {
    scrollToBottom();
  }, 20);

  // 再关闭所有已经打开的工具栏
  toggleToolBarVisibility(0);
}

// 关闭延长输入框
const CloseExtendedChatbox = () => {
  if (isExtendChatboxVisible.value) {
    isExtendChatboxVisible.value = !isExtendChatboxVisible.value;
  }
}

const ImageUploaderWait = () => {
  // messageList.value.push({ role: 'user', content: "等待图片回复..." })
  disableInput.value = true
}

const getLastSelectedPrompt = () => {
  return localStorage.getItem("lastSelectedPrompt") || '你是一名智能助手，你需要解答用户的问题或满足用户的要求';
};

const handleReply = (response: any, userInputedContent: string, uploadedImageURL: string | null) => {
  messageList.value[messageList.value.length - 1] = { role: "user", content: userInputedContent }
  messageList.value.push(response)
  if (uploadedImageURL != null) {
    messageList.value[messageListCopy.value.length - 2].imgURL = uploadedImageURL
  }
  clearMessageContent()
  disableInput.value = false
  console.log("@home.vue messageList:", messageList.value)
}

let apiKey = "";
let isConfig = ref(true);
let isTalking = ref(false);
let messageContent = ref("");
let maxChatLength = ref(2048);

const ImageUploaderRef = ref(null)
const chatListDom = ref<HTMLDivElement>();
const decoder = new TextDecoder("utf-8");
const roleAlias = { user: "我", assistant: "助手", system: "System" };
const preSetPrompt = getLastSelectedPrompt();
const defaultPrompt = <ChatMessage[]>[
  {
    role: "system",
    content: preSetPrompt,
  },
];
const messageList = ref<ChatMessage[]>(defaultPrompt);
const messageListCopy = ref<ChatMessage[]>(messageList.value)

let templateFromPromptTemplate = <ChatMessage[]>[];
// 这个是在用户编辑了prompt模板并保存之后调用的
const handleMessageListUpdate = (updatedMessageList: ChatMessage[]) => {
  console.log("updatedMessageList:\n", updatedMessageList)
  messageList.value = updatedMessageList;
  messageListCopy.value = updatedMessageList;
  templateFromPromptTemplate = updatedMessageList
  // Save the content to localStorage
  if (updatedMessageList.length > 0 && updatedMessageList[0].content) {
    localStorage.setItem("lastSelectedPrompt", updatedMessageList[0].content);
  }
  togglePromptTemplateVisibility(0);
};

const hideToBottomButtonOnScrolledToBottom = () => {
  // 防抖函数
  function debounce<T>(func: (this: T, ...args: any[]) => void, delay: number) {
    let timeoutId: number | undefined;
    return function (this: T, ...args: any[]) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  // 获取具有类名scrollToBottomWrapper的第一个元素
  const targetElement = document.querySelector('.scrollToBottomWrapper') as HTMLElement;
  // 检查targetElement是否为null
  if (targetElement !== null) {
    // 定义滚动事件处理函数
    function handleScroll() {
      // 获取页面滚动的垂直位置
      const scrollY = window.scrollY;
      // 获取用户的屏幕高度
      const screenHeight = window.innerHeight;
      // 获取整个文档的高度
      const documentHeight = document.documentElement.scrollHeight;
      // 计算用户距离底部的距离
      const distanceFromBottom = documentHeight - screenHeight - (scrollY - (screenHeight));
      // 如果用户距离底部滚出一个屏幕高度的距离
      if (distanceFromBottom <= screenHeight) {
        // 隐藏目标元素
        targetElement.style.opacity = '0';
      } else {
        // 显示目标元素
        targetElement.style.opacity = '1';
      }
    }
    // 使用防抖函数处理滚动事件
    const debouncedHandleScroll = debounce(handleScroll, 100); // 100 毫秒的延迟
    // 监听滚动事件，使用防抖处理后的函数
    window.addEventListener('scroll', debouncedHandleScroll);
  } else {
    console.log("没有找到底部框");
  }
};

onMounted(() => {
  if (getAPIKey()) {
    switchConfigStatus();
  }
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (width < 500 && height < 500) {
    isHandWatchVisible.value = true;
  }
  hideToBottomButtonOnScrolledToBottom();
});

watch(messageList.value, (newVal) => {
  messageListCopy.value[newVal.length - 1] = newVal[newVal.length - 1]
}, { deep: true })

const sendChatMessage = async (content: string = messageContent.value) => {
  try {
    isTalking.value = true;
    if (messageList.value.length === 2) {
      messageList.value.pop();
    }
    messageList.value.push({ role: "user", content });
    clearMessageContent();
    messageList.value.push({ role: "assistant", content: "" });
    let tempMaxLengthChat = messageList.value;

    // // 记忆长度限制功能
    if (tempMaxLengthChat.length > maxChatLength.value) {
      tempMaxLengthChat = messageList.value.slice(-maxChatLength.value);
    }

    const { body, status } = await chat(tempMaxLengthChat, getAPIKey());
    if (body) {
      const reader = body.getReader();
      await readStream(reader, status);
    }
  } catch (error: any) {
    appendLastMessageContent(error);
  } finally {
    isTalking.value = false;
  }
};

const readStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  status: number
) => {
  let partialLine = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const decodedText = decoder.decode(value, { stream: true });
    if (status !== 200) {
      const json = JSON.parse(decodedText);
      const content = json.error.message ?? decodedText;
      appendLastMessageContent(content);
      return;
    }
    const chunk = partialLine + decodedText;
    const newLines = chunk.split(/\r?\n/);
    partialLine = newLines.pop() ?? "";
    for (const line of newLines) {
      if (line.length === 0) continue;
      if (line.startsWith(":")) continue;
      if (line === "data: [DONE]") return;
      const json = JSON.parse(line.substring(6));
      const content =
        status === 200
          ? json.choices[0].delta.content ?? ""
          : json.error.message;
      appendLastMessageContent(content);
    }
  }
};

const appendLastMessageContent = (content: string) =>
  (messageList.value[messageList.value.length - 1].content += content);

const sendOrSave = () => {
  if (!messageContent.value.length) return;
  if (isConfig.value) {
    if (saveAPIKey(messageContent.value.trim())) {
      switchConfigStatus();
    }
    clearMessageContent();
  } else {
    if (isGPT4Chat.value) {
      ImageUploaderSendMessage();
      console.log("Using GPT-4")
      return 0;
    }
    console.log("Using GPT-3.5")
    sendChatMessage();
    CloseExtendedChatbox();
  }
};
const clickConfig = () => {
  if (!isConfig.value) {
    messageContent.value = getAPIKey();
  } else {
    clearMessageContent();
  }
  switchConfigStatus();
  scrollToBottom();
};
const getSecretKey = () => "lianginx";
const saveAPIKey = (apiKey: string) => {
  if (apiKey.slice(0, 3) !== "sk-" || apiKey.length !== 51) {
    alert("API Key 错误，请检查后重新输入！");
    return false;
  }
  const aesAPIKey = cryptoJS.AES.encrypt(apiKey, getSecretKey()).toString();
  localStorage.setItem("apiKey", aesAPIKey);
  return true;
};
const getAPIKey = () => {
  if (apiKey) return apiKey;
  const aesAPIKey = localStorage.getItem("apiKey") ?? "";
  apiKey = cryptoJS.AES.decrypt(aesAPIKey, getSecretKey()).toString(
    cryptoJS.enc.Utf8
  );
  return apiKey;
};
const switchConfigStatus = () => (isConfig.value = !isConfig.value);
const clearMessageContent = () => (messageContent.value = "");
const scrollToBottom = () => {
  if (!chatListDom.value) return;
  scrollTo(0, chatListDom.value.scrollHeight);
};
const ImageUploaderSendMessage = () => {
  if (ImageUploaderRef.value) {
    (ImageUploaderRef.value as any).sendMessage()
  }
}
const test = () => {
  alert('test')
}

</script>

<style scoped>
pre {
  font-family: -apple-system, "Noto Sans", "Helvetica Neue", Helvetica,
    "Nimbus Sans L", Arial, "Liberation Sans", "PingFang SC", "Hiragino Sans GB",
    "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN",
    "Microsoft YaHei", "Wenquanyi Micro Hei", "WenQuanYi Zen Hei", "ST Heiti",
    SimHei, "WenQuanYi Zen Hei Sharp", sans-serif;
}


.backgroundWrapper {
  /* 这里确定高度，下面的元素即可使用% */
  min-height: 100vh;
  background-color: black;
}

.chatArea {
  position: relative;
  min-height: 100vh;
  height: 100%;
}

.mainWrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 100vh;
  width: 100%;
}

.chatContentRecord {
  min-height: 20%;
}

.noMarginRight {
  margin-right: 0;
}

.toolBar {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  height: 60px;
  width: 60px;

  max-width: 75px;
  max-height: 75px;
}

.toolBarWrapper {
  display: flex;
  justify-content: space-between;
  padding-left: 0px;
  padding-bottom: 0px;
  height: 5%;
  /* max-height: 5%; */
}

.toolBarWrapperLeft {
  display: flex;
  justify-content: start;
}

.toolBarWrapperRight {
  gap: 5px;
  padding-right: 0px;
  display: flex;
  justify-content: end;
}


.functionMenu {
  position: fixed;
  top: 0;
  left: 0;
  gap: 25px;
}

.btn {
  background-color: black;
}

.functionPromptTemplate {
  max-width: 150px;
}


/* .SpeechRecognition {
  height: 10px;
  position: relative;
  bottom: 20px;
} */

body {
  background-color: black;
}

.scrollToBottom {
  z-index: -1;
  display: flex;
  justify-content: center;
  text-align: center;
  height: 2%;
  width: 3%;
  max-height: 5px;
  max-width: 10px;
  align-items: center;
}

.scrollToBottomWrapper {
  display: flex;
  justify-content: center;
  position: sticky;
  top: 0;
  transition: opacity 0.5s;
  /* 使用过渡效果 */
}

.chatboxArea {
  /* 不能加absolute */
  position: absolute;
  bottom: 0;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  width: 100%;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 0px;
}

.TinyWatchClass {
  animation: hideHeader 2s forwards;
  display: none;
  position: fixed;
  background-color: red;
  width: 100%;

  z-index: 2;
}

@keyframes hideHeader {
  0% {
    opacity: 1;
  }

  90% {
    opacity: 0;
  }

  100% {
    display: none;
  }
}


@keyframes hideGptHeader {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    display: none;
  }
}

@keyframes showGptHeader {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
    display: 'flex';
  }
}

.highlight {
  background-color: rgba(155, 66, 66, 0.4);
  transition: background-color 0.5s ease;
  /* 添加渐变过渡效果 */
}

.dontInput {
  opacity: 0.3;
  background-color: rgba(32, 32, 32, 0.6);
  transition: background-color opacity 0.5s ease;
  /* 添加渐变过渡效果 */
}

.forgotten {
  opacity: 0.5;
  background-color: rgba(32, 32, 32, 0.6);
  transition: background-color opacity 3s ease;
  /* 添加渐变过渡效果 */
}

.forgotten image {
  opacity: 1;
}
</style>
