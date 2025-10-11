# CanuCheck 🤖🍁 - Your Smart Canadian Product Explorer

Discover truly Canadian-made goods with AI verification. Combines:
- ✅ Real-time LLM-powered origin analysis
- ✅ 50%+ Canadian content requirement
- 🇨🇦 Flag-based manufacturing transparency
- 🛒 Direct links to purchase verified products
- ⚡ Modern stack (Next.js + shadcn/ui + OpenAI)

Built to support ethical shopping and Canadian manufacturing, featuring:
- Model Context Protocol for reliable AI tooling
- Type-safe API interactions
- Responsive card/list views
- Open contribution ecosystem (coming soon)

"Because 'Made in Canada' should mean something"

## Getting Started

### Prerequisites
- Node.js 20+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
```bash
git clone https://github.com/ThatChocolateGuy/CanuCheck.git
cd CanuCheck
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5-nano
OPENAI_BASE_URL=https://api.openai.com/v1
```

4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Configuration

The app uses **gpt-5-nano** as the default model for product analysis. You can configure this in your `.env.local` file:

- `OPENAI_API_KEY`: Your OpenAI API key (required for LLM features)
- `OPENAI_MODEL`: The model to use (default: `gpt-5-nano`)
- `OPENAI_BASE_URL`: API endpoint (default: `https://api.openai.com/v1`)

If no API key is configured, the app will fallback to mock data for demonstration purposes.

### Scripts

```bash
npm run dev      # Start development server with turbopack
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Contributing

See [.github/agents/instructions.md](.github/agents/instructions.md) for detailed development guidelines and LLM agent instructions.