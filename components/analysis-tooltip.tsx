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
        <TooltipTrigger asChild>
          <button type="button" className="flex items-center gap-2 text-sm">
            <Info aria-hidden="true" focusable="false" className="h-4 w-4" />
            <span>AI Verification</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px]">
          {typeof analysis?.confidence === 'number' ? (
            <p>
              Verified with {(
                Math.min(1, Math.max(0, analysis?.confidence as number)) * 100
              ).toFixed(1)}% confidence
            </p>
          ) : (
            <p>Analysis pending</p>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}