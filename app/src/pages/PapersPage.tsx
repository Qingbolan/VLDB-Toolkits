import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaperStore } from '../store/paper-store';
// import type { Paper } from '../store/paper-types';
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
import { AlertTriangle, FileText, Search, Download } from 'lucide-react';
import { PageHeader } from '../components/page-header';

export default function PapersPage() {
  const navigate = useNavigate();
  const papers = usePaperStore((state) => state.papers);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter papers
  const filteredPapers = useMemo(() => {
    if (!searchQuery) return papers;

    const query = searchQuery.toLowerCase();
    return papers.filter((paper) => {
      return (
        paper.paperId.toString().includes(query) ||
        paper.title.toLowerCase().includes(query) ||
        paper.authorNames.some((name) => name.toLowerCase().includes(query)) ||
        paper.authorEmails.some((email) => email.toLowerCase().includes(query))
      );
    });
  }, [papers, searchQuery]);

  // If no data exists
  if (papers.length === 0) {
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
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Paper Submissions"
        description="Browse all paper submissions and identify potential quota violations"
      />

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by paper ID, title, or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Papers Table */}
      <Card>
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
                  return (
                    <TableRow
                      key={paper.paperId}
                      className={paper.hasWarning ? 'bg-warning/5' : ''}
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
                        <div className="flex flex-wrap gap-1.5">
                          {paper.authorNames.map((name, idx) => {
                            const email = paper.authorEmails[idx];
                            const isWarning = paper.warningAuthors.some(
                              (wa) => wa.email === email
                            );

                            return (
                              <Badge
                                key={idx}
                                variant={isWarning ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {name}
                                {isWarning && (
                                  <AlertTriangle className="h-3 w-3 ml-1 inline" />
                                )}
                              </Badge>
                            );
                          })}
                        </div>
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
