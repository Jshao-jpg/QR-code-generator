// ================================================
//  QR码生成器 - 增强功能模块 (双表格统一工作流版)
// ================================================

// ========================
// 功能1: 数字验证
// ========================
function validateQty(value) {
    const num = Number(value.trim());
    if (isNaN(num) || num <= 0) return { valid: false, message: '数量必须是大于0的数字' };
    return { valid: true, value: num };
}

// ========================
// 功能2: 确认对话框 & 预览
// ========================
let confirmCallback = null;
function showConfirm(message, callback) {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    if (modal && messageEl) {
        messageEl.textContent = message;
        confirmCallback = callback;
        modal.classList.add('show');
    }
}
function closeConfirm(confirmed) {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    if (confirmed && typeof confirmCallback === 'function') confirmCallback();
    confirmCallback = null;
}

let currentPreviewCanvas = null;
function showQrPreview(canvas) {
    const modal = document.getElementById('qrPreviewModal');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewContent = document.getElementById('previewContent');
    if (!modal || !previewCanvas || !previewContent) return;
    previewCanvas.width = 400; previewCanvas.height = 400;
    const ctx = previewCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, 400, 400);
    previewContent.textContent = (canvas.dataset.content || '').replace(/;/g, ' ; ');
    currentPreviewCanvas = canvas;
    modal.classList.add('show');
}
function closeQrPreview() {
    document.getElementById('qrPreviewModal').classList.remove('show');
}

// ========================
// 功能3: 报表导出 (.xlsx 格式)
// ========================
// ========================
// 功能3: 报表导出 (.xlsx 格式)
// ========================
async function exportUnifiedReport() {
    const hRows = Array.from(headerTableBody.querySelectorAll('tr'));
    const dRows = Array.from(detailTableBody.querySelectorAll('tr'));
    
    const hasAnyQr = !!document.querySelector('.qr-canvas.visible');
    if (!hasAnyQr) {
        showToast('请先生成二维码再导出报表', 'error');
        return;
    }

    showToast('正在生成送货单报表...', 'info');

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('送货单');
        
        // 1. Setup Columns (Matching template appearance)
        worksheet.columns = [
            { header: '', key: 'col1', width: 12 }, // A: 序号
            { header: '', key: 'col2', width: 25 }, // B: 采购单号
            { header: '', key: 'col3', width: 25 }, // C: 客户料号
            { header: '', key: 'col4', width: 12 }, // D: 数量
            { header: '', key: 'col5', width: 10 }, // E: 单位
            { header: '', key: 'col6', width: 22 }, // F: 二维码
            { header: '', key: 'col7', width: 15 }, // G: 备注
            { header: '', key: 'col8', width: 15 }  // H: (Info Column)
        ];

        // 2. Metadata & Titles (Rows 3-7)
        worksheet.mergeCells('B3:F3');
        const titleCell = worksheet.getCell('B3');
        titleCell.value = 'xxxxxxxxxxxx有限公司';
        titleCell.font = { size: 16, bold: true, name: 'Microsoft YaHei' };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('B4:F4');
        const subtitleCell = worksheet.getCell('B4');
        subtitleCell.value = '送货单';
        subtitleCell.font = { size: 14, bold: true, name: 'Microsoft YaHei' };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Static labels and Dynamic values
        const firstHeader = hRows[0];
        const dnNo = firstHeader.querySelector('.dn-no').value.trim();
        const today = new Date().toISOString().split('T')[0];

        // Row 5
        worksheet.getCell('A5').value = '客户名称：';
        worksheet.getCell('B5').value = '东莞威雅利实业有限公司';
        worksheet.getCell('B5').alignment = { horizontal: 'left' };
        worksheet.getCell('F5').value = '送货单号：';
        worksheet.getCell('G5').value = dnNo;
        worksheet.getCell('G5').alignment = { horizontal: 'left' };

        // Row 6
        worksheet.getCell('A6').value = '客户地址：';
        worksheet.getCell('B6').value = '广东省东莞市长安镇乌沙社区振安中路3号';
        worksheet.getCell('B6').alignment = { horizontal: 'left' };
        worksheet.getCell('F6').value = '开单日期：';
        worksheet.getCell('G6').value = today;
        worksheet.getCell('G6').alignment = { horizontal: 'left' };

        // Row 7
        worksheet.getCell('A7').value = '联系人：';
        worksheet.getCell('B7').value = '罗宏武';
        worksheet.getCell('B7').alignment = { horizontal: 'left' };
        worksheet.getCell('F7').value = '电话：';
        worksheet.getCell('G7').value = '18688620375';
        worksheet.getCell('G7').alignment = { horizontal: 'left' };

        // Align metadata labels
        ['A5', 'A6', 'A7', 'F5', 'F6', 'F7'].forEach(addr => {
            worksheet.getCell(addr).alignment = { horizontal: 'left' };
            worksheet.getCell(addr).font = { bold: true };
        });

        // 3. Header QR (Centered roughly in G area using EMUs)
        const headerCanvas = firstHeader.querySelector('.qr-canvas');
        if (headerCanvas && headerCanvas.classList.contains('visible')) {
            const base64 = headerCanvas.toDataURL('image/png').split(',')[1];
            const imageId = workbook.addImage({ base64, extension: 'png' });
            // nativeColOff/nativeRowOff are the ONLY foolproof ways to offset in ExcelJS without width dependency.
            worksheet.addImage(imageId, {
                tl: { 
                    nativeCol: 6, nativeColOff: 15 * 9525, 
                    nativeRow: 0, nativeRowOff: 15 * 9525 
                }, 
                ext: { width: 70, height: 70 },
                editAs: 'oneCell'
            });
        }

        // 4. Detail Table Headers (Row 9)
        const headerRow = worksheet.getRow(9);
        headerRow.values = ['序号', '采购单号', '客户料号', '数量', '单位', '二维码', '备注'];
        headerRow.height = 25;
        headerRow.eachCell((cell, colNum) => {
            if (colNum <= 7) {
                cell.font = { bold: true, name: 'Microsoft YaHei' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        });

        // 5. Fill Detail Rows (Starting Row 10)
        let currentRow = 10;
        dRows.forEach((row, i) => {
            const po = row.querySelector('.full-po-no').value.trim();
            const qty = row.querySelector('.qty').value.trim();
            const unit = row.querySelector('.unit').value.trim();
            const pn = row.querySelector('.pn').value.trim();
            const canvas = row.querySelector('.qr-canvas');

            if (!po && !qty) return;

            const dataRow = worksheet.getRow(currentRow);
            dataRow.values = [i + 1, po, pn, qty, unit, '', ''];
            dataRow.height = 99; // 稍微减小行高，微调二维码下边距
            dataRow.eachCell((cell, colNum) => {
                if (colNum <= 7) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            });

            // Embed Detail QR (Centered strictly in F using native EMUs without stretching)
            if (canvas && canvas.classList.contains('visible')) {
                const base64 = canvas.toDataURL('image/png').split(',')[1];
                const imgId = workbook.addImage({ base64, extension: 'png' });
                worksheet.addImage(imgId, {
                    tl: { 
                        nativeCol: 5, nativeColOff: 48 * 9525, // 48px right
                        nativeRow: currentRow - 1, nativeRowOff: 8 * 9525 // 8px down
                    },
                    ext: { width: 70, height: 70 },
                    editAs: 'oneCell'
                });
            }
            currentRow++;
        });

        // 6. Footer (Add 5 rows after the last detail row)
        const footerStartRow = currentRow + 4;
        
        worksheet.getCell(`A${footerStartRow}`).value = '送货人（盖章）：';
        worksheet.getCell(`F${footerStartRow}`).value = '收货单位（盖章）：';
        worksheet.getCell(`A${footerStartRow + 1}`).value = '日期：';
        worksheet.getCell(`F${footerStartRow + 1}`).value = '日期：';

        [footerStartRow, footerStartRow + 1].forEach(rIdx => {
            worksheet.getRow(rIdx).eachCell(cell => {
                cell.font = { bold: true };
            });
        });

        // 7. Write and Save
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `送货单报表_${dnNo || today}.xlsx`);
        showToast('✅ 报表导出完成', 'success');
    } catch (error) {
        console.error(error);
        showToast('导出失败: ' + error.message, 'error');
    }
}

// ========================
// 功能4: 模板下载 & 导入
// ========================

function downloadUnifiedTemplate() {
    const wb = XLSX.utils.book_new();
    const data = [
        ['DN No. (送货单号)', 'Vendor ID (供应商编号)', '', ''],
        ['DN20250418001', '7016', '', ''],
        ['', '', '', ''], // Blank row
        ['Full PO No. (完整采购单号)', 'Qty (数量)', 'Unit (单位)', 'PN (零件编号)'], // Removed Remarks
        ['263275-1-1', '3', 'PC', 'MT4571-01-001'],
        ['263275-1-2', '5', 'PC', 'MT4571-01-002']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, '导入模板');
    XLSX.writeFile(wb, '送货单导入模板.xlsx');
    showToast('模板下载成功');
}

function importUnifiedData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const ws = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            let headerData = [];
            let detailData = [];
            let inDetail = false;

            jsonData.forEach(row => {
                if (row.length === 0 || !row.some(c => c)) return;
                const firstCell = String(row[0]).toLowerCase();
                if (firstCell.includes('dn no') || firstCell.includes('送货单号')) { inDetail = false; return; }
                if (firstCell.includes('full po no') || firstCell.includes('完整采购单号')) { inDetail = true; return; }

                if (inDetail) detailData.push(row); else headerData.push(row);
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
                detailData.forEach(d => {
                    const r = addDetailRow();
                    r.querySelector('.full-po-no').value = d[0] || '';
                    r.querySelector('.qty').value = d[1] || '';
                    r.querySelector('.unit').value = d[2] || '';
                    r.querySelector('.pn').value = d[3] || '';
                });
                refreshDetailIds();
            }
            showToast(`成功导入：表头 ${headerData.length} 行，明细 ${detailData.length} 行`);
        } catch (err) { showToast('导入失败', 'error'); }
    };
    reader.readAsArrayBuffer(file);
}

// ========================
// 功能5: 自动保存
// ========================
function saveToLocal() {
    const data = {
        headers: Array.from(headerTableBody.querySelectorAll('tr')).map(r => [
            r.querySelector('.dn-no').value, r.querySelector('.vendor-id').value
        ]),
        details: Array.from(detailTableBody.querySelectorAll('tr')).map(r => [
            r.querySelector('.full-po-no').value, r.querySelector('.qty').value,
            r.querySelector('.unit').value, r.querySelector('.pn').value
        ])
    };
    localStorage.setItem('qr_unified_dual_backup', JSON.stringify(data));
}

function loadFromLocal() {
    const saved = localStorage.getItem('qr_unified_dual_backup');
    if (!saved) return;
    try {
        const data = JSON.parse(saved);
        if (data.headers.length > 0) {
            headerTableBody.innerHTML = '';
            data.headers.forEach(h => {
                const r = addHeaderRow();
                r.querySelector('.dn-no').value = h[0] || '';
                r.querySelector('.vendor-id').value = h[1] || '';
            });
        }
        if (data.details.length > 0) {
            detailTableBody.innerHTML = '';
            data.details.forEach(d => {
                const r = addDetailRow();
                r.querySelector('.full-po-no').value = d[0] || '';
                r.querySelector('.qty').value = d[1] || '';
                r.querySelector('.unit').value = d[2] || '';
                r.querySelector('.pn').value = d[3] || '';
            });
            refreshDetailIds();
        }
    } catch (e) {}
}

// ========================
// 初始化
// ========================
(function() {
    document.getElementById('exportUnifiedReport')?.addEventListener('click', exportUnifiedReport);
    document.getElementById('downloadUnifiedTemplate')?.addEventListener('click', downloadUnifiedTemplate);
    document.getElementById('importUnifiedFile')?.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importUnifiedData(e.target.files[0]);
            e.target.value = '';
        }
    });

    // Auto save on any input
    document.querySelector('.qr-section')?.addEventListener('input', () => {
        clearTimeout(window.saveTimer);
        window.saveTimer = setTimeout(saveToLocal, 1000);
    });

    // Load initial data
    loadFromLocal();
})();

console.log('✅ QR 增强功能 (双表格版) 已就绪');
