/**
 * 深度检查 Excel 文件结构
 */
const XLSX = require('xlsx');
const path = require('path');

// Excel 文件路径
const excelPath = path.join(__dirname, '..', 'test', 'data', 'Test Data.xlsx');

console.log('读取 Excel 文件:', excelPath);
console.log('='.repeat(80));

try {
  // 读取 Excel 文件 - 使用不同选项
  console.log('\n尝试不同的读取选项...\n');

  // 选项 1: 原始读取，保留所有格式
  const workbook = XLSX.readFile(excelPath, {
    cellDates: true,
    cellNF: false,
    cellText: false,
    cellStyles: true,
  });

  const sheetName = workbook.SheetNames[0];
  console.log('工作表名称:', sheetName);

  const worksheet = workbook.Sheets[sheetName];

  console.log('范围:', worksheet['!ref']);

  // 检查合并单元格
  if (worksheet['!merges']) {
    console.log('\n合并单元格信息:');
    worksheet['!merges'].slice(0, 10).forEach((merge, index) => {
      console.log(`  ${index + 1}. ${XLSX.utils.encode_range(merge)}`);
    });
  }

  // 获取所有单元格
  const cellAddresses = Object.keys(worksheet).filter(key => !key.startsWith('!'));
  console.log('\n总单元格数:', cellAddresses.length);

  // 查看前20个单元格
  console.log('\n前30个单元格内容:');
  cellAddresses.slice(0, 30).forEach(addr => {
    const cell = worksheet[addr];
    const value = cell.v ? String(cell.v).substring(0, 60) : '(空)';
    console.log(`  ${addr}: ${value}`);
  });

  // 使用 defval 选项读取
  console.log('\n\n=== 使用 defval 选项读取 ===');
  const jsonWithDefval = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  console.log('总行数:', jsonWithDefval.length);

  // 找到非空行
  let firstNonEmptyRow = -1;
  let headerRow = -1;

  for (let i = 0; i < Math.min(10, jsonWithDefval.length); i++) {
    const row = jsonWithDefval[i];
    const nonEmptyCells = row.filter(cell => cell && cell !== '').length;
    console.log(`\n第 ${i + 1} 行: ${nonEmptyCells} 个非空单元格`);

    if (nonEmptyCells > 0) {
      console.log(`  内容预览 (前10列):`, row.slice(0, 10));

      if (firstNonEmptyRow === -1) {
        firstNonEmptyRow = i;
      }

      // 检查是否包含 "Paper ID"
      if (row.some(cell => String(cell).includes('Paper ID'))) {
        headerRow = i;
        console.log(`  ✓ 找到表头行!`);
      }
    }
  }

  if (headerRow >= 0) {
    console.log(`\n\n✅ 找到表头在第 ${headerRow + 1} 行`);

    const headers = jsonWithDefval[headerRow];
    const dataRows = jsonWithDefval.slice(headerRow + 1);

    console.log('表头列数:', headers.length);
    console.log('数据行数:', dataRows.length);

    // 显示表头
    console.log('\n表头 (前20列):');
    headers.slice(0, 20).forEach((header, index) => {
      if (header) {
        console.log(`  ${index}: ${header}`);
      }
    });

    // 构建对象数组
    const jsonData = dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        if (header) {
          obj[header] = row[index];
        }
      });
      return obj;
    }).filter(obj => Object.keys(obj).length > 0); // 过滤空对象

    console.log('\n转换后的有效数据总数:', jsonData.length);

    // 验证
    const expectedColumns = [
      'Paper ID',
      'Original Paper ID',
      'Created',
      'Last Modified',
      'Paper Title',
      'Abstract',
      'Primary Contact Author Name',
      'Primary Contact Author Email',
      'Author Names',
      'Author Emails',
      'Track Name',
      'Primary Subject Area',
      'Secondary Subject Areas',
      'Status'
    ];

    console.log('\n列名验证:');
    let allMatch = true;
    expectedColumns.forEach(col => {
      const exists = headers.includes(col);
      const status = exists ? '✓' : '✗';
      console.log(`  ${status} ${col}`);
      if (!exists) allMatch = false;
    });

    if (allMatch) {
      console.log('\n✅ 所有期望的列名都存在！');

      // 显示前3条数据
      console.log('\n样本数据 (前3条):');
      jsonData.slice(0, 3).forEach((row, index) => {
        console.log(`\n--- 第 ${index + 1} 条数据 ---`);
        console.log(`  Paper ID: ${row['Paper ID']}`);
        console.log(`  Title: ${row['Paper Title']?.toString().substring(0, 50) || '(空)'}...`);
        console.log(`  Author Names: ${row['Author Names'] || '(空)'}`);
        console.log(`  Author Emails: ${row['Author Emails'] || '(空)'}`);
        console.log(`  Status: ${row['Status'] || '(空)'}`);
      });

      // 保存正确的 JSON 数据到文件
      const fs = require('fs');
      const outputPath = path.join(__dirname, '..', 'test', 'parsed_data.json');
      fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
      console.log(`\n✅ 数据已保存到: ${outputPath}`);
    } else {
      console.log('\n❌ 部分列名缺失，可能需要调整');
    }
  } else {
    console.log('\n\n❌ 未找到表头行');
  }

} catch (error) {
  console.error('\n错误:', error.message);
  console.error(error.stack);
}

console.log('\n' + '='.repeat(80));
