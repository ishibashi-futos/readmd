# `src/lib.ts` 開発者向けインタフェース仕様

このドキュメントは、`markdown-terminal` パッケージの外部公開 API を利用する開発者向けの仕様です。

## 公開 API 一覧

- `createMarkdown(text: string): Generator<string, void, unknown>`
- `createMarkdownStream(text: string, minDelay?: number, maxDelay?: number): AsyncGenerator<string, void, unknown>`

## `createMarkdown`

Markdown 文字列を行単位で ANSI 装飾付きテキストに変換し、`Generator` で返します。

### シグネチャ

```ts
export function* createMarkdown(text: string)
```

### 引数

- `text: string`
  - 変換対象の Markdown 文字列。

### 戻り値

- `Generator<string, void, unknown>`
  - 1回の `yield` ごとに 1 行分の変換済み文字列を返します。
  - 各行の末尾には改行文字 (`\n`) が含まれます。

### 主な変換ルール

- コードブロック (` ``` `) 開始/終了行: グレー表示
- コードブロック内行: グリーン表示
- 見出し:
  - `#`: 背景青 + 白 + 太字
  - `##`: シアン + 太字 + 下線
  - `###` 以降: 青 + 太字
- 箇条書き (`- ` / `* `): 本文部分をシアン表示
- インライン装飾:
  - 太字 (`**text**` / `__text__`): 太字 + 黄
  - 斜体 (`*text*` / `_text_`): グレー
  - 打消し (`~~text~~`): 打消し線
  - インラインコード (`` `code` ``): マゼンタ

## `createMarkdownStream`

`createMarkdown` の出力を 1 文字ずつ非同期で返すストリーム API です。タイプライター表示の実装に利用できます。

### シグネチャ

```ts
export async function* createMarkdownStream(
  text: string,
  minDelay: number = 10,
  maxDelay: number = 40
)
```

### 引数

- `text: string`
  - 変換対象の Markdown 文字列。
- `minDelay: number = 10`
  - 文字ごとの最小待機時間 (ms)。
- `maxDelay: number = 40`
  - 文字ごとの最大待機時間 (ms)。

### 戻り値

- `AsyncGenerator<string, void, unknown>`
  - 1回の `yield` ごとに 1 文字を返します。

### 遅延ルール

- 基本遅延: `minDelay` から `maxDelay` のランダム値
- 句読点 (`、。！？\n`): 追加で `150-200ms`
- `,` `.`: 追加で `50-100ms`
- ANSI エスケープシーケンス出力中 (`\x1b ... m`): 追加待機なし

## 使用例

### 行単位変換

```ts
import { createMarkdown } from "markdown-terminal";

const md = "# Title\n- item\n`code`";
for (const line of createMarkdown(md)) {
  process.stdout.write(line);
}
```

### 文字単位ストリーム

```ts
import { createMarkdownStream } from "markdown-terminal";

const md = "## Streaming\nHello, world.";
for await (const ch of createMarkdownStream(md, 15, 35)) {
  process.stdout.write(ch);
}
```

## 注意事項

- ANSI カラー前提のため、非対応端末では意図どおりに表示されません。
- `createMarkdownStream` は遅延を伴うため、大きな入力では出力完了まで時間がかかります。
- `minDelay` と `maxDelay` の大小関係は呼び出し側で妥当値を設定してください。
