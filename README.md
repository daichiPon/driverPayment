# 給料精算$シフト管理アプリ

## 開発手順
- windows:`($env:HTTPS = "true") ; npm start`
- mac:`export HTTPS=true`&`npm start`

- ↑のコマンドでhttpsでlocalhostを開くことができる


## lineDeveloper設定
- 開発時：`https://localhost:3000/`
- 本番環境:`https://driver-payment.vercel.app`


## 納品するときにやること
- firebaseの管理者を変更して自分を削除
- lineDeveloperの管理者を変更して自分を削除
- lineDeveloperは未認証の状態だとlineの公式アカウントを検索しても表示されない
  →従業員以外はログインできないようにするために未認証でOK lineDeveloperのQRコードから登録する

## 残タスク
- liffアプリに表示される管理者とユーザの使用切り分け
- シフトデータを2週間経過で削除
- driver_payments（請求金額）のデータをどのタイミングで削除するかの確認&実装
- 退職したユーザの削除方法
