import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Paper, AuthorStats, AuthorMerge, ExcelRow } from './paper-types'

/**
 * 论文和作者数据管理 Store
 */
interface PaperStore {
  // 数据
  papers: Paper[]
  authors: Map<string, AuthorStats> // key: email
  authorMerges: AuthorMerge[] // 人工标记的作者合并记录

  // 加载状态
  isLoading: boolean
  error: string | null

  // 数据导入
  importExcelData: (rows: ExcelRow[]) => void

  // 论文操作
  getPaperById: (paperId: number) => Paper | undefined
  getPapersWithWarning: () => Paper[]

  // 作者操作
  getAuthorByEmail: (email: string) => AuthorStats | undefined
  getAuthorsWithWarning: () => AuthorStats[]
  getAuthorsWithEmailConflict: () => AuthorStats[]
  getAllAuthors: () => AuthorStats[]

  // 作者合并操作
  mergeAuthors: (merge: Omit<AuthorMerge, 'id' | 'createdAt'>) => void
  unmergeAuthors: (mergeId: string) => void
  updateAuthorMerge: (mergeId: string, updates: Partial<AuthorMerge>) => void

  // 更新作者信息（手动修正）
  updateAuthorEmail: (oldEmail: string, newEmail: string) => void
  updateAuthorName: (email: string, newName: string) => void

  // 工具方法
  reset: () => void
}

/**
 * 解析分隔符分隔的字符串为数组
 */
const parseDelimitedString = (str: string | null | undefined): string[] => {
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
 * 计算作者统计信息
 */
const calculateAuthorStats = (papers: Paper[]): Map<string, AuthorStats> => {
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
 */
const markPaperWarnings = (papers: Paper[], authors: Map<string, AuthorStats>): Paper[] => {
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
 * 创建Paper Store
 */
export const usePaperStore = create<PaperStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      papers: [],
      authors: new Map(),
      authorMerges: [],
      isLoading: false,
      error: null,

      // 导入Excel数据
      importExcelData: (rows: ExcelRow[]) => {
        try {
          set({ isLoading: true, error: null })

          const papers: Paper[] = rows.map(row => ({
            paperId: row['Paper ID'],
            originalPaperId: row['Original Paper ID'] || '',
            title: row['Paper Title'] || '',
            abstract: row['Abstract'] || '',
            primaryContactAuthorName: row['Primary Contact Author Name'] || '',
            primaryContactAuthorEmail: row['Primary Contact Author Email'] || '',
            authorNames: parseDelimitedString(row['Author Names']),
            authorEmails: parseDelimitedString(row['Author Emails']),
            trackName: row['Track Name'] || '',
            primarySubjectArea: row['Primary Subject Area'] || '',
            secondarySubjectAreas: parseDelimitedString(row['Secondary Subject Areas']),
            status: row['Status'] || '',
            created: row['Created'] || '',
            lastModified: row['Last Modified'] || '',
            hasWarning: false,
            warningAuthors: [],
          }))

          // 计算作者统计
          const authors = calculateAuthorStats(papers)

          // 标记论文warnings
          const papersWithWarnings = markPaperWarnings(papers, authors)

          set({
            papers: papersWithWarnings,
            authors,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          })
        }
      },

      // 获取单个论文
      getPaperById: (paperId: number) => {
        return get().papers.find(p => p.paperId === paperId)
      },

      // 获取有warning的论文
      getPapersWithWarning: () => {
        return get().papers.filter(p => p.hasWarning)
      },

      // 获取作者信息
      getAuthorByEmail: (email: string) => {
        return get().authors.get(email)
      },

      // 获取有warning的作者
      getAuthorsWithWarning: () => {
        return Array.from(get().authors.values()).filter(a => a.hasWarning)
      },

      // 获取有email冲突的作者
      getAuthorsWithEmailConflict: () => {
        return Array.from(get().authors.values()).filter(a => a.hasEmailConflict)
      },

      // 获取所有作者
      getAllAuthors: () => {
        return Array.from(get().authors.values())
      },

      // 合并作者
      mergeAuthors: (merge) => {
        const newMerge: AuthorMerge = {
          ...merge,
          id: `merge-${Date.now()}`,
          createdAt: new Date().toISOString(),
        }

        set({
          authorMerges: [...get().authorMerges, newMerge],
        })

        // TODO: 应用合并逻辑，重新计算authors
      },

      // 取消合并
      unmergeAuthors: (mergeId: string) => {
        set({
          authorMerges: get().authorMerges.filter(m => m.id !== mergeId),
        })
      },

      // 更新合并记录
      updateAuthorMerge: (mergeId: string, updates: Partial<AuthorMerge>) => {
        set({
          authorMerges: get().authorMerges.map(m =>
            m.id === mergeId ? { ...m, ...updates } : m
          ),
        })
      },

      // 更新作者email
      updateAuthorEmail: (oldEmail: string, newEmail: string) => {
        const author = get().authors.get(oldEmail)
        if (!author) return

        const authors = new Map(get().authors)
        authors.delete(oldEmail)
        authors.set(newEmail, { ...author, email: newEmail, id: newEmail })

        set({ authors })
      },

      // 更新作者名
      updateAuthorName: (email: string, newName: string) => {
        const author = get().authors.get(email)
        if (!author) return

        const authors = new Map(get().authors)
        authors.set(email, { ...author, name: newName })

        set({ authors })
      },

      // 重置
      reset: () => {
        set({
          papers: [],
          authors: new Map(),
          authorMerges: [],
          isLoading: false,
          error: null,
        })
      },
    }),
    {
      name: 'authcheck-paper-storage',
      storage: createJSONStorage(() => localStorage),
      // Map需要特殊处理序列化
      partialize: (state) => ({
        papers: state.papers,
        authors: Array.from(state.authors.entries()),
        authorMerges: state.authorMerges,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.authors)) {
          // @ts-ignore - 恢复Map
          state.authors = new Map(state.authors)
        }
      },
    }
  )
)
