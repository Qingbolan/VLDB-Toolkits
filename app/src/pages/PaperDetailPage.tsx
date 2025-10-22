import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePaperStore } from '../store/paper-store';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft,
  FileText,
  Calendar,
  AlertTriangle,
  User,
  Mail,
  Building2,
} from 'lucide-react';

export default function PaperDetailPage() {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();

  const paper = usePaperStore((state) =>
    state.papers.find((p) => p.paperId === Number(paperId))
  );

  const authors = usePaperStore((state) => state.authors);

  // Get statistics for each author
  const authorsInfo = useMemo(() => {
    if (!paper) return [];

    return paper.authorEmails.map((email, idx) => {
      const authorStats = authors.get(email);
      const name = paper.authorNames[idx];

      return {
        name,
        email,
        affiliation: '', // TODO: Extract from data
        stats: authorStats,
      };
    });
  }, [paper, authors]);

  if (!paper) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6 border-destructive bg-destructive/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive mb-1">Paper not found</h3>
              <p className="text-sm text-muted-foreground mb-3">
                The paper with ID {paperId} could not be found.
              </p>
              <Button onClick={() => navigate('/papers')} size="sm">
                Back to Papers
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/papers')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Papers
      </Button>

      {/* Paper Header */}
      <Card
        className={`p-6 ${paper.hasWarning ? 'border-warning bg-warning/5' : ''}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={`p-3 rounded-lg ${
                paper.hasWarning ? 'bg-warning/20' : 'bg-primary/10'
              }`}
            >
              <FileText
                className={`h-6 w-6 ${
                  paper.hasWarning ? 'text-warning' : 'text-primary'
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{paper.title}</h1>
                {paper.hasWarning && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Warning
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">ID: {paper.paperId}</span>
                {paper.created && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(paper.created).toLocaleDateString()}
                  </span>
                )}
                {paper.status && (
                  <Badge variant="outline" className="text-xs">
                    {paper.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {paper.hasWarning && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-warning mb-1">Quota Warning</p>
                <p className="text-sm text-muted-foreground">
                  One or more authors of this paper have exceeded their submission
                  quota. This paper is the 3rd or later submission for the highlighted
                  author(s).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Abstract */}
        {paper.abstract && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">Abstract</h3>
            <p className="text-sm text-muted-foreground">{paper.abstract}</p>
          </div>
        )}
      </Card>

      {/* Authors Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Authors ({paper.authorNames.length})
        </h2>
        <div className="grid gap-4">
          {authorsInfo.map((authorInfo, idx) => {
            const stats = authorInfo.stats;
            const exceedsLimit = stats ? stats.hasWarning : false;

            // Check if this specific author in this specific paper is over quota
            const warningAuthor = paper.warningAuthors.find(
              (wa) => wa.email === authorInfo.email
            );

            return (
              <Card
                key={idx}
                className={`p-5 ${
                  warningAuthor ? 'border-warning bg-warning/5' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">{authorInfo.name}</h3>
                      {exceedsLimit && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Exceeds Quota
                        </Badge>
                      )}
                      {warningAuthor && (
                        <Badge variant="outline" className="border-warning text-warning">
                          This paper is over quota
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      {authorInfo.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{authorInfo.email}</span>
                        </div>
                      )}
                      {authorInfo.affiliation && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{authorInfo.affiliation}</span>
                        </div>
                      )}
                    </div>

                    {stats && (
                      <>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Total Submissions:{' '}
                            </span>
                            <span
                              className={`font-bold ${
                                exceedsLimit ? 'text-warning' : ''
                              }`}
                            >
                              {stats.paperCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Quota: </span>
                            <span className="font-bold">2</span>
                          </div>
                        </div>

                        {exceedsLimit && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm font-semibold mb-2">
                              All submissions by this author:
                            </p>
                            <ul className="space-y-1 text-sm">
                              {stats.paperIds.map((pid, subIdx) => {
                                const isCurrent = pid === paper.paperId;
                                const isOverQuota = subIdx >= 2;

                                return (
                                  <li
                                    key={subIdx}
                                    className={`flex items-center gap-2 ${
                                      isCurrent ? 'text-primary font-semibold' : ''
                                    }`}
                                  >
                                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                                      {pid}
                                    </span>
                                    <span className="flex-1">Paper ID {pid}</span>
                                    {isCurrent && (
                                      <Badge variant="default" className="text-xs">
                                        Current
                                      </Badge>
                                    )}
                                    {isOverQuota && (
                                      <Badge variant="destructive" className="text-xs">
                                        Over Quota
                                      </Badge>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Additional Info */}
      {(paper.trackName || paper.primarySubjectArea) && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Additional Information</h3>
          <div className="space-y-2 text-sm">
            {paper.trackName && (
              <div>
                <span className="text-muted-foreground">Track: </span>
                <span className="font-medium">{paper.trackName}</span>
              </div>
            )}
            {paper.primarySubjectArea && (
              <div>
                <span className="text-muted-foreground">Subject Area: </span>
                <span className="font-medium">{paper.primarySubjectArea}</span>
              </div>
            )}
            {paper.secondarySubjectAreas.length > 0 && (
              <div>
                <span className="text-muted-foreground">Secondary Areas: </span>
                <span className="font-medium">
                  {paper.secondarySubjectAreas.join(', ')}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
