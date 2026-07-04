# hako 設計書

> **この設計書の読み方**
> 新しいセッション・別のAIエージェントが読んでも迷わず実装できるよう、
> 「なぜこの設計か」という背景と「絶対に変えてはいけないルール」を明示している。
> 実装前にこの設計書を全て読み、矛盾がある場合はユーザーに確認すること。

---

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | `hako` |
| リポジトリ名・フォルダ名 | `hako`（GitHub URL: `github.io/hako/`） |
| 目的 | 個人用Webツール集（仕事・日常でよく使う小ツールをブラウザで完結させる） |
| 公開先 | GitHub Pages（静的ファイルのみ） |
| 実装形態 | 純粋な静的 HTML / CSS / JS のみ |
| 対象ユーザー | 作者本人（自分用ツール） |
| 情報漏洩方針 | 仕事の機密データを貼り付けても安全な構成にする（詳細は §2） |

---

## 2. 絶対に変えてはいけないルール（MUST NOT）

以下はユーザーが明示的に要求した制約であり、いかなる理由でも変更・例外を設けてはならない。

1. **外部リソースへのネットワーク通信を一切行わない**
   - CDN（Tailwind, Bootstrap, Font Awesome, Google Fonts 等）禁止
   - 外部API呼び出し禁止
   - 外部フォント（@font-face で外部URL）禁止
   - `<script src="https://...">` `<link href="https://...">` の形式は全て禁止

2. **ユーザーの入力データをどこにも送信しない**
   - すべての処理は `JavaScript` のみでブラウザ内完結
   - `fetch` / `XMLHttpRequest` / `WebSocket` でユーザー入力を含むリクエストを送ってはならない

3. **個人情報・識別情報をコードに含めない**
   - ソースコードにメールアドレス・本名・住所等を書かない
   - コミット履歴に個人情報が混入しないよう README にも明記する

4. **外部ライブラリが必要な場合はリポジトリ内にファイルを同梱する**
   - CDN参照ではなく `libs/` フォルダにコピーして相対パスで読み込む

> **なぜこの制約か：** 仕事の機密情報・パスワード等を気兼ねなくツールに貼り付けられる環境を作ることが目的。ネットワーク通信が皆無であればツールを信頼して使える。

---

## 3. ディレクトリ構成

```
/                               ← リポジトリルート = サイトルート
├── index.html                  # トップページ（ツール一覧カード）
├── css/
│   └── common.css              # 全ページ共通スタイル（変数・レイアウト・コンポーネント）
├── js/
│   └── layout.js               # 共通ヘッダー・フッターを全ページにDOMインジェクション
├── libs/                       # 外部ライブラリを同梱する場合はここに置く（現時点では空）
├── tools/
│   ├── base64/
│   │   └── index.html          # BASE64エンコード・デコードツール
│   └── random-string/
│       └── index.html          # ランダム文字列生成ツール
├── .gitignore
└── README.md
```

**構成の意図：**
- `tools/{ツール名}/index.html` という1フォルダ1ファイル構造にすることで、ツール追加時の作業を最小化する
- ツールへの参照は `tools/{ツール名}/index.html` のようにファイル名まで含めて統一する（`file://` スキーマで直接ブラウザで開いた際の安定性向上のため）
- `css/` `js/` をルート直下に置くことで全ツールから `../../css/common.css` という統一した相対パスで参照できる

---

## 4. 共通ファイルの仕様

### 4-1. `js/layout.js` の実装仕様

このファイルは**すべてのツールページが読み込む**共通スクリプトである。
DOMContentLoaded 後に以下の2つの要素にHTMLを挿入する責務を持つ。

**挿入先要素：**
- `#layout-header` ← ページ上部のナビゲーションバー
- `#layout-footer` ← ページ下部のフッター

**ヘッダーに含める内容：**
- サイト名（例: "hako"）→ クリックでルート `/` へリンク
- 現在のツール名（`<title>` タグから自動取得してもよい）
- 「← ツール一覧」に戻るリンク（ルート `/` へ）

**ルートパスの解決：**
ツールページは `tools/{name}/index.html` に置かれるため、ルートへのリンクは `../../` になり、トップページは `./` になる。
`layout.js` 内で `location.pathname` に `/tools/` が含まれるかどうかを判定し、動的に相対ルートパス `${root}` を決定する。
（この方法は GitHub Pages のサブディレクトリ配置や、ローカルの `file://` スキーマでの実行でも機能する）

**トースト表示機能：**
また、操作完了などを通知する `.toast` 表示機能として、`DOMContentLoaded` 時にトースト用コンテナを body に動的にインジェクションし、グローバル関数 `window.showToast(message)` を定義・提供する。

**実装例（layout.js）：**
```javascript
(function () {
  // Determine if the current page is a tool page (inside /tools/) to resolve the root relative path.
  const isToolPage = location.pathname.includes('/tools/');
  const root = isToolPage ? '../../' : './';

  // Inject common header
  const header = document.getElementById('layout-header');
  if (header) {
    const backLinkHTML = isToolPage 
      ? `<a class="back-link" href="${root}index.html">← ツール一覧</a>`
      : '';

    header.innerHTML = `
      <header class="site-header">
        <a class="site-title" href="${root}index.html">hako</a>
        ${backLinkHTML}
      </header>
    `;
  }

  // Inject common footer
  const footer = document.getElementById('layout-footer');
  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <p>すべての処理はブラウザ内で完結します。入力データは外部に送信されません。</p>
        <p style="margin-top: var(--space-2); font-size: var(--text-sm); opacity: 0.8;">
          免責事項: 本ツールの利用により生じた損害や不利益等について、開発者は一切の責任を負いません。
        </p>
      </footer>
    `;
  }

  // Inject toast container dynamically if not present
  document.addEventListener('DOMContentLoaded', () => {
    let toast = document.getElementById('toast-element');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-element';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
  });

  // Global helper function to show toast messages
  window.showToast = function (message) {
    const toast = document.getElementById('toast-element');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      
      if (toast._timeoutId) {
        clearTimeout(toast._timeoutId);
      }
      
      toast._timeoutId = setTimeout(() => {
        toast.classList.remove('show');
        toast._timeoutId = null;
      }, 2000);
    }
  };
})();
```

### 4-2. `css/common.css` の仕様

#### CSSカスタムプロパティ（必ず `:root` に定義する）

```css
:root {
  /* ── Colors ── */
  --bg-base:      #0f1117;   /* ページ背景 */
  --bg-surface:   #1a1d27;   /* カード・入力欄背景 */
  --bg-elevated:  #22263a;   /* ホバー・アクティブ状態 */
  --border:       #2e3250;   /* ボーダー */
  --accent:       #6366f1;   /* プライマリアクション（インディゴ） */
  --accent-hover: #818cf8;
  --text-primary: #e8eaf6;
  --text-muted:   #8b8fa8;
  --success:      #22c55e;   /* 成功・コピー完了 */
  --error:        #ef4444;   /* エラー */

  /* ── Typography ── */
  --font-body:  system-ui, -apple-system, sans-serif;
  --font-mono:  ui-monospace, 'Cascadia Code', monospace;
  --text-sm:    0.875rem;
  --text-base:  1rem;
  --text-lg:    1.125rem;
  --text-xl:    1.25rem;

  /* ── Spacing ── */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* ── Border Radius ── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

#### グローバルリセット（必ず先頭に記述する）

```css
*, *::before, *::after {
  box-sizing: border-box; /* これがないと input/textarea がはみ出す */
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-body);
  background: var(--bg-base);
  color: var(--text-primary);
  min-height: 100vh;
  line-height: 1.6;
  /* スマホでの横スクロール防止 */
  overflow-x: hidden;
}

img, svg {
  display: block;
  max-width: 100%;
}
```

#### ブレークポイント定義

このプロジェクトでは以下の2段階のみを使用する。3段階以上は複雑化するため使わない。

| 名前 | 条件 | 想定デバイス |
|------|------|------------|
| `sm`（スマホ） | `max-width: 599px` | スマートフォン縦向き（320px〜599px） |
| `md`以上（PC） | `min-width: 600px` | タブレット横向き・PC |

```css
/* 使い方：スマホ向けをデフォルトに書き、PC向けを @media で上書きする（モバイルファースト） */
.example {
  font-size: var(--text-sm); /* スマホ */
}
@media (min-width: 600px) {
  .example {
    font-size: var(--text-base); /* PC */
  }
}
```

#### タッチターゲットの最小サイズ

**ボタン・リンク・チェックボックスなどすべてのインタラクティブ要素は `min-height: 44px; min-width: 44px` を確保すること。**
Appleのガイドライン・WCAGが推奨する最小タッチ領域。スマホで誤タップが起きる主原因。

```css
.btn {
  min-height: 44px;
  padding: var(--space-2) var(--space-4);
  /* ... */
}
```

#### 必須コンポーネントクラス（実装すること）

| クラス名 | 役割 | 主なプロパティ（スマホ → PC） |
|---------|------|------------------------------|
| `.container` | ページ中央寄せラッパー | `max-width: 860px; margin: 0 auto;`<br>padding: スマホ `0 var(--space-3)` / PC `0 var(--space-6)` |
| `.site-header` | ヘッダーバー | `display: flex; align-items: center; justify-content: space-between;`<br>`padding: 0 var(--space-4); height: 52px;`<br>`background: var(--bg-surface); border-bottom: 1px solid var(--border);`<br>**スマホ: height 48px でも可。文字が折り返さないよう `white-space: nowrap`** |
| `.site-title` | サイト名リンク | `font-weight: 700; color: var(--text-primary); text-decoration: none;`<br>`font-size: var(--text-base)` |
| `.back-link` | 戻るリンク | `color: var(--text-muted); font-size: var(--text-sm);`<br>`min-height: 44px; display: flex; align-items: center;`（タッチ領域確保） |
| `.page-title` | ツールページのh1 | スマホ: `font-size: var(--text-lg)` / PC: `font-size: var(--text-xl)` |
| `.page-desc` | ツール説明文 | `color: var(--text-muted); font-size: var(--text-sm)` |
| `.card` | コンテンツカード | `background: var(--bg-surface); border-radius: var(--radius-lg);`<br>padding: スマホ `var(--space-4)` / PC `var(--space-6)` |
| `.btn` | ボタン基底 | `min-height: 44px; padding: var(--space-2) var(--space-4);`<br>`border-radius: var(--radius-sm); cursor: pointer; transition: background 0.15s;`<br>**min-height: 44px は必須（タッチターゲット）** |
| `.btn-primary` | メインボタン | `background: var(--accent); color: #fff; border: none;` |
| `.btn-ghost` | サブボタン（コピーなど） | `background: transparent; border: 1px solid var(--border); color: var(--text-primary);` |
| `.input` `.textarea` | テキスト入力欄 | `width: 100%; box-sizing: border-box;`（必須・これがないとはみ出す）<br>`background: var(--bg-base); border: 1px solid var(--border);`<br>`color: var(--text-primary); font-family: var(--font-mono);`<br>`padding: var(--space-3); border-radius: var(--radius-sm);`<br>`.input` の `min-height: 44px` 確保 |
| `.badge` | カテゴリラベル | `background: var(--bg-elevated); border-radius: 999px; font-size: var(--text-sm); padding: var(--space-1) var(--space-3);` |
| `.toast` | 操作フィードバック | `position: fixed; bottom: var(--space-6); left: 50%; transform: translateX(-50%);`<br>`background: var(--success); color: #fff; border-radius: var(--radius-md);`<br>`padding: var(--space-2) var(--space-4);`<br>表示後2秒でフェードアウト（`opacity` transitionで実装） |
| `.toolbar` | ボタン横並びコンテナ | `display: flex; gap: var(--space-2); flex-wrap: wrap;`<br>**`flex-wrap: wrap` 必須。スマホでボタンが溢れたとき自動折り返しさせる** |
| `.site-footer` | フッター | `text-align: center; color: var(--text-muted); font-size: var(--text-sm);`<br>`padding: var(--space-6) var(--space-4);` |

---

## 5. トップページ（index.html）の仕様

### 構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hako</title>
  <link rel="stylesheet" href="css/common.css">
</head>
<body>
  <div id="layout-header"></div>

  <main class="container">
    <section class="tool-category">
      <h2 class="category-title">エンコード / デコード</h2>
      <div class="tool-grid">
        <!-- ツールカードをここに並べる -->
        <a class="tool-card" href="tools/base64/index.html">
          <span class="tool-card-icon"><!-- SVGインライン --></span>
          <span class="tool-card-name">BASE64</span>
          <span class="tool-card-desc">テキストをBASE64形式にエンコード・デコード</span>
        </a>
      </div>
    </section>
  </main>

  <div id="layout-footer"></div>
  <script src="js/layout.js"></script>
</body>
</html>
```

### ツール追加時のカード追記ルール

- ツールを追加したら `index.html` の該当カテゴリ `<section>` 内に `<a class="tool-card">` を1つ追記する
- 新カテゴリが必要なら `<section class="tool-category">` ブロックを追加する
- アイコンはSVGをインライン記述する（外部ファイル参照・外部CDNアイコン禁止）

### ツールグリッドのCSSクラス

| クラス名 | 役割 | レスポンシブ仕様 |
|---------|------|----------------|
| `.tool-category` | カテゴリセクション | `margin-bottom: var(--space-8)` |
| `.category-title` | カテゴリ見出し（h2） | `font-size: var(--text-lg); color: var(--text-muted); margin-bottom: var(--space-4);` |
| `.tool-grid` | カードのグリッドレイアウト | `display: grid; gap: var(--space-4);`<br>スマホ(〜599px): `grid-template-columns: 1fr`（1列）<br>PC(600px〜): `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`（可変列）<br>**スマホで `minmax(220px,1fr)` を使うと320px幅端末で崩れるため分岐必須** |
| `.tool-card` | 個別ツールカードリンク | `display: flex; flex-direction: column; gap: var(--space-2);`<br>`background: var(--bg-surface); border-radius: var(--radius-md);`<br>`padding: var(--space-4); text-decoration: none;`<br>`border: 1px solid var(--border);`<br>hover: `border-color: var(--accent); background: var(--bg-elevated)` |
| `.tool-card-icon` | カードのアイコン領域 | `width: 32px; height: 32px; color: var(--accent);` |
| `.tool-card-name` | ツール名 | `font-weight: 600; color: var(--text-primary);` |
| `.tool-card-desc` | ツール説明文 | `font-size: var(--text-sm); color: var(--text-muted); line-height: 1.4;` |

---

## 6. 各ツールページのHTMLテンプレート

**新ツール追加時はこのテンプレートをコピーして使う。コメントは実装後も残してよい。**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ツール名 | hako</title>
  <!-- 外部CSSは common.css のみ。CDN参照は禁止 -->
  <link rel="stylesheet" href="../../css/common.css">
</head>
<body>
  <!-- layout.js が自動でヘッダーを挿入する。手動でヘッダーHTMLを書かないこと -->
  <div id="layout-header"></div>

  <main class="container">
    <h1 class="page-title">ツール名</h1>
    <p class="page-desc">このツールの説明（1〜2文）</p>

    <div class="card">
      <!-- ツール固有のHTML -->
    </div>
  </main>

  <div id="layout-footer"></div>

  <!-- layout.js は body 末尾で読み込む。src は必ず相対パス -->
  <script src="../../js/layout.js"></script>
  <script>
    // ツール固有のJS
    // ルール: fetch/XHR/WebSocket でユーザー入力を外部に送らない
  </script>
</body>
</html>
```

---

## 7. 実装済みツール仕様

### 7-1. BASE64エンコード・デコード（`tools/base64/`）

| 項目 | 内容 |
|------|------|
| ファイル | `tools/base64/index.html` |
| カテゴリ | エンコード / デコード |

**UI要素：**
- 入力テキストエリア（`.textarea`）
- モード切替：「エンコード」「デコード」ラジオボタンまたはタブ
- オプション：「URL-safe」チェックボックス（`+`→`-`, `/`→`_`, `=`除去）
- 出力テキストエリア（読み取り専用）
- 「コピー」ボタン（`.btn-ghost`）→ 成功時に `.toast` 表示

**JS実装方針：**
- `btoa()` / `atob()` を使用（外部ライブラリ不要）
- 日本語等の非ASCII文字は `TextEncoder` でUTF-8バイト列に変換してからエンコード
- 入力欄変更時にリアルタイムで変換（`input` イベント）
- デコード失敗時はエラーメッセージを `--error` カラーで表示
- URL-safe オプションがオフでも、デコード対象文字列に `-` または `_` が含まれ、かつ `+` や `/` が含まれていない場合は、自動で URL-safe 形式と解釈して文字置換・パディング補正を行ったうえでデコードを試みる。

### 7-2. ランダム文字列生成（`tools/random-string/`）

| 項目 | 内容 |
|------|------|
| ファイル | `tools/random-string/index.html` |
| カテゴリ | テキスト生成 |

**UI要素：**
- 文字数入力（number input、範囲 1〜2000、デフォルト 16）
- 文字種チェックボックス（最低1つ選択必須）
  - 大文字英字 A–Z
  - 小文字英字 a–z
  - 数字 0–9
  - 記号（`!@#$%^&*-_+=`）
  - ひらがな（あ-ん）
  - 全角カタカナ（ア-ン）
- 生成本数（number input、範囲 1〜50、デフォルト 1）
- 「生成」ボタン（`.btn-primary`）
- 出力エリア（生成結果を1行1件で表示）
- 「全てコピー」ボタン

**JS実装方針：**
- **`window.crypto.getRandomValues()` を使用**（`Math.random()` は使わない。暗号論的に安全なランダムが目的）
- 文字種が1つも選択されていない場合はボタンを無効化してエラー表示

### 7-3. QRコード生成（`tools/qr-code/`）

| 項目 | 内容 |
|------|------|
| ファイル | `tools/qr-code/index.html` |
| カテゴリ | ユーティリティ |
| 使用ライブラリ | `libs/qrcodegen.js`（nayuki/QR-Code-generator TypeScript版、MIT License） |

**UI要素：**
- テキスト入力テキストエリア（`.textarea`）
- 誤り訂正レベル選択（`<select>`）：L / M（デフォルト） / Q / H
- QRコードSVGプレビューエリア（白背景・黒モジュール・4モジュールのクワイエットゾーン付き）
- SVGダウンロードボタン（`.btn-ghost`）→ `qr.svg` としてダウンロード
- SVGコピーボタン（`.btn-ghost`）→ `window.showToast('コピーしました')` を呼ぶ
- クリアボタン（`.btn-ghost`）

**JS実装方針：**
- `qrcodegen.QrCode.encodeText(text, ecl)` を使用（外部通信なし）
- 出力は `qr.getModule(x, y)` でSVG `<rect>` 要素を生成
- SVGの `viewBox` に `-4 -4` オフセットで4モジュールのクワイエットゾーンを確保（ダーク背景でも読み取れるよう白背景を白で明示）
- 入力変更時にリアルタイム生成（`input` イベント）
- 空入力時はプレースホルダーを表示し、ボタンをdisabled化
- `RangeError` 時（文字数超過）は `--error` カラーでエラーメッセージを表示

---

## 8. ツール追加手順（チェックリスト）

新しいツールを追加するときは以下を順番に実施する：

- [ ] `tools/{ツール名}/` フォルダを作成
- [ ] §6 のテンプレートをコピーして `tools/{ツール名}/index.html` を作成
- [ ] ツール固有のHTMLとJSを実装
- [ ] `index.html`（トップページ）の適切なカテゴリ `<section>` にツールカードを追記
- [ ] ブラウザの開発者ツール > Network タブを開き、**外部通信が発生していないことを確認**
- [ ] README.md のツール一覧を更新

---

## 9. ツール追加候補（アイデアメモ）

| ツール名 | カテゴリ | 概要 | 主要API |
|---------|---------|------|---------|
| URLエンコード・デコード | エンコード | パーセントエンコーディング | `encodeURIComponent` |
| ハッシュ生成 | エンコード | SHA-256ダイジェスト | `crypto.subtle.digest` |
| UUID生成 | テキスト生成 | UUIDv4 | `crypto.randomUUID()` |
| Unixタイム変換 | 変換 | エポック秒 ↔ 日時文字列 | `Date` |
| JSON整形・圧縮 | テキスト | インデント整形 / ミニファイ | `JSON.parse` / `JSON.stringify` |
| 文字数・バイト数カウント | テキスト | UTF-8バイト数表示 | `TextEncoder` |
| カラーコード変換 | 変換 | HEX ↔ RGB ↔ HSL | 純JS計算 |
| テキスト差分 | テキスト | 2文字列のdiff表示 | 純JS実装 or 同梱ライブラリ |
| パスワード強度チェック | ユーティリティ | エントロピー計算 | 純JS（外部送信なし） |
| Markdown→HTML変換 | テキスト | リアルタイムプレビュー | 純JSパーサー（同梱） |


---

## 10. GitHubリポジトリ・公開設定

### .gitignore

```
.DS_Store
Thumbs.db
*.log
node_modules/
```

### GitHub Pages 公開手順

1. リポジトリを `public` で作成（個人情報を含まないことを確認）
2. `Settings > Pages > Source: Deploy from a branch`
3. `Branch: main` / `/ (root)` を選択 → Save
4. 数分後に `https://{username}.github.io/{repo-name}/` で公開される

### README.md に必ず記載すること

- ツール一覧と各ツールへのリンク
- 「すべての処理はブラウザ内で完結し、入力データは外部に送信されません」の一文
- ライセンス（MIT推奨）

---

## 11. 設計の意思決定ログ

後から「なぜこうなっているか」を追跡できるよう記録する。

| 決定事項 | 理由 |
|---------|------|
| 外部依存ゼロ | 仕事の機密データを貼り付けても安全にするため。CDN経由でもスクリプトが実行される可能性を排除 |
| ツールごとに別HTMLファイル | 1ページSPA（タブ切替）は拡張時にJSが複雑化する。別ファイルなら追加・削除が独立して行える |
| layout.js でヘッダーをインジェクション | 各HTMLにヘッダーをコピペすると変更時に全ファイル修正が必要になる。JSインジェクションで1ファイル管理 |
| `crypto.getRandomValues()` 使用 | パスワード生成など安全性が求められる用途を想定。`Math.random()` は暗号論的に安全でない |
| `tools/{name}/index.html` 構造 | `tools/base64.html` のようなフラット構造よりURLがきれいになり、将来的にツールごとのアセット追加もしやすい |
| モバイルファースト（スマホをデフォルト、PCを上書き） | 逆順より上書き量が少なく、意図が追いやすい。スマホ幅320px〜を基準にレイアウトを設計する |
| `box-sizing: border-box` をグローバルリセットに含める | これがないと `width: 100%` の input/textarea が padding 分だけ親要素をはみ出す。特にスマホで顕著 |
| `.toolbar` に `flex-wrap: wrap` を付ける | スマホ幅でボタンが複数あると横に溢れる。wrap で自動折り返し |
| ボタン・リンクに `min-height: 44px` を付ける | Apple HIG・WCAGが推奨するタッチターゲット最小サイズ。これがないとスマホで誤タップが多発する |
| `.tool-grid` をスマホで `1fr`（1列）固定にする | `minmax(220px, 1fr)` は320px幅端末でカードが220px確保できずはみ出しが起きるため、スマホは1列固定 |
| ブレークポイントを600pxの1段階のみにする | 2段階（sm/md）以上は管理が複雑になる。このツール集はレイアウトがシンプルなため1段階で十分 |
