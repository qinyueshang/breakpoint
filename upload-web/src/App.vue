<template>
  <div id="app">
    <div>
      <input type="file" @change="handleFile" />
      <el-button @click="handleUpload" :disabled="uploadDisabled">上传</el-button>
      <el-button @click="handleResume" v-if="status === Status.pause">恢复</el-button>
      <el-button @click="handlePause" v-if="status === Status.uploading">暂停</el-button>
    </div>

    <div>
      <div>上传进度</div>
      <el-progress :percentage="fakeUploadPercentage"></el-progress>
    </div>
  </div>
</template>

<script>
import SparkMD5 from "spark-md5";

const Status = {
  wait: "wait",
  pause: "pause",
  uploading: "uploading"
};
const chunkSize = 1 * 1024 * 1024; //切片大小
export default {
  name: "app",
  data() {
    return {
      Status,
      container: {
        file: null,
        hash: "",
        fileList: [],
        chunksLength: 0, //切片数量
        successUpload: 0 //成功上传的切片数量
      },
      requestList: [],
      status: Status.wait,
      fakeUploadPercentage: 0
    };
  },
  computed: {
    uploadDisabled() {
      return (
        !this.container.file ||
        [Status.pause, Status.uploading].includes(this.status)
      );
    }
  },
  methods: {
    handlePause() {
      this.status = Status.pause;
      this.requestList.forEach(xhr => {
        xhr && xhr.abort();
      });
    },
    async handleResume() {
      this.status = Status.uploading;
      const { data } = await this.hasUpload(
        this.container.file.name,
        this.container.hash
      );
      await this.uploadChunk(data.hasUploadList || []);
    },
    //xhr
    request({
      url,
      method = "POST",
      data,
      headers = {},
      onProgress,
      requestList
    }) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.upload.onprogress = onProgress;
        Object.keys(headers).forEach(item => {
          xhr.setRequestHeader(item, headers[item]);
        });
        xhr.send(data);
        xhr.onload = e => {
          if (e.target.status == 200 || e.target.status == 304) {
            if (requestList && requestList.length > 0) {
              const xhrIndex = requestList.findIndex(item => item === xhr);
              requestList.splice(xhrIndex, 1);
            }
            resolve({
              data: e.target.response
            });
          }
        };
        requestList && requestList.push(xhr);
      });
    },
    //文件哈希
    async hashFile() {
      return new Promise((resolve, reject) => {
        const spark = new SparkMD5.ArrayBuffer();
        const reader = new FileReader();
        reader.readAsArrayBuffer(this.container.file);
        reader.onload = e => {
          spark.append(e.target.result);
          const sparkMd5 = new SparkMD5();
          sparkMd5.append(spark.end());
          sparkMd5.append(this.container.file.name);
          resolve(sparkMd5.end());
        };
      });
    },
    //文件切片
    async fileSlice(file) {
      const fileList = [];
      let chunksLength = Math.ceil(file.size / chunkSize);
      let currentIndex = 0;
      while (currentIndex < chunksLength) {
        fileList.push({
          file: file.slice(
            currentIndex * chunkSize,
            (currentIndex + 1) * chunkSize
          )
        });
        currentIndex += 1;
      }
      this.container.fileList = fileList;

      this.container.chunksLength = chunksLength;
      console.log(fileList, chunksLength);
    },
    async handleUpload() {
      if (!this.container.file) return;
      this.status = Status.uploading;
      await this.fileSlice(this.container.file);
      this.container.hash = await this.hashFile(this.container.fileList);
      let { data } = await this.hasUpload(
        this.container.file.name,
        this.container.hash
      );

      if (data.upload) {
        this.$message.success("秒传：上传成功");
        return;
      }
      this.uploadList = this.container.fileList.map(({ file }, index) => ({
        fileHash: this.container.hash,
        index,
        name: this.container.hash + "-" + index,
        chunk: file,
        size: file.size
      }));
      this.container.successUpload = data.hasUploadList.length;
      await this.uploadChunk(data.hasUploadList || []);
    },
    async uploadChunk(hasUploadList) {
      let requestList = this.uploadList
        .filter(({ name }) => !hasUploadList.includes(name))
        .map(data => {
          let { chunk, name, index, fileHash } = data;
          let formData = new FormData();
          formData.append("name", name);
          formData.append("filename", this.container.file.name);
          formData.append("fileHash", fileHash);
          formData.append("file", chunk);
          return { formData, index };
        })
        .map(({ formData, index }) =>
          this.request({
            url: "/upload/willUpload",
            data: formData,
            onProgress: this.progressHandler,
            requestList: this.requestList
          })
        );

      await Promise.all(requestList);
    },
    async hasUpload(filename, fileHash) {
      let { data } = await this.request({
        url: "/upload/hasUplaod",
        headers: {
          "Content-Type": "application/json;charset=utf-8"
        },
        data: JSON.stringify({
          filename,
          fileHash
        })
      });
      return JSON.parse(data);
    },
    handleFile(event) {
      let file = event.target.files[0];
      if (!file) return;
      this.container.file = file;
    },
    progressHandler(e) {
      if (e.loaded / e.total == 1) {
        this.container.successUpload += 1;
        this.fakeUploadPercentage =
          (this.container.successUpload / this.container.chunksLength) * 100;
      }
    }
  },
  watch: {
    fakeUploadPercentage(newVal, oldVal) {
      if (newVal == 100) {
        let res = this.request({
          url: "/upload/margeFile",
          headers: {
            "Content-Type": "application/json;charset=utf-8"
          },
          data: JSON.stringify({
            filename: this.container.file.name,
            fileHash: this.container.hash
          })
        });
        if (res.code == 200) {
          this.status = Status.wait;
        }
      }
    }
  }
};
</script>

<style></style>
