# Table of Page Content

!License: MIT

Table of Page Content 是一个浏览器扩展，可以为当前网页自动生成目录。它支持多种网页结构，包括常规 HTML、iframe 和 micro-app。

## 功能特点

- 自动生成网页目录
- 支持常规 HTML、iframe 和 micro-app 内容
- 可拖拽移动和调整大小的目录窗口
- 黑名单功能，可排除特定网站
- 支持折叠和展开目录
- 平滑滚动到目标标题

## 安装

1. 下载本仓库的 ZIP 文件或克隆仓库到本地
2. 打开 Chrome 浏览器，进入扩展管理页面 (chrome://extensions/)
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择项目文件夹

## 使用方法

1. 安装扩展后，浏览任意网页时会自动生成目录
2. 点击目录中的项目可快速跳转到对应位置
3. 使用折叠按钮（+/-）可以展开或收起目录
4. 拖动目录标题可以移动目录位置
5. 拖动目录右下角可以调整目录大小

## 设置黑名单

1. 点击扩展图标，选择"选项"
2. 在文本框中每行输入一个要屏蔽的网址，支持通配符（如 *.example.com）
3. 点击"保存"按钮应用更改

## 开发

本项目使用原生 JavaScript 开发，无需额外的构建步骤。

主要文件说明：
- `content.js`: 包含目录生成和操作的核心逻辑
- `background.js`: 处理扩展图标点击和右键菜单功能
- `options.js`: 管理黑名单设置
- `styles.css`: 定义目录的样式

## 贡献

欢迎提交 Issue 或 Pull Request 来帮助改进这个项目。

## 许可证

本项目采用 MIT 许可证。详情请见 LICENSE 文件。
