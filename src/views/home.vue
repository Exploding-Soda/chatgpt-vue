<template>
  <div class="mainWrapper">

    <!-- WIP -->
    <div>
      <handWatch v-if="isHandWatchVisible" @close-watch="closeWatch" />
    </div>
    <!-- WIP -->
    <div class="backgroundWrapper">


      <div class="flex flex-nowrap w-full items-baseline top-0 px-6 py-4">
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

      <div class="chatArea" style="background-color: black;" ref="chatListDom">
        <div class="group flex flex-col px-4 py-3 hover:bg-gray-800 rounded-lg"
          v-for="item of messageList.filter((v) => v.role !== 'system')">
          <div class="flex justify-between items-center mb-2">
            <div class="font-bold">{{ roleAlias[item.role] }}：</div>
            <Copy class="invisible group-hover:visible" :content="item.content" />
          </div>
          <div>
            <div v-if="item.content" v-html="md.render(item.content)"></div>
            <Loding v-else />
          </div>
        </div>
      </div>

      <div class="bottom-0 w-full p-6 pb-8 chatboxArea" style="background-color:black">
        <div v-show="isToolBarVisible">
          <span class="functionMenu">
            <button @click="togglePromptTemplateVisibility">
              <p class="btn noMarginRight functionPromptTemplate">Prompt模板</p>
            </button>
          </span>
        </div>

        <div class="toolBarWrapper">
          <div class="toolBarWrapperLeft">
            <button class="toolBar" @click="toggleToolBarVisibility">
              {{ isToolBarVisible ? "🚪" : "⚙️" }}
            </button>
          </div>

          <!-- <div class="SpeechRecognition"> -->
          <!-- SpeechRecognition 语音&声音识别 -->
          <!-- <SpeechRecognition @update-message="updateMessageContent" /> -->
          <!-- </div> -->

          <div class="toolBarWrapperRight" @click="toggleHandWatchVisibility">
            <button class="toolBar">
              🕰️
            </button>
            <!-- 后续添加更多按钮按照这个模板 -->
            <!-- <button class="toolBar" @click="toggleAutoSwitchHandWatch">
            🕰️
          </button> -->
          </div>
        </div>

        <!-- 更长输入框模块 -->
        <div @click="toggleExtendedChatbox"
          style="max-height:20px;text-align: center;position:relative;padding-bottom:25px">{{ isExtendChatboxVisible ?
            '▲' : '▼' }}</div>
        <div v-if="isExtendChatboxVisible" style="height:100%;width:100%;word-wrap: break-word;white-space: normal;">
          <textarea class="input" style="width:100%;min-height:200px;color:black" v-model="messageContent"></textarea>
        </div>
        <!-- 更长输入框模块 -->

        <div class="-mt-2 mb-2 text-sm text-gray-500" v-if="isConfig">
          请输入 API Key：
        </div>
        <div class="flex" v-if="!isExtendChatboxVisible">
          <input class="input" :type="isConfig ? 'password' : 'text'" :placeholder="isConfig ? 'sk-xxxxxxxxxx' : '请输入'"
            v-model="messageContent" @keydown.enter="isTalking || sendOrSave()" />
          <button class="" :disabled="isTalking" @click="sendOrSave()">
            {{ isConfig ? "保存" : "发送" }}
          </button>
        </div>

        <div style="height:5px;"></div>
        <!-- PromptTemplate提示词模块 -->
        <promptTemplate v-if="isPromptTemplateVisible" :messageList="messageList"
          @update:messageList="handleMessageListUpdate" @update:hidePromptTemplate="togglePromptTemplateVisibility" />
        <!-- PromptTemplate提示词模块 -->



      </div>
    </div>
  </div>


</template>

<script setup lang="ts">
import type { ChatMessage } from "@/types";
import { ref, watch, nextTick, onMounted } from "vue";
import { chat } from "@/libs/gpt";
import cryptoJS from "crypto-js";
import Loding from "@/components/Loding.vue";
import Copy from "@/components/Copy.vue";
import { md } from "@/libs/markdown";
// WIP
import PromptTemplate from '@/components/PromptTemplate.vue';
import HandWatch from "@/components/HandWatch.vue";
// import SpeechRecognition from "@/components/SpeechRecognition.vue"

// 控制 handWatch 页面显示的状态变量
let isHandWatchVisible = ref(false);
let isPromptTemplateVisible = ref(false);
let isToolBarVisible = ref(false)
let isExtendChatboxVisible = ref(false)

// 切换 handWatch 页面显示的函数
const toggleHandWatchVisibility = () => {
  isHandWatchVisible.value = !isHandWatchVisible.value;
};

// Prompt模板，按钮可见性
const togglePromptTemplateVisibility = () => {
  isPromptTemplateVisible.value = !isPromptTemplateVisible.value
  isToolBarVisible.value = false

  scrollToBottom();
}

// 齿轮标签打开的菜单
const toggleToolBarVisibility = () => {
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

function closeWatch() {
  isHandWatchVisible.value = false;
}


// 语音识别
// const updateMessageContent = (newMessage) => {
//   messageContent.value = newMessage;
// };

// 延长的聊天输入框
const toggleExtendedChatbox = () => {
  isExtendChatboxVisible.value = !isExtendChatboxVisible.value
  setTimeout(() => {
    scrollToBottom();
  }, 20);
}


// WIP

let apiKey = "";
let isConfig = ref(true);
let isTalking = ref(false);
let messageContent = ref("");
const chatListDom = ref<HTMLDivElement>();
const decoder = new TextDecoder("utf-8");
const roleAlias = { user: "ME", assistant: "ChatGPT", system: "System" };
const preSetPrompt = '请尽可能在一句话内回答用户的问题。'
const messageList = ref<ChatMessage[]>([
  {
    role: "system",
    content: preSetPrompt,
  },
]);

const handleMessageListUpdate = (updatedMessageList: ChatMessage[]) => {
  // 更新 messageList
  messageList.value = updatedMessageList;
  togglePromptTemplateVisibility();
};



onMounted(() => {
  if (getAPIKey()) {
    switchConfigStatus();
  }

  // WIP
  // 获取用户设备的分辨率
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 如果分辨率小于500*500，则设置isHandWatchVisible为true
  if (width < 500 && height < 500) {
    isHandWatchVisible.value = true;
  }
  // WIP

});

const sendChatMessage = async (content: string = messageContent.value) => {
  try {
    isTalking.value = true;
    if (messageList.value.length === 2) {
      messageList.value.pop();
    }
    messageList.value.push({ role: "user", content });
    clearMessageContent();
    messageList.value.push({ role: "assistant", content: "" });

    const { body, status } = await chat(messageList.value, getAPIKey());
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
    // eslint-disable-next-line no-await-in-loop
    const { value, done } = await reader.read();
    if (done) break;

    const decodedText = decoder.decode(value, { stream: true });

    if (status !== 200) {
      const json = JSON.parse(decodedText); // start with "data: "
      const content = json.error.message ?? decodedText;
      appendLastMessageContent(content);
      return;
    }

    const chunk = partialLine + decodedText;
    const newLines = chunk.split(/\r?\n/);

    partialLine = newLines.pop() ?? "";

    for (const line of newLines) {
      if (line.length === 0) continue; // ignore empty message
      if (line.startsWith(":")) continue; // ignore sse comment message
      if (line === "data: [DONE]") return; //

      const json = JSON.parse(line.substring(6)); // start with "data: "
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
    sendChatMessage();
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
  scrollTo(0, chatListDom.value.scrollHeight + 15000);
};

const test = () => {
  alert('test')
}

watch(messageList.value, () => nextTick(() => scrollToBottom()));
</script>

<style scoped>
pre {
  font-family: -apple-system, "Noto Sans", "Helvetica Neue", Helvetica,
    "Nimbus Sans L", Arial, "Liberation Sans", "PingFang SC", "Hiragino Sans GB",
    "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN",
    "Microsoft YaHei", "Wenquanyi Micro Hei", "WenQuanYi Zen Hei", "ST Heiti",
    SimHei, "WenQuanYi Zen Hei Sharp", sans-serif;
}

.noMarginRight {
  margin-right: 0;
}

.toolBar {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 5%;
  max-width: 25px;
  max-height: 25px;
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

.backgroundWrapper {
  /* height: 100vh; */
  min-height: 100vh;
  background-color: black;
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
}

/* 原始样式 */
.chatArea {
  min-height: 400px;
  height: 78vh;
}

/* 媒体查询 */
/* 在设备高度小于等于 500px 时的样式 */
@media (max-height: 500px) {
  .chatArea {
    min-height: 150px;
    /* 可根据需求调整 */
    height: 40vh;
    /* 可根据需求调整 */
  }
}

/* 在设备高度大于 500px 且小于等于 700px 时的样式 */
@media (min-height: 501px) and (max-height: 700px) {
  .chatArea {
    min-height: 200px;
    /* 可根据需求调整 */
    height: 58vh;
    /* 可根据需求调整 */
  }
}

/* 在设备高度大于 700px 且小于等于 1000px 时的样式 */
@media (min-height: 701px) and (max-height: 1000px) {
  .chatArea {
    min-height: 250px;
    /* 可根据需求调整 */
    height: 69vh;
    /* 可根据需求调整 */
  }
}

/* 在设备高度大于 1000px 且小于等于 1500px 时的样式 */
@media (min-height: 1001px) and (max-height: 1500px) {
  .chatArea {
    min-height: 300px;
    /* 可根据需求调整 */
    height: 78vh;
    /* 可根据需求调整 */
  }
}



.chatboxArea {
  padding-bottom: 0px;
}
</style>
