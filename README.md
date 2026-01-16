# QR Code Generator

送货单二维码生成器 - 批量生成工具

## 功能特性

- ✅ 支持两种类型的二维码生成
  - 送货单 QR Code（DN No., Vendor ID, PO No.）
  - 送货单明细 QR Code（Full PO No., Qty, Unit, Unique ID, PN）
- ✅ Excel模板下载
- ✅ 批量数据导入
- ✅ 高清二维码生成（300x300）
- ✅ 自动文件命名
- ✅ 批量下载功能

## 本地使用

直接用浏览器打开 `index.html` 即可使用。

## 部署方式

### 方式1：GitHub Pages（推荐）

1. 创建GitHub仓库
2. 上传所有文件
3. 在仓库设置中启用GitHub Pages

### 方式2：Netlify

拖拽整个文件夹到 netlify.com 即可部署

### 方式3：任何静态网站托管

本项目是纯静态HTML/CSS/JS，可以部署到任何静态托管平台。

## 技术栈

- HTML5
- CSS3（玻璃态设计）
- JavaScript（原生）
- qrcode-generator.js
- SheetJS（Excel处理）

## 文件说明

- `index.html` - 主页面
- `styles.css` - 样式文件
- `script.js` - 核心逻辑
- `qrcode.min.js` - QR码生成库

## 浏览器支持

- Chrome/Edge（推荐）
- Firefox
- Safari
- 其他现代浏览器

## License

MIT
