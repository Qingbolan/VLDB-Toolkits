/**
 * 测试修复后的 Excel 导入逻辑
 * 模拟前端 DataImportPage.tsx 的处理流程
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Excel 文件路径
const excelPath = path.join(__dirname, 'data', 'Test Data.xlsx');

console.log('='.repeat(80));
console.log('测试 Excel 导入逻辑');
console.log('='.repeat(80));

try {
  console.log('\n1. 读取 Excel 文件...');
  console.log(`   文件路径: ${excelPath}`);

  // 模拟前端的读取流程
  const buffer = fs.readFileSync(excelPath);

  console.log('\n2. 解析 Excel...');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  console.log(`   工作表: ${sheetName}`);

  console.log('\n3. 转换为数组格式...');
  const arrayData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });
  console.log(`   总行数: ${arrayData.length}`);

  // 查找表头行
  console.log('\n4. 查找表头行...');
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, arrayData.length); i++) {
    const row = arrayData[i];
    if (row.some(cell => String(cell).includes('Paper ID'))) {
      headerRowIndex = i;
      console.log(`   ✓ 找到表头在第 ${i + 1} 行`);
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('❌ 未找到表头行（必须包含 "Paper ID"）');
  }

  // 提取表头和数据
  console.log('\n5. 提取表头和数据...');
  const headers = arrayData[headerRowIndex];
  const dataRows = arrayData.slice(headerRowIndex + 1);

  console.log(`   表头列数: ${headers.length}`);
  console.log(`   数据行数: ${dataRows.length}`);

  // 转换为对象数组
  console.log('\n6. 转换为对象数组...');
  const jsonData = dataRows
    .map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        if (header) {
          obj[header] = row[index];
        }
      });
      return obj;
    })
    .filter(obj => Object.keys(obj).length > 0 && obj['Paper ID']);

  console.log(`   有效数据行数: ${jsonData.length}`);

  if (jsonData.length === 0) {
    throw new Error('❌ 未找到有效数据');
  }

  // 验证必需的列
  console.log('\n7. 验证必需的列...');
  const requiredColumns = [
    'Paper ID',
    'Paper Title',
    'Primary Contact Author Name',
    'Primary Contact Author Email',
    'Author Names',
    'Author Emails'
  ];

  let allColumnsExist = true;
  requiredColumns.forEach(col => {
    const exists = headers.includes(col);
    const status = exists ? '✓' : '✗';
    console.log(`   ${status} ${col}`);
    if (!exists) {
      allColumnsExist = false;
    }
  });

  if (!allColumnsExist) {
    throw new Error('❌ 缺少必需的列');
  }

  // 显示样本数据
  console.log('\n8. 样本数据 (前5条):');
  jsonData.slice(0, 5).forEach((row, index) => {
    console.log(`\n   --- 第 ${index + 1} 条 ---`);
    console.log(`   Paper ID: ${row['Paper ID']}`);
    console.log(`   Title: ${(row['Paper Title'] || '').toString().substring(0, 50)}...`);
    console.log(`   Contact: ${row['Primary Contact Author Name']}`);
    console.log(`   Email: ${row['Primary Contact Author Email']}`);
    console.log(`   Authors: ${row['Author Names'] || '(无)'}`);
    console.log(`   Author Emails: ${row['Author Emails'] || '(无)'}`);
  });

  // 分析作者数据
  console.log('\n9. 分析作者数据...');

  const parseDelimitedString = (str) => {
    if (!str) return [];
    const delimiters = [',', ';', '\n', '|'];
    for (const delimiter of delimiters) {
      if (str.includes(delimiter)) {
        return str
          .split(delimiter)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
    }
    return str.trim() ? [str.trim()] : [];
  };

  // 统计作者提交数
  const authorSubmissions = new Map();

  jsonData.forEach(row => {
    const authorEmails = parseDelimitedString(row['Author Emails']);
    const authorNames = parseDelimitedString(row['Author Names']);

    authorEmails.forEach((email, index) => {
      const cleanEmail = email.replace('*', '').trim();
      if (!authorSubmissions.has(cleanEmail)) {
        authorSubmissions.set(cleanEmail, {
          name: authorNames[index] ? authorNames[index].replace('*', '').trim() : 'Unknown',
          count: 0,
          papers: []
        });
      }
      const author = authorSubmissions.get(cleanEmail);
      author.count++;
      author.papers.push(row['Paper ID']);
    });
  });

  console.log(`   总作者数: ${authorSubmissions.size}`);

  // 找出超过2篇的作者
  const authorsOverLimit = Array.from(authorSubmissions.entries())
    .filter(([_, data]) => data.count > 2)
    .sort((a, b) => b[1].count - a[1].count);

  console.log(`   超过2篇的作者: ${authorsOverLimit.length}`);

  if (authorsOverLimit.length > 0) {
    console.log('\n   超限作者列表 (前10个):');
    authorsOverLimit.slice(0, 10).forEach(([email, data], index) => {
      console.log(`   ${index + 1}. ${data.name} (${email}): ${data.count} 篇`);
      console.log(`      Paper IDs: ${data.papers.join(', ')}`);
    });
  }

  // 保存处理后的数据
  const outputPath = path.join(__dirname, 'parsed_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('✅ 测试完成！');
  console.log(`   处理了 ${jsonData.length} 条论文数据`);
  console.log(`   发现 ${authorSubmissions.size} 个唯一作者`);
  console.log(`   其中 ${authorsOverLimit.length} 个作者超过投稿限制`);
  console.log(`   数据已保存到: ${outputPath}`);
  console.log('='.repeat(80));

} catch (error) {
  console.error('\n' + '='.repeat(80));
  console.error('❌ 测试失败！');
  console.error('错误信息:', error.message);
  console.error('='.repeat(80));
  process.exit(1);
}
