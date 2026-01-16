/**
 * QR Code Generator - Batch Mode Script
 * 送货单二维码生成器 - 批量模式
 * Using qrcode-generator library
 */

// ============================================
// Utility Functions
// ============================================

/**
 * Sanitize input - Remove extra semicolons and normalize
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
    if (!input) return '';
    let sanitized = input.trim();
    sanitized = sanitized.replace(/；/g, ';');
    sanitized = sanitized.replace(/;+/g, ';');
    sanitized = sanitized.replace(/^;+|;+$/g, '');
    return sanitized;
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
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
    }, 3000);
}

/**
 * Generate filename for download based on QR content
 * @param {string} content - QR Code content
 * @param {string} prefix - Filename prefix
 * @returns {string} - Generated filename
 */
function generateFilename(content, prefix) {
    const parts = content.split(';');
    const identifier = parts[0] || 'QRCode';
    const cleanIdentifier = identifier.replace(/[<>:"/\\|?*]/g, '_');
    return `${prefix}_${cleanIdentifier}.png`;
}

/**
 * Update row numbers in a table
 * @param {HTMLElement} tbody - Table body element
 */
function updateRowNumbers(tbody) {
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        row.querySelector('.row-num').textContent = index + 1;
    });
}

/**
 * Draw QR Code on canvas using qrcode-generator library
 * @param {string} text - Text to encode
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
function drawQRCode(text, canvas) {
    // Create QR code object
    const qr = qrcode(0, 'M'); // type number, error correction level
    qr.addData(text);
    qr.make();

    // Get module count
    const moduleCount = qr.getModuleCount();
    const cellSize = canvas.width / moduleCount;

    // Get canvas context
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw QR code modules
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
// DN QR Code Functions
// ============================================

const dnTableBody = document.getElementById('dnTableBody');
const addDnRowBtn = document.getElementById('addDnRow');
const generateAllDnBtn = document.getElementById('generateAllDn');
const downloadAllDnBtn = document.getElementById('downloadAllDn');

/**
 * Create a new DN table row HTML
 * @returns {string} - HTML string
 */
function createDnRowHTML() {
    return `
        <tr>
            <td class="row-num">1</td>
            <td><input type="text" class="table-input dn-no" placeholder="如DN20250418001"></td>
            <td><input type="text" class="table-input vendor-id" placeholder="如7016"></td>
            <td><input type="text" class="table-input po-no" placeholder="如263275"></td>
            <td class="qr-cell"><canvas class="qr-canvas"></canvas></td>
            <td class="action-cell">
                <button class="btn-icon copy-row" title="复制" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg>
                </button>
                <button class="btn-icon download-row" title="下载" disabled>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button class="btn-icon delete-row" title="删除行">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
            </td>
        </tr>
    `;
}

/**
 * Add a new row to DN table
 */
function addDnRow() {
    const newRow = document.createElement('tr');
    newRow.innerHTML = createDnRowHTML().replace(/<tr>|<\/tr>/g, '');
    dnTableBody.appendChild(newRow);
    updateRowNumbers(dnTableBody);
    attachDnRowEvents(newRow);
}

/**
 * Attach events to a DN row
 * @param {HTMLElement} row - Table row element
 */
function attachDnRowEvents(row) {
    const deleteBtn = row.querySelector('.delete-row');
    const downloadBtn = row.querySelector('.download-row');
    const copyBtn = row.querySelector('.copy-row');

    deleteBtn.addEventListener('click', () => {
        if (dnTableBody.querySelectorAll('tr').length > 1) {
            row.remove();
            updateRowNumbers(dnTableBody);
        } else {
            showToast('至少保留一行', 'error');
        }
    });

    downloadBtn.addEventListener('click', () => {
        const canvas = row.querySelector('.qr-canvas');
        if (canvas.classList.contains('visible')) {
            const content = canvas.dataset.content;
            downloadQrCode(canvas, content, 'DN');
        }
    });

    copyBtn.addEventListener('click', async () => {
        const canvas = row.querySelector('.qr-canvas');
        if (canvas.classList.contains('visible')) {
            await copyQrCodeToClipboard(canvas);
        }
    });
}

/**
 * Generate QR codes for all DN rows
 */
function generateAllDnQRCodes() {
    const rows = dnTableBody.querySelectorAll('tr');
    let successCount = 0;

    for (const row of rows) {
        // Get all inputs in the row
        const inputs = row.querySelectorAll('input.table-input');

        // Get values by index
        const dnNo = inputs[0] ? sanitizeInput(inputs[0].value) : '';
        const vendorId = inputs[1] ? sanitizeInput(inputs[1].value) : '';
        const poNo = inputs[2] ? sanitizeInput(inputs[2].value) : '';

        if (!dnNo || !vendorId || !poNo) continue;

        const content = `${dnNo};${vendorId};${poNo}`;
        const canvas = row.querySelector('.qr-canvas');
        const downloadBtn = row.querySelector('.download-row');
        const copyBtn = row.querySelector('.copy-row');

        if (!canvas) {
            console.error('Canvas not found in row');
            continue;
        }

        try {
            // Set canvas size to high resolution (300x300)
            canvas.width = 300;
            canvas.height = 300;

            // Draw QR code
            drawQRCode(content, canvas);

            canvas.classList.add('visible');
            canvas.dataset.content = content;
            if (downloadBtn) downloadBtn.disabled = false;
            if (copyBtn) copyBtn.disabled = false;
            successCount++;
        } catch (error) {
            console.error('QR generation error:', error);
        }
    }

    if (successCount > 0) {
        downloadAllDnBtn.disabled = false;
        showToast(`成功生成 ${successCount} 个二维码`, 'success');
    } else {
        showToast('请填写至少一行完整数据', 'error');
    }
}

/**
 * Download all DN QR codes
 */
function downloadAllDnQRCodes() {
    const canvases = dnTableBody.querySelectorAll('.qr-canvas.visible');
    canvases.forEach((canvas, index) => {
        setTimeout(() => {
            downloadQrCode(canvas, canvas.dataset.content, 'DN');
        }, index * 200);
    });
    showToast(`正在下载 ${canvases.length} 个二维码...`, 'success');
}

// ============================================
// Detail QR Code Functions
// ============================================

const detailTableBody = document.getElementById('detailTableBody');
const addDetailRowBtn = document.getElementById('addDetailRow');
const generateAllDetailBtn = document.getElementById('generateAllDetail');
const downloadAllDetailBtn = document.getElementById('downloadAllDetail');

/**
 * Create a new Detail table row HTML
 * @returns {string} - HTML string
 */
function createDetailRowHTML() {
    return `
        <tr>
            <td class="row-num">1</td>
            <td><input type="text" class="table-input full-po-no" placeholder="如263275-1-1"></td>
            <td><input type="text" class="table-input qty" placeholder="如3"></td>
            <td><input type="text" class="table-input unit" placeholder="如PC"></td>
            <td><input type="text" class="table-input unique-id" placeholder="如250418003"></td>
            <td><input type="text" class="table-input pn" placeholder="如MT4571-01-001"></td>
            <td class="qr-cell"><canvas class="qr-canvas"></canvas></td>
            <td class="action-cell">
                <button class="btn-icon copy-row" title="复制" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg>
                </button>
                <button class="btn-icon download-row" title="下载" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button class="btn-icon delete-row" title="删除行">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
            </td>
        </tr>
    `;
}

/**
 * Add a new row to Detail table
 */
function addDetailRow() {
    const newRow = document.createElement('tr');
    newRow.innerHTML = createDetailRowHTML().replace(/<tr>|<\/tr>/g, '');
    detailTableBody.appendChild(newRow);
    updateRowNumbers(detailTableBody);
    attachDetailRowEvents(newRow);
}

/**
 * Attach events to a Detail row
 * @param {HTMLElement} row - Table row element
 */
function attachDetailRowEvents(row) {
    const deleteBtn = row.querySelector('.delete-row');
    const downloadBtn = row.querySelector('.download-row');
    const copyBtn = row.querySelector('.copy-row');

    deleteBtn.addEventListener('click', () => {
        if (detailTableBody.querySelectorAll('tr').length > 1) {
            row.remove();
            updateRowNumbers(detailTableBody);
        } else {
            showToast('至少保留一行', 'error');
        }
    });

    downloadBtn.addEventListener('click', () => {
        const canvas = row.querySelector('.qr-canvas');
        if (canvas.classList.contains('visible')) {
            const content = canvas.dataset.content;
            downloadQrCode(canvas, content, 'Detail');
        }
    });

    copyBtn.addEventListener('click', async () => {
        const canvas = row.querySelector('.qr-canvas');
        if (canvas.classList.contains('visible')) {
            await copyQrCodeToClipboard(canvas);
        }
    });
}

/**
 * Generate QR codes for all Detail rows
 */
function generateAllDetailQRCodes() {
    const rows = detailTableBody.querySelectorAll('tr');
    let successCount = 0;

    for (const row of rows) {
        // Get all inputs in the row
        const inputs = row.querySelectorAll('input.table-input');

        // Get values by index
        const fullPoNo = inputs[0] ? sanitizeInput(inputs[0].value) : '';
        const qty = inputs[1] ? sanitizeInput(inputs[1].value) : '';
        const unit = inputs[2] ? sanitizeInput(inputs[2].value) : '';
        const uniqueId = inputs[3] ? sanitizeInput(inputs[3].value) : '';
        const pn = inputs[4] ? sanitizeInput(inputs[4].value) : '';

        if (!fullPoNo || !qty || !unit || !uniqueId || !pn) continue;

        const content = `${fullPoNo};${qty};${unit};${uniqueId};${pn}`;
        const canvas = row.querySelector('.qr-canvas');
        const downloadBtn = row.querySelector('.download-row');
        const copyBtn = row.querySelector('.copy-row');

        if (!canvas) {
            console.error('Canvas not found in Detail row');
            continue;
        }

        try {
            // Set canvas size to high resolution (300x300)
            canvas.width = 300;
            canvas.height = 300;

            // Draw QR code
            drawQRCode(content, canvas);

            canvas.classList.add('visible');
            canvas.dataset.content = content;
            if (downloadBtn) downloadBtn.disabled = false;
            if (copyBtn) copyBtn.disabled = false;
            successCount++;
        } catch (error) {
            console.error('QR generation error:', error);
        }
    }

    if (successCount > 0) {
        downloadAllDetailBtn.disabled = false;
        showToast(`成功生成 ${successCount} 个二维码`, 'success');
    } else {
        showToast('请填写至少一行完整数据', 'error');
    }
}

/**
 * Download all Detail QR codes
 */
function downloadAllDetailQRCodes() {
    const canvases = detailTableBody.querySelectorAll('.qr-canvas.visible');
    canvases.forEach((canvas, index) => {
        setTimeout(() => {
            downloadQrCode(canvas, canvas.dataset.content, 'Detail');
        }, index * 200);
    });
    showToast(`正在下载 ${canvases.length} 个二维码...`, 'success');
}

// ============================================
// Common Download Function
// ============================================

/**
 * Copy QR Code to clipboard
 * @param {HTMLCanvasElement} canvas - Source canvas element
 */
async function copyQrCodeToClipboard(canvas) {
    try {
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });

        // Check if Clipboard API is supported
        if (!navigator.clipboard || !navigator.clipboard.write) {
            showToast('您的浏览器不支持复制功能', 'error');
            return;
        }

        // Write to clipboard
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);

        showToast('二维码已复制到剪贴板', 'success');
    } catch (error) {
        console.error('Copy error:', error);
        showToast('复制失败，请使用下载功能', 'error');
    }
}

/**
 * Download QR Code as PNG image
 * @param {HTMLCanvasElement} canvas - Source canvas element
 * @param {string} content - QR content for filename
 * @param {string} prefix - Filename prefix
 */
function downloadQrCode(canvas, content, prefix) {
    try {
        const filename = generateFilename(content, prefix);
        const dataUrl = canvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Download error:', error);
        showToast('下载失败', 'error');
    }
}

// ============================================
// Event Listeners
// ============================================

// DN Section
addDnRowBtn.addEventListener('click', addDnRow);
generateAllDnBtn.addEventListener('click', generateAllDnQRCodes);
downloadAllDnBtn.addEventListener('click', downloadAllDnQRCodes);

// Detail Section
addDetailRowBtn.addEventListener('click', addDetailRow);
generateAllDetailBtn.addEventListener('click', generateAllDetailQRCodes);
downloadAllDetailBtn.addEventListener('click', downloadAllDetailQRCodes);

// Initialize existing rows
document.querySelectorAll('#dnTableBody tr').forEach(attachDnRowEvents);
document.querySelectorAll('#detailTableBody tr').forEach(attachDetailRowEvents);

console.log('QR Code Generator (Batch Mode) initialized successfully');

// ============================================
// Excel Import/Export Functions
// ============================================

/**
 * Download DN template Excel file
 */
function downloadDnTemplate() {
    const wb = XLSX.utils.book_new();

    // Create sample data with headers
    const data = [
        ['DN No. (送货单号)', 'Vendor ID (供应商编号)', 'PO No. (采购订单)'],
        ['DN20250418001', '7016', '263275'],
        ['DN20250418002', '7016', '263276'],
        ['', '', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '送货单模板');
    XLSX.writeFile(wb, '送货单导入模板.xlsx');
    showToast('模板下载成功', 'success');
}

/**
 * Download Detail template Excel file
 */
function downloadDetailTemplate() {
    const wb = XLSX.utils.book_new();

    // Create sample data with headers
    const data = [
        ['Full PO No. (完整采购单号)', 'Qty (数量)', 'Unit (单位)', 'Unique ID (流水号)', 'PN (零件编号)'],
        ['263275-1-1', '3', 'PC', '250418003', 'MT4571-01-001'],
        ['263275-1-2', '5', 'PC', '250418004', 'MT4571-01-002'],
        ['', '', '', '', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '送货单明细模板');
    XLSX.writeFile(wb, '送货单明细导入模板.xlsx');
    showToast('模板下载成功', 'success');
}

/**
 * Import DN data from Excel file
 * @param {File} file - Excel file
 */
function importDnData(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Remove header row and empty rows
            const rows = jsonData.slice(1).filter(row => row.length > 0 && row.some(cell => cell));

            if (rows.length === 0) {
                showToast('Excel文件中没有数据', 'error');
                return;
            }

            // Clear existing rows except the first one
            const existingRows = dnTableBody.querySelectorAll('tr');
            existingRows.forEach((row, index) => {
                if (index > 0) row.remove();
            });

            // Fill data into rows
            rows.forEach((row, index) => {
                let targetRow;

                if (index === 0) {
                    // Use first existing row
                    targetRow = dnTableBody.querySelector('tr');
                } else {
                    // Create new row
                    addDnRow();
                    targetRow = dnTableBody.querySelectorAll('tr')[index];
                }

                const inputs = targetRow.querySelectorAll('input.table-input');
                if (inputs[0]) inputs[0].value = row[0] || '';
                if (inputs[1]) inputs[1].value = row[1] || '';
                if (inputs[2]) inputs[2].value = row[2] || '';
            });

            updateRowNumbers(dnTableBody);
            showToast(`成功导入 ${rows.length} 行数据`, 'success');

        } catch (error) {
            console.error('Import error:', error);
            showToast('导入失败，请检查文件格式', 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Import Detail data from Excel file
 * @param {File} file - Excel file
 */
function importDetailData(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Remove header row and empty rows
            const rows = jsonData.slice(1).filter(row => row.length > 0 && row.some(cell => cell));

            if (rows.length === 0) {
                showToast('Excel文件中没有数据', 'error');
                return;
            }

            // Clear existing rows except the first one
            const existingRows = detailTableBody.querySelectorAll('tr');
            existingRows.forEach((row, index) => {
                if (index > 0) row.remove();
            });

            // Fill data into rows
            rows.forEach((row, index) => {
                let targetRow;

                if (index === 0) {
                    // Use first existing row
                    targetRow = detailTableBody.querySelector('tr');
                } else {
                    // Create new row
                    addDetailRow();
                    targetRow = detailTableBody.querySelectorAll('tr')[index];
                }

                const inputs = targetRow.querySelectorAll('input.table-input');
                if (inputs[0]) inputs[0].value = row[0] || '';
                if (inputs[1]) inputs[1].value = row[1] || '';
                if (inputs[2]) inputs[2].value = row[2] || '';
                if (inputs[3]) inputs[3].value = row[3] || '';
                if (inputs[4]) inputs[4].value = row[4] || '';
            });

            updateRowNumbers(detailTableBody);
            showToast(`成功导入 ${rows.length} 行数据`, 'success');

        } catch (error) {
            console.error('Import error:', error);
            showToast('导入失败，请检查文件格式', 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

// Event Listeners for Import/Export
document.getElementById('downloadDnTemplate').addEventListener('click', downloadDnTemplate);
document.getElementById('downloadDetailTemplate').addEventListener('click', downloadDetailTemplate);

document.getElementById('importDnFile').addEventListener('change', function (e) {
    if (e.target.files.length > 0) {
        importDnData(e.target.files[0]);
        e.target.value = ''; // Reset file input
    }
});

document.getElementById('importDetailFile').addEventListener('change', function (e) {
    if (e.target.files.length > 0) {
        importDetailData(e.target.files[0]);
        e.target.value = ''; // Reset file input
    }
});

