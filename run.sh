#!/bin/bash
set -e
cd "$(dirname "$0")"

# ── 依赖检查 ──────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "错误：需要 Python 3.8+，未找到 python3 命令。"
  exit 1
fi

# ── 首次运行：创建虚拟环境并安装依赖 ──────────────────────────
if [ ! -d "venv" ]; then
  echo "首次运行：创建虚拟环境..."
  python3 -m venv venv
  echo "安装构建依赖..."
  venv/bin/pip install -q -r requirements.txt
  echo "依赖安装完成。"
fi

# ── 透传所有参数给 build.py ──────────────────────────────────
#   bash run.sh               → python build.py --serve
#   bash run.sh --watch       → python build.py --watch --serve
#   bash run.sh --export all  → python build.py --export all --serve
#   bash run.sh --no-serve    → python build.py（仅编译）

EXTRA=()
SERVE=true
for arg in "$@"; do
  if [ "$arg" = "--no-serve" ]; then
    SERVE=false
  else
    EXTRA+=("$arg")
  fi
done

venv/bin/python build.py "${EXTRA[@]}"

if $SERVE; then
  echo ""
  echo "启动服务器: http://localhost:5001"
  echo "按 Ctrl+C 停止"
  cd web
  python3 -m http.server 5001
fi
