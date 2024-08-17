#!/bin/bash

# 端口参数 （必填）
export WEBPORT=
export VMPORT=

# web.js 参数 （必填）
export UUID=
export WSPATH=serv00

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

# 启动程序

IP_ADDRESS=$(devil vhost list public | awk '/Public addresses/ {flag=1; next} flag && $1 ~ /^[0-9.]+$/ {print $1; exit}' | xargs echo -n)
mkdir -p ${WORKDIR}

cd ${WORKDIR} && \
[ ! -e ${WORKDIR}/entrypoint.sh ] && wget https://raw.githubusercontent.com/k0baya/X-for-serv00/main/entrypoint.sh -O ${WORKDIR}/entrypoint.sh && chmod +x ${WORKDIR}/entrypoint.sh && \
[ ! -e ${WORKDIR}/web.js ] && mkdir -p tmp && cd tmp && wget https://github.com/XTLS/Xray-core/releases/latest/download/Xray-freebsd-64.zip && unzip Xray-freebsd-64.zip && cd .. && mv -f ./tmp/xray ./web.js && rm -rf tmp && chmod +x web.js && \
[ ! -e ${WORKDIR}/package.json ] && wget https://raw.githubusercontent.com/k0baya/X-for-serv00/main/package.json -O ${WORKDIR}/package.json && \

cp ${DOMAIN_WORKDIR}/server.js ${WORKDIR}/server.js
echo 'Installing dependence......Please wait for a while.' && \
npm install >/dev/null 2>&1 && \

nohup node ${WORKDIR}/server.js >/dev/null 2>&1 && \
bash ./entrypoint.sh && \
sleep 30 && echo "X-for-Serv00 is trying to start up, please visit http://${IP_ADDRESS}:${WEBPORT} to get the configuration."
