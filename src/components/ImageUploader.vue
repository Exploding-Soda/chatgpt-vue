<template>
  <div style="ImageUploaderWrapper">
    <form class="fileForm" @submit.prevent="sendMessage">
      <div class="fileWrapper">
        <!-- <input style="width:20%;height:50px;" type="file" required @change="handleFileChange"> -->
        <input type="file" class="file-button block" required @change="handleFileChange">
        <button type="submit">发图</button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref } from 'vue';
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
    const imageInputRef = ref(null);

    // 将文件转换为 base64
    function getBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    }

    // 更新 imageInputRef 当用户选择文件
    function handleFileChange(event) {
      imageInputRef.value = event.target;
    }

    // 发送消息
    const sendMessage = async () => {
      if (imageInputRef.value && imageInputRef.value.files[0]) {
        // emit wait
        emit('letWait');

        const file = imageInputRef.value.files[0];
        const base64Image = await getBase64(file);  // 这里仍然会生成 base64，但我们将其作为 URL 对象的形式发送
        const payload = {
          model: "gpt-4-turbo",  // 这个模型名称可能需要根据实际情况调整
          messages: [{
            role: "user",
            content: [{
              type: "text",
              text: props.messageContent  // 确保你传递了有效的文本内容
            }, {
              type: "image_url",
              image_url: {  // 根据错误消息，我们需要确保这里是一个对象，包含一个 url 键
                url: base64Image
              }
            }]
          }],
          max_tokens: 500
        };

        // 使用 axios 发送请求
        axios.post('https://api.chatanywhere.com.cn/v1/chat/completions', payload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${props.apiKey}`
          }
        })
          .then(response => {
            const responseContent = response.data.choices[0].message
            emit('reply', responseContent, props.messageContent, base64Image); // 通过事件发送响应
          })
          .catch(error => {
            console.error('Error:', error);
            if (error.response) {
              // 打印从服务器返回的错误信息
              console.log('Error data:', error.response.data);
              console.log('Error status:', error.response.status);
              console.log('Error headers:', error.response.headers);
            }
          });
      } else {
        console.log("No file selected or file input is missing");
      }
    };


    return { sendMessage, imageInputRef, handleFileChange };
  }
}
</script>


<style scoped>
.ImageUploaderWrapper {
  display: flex;
}

.fileForm {
  display: flex;
  justify-content: right;
}

.fileWrapper {
  display: flex;
  justify-content: right;
}

.file-button {
  width: 50%;
  font-size: 10px;
}

.file-button::file-selector-button {
  font-weight: bold;
  color: white;
  background: rgb(59, 59, 59);
  font-size: 10px;
  border: 0;
  border-radius: 10em;
  padding: 8px 16px;
  text-align: center;
}

.block::file-selector-button {
  display: block;
}
</style>