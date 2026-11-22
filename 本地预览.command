#!/bin/zsh
set -u
cd "$(dirname "$0")"
PORT=4173
URL="http://127.0.0.1:${PORT}/"

if curl -fsS --max-time 1 "$URL" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display dialog "没有找到 Python 3，无法启动本地预览。" buttons {"好"} default button "好"'
  exit 1
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/myresume-preview.log 2>&1 &
SERVER_PID=$!
sleep 0.6

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  osascript -e 'display dialog "本地预览启动失败，请查看 /tmp/myresume-preview.log。" buttons {"好"} default button "好"'
  exit 1
fi

open "$URL"
echo "作品集已启动：$URL"
echo "关闭这个窗口会停止本地预览。"
wait "$SERVER_PID"
