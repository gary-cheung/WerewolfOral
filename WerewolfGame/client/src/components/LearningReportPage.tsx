import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LearningReport } from "@shared/schema";
import { Download, Share2, Calendar, User, Gamepad2, Star, TrendingUp, AlertCircle, BookOpen, MessageSquare, ArrowUp, PenLine, Zap } from "lucide-react";

interface LearningReportPageProps {
  report: LearningReport;
  onSaveVocabulary?: (word: string, suggestion: string) => void;
  onGeneratePDF?: () => void;
  onGenerateShareLink?: () => void;
  onBackToHome?: () => void;
  onNavigateToReview?: () => void;
}

export default function LearningReportPage({
  report,
  onGeneratePDF,
  onGenerateShareLink,
  onBackToHome,
  onNavigateToReview
}: LearningReportPageProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col bg-background min-h-screen" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      {/* Print-specific CSS: one-pager layout that includes all sections */}
      <style>{`
        @media print {
          @page { size: A4; margin: 4mm; }
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
            font-size: 7px !important;
          }
          .no-print { display: none !important; }
          .report-content-area { overflow: visible !important; max-height: none !important; height: auto !important; }
          .report-card {
            break-inside: avoid; page-break-inside: avoid;
            box-shadow: none !important; border: 1px solid #d1d5db !important;
            margin-bottom: 2px !important; border-radius: 2px !important;
          }
          .report-card .p-4, .report-card .px-4, .report-card .py-4, .report-card .p-6 { padding: 2px 3px !important; }
          .report-card h2, .report-card h3, .report-card .text-lg, .report-card .font-semibold:not(.text-2xl):not(.font-bold) { font-size: 8px !important; }
          .report-card .text-base { font-size: 7px !important; }
          .report-card .text-sm { font-size: 6.5px !important; }
          .report-card .text-xs, .report-card .text-\\[10px\\] { font-size: 6px !important; }
          .report-card p, .report-card .text-muted-foreground { font-size: 6.5px !important; line-height: 1.1 !important; }
          .report-card span { font-size: 6.5px !important; }
          .report-card .card-header-title { font-size: 9px !important; }
          .report-card svg { width: 10px !important; height: 10px !important; }
          .report-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 3px !important; padding: 1px !important; max-width: 100% !important; }
          .report-grid .col-span-2 { grid-column: 1 / -1 !important; }
          .report-header { padding: 1px 3px !important; }
          .report-header h1 { font-size: 12px !important; }
          .report-header p { font-size: 6.5px !important; margin-top: 0 !important; }
          .report-card hr, .report-card [role="separator"] { margin: 1px 0 !important; }
          .report-card .space-y-1 > * + * { margin-top: 1px !important; }
          .report-card .space-y-2 > * + * { margin-top: 1px !important; }
          .report-card .space-y-3 > * + * { margin-top: 1.5px !important; }
          .report-card .space-y-4 > * + * { margin-top: 2px !important; }
          .report-card .space-y-6 > * + * { margin-top: 3px !important; }
          .report-card .gap-1 { gap: 1px !important; }
          .report-card .gap-2 { gap: 1.5px !important; }
          .report-card .gap-3 { gap: 2px !important; }
          .report-card .gap-4 { gap: 2px !important; }
          .report-card .mt-1 { margin-top: 1px !important; }
          .report-card .mt-2 { margin-top: 1.5px !important; }
          .report-card .mb-1 { margin-bottom: 1px !important; }
          .report-card .mb-2 { margin-bottom: 1.5px !important; }
          .report-card .mb-4 { margin-bottom: 2px !important; }
          .report-card .my-4 { margin-top: 2px !important; margin-bottom: 2px !important; }
          .report-card .p-3 { padding: 1.5px !important; }
          .report-card .pl-4 { padding-left: 3px !important; }
          .report-card .pl-6 { padding-left: 5px !important; }
          .report-card .badge { font-size: 5.5px !important; padding: 0.5px 2px !important; }
          .report-card .text-2xl { font-size: 11px !important; }
          .report-card .text-lg { font-size: 9px !important; }
          .report-card .bg-muted\\/50 { background: #f9fafb !important; }
          .report-card .border-l-2 { padding-left: 3px !important; }
          [data-radix-scroll-area-viewport] { overflow: visible !important; max-height: none !important; }
          .print-desc { font-size: 5.5px !important; }
          .report-card .grid { gap: 2px !important; }
          .report-card .md\\:grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
          .report-card .md\\:grid-cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr !important; }
          /* Even more compact: reduce all padding/margin to absolute minimum */
          .report-card .pt-6 { padding-top: 2px !important; }
          .report-card .pb-4 { padding-bottom: 2px !important; }
          .report-card .pb-3 { padding-bottom: 1.5px !important; }
          .report-card .px-4 { padding-left: 3px !important; padding-right: 3px !important; }
          .report-card .py-3 { padding-top: 1.5px !important; padding-bottom: 1.5px !important; }
        }
      `}</style>

      {/* Header */}
      <header className="p-4 border-b report-header">
        <div className="text-center">
          <h1 className="text-xl font-bold" data-testid="text-report-title">
            English Learning Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI Speaking Assistant - Werewolf Game Feedback
          </p>
        </div>
      </header>

      {/* Section navigation buttons */}
      <div className="no-print px-3 pt-3 pb-1">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { label: "Basic Info", emoji: "📋", target: "report-section-basic-info" },
            { label: "Overall Evaluation", emoji: "⭐", target: "report-section-overall-evaluation" },
            { label: "Detailed Analysis", emoji: "📊", target: "report-section-detailed-analysis" },
            { label: "Improvement Plan", emoji: "📈", target: "report-section-improvement-plan" },
            { label: "Statistics", emoji: "📉", target: "report-section-statistics" },
            { label: "Review Mistakes", emoji: "📝", target: "report-mistakes" },
          ].map((btn) => (
            <Button
              key={btn.target}
              variant="outline"
              size="sm"
              className="shrink-0 h-9 text-[10px] px-2.5 gap-1 whitespace-nowrap"
              onClick={() => {
                if (btn.target === "report-mistakes") {
                  onNavigateToReview?.();
                } else {
                  scrollToSection(btn.target);
                }
              }}
            >
              <span>{btn.emoji}</span>
              <span>{btn.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Content area — uses overflow-auto on screen, visible overflow in print so PDF engine captures everything */}
      <div className="flex-1 overflow-auto report-content-area">
        <div className="max-w-4xl mx-auto p-4 space-y-6 report-grid">

          {/* I. Basic Information */}
          <Card className="report-card" id="report-section-basic-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 card-header-title">
                <User className="w-5 h-5" />
                I. Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Feedback Recipient</p>
                  <p className="font-medium" data-testid="text-student-name">{report.basicInfo.studentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Feedback Date
                  </p>
                  <p className="font-medium">{report.basicInfo.date}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Gamepad2 className="w-3 h-3" />
                  Feedback Scenario
                </p>
                <p className="font-medium">{report.basicInfo.scenario}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">Roles: {report.basicInfo.roles}</Badge>
                  <Badge variant="secondary">Phases: {report.basicInfo.phases}</Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Feedback Provider</p>
                <p className="font-medium">AI Speaking Assistant</p>
              </div>
            </CardContent>
          </Card>

          {/* II. Overall Evaluation */}
          <Card className="report-card" id="report-section-overall-evaluation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 card-header-title">
                <Star className="w-5 h-5 text-primary" />
                II. Overall Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed" data-testid="text-overall-evaluation">
                {report.overallEvaluation}
              </p>
            </CardContent>
          </Card>

          {/* III. Detailed Performance Analysis — spans full width in print */}
          <Card className="report-card col-span-2" id="report-section-detailed-analysis">
            <CardHeader>
              <CardTitle className="card-header-title">
                III. Detailed Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* (A) Strengths & Highlights */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  (A) Strengths & Highlights
                </h3>

                <div className="space-y-4 pl-6">
                  {/* 1. Scenario Adaptation */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">1</Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">Scenario Adaptation</p>
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-strength-scenario">
                          {report.strengths.scenarioAdaptation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Fluency & Interaction */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">2</Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">Fluency & Interaction</p>
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-strength-fluency">
                          {report.strengths.fluencyInteraction}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3. Opinion Expression */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">3</Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">Opinion Expression</p>
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-strength-opinion">
                          {report.strengths.opinionExpression}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* (B) Improvement Suggestions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  (B) Improvement Suggestions
                </h3>

                <div className="space-y-6 pl-6">
                  {/* 1. Grammar Accuracy */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">1</Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">Grammar Accuracy</p>
                        <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">◦ Issue:</p>
                            <p className="text-sm leading-relaxed" data-testid="text-improvement-grammar-issue">
                              {report.improvements.grammarAccuracy.issue}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">◦ Suggestion:</p>
                            <p className="text-sm leading-relaxed" data-testid="text-improvement-grammar-suggestion">
                              {report.improvements.grammarAccuracy.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Vocabulary Diversity */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">2</Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">Vocabulary Diversity</p>
                        <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">◦ Issue:</p>
                            <p className="text-sm leading-relaxed" data-testid="text-improvement-vocab-issue">
                              {report.improvements.vocabularyDiversity.issue}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">◦ Suggestion:</p>
                            <p className="text-sm leading-relaxed" data-testid="text-improvement-vocab-suggestion">
                              {report.improvements.vocabularyDiversity.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Debate Cohesion */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">3</Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">Debate Cohesion</p>
                        <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">◦ Issue:</p>
                            <p className="text-sm leading-relaxed" data-testid="text-improvement-debate-issue">
                              {report.improvements.debateCohesion.issue}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">◦ Suggestion:</p>
                            <p className="text-sm leading-relaxed" data-testid="text-improvement-debate-suggestion">
                              {report.improvements.debateCohesion.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IV. Phased Improvement Plan */}
          <Card className="report-card" id="report-section-improvement-plan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 card-header-title">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                IV. Phased Improvement Plan
              </CardTitle>
              <CardDescription className="print-desc">
                Structured learning roadmap with short, mid, and long-term goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Short-term */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">Short-term</Badge>
                  <span className="text-sm text-muted-foreground">{report.phasedImprovementPlan.shortTerm.timeRange}</span>
                </div>
                <div className="pl-4 border-l-2 border-green-600/30">
                  <p className="text-sm leading-relaxed" data-testid="text-plan-short-term">
                    {report.phasedImprovementPlan.shortTerm.goals}
                  </p>
                </div>
              </div>

              {/* Mid-term */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">Mid-term</Badge>
                  <span className="text-sm text-muted-foreground">{report.phasedImprovementPlan.midTerm.timeRange}</span>
                </div>
                <div className="pl-4 border-l-2 border-amber-600/30">
                  <p className="text-sm leading-relaxed" data-testid="text-plan-mid-term">
                    {report.phasedImprovementPlan.midTerm.goals}
                  </p>
                </div>
              </div>

              {/* Long-term */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Long-term</Badge>
                  <span className="text-sm text-muted-foreground">{report.phasedImprovementPlan.longTerm.timeRange}</span>
                </div>
                <div className="pl-4 border-l-2 border-blue-600/30">
                  <p className="text-sm leading-relaxed" data-testid="text-plan-long-term">
                    {report.phasedImprovementPlan.longTerm.goals}
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Session Statistics */}
          <Card className="report-card" id="report-section-statistics">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 card-header-title">
                <BookOpen className="w-5 h-5" />
                Session Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Speech Time</p>
                  <p className="font-semibold text-lg">{Math.floor(report.totalSpeechTime / 60)}m {report.totalSpeechTime % 60}s</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total Words</p>
                  <p className="font-semibold text-lg">{report.totalWords}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Grammar Errors</p>
                  <p className="font-semibold text-lg">{report.totalGrammarErrors}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Error Rate</p>
                  <p className="font-semibold text-lg">{report.grammarErrorRate.toFixed(1)}%</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vocabulary Score</p>
                  <p className="font-semibold text-2xl text-primary">{report.vocabularyScore}/100</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Logic Score</p>
                  <p className="font-semibold text-2xl text-primary">{report.logicScore}/100</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Back to Top floating button — mobile only */}
      {showBackToTop && (
        <div className="no-print">
          <Button
            variant="secondary"
            size="icon"
            className="fixed bottom-20 right-4 z-30 rounded-full shadow-lg h-10 w-10"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            data-testid="button-back-to-top"
            aria-label="Back to top"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Footer Actions — hidden when printing */}
      <div className="p-4 border-t space-y-3 no-print">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onGeneratePDF}
            data-testid="button-generate-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={onGenerateShareLink}
            data-testid="button-share-link"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Link
          </Button>
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={onBackToHome}
          data-testid="button-back-home"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}
