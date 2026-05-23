#!/bin/bash
set -e

cd "$(dirname "$0")"

# 如果 venv 不存在，自动创建并安装依赖
if [ ! -d "venv" ]; then
  echo "首次运行：创建虚拟环境..."
  python3 -m venv venv
  echo "安装依赖..."
  venv/bin/pip install -q -r requirements.txt
  echo "依赖安装完成。"
fi

source venv/bin/activate
FLASK_PORT="${FLASK_PORT:-5001}"
export FLASK_PORT
echo "启动 AI 知识图谱系统，访问地址：http://localhost:${FLASK_PORT}"
cd web
python app.py
