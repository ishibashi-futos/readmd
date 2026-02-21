// 1. ANSIエスケープシーケンスの定義
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  underline: "\x1b[4m",
  strike: "\x1b[9m",
  white: "\x1b[37m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  bgBlue: "\x1b[44m",
};

interface ParserState {
  inCodeBlock: boolean;
}

function applyInlineFormatting(line: string, resetTailStyle?: string): string {
  const codeSpans: string[] = [];
  const codeTokenPrefix = "\u0000CODESPAN";
  const protectedLine = line.replace(/`([^`]+)`/g, (_, code: string) => {
    const idx = codeSpans.push(code) - 1;
    return `${codeTokenPrefix}${idx}\u0000`;
  });

  let parsed = protectedLine;
  parsed = parsed.replace(
    /(\*\*|__)(.*?)\1/g,
    `${ANSI.bold}${ANSI.yellow}$2${ANSI.reset}`,
  );
  parsed = parsed.replace(/(\*|_)(.*?)\1/g, `${ANSI.gray}$2${ANSI.reset}`);
  parsed = parsed.replace(/~~(.*?)~~/g, `${ANSI.strike}$1${ANSI.reset}`);
  parsed = parsed.replace(/\u0000CODESPAN(\d+)\u0000/g, (_, idx: string) => {
    const code = codeSpans[Number(idx)] ?? "";
    return `${ANSI.magenta}${code}${ANSI.reset}`;
  });

  if (resetTailStyle) {
    parsed = parsed.replaceAll(ANSI.reset, `${ANSI.reset}${resetTailStyle}`);
  }

  return parsed;
}

function parseLine(line: string, state: ParserState): string {
  if (line.trim().startsWith("```")) {
    state.inCodeBlock = !state.inCodeBlock;
    return `${ANSI.gray}${line}${ANSI.reset}\n`;
  }
  if (state.inCodeBlock) {
    return `${ANSI.green}${line}${ANSI.reset}\n`;
  }
  const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
  if (headingMatch) {
    const level = headingMatch[1]!.length;
    const text = headingMatch[2];

    if (level === 1) {
      // H1 (#): 背景青 ＋ 白文字 ＋ 太字
      return `${ANSI.bgBlue}${ANSI.white}${ANSI.bold} ${text} ${ANSI.reset}\n`;
    } else if (level === 2) {
      // H2 (##): シアン ＋ 太字 ＋ 下線
      return `${ANSI.cyan}${ANSI.bold}${ANSI.underline}${text}${ANSI.reset}\n`;
    } else {
      // H3以降 (###〜): 青 ＋ 太字
      return `${ANSI.blue}${ANSI.bold}${text}${ANSI.reset}\n`;
    }
  }

  const listMatch = line.match(/^(\s*[-*]\s+)(.*)$/);
  if (listMatch) {
    const prefix = listMatch[1];
    const content = listMatch[2] ?? "";
    const formattedContent = applyInlineFormatting(content, ANSI.cyan);
    return `${prefix}${ANSI.cyan}${formattedContent}${ANSI.reset}\n`;
  }

  return applyInlineFormatting(line) + "\n";
}

export function* createMarkdown(text: string) {
  const state: ParserState = { inCodeBlock: false };
  const lines = text.split("\n");

  for (const line of lines) {
    // 1行パースして yield (ここで改行コード \n も含まれている想定)
    yield parseLine(line, state);
  }
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function validateDelayRange(minDelay: number, maxDelay: number): void {
  if (!Number.isFinite(minDelay) || !Number.isFinite(maxDelay)) {
    throw new RangeError("Delay values must be finite numbers.");
  }
  if (minDelay < 0 || maxDelay < 0) {
    throw new RangeError("Delay values must be >= 0.");
  }
  if (minDelay > maxDelay) {
    throw new RangeError("minDelay must be less than or equal to maxDelay.");
  }
}

export async function* createMarkdownStream(
  text: string,
  minDelay: number = 10,
  maxDelay: number = 40, // Rangeの最大値
) {
  validateDelayRange(minDelay, maxDelay);
  const lineGenerator = createMarkdown(text);

  for (const line of lineGenerator) {
    let i = 0;
    while (i < line.length) {
      const char = line[i]!;
      yield char;

      if (char === "\x1b") {
        const remaining = line.slice(i);
        const sgrMatch = remaining.match(/^\x1b\[[0-9;]*m/);
        if (sgrMatch) {
          const sequence = sgrMatch[0];
          for (let j = 1; j < sequence.length; j++) {
            yield sequence[j]!;
          }
          i += sequence.length;
          continue;
        }
      }

      let currentDelay = getRandomDelay(minDelay, maxDelay);
      if (/[、。！？\n]/.test(char)) {
        currentDelay += getRandomDelay(150, 200);
      } else if (/[,\.]/.test(char)) {
        currentDelay += getRandomDelay(50, 100);
      }
      await sleep(currentDelay);
      i += 1;
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
