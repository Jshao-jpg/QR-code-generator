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
function validateRow(po, qty, netWt, grossWt) {
    // 只要包含两个-且-前后都有内容就可以
    const poRegex = /^[^-]+-[^-]+-.+$/; /* Allow at least two dashes */
    if (!poRegex.test(po)) {
        return { valid: false, message: `采购单号格式不正确: ${po} (应包含两个'-'且前后有内容)` };
    }
    const qtyVal = Number(qty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
        return { valid: false, message: `数量必须为大于0的正数: ${qty}` };
    }
    if (!netWt || netWt.trim() === '') {
        return { valid: false, message: `产品净重不能为空` };
    }
    if (!grossWt || grossWt.trim() === '') {
        return { valid: false, message: `产品总重不能为空` };
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
        const netWt = row.querySelector('.net-wt').value.trim();
        const grossWt = row.querySelector('.gross-wt').value.trim();
        const remarks = row.querySelector('.remarks').value.trim();
        const id = row.querySelector('.unique-id').value.trim(); // 引入流水号参与查重
        
        if (!po && !qty) continue;

        const key = `${po}|${qty}|${unit}|${pn}|${id}|${netWt}|${grossWt}|${remarks}`;
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
        <td>
            <select class="table-input unit">
                <option value="PC">PC</option>
                <option value="Kg">Kg</option>
                <option value="M">M</option>
                <option value="ROLL">ROLL</option>
                <option value="SET">SET</option>
            </select>
        </td>
        <td><input type="text" class="table-input unique-id" value="${id}" readonly></td>
        <td><input type="text" class="table-input pn" placeholder="零件编号"></td>
        <td><input type="text" class="table-input net-wt" placeholder="产品净重"></td>
        <td><input type="text" class="table-input gross-wt" placeholder="产品总重"></td>
        <td><input type="text" class="table-input remarks" placeholder="备注"></td>
        <td class="qr-cell"><canvas class="qr-canvas"></canvas></td>
        <td class="action-cell">
            <div class="row-actions">
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
        const netWt = dRows[i].querySelector('.net-wt').value.trim();
        const grossWt = dRows[i].querySelector('.gross-wt').value.trim();
        if (!po && !qty) continue; // Skip empty rows
        
        const validation = validateRow(po, qty, netWt, grossWt);
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
            let unitVal = d[2] || 'PC'; // Default to PC if empty
            if (unitVal.toUpperCase() === 'PCS') unitVal = 'PC';
            r.querySelector('.unit').value = unitVal;
            r.querySelector('.pn').value = d[3] || '';
            r.querySelector('.net-wt').value = d[4] || '';
            r.querySelector('.gross-wt').value = d[5] || '';
            r.querySelector('.remarks').value = d[6] || '';
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

    // PWA Install Logic
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can install the PWA
        const installBtn = document.getElementById('installAppBtn');
        if (installBtn) {
            installBtn.style.display = 'flex';
            installBtn.addEventListener('click', async () => {
                // Hide the app provided install promotion
                installBtn.style.display = 'none';
                // Show the install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
            });
        }
    });

    // Optionally handle the appinstalled event
    window.addEventListener('appinstalled', () => {
        const installBtn = document.getElementById('installAppBtn');
        if(installBtn) installBtn.style.display = 'none';
        console.log('PWA was installed');
    });

    // ============================================
    // Centralized Gitee API Config System
    // ============================================
    const CONFIG_PATH = 'report-config.json';
    const DEFAULTS = {
        clientName: '东莞威雅利实业有限公司',
        clientAddr: '广东省东莞市长安镇乌沙社区振安中路3号',
        contact: '罗宏武',
        phone: '18688620375',
        giteeToken: '640b36a7c6bcc58e04a585f051bfe62b', // User provided token
        giteeRepo: 'zsh1598/qr-delivery-config' // Hardcoded for automatic sync
    };
    
    window.globalReportConfig = { ...DEFAULTS };
    let currentFileSha = null;

    // Load initial settings from localStorage (for the admin's local session)
    const localAdminSettings = JSON.parse(localStorage.getItem('adminSettings')) || {};
    if (localAdminSettings.giteeRepo) window.globalReportConfig.giteeRepo = localAdminSettings.giteeRepo;
    if (localAdminSettings.giteeToken) window.globalReportConfig.giteeToken = localAdminSettings.giteeToken;

    async function fetchGiteeConfig() {
        const statusEl = document.getElementById('configStatusText');
        const { giteeRepo, giteeToken } = window.globalReportConfig;

        if (!giteeRepo) {
            if (statusEl) statusEl.innerText = '○ 未配置云端仓库，使用内置默认值';
            return;
        }

        try {
            // Fetch without token if none exists (works for public repos)
            const tokenParam = giteeToken ? `?access_token=${giteeToken}` : '';
            const url = `https://gitee.com/api/v5/repos/${giteeRepo}/contents/${CONFIG_PATH}${tokenParam}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Repo not found or access denied');
            
            const data = await response.json();
            currentFileSha = data.sha;
            
            // Decode Base64 (handle Unicode)
            const jsonStr = decodeURIComponent(atob(data.content).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const cloudConfig = JSON.parse(jsonStr);
            
            window.globalReportConfig = { ...window.globalReportConfig, ...cloudConfig };
            if (statusEl) statusEl.innerText = '● 报表配置已实时同步自 Gitee 云端';
        } catch (err) {
            console.error('Fetch error:', err);
            if (statusEl) statusEl.innerText = '○ 无法同步云端，请检查网络或 Gitee 仓库设置';
        }
    }

    // --- Admin Modal Logic ---
    const adminModal = document.getElementById('zshSecretPortal');
    const closeAdmin = adminModal ? adminModal.querySelector('.close-zsh') : null;
    const saveAdminBtn = document.getElementById('saveAdminBtn');
    const footerAdminLink = document.getElementById('footerAdminLink');
    const logo = document.querySelector('.logo');

    function openAdminPanel() {
        console.log('[Debug] Attempting to open Admin Panel...');
        try {
            if (!adminModal) {
                console.error('[Debug] Error: zshSecretPortal element not found!');
                alert('系统错误：找不到管理组件，请检查 index.html。');
                return;
            }
            
            // Set values safely
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };
            
            setVal('admClientName', window.globalReportConfig.clientName);
            setVal('admClientAddr', window.globalReportConfig.clientAddr);
            setVal('admContact', window.globalReportConfig.contact);
            setVal('admPhone', window.globalReportConfig.phone);
            setVal('admGiteeRepo', window.globalReportConfig.giteeRepo);
            setVal('admGiteeToken', window.globalReportConfig.giteeToken);
            
            adminModal.style.setProperty('display', 'flex', 'important');
            console.log('[Debug] Admin Panel displayed.');
            alert('⚙️ 管理中心已开启，请查看屏幕。');
        } catch (err) {
            console.error('[Debug] Error in openAdminPanel:', err);
        }
    }

    // Link in footer (Hidden in production)
    if (footerAdminLink) {
        footerAdminLink.style.display = 'none'; 
    }

    // Logo entrance (Primary - 3 Clicks)
    let logoClicks = 0;
    if (logo) {
        logo.style.cursor = 'help';
        logo.addEventListener('click', (e) => {
            logoClicks++;
            if (logoClicks >= 3) {
                console.log('[Debug] Logo 3-clicks reached');
                openAdminPanel();
                logoClicks = 0;
            }
            // Auto reset after 3 seconds of inactivity
            setTimeout(() => { logoClicks = 0; }, 3000);
        });
    }

    if (closeAdmin) {
        closeAdmin.addEventListener('click', () => adminModal.style.setProperty('display', 'none', 'important'));
    }

    saveAdminBtn.addEventListener('click', async () => {
        const repo = document.getElementById('admGiteeRepo').value.trim();
        const token = document.getElementById('admGiteeToken').value.trim();
        
        if (!repo || !token) {
            showToast('请先填写 Gitee 仓库路径和私人令牌', 'error');
            return;
        }

        const newData = {
            clientName: document.getElementById('admClientName').value.trim(),
            clientAddr: document.getElementById('admClientAddr').value.trim(),
            contact: document.getElementById('admContact').value.trim(),
            phone: document.getElementById('admPhone').value.trim()
        };

        saveAdminBtn.disabled = true;
        saveAdminBtn.innerText = '同步中...';

        try {
            // Encode Base64 correctly for UTF-8
            const contentStr = JSON.stringify(newData, null, 2);
            const base64Content = btoa(encodeURIComponent(contentStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
            
            const url = `https://gitee.com/api/v5/repos/${repo}/contents/${CONFIG_PATH}`;
            const payload = {
                access_token: token,
                content: base64Content,
                message: 'Update report config via Admin Panel'
            };
            if (currentFileSha) payload.sha = currentFileSha;

            const response = await fetch(url, {
                method: currentFileSha ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('API Sync Failed');

            // Success: Update local state and storage
            window.globalReportConfig = { ...window.globalReportConfig, ...newData, giteeRepo: repo, giteeToken: token };
            localStorage.setItem('adminSettings', JSON.stringify({ giteeRepo: repo, giteeToken: token }));
            
            showToast('✅ 云端同步成功！所有供应商已即时同步。', 'success');
            adminModal.style.setProperty('display', 'none', 'important');
            fetchGiteeConfig(); // Refresh
        } catch (err) {
            console.error(err);
            showToast('同步失败，请检查仓库路径、令牌及网络', 'error');
        } finally {
            saveAdminBtn.disabled = false;
            saveAdminBtn.innerText = '立即推送到云端 (API Sync)';
        }
    });

    fetchGiteeConfig();

    console.log('Unified QR Generator (Dual-Table) Ready - v54');
});
