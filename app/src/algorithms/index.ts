/**
 * 算法模块统一导出
 *
 * 该模块整合了所有与 Excel 文件处理和数据分析相关的算法，包括：
 * - Excel 文件解析
 * - 数据处理和转换
 * - 作者统计和分析
 * - 论文警告标记
 */

// Excel 解析相关
export {
  parseExcelFile,
  isValidExcelFile,
  getExcelFileInfo,
  type ParseResult,
  type ParseOptions,
} from './excel-parser'

// 数据处理相关
export {
  parseDelimitedString,
  formatAuthorName,
  parseAuthorNames,
  parseAuthorEmails,
  calculateAuthorStats,
  markPaperWarnings,
  convertExcelRowToPaper,
  processExcelData,
} from './data-processor'
