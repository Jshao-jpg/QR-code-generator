/**
 * QR Code Generator - Unified Send Goods Script
 * 送货单二维码生成器 - 统一工作流 (表头与明细双表格模式)
 */

// ============================================
// Global Element References
// ============================================

const headerTableBody = document.getElementById('headerTableBody');
const detailTableBody = document.getElementById('detailTableBody');

// Buttons
const addDetailRowBtn = document.getElementById('addDetailRow');
const generateAllUnifiedBtn = document.getElementById('generateAllUnified');
const downloadAllUnifiedBtn = document.getElementById('downloadAllUnified');
const exportUnifiedReportBtn = document.getElementById('exportUnifiedReport');
const clearAllUnifiedBtn = document.getElementById('clearAllUnified');
const unifiedParsePasteBtn = document.getElementById('unifiedParsePaste');

// ============================================
// Utility Functions
// ============================================

function sanitizeInput(input) {
    if (!input) return '';
    return input.trim().replace(/；/g, ';').replace(/;+/g, ';').replace(/^;+|;+$/g, '');
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function generateFilename(content, prefix) {
    const identifier = content.split(';')[0] || 'QR';
    return `${prefix}_${identifier.replace(/[<>:"/\\|?*]/g, '_')}.png`;
}

function updateRowNumbers(tbody) {
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const numCell = row.querySelector('.row-num');
        if (numCell) numCell.textContent = index + 1;
    });
}

function generateSequentialId(index) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const sequence = String(index + 1).padStart(3, '0');
    return `${yy}${mm}${dd}${sequence}`;
}

function refreshDetailIds() {
    const rows = detailTableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const idInput = row.querySelector('.unique-id');
        if (idInput) idInput.value = generateSequentialId(index);
    });
}

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

/**
 * Validation Logic
 */
function validateRow(po, qty) {
    // 只要包含两个-且-前后都有内容就可以
    const poRegex = /^[^-]+-[^-]+-[^-]+$/;
    if (!poRegex.test(po)) {
        return { valid: false, message: `采购单号格式不正确: ${po} (应包含两个'-'且前后有内容)` };
    }
    const qtyVal = parseFloat(qty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
        return { valid: false, message: `数量必须为大于0的数字: ${qty}` };
    }
    return { valid: true };
}

/**
 * Duplicate Detection Logic
 */
function findDuplicates(rows) {
    const seen = new Map();
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const po = row.querySelector('.full-po-no').value.trim();
        const qty = row.querySelector('.qty').value.trim();
        const unit = row.querySelector('.unit').value.trim();
        const pn = row.querySelector('.pn').value.trim();
        
        if (!po && !qty) continue;

        const key = `${po}|${qty}|${unit}|${pn}`;
        if (seen.has(key)) {
            return { row1: seen.get(key) + 1, row2: i + 1 };
        }
        seen.set(key, i);
    }
    return null;
}

// ============================================
// Core Logic Functions
// ============================================

function attachRowEvents(row, tbody) {
    const downloadBtn = row.querySelector('.download-row');
    const copyBtn = row.querySelector('.copy-row');
    const deleteBtn = row.querySelector('.delete-row');
    const canvas = row.querySelector('.qr-canvas');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!canvas.dataset.content) return;
            const link = document.createElement('a');
            link.download = generateFilename(canvas.dataset.content, 'QR');
            link.href = canvas.toDataURL();
            link.click();
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            if (!canvas.dataset.content) return;
            try {
                const blob = await new Promise(resolve => canvas.toBlob(resolve));
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                showToast('已复制到剪贴板', 'success');
            } catch (err) { showToast('复制失败', 'error'); }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (tbody.children.length > 1) {
                row.remove();
                updateRowNumbers(tbody);
                if (tbody === detailTableBody) refreshDetailIds();
            } else {
                row.querySelectorAll('input').forEach(i => i.value = '');
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                canvas.classList.remove('visible');
                if (downloadBtn) downloadBtn.disabled = true;
                if (copyBtn) copyBtn.disabled = true;
                if (tbody === detailTableBody) refreshDetailIds();
            }
        });
    }

    // Preview
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', () => {
        if (canvas.classList.contains('visible')) showQrPreview(canvas);
    });
}

function addHeaderRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="row-num"></td>
        <td><input type="text" class="table-input dn-no" placeholder="如DN20250418001"></td>
        <td><input type="text" class="table-input vendor-id" placeholder="如7016"></td>
        <td class="qr-cell"><canvas class="qr-canvas"></canvas></td>
        <td class="action-cell">
            <div class="row-actions">
                <button class="action-btn download-row" title="下载" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button>
                <button class="action-btn copy-row" title="复制" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
                <button class="action-btn delete-row" title="删除"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
            </div>
        </td>`;
    headerTableBody.appendChild(tr);
    updateRowNumbers(headerTableBody);
    attachRowEvents(tr, headerTableBody);
    return tr;
}

function addDetailRow() {
    const tr = document.createElement('tr');
    const id = generateSequentialId(detailTableBody.children.length);
    tr.innerHTML = `
        <td class="row-num"></td>
        <td><input type="text" class="table-input full-po-no" placeholder="如263275-1-1"></td>
        <td><input type="text" class="table-input qty" placeholder="数量"></td>
        <td><input type="text" class="table-input unit" placeholder="如PC"></td>
        <td><input type="text" class="table-input unique-id" value="${id}" readonly></td>
        <td><input type="text" class="table-input pn" placeholder="零件编号"></td>
        <td class="qr-cell"><canvas class="qr-canvas"></canvas></td>
        <td class="action-cell">
            <div class="row-actions">
                <button class="action-btn download-row" title="下载" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button>
                <button class="action-btn copy-row" title="复制" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
                <button class="action-btn delete-row" title="删除"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
            </div>
        </td>`;
    detailTableBody.appendChild(tr);
    updateRowNumbers(detailTableBody);
    attachRowEvents(tr, detailTableBody);
    return tr;
}

function generateAllUnifiedQRCodes() {
    // 1. Validation & Duplicate Check
    const dRows = Array.from(detailTableBody.querySelectorAll('tr'));
    
    // Check duplicates
    const duplicate = findDuplicates(dRows);
    if (duplicate) {
        showToast(`第 ${duplicate.row1} 行与第 ${duplicate.row2} 行重复`, 'error');
        return;
    }

    let validRows = [];
    for (let i = 0; i < dRows.length; i++) {
        const po = dRows[i].querySelector('.full-po-no').value.trim();
        const qty = dRows[i].querySelector('.qty').value.trim();
        if (!po && !qty) continue; // Skip empty rows
        
        const validation = validateRow(po, qty);
        if (!validation.valid) {
            showToast(`第 ${i+1} 行明细格式错误: ${validation.message}`, 'error');
            return;
        }
        validRows.push(dRows[i]);
    }

    if (validRows.length === 0) {
        showToast('请提供至少一行有效的明细数据', 'error');
        return;
    }

    // 2. Generate Header QRCodes
    const hRows = headerTableBody.querySelectorAll('tr');
    const firstPo = dRows[0].querySelector('.full-po-no').value.trim().split('-')[0];
    let hCount = 0;
    hRows.forEach(row => {
        const dn = row.querySelector('.dn-no').value.trim();
        const vendor = row.querySelector('.vendor-id').value.trim();
        const canvas = row.querySelector('.qr-canvas');
        if (dn && vendor) {
            const content = `${dn};${vendor};${firstPo}`;
            canvas.width = 300; canvas.height = 300;
            drawQRCode(content, canvas);
            canvas.classList.add('visible');
            canvas.dataset.content = content;
            row.querySelector('.download-row').disabled = false;
            row.querySelector('.copy-row').disabled = false;
            hCount++;
        }
    });

    // 3. Generate Detail QRCodes
    let dCount = 0;
    dRows.forEach(row => {
        const po = row.querySelector('.full-po-no').value.trim();
        const qty = row.querySelector('.qty').value.trim();
        const unit = row.querySelector('.unit').value.trim();
        const id = row.querySelector('.unique-id').value.trim();
        const pn = row.querySelector('.pn').value.trim();
        const canvas = row.querySelector('.qr-canvas');
        
        if (po && qty && unit && id && pn) {
            const content = `${po};${qty};${unit};${id};${pn}`;
            canvas.width = 300; canvas.height = 300;
            drawQRCode(content, canvas);
            canvas.classList.add('visible');
            canvas.dataset.content = content;
            row.querySelector('.download-row').disabled = false;
            row.querySelector('.copy-row').disabled = false;
            dCount++;
        }
    });

    if (hCount > 0 || dCount > 0) {
        showToast(`成功生成 ${hCount} 个表头和 ${dCount} 个明细二维码`, 'success');
        checkUnifiedActionState();
    } else {
        showToast('生成失败，请检查数据完整性', 'error');
    }
}

function checkUnifiedActionState() {
    const hasAnyVisible = !!document.querySelector('.qr-canvas.visible');
    downloadAllUnifiedBtn.disabled = !hasAnyVisible;
    exportUnifiedReportBtn.disabled = !hasAnyVisible;
}

/**
 * Recognition Principle (解析原理):
 * 该功能通过启发式检测 (Heuristic Detection) 识别文本：
 * 1. 它首先将输入的文本按行分割，并根据 Tab 或 多个连续空格进行列分割。
 * 2. 它通过查找关键字 (如 "DN No", "送货单号", "Full PO No", "完整采购单号") 来识别“标题行”。
 * 3. 一旦识别出标题行，它会切换工作模式 (HEADER 或 DETAIL) 并开始提取后续行为对应的数据列。
 * 4. 即使你改变了标题内容，只要它不包含预设的关键字，系统会尝试基于其在文本流中的位置或前置标识符进行自适应匹配。
 */
function parseUnifiedPasteData() {
    const pasteArea = document.getElementById('unifiedPasteArea');
    const content = pasteArea.value.trim();
    if (!content) return;

    const lines = content.split(/\r?\n/);
    let currentMode = 'DETAIL'; // 默认进入明细模式
    let headerData = [];
    let detailData = [];

    lines.forEach(line => {
        const cols = line.split(/\t|\s{2,}/).map(c => c.trim()).filter(c => c);
        if (cols.length === 0) return;

        const firstCol = cols[0].toLowerCase();
        // 关键字匹配模式切换
        if (firstCol.includes('dn nos') || firstCol.includes('送货单号')) {
            currentMode = 'HEADER'; return;
        }
        if (firstCol.includes('full po no') || firstCol.includes('完整采购单号')) {
            currentMode = 'DETAIL'; return;
        }

        if (currentMode === 'HEADER' && cols.length >= 2) {
            headerData.push(cols.slice(0, 2));
        } else if (currentMode === 'DETAIL' && cols.length >= 3) {
            detailData.push(cols);
        } else if (cols[0].startsWith('DN')) { // 前缀启发式识别
            headerData.push(cols.slice(0, 2));
        } else {
            detailData.push(cols);
        }
    });

    if (headerData.length > 0) {
        headerTableBody.innerHTML = '';
        headerData.forEach(d => {
            const r = addHeaderRow();
            r.querySelector('.dn-no').value = d[0] || '';
            r.querySelector('.vendor-id').value = d[1] || '';
        });
    }

    if (detailData.length > 0) {
        detailTableBody.innerHTML = '';
        detailData.forEach((d, i) => {
            const r = addDetailRow();
            r.querySelector('.full-po-no').value = d[0] || '';
            r.querySelector('.qty').value = d[1] || '';
            r.querySelector('.unit').value = d[2] || '';
            r.querySelector('.pn').value = d[3] || '';
        });
        refreshDetailIds();
    }

    showToast(`解析成功：表头 ${headerData.length} 行，明细 ${detailData.length} 行`);
    pasteArea.value = '';
}

function clearAllUnified() {
    showConfirm('确定要清空送货单所有数据吗？', () => {
        headerTableBody.innerHTML = '';
        detailTableBody.innerHTML = '';
        addHeaderRow();
        addDetailRow();
        checkUnifiedActionState();
        showToast('数据已清空');
    });
}

function downloadAllUnified() {
    const canvases = document.querySelectorAll('.qr-canvas.visible');
    canvases.forEach((canvas, i) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.download = generateFilename(canvas.dataset.content, 'QR');
            link.href = canvas.toDataURL();
            link.click();
        }, i * 200);
    });
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Buttons
    const addHeaderRowBtnLocal = document.getElementById('addHeaderRow');
    const addDetailRowBtnLocal = document.getElementById('addDetailRowLocal');
    
    if (addHeaderRowBtnLocal) addHeaderRowBtnLocal.addEventListener('click', addHeaderRow);
    if (addDetailRowBtnLocal) addDetailRowBtnLocal.addEventListener('click', addDetailRow);
    if (addDetailRowBtn) addDetailRowBtn.addEventListener('click', addDetailRow);
    if (generateAllUnifiedBtn) generateAllUnifiedBtn.addEventListener('click', generateAllUnifiedQRCodes);
    if (downloadAllUnifiedBtn) downloadAllUnifiedBtn.addEventListener('click', downloadAllUnified);
    if (clearAllUnifiedBtn) clearAllUnifiedBtn.addEventListener('click', clearAllUnified);
    if (unifiedParsePasteBtn) unifiedParsePasteBtn.addEventListener('click', parseUnifiedPasteData);

    // 初始状态：仅一行空数据，不保留历史记录
    headerTableBody.innerHTML = '';
    detailTableBody.innerHTML = '';
    addHeaderRow();
    addDetailRow();
    refreshDetailIds();

    // Modal Events
    document.getElementById('closeModal')?.addEventListener('click', () => closeQrPreview());
    document.getElementById('confirmCancel')?.addEventListener('click', () => closeConfirm(false));
    document.getElementById('confirmOk')?.addEventListener('click', () => closeConfirm(true));

    document.getElementById('modalDownload')?.addEventListener('click', () => {
        if (currentPreviewCanvas) {
            const link = document.createElement('a');
            link.download = 'QR_Preview.png';
            link.href = currentPreviewCanvas.toDataURL();
            link.click();
        }
    });

    console.log('Unified QR Generator (Dual-Table) Ready.');
});
