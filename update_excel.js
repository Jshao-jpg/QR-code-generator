const ExcelJS = require('exceljs');

async function updateValidation(filename) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filename);
        let updated = false;

        workbook.eachSheet((worksheet) => {
            let unitColIndex = -1;
            let headerRowIndex = -1;
            
            // Search rows for "单位" or "Unit"
            for (let r = 1; r <= 20; r++) {
                const row = worksheet.getRow(r);
                row.eachCell((cell, colNumber) => {
                    if (cell.value && typeof cell.value === 'string' && (cell.value.includes('单位') || cell.value.toLowerCase().includes('unit'))) {
                        unitColIndex = colNumber;
                        headerRowIndex = r;
                    }
                });
                if (unitColIndex !== -1) break;
            }

            if (unitColIndex !== -1) {
                console.log(`Found unit column in ${filename} at row ${headerRowIndex}, col ${unitColIndex}`);
                for (let i = headerRowIndex + 1; i <= 1000; i++) {
                    const cell = worksheet.getCell(i, unitColIndex);
                    cell.dataValidation = {
                        type: 'list',
                        allowBlank: true,
                        formulae: ['"Kg,M,PC,ROLL,SET"'],
                        showErrorMessage: true,
                        errorTitle: '单位错误',
                        error: '请从下拉菜单中选择有效的单位。',
                        showInputMessage: true,
                        promptTitle: '选择单位',
                        prompt: '请选择 Kg, M, PC, ROLL, 或 SET'
                    };
                }
                updated = true;
            }
        });

        if (updated) {
            await workbook.xlsx.writeFile(filename);
            console.log(`Successfully updated ${filename}`);
        } else {
            console.log(`No '单位' column found in ${filename}`);
        }
    } catch (e) {
        console.error(`Error processing ${filename}:`, e);
    }
}

async function main() {
    await updateValidation('送货单导入模板.xlsx');
}

main();
