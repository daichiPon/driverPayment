import React, { useEffect, useState } from "react";
import liff from "@line/liff";

function App() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    liff.init({ liffId: "2008216612-q94xYdNk" }).then(() => {
      if (!liff.isLoggedIn()) {
        liff.login();
      } else {
        liff.getProfile().then((p) => setProfile(p));
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    await fetch("/api/save", {
      method: "POST",
      body: JSON.stringify({
        userId: profile.userId,
        displayName: profile.displayName,
        number: formData.get("number"),
        // 画像は別途アップロード処理
      }),
      headers: { "Content-Type": "application/json" },
    });
  };

  return (
    <div>
      <h1>こんにちは {profile?.displayName}</h1>
      <form onSubmit={handleSubmit}>
        <input type="number" name="number" placeholder="数値を入力" />
        <input type="file" name="photo" accept="image/*" />
        <button type="submit">送信</button>
      </form>
    </div>
  );
}

export default App;
