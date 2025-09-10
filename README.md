# CanuCheck 🤖🍁 - Your Smart Canadian Product Explorer

Discover Canadian-made goods easily. Combines:
- 🇨🇦 Flag-based manufacturing transparency
- 🛒 Direct links to purchase products
- ⚡ Modern stack (Next.js + shadcn/ui + OpenAI)

Built to support ethical shopping and Canadian manufacturing, featuring:
- Model Context Protocol for reliable AI tooling
- Type-safe API interactions
- Responsive card/list views
- Open contribution ecosystem (coming soon)

## UI Component Notes

### Tooltip
Wrap your application (or a layout subtree) once with `TooltipProvider` from `components/ui/tooltip` to avoid nested provider performance costs:

```tsx
// app/layout.tsx (example)
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<TooltipProvider delayDuration={0}>{children}</TooltipProvider>
			</body>
		</html>
	)
}
```

Then use the tooltip primitives where needed:

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

<Tooltip>
	<TooltipTrigger asChild>
		<button>Info</button>
	</TooltipTrigger>
	<TooltipContent>Details go here</TooltipContent>
</Tooltip>
```

The internal `Tooltip` component no longer creates its own provider to prevent redundant nested providers when rendering many tooltips.

"Because 'Made in Canada' should mean something"