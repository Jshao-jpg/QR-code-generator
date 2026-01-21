// ================================================
// 新功能集成代码 - 添加到script.js末尾
// ================================================

// 获取新按钮元素
const copyAllDnBtn = document.getElementById('copyAllDn');
const exportSvgDnBtn = document.getElementById('exportSvgDn');
const exportZipDnBtn = document.getElementById('exportZipDn');
const clearAllDnBtn = document.getElementById('clearAllDn');

const copyAllDetailBtn = document.getElementById('copyAllDetail');
const exportSvgDetailBtn = document.getElementById('exportSvgDetail');
const exportZipDetailBtn = document.getElementById('exportZipDetail');
const clearAllDetailBtn = document.getElementById('clearAllDetail');

// DN区域新按钮事件监听
if (copyAllDnBtn) {
    copyAllDnBtn.addEventListener('click', () => copyAllQrCodes(dnTableBody));
}

if (exportSvgDnBtn) {
    exportSvgDnBtn.addEventListener('click', () => exportAllQrCodesAsSvg(dnTableBody, 'DN'));
}

if (exportZipDnBtn) {
    exportZipDnBtn.addEventListener('click', () => exportQrCodesAsZip(dnTableBody, 'DN'));
}

if (clearAllDnBtn) {
    clearAllDnBtn.addEventListener('click', () => clearAllDnData(dnTableBody));
}

// Detail区域新按钮事件监听
if (copyAllDetailBtn) {
    copyAllDetailBtn.addEventListener('click', () => copyAllQrCodes(detailTableBody));
}

if (exportSvgDetailBtn) {
    exportSvgDetailBtn.addEventListener('click', () => exportAllQrCodesAsSvg(detailTableBody, 'Detail'));
}

if (exportZipDetailBtn) {
    exportZipDetailBtn.addEventListener('click', () => exportQrCodesAsZip(detailTableBody, 'Detail'));
}

if (clearAllDetailBtn) {
    clearAllDetailBtn.addEventListener('click', () => clearAllDetailData(detailTableBody));
}

// 模态框关闭事件
const closeModalBtn = document.getElementById('closeModal');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeQrPreview);
}

// 确认对话框按钮事件
const confirmCancelBtn = document.getElementById('confirmCancel');
const confirmOkBtn = document.getElementById('confirmOk');

if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => closeConfirm(false));
}

if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', () => closeConfirm(true));
}

// 预览模态框操作按钮
const modalCopyBtn = document.getElementById('modalCopy');
const modalDownloadBtn = document.getElementById('modalDownload');

if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', async () => {
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
}

if (modalDownloadBtn) {
    modalDownloadBtn.addEventListener('click', () => {
        if (currentPreviewCanvas) {
            const link = document.createElement('a');
            link.download = `QR_${Date.now()}.png`;
            link.href = currentPreviewCanvas.toDataURL();
            link.click();
            showToast('✅ 下载成功', 'success');
        }
    });
}

// 为现有的canvas添加点击预览功能
function addCanvasClickToAllRows() {
    document.querySelectorAll('.qr-canvas').forEach(canvas => {
        // 移除旧的监听器（避免重复）
        canvas.removeEventListener('click', handleCanvasClick);
        // 添加新的监听器
        canvas.addEventListener('click', handleCanvasClick);
    });
}

function handleCanvasClick(e) {
    const canvas = e.target;
    if (canvas.classList.contains('visible')) {
        showQrPreview(canvas);
    }
}

// 在页面加载时为所有canvas添加点击事件
addCanvasClickToAllRows();

// 重写attachDnRowEvents以包含canvas点击事件
const originalAttachDnRowEvents = attachDnRowEvents;
function attachDnRowEvents(row) {
    // 调用原始函数
    if (typeof originalAttachDnRowEvents === 'function') {
        originalAttachDnRowEvents(row);
    }

    // 添加canvas点击事件
    const canvas = row.querySelector('.qr-canvas');
    if (canvas) {
        canvas.addEventListener('click', handleCanvasClick);
    }
}

// 重写attachDetailRowEvents以包含canvas点击事件
const originalAttachDetailRowEvents = attachDetailRowEvents;
function attachDetailRowEvents(row) {
    // 调用原始函数
    if (typeof originalAttachDetailRowEvents === 'function') {
        originalAttachDetailRowEvents(row);
    }

    // 添加canvas点击事件
    const canvas = row.querySelector('.qr-canvas');
    if (canvas) {
        canvas.addEventListener('click', handleCanvasClick);
    }
}

// 增强generateAllDnQRCodes以包含重复检测
const originalGenerateAllDnQRCodes = generateAllDnQRCodes;
function generateAllDnQRCodes() {
    const rows = dnTableBody.querySelectorAll('tr');

    // 检测重复
    const duplicates = checkDnDuplicates(rows);

    // 调用原始函数
    if (typeof originalGenerateAllDnQRCodes === 'function') {
        originalGenerateAllDnQRCodes();
    }

    // 检查是否有成功生成的（延迟执行以确保原函数完成）
    setTimeout(() => {
        const visibleCanvases = dnTableBody.querySelectorAll('.qr-canvas.visible');
        if (visibleCanvases.length > 0) {
            // 启用新按钮
            if (copyAllDnBtn) copyAllDnBtn.disabled = false;
            if (exportSvgDnBtn) exportSvgDnBtn.disabled = false;
            if (exportZipDnBtn) exportZipDnBtn.disabled = false;

            // 显示重复警告
            if (duplicates.length > 0) {
                setTimeout(() => {
                    showToast(`⚠️ 警告：第 ${duplicates.join(', ')} 行数据完全重复！`, 'error');
                }, 3500);
            }
        }
    }, 100);
}

// 增强generateAllDetailQRCodes以包含重复检测和Qty验证
const originalGenerateAllDetailQRCodes = generateAllDetailQRCodes;
function generateAllDetailQRCodes() {
    const rows = detailTableBody.querySelectorAll('tr');

    // 检测重复
    const duplicates = checkDetailDuplicates(rows);

    // Qty字段验证（在生成前）
    let hasQtyError = false;
    rows.forEach((row, index) => {
        const qtyInput = row.querySelector('.qty');
        if (qtyInput && qtyInput.value.trim()) {
            const validation = validateQty(qtyInput.value);
            if (!validation.valid) {
                qtyInput.classList.add('error');
                showToast(`第${index + 1}行：${validation.message}`, 'error');
                setTimeout(() => qtyInput.classList.remove('error'), 3000);
                hasQtyError = true;
            }
        }
    });

    // 如果有Qty错误，不继续生成
    if (hasQtyError) {
        return;
    }

    // 调用原始函数
    if (typeof originalGenerateAllDetailQRCodes === 'function') {
        originalGenerateAllDetailQRCodes();
    }

    // 检查是否有成功生成的
    setTimeout(() => {
        const visibleCanvases = detailTableBody.querySelectorAll('.qr-canvas.visible');
        if (visibleCanvases.length > 0) {
            // 启用新按钮
            if (copyAllDetailBtn) copyAllDetailBtn.disabled = false;
            if (exportSvgDetailBtn) exportSvgDetailBtn.disabled = false;
            if (exportZipDetailBtn) exportZipDetailBtn.disabled = false;

            // 显示重复警告
            if (duplicates.length > 0) {
                setTimeout(() => {
                    showToast(`⚠️ 警告：第 ${duplicates.join(', ')} 行数据完全重复！`, 'error');
                }, 3500);
            }
        }
    }, 100);
}

console.log('✅ 7个新功能已成功集成到主版本');
