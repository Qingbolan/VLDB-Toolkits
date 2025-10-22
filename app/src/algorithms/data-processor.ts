/**
 * 数据处理算法模块
 * 包含论文和作者数据的处理、统计和分析逻辑
 */

import type { Paper, AuthorStats, ExcelRow } from '@/store/paper-types'

/**
 * 解析分隔符分隔的字符串为数组
 * 支持多种分隔符: 逗号, 分号, 换行, 竖线
 */
export const parseDelimitedString = (str: string | null | undefined): string[] => {
  if (!str) return []
  // 尝试多种分隔符: 逗号, 分号, 换行
  const delimiters = [',', ';', '\n', '|']
  for (const delimiter of delimiters) {
    if (str.includes(delimiter)) {
      return str
        .split(delimiter)
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }
  }
  // 如果没有分隔符，返回单个元素
  return str.trim() ? [str.trim()] : []
}

/**
 * 格式化作者名字
 * 将 "姓, 名" 或 "Lastname, Firstname" 格式转换为 "Firstname Lastname"
 */
export const formatAuthorName = (name: string): string => {
  const trimmed = name.trim()

  // 如果包含逗号，认为是 "姓, 名" 格式
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim())
    if (parts.length === 2 && parts[0] && parts[1]) {
      // 返回 "名 姓" 格式
      return `${parts[1]} ${parts[0]}`
    }
  }

  // 否则返回原格式
  return trimmed
}

/**
 * 解析作者名字列表，处理通讯作者标记
 * @returns { names: 格式化后的名字数组, correspondingIndices: 通讯作者索引数组 }
 */
export const parseAuthorNames = (str: string | null | undefined): {
  names: string[]
  correspondingIndices: number[]
} => {
  if (!str) return { names: [], correspondingIndices: [] }

  // 按分号分割作者
  const rawNames = str.split(';').map(s => s.trim()).filter(s => s.length > 0)
  const names: string[] = []
  const correspondingIndices: number[] = []

  rawNames.forEach((rawName, index) => {
    // 检查是否有通讯作者标记 *
    const isCorresponding = rawName.includes('*')

    // 移除通讯作者标记
    const cleanName = rawName.replace(/\*/g, '').trim()

    // 格式化名字
    const formattedName = formatAuthorName(cleanName)

    names.push(formattedName)

    if (isCorresponding) {
      correspondingIndices.push(index)
    }
  })

  return { names, correspondingIndices }
}

/**
 * 解析邮箱列表，处理通讯作者标记
 * @returns { emails: 清理后的邮箱数组, correspondingIndices: 通讯作者索引数组 }
 */
export const parseAuthorEmails = (str: string | null | undefined): {
  emails: string[]
  correspondingIndices: number[]
} => {
  if (!str) return { emails: [], correspondingIndices: [] }

  // 按分号分割邮箱
  const rawEmails = str.split(';').map(s => s.trim()).filter(s => s.length > 0)
  const emails: string[] = []
  const correspondingIndices: number[] = []

  rawEmails.forEach((rawEmail, index) => {
    // 检查是否有通讯作者标记 *
    const isCorresponding = rawEmail.includes('*')

    // 移除通讯作者标记
    const cleanEmail = rawEmail.replace(/\*/g, '').trim()

    emails.push(cleanEmail)

    if (isCorresponding) {
      correspondingIndices.push(index)
    }
  })

  return { emails, correspondingIndices }
}

/**
 * 计算作者统计信息
 * 包括论文数量、论文ID列表、警告标记等
 */
export const calculateAuthorStats = (papers: Paper[]): Map<string, AuthorStats> => {
  const authorMap = new Map<string, AuthorStats>()

  // 首先收集所有作者的论文
  papers.forEach(paper => {
    paper.authorEmails.forEach((email, index) => {
      const name = paper.authorNames[index] || 'Unknown'

      if (!authorMap.has(email)) {
        authorMap.set(email, {
          id: email,
          name,
          email,
          paperCount: 0,
          paperIds: [],
          hasWarning: false,
          hasEmailConflict: false,
          hasPotentialDuplicate: false,
        })
      }

      const author = authorMap.get(email)!
      author.paperIds.push(paper.paperId)
    })
  })

  // 排序论文ID并计算统计
  authorMap.forEach(author => {
    author.paperIds.sort((a, b) => a - b) // 按paperId升序排序
    author.paperCount = author.paperIds.length
    author.hasWarning = author.paperCount > 2 // 超过2篇标记warning
  })

  // 检测email冲突（一个email对应多个不同的作者名）
  const emailToNames = new Map<string, Set<string>>()
  papers.forEach(paper => {
    paper.authorEmails.forEach((email, index) => {
      const name = paper.authorNames[index]
      if (!emailToNames.has(email)) {
        emailToNames.set(email, new Set())
      }
      emailToNames.get(email)!.add(name)
    })
  })

  emailToNames.forEach((names, email) => {
    if (names.size > 1) {
      const author = authorMap.get(email)
      if (author) {
        author.hasEmailConflict = true
      }
    }
  })

  return authorMap
}

/**
 * 标记论文的warning信息
 * 基于作者的论文数量和排名标记警告
 */
export const markPaperWarnings = (papers: Paper[], authors: Map<string, AuthorStats>): Paper[] => {
  return papers.map(paper => {
    const warningAuthors = []

    paper.authorEmails.forEach((email, index) => {
      const author = authors.get(email)
      if (!author) return

      if (author.hasWarning) {
        // 找出该论文在作者的论文列表中的排名
        const paperRank = author.paperIds.indexOf(paper.paperId) + 1

        // 如果排名>2，则标记warning
        if (paperRank > 2) {
          warningAuthors.push({
            name: paper.authorNames[index],
            email,
            paperCount: author.paperCount,
            paperRank,
          })
        }
      }
    })

    return {
      ...paper,
      hasWarning: warningAuthors.length > 0,
      warningAuthors,
    }
  })
}

/**
 * 将Excel行数据转换为Paper对象
 */
export const convertExcelRowToPaper = (row: ExcelRow): Paper => {
  // 解析作者名字和通讯作者标记
  const authorNamesResult = parseAuthorNames(row['Author Names'])
  const authorEmailsResult = parseAuthorEmails(row['Author Emails'])

  // 合并两个来源的通讯作者索引（去重）
  const correspondingIndices = Array.from(
    new Set([
      ...authorNamesResult.correspondingIndices,
      ...authorEmailsResult.correspondingIndices,
    ])
  ).sort((a, b) => a - b)

  return {
    paperId: row['Paper ID'],
    originalPaperId: row['Original Paper ID'] || '',
    title: row['Paper Title'] || '',
    abstract: row['Abstract'] || '',
    primaryContactAuthorName: row['Primary Contact Author Name'] || '',
    primaryContactAuthorEmail: row['Primary Contact Author Email'] || '',
    authorNames: authorNamesResult.names,
    authorEmails: authorEmailsResult.emails,
    correspondingAuthorIndices: correspondingIndices,
    trackName: row['Track Name'] || '',
    primarySubjectArea: row['Primary Subject Area'] || '',
    secondarySubjectAreas: parseDelimitedString(row['Secondary Subject Areas']),
    status: row['Status'] || '',
    created: row['Created'] || '',
    lastModified: row['Last Modified'] || '',
    hasWarning: false,
    warningAuthors: [],
  }
}

/**
 * 批量处理Excel数据，返回带有统计信息的论文列表和作者信息
 */
export const processExcelData = (rows: ExcelRow[]): {
  papers: Paper[]
  authors: Map<string, AuthorStats>
} => {
  // 转换为Paper对象
  const papers: Paper[] = rows.map(convertExcelRowToPaper)

  // 计算作者统计
  const authors = calculateAuthorStats(papers)

  // 标记论文warnings
  const papersWithWarnings = markPaperWarnings(papers, authors)

  return {
    papers: papersWithWarnings,
    authors,
  }
}
