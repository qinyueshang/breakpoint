import Koa from "koa";
import Router from "koa-router";
import cors from "koa2-cors";
import koaBody from "koa-body";
import path from "path";
import fs from "fs";
import controller from "./controller.js";

const PORT = 3000;
const app = new Koa();
const router = new Router();

app.use(
  cors({
    origin: function(ctx) {
      if (ctx.url === "/test") {
        return "*"; // 允许来自所有域名请求
      }
      return "http://localhost:8080";
    },
    exposeHeaders: ["WWW-Authenticate", "Server-Authorization"],
    maxAge: 5,
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"]
  })
);
// app.use(async (ctx, next) => {
//   ctx.set("Access-Control-Allow-Origin", "*");
//   ctx.set("Access-Control-Allow-Methods", "OPTIONS, GET, PUT, POST, DELETE");
//   ctx.set("Content-Type", "application/json;charset=utf-8");
//   ctx.set(
//     "Access-Control-Allow-Headers",
//     "x-requested-with, accept, origin, content-type"
//   );
//   await next();
// });

router.use("/upload", controller.routes(), controller.allowedMethods());

app
  .use(
    koaBody({
      multipart: true
      // formidable: {
      //   maxFileSize: 1000 * 1024 * 1024, // 设置上传文件大小最大限制，默认2M
      //   uploadDir: path.join(__dirname, "..", "target"), // 设置文件上传目录
      //   onFileBegin: (name, file) => {
      //     const fp = path.join(__dirname, "..", "target");
      //     if (!fs.existsSync(fp)) {
      //       // 检查是否有“target”文件夹
      //       fs.mkdirSync(fp); // 没有就创建
      //     }
      //   }
      // }
    })
  )
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(PORT, () => {
    console.log(`success port on ${PORT}`);
  });
