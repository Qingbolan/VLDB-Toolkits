/**
 * Excel 文件解析模块
 * 负责读取和解析 Excel 文件，提取数据集标签和数据行
 */

import * as XLSX from 'xlsx'
import type { ExcelRow } from '@/store/paper-types'

export interface ParseResult {
  label: string // 数据集标签
  data: ExcelRow[] // 解析后的数据行
  rowCount: number // 数据行数
}

export interface ParseOptions {
  /**
   * 查找表头行时扫描的最大行数
   * @default 10
   */
  maxHeaderSearchRows?: number

  /**
   * 表头必须包含的关键列名（用于识别表头行）
   * @default "Paper ID"
   */
  headerKeyColumn?: string
}

/**
 * 解析 Excel 文件
 *
 * @param file - 要解析的 File 对象
 * @param options - 解析选项
 * @returns Promise<ParseResult> - 解析结果
 * @throws Error - 如果文件为空、找不到表头或没有有效数据
 */
export const parseExcelFile = async (
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> => {
  const {
    maxHeaderSearchRows = 10,
    headerKeyColumn = 'Paper ID',
  } = options

  // 读取文件
  const buffer = await file.arrayBuffer()

  // 解析 Excel
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // 转换为二维数组
  const arrayData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  }) as any[][]

  if (arrayData.length === 0) {
    throw new Error('Excel file is empty or invalid')
  }

  // 查找表头行（包含关键列名）
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(maxHeaderSearchRows, arrayData.length); i++) {
    const row = arrayData[i]
    if (row.some((cell: any) => String(cell).includes(headerKeyColumn))) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(`Could not find header row (must contain "${headerKeyColumn}")`)
  }

  // 提取数据集标签（如果存在且不是表头行）
  let label = 'Untitled Dataset'
  if (headerRowIndex > 0 && arrayData[0] && arrayData[0][0]) {
    // 第一行第一列作为label
    label = String(arrayData[0][0]).trim()
  }

  // 提取表头和数据行
  const headers = arrayData[headerRowIndex] as string[]
  const dataRows = arrayData.slice(headerRowIndex + 1)

  // 转换为对象数组
  const jsonData: ExcelRow[] = dataRows
    .map(row => {
      const obj: any = {}
      headers.forEach((header, index) => {
        if (header) {
          obj[header] = row[index]
        }
      })
      return obj
    })
    .filter(obj => Object.keys(obj).length > 0 && obj[headerKeyColumn]) // 过滤空行和没有关键列的行

  if (jsonData.length === 0) {
    throw new Error('No valid data found in Excel file')
  }

  return {
    label,
    data: jsonData,
    rowCount: jsonData.length,
  }
}

/**
 * 验证 Excel 文件格式
 *
 * @param file - 要验证的文件
 * @returns boolean - 是否为有效的 Excel 文件
 */
export const isValidExcelFile = (file: File): boolean => {
  return file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
}

/**
 * 读取 Excel 文件的基本信息（不进行完整解析）
 *
 * @param file - Excel 文件
 * @returns Promise<{ sheetNames: string[], estimatedRows: number }> - 文件信息
 */
export const getExcelFileInfo = async (file: File): Promise<{
  sheetNames: string[]
  estimatedRows: number
}> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', sheetStubs: true })

  const sheetNames = workbook.SheetNames
  const firstSheet = workbook.Sheets[sheetNames[0]]

  // 获取范围信息
  const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1')
  const estimatedRows = range.e.r - range.s.r + 1

  return {
    sheetNames,
    estimatedRows,
  }
}
