/**
 * 论文和作者数据模型
 */

// 论文数据模型
export interface Paper {
  paperId: number
  originalPaperId: string
  title: string
  abstract: string
  primaryContactAuthorName: string
  primaryContactAuthorEmail: string
  authorNames: string[] // 作者姓名列表
  authorEmails: string[] // 作者邮箱列表
  trackName: string
  primarySubjectArea: string
  secondarySubjectAreas: string[]
  status: string
  created: string
  lastModified: string
  // 计算字段
  hasWarning: boolean // 是否包含超quota的作者
  warningAuthors: AuthorWarning[] // 超quota的作者信息
}

// 作者警告信息
export interface AuthorWarning {
  name: string
  email: string
  paperCount: number // 该作者的总文章数
  paperRank: number // 该文章在作者的文章中的排名（按paperId排序）
}

// 作者统计信息
export interface AuthorStats {
  id: string // 唯一ID (email作为key)
  name: string
  email: string
  paperCount: number
  paperIds: number[] // 该作者的所有论文ID（按ID排序）
  organization?: string // 从备注或其他字段提取
  hasWarning: boolean // 是否超过quota (>2篇)
  // 用于标记问题
  hasEmailConflict: boolean // 是否存在一个email对应多个作者名
  hasPotentialDuplicate: boolean // 是否可能是重复作者（人工标记）
}

// Email到作者名的映射（用于检测冲突）
export interface EmailAuthorMapping {
  email: string
  authorNames: Set<string> // 使用这个email的所有作者名
  hasConflict: boolean // 是否存在多个不同的作者名
}

// 作者合并记录（用于人工标记作者为同一人）
export interface AuthorMerge {
  id: string
  primaryEmail: string // 主要使用的email
  primaryName: string // 主要使用的姓名
  mergedEmails: string[] // 合并的其他email
  mergedNames: string[] // 合并的其他姓名
  note: string // 备注说明
  createdAt: string
}

// Excel原始数据行
export interface ExcelRow {
  'Paper ID': number
  'Original Paper ID': string
  'Created': string
  'Last Modified': string
  'Paper Title': string
  'Abstract': string
  'Primary Contact Author Name': string
  'Primary Contact Author Email': string
  'Authors': string // 可能是分隔符分隔的字符串
  'Author Names': string // 可能是分隔符分隔的字符串
  'Author Emails': string // 可能是分隔符分隔的字符串
  'Track Name': string
  'Primary Subject Area': string
  'Secondary Subject Areas': string
  'Status': string
  [key: string]: any // 其他字段
}
