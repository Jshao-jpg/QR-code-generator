// QR码生成器演示版 - 包含7个新功能
// ========================================

// DOM元素
const detailTableBody = document.getElementById('detailTableBody');
const toast = document.getElementById('toast');

// 模态框元素
const qrPreviewModal = document.getElementById('qrPreviewModal');
const confirmModal = document.getElementById('confirmModal');
const previewCanvas = document.getElementById('previewCanvas');
const previewContent = document.getElementById('previewContent');
const confirmMessage = document.getElementById('confirmMessage');

// 按钮
const addRowBtn = document.getElementById('addRow');
const generateAllBtn = document.getElementById('generateAll');
const copyAllBtn = document.getElementById('copyAll');
const exportSvgBtn = document.getElementById('exportSvg');
const exportZipBtn = document.getElementById('exportZip');
const clearAllBtn = document.getElementById('clearAll');

// 全局变量
let currentPreviewCanvas = null;
let confirmCallback = null;

// ============================================
// 工具函数
// ============================================

/**
 * 显示Toast提示
 */
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * 清理输入（移除中文分号等）
 */
function sanitizeInput(value) {
    return value.replace(/；/g, ';').replace(/;+/g, ';').trim();
}

/**
 * 绘制QR码
 */
function drawQRCode(text, canvas) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const cellSize = canvas.width / moduleCount;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';

    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
    }
}

// ============================================
// 功能1: 数字验证
// ============================================

/**
 * 验证Qty字段是否为数字
 */
function validateQty(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return { valid: false, message: '数量不能为空' };
    }

    const num = Number(trimmed);
    if (isNaN(num)) {
        return { valid: false, message: '数量必须是数字' };
    }
    if (num <= 0) {
        return { valid: false, message: '数量必须大于0' };
    }

    return { valid: true, value: num };
}

// ============================================
// 功能2: 重复数据检测
// ============================================

/**
 * 检测重复数据
 */
function checkDuplicates(rows) {
    const seenData = new Set();
    const duplicates = [];

    rows.forEach((row, index) => {
        const inputs = row.querySelectorAll('.table-input');
        const values = Array.from(inputs).map(input => input.value.trim());

        if (values.every(v => v)) {
            const dataKey = values.join('|');
            if (seenData.has(dataKey)) {
                duplicates.push(index + 1);
            } else {
                seenData.add(dataKey);
            }
        }
    });

    return duplicates;
}

// ============================================
// 功能3: 确认对话框
// ============================================

/**
 * 显示确认对话框
 */
function showConfirm(message, callback) {
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmModal.classList.add('show');
}

/**
 * 关闭确认对话框
 */
function closeConfirm(confirmed) {
    confirmModal.classList.remove('show');
    if (confirmed && typeof confirmCallback === 'function') {
        confirmCallback();
    }
    confirmCallback = null;
}

// ============================================
// 功能4: 点击预览大图
// ============================================

/**
 * 显示QR码预览
 */
function showPreview(canvas) {
    previewCanvas.width = 400;
    previewCanvas.height = 400;

    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, 400, 400);
    ctx.drawImage(canvas, 0, 0, 400, 400);

    const content = canvas.dataset.content || '';
    previewContent.textContent = content.replace(/;/g, ' ; ');

    currentPreviewCanvas = canvas;
    qrPreviewModal.classList.add('show');
}

/**
 * 关闭预览
 */
function closePreview() {
    qrPreviewModal.classList.remove('show');
    currentPreviewCanvas = null;
}

// ============================================
// 功能5: 复制所有QR码（网格）
// ============================================

/**
 * 复制所有QR码为图片网格
 */
async function copyAllQrCodes() {
    const canvases = detailTableBody.querySelectorAll('.qr-canvas.visible');

    if (canvases.length === 0) {
        showToast('没有可复制的二维码', 'error');
        return;
    }

    try {
        // 创建网格
        const cols = Math.min(4, canvases.length);
        const rows = Math.ceil(canvases.length / cols);
        const qrSize = 300;
        const padding = 20;

        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = cols * (qrSize + padding) + padding;
        gridCanvas.height = rows * (qrSize + padding) + padding;

        const ctx = gridCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);

        // 绘制所有QR码
        canvases.forEach((canvas, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = col * (qrSize + padding) + padding;
            const y = row * (qrSize + padding) + padding;
            ctx.drawImage(canvas, x, y, qrSize, qrSize);
        });

        // 复制到剪贴板
        const blob = await new Promise(resolve => {
            gridCanvas.toBlob(resolve, 'image/png');
        });

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        showToast(`✅ 已复制 ${canvases.length} 个二维码`, 'success');
    } catch (error) {
        console.error(error);
        showToast('❌ 复制失败，请检查浏览器权限', 'error');
    }
}

// ============================================
// 功能6: SVG导出
// ============================================

/**
 * 导出单个SVG
 */
function exportSvg(content, filename) {
    const qr = qrcode(0, 'M');
    qr.addData(content);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const cellSize = 10;
    const svgSize = moduleCount * cellSize;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">`;
    svg += `<rect width="${svgSize}" height="${svgSize}" fill="#ffffff"/>`;

    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
                const x = col * cellSize;
                const y = row * cellSize;
                svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#000000"/>`;
            }
        }
    }

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.svg`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 批量导出SVG
 */
function exportAllSvg() {
    const canvases = detailTableBody.querySelectorAll('.qr-canvas.visible');

    if (canvases.length === 0) {
        showToast('没有可导出的二维码', 'error');
        return;
    }

    canvases.forEach((canvas, index) => {
        const content = canvas.dataset.content;
        const filename = `QR_${String(index + 1).padStart(3, '0')}`;

        setTimeout(() => {
            exportSvg(content, filename);
        }, index * 100);
    });

    showToast(`正在导出 ${canvases.length} 个SVG文件...`, 'success');
}

// ============================================
// 功能7: ZIP打包下载
// ============================================

/**
 * ZIP打包所有QR码
 */
async function exportZip() {
    const canvases = detailTableBody.querySelectorAll('.qr-canvas.visible');

    if (canvases.length === 0) {
        showToast('没有可打包的二维码', 'error');
        return;
    }

    try {
        const zip = new JSZip();
        const folder = zip.folder('QRCodes');

        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const filename = `QR_${String(i + 1).padStart(3, '0')}.png`;

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });

            folder.file(filename, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `QRCodes_${Date.now()}.zip`);

        showToast(`✅ 成功打包 ${canvases.length} 个二维码`, 'success');
    } catch (error) {
        console.error(error);
        showToast('❌ 打包失败', 'error');
    }
}

// ============================================
// 表格操作
// ============================================

/**
 * 更新行号
 */
function updateRowNumbers() {
    const rows = detailTableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const rowNum = row.querySelector('.row-num');
        if (rowNum) rowNum.textContent = index + 1;
    });
}

/**
 * 添加新行
 */
function addRow() {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td class="row-num">1</td>
        <td><input type="text" class="table-input" placeholder="如263275-1-1"></td>
        <td><input type="text" class="table-input qty" placeholder="如3"></td>
        <td><input type="text" class="table-input" placeholder="如PC"></td>
        <td><input type="text" class="table-input" placeholder="如250418003"></td>
        <td><input type="text" class="table-input" placeholder="如MT4571-01-001"></td>
        <td class="qr-cell"><canvas class="qr-canvas"></canvas></td>
        <td class="action-cell">
            <button class="btn-icon delete-row" title="删除行">×</button>
        </td>
    `;

    detailTableBody.appendChild(newRow);
    updateRowNumbers();
    attachRowEvents(newRow);
}

/**
 * 附加行事件
 */
function attachRowEvents(row) {
    const deleteBtn = row.querySelector('.delete-row');
    const canvas = row.querySelector('.qr-canvas');

    deleteBtn.addEventListener('click', () => {
        if (detailTableBody.querySelectorAll('tr').length > 1) {
            row.remove();
            updateRowNumbers();
        } else {
            showToast('至少保留一行', 'error');
        }
    });

    canvas.addEventListener('click', () => {
        if (canvas.classList.contains('visible')) {
            showPreview(canvas);
        }
    });
}

/**
 * 生成所有QR码
 */
function generateAll() {
    const rows = detailTableBody.querySelectorAll('tr');
    let successCount = 0;
    let errorMessages = [];

    // 检测重复（稍后在成功消息后显示）
    const duplicates = checkDuplicates(rows);

    rows.forEach((row, index) => {
        const inputs = row.querySelectorAll('.table-input');

        // 获取值
        const fullPoNo = sanitizeInput(inputs[0].value);
        const qtyInput = inputs[1];
        const qty = qtyInput.value.trim();
        const unit = sanitizeInput(inputs[2].value);
        const uniqueId = sanitizeInput(inputs[3].value);
        const pn = sanitizeInput(inputs[4].value);

        // 验证数字字段
        if (qty) {
            const validation = validateQty(qty);
            if (!validation.valid) {
                qtyInput.classList.add('error');
                errorMessages.push(`第${index + 1}行：${validation.message}`);
                setTimeout(() => qtyInput.classList.remove('error'), 2000);
                return;
            }
        }

        if (!fullPoNo || !qty || !unit || !uniqueId || !pn) {
            return;
        }

        const content = `${fullPoNo};${qty};${unit};${uniqueId};${pn}`;
        const canvas = row.querySelector('.qr-canvas');

        try {
            canvas.width = 300;
            canvas.height = 300;
            drawQRCode(content, canvas);
            canvas.dataset.content = content;
            canvas.classList.add('visible');
            successCount++;
        } catch (error) {
            console.error(error);
        }
    });

    // 显示错误消息
    if (errorMessages.length > 0) {
        showToast(errorMessages.join('; '), 'error');
    }

    // 显示成功消息和重复警告
    if (successCount > 0) {
        copyAllBtn.disabled = false;
        exportSvgBtn.disabled = false;
        exportZipBtn.disabled = false;

        // 先显示成功消息
        showToast(`✅ 成功生成 ${successCount} 个二维码`, 'success');

        // 如果有重复，延迟显示警告
        if (duplicates.length > 0) {
            setTimeout(() => {
                showToast(`⚠️ 警告：第 ${duplicates.join(', ')} 行数据完全重复！`, 'error');
            }, 3500); // Toast默认显示3秒，延迟3.5秒后显示新的
        }
    } else if (errorMessages.length === 0) {
        showToast('请填写至少一行完整数据', 'error');
    }
}

/**
 * 清空所有数据
 */
function clearAll() {
    showConfirm('确定要清空所有数据吗？此操作不可恢复！', () => {
        const rows = detailTableBody.querySelectorAll('tr');

        rows.forEach((row, index) => {
            const inputs = row.querySelectorAll('.table-input');
            inputs.forEach(input => input.value = '');

            const canvas = row.querySelector('.qr-canvas');
            if (canvas) {
                canvas.classList.remove('visible');
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            if (index > 0) {
                row.remove();
            }
        });

        copyAllBtn.disabled = true;
        exportSvgBtn.disabled = true;
        exportZipBtn.disabled = true;

        showToast('✅ 已清空所有数据', 'success');
    });
}

// ============================================
// 事件监听
// ============================================

// 表格操作按钮
addRowBtn.addEventListener('click', addRow);
generateAllBtn.addEventListener('click', generateAll);
copyAllBtn.addEventListener('click', copyAllQrCodes);
exportSvgBtn.addEventListener('click', exportAllSvg);
exportZipBtn.addEventListener('click', exportZip);
clearAllBtn.addEventListener('click', clearAll);

// 预览模态框
document.getElementById('closeModal').addEventListener('click', closePreview);
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

// 确认对话框
document.getElementById('confirmCancel').addEventListener('click', () => closeConfirm(false));
document.getElementById('confirmOk').addEventListener('click', () => closeConfirm(true));

// 点击overlay关闭模态框
qrPreviewModal.addEventListener('click', (e) => {
    if (e.target === qrPreviewModal.querySelector('.modal-overlay') || e.target === qrPreviewModal) {
        closePreview();
    }
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal.querySelector('.modal-overlay') || e.target === confirmModal) {
        closeConfirm(false);
    }
});

// 初始化现有行
document.querySelectorAll('#detailTableBody tr').forEach(attachRowEvents);

console.log('✅ QR码生成器演示版已加载 - 包含7个新功能');
