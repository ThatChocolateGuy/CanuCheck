import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

interface AnalysisData {
  confidence?: number;
  // Add other expected properties
}

export function AnalysisTooltip({
  analysis,
}: {
  analysis: AnalysisData | null | undefined;
}) {
  return (
    <div className="p-4 border-t">
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" />
            <span>AI Verification</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px]">
          {analysis?.confidence ? (
            <p>Verified with {(analysis.confidence * 100).toFixed(1)}% confidence</p>
          ) : (
            <p>Analysis pending</p>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}