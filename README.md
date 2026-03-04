# Protopan

Fritzing の豊富なパーツライブラリを活用できる、軽量で使いやすい Web ベースのブレッドボードエディタです。
配線図の作成、ジャンパの配置、マニュアル作成のための図面作成を目的としています。

![License: CC BY-SA](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)

## 特徴

- **Fritzing 互換**: 公式の `fritzing-parts` ライブラリ（数千種類）を検索・使用可能。
- **正確なスナップ**: パーツのピン位置を自動解析し、ブレッドボードの穴にピタリと吸着。
- **スマート・ワイヤリング**: 配線の長さに応じて、標準的なジャンパワイヤの色を自動割り当て。
- **操作性**: ドラッグ＆ドロップ、クリックによるパーツ回転、透過表示（X-Ray）モード、ラベル非表示モードなどを搭載。
- **ファイル対応**: ローカルの `.fzpz` ファイルを直接インポートして使用可能。

## ライセンスについて

- **プログラムコード**: 本プロジェクトのソースコードは MIT ライセンスで提供されます。
- **パーツデータ**: 同梱および参照されているパーツデータは、[Fritzing Parts](https://github.com/fritzing/fritzing-parts) リポジトリのものであり、多くは **Creative Commons Attribution-ShareAlike (CC BY-SA 4.0)** ライセンスの下で提供されています。

## 開発環境のセットアップ

```bash
# リポジトリのクローン（サブモジュールを含む）
git clone --recursive https://github.com/YOUR_USERNAME/breadboard-editor.git
cd breadboard-editor

# 依存関係のインストール
npm install

# パーツインデックスの生成
npm run generate-index

# 開発サーバーの起動
npm run dev
```

## 技術スタック

- **Frontend**: React + TypeScript + Vite
- **Libraries**:
  - `react-draggable`: パーツの操作
  - `jszip`: .fzpz ファイルの解凍
  - `fast-xml-parser`: Fritzing 部品定義（XML）の解析
- **Deployment**: GitHub Actions + GitHub Pages

## 謝辞

このプロジェクトは Fritzing コミュニティによって作成された素晴らしい資産を活用しています。
[Fritzing.org](https://fritzing.org)
