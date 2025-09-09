import { z } from 'zod'
import { responseSchema } from '@/app/api/analyze/route'

export type ProductAnalysis = z.infer<typeof responseSchema> & {
  source: string
  productId: string
}