# 給料精算$シフト管理アプリ

## 開発手順
- windows:`($env:HTTPS = "true") ; npm start`
- mac:`export HTTPS=true`&`npm start`

- ↑のコマンドでhttpsでlocalhostを開くことができる


## lineDeveloper設定
- 開発時：`https://localhost:3000/`
- 本番環境:`https://driver-payment.vercel.app`


## 納品するときにやること
- [firebaseの管理者を変更して自分を削除](https://console.firebase.google.com/u/1/project/nightrun-b8b53/settings/iam)
- [lineDeveloperの管理者を変更して自分を削除](https://developers.line.biz/console/provider/2004561219/roles)

## 補足
- lineDeveloperは未認証の状態だとlineの公式アカウントを検索しても表示されない
  →従業員以外はログインできないようにするために未認証でOK lineDeveloperのQRコードから登録する
- vercel（ローンチ）についてどうするか、可能であればGoogleでログインしたvercelアカウントを作成して、それにgitHubを紐づけてローンチしたい
