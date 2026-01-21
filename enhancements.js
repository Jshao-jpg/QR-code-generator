// ================================================
//  QR码生成器 - 7个新增功能模块
//  集成到主版本
// ================================================

// ========================
// 功能1: 数字验证
// ========================

/**
 * 验证Qty字段是否为有效数字
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

// ========================
// 功能2: 重复数据检测
// ========================

/**
 * 检测DN表格中的重复数据
 */
/**
 * 检测DN表格中的重复数据 - 详细版
 */
function checkDnDuplicates(rows) {
    const seenData = new Map(); // key -> first seen rowIndex
    const duplicates = [];

    rows.forEach((row, index) => {
        const inputs = row.querySelectorAll('input.table-input');
        if (inputs.length >= 3) {
            const values = [
                inputs[0]?.value.trim(),
                inputs[1]?.value.trim(),
                inputs[2]?.value.trim()
            ];

            if (values.every(v => v)) {
                const dataKey = values.join('|');
                if (seenData.has(dataKey)) {
                    duplicates.push(`第 ${index + 1} 行 (与第 ${seenData.get(dataKey)} 行重复)`);
                } else {
                    seenData.set(dataKey, index + 1);
                }
            }
        }
    });

    return duplicates;
}

/**
 * 检测Detail表格中的重复数据
 */
/**
 * 检测Detail表格中的重复数据 - 详细版
 */
function checkDetailDuplicates(rows) {
    const seenData = new Map();
    const duplicates = [];

    rows.forEach((row, index) => {
        const inputs = row.querySelectorAll('input.table-input');
        if (inputs.length >= 5) {
            const values = Array.from(inputs).slice(0, 5).map(input => input.value.trim());

            if (values.every(v => v)) {
                const dataKey = values.join('|');
                if (seenData.has(dataKey)) {
                    duplicates.push(`第 ${index + 1} 行 (与第 ${seenData.get(dataKey)} 行重复)`);
                } else {
                    seenData.set(dataKey, index + 1);
                }
            }
        }
    });

    return duplicates;
}

// ========================
// 功能3: 确认对话框
// ========================

let confirmCallback = null;

/**
 * 显示确认对话框
 */
function showConfirm(message, callback) {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');

    if (modal && messageEl) {
        messageEl.textContent = message;
        confirmCallback = callback;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * 关闭确认对话框
 */
function closeConfirm(confirmed) {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';

    if (confirmed && typeof confirmCallback === 'function') {
        confirmCallback();
    }
    confirmCallback = null;
}

// ========================
// 功能4: 点击预览大图
// ========================

let currentPreviewCanvas = null;

/**
 * 显示QR码预览
 */
function showQrPreview(canvas) {
    const modal = document.getElementById('qrPreviewModal');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewContent = document.getElementById('previewContent');

    if (!modal || !previewCanvas || !previewContent) return;

    previewCanvas.width = 400;
    previewCanvas.height = 400;

    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, 400, 400);
    ctx.drawImage(canvas, 0, 0, 400, 400);

    const content = canvas.dataset.content || '';
    previewContent.textContent = content.replace(/;/g, ' ; ');

    currentPreviewCanvas = canvas;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * 关闭预览模态框
 */
function closeQrPreview() {
    const modal = document.getElementById('qrPreviewModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    currentPreviewCanvas = null;
}

// ========================
// 功能5: 批量复制（网格）
// ========================

/**
 * 将所有QR码组成网格复制到剪贴板
 */
async function copyAllQrCodes(tableBody) {
    const canvases = tableBody.querySelectorAll('.qr-canvas.visible');

    if (canvases.length === 0) {
        showToast('没有可复制的二维码', 'error');
        return;
    }

    try {
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

        canvases.forEach((canvas, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = col * (qrSize + padding) + padding;
            const y = row * (qrSize + padding) + padding;
            ctx.drawImage(canvas, x, y, qrSize, qrSize);
        });

        const blob = await new Promise(resolve => {
            gridCanvas.toBlob(resolve, 'image/png');
        });

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        showToast(`✅ 已复制 ${canvases.length} 个二维码到剪贴板`, 'success');
    } catch (error) {
        console.error('Copy all error:', error);
        showToast('复制失败，请检查浏览器权限', 'error');
    }
}

// ========================
// 功能6: SVG导出
// ========================

/**
 * 导出单个SVG文件
 */
function exportQrCodeAsSvg(content, filename) {
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
 * 批量导出所有QR码为SVG
 */
function exportAllQrCodesAsSvg(tableBody, prefix) {
    const canvases = tableBody.querySelectorAll('.qr-canvas.visible');

    if (canvases.length === 0) {
        showToast('没有可导出的二维码', 'error');
        return;
    }

    canvases.forEach((canvas, index) => {
        const content = canvas.dataset.content;
        const filename = `${prefix}_${String(index + 1).padStart(3, '0')}`;

        setTimeout(() => {
            exportQrCodeAsSvg(content, filename);
        }, index * 100);
    });

    showToast(`正在导出 ${canvases.length} 个SVG文件...`, 'success');
}

// ========================
// 功能7: ZIP打包下载
// ========================

/**
 * 将所有QR码打包为ZIP文件下载
 */
async function exportQrCodesAsZip(tableBody, prefix) {
    const canvases = tableBody.querySelectorAll('.qr-canvas.visible');

    if (canvases.length === 0) {
        showToast('没有可打包的二维码', 'error');
        return;
    }

    try {
        const zip = new JSZip();
        const folder = zip.folder('QRCodes');

        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const filename = `${prefix}_${String(i + 1).padStart(3, '0')}.png`;

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });

            folder.file(filename, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${prefix}_QRCodes_${Date.now()}.zip`);

        showToast(`✅ 成功打包 ${canvases.length} 个二维码`, 'success');
    } catch (error) {
        console.error('ZIP export error:', error);
        showToast('打包失败', 'error');
    }
}

// ========================
// 清空数据功能（配合确认对话框）
// ========================

// ========================
// 功能8: 自动保存 (Auto-Save)
// ========================

const STORAGE_KEYS = {
    DN: 'qr_dn_data_backup',
    DETAIL: 'qr_detail_data_backup'
};

/**
 * 自动保存核心逻辑
 */
function saveTableData(type) {
    let data = [];
    let tableBody;

    if (type === 'DN') {
        tableBody = document.getElementById('dnTableBody');
    } else if (type === 'DETAIL') {
        tableBody = document.getElementById('detailTableBody');
    }

    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputs = Array.from(row.querySelectorAll('input.table-input'));
        const rowData = inputs.map(input => input.value);
        // 只保存非空行 (at least one field has value)
        if (rowData.some(val => val.trim() !== '')) {
            data.push(rowData);
        }
    });

    localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(data));
    // console.log(`Auto-saved ${data.length} rows for ${type}`);
}

/**
 * 从本地存储恢复数据
 */
function loadTableData() {
    // 1. Load DN Data
    const dnData = JSON.parse(localStorage.getItem(STORAGE_KEYS.DN) || '[]');
    if (dnData.length > 0) {
        const dnBody = document.getElementById('dnTableBody');
        // Ensure enough rows
        while (dnBody.children.length < dnData.length) {
            document.getElementById('addDnRow').click();
        }

        dnData.forEach((rowData, index) => {
            if (index < dnBody.children.length) {
                const inputs = dnBody.children[index].querySelectorAll('input.table-input');
                rowData.forEach((val, i) => {
                    if (inputs[i]) inputs[i].value = val;
                });
            }
        });
        showToast(`已恢复 ${dnData.length} 条送货单数据`, 'success');
    }

    // 2. Load Detail Data
    const detailData = JSON.parse(localStorage.getItem(STORAGE_KEYS.DETAIL) || '[]');
    if (detailData.length > 0) {
        const detailBody = document.getElementById('detailTableBody');
        // Ensure enough rows
        while (detailBody.children.length < detailData.length) {
            document.getElementById('addDetailRow').click();
        }

        detailData.forEach((rowData, index) => {
            if (index < detailBody.children.length) {
                const inputs = detailBody.children[index].querySelectorAll('input.table-input');
                rowData.forEach((val, i) => {
                    if (inputs[i]) inputs[i].value = val;
                });
            }
        });
        showToast(`已恢复 ${detailData.length} 条明细数据`, 'success');
    }
}

/**
 * 初始化自动保存监听器
 */
function initAutoSave() {
    const dnBody = document.getElementById('dnTableBody');
    const detailBody = document.getElementById('detailTableBody');

    // Use Event Delegation for better performance and dynamic elements support
    if (dnBody) {
        dnBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('table-input')) {
                // Debounce simple implementation
                clearTimeout(dnBody.timer);
                dnBody.timer = setTimeout(() => saveTableData('DN'), 500);
            }
        });
    }

    if (detailBody) {
        detailBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('table-input')) {
                clearTimeout(detailBody.timer);
                detailBody.timer = setTimeout(() => saveTableData('DETAIL'), 500);
            }
        });
    }

    // Load data on init - 已禁用：用户要求刷新不保留
    // loadTableData();
}

// 扩展清空函数以清除本地存储
// Note: Direct definition since original function declaration was removed
function clearAllDnData(dnTableBody) {
    showConfirm('确定要清空所有送货单表头数据吗？', () => {
        localStorage.removeItem(STORAGE_KEYS.DN);

        const rows = dnTableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelectorAll('input.table-input').forEach(i => i.value = '');
            row.querySelector('.qr-canvas')?.classList.remove('visible');
            // clear canvas
            const canvas = row.querySelector('.qr-canvas');
            if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            if (index > 0) row.remove();
        });

        updateRowNumbers(dnTableBody);

        // Disable buttons
        ['downloadAllDn', 'copyAllDn', 'exportSvgDn', 'exportZipDn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });

        showToast('✅ 数据已清空 (包括本地备份)', 'success');
    });
}

function clearAllDetailData(detailTableBody) {
    showConfirm('确定要清空所有明细数据吗？', () => {
        localStorage.removeItem(STORAGE_KEYS.DETAIL);

        const rows = detailTableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelectorAll('input.table-input').forEach(i => i.value = '');
            row.querySelector('.qr-canvas')?.classList.remove('visible');
            // clear canvas
            const canvas = row.querySelector('.qr-canvas');
            if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            if (index > 0) row.remove();
        });

        updateRowNumbers(detailTableBody);

        // Disable buttons
        ['downloadAllDetail', 'copyAllDetail', 'exportSvgDetail', 'exportZipDetail'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });

        showToast('✅ 数据已清空 (包括本地备份)', 'success');
    });
}


// ========================
// 功能9: PWA 安装支持
// ========================

let deferredInstallPrompt = null;
const installBtn = document.getElementById('installAppBtn');

// 1. 监听安装事件（浏览器认为可以安装时触发）
window.addEventListener('beforeinstallprompt', (e) => {
    // 防止 Chrome 67 及更早版本自动显示提示
    e.preventDefault();
    // 保存事件以便稍后触发
    deferredInstallPrompt = e;
    // 更新 UI 通知用户可以添加到主屏幕
    if (installBtn) {
        installBtn.style.display = 'flex';
        console.log('📱 PWA Install capability detected - Install button shown');
    }
});

// 2. 处理点击安装
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;

        // 显示安装提示
        deferredInstallPrompt.prompt();

        // 等待用户响应
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);

        // 只能使用一次
        deferredInstallPrompt = null;

        // 如果已安装，隐藏按钮
        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
        }
    });
}

// 3. 监听安装完成事件
window.addEventListener('appinstalled', () => {
    console.log('✅ PWA App installed successfully');
    if (installBtn) installBtn.style.display = 'none';
});

console.log('✅ QR码生成器增强功能模块已加载 (含Auto-Save & PWA)');
