/**
 * Excel 导出算法模块
 * 处理 Papers 数据导出为带样式的 Excel 文件
 */

import * as XLSX from 'xlsx-js-style'
import type { Paper, AuthorMerge } from '@/store/paper-types'

/**
 * 导出 Papers 到 Excel，包含标记和样式
 * @param papers - 论文列表
 * @param authorMerges - 作者合并记录
 * @returns Excel 文件的 ArrayBuffer
 */
export const exportPapersToExcel = (
  papers: Paper[],
  authorMerges: AuthorMerge[]
): ArrayBuffer => {
  // 创建一个 email 到 merge group 的映射
  const emailToMergeGroup = new Map<string, AuthorMerge>()
  authorMerges.forEach(merge => {
    emailToMergeGroup.set(merge.primaryEmail, merge)
    merge.mergedEmails.forEach((email: string) => {
      emailToMergeGroup.set(email, merge)
    })
  })

  // 准备数据行
  const rows = papers.map(paper => {
    // 检查是否有 warning
    const isMarked = paper.hasWarning

    // 生成 note: 列出所有 warning 作者及原因
    let note = ''
    if (paper.warningAuthors && paper.warningAuthors.length > 0) {
      note = paper.warningAuthors
        .map(wa => `${wa.name} (${wa.email}): Over quota - ${wa.paperCount} papers, this is paper #${wa.paperRank}`)
        .join('; ')
    }

    // 检查是否有链接的作者
    const linkedAuthorEmails = paper.authorEmails.filter(email => emailToMergeGroup.has(email))
    let addition = ''
    if (linkedAuthorEmails.length > 0) {
      const linkedAuthorsInfo = linkedAuthorEmails.map(email => {
        const merge = emailToMergeGroup.get(email)!
        const allEmails = [merge.primaryEmail, ...merge.mergedEmails]
        return `${paper.authorNames[paper.authorEmails.indexOf(email)]} linked with ${allEmails.length - 1} other(s)`
      })
      addition = linkedAuthorsInfo.join('; ')
    }

    // 标记 warning 作者和 linked 作者
    const warningEmails = new Set(paper.warningAuthors?.map(wa => wa.email) || [])

    // 构建作者列表，标注 warning 和 linked
    const authorsList = paper.authorNames.map((name, idx) => {
      const email = paper.authorEmails[idx]
      let marker = ''
      if (warningEmails.has(email)) {
        marker = ' [WARNING]'
      }
      if (emailToMergeGroup.has(email)) {
        marker += ' [LINKED]'
      }
      return name + marker
    }).join('; ')

    // 通讯作者
    const correspondingAuthors = paper.authorNames
      .filter((_, idx) => paper.correspondingAuthorIndices.includes(idx))
      .join('; ')

    return {
      'Paper ID': paper.paperId,
      'Original Paper ID': paper.originalPaperId,
      'Title': paper.title,
      'Authors': authorsList,
      'Author Names': paper.authorNames.join('; '),
      'Author Emails': paper.authorEmails.join('; '),
      'Organizations': paper.authorOrganizations.join('; '),
      'Corresponding Authors': correspondingAuthors,
      'Primary Contact': paper.primaryContactAuthorName,
      'Primary Contact Email': paper.primaryContactAuthorEmail,
      'Track': paper.trackName,
      'Primary Subject Area': paper.primarySubjectArea,
      'Secondary Subject Areas': paper.secondarySubjectAreas.join('; '),
      'Status': paper.status,
      'Created': paper.created,
      'Last Modified': paper.lastModified,
      'Is Marked': isMarked ? 'Yes' : 'No',
      'Note': note,
      'Addition': addition,
    }
  })

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(rows)

  // 获取范围
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

  // 应用样式
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })

      if (!worksheet[cellAddress]) continue

      // 初始化单元格样式
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {}
      }

      // 标题行样式 (深灰色背景，白色文字)
      if (R === 0) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4A5568' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        }
      } else {
        // 数据行
        const paper = papers[R - 1]

        // Warning 记录用玫瑰红背景 (MistyRose/Light Rose)
        if (paper.hasWarning) {
          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: 'FFE4E8' } }, // 玫瑰红 Rose Pink
            alignment: { vertical: 'top', wrapText: true },
          }
        } else {
          worksheet[cellAddress].s = {
            alignment: { vertical: 'top', wrapText: true },
          }
        }

        // 特殊列处理
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })]
        const colName = headerCell?.v

        // Authors 列：包含 [WARNING] 和 [LINKED] 标记
        if (colName === 'Authors') {
          const hasWarningAuthors = paper.warningAuthors && paper.warningAuthors.length > 0
          const hasLinkedAuthors = paper.authorEmails.some(email => emailToMergeGroup.has(email))

          if (hasWarningAuthors && hasLinkedAuthors) {
            // 既有 warning 又有 linked - 使用渐变或混合色 (这里用 warning 色优先)
            worksheet[cellAddress].s.fill = { fgColor: { rgb: 'FFE4E8' } }
            worksheet[cellAddress].s.font = { bold: true }
          } else if (hasWarningAuthors) {
            // 只有 warning - 红色文字
            worksheet[cellAddress].s.font = { color: { rgb: 'DC2626' }, bold: true }
          } else if (hasLinkedAuthors) {
            // 只有 linked - 紫色文字
            worksheet[cellAddress].s.font = { color: { rgb: '9333EA' }, bold: true }
          }
        }

        // Note 列 - 如果有内容，使用橙色文字强调
        if (colName === 'Note' && worksheet[cellAddress].v) {
          worksheet[cellAddress].s.font = { color: { rgb: 'EA580C' } }
        }

        // Addition 列 - 如果有内容，使用紫色文字
        if (colName === 'Addition' && worksheet[cellAddress].v) {
          worksheet[cellAddress].s.font = { color: { rgb: '9333EA' } }
        }

        // Is Marked 列 - Yes 用红色，No 用绿色
        if (colName === 'Is Marked') {
          if (worksheet[cellAddress].v === 'Yes') {
            worksheet[cellAddress].s.font = { color: { rgb: 'DC2626' }, bold: true }
          } else {
            worksheet[cellAddress].s.font = { color: { rgb: '16A34A' } }
          }
        }
      }
    }
  }

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 10 },  // Paper ID
    { wch: 20 },  // Original Paper ID
    { wch: 50 },  // Title
    { wch: 60 },  // Authors (with markers)
    { wch: 40 },  // Author Names
    { wch: 50 },  // Author Emails
    { wch: 40 },  // Organizations
    { wch: 30 },  // Corresponding Authors
    { wch: 25 },  // Primary Contact
    { wch: 35 },  // Primary Contact Email
    { wch: 20 },  // Track
    { wch: 25 },  // Primary Subject Area
    { wch: 30 },  // Secondary Subject Areas
    { wch: 15 },  // Status
    { wch: 20 },  // Created
    { wch: 20 },  // Last Modified
    { wch: 12 },  // Is Marked
    { wch: 80 },  // Note
    { wch: 40 },  // Addition
  ]

  // 设置行高 (让内容更好地显示)
  worksheet['!rows'] = []
  for (let R = 0; R <= range.e.r; ++R) {
    worksheet['!rows'][R] = { hpx: R === 0 ? 25 : 20 } // 标题行稍高
  }

  // 创建工作簿
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Papers')

  // 导出为 ArrayBuffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true, // 启用样式
  })

  return excelBuffer as ArrayBuffer
}
