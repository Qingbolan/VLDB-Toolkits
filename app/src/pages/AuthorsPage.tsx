import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/page-header'
import { AnimatedCard } from '@/components/magic/animated-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AlertTriangle,
  Users,
  Search,
  Mail,
  FileText,
  Download,
  X,
  Edit,
  CheckCircle2,
} from 'lucide-react'
import { usePaperStore } from '@/store/paper-store'
import { useI18n } from '@/lib/i18n'
import {
  searchAuthors,
  filterAuthors,
  sortAuthors,
  getAuthorWarningMessage,
  exportAuthorsToCSV,
} from '@/lib/paper-utils'
import type { AuthorStats } from '@/store/paper-types'

export default function AuthorsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const getAllAuthors = usePaperStore(state => state.getAllAuthors)
  const getAuthorsWithWarning = usePaperStore(state => state.getAuthorsWithWarning)
  const getAuthorsWithEmailConflict = usePaperStore(state => state.getAuthorsWithEmailConflict)
  const updateAuthorEmail = usePaperStore(state => state.updateAuthorEmail)
  const updateAuthorName = usePaperStore(state => state.updateAuthorName)

  const authors = getAllAuthors()

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [showWarningOnly, setShowWarningOnly] = useState(false)
  const [showEmailConflictOnly, setShowEmailConflictOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'paperCount' | 'organization'>('paperCount')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Edit dialog
  const [editingAuthor, setEditingAuthor] = useState<AuthorStats | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')

  // If no data exists
  if (authors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <Users className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div>
            <h2 className="text-2xl font-bold mb-2">No Authors Loaded</h2>
            <p className="text-muted-foreground max-w-md">
              Please import paper data first to view author statistics.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/import')}>
            <Download className="h-5 w-5 mr-2" />
            Import Data
          </Button>
        </div>
      </div>
    )
  }

  // Calculate filtered author list
  const filteredAuthors = useMemo(() => {
    let result = authors

    // Search
    if (searchQuery) {
      result = searchAuthors(result, searchQuery)
    }

    // Filter
    result = filterAuthors(result, {
      showWarningOnly,
      showEmailConflictOnly,
    })

    // Sort
    result = sortAuthors(result, sortBy, sortOrder)

    return result
  }, [authors, searchQuery, showWarningOnly, showEmailConflictOnly, sortBy, sortOrder])

  // Statistics
  const stats = useMemo(() => {
    return {
      total: authors.length,
      withWarning: getAuthorsWithWarning().length,
      withEmailConflict: getAuthorsWithEmailConflict().length,
      withinQuota: authors.filter(a => !a.hasWarning).length,
    }
  }, [authors, getAuthorsWithWarning, getAuthorsWithEmailConflict])

  // Export CSV
  const handleExport = () => {
    const csv = exportAuthorsToCSV(filteredAuthors)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `authors_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // Open edit dialog
  const openEditDialog = (author: AuthorStats) => {
    setEditingAuthor(author)
    setEditName(author.name)
    setEditEmail(author.email)
  }

  // Save edit
  const handleSaveEdit = () => {
    if (!editingAuthor) return

    if (editEmail !== editingAuthor.email) {
      updateAuthorEmail(editingAuthor.email, editEmail)
    }
    if (editName !== editingAuthor.name) {
      updateAuthorName(editEmail, editName)
    }

    setEditingAuthor(null)
  }

  return (
    <>
      <PageHeader
        title="Author Management"
        description="Manage authors, identify quota violations, and resolve email conflicts"
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <AnimatedCard delay={0.1}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Authors
                </p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Over Quota
                </p>
                <p className="text-3xl font-bold mt-2 text-warning">{stats.withWarning}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email Conflicts
                </p>
                <p className="text-3xl font-bold mt-2 text-destructive">{stats.withEmailConflict}</p>
              </div>
              <Mail className="h-8 w-8 text-destructive" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Within Quota
                </p>
                <p className="text-3xl font-bold mt-2 text-success">{stats.withinQuota}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Search and Filters */}
      <AnimatedCard delay={0.5} className="mb-6">
        <div className="p-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or organization..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Switch
                id="warning-filter"
                checked={showWarningOnly}
                onCheckedChange={setShowWarningOnly}
              />
              <Label htmlFor="warning-filter">Show quota violations only</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="email-conflict-filter"
                checked={showEmailConflictOnly}
                onCheckedChange={setShowEmailConflictOnly}
              />
              <Label htmlFor="email-conflict-filter">Show email conflicts only</Label>
            </div>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="paperCount">Paper Count</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={toggleSortOrder}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>

            {(showWarningOnly || showEmailConflictOnly) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowWarningOnly(false)
                  setShowEmailConflictOnly(false)
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredAuthors.length} of {stats.total} authors
          </div>
        </div>
      </AnimatedCard>

      {/* Author List */}
      <div className="space-y-4">
        {filteredAuthors.map((author, index) => (
          <AnimatedCard
            key={author.id}
            delay={0.05 * Math.min(index, 10)}
            className="hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Author Information */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{author.name}</h3>
                    {author.hasWarning && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Over Quota
                      </Badge>
                    )}
                    {author.hasEmailConflict && (
                      <Badge variant="outline" className="border-destructive text-destructive">
                        <Mail className="h-3 w-3 mr-1" />
                        Email Conflict
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Mail className="h-4 w-4" />
                    <span>{author.email}</span>
                  </div>

                  {/* Paper Statistics */}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className={`font-bold ${author.hasWarning ? 'text-warning' : ''}`}>
                          {author.paperCount}
                        </span>
                        <span className="text-muted-foreground"> / 2 papers</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {author.paperIds.map((paperId, idx) => (
                        <Badge
                          key={idx}
                          variant={idx >= 2 ? 'destructive' : 'secondary'}
                          className="text-xs font-mono"
                        >
                          #{paperId}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Warning Information */}
                  {(author.hasWarning || author.hasEmailConflict) && (
                    <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm text-warning-foreground">
                        {getAuthorWarningMessage(author)}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(author)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </AnimatedCard>
        ))}

        {filteredAuthors.length === 0 && (
          <AnimatedCard>
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No authors match your search criteria</p>
            </div>
          </AnimatedCard>
        )}
      </div>

      {/* Edit Author Dialog */}
      <Dialog open={!!editingAuthor} onOpenChange={() => setEditingAuthor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Author Information</DialogTitle>
            <DialogDescription>
              Update author name or email address. This will affect all associated papers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Author Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Author name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                placeholder="author@example.com"
              />
            </div>

            {editingAuthor?.paperIds && editingAuthor.paperIds.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Associated Papers:</p>
                <div className="flex flex-wrap gap-1">
                  {editingAuthor.paperIds.map((paperId, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      #{paperId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAuthor(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
