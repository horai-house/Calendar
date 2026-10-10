# 📅 年間カレンダー

Webブラウザで動作する年間カレンダーアプリです。  
A4横印刷対応・スマホ対応・日本の祝日自動判定・予定の年度別保存機能つき。

---

## 📁 ファイル構成

```
年間カレンダー/
├── index.html       # メインHTML
├── style.css        # デザイン・印刷スタイル
├── app.js           # カレンダー描画・データ管理・Firebaseリアルタイム同期ロジック
├── firebase-config.js # Firebase APIキー・接続設定ファイル
├── holidays.js      # 日本の祝日・振替休日 計算モジュール
├── manifest.json    # スマホでホーム画面に追加（PWA）用
├── カレンダーを開く.bat  # Windowsでダブルクリックして開く
└── README.md        # このファイル
```

---

## 🌐 GitHub Pages での公開手順（初回）

ブラウザ操作だけで完結します。Gitコマンドは不要です。

### ステップ 1: GitHub にログインしてリポジトリを作成する

1. [https://github.com](https://github.com) にアクセスしてログインします。
2. 右上の「**＋**」ボタン → 「**New repository**」をクリックします。
3. 以下のように設定します：

   | 項目 | 設定値 |
   |------|--------|
   | **Owner** | 個人アカウント または `horai-house` |
   | **Repository name** | `annual-calendar`（任意の名前） |
   | **Public / Private** | `Public`（公開） |
   | **Initialize README など** | チェックなし（何も選択しない） |

4. 「**Create repository**」ボタンをクリックします。

---

### ステップ 2: ファイルをアップロードする

1. リポジトリ作成直後の画面で「**uploading an existing file**」リンクをクリックします。
2. 以下の6ファイルをまとめてドラッグ＆ドロップします：
   - `index.html`
   - `style.css`
   - `app.js`
   - `firebase-config.js`
   - `holidays.js`
   - `manifest.json`
3. 画面下部の「**Commit changes**」ボタンをクリックして保存します。

---

### ステップ 3: GitHub Pages を有効にする

1. リポジトリのページ上部にある「⚙️ **Settings**」タブをクリックします。
2. 左側メニューの「**Pages**」をクリックします。
3. **Build and deployment** の **Branch** を以下のように変更します：
   - `None` → `main`（または `master`）
   - フォルダは `/ (root)` のまま
4. 「**Save**」ボタンをクリックします。

---

### ステップ 4: 公開URLにアクセスする

1〜2分後、Pages設定画面の上部に公開URLが表示されます。

```
https://（ユーザー名またはhorai-house）.github.io/annual-calendar/
```

このURLをスマホやPCのブラウザで開けば、どこからでも利用できます。

> 💡 **スマホのホーム画面に追加する方法**
> - **iPhone (Safari)**: 共有ボタン（□↑）→「ホーム画面に追加」
> - **Android (Chrome)**: メニュー（⋮）→「ホーム画面に追加」またはアプリをインストール

---

## 🔥 Firebase連携（スマホとPCのリアルタイム同期）

Firebase (Cloud Firestore) を使用することで、**スマホで入力した予定や未定タスクがPCや他端末へリアルタイムに自動同期**されます。

### 1. Firebase APIキー・接続設定情報 (`firebase-config.js`)

プロジェクトの設定情報（APIキー等）は `firebase-config.js` 内に記述されています。

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "annualcalendar-7ec4c.firebaseapp.com",
  projectId: "annualcalendar-7ec4c",
  storageBucket: "annualcalendar-7ec4c.firebasestorage.app",
  messagingSenderId: "183493934695",
  appId: "1:183493934695:web:3e2258c7ff19d163d01ec2",
  measurementId: "G-3ZZQ1W7FSZ"
};
```

### 2. APIキー・設定情報の確認場所（Firebase Console）

APIキーや設定情報を再確認・変更する場合は、以下の手順で取得できます。

1. [Firebase Console](https://console.firebase.google.com/) にアクセスします。
2. 対象のプロジェクト（例: `annualcalendar-7ec4c`）を選択します。
3. 画面左上の ⚙️（歯車マーク）をクリックし、「**プロジェクトの設定**」を開きます。
4. 「**全般**」タブの一番下にある「**マイアプリ**」セクションを表示します。
5. 「**SDK の設定と構成**」で「**構成**」を選択すると、上記コードが表示されます。

### 3. セキュリティルール設定（Cloud Firestore）

Firebase Consoleの **「Cloud Firestore」 > 「ルール」** タブで、以下のルールが適用されているか確認してください。

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 🔄 ファイルを更新・修正した後の反映手順

コードやデザインを修正した場合は以下の手順で更新します。

1. [GitHub のリポジトリページ](https://github.com) にアクセスします。
2. 「**Add file**」ボタン → 「**Upload files**」を選択します。
3. 修正した**ファイルをドラッグ＆ドロップ**して上書きします。
4. 「**Commit changes**」ボタンをクリックします。
5. 数分以内にスマホ・PCへ自動反映されます。

---

## 💾 データ（予定）のバックアップと復元

カレンダーに入力した予定はローカル（LocalStorage）およびFirebase（Cloud Firestore）に自動保存されます。  
バックアップファイルとして保存したい場合は以下の手順を使います。

### バックアップ（書き出し）

1. アプリ上部の「💾 **保存/復元**」ボタンをクリックします。
2. 「**JSONでバックアップ保存**」→ ファイルがダウンロードされます。
3. 「**CSV形式でダウンロード**」→ Excelで開ける形式でも保存できます。

### 復元（読み込み）

1. 「💾 **保存/復元**」ボタンをクリックします。
2. 「**ファイルを選択**」からバックアップしたJSONファイルを選択します。
3. 「データを正常に復元しました！」と表示されれば完了です。

---

## 🖨️ A4横 印刷の使い方

1. アプリ上部の「🖨️ **A4横 印刷**」ボタンをクリックします。
2. 印刷プレビューが表示されます（用紙サイズ: A4横が自動設定されます）。
3. 上半期（1〜6月）/ 下半期（7〜12月）の各ページが1枚ずつ、計2枚で印刷されます。
4. 「**調整**」ボタンから行の高さやフォントサイズを微調整できます。

---

## 🔑 主な機能一覧

| 機能 | 内容 |
|------|------|
| リアルタイム自動同期 | Firebase Firestore連携により複数端末で即時同期 |
| 年度切り替え | 左右の ◀ ▶ ボタンで切り替え。過去のデータも記憶 |
| 祝日自動判定 | 春分・秋分・振替休日・国民の休日まで対応 |
| カラーラベル | 予定に色（青・緑・橙・赤・紫）を設定。上部カレンダーに反映 |
| Excel風キーボード操作 | Enter・↑↓キーで隣の行へ移動 |
| 未定タスク欄 | 日付未定の月間予定を記入。入力で行が自動追加 |
| スマホ対応 | 1ヶ月タブで表示切替 |
| PWA対応 | ホーム画面に追加でアプリ化 |
| A4横印刷 | 1〜6月・7〜12月を各1ページに最適化。31日まで確実に収まる |
| バックアップ | JSON・CSV形式でエクスポート/インポート |


