#!/bin/bash

# 视频时长限制器 - 快速测试脚本

echo "🎥 视频时长限制器 - 快速测试"
echo "================================"

# 检查Chrome是否安装
if command -v google-chrome >/dev/null 2>&1; then
    CHROME_CMD="google-chrome"
elif command -v google-chrome-stable >/dev/null 2>&1; then
    CHROME_CMD="google-chrome-stable"
elif command -v chromium >/dev/null 2>&1; then
    CHROME_CMD="chromium"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -d "/Applications/Google Chrome.app" ]; then
        CHROME_CMD="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    else
        echo "❌ 未找到Chrome浏览器，请手动安装扩展"
        exit 1
    fi
else
    echo "❌ 未找到Chrome浏览器，请手动安装扩展"
    exit 1
fi

echo "✅ 找到Chrome浏览器: $CHROME_CMD"

# 获取当前目录
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 扩展目录: $CURRENT_DIR"

# 打开Chrome扩展管理页面
echo "🔧 正在打开Chrome扩展管理页面..."
"$CHROME_CMD" --new-window "chrome://extensions/" &

# 等待一下
sleep 2

# 打开测试页面
echo "🧪 正在打开测试页面..."
"$CHROME_CMD" --new-tab "file://$CURRENT_DIR/test.html" &

echo ""
echo "📋 接下来的步骤："
echo "1. 在扩展管理页面启用'开发者模式'"
echo "2. 点击'加载已解压的扩展程序'"
echo "3. 选择目录: $CURRENT_DIR"
echo "4. 在测试页面中测试扩展功能"
echo ""
echo "💡 提示：建议先设置较短的时间限制（如30秒）便于测试"
echo ""
echo "📖 详细说明请查看 INSTALL.md 文件"

echo "✨ 测试脚本执行完成！"