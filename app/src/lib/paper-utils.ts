/**
 * 论文和作者相关的工具函数
 */

import type { Paper, AuthorStats, AuthorWarning } from '@/store/paper-types'

/**
 * 获取论文的warning级别
 */
export const getPaperWarningLevel = (paper: Paper): 'none' | 'warning' | 'critical' => {
  if (!paper.hasWarning) return 'none'

  // 如果有多个作者超quota，标记为critical
  if (paper.warningAuthors.length > 1) return 'critical'

  return 'warning'
}

/**
 * 获取作者的warning级别
 */
export const getAuthorWarningLevel = (author: AuthorStats): 'none' | 'warning' | 'critical' => {
  if (!author.hasWarning && !author.hasEmailConflict) return 'none'

  // Email冲突且论文超过2篇，标记为critical
  if (author.hasEmailConflict && author.hasWarning) return 'critical'

  if (author.hasWarning || author.hasEmailConflict) return 'warning'

  return 'none'
}

/**
 * 格式化作者列表显示
 */
export const formatAuthorList = (
  authorNames: string[],
  authorEmails: string[],
  maxDisplay: number = 3
): string => {
  if (authorNames.length === 0) return 'No authors'

  if (authorNames.length <= maxDisplay) {
    return authorNames.join(', ')
  }

  const displayed = authorNames.slice(0, maxDisplay).join(', ')
  const remaining = authorNames.length - maxDisplay

  return `${displayed} +${remaining} more`
}

/**
 * 获取论文的warning消息
 */
export const getPaperWarningMessage = (paper: Paper): string => {
  if (!paper.hasWarning) return ''

  const authors = paper.warningAuthors.map(a => a.name).join(', ')

  if (paper.warningAuthors.length === 1) {
    const author = paper.warningAuthors[0]
    return `Author "${author.name}" has ${author.paperCount} papers (this is paper #${author.paperRank})`
  }

  return `Multiple authors (${authors}) exceed the 2-paper quota`
}

/**
 * 获取作者的warning消息
 */
export const getAuthorWarningMessage = (author: AuthorStats): string => {
  const messages: string[] = []

  if (author.hasWarning) {
    messages.push(`${author.paperCount} papers submitted (quota exceeded)`)
  }

  if (author.hasEmailConflict) {
    messages.push(`Email associated with multiple author names`)
  }

  if (author.hasPotentialDuplicate) {
    messages.push(`Potential duplicate author`)
  }

  return messages.join(' • ')
}

/**
 * 搜索论文（标题、摘要、作者）
 */
export const searchPapers = (papers: Paper[], query: string): Paper[] => {
  if (!query.trim()) return papers

  const lowerQuery = query.toLowerCase()

  return papers.filter(paper => {
    return (
      paper.title.toLowerCase().includes(lowerQuery) ||
      paper.abstract.toLowerCase().includes(lowerQuery) ||
      paper.authorNames.some(name => name.toLowerCase().includes(lowerQuery)) ||
      paper.authorEmails.some(email => email.toLowerCase().includes(lowerQuery)) ||
      paper.paperId.toString().includes(lowerQuery)
    )
  })
}

/**
 * 搜索作者
 */
export const searchAuthors = (authors: AuthorStats[], query: string): AuthorStats[] => {
  if (!query.trim()) return authors

  const lowerQuery = query.toLowerCase()

  return authors.filter(author => {
    return (
      author.name.toLowerCase().includes(lowerQuery) ||
      author.email.toLowerCase().includes(lowerQuery) ||
      author.organization?.toLowerCase().includes(lowerQuery)
    )
  })
}

/**
 * 过滤论文
 */
export const filterPapers = (
  papers: Paper[],
  filters: {
    showWarningOnly?: boolean
    status?: string
    track?: string
  }
): Paper[] => {
  let filtered = [...papers]

  if (filters.showWarningOnly) {
    filtered = filtered.filter(p => p.hasWarning)
  }

  if (filters.status) {
    filtered = filtered.filter(p => p.status === filters.status)
  }

  if (filters.track) {
    filtered = filtered.filter(p => p.trackName === filters.track)
  }

  return filtered
}

/**
 * 过滤作者
 */
export const filterAuthors = (
  authors: AuthorStats[],
  filters: {
    showWarningOnly?: boolean
    showEmailConflictOnly?: boolean
    minPapers?: number
  }
): AuthorStats[] => {
  let filtered = [...authors]

  if (filters.showWarningOnly) {
    filtered = filtered.filter(a => a.hasWarning)
  }

  if (filters.showEmailConflictOnly) {
    filtered = filtered.filter(a => a.hasEmailConflict)
  }

  if (filters.minPapers) {
    filtered = filtered.filter(a => a.paperCount >= filters.minPapers)
  }

  return filtered
}

/**
 * 排序论文
 */
export const sortPapers = (
  papers: Paper[],
  sortBy: 'paperId' | 'title' | 'authorCount' | 'created' | 'warning',
  order: 'asc' | 'desc' = 'asc'
): Paper[] => {
  const sorted = [...papers].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'paperId':
        comparison = a.paperId - b.paperId
        break
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'authorCount':
        comparison = a.authorNames.length - b.authorNames.length
        break
      case 'created':
        comparison = new Date(a.created).getTime() - new Date(b.created).getTime()
        break
      case 'warning':
        // Warning的论文排在前面
        comparison = (b.hasWarning ? 1 : 0) - (a.hasWarning ? 1 : 0)
        break
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * 排序作者
 */
export const sortAuthors = (
  authors: AuthorStats[],
  sortBy: 'name' | 'email' | 'paperCount' | 'organization',
  order: 'asc' | 'desc' = 'asc'
): AuthorStats[] => {
  const sorted = [...authors].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'email':
        comparison = a.email.localeCompare(b.email)
        break
      case 'paperCount':
        comparison = a.paperCount - b.paperCount
        break
      case 'organization':
        const orgA = a.organization || ''
        const orgB = b.organization || ''
        comparison = orgA.localeCompare(orgB)
        break
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * 导出CSV数据（用于下载）
 */
export const exportPapersToCSV = (papers: Paper[]): string => {
  const headers = [
    'Paper ID',
    'Title',
    'Authors',
    'Emails',
    'Has Warning',
    'Warning Authors',
    'Status',
    'Track',
  ]

  const rows = papers.map(paper => [
    paper.paperId,
    `"${paper.title.replace(/"/g, '""')}"`,
    `"${paper.authorNames.join('; ')}"`,
    `"${paper.authorEmails.join('; ')}"`,
    paper.hasWarning ? 'Yes' : 'No',
    `"${paper.warningAuthors.map(a => a.name).join('; ')}"`,
    paper.status,
    paper.trackName,
  ])

  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

/**
 * 导出作者CSV数据
 */
export const exportAuthorsToCSV = (authors: AuthorStats[]): string => {
  const headers = [
    'Name',
    'Email',
    'Paper Count',
    'Paper IDs',
    'Has Warning',
    'Has Email Conflict',
    'Organization',
  ]

  const rows = authors.map(author => [
    `"${author.name.replace(/"/g, '""')}"`,
    author.email,
    author.paperCount,
    `"${author.paperIds.join('; ')}"`,
    author.hasWarning ? 'Yes' : 'No',
    author.hasEmailConflict ? 'Yes' : 'No',
    `"${(author.organization || '').replace(/"/g, '""')}"`,
  ])

  return [headers, ...rows].map(row => row.join(',')).join('\n')
}
