#!/usr/bin/env bun
import { createMarkdown, createMarkdownStream } from "./lib";
import { readFile } from "node:fs/promises";

type CliOptions = {
  filepath?: string;
  speed: Speed;
  stream?: boolean;
  minDelay?: number;
  maxDelay?: number;
  help: boolean;
  version: boolean;
};

type SpeedOption = {
  min: number;
  max: number;
};

type Speed = "fast" | "normal" | "slow";

const SPEED_PRESET = {
  fast: { min: 5, max: 15 },
  normal: { min: 15, max: 40 },
  slow: { min: 30, max: 80 },
} as const satisfies Record<Speed, SpeedOption>;

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    filepath: undefined,
    speed: "normal",
    minDelay: undefined,
    maxDelay: undefined,
    help: false,
    version: false,
    stream: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "-v" || arg === "--version") {
      options.version = true;
    } else if (arg === "-s" || arg === "--speed") {
      options.speed = (args[++i] as Speed) || "normal";
    } else if (arg === "--min") {
      options.minDelay = parseInt(args[++i]!, 10);
    } else if (arg === "--max") {
      options.maxDelay = parseInt(args[++i]!, 10);
    } else if (arg === "--stream") {
      options.stream = !(args[++i] as any);
    } else if (!arg!.startsWith("-") && !options.filepath) {
      // ハイフンで始まらない最初の引数をファイルパスとして扱う
      options.filepath = arg;
    }
  }

  return options;
}

async function readFromStdin(): Promise<string> {
  let text = "";
  process.stdin.setEncoding("utf-8");
  for await (const chunk of process.stdin) {
    text += chunk;
  }
  return text;
}

async function main() {
  // process.argv の最初の2つ（実行環境とスクリプトパス）を除外して解析
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    console.log(
      `
Usage: bun run index.ts [filepath] [options]

Options:
  -s, --speed <type>   Typing speed (fast, normal, slow) [default: normal]
  --min <ms>           Minimum delay in milliseconds
  --max <ms>           Maximum delay in milliseconds
  -h, --help           Show help
  -v, --version        Show version
    `.trim(),
    );
    process.exit(0);
  }

  if (options.version) {
    console.log("Natural Markdown Stream Parser v1.0.0");
    process.exit(0);
  }

  try {
    let text = "";
    // 実際のファイルを読み込む
    if (typeof options.filepath === "string") {
      text = await readFile(options.filepath, "utf-8");
    } else {
      text = await readFromStdin();
    }

    if (!text.trim()) {
      console.error("Error: No input provided via file or stdin.");
      process.exit(1);
    }

    if (options.stream) {
      const { min, max } = SPEED_PRESET[options.speed];
      let speedMin = options.minDelay ?? min;
      let speedMax = options.maxDelay ?? max;

      if (speedMin > speedMax) {
        [speedMin, speedMax] = [speedMax, speedMin];
      }

      const stream = createMarkdownStream(text, speedMin, speedMax);
      for await (const chunk of stream) {
        process.stdout.write(chunk);
      }
    } else {
      console.log([...createMarkdown(text)].join(""));
    }
  } catch (error: any) {
    console.error(`\nError : ${error.message}`);
    process.exit(1);
  }
}

main();
