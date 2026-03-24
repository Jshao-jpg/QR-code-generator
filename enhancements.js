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
}

// ========================
// 功能6: 数据报表导出 (.xlsx 格式)
// ========================

/**
 * 使用 ExcelJS 导出真正的 .xlsx 格式报表（支持嵌入图片且无警告）
 */
async function exportDataReport(tableBody, type) {
    const rows = tableBody.querySelectorAll('tr');
    const canvases = tableBody.querySelectorAll('.qr-canvas.visible');

    if (canvases.length === 0) {
        showToast('请先生成二维码再导出报表', 'error');
        return;
    }

    showToast('正在生成报表...', 'info');

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(type === 'DN' ? 'DN Header' : 'DN Detail');

        const title = type === 'DN' ? 
            '送货单表头数据报表 (DN Header Data Report)' : 
            '送货单明细数据报表 (DN Detail Data Report)';

        // 基础配置
        const colCount = type === 'DN' ? 5 : 7;
        
        // 1. 添加标题行
        const titleRow = worksheet.addRow([title]);
        worksheet.mergeCells(1, 1, 1, colCount);
        titleRow.height = 35;
        titleRow.font = { size: 16, bold: true };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };

        // 2. 添加元信息行
        const metaInfo = `生成时间: ${new Date().toLocaleString()} | 送货单 QR Code 生成器 (QR Code General)`;
        const metaRow = worksheet.addRow([metaInfo]);
        worksheet.mergeCells(2, 1, 2, colCount);
        metaRow.height = 20;
        metaRow.font = { size: 10, color: { argb: 'FF666666' } };
        metaRow.alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.addRow([]); // 空行

        // 3. 设置表头
        let headers = [];
        let colWidths = [];

        if (type === 'DN') {
            headers = ['#', 'DN No.', 'Vendor ID', 'PO No.', 'QR Code'];
            colWidths = [8, 25, 20, 25, 20];
        } else {
            headers = ['#', 'Full PO No.', 'Qty', 'Unit', 'Unique ID', 'PN', 'QR Code'];
            colWidths = [8, 25, 12, 12, 20, 25, 20];
        }

        const headerRow = worksheet.addRow(headers);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 设置列宽
        colWidths.forEach((width, i) => {
            worksheet.getColumn(i + 1).width = width;
        });

        // 4. 填充数据
        let rowIndex = 5;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const canvas = row.querySelector('.qr-canvas');
            if (!canvas || !canvas.classList.contains('visible')) continue;

            const inputs = Array.from(row.querySelectorAll('input.table-input'));
            const rowData = [i + 1, ...inputs.map(input => input.value || ''), '']; 
            
            const dataRow = worksheet.addRow(rowData);
            dataRow.height = 95; // 增加行高以适应 100x100 的二维码
            dataRow.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // 嵌入图片
            try {
                const base64 = canvas.toDataURL('image/png').split(',')[1];
                const imageId = workbook.addImage({
                    base64: base64,
                    extension: 'png',
                });

                // 设置为正方形：计算居中偏移量或使用固定宽高
                worksheet.addImage(imageId, {
                    tl: { col: colCount - 1, row: rowIndex - 1, colOff: 15, rowOff: 5 },
                    ext: { width: 120, height: 120 }, // 设置完全的正方形尺寸
                    editAs: 'oneCell'
                });
            } catch (err) {
                console.error('Image embedding error:', err);
            }

            rowIndex++;
        }

        // 5. 导出文件
        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `${type}_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
        saveAs(new Blob([buffer]), filename);
        
        showToast('✅ 报表导出完成 (XLSX)', 'success');
    } catch (error) {
        console.error('Report export error:', error);
        showToast('报表导出失败', 'error');
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
        ['downloadAllDn', 'exportReportDn'].forEach(id => {
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
        ['downloadAllDetail', 'exportReportDetail'].forEach(id => {
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
