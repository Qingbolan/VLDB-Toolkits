import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePaperStore } from '../store/paper-store';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeft,
  FileText,
  Calendar,
  AlertTriangle,
  User,
  Mail,
  Building2,
  Users,
  ClipboardList,
  Star,
  MessageSquare,
  Paperclip,
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
      const organization = paper.authorOrganizations[idx] || '';
      const isCorresponding = paper.correspondingAuthorIndices.includes(idx);

      return {
        name,
        email,
        affiliation: organization,
        isCorresponding,
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

      {/* Tabs for different sections */}
      <Tabs defaultValue="authors" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="authors">
            Authors ({paper.authorNames.length})
          </TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="submission">Submission</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="additional">Additional</TabsTrigger>
        </TabsList>

        {/* Authors Tab */}
        <TabsContent value="authors">
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
                      {authorInfo.isCorresponding && (
                        <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                          ✉ Corresponding Author
                        </Badge>
                      )}
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
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4">
          {/* Review Progress */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Review Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Assigned: </span>
                <span className="font-medium">{paper.assigned || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Completed: </span>
                <span className="font-medium">{paper.completed || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Completion: </span>
                <span className="font-medium">{paper.percentCompleted || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Conflicts: </span>
                <span className="font-medium">{paper.conflicts || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Bids: </span>
                <span className="font-medium">{paper.bids || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Discussion: </span>
                <span className="font-medium">{paper.discussion || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Reviewers */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Reviewers
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground font-medium">Reviewers: </span>
                <p className="mt-1">{paper.reviewers || 'Not assigned'}</p>
                {paper.reviewerEmails && (
                  <p className="text-xs text-muted-foreground mt-1">{paper.reviewerEmails}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Meta-Reviewers: </span>
                <p className="mt-1">{paper.metaReviewers || 'Not assigned'}</p>
                {paper.metaReviewerEmails && (
                  <p className="text-xs text-muted-foreground mt-1">{paper.metaReviewerEmails}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Senior Meta-Reviewers: </span>
                <p className="mt-1">{paper.seniorMetaReviewers || 'Not assigned'}</p>
                {paper.seniorMetaReviewerEmails && (
                  <p className="text-xs text-muted-foreground mt-1">{paper.seniorMetaReviewerEmails}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Review Ratings */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Star className="h-5 w-5" />
              Review Ratings
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">Min Rating</p>
                <p className="font-bold text-lg">{paper.reviewMinOverallRating || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">Max Rating</p>
                <p className="font-bold text-lg">{paper.reviewMaxOverallRating || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">Avg Rating</p>
                <p className="font-bold text-lg text-primary">{paper.reviewAvgOverallRating || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">Spread</p>
                <p className="font-bold text-lg">{paper.reviewSpreadOverallRating || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Chair Note */}
          {paper.chairNote && (
            <Card className="p-5 border-warning bg-warning/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-warning">
                <MessageSquare className="h-5 w-5" />
                Chair Note
              </h3>
              <p className="text-sm">{paper.chairNote}</p>
            </Card>
          )}
        </TabsContent>

        {/* Submission Tab */}
        <TabsContent value="submission" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Submission Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Author Feedback Requested: </span>
                <span className="font-medium">{paper.requestedForAuthorFeedback || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Feedback Submitted: </span>
                <Badge variant={paper.authorFeedbackSubmitted === 'Yes' ? 'default' : 'secondary'}>
                  {paper.authorFeedbackSubmitted || 'N/A'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Camera Ready Requested: </span>
                <span className="font-medium">{paper.requestedForCameraReady || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Camera Ready Submitted: </span>
                <Badge variant={paper.cameraReadySubmitted === 'Yes' ? 'default' : 'secondary'}>
                  {paper.cameraReadySubmitted || 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Files & Attachments
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Number of Files: </span>
                <span className="font-medium">{paper.numberOfFiles || '0'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Supplementary Files: </span>
                <span className="font-medium">{paper.numberOfSupplementaryFiles || '0'}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Additional Tab */}
        <TabsContent value="additional" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Track & Subject Area
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Track: </span>
                <span className="font-medium">{paper.trackName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Subject Area: </span>
                <span className="font-medium">{paper.primarySubjectArea || 'N/A'}</span>
              </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
