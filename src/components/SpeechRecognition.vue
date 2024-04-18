<template>
  <div>
    <button @click="toggleRecognition">{{ isListening ? '停止语音识别' : '开始语音识别' }}</button>
    <p>{{ fullTranscript + interimTranscript }}</p>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  emits: ['update-message'], // 声明自定义事件
  setup(props, { emit }) {
    const isListening = ref(false);
    const fullTranscript = ref('');
    const interimTranscript = ref('');
    let recognition = null;

    onMounted(() => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("您的浏览器不支持 Web Speech API。请使用 Chrome 浏览器。");
        return;
      }

      recognition = new SpeechRecognition();
      recognition.lang = 'cmn-Hans-CN';
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = onRecognitionResult;
      recognition.onerror = onRecognitionError;
      recognition.onend = onRecognitionEnd;
    });

    const toggleRecognition = () => {
      if (!isListening.value) {
        recognition.start();
        isListening.value = true;
        console.log('语音识别已开始');
      } else {
        recognition.stop();
        isListening.value = false;
        console.log('语音识别已停止');
      }
    };

    const onRecognitionResult = (event) => {
      interimTranscript.value = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscript.value += transcriptPart + ' ';
          emit('update-message', fullTranscript.value); // 触发自定义事件
        } else {
          interimTranscript.value += transcriptPart;
        }
      }
    };

    const onRecognitionError = (event) => {
      console.log('识别错误:', event.error);
    };

    const onRecognitionEnd = () => {
      if (isListening.value) {
        console.log('意外停止，重新启动语音识别');
        recognition.start();
      }
    };

    return {
      isListening,
      fullTranscript,
      interimTranscript,
      toggleRecognition,
      onRecognitionResult,
      onRecognitionError,
      onRecognitionEnd
    };
  }
};
</script>
