<template>
  <div style="display:flex;width:60%">
    <form @submit.prevent="sendMessage">
      <div style="display:flex;">
        <input style="width:50%;height:50px;" type="file" required @change="handleFileChange">
        <button style="width:50%;height:50px;" type="submit">发图</button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, watch, toRefs, watchEffect } from 'vue';
import axios from 'axios';

export default {
  props: {
    apiKey: {
      type: String,
      required: true
    },
    messageContent: String
  },
  setup(props, { emit }) {
    const { messageContent, apiKey } = toRefs(props); // 解构 props 为响应式变量
    const messageText = ref('');
    const responseText = ref('');
    let imageInputRef = ref(null); // 创建一个 ref 来引用文件输入框

    const sendMessage = async () => {
      // alert("@imageUploader.vue: sendMessage() ")
      emit('replyAwait')
      await watchEffect(() => {
        // console.log("@watchEffect: ", imageInputRef.value)
        if (imageInputRef.value) {
          // alert("@ImageUploader.vue: Triggered")


          const imageData = new FormData();
          const imageInput = imageInputRef.value; // 使用 ref 引用文件输入框
          imageData.append('image', imageInput);

          // Generate random name
          const randomImageName = generateRandomName(10);
          imageData.append('name', randomImageName);

          imageData.append('key', 'dbc888e27fc605c2a820eb16878983d7');
          imageData.append('expiration', 3600);

          fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: imageData,
          })
            .then(response => response.json())
            .then(result => {
              const uploadedImageURL = result.data.url;

              const payload = {
                model: "gpt-4-turbo",
                messages: [{
                  role: "user",
                  content: [{
                    type: "text",
                    text: messageText.value
                  }, {
                    type: "image_url",
                    image_url: {
                      url: uploadedImageURL
                    }
                  }]
                }],
                max_tokens: 150
              };

              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.value}`
              };

              // const testExample = { role: 'assistant', content: 'The image you provided appears to be a solid red s… please let me know how I can assist you further!' }
              // emit('reply', testExample, "This jaenvaeversosblfd"); // Pass the reply back to the parent component

              console.log("@ImageUploader,Payload: ", payload)

              axios.post('https://api.chatanywhere.com.cn/v1/chat/completions', payload, { headers })
                .then(response => {
                  responseText.value = response.data;
                  emit('reply', response.data, messageText.value); // Pass the reply back to the parent component
                })
                .catch(error => {
                  console.error('Error:', error);
                  alert('Failed to get response. Check console for details.');
                  if (error.response) {
                    console.log('Response data:', error.response.data);
                    console.log('Response status:', error.response.status);
                    console.log('Response headers:', error.response.headers);
                  }
                });
            })
            .catch(error => {
              console.error('Error:', error);
              alert('Failed to upload image.');
            });
        }
      });
    };

    const generateRandomName = (length) => {
      const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };

    const handleFileChange = (event) => {
      if (event.target.files.length > 0) {
        const file = event.target.files[0];
        imageInputRef.value = file
        // Do something with the file if needed
      }
    };

    watch(messageContent, (newVal) => {
      messageText.value = newVal
    });

    return {
      messageText,
      responseText,
      sendMessage,
      handleFileChange,
      imageInputRef // 返回文件输入框的 ref
    };
  }
}
</script>
