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

// 2. 行単位のパース（変更なし）
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
      // H1 (#): 背景青 ＋ 白文字 ＋ 太字 （前後に改行を入れて目立たせる）
      return `\n${ANSI.bgBlue}${ANSI.white}${ANSI.bold} ${text} ${ANSI.reset}\n`;
    } else if (level === 2) {
      // H2 (##): シアン ＋ 太字 ＋ 下線
      return `\n${ANSI.cyan}${ANSI.bold}${ANSI.underline}${text}${ANSI.reset}\n`;
    } else {
      // H3以降 (###〜): 青 ＋ 太字
      return `${ANSI.blue}${ANSI.bold}${"#".repeat(level)} ${text}${ANSI.reset}\n`;
    }
  }

  if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
    return line.replace(/^(\s*[-*]\s+)(.*)/, `$1${ANSI.cyan}$2${ANSI.reset}\n`);
  }

  let parsed = line.replace(
    /\*\*(.*?)\*\*/g,
    `${ANSI.bold}${ANSI.yellow}$1${ANSI.reset}`,
  );
  // インライン要素の処理
  parsed = parsed.replace(
    /(\*\*|__)(.*?)\1/g,
    `${ANSI.bold}${ANSI.yellow}$2${ANSI.reset}`,
  );
  parsed = parsed.replace(/(\*|_)(.*?)\1/g, `${ANSI.gray}$2${ANSI.reset}`);
  parsed = parsed.replace(/~~(.*?)~~/g, `${ANSI.strike}$1${ANSI.reset}`);
  parsed = parsed.replace(/`([^`]+)`/g, `${ANSI.magenta}$1${ANSI.reset}`);

  return parsed + "\n";
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

export async function* createMarkdownStream(
  text: string,
  minDelay: number = 10,
  maxDelay: number = 40, // Rangeの最大値
) {
  const lineGenerator = createMarkdown(text);

  for (const line of lineGenerator) {
    let isAnsiSequence = false;
    for (const char of line) {
      yield char;

      if (char === "\x1b") isAnsiSequence = true;
      if (isAnsiSequence) {
        if (char === "m") isAnsiSequence = false; // シーケンス終了
        continue; // ANSI処理中は sleep せず次の文字へ
      }

      let currentDelay = getRandomDelay(minDelay, maxDelay);
      if (/[、。！？\n]/.test(char)) {
        currentDelay += getRandomDelay(150, 200);
      } else if (/[,\.]/.test(char)) {
        currentDelay += getRandomDelay(50, 100);
      }
      await sleep(currentDelay);
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
