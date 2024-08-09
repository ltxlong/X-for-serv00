#!/bin/bash

# 端口参数 （必填）
export WEBPORT=
export VMPORT=

# web.js 参数 （必填）
export UUID=
export WSPATH=

# ARGO 隧道参数（如需固定 ARGO 隧道，请把 ey 开头的 ARGO 隧道的 token 填入 ARGO_AUTH ，仅支持这一种方式固定，隧道域名代理的协议为 HTTP ，端口为 VMPORT 同端口。如果不固定 ARGO 隧道，请删掉ARGO_DOMAIN那行，保留ARGO_AUTH这行。）
export ARGO_AUTH=''
export ARGO_DOMAIN=

# 网页的用户名和密码（可不填，默认为 admin 和 password ，如果不填请删掉这两行）
export WEB_USERNAME=
export WEB_PASSWORD=

# domain里的工作目录，事先创建好这个目录，这个目录里有start.sh、server.js、keep.sh等（必填）
# 格式：/home/用户名（登录的）/domains/用户名（登录的，但好像全是小写字母）.serv00.net/xray_work_base
export DOMAIN_WORKDIR=

# 程序工作目录 （必填）
# 格式：/home/用户名（登录的）/xray
export WORKDIR=

# keep server.js
if ! pgrep -f "server.js" > /dev/null
then
  nohup node ${WORKDIR}/server.js >/dev/null 2>&1 &
  echo "server.js restarted"
fi

sleep 10

# keep web.js
if ! pgrep -f "web.js" > /dev/null
then
  nohup ${WORKDIR}/web.js -c ${WORKDIR}/config.json >/dev/null 2>&1 &
  echo "web.js restarted"
fi

# keep argo tunnel
if ! pgrep -f "cloudflared tunnel" > /dev/null
then
  nohup ${WORKDIR}/cloudflared tunnel --edge-ip-version auto --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &
  echo "cloudflared tunnel restarted"
fi

echo "-----------------------------------------"
echo "keep service finished~"