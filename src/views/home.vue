<template>
  <div class="mainWrapper">
    <!-- WIP -->

    <div>
      <handWatch v-if="isHandWatchVisible" @close-watch="closeWatch" />
    </div>
    <!-- WIP -->
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
            v-for="item of messageList.filter((v) => v.role !== 'system')">
            <div class="flex justify-between items-center mb-2">
              <div class="font-bold">{{ roleAlias[item.role] }}.</div>
              <Copy class="invisible group-hover:visible" :content="item.content" />
            </div>
            <div>
              <div v-if="item.content" v-html="md.render(item.content)"></div>
              <Loding v-else />
            </div>
          </div>
          <!-- 填充一项以免被工具栏挡住 -->
          <div style="height:200px;"></div>
        </div>

        <div class="chatboxArea" style="background-color:black">
          <div v-show="isToolBarVisible">
            <span class="functionMenu">
              <button @click="togglePromptTemplateVisibility(0)">
                <p class="btn noMarginRight functionPromptTemplate">Prompt模板</p>
              </button>
            </span>
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

            <!-- <div class="SpeechRecognition"> -->
            <!-- SpeechRecognition 语音&声音识别 -->
            <!-- <SpeechRecognition @update-message="updateMessageContent" /> -->
            <!-- </div> -->

            <div class="toolBarWrapperRight">

              <!-- 后续添加更多按钮按照这个模板 -->
              <!-- <button class="toolBar" @click="toggleAutoSwitchHandWatch">
            🕰️
          </button> -->

              <button class="toolBar" @click="setMemoryLength">
                🕰️<br>记忆
              </button>

              <button class="toolBar" @click="togglePromptTemplateVisibility(1)">
                📋<br>模板
              </button>

              <button class="toolBar" @click="clearConversation">
                💭<br>刷新
              </button>

              <button class="toolBar" @click="toggleHandWatchVisibility">
                🕰️<br>手表
              </button>

              <button class="toolBar" @click="togglePicMode" :class="{ highlight: isGPT4Chat }">
                🖼️<br>图片
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

            <ImageUploader v-if="isGPT4Chat" :apiKey="apiKey" :messageContent="messageContent" @reply="handleReply"
              @replyAwait="handleReplyAwait">
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
import HandWatch from "@/components/HandWatch.vue";
// import SpeechRecognition from "@/components/SpeechRecognition.vue"

// 控制 handWatch 页面显示的状态变量
let isHandWatchVisible = ref(false);
let isPromptTemplateVisible = ref(false);
let isToolBarVisible = ref(false)
let isExtendChatboxVisible = ref(false)
let isGPT4Chat = ref(false)
let disableInput = ref(false)

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
    messageList.value = [];
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
      maxChatLength = intMemoryLength;
      console.log("助手记忆长度：", maxChatLength)
    } else {
      console.log("助手记忆长度：", maxChatLength)
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

  // 再关闭所有已经打开的工具栏
  toggleToolBarVisibility(0);
}

// 关闭延长输入框
const CloseExtendedChatbox = () => {
  if (isExtendChatboxVisible.value) {
    isExtendChatboxVisible.value = !isExtendChatboxVisible.value;
  }
}

const handleReplyAwait = () => {
  // console.log("@home.vue - handleReplyAwait: ", messageList)
  messageList.value.push({ "role": "user", "content": "等待图片上传结束..." })
  disableInput.value = true
}

const handleReply = (response: any, userInputedContent: string) => {
  // console.log("@home.vue获得ImageUploader的GPT回复消息：", response.choices[0].message)
  // 上面的信息拿到的内容是
  // {role: 'assistant', content: 'The image you provided appears to be a solid red s… please let me know how I can assist you further!'}

  messageList.value.push(response.choices[0].message)
  messageList.value[messageList.value.length - 2].content = userInputedContent
  // console.log("handleReply(userInputedContent),userInputedContent= ", userInputedContent)
  clearMessageContent()
  disableInput.value = false
}

// WIP

let apiKey = "";
let isConfig = ref(true);
let isTalking = ref(false);
let messageContent = ref("");
let maxChatLength = 6;
const chatListDom = ref<HTMLDivElement>();
const decoder = new TextDecoder("utf-8");
const roleAlias = { user: "我", assistant: "助手", system: "System" };
const preSetPrompt = '请尽可能在一句话内回答用户的问题，为了更好地帮助用户你可以问用户问题'
const defaultPrompt = <ChatMessage[]>[
  {
    role: "system",
    content: preSetPrompt,
  },
]
const messageList = ref<ChatMessage[]>(defaultPrompt);
let templateFromPromptTemplate = <ChatMessage[]>[];
// 更新templateFromPromptTemplate，这个变量一开始为空
// 用户输入过Prompt之后就会把整个对话保存进去
// 如果需要清空对话并保存Prompt的话清空 templateFromPromptTemplate.value[0] 之后的所有项目
// 然后把这个变量的值给messageList.value


// 这个是在用户编辑了prompt模板并保存之后调用的
const handleMessageListUpdate = (updatedMessageList: ChatMessage[]) => {
  // 判断对话历史有没有过长
  // if (updatedMessageList.length > maxChatLength) {
  //   updatedMessageList.splice(1, 1);
  // }

  // 更新 messageList
  messageList.value = updatedMessageList;

  // 更新templateFromPromptTemplate，这个变量一开始为空，现在用来保存用户输入的prompt
  templateFromPromptTemplate = updatedMessageList

  togglePromptTemplateVisibility(0);

};



const hideToBottomButtonOnScrolledToBottom = () => {
  // 防抖函数
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

  // WIP
  // 获取用户设备的分辨率
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 如果分辨率小于500*500，则设置isHandWatchVisible为true
  if (width < 500 && height < 500) {
    isHandWatchVisible.value = true;
  }
  // WIP

  // 监听是否滚动到底部
  // logOnScrollToBottom();
  hideToBottomButtonOnScrolledToBottom();

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

    if (messageList.value.length > maxChatLength) {
      messageList.value.splice(1, 1);
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
</style>
