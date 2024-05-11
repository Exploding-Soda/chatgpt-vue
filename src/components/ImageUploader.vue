<template>
  <div style="ImageUploaderWrapper">
    <form class="fileForm" @submit.prevent="sendMessage">
      <div class="fileWrapper">
        <!-- <input style="width:20%;height:50px;" type="file" required @change="handleFileChange"> -->
        <input type="file" class="file-button block" @change="handleFileChange">
        <button type="submit">发图</button>
      </div>
    </form>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';
import axios from 'axios';

export default {
  props: {
    apiKey: {
      type: String,
      required: true
    },
    messageContent: String,
    maxChatLength: Number,
    messageList: {
      type: Array,
      required: false,
      default: []
    }
  },
  setup(props, { emit }) {
    const imageInputRef = ref(null);

    // 将文件转换为 base64 并压缩图片
    function compressImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (event) {
          const img = new Image();
          img.src = event.target.result;

          img.onload = function () {
            const aspectRatio = img.width / img.height;
            // 高度将会是maxHeight*1.78
            const maxHeight = 768;
            const maxWidth = maxHeight * aspectRatio;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (img.height > maxHeight) {
              canvas.height = maxHeight;
              canvas.width = maxWidth;
            } else {
              canvas.height = img.height;
              canvas.width = img.width;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg');
            resolve(compressedBase64);
          };
          img.onerror = reject;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // 更新 imageInputRef 当用户选择文件
    function handleFileChange(event) {
      imageInputRef.value = event.target;
    }

    // 发送消息
    const sendMessage = async () => {
      emit('letWait');
      let payload = {
        model: "gpt-4-turbo",
        messages: [],
        max_tokens: 500
      };

      let base64Image = null;
      let file = null;

      payload.messages = props.messageList
      // 如果没有图片，那么在payload里塞入正常对话的内容
      if (imageInputRef.value && imageInputRef.value.files[0]) {
        // 有图片的情况
        file = imageInputRef.value.files[0];
        base64Image = await compressImage(file);  // 使用压缩图片的功能
        payload.messages.push(
          {
            role: "user",
            content: [
              {
                type: "text",
                text: props.messageContent
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        )
        imageInputRef.value = ""

      } else {
        // 没有图片的情况
        payload.messages.push(
          { role: "user", content: props.messageContent })
      }

      // 使用 axios 发送请求
      axios.post('https://api.chatanywhere.com.cn/v1/chat/completions', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${props.apiKey}`
        }
      })
        .then(response => {
          const responseContent = response.data.choices[0].message
          // console.log("@ImageUploader: response = ", responseContent)
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
    };

    return { sendMessage, imageInputRef, handleFileChange, sendMessage };
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