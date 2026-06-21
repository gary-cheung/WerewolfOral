import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import type { LearningReport } from "@shared/schema";

interface LearningReportProps {
  report: LearningReport;
  onDownloadPDF: () => void;
}

export function LearningReportComponent({ report, onDownloadPDF }: LearningReportProps) {
  return (
    <div className="space-y-6 print:space-y-4" data-testid="learning-report" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Oral Speech Learning Report</h1>
        </div>
        <Button 
          onClick={onDownloadPDF}
          data-testid="button-download-pdf"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* I. Basic Information */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-primary">I. Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Feedback Recipient</p>
            <p className="font-semibold" data-testid="text-student-name">{report.basicInfo.studentName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Feedback Date</p>
            <p className="font-semibold" data-testid="text-report-date">{report.basicInfo.date}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Feedback Scenario</p>
            <p className="font-semibold" data-testid="text-scenario">{report.basicInfo.scenario}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Roles Involved</p>
            <p className="font-semibold" data-testid="text-roles">{report.basicInfo.roles}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Key Phases</p>
            <p className="font-semibold" data-testid="text-phases">{report.basicInfo.phases}</p>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p><strong>Feedback Provider:</strong> AI Speaking Assistant</p>
        </div>
      </Card>

      {/* II. Overall Evaluation */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-primary">II. Overall Evaluation</h2>
        <p className="text-base leading-relaxed" data-testid="text-overall-evaluation">
          {report.overallEvaluation}
        </p>
      </Card>

      {/* III. Detailed Performance Analysis */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-primary">III. Detailed Performance Analysis</h2>
        
        {/* (A) Strengths & Highlights */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">(A) Strengths & Highlights</h3>
          
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-primary mb-2">1. Scenario Adaptation</p>
              <p className="text-base leading-relaxed pl-4" data-testid="text-strength-adaptation">
                {report.strengths.scenarioAdaptation}
              </p>
            </div>
            
            <div>
              <p className="font-semibold text-primary mb-2">2. Fluency & Interaction</p>
              <p className="text-base leading-relaxed pl-4" data-testid="text-strength-fluency">
                {report.strengths.fluencyInteraction}
              </p>
            </div>
            
            <div>
              <p className="font-semibold text-primary mb-2">3. Opinion Expression</p>
              <p className="text-base leading-relaxed pl-4" data-testid="text-strength-opinion">
                {report.strengths.opinionExpression}
              </p>
            </div>
          </div>
        </div>

        {/* (B) Improvement Suggestions */}
        <div>
          <h3 className="text-xl font-semibold mb-4">(B) Improvement Suggestions</h3>
          
          <div className="space-y-6">
            <div>
              <p className="font-semibold text-primary mb-2">1. Grammar Accuracy</p>
              <div className="pl-4 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Issue:</p>
                  <p className="text-base leading-relaxed" data-testid="text-grammar-issue">
                    {report.improvements.grammarAccuracy.issue}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Suggestion:</p>
                  <p className="text-base leading-relaxed" data-testid="text-grammar-suggestion">
                    {report.improvements.grammarAccuracy.suggestion}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <p className="font-semibold text-primary mb-2">2. Vocabulary Diversity</p>
              <div className="pl-4 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Issue:</p>
                  <p className="text-base leading-relaxed" data-testid="text-vocabulary-issue">
                    {report.improvements.vocabularyDiversity.issue}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Suggestion:</p>
                  <p className="text-base leading-relaxed" data-testid="text-vocabulary-suggestion">
                    {report.improvements.vocabularyDiversity.suggestion}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <p className="font-semibold text-primary mb-2">3. Debate Cohesion</p>
              <div className="pl-4 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Issue:</p>
                  <p className="text-base leading-relaxed" data-testid="text-cohesion-issue">
                    {report.improvements.debateCohesion.issue}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Suggestion:</p>
                  <p className="text-base leading-relaxed" data-testid="text-cohesion-suggestion">
                    {report.improvements.debateCohesion.suggestion}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* IV. Phased Improvement Plan */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-primary">IV. Phased Improvement Plan</h2>
        
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-primary mb-2">Short-term ({report.phasedImprovementPlan.shortTerm.timeRange})</p>
            <p className="text-base leading-relaxed pl-4" data-testid="text-shortterm-goals">
              {report.phasedImprovementPlan.shortTerm.goals}
            </p>
          </div>
          
          <div>
            <p className="font-semibold text-primary mb-2">Mid-term ({report.phasedImprovementPlan.midTerm.timeRange})</p>
            <p className="text-base leading-relaxed pl-4" data-testid="text-midterm-goals">
              {report.phasedImprovementPlan.midTerm.goals}
            </p>
          </div>
          
          <div>
            <p className="font-semibold text-primary mb-2">Long-term ({report.phasedImprovementPlan.longTerm.timeRange})</p>
            <p className="text-base leading-relaxed pl-4" data-testid="text-longterm-goals">
              {report.phasedImprovementPlan.longTerm.goals}
            </p>
          </div>
        </div>
      </Card>

      {/* Statistics Summary */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-primary">Statistics Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary" data-testid="text-total-words">{report.totalWords}</p>
            <p className="text-sm text-muted-foreground">Total Words</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary" data-testid="text-speech-time">{report.totalSpeechTime}s</p>
            <p className="text-sm text-muted-foreground">Speech Time</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary" data-testid="text-vocabulary-score">{report.vocabularyScore}</p>
            <p className="text-sm text-muted-foreground">Vocabulary Score</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary" data-testid="text-logic-score">{report.logicScore}</p>
            <p className="text-sm text-muted-foreground">Logic Score</p>
          </div>
        </div>
      </Card>

      {/* Saved Vocabulary (if any) */}
      {report.savedVocabulary.length > 0 && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-primary">Key Vocabulary to Review</h2>
          <div className="space-y-2">
            {report.savedVocabulary.map((vocab, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="font-semibold text-primary min-w-[120px]">{vocab.word}:</span>
                <span className="text-base">{vocab.suggestion}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
