# Natural Stream Parser
Welcome to the **Natural Markdown Stream Parser**. This is a custom CLI tool built entirely with __Bun__!

It outputs text with a *typewriter-like* effect, making it feel like a human is typing in real-time.

## Key Features
- Zero external dependencies (Pure JS/TS).
- Supports reading from local files and standard input.
- Fancy terminal styling using ANSI escape codes.

## Supported Formatting
Let's test the inline formatting capabilities:
You can use **bold text** to emphasize things.
You can also use *italic text* for subtle highlights.
If you make a mistake, just use ~~strikethrough~~.

### ✨ New Feature: Inline Code!
You can now highlight specific commands or variables like `Bun.sleep()` or `process.argv` right inside your sentences. It looks super clean!

### Command Line Usage

You can run this tool by simply passing a file path:

```bash
bun run src/cli.ts --stream README.md
```

or

```bash
cat README.md | bun run src/cli.ts --stream
```