const username = process.env.WEB_USERNAME || "admin";
const password = process.env.WEB_PASSWORD || "password";
const port = process.env.WEBPORT;
const UUID = process.env.UUID;
const DOMAIN_WORKDIR = process.env.DOMAIN_WORKDIR;
const WORKDIR = process.env.WORKDIR;
const express = require("express");
const fs = require('fs');
const app = express();
var exec = require("child_process").exec;
const { createProxyMiddleware } = require("http-proxy-middleware");
const auth = require("basic-auth");

function getFourthLine(filename, callback) {
    fs.readFile(filename, 'utf8', function(err, data) {
        if (err) {
            return callback(err);
        }
        const lines = data.split('\n');
        if (lines.length >= 4) {
            callback(null, lines[3]); 
        } else {
            callback(new Error('Subscribution does not have four lines.'));
        }
    });
}

app.get("/", function (req, res) {
  res.send("hello world");
});

// 设置路由
app.get(`/${UUID}/vm`, (req, res) => {
    getFourthLine(`${WORKDIR}/list`, (err, sub) => {
        if (err) {
            return res.status(500).send('Error reading file.');
        }
        res.send(sub);
    });
});

// 页面访问密码
app.use((req, res, next) => {
  const user = auth(req);
  if (user && user.name === username && user.pass === password) {
    return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Node"');
  return res.status(401).send();
});

app.get("/status", function (req, res) {
  let cmdStr =
    "ps -aux";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.type("html").send("<pre>命令行执行错误：\n" + err + "</pre>");
    } else {
      res.type("html").send("<pre>获取系统进程表：\n" + stdout + "</pre>");
    }
  });
});

//获取节点数据
app.get("/list", async function (req, res) {
  let cmdStr = `cat ${WORKDIR}/list`;
  const sub = UUID;

  const fileExists = (path) => {
    return new Promise((resolve, reject) => {
      fs.access(path, fs.constants.F_OK, (err) => {
        resolve(!err);
      });
    });
  };

  const waitForFile = async (path, retries, interval) => {
    for (let i = 0; i < retries; i++) {
      if (await fileExists(path)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  };

  const fileReady = await waitForFile(`${WORKDIR}/list`, 30, 1000);

  if (!fileReady) {
    res.type("html").send("<pre>文件未生成</pre>");
    return;
  }

  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.type("html").send("<pre>命令行执行错误：\n" + err + "</pre>");
    } else {
      const fullUrl = `${req.protocol}://${req.get('host')}/${sub}/vm`;
      res.type("html").send("<pre>V2ray订阅地址：" + fullUrl + "\n\n节点数据：\n\n" + stdout + "</pre>");
    }
  });
});
  
// keepalive begin
function keep_service() {
  exec(`bash ${DOMAIN_WORKDIR}/keep.sh 2>&1 &`, function (err, stdout, stderr) {
    if (err) {
      console.log("保活-keep-命令行执行错误:" + err);
    } else {
      console.log("保活-keep-命令行执行成功!");
    }
  });
}

//web保活
function keep_web_alive() {
  exec("pgrep -laf web.js", function (err, stdout, stderr) {
    // 1.查后台系统进程，保持唤醒
    if (stdout.includes("web.js")) {
      console.log("web 正在运行");
    } else {
      //web 未运行，命令行调起
      exec(
        `chmod +x ${WORKDIR}/web.js && ${WORKDIR}/web.js -c ${WORKDIR}/config.json >/dev/null 2>&1 &`,
        function (err, stdout, stderr) {
          if (err) {
            console.log("保活-调起web-命令行执行错误:" + err);
          } else {
            console.log("保活-调起web-命令行执行成功!");
          }
        }
      );
    }
  });
}

//Argo保活
function keep_argo_alive() {
  exec("pgrep -laf cloudflared", function (err, stdout, stderr) {
    // 1.查后台系统进程，保持唤醒
    if (stdout.includes("cloudflared tunnel")) {
      console.log("Argo 正在运行");
    } else {
      //Argo 未运行，命令行调起
      exec(`${WORKDIR}/cloudflared tunnel --edge-ip-version auto --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &`, function (err, stdout, stderr) {
        if (err) {
          console.log("保活-调起Argo-命令行执行错误:" + err);
        } else {
          console.log("保活-调起Argo-命令行执行成功!");
        }
      });
    }
  });
}

app.get("/alive", function (req, res) {
  keep_service();
  res.type("html").send("<pre>已调用保活方法</pre>");
});

app.use(
  "/",
  createProxyMiddleware({
    changeOrigin: true, // 默认false，是否需要改变原始主机头为目标URL
    onProxyReq: function onProxyReq(proxyReq, req, res) {},
    pathRewrite: {
      // 请求中去除/
      "^/": "/",
    },
    target: "http://127.0.0.1:${PORT1}/", // 需要跨域处理的请求地址
    ws: true, // 是否代理websockets
  })
);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
