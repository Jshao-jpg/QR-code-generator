# script.js集成指南

## 需要修改的位置

### 1. 在generateAllDnQRCodes函数中集成重复检测和数字验证

在函数开头添加：
```javascript
// 检测重复数据
const duplicates = checkDnDuplicates(rows);
```

在成功消息后添加：
```javascript
// 如果有重复，延迟显示警告
if (duplicates.length > 0) {
    setTimeout(() => {
        showToast(`⚠️ 警告：第 ${duplicates.join(', ')} 行数据完全重复！`, 'error');
    }, 3500);
}
```

### 2. 在generateAllDetailQRCodes函数中集成重复检测和Qty验证

在函数中验证Qty字段：
```javascript
// 验证Qty字段
const qtyInput = row.querySelector('.qty');
if (qtyInput && qtyInput.value.trim()) {
    const validation = validateQty(qtyInput.value);
    if (!validation.valid) {
        qtyInput.classList.add('error');
        errorMessages.push(`第${index + 1}行：${validation.message}`);
        setTimeout(() => qtyInput.classList.remove('error'), 3000);
        continue;
    }
}
```

添加重复检测：
```javascript
const duplicates = checkDetailDuplicates(rows);
if (duplicates.length > 0 && successCount > 0) {
    setTimeout(() => {
        showToast(`⚠️ 警告：第 ${duplicates.join(', ')} 行数据完全重复！`, 'error');
    }, 3500);
}
```

### 3. 为所有canvas添加点击预览事件

在attachDnRowEvents和attachDetailRowEvents中添加：
```javascript
const canvas = row.querySelector('.qr-canvas');
canvas.addEventListener('click', () => {
    if (canvas.classList.contains('visible')) {
        showQr Preview(canvas);
    }
});
```

### 4. 在页面底部添加所有新按钮的事件监听

```javascript
// DN区域新按钮
const copyAllDnBtn = document.getElementById('copyAllDn');
const exportSvgDnBtn = document.getElementById('exportSvgDn');
const exportZipDnBtn = document.getElementById('exportZipDn');
const clearAllDnBtn = document.getElementById('clearAllDn');

if (copyAllDnBtn) copyAllDnBtn.addEventListener('click', () => copyAllQrCodes(dnTableBody));
if (exportSvgDnBtn) exportSvgDnBtn.addEventListener('click', () => exportAllQrCodesAsSvg(dnTableBody, 'DN'));
if (exportZipDnBtn) exportZipDnBtn.addEventListener('click', () => exportQrCodesAsZip(dnTableBody, 'DN'));
if (clearAllDnBtn) clearAllDnBtn.addEventListener('click', () => clearAllDnData(dnTableBody));

// Detail区域新按钮
const copyAllDetailBtn = document.getElementById('copyAllDetail');
const exportSvgDetailBtn = document.getElementById('exportSvgDetail');
const exportZipDetailBtn = document.getElementById('exportZipDetail');
const clearAllDetailBtn = document.getElementById('clearAllDetail');

if (copyAllDetailBtn) copyAllDetailBtn.addEventListener('click', () => copyAllQrCodes(detailTableBody));
if (exportSvgDetailBtn) exportSvgDetailBtn.addEventListener('click', () => exportAllQrCodesAsSvg(detailTableBody, 'Detail'));
if (exportZipDetailBtn) exportZipDetailBtn.addEventListener('click', () => exportQrCodesAsZip(detailTableBody, 'Detail'));
if (clearAllDetailBtn) clearAllDetailBtn.addEventListener('click', () => clearAllDetailData(detailTableBody));

// 模态框事件
document.getElementById('closeModal').addEventListener('click', closeQrPreview);
document.getElementById('confirmCancel').addEventListener('click', () => closeConfirm(false));
document.getElementById('confirmOk').addEventListener('click', () => closeConfirm(true));

// 预览模态框操作按钮
document.getElementById('modalCopy').addEventListener('click', async () => {
    if (currentPreviewCanvas) {
        try {
            const blob = await new Promise(resolve => {
                currentPreviewCanvas.toBlob(resolve, 'image/png');
            });
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('✅ 已复制到剪贴板', 'success');
        } catch (error) {
            showToast('❌ 复制失败', 'error');
        }
    }
});

document.getElementById('modalDownload').addEventListener('click', () => {
    if (currentPreviewCanvas) {
        const link = document.createElement('a');
        link.download = `QR_${Date.now()}.png`;
        link.href = currentPreviewCanvas.toDataURL();
        link.click();
        showToast('✅ 下载成功', 'success');
    }
});
```

### 5. 在生成成功时启用新按钮

在generateAllDnQRCodes成功后：
```javascript
if (successCount > 0) {
    downloadAllDnBtn.disabled = false;
    copyAllDnBtn.disabled = false;
    exportSvgDnBtn.disabled = false;
    exportZipDnBtn.disabled = false;
    showToast(`✅ 成功生成 ${successCount} 个二维码`, 'success');
}
```

在generateAllDetailQRCodes成功后：
```javascript
if (successCount > 0) {
    downloadAllDetailBtn.disabled = false;
    copyAllDetailBtn.disabled = false;
    exportSvgDetailBtn.disabled = false;
    exportZipDetailBtn.disabled = false;
    showToast(`✅ 成功生成 ${successCount} 个二维码`, 'success');
}
```

## 完整集成检查清单

- [ ] DN生成函数中添加重复检测
- [ ] Detail生成函数中添加重复检测和Qty验证
- [ ] 为canvas添加点击预览事件
- [ ] 添加所有新按钮的事件监听器
- [ ] 在生成成功时启用新按钮
- [ ] 测试所有7个功能
