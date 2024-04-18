<template>
  <div class="mainWrapper">

    <!-- WIP -->
    <div>
      <handWatch v-if="isHandWatchVisible" @close-watch="closeWatch" />
    </div>
    <!-- WIP -->


    <div class="flex flex-col h-screen">


      <div v-if="messageList.length == 1" class="flex flex-nowrap fixed w-full items-baseline top-0 px-6 py-4">
        <div class="text-2xl font-bold">ChatGPT</div>
        <div class="ml-4 text-sm">
          OpenAI 的 ChatGPT
        </div>
        <div class="ml-auto px-3 py-2 text-sm cursor-pointer hover:bg-white rounded-md" @click="clickConfig()">
          🛠️
        </div>
      </div>



      <div class="flex-1 mx-2 mt-20 mb-2" ref="chatListDom">
        <div class="group flex flex-col px-4 py-3 hover:bg-slate-100 rounded-lg"
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


      <!-- WIP -->

      <span v-show="isToolBarVisible">
        <button @click="toggleHandWatchVisibility">
          <p class="input noMarginRight">手表</p>
        </button>

        <button @click="togglePromptTemplateVisibility">
          <p class="input noMarginRight">Prompt模板</p>
        </button>
      </span>
      <button class="toolBar" @click="toggleToolBarVisibility"> {{
        isToolBarVisible ? "🚪" : "⚙️" }} </button>
      <!-- WIP -->


      <div class="sticky bottom-0 w-full p-6 pb-8">
        <!-- WIP -->
        <promptTemplate v-show="isPromptTemplateVisible" :messageList="messageList"
          @update:messageList="handleMessageListUpdate" @update:hidePromptTemplate="togglePromptTemplateVisibility" />
        <!-- WIP -->
        <div class="-mt-2 mb-2 text-sm text-gray-500" v-if="isConfig">
          请输入 API Key：
        </div>
        <div class="flex">
          <input class="input" :type="isConfig ? 'password' : 'text'" :placeholder="isConfig ? 'sk-xxxxxxxxxx' : '请输入'"
            v-model="messageContent" @keydown.enter="isTalking || sendOrSave()" />
          <button class="" :disabled="isTalking" @click="sendOrSave()">
            {{ isConfig ? "保存" : "发送" }}
          </button>
        </div>
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

// 控制 handWatch 页面显示的状态变量
let isHandWatchVisible = ref(false);
let isPromptTemplateVisible = ref(false);
let isToolBarVisible = ref(false)

// 切换 handWatch 页面显示的函数
const toggleHandWatchVisibility = () => {
  isHandWatchVisible.value = !isHandWatchVisible.value;
};

const togglePromptTemplateVisibility = () => {
  isPromptTemplateVisible.value = !isPromptTemplateVisible.value
}

const toggleToolBarVisibility = () => {
  isToolBarVisible.value = !isToolBarVisible.value
  if (isToolBarVisible.value == false) {
    // addhere
    isHandWatchVisible.value = false;
    isPromptTemplateVisible.value = false;
    isToolBarVisible.value = false
  }
}

function closeWatch() {
  isHandWatchVisible.value = false;
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
  }，
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
  width: 8%;
  max-height: 8%;
}
</style>
