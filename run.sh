#!/bin/bash
set -e
cd "$(dirname "$0")"

# ── 首次运行：创建虚拟环境并安装构建依赖 ──────────────────────
if [ ! -d "venv" ]; then
  echo "首次运行：创建虚拟环境..."
  python3 -m venv venv
  echo "安装构建依赖..."
  venv/bin/pip install -q -r requirements.txt
  echo "依赖安装完成。"
fi

# ── 构建 data.js（如果尚未构建或指定 --build） ─────────────────
if [ ! -f "web/static/js/data.js" ] || [ "$1" = "--build" ]; then
  echo "编译知识库数据..."
  venv/bin/python build.py
fi

# ── 启动 HTTP 服务器 ──────────────────────────────────────────
echo ""
echo "=============================================="
echo "  AI 知识图谱系统"
echo "  访问地址: http://localhost:5001"
echo "  按 Ctrl+C 停止"
echo "=============================================="
echo ""

cd web
python3 -m http.server 5001
