# Weekly Planner

週間スケジュール管理Webアプリケーション

## 概要

Googleアカウントでログインし、1週間の固定スケジュールを時間割形式で管理できるWebアプリケーションです。
特定の週のみ予定を変更できる「例外スケジュール」機能を備えており、学校の時間割やアルバイトのシフト管理にも利用できます。

## 機能

- **Googleログイン/ログアウト** - Firebase Authenticationを使用
- **固定スケジュール管理** - 追加・編集・削除
- **例外スケジュール** - 今週のみ変更 / 今後も変更
- **ドラッグ&ドロップ** - PC: マウスドラッグ / スマホ: 長押し + 編集
- **レスポンシブ対応** - PC: 時間割表示 / スマホ: 曜日タブ + リスト表示
- **カテゴリ管理** - 授業、アルバイト、研究、サークル、プライベート、その他
- **週切替** - 前週 / 今週 / 次週

## 技術スタック

- HTML5 / CSS3 / JavaScript (Vanilla)
- Firebase Authentication (Google)
- Cloud Firestore
- Firebase Analytics

## セットアップ

1. リポジトリをクローン
2. GitHub Pagesで公開
3. Firebase ConsoleでAuthorized Domainsに公開URLを追加

## ディレクトリ構成

```
/
├── index.html
├── firebase-config.js
├── css/
│   ├── style.css
│   ├── schedule.css
│   └── mobile.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── firestore.js
│   ├── schedule.js
│   ├── dragdrop.js
│   ├── modal.js
│   └── ui.js
├── assets/
│   └── logo.png
└── README.md
```
