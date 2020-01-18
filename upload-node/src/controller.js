import path from "path";
import fs from "fs";
//import multer from "koa-multer";
import Router from "koa-router";
import util from "util";
const router = new Router();

const UPLOAD_DIR = path.resolve(__dirname, "..", "target"); // 大文件存储目录
//const upload = multer({ dest: UPLOAD_DIR });

const extractExt = filename =>
  filename.slice(filename.lastIndexOf("."), filename.length); // 提取文件后缀名

// 返回已经上传切片名
const createUploadedList = async fileHash =>
  fs.existsSync(`${UPLOAD_DIR}/${fileHash}`)
    ? await fs.readdirSync(`${UPLOAD_DIR}/${fileHash}`)
    : [];

router.post("/hasUplaod", async (ctx, next) => {
  //查询文件是否已上传成功或
  let { fileHash, filename } = ctx.request.body;

  const filePath = `${UPLOAD_DIR}/${filename}`;
  if (fs.existsSync(filePath)) {
    ctx.body = {
      code: 200,
      data: {
        upload: true //该文件上传已成功
      }
    };
  } else {
    ctx.body = {
      //该文件未上传或上传部分
      code: 200,
      data: {
        upload: false,
        hasUploadList: await createUploadedList(fileHash) //读取以上传的切片或为空
      }
    };
  }
});
router.post("/willUpload", async (ctx, next) => {
  const { name, filename, fileHash } = ctx.request.body.fields;
  const { file } = ctx.request.body.files;

  const filePath = `${UPLOAD_DIR}/${fileHash}${extractExt(filename)}`;
  const chunkDir = `${UPLOAD_DIR}/${fileHash}`;
  // 文件存在直接返回
  if (fs.existsSync(filePath)) {
    ctx.body = {
      code: 200,
      message: "file exist"
    };
    return;
  }
  // 切片目录不存在，创建切片目录
  if (!fs.existsSync(chunkDir)) {
    await fs.mkdirSync(chunkDir);
  }
  const reader = fs.createReadStream(file.path);
  const upStream = fs.createWriteStream(
    path.resolve(UPLOAD_DIR, `${fileHash}/${name}`)
  ); // 创建可写流
  reader.pipe(upStream); // 可读流通过管道写入可写流
  ctx.body = {
    code: 200,
    message: "upload success"
  };
});
router.post("/margeFile", async (ctx, next) => {
  let { fileHash, filename } = ctx.request.body;
  const ext = extractExt(filename);

  const chunkDir = `${UPLOAD_DIR}/${fileHash}`;
  let chunkList = await fs.readdirSync(chunkDir);
  chunkList.forEach(chunkPath => {
    fs.appendFileSync(
      `${UPLOAD_DIR}/${filename}`,
      fs.readFileSync(`${chunkDir}/${chunkPath}`)
    );
    fs.unlinkSync(`${chunkDir}/${chunkPath}`);
  });
  fs.rmdirSync(chunkDir, { recursive: true });

  ctx.body = {
    code: 200,
    message: "marge success"
  };
});
export default router;
