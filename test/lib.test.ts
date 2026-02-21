import { describe, expect, it } from "bun:test";
import { createMarkdown, createMarkdownStream } from "../src/lib";

const collectLines = (text: string) => [...createMarkdown(text)];

const collectStream = async (text: string, minDelay = 0, maxDelay = 0) => {
  let output = "";
  for await (const ch of createMarkdownStream(text, minDelay, maxDelay)) {
    output += ch;
  }
  return output;
};

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("createMarkdown", () => {
  it("returns one string per line and keeps trailing newline", () => {
    const lines = collectLines("alpha\nbeta");

    expect(lines.length).toBe(2);
    expect(lines[0]).toEndWith("\n");
    expect(lines[1]).toEndWith("\n");
    expect(lines.join("")).toContain("alpha");
    expect(lines.join("")).toContain("beta");
  });

  it("applies heading formatting and strips heading markers", () => {
    const [line] = collectLines("# Title");

    expect(line).toContain("Title");
    expect(line).not.toContain("# ");
    expect(line).toContain("\x1b[");
  });

  it("formats code block fences and body with ANSI escape sequences", () => {
    const lines = collectLines("```ts\nconst x = 1;\n```");

    expect(lines.length).toBe(3);
    expect(lines[0]).toContain("```");
    expect(lines[1]).toContain("const x = 1;");
    expect(lines[2]).toContain("```");
    expect(lines[0]).toContain("\x1b[");
    expect(lines[1]).toContain("\x1b[");
    expect(lines[2]).toContain("\x1b[");
  });

  it("formats list content with ANSI escape sequences", () => {
    const [line] = collectLines("- item");

    expect(line).toContain("- ");
    expect(line).toContain("item");
    expect(line).toContain("\x1b[");
  });

  it("formats inline decorations", () => {
    const [line] = collectLines(
      "**bold** *italic* ~~strike~~ `code` __strong__ _em_",
    );

    expect(line).toContain("bold");
    expect(line).toContain("italic");
    expect(line).toContain("strike");
    expect(line).toContain("code");
    expect(line).toContain("strong");
    expect(line).toContain("em");
    expect(line).not.toContain("**bold**");
    expect(line).not.toContain("*italic*");
    expect(line).not.toContain("~~strike~~");
    expect(line).not.toContain("`code`");
    expect(line).toContain("\x1b[");
  });

  it("applies inline decorations inside list items", () => {
    const [line] = collectLines("- **bold** *italic* ~~strike~~ `code`");

    expect(line).toContain("- ");
    expect(line).toContain("bold");
    expect(line).toContain("italic");
    expect(line).toContain("strike");
    expect(line).toContain("code");
    expect(line).not.toContain("**bold**");
    expect(line).not.toContain("*italic*");
    expect(line).not.toContain("~~strike~~");
    expect(line).not.toContain("`code`");
  });

  it("keeps list color formatting after inline italic in the same item", () => {
    const [line] = collectLines("- *italic* tail");
    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";
    const tailSegment = " tail";
    const tailStart = line!.indexOf(tailSegment);

    expect(tailStart).toBeGreaterThan(0);

    const beforeTail = line!.slice(0, tailStart);
    const lastCyanBeforeTail = beforeTail.lastIndexOf(cyan);
    const lastResetBeforeTail = beforeTail.lastIndexOf(reset);

    // List item style should continue after closing italic styling.
    expect(lastCyanBeforeTail).toBeGreaterThan(lastResetBeforeTail);
  });

  it("keeps list color formatting after inline bold in the same item", () => {
    const [line] = collectLines("- **bold** tail");
    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";
    const tailSegment = " tail";
    const tailStart = line!.indexOf(tailSegment);

    expect(tailStart).toBeGreaterThan(0);

    const beforeTail = line!.slice(0, tailStart);
    const lastCyanBeforeTail = beforeTail.lastIndexOf(cyan);
    const lastResetBeforeTail = beforeTail.lastIndexOf(reset);

    expect(lastCyanBeforeTail).toBeGreaterThan(lastResetBeforeTail);
  });

  it("keeps list color formatting after inline code in the same item", () => {
    const [line] = collectLines("- `code` tail");
    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";
    const tailSegment = " tail";
    const tailStart = line!.indexOf(tailSegment);

    expect(tailStart).toBeGreaterThan(0);

    const beforeTail = line!.slice(0, tailStart);
    const lastCyanBeforeTail = beforeTail.lastIndexOf(cyan);
    const lastResetBeforeTail = beforeTail.lastIndexOf(reset);

    expect(lastCyanBeforeTail).toBeGreaterThan(lastResetBeforeTail);
  });

  it("keeps list color formatting after strikethrough in the same item", () => {
    const [line] = collectLines("- ~~strike~~ tail");
    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";
    const tailSegment = " tail";
    const tailStart = line!.indexOf(tailSegment);

    expect(tailStart).toBeGreaterThan(0);

    const beforeTail = line!.slice(0, tailStart);
    const lastCyanBeforeTail = beforeTail.lastIndexOf(cyan);
    const lastResetBeforeTail = beforeTail.lastIndexOf(reset);

    expect(lastCyanBeforeTail).toBeGreaterThan(lastResetBeforeTail);
  });

  it("strips heading markers for level 3 and above", () => {
    const [line] = collectLines("### Level3");
    const plain = stripAnsi(line!);

    expect(plain).toContain("Level3");
    expect(plain).not.toContain("### ");
  });

  it("does not insert extra leading newlines for heading lines", () => {
    const [h1] = collectLines("# H1");
    const [h2] = collectLines("## H2");

    expect(h1!.startsWith("\n")).toBeFalse();
    expect(h2!.startsWith("\n")).toBeFalse();
  });

  it("keeps code span literal content before other inline conversions", () => {
    const [line] = collectLines("`**x**` and `*y*`");
    const plain = stripAnsi(line!);

    expect(plain).toContain("**x**");
    expect(plain).toContain("*y*");
  });
});

describe("createMarkdownStream", () => {
  it("streams one character at a time", async () => {
    const chunks: string[] = [];
    for await (const ch of createMarkdownStream("abc", 0, 0)) {
      chunks.push(ch);
    }

    expect(chunks).toEqual(["a", "b", "c", "\n"]);
    expect(chunks.every((ch) => ch.length === 1)).toBeTrue();
  });

  it("matches createMarkdown output when concatenated", async () => {
    const md = "## Heading\n- item with `code`";
    const lineOutput = collectLines(md).join("");
    const streamedOutput = await collectStream(md, 0, 0);

    expect(streamedOutput).toBe(lineOutput);
  });

  it("rejects negative delay values", async () => {
    const run = async () => {
      for await (const _ of createMarkdownStream("x", -1, 0)) {
        // no-op
      }
    };

    expect(run()).rejects.toThrow();
  });

  it("rejects minDelay larger than maxDelay", async () => {
    const run = async () => {
      for await (const _ of createMarkdownStream("x", 10, 1)) {
        // no-op
      }
    };

    expect(run()).rejects.toThrow();
  });

  it("does not disable delay forever on incomplete ANSI sequences", async () => {
    const input = "a\x1b[31oops\nb";
    const start = Date.now();

    for await (const _ of createMarkdownStream(input, 3, 3)) {
      // no-op
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(6);
  });

  it("resumes delay after malformed ANSI CSI sequence", async () => {
    const input = "A\x1b[31oopsB";
    const timestamps: number[] = [];

    for await (const _ of createMarkdownStream(input, 12, 12)) {
      timestamps.push(Date.now());
    }

    const lastGapMs =
      timestamps[timestamps.length - 1]! - timestamps[timestamps.length - 2]!;

    expect(lastGapMs).toBeGreaterThanOrEqual(8);
  });
});
