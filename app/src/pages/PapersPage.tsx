import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaperStore } from '../store/paper-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { AlertTriangle, FileText, Search, Download, Database, Link2 } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { filterPapers, exportPapersToCSV } from '../lib/paper-utils';

export default function PapersPage() {
  const navigate = useNavigate();
  const papers = usePaperStore((state) => state.papers);
  const authors = usePaperStore((state) => state.authors);
  const authorMerges = usePaperStore((state) => state.authorMerges);
  const datasets = usePaperStore((state) => state.getDatasets());
  const currentDatasetId = usePaperStore((state) => state.currentDatasetId);
  const setCurrentDataset = usePaperStore((state) => state.setCurrentDataset);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWarningOnly, setShowWarningOnly] = useState(false);
  const [showLinkedAuthorsOnly, setShowLinkedAuthorsOnly] = useState(false);

  // Helper function to check if an author email is linked
  const isAuthorLinked = (email: string): boolean => {
    return authorMerges.some(m =>
      m.primaryEmail === email || m.mergedEmails.includes(email)
    );
  };

  // Helper function to get linked author info
  const getLinkedAuthorInfo = (email: string) => {
    const merge = authorMerges.find(m =>
      m.primaryEmail === email || m.mergedEmails.includes(email)
    );
    if (!merge) return null;

    // Collect all linked authors
    const allAuthors = [
      { name: merge.primaryName, email: merge.primaryEmail, isPrimary: true },
      ...merge.mergedEmails.map((e, idx) => ({
        name: merge.mergedNames[idx],
        email: e,
        isPrimary: false,
      }))
    ];

    return {
      merge,
      allAuthors,
      count: allAuthors.length,
    };
  };

  // Filter and search papers
  const filteredPapers = useMemo(() => {
    let result = papers;

    // Apply warning filter
    if (showWarningOnly) {
      result = filterPapers(result, { showWarningOnly: true });
    }

    // Apply linked authors filter
    if (showLinkedAuthorsOnly) {
      result = result.filter((paper) =>
        paper.authorEmails.some(email => isAuthorLinked(email))
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((paper) => {
        return (
          paper.paperId.toString().includes(query) ||
          paper.title.toLowerCase().includes(query) ||
          paper.authorNames.some((name) => name.toLowerCase().includes(query)) ||
          paper.authorEmails.some((email) => email.toLowerCase().includes(query))
        );
      });
    }

    return result;
  }, [papers, searchQuery, showWarningOnly, showLinkedAuthorsOnly, isAuthorLinked]);

  // Handle export to CSV
  const handleExportCSV = () => {
    const csv = exportPapersToCSV(filteredPapers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `papers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If no datasets exist at all
  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div>
            <h2 className="text-2xl font-bold mb-2">No Papers Loaded</h2>
            <p className="text-muted-foreground max-w-md">
              Please import paper data first to view paper submissions.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/import')}>
            <Download className="h-5 w-5 mr-2" />
            Import Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <PageHeader
        title="Paper Submissions"
        description="Browse all paper submissions and identify potential quota violations"
      >
        {/* Dataset Selector */}
        {datasets.length > 0 && (
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <Select value={currentDatasetId} onValueChange={setCurrentDataset}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Datasets</SelectItem>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </PageHeader>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Papers</p>
              <p className="text-2xl font-bold">{papers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Papers with Warnings</p>
              <p className="text-2xl font-bold">
                {papers.filter((p) => p.hasWarning).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <FileText className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Papers OK</p>
              <p className="text-2xl font-bold">
                {papers.filter((p) => !p.hasWarning).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by paper ID, title, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Warning filter */}
          <div className="flex items-center gap-2">
            <Switch
              id="warning-filter"
              checked={showWarningOnly}
              onCheckedChange={setShowWarningOnly}
            />
            <Label htmlFor="warning-filter" className="text-sm cursor-pointer">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Warning Only
              </div>
            </Label>
          </div>

          {/* Linked Authors filter */}
          <div className="flex items-center gap-2">
            <Switch
              id="linked-filter"
              checked={showLinkedAuthorsOnly}
              onCheckedChange={setShowLinkedAuthorsOnly}
            />
            <Label htmlFor="linked-filter" className="text-sm cursor-pointer">
              <div className="flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-purple-500" />
                Linked Authors
              </div>
            </Label>
          </div>

          {/* Export button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredPapers.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Papers Table */}
      <Card className="!transition-none hover:!scale-100 hover:!shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Paper ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Authors</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPapers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No papers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPapers.map((paper) => {
                  // Check if paper has any linked authors
                  const hasLinkedAuthor = paper.authorEmails.some(email => isAuthorLinked(email));

                  // Build row className
                  let rowClassName = 'transition-none';
                  if (paper.hasWarning) {
                    rowClassName += ' bg-warning/5';
                  }
                  if (hasLinkedAuthor) {
                    rowClassName += ' border-l-4 border-l-purple-500 bg-purple-50/30 dark:bg-purple-950/10';
                  }

                  return (
                    <TableRow
                      key={paper.paperId}
                      className={rowClassName}
                    >
                      <TableCell className="font-mono text-sm">
                        {paper.paperId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {paper.hasWarning && (
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                          )}
                          <span className="font-medium">{paper.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex flex-wrap gap-1.5">
                            {paper.authorNames.map((name, idx) => {
                              const email = paper.authorEmails[idx] || 'N/A';
                              const organization = paper.authorOrganizations[idx] || 'N/A';
                              const isWarning = paper.warningAuthors.some(
                                (wa) => wa.email === email
                              );
                              const isCorresponding = paper.correspondingAuthorIndices.includes(idx);

                              // Check if author is linked
                              const linked = isAuthorLinked(email);
                              const linkedInfo = linked ? getLinkedAuthorInfo(email) : null;

                              // Get author statistics
                              // If author is linked, use primary email to get stats
                              const statsEmail = linkedInfo ? linkedInfo.merge.primaryEmail : email;
                              const authorStats = authors.get(statsEmail);
                              const totalPapers = authorStats?.paperCount || 0;
                              const paperRank = (authorStats?.paperIds?.indexOf(paper.paperId) ?? -1) + 1;

                              // Determine Badge style
                              let badgeVariant: 'destructive' | 'secondary' | 'default' = 'secondary';
                              let badgeClassName = 'text-xs cursor-pointer';

                              if (isWarning) {
                                badgeVariant = 'destructive';
                              } else if (isCorresponding) {
                                badgeVariant = 'default';
                                badgeClassName = 'text-xs bg-blue-500 hover:bg-blue-600 text-white cursor-pointer';
                              } else if (linked) {
                                // Linked but no violation and not corresponding author: use purple background
                                badgeVariant = 'default';
                                badgeClassName = 'text-xs bg-purple-500 hover:bg-purple-600 text-white cursor-pointer';
                              }

                              return (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant={badgeVariant}
                                      className={badgeClassName}
                                    >
                                      {name}
                                      {linked && (
                                        <Link2 className="h-3 w-3 ml-1 inline" />
                                      )}
                                      {isWarning && (
                                        <AlertTriangle className="h-3 w-3 ml-1 inline" />
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-1.5 text-sm">
                                      <p className="font-semibold">{name}</p>
                                      <p className="text-xs text-muted-foreground">{email}</p>
                                      {organization && organization !== 'N/A' && (
                                        <p className="text-xs">{organization}</p>
                                      )}

                                      {linked && linkedInfo && (
                                        <div className="pt-1 border-t border-border/50">
                                          <p className="text-xs font-medium text-purple-500 flex items-center gap-1">
                                            <Link2 className="h-3 w-3" />
                                            Linked with {linkedInfo.count - 1} other author{linkedInfo.count > 2 ? 's' : ''}
                                          </p>
                                          <div className="ml-4 mt-1 space-y-0.5">
                                            {linkedInfo.allAuthors.map((author) => (
                                              <p key={author.email} className="text-xs text-muted-foreground">
                                                • {author.name} {author.isPrimary && '(Primary)'}
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="pt-1 border-t border-border/50">
                                        <p className="text-xs">
                                          📊 Total submissions: <span className="font-medium">{totalPapers}</span>
                                        </p>
                                        <p className="text-xs">
                                          📝 This is paper #{paperRank} (by Paper ID)
                                        </p>
                                      </div>
                                      {isCorresponding && (
                                        <p className="text-xs text-blue-400 font-medium pt-1">✉ Corresponding Author</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                        {paper.hasWarning && (
                          <p className="text-xs text-warning mt-1.5">
                            ⚠ {paper.warningAuthors.length} author(s) exceeded quota
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {paper.hasWarning ? (
                          <Badge variant="destructive" className="text-xs">
                            Warning
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/papers/${paper.paperId}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Footer info */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredPapers.length} of {papers.length} papers
        {searchQuery && ` (filtered by "${searchQuery}")`}
      </div>
    </div>
  );
}
