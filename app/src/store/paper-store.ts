import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Paper, AuthorStats, AuthorMerge, ExcelRow, Dataset } from './paper-types'
import { processExcelData, calculateAuthorStats, markPaperWarnings } from '@/algorithms'

/**
 * 论文和作者数据管理 Store
 */
interface PaperStore {
  // 数据
  datasets: Dataset[]
  currentDatasetId: string // "all" 或具体的dataset id
  papers: Paper[] // 当前选中数据集的papers（计算属性）
  authors: Map<string, AuthorStats> // 当前选中数据集的authors（计算属性）
  authorMerges: AuthorMerge[] // 人工标记的作者合并记录

  // 加载状态
  isLoading: boolean
  error: string | null

  // 数据集操作
  getDatasets: () => Dataset[]
  setCurrentDataset: (datasetId: string) => void
  deleteDataset: (datasetId: string) => void

  // 数据导入
  importExcelData: (rows: ExcelRow[], label: string, fileName: string) => string // 返回datasetId

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
 * 合并多个数据集的papers和authors（用于"All"视图）
 */
const mergeDatasets = (datasets: Dataset[]): { papers: Paper[], authors: Map<string, AuthorStats> } => {
  if (datasets.length === 0) {
    return { papers: [], authors: new Map() }
  }

  // 合并所有papers
  const allPapers: Paper[] = []
  datasets.forEach(ds => {
    allPapers.push(...ds.papers)
  })

  // 重新计算作者统计（因为可能跨数据集）
  const authors = calculateAuthorStats(allPapers)

  // 重新标记warnings
  const papersWithWarnings = markPaperWarnings(allPapers, authors)

  return { papers: papersWithWarnings, authors }
}

/**
 * 创建Paper Store
 */
export const usePaperStore = create<PaperStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      datasets: [],
      currentDatasetId: 'all',
      papers: [],
      authors: new Map(),
      authorMerges: [],
      isLoading: false,
      error: null,

      // 获取所有数据集
      getDatasets: () => {
        return get().datasets
      },

      // 切换当前数据集
      setCurrentDataset: (datasetId: string) => {
        const { datasets } = get()

        if (datasetId === 'all') {
          // 合并所有数据集
          const { papers, authors } = mergeDatasets(datasets)
          set({ currentDatasetId: 'all', papers, authors })
        } else {
          // 查找特定数据集
          const dataset = datasets.find(ds => ds.id === datasetId)
          if (dataset) {
            set({
              currentDatasetId: datasetId,
              papers: dataset.papers,
              authors: dataset.authors,
            })
          }
        }
      },

      // 删除数据集
      deleteDataset: (datasetId: string) => {
        const { datasets, currentDatasetId } = get()
        const newDatasets = datasets.filter(ds => ds.id !== datasetId)
        set({ datasets: newDatasets })

        // 如果删除的是当前数据集，切换到"all"
        if (currentDatasetId === datasetId) {
          get().setCurrentDataset('all')
        }
      },

      // 导入Excel数据
      importExcelData: (rows: ExcelRow[], label: string, fileName: string) => {
        try {
          set({ isLoading: true, error: null })

          // 使用算法模块处理数据
          const { papers: papersWithWarnings, authors } = processExcelData(rows)

          // 创建新数据集
          const newDataset: Dataset = {
            id: `dataset-${Date.now()}`,
            label,
            fileName,
            importedAt: new Date().toISOString(),
            papers: papersWithWarnings,
            authors,
          }

          // 添加到datasets
          const newDatasets = [...get().datasets, newDataset]
          set({ datasets: newDatasets, isLoading: false })

          // 自动切换到新导入的数据集
          get().setCurrentDataset(newDataset.id)

          return newDataset.id
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          })
          throw error
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
          datasets: [],
          currentDatasetId: 'all',
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
        datasets: state.datasets.map(ds => ({
          ...ds,
          authors: Array.from(ds.authors.entries()),
        })),
        currentDatasetId: state.currentDatasetId,
        papers: state.papers,
        authors: Array.from(state.authors.entries()),
        authorMerges: state.authorMerges,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 迁移旧数据格式：如果有papers但没有datasets，创建一个默认数据集
          // @ts-ignore
          if (state.papers && state.papers.length > 0 && (!state.datasets || state.datasets.length === 0)) {
            console.log('Migrating old data format to new dataset structure')
            // @ts-ignore
            const oldPapers = state.papers
            // @ts-ignore
            const oldAuthors = Array.isArray(state.authors) ? new Map(state.authors) : state.authors

            const migratedDataset = {
              id: `dataset-migrated-${Date.now()}`,
              label: 'Migrated Dataset',
              fileName: 'legacy-data.xlsx',
              importedAt: new Date().toISOString(),
              papers: oldPapers,
              authors: oldAuthors,
            }

            // @ts-ignore
            state.datasets = [migratedDataset]
            // @ts-ignore
            state.currentDatasetId = migratedDataset.id
            // @ts-ignore
            state.papers = oldPapers
            // @ts-ignore
            state.authors = oldAuthors
          }

          // 恢复datasets中的authors Map
          if (Array.isArray(state.datasets)) {
            // @ts-ignore
            state.datasets = state.datasets.map(ds => ({
              ...ds,
              authors: ds.authors instanceof Map ? ds.authors : new Map(ds.authors || []),
            }))
          } else {
            // @ts-ignore
            state.datasets = []
          }

          // 恢复当前的authors Map
          if (Array.isArray(state.authors)) {
            // @ts-ignore
            state.authors = new Map(state.authors)
          } else if (!(state.authors instanceof Map)) {
            // @ts-ignore
            state.authors = new Map()
          }

          // 确保papers是数组
          // @ts-ignore
          if (!Array.isArray(state.papers)) {
            // @ts-ignore
            state.papers = []
          }

          // 确保currentDatasetId存在
          // @ts-ignore
          if (!state.currentDatasetId) {
            // @ts-ignore
            state.currentDatasetId = 'all'
          }
        }
      },
    }
  )
)
