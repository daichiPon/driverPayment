import React, { useEffect, useState } from "react";
import liff from "@line/liff";

function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // ← 読み込み制御用

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: "2008216612-q94xYdNk" });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        setProfile(p);
      } catch (err) {
        console.error("LIFF init error:", err);
      } finally {
        setLoading(false);
      }
    };
    initLiff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) {
      alert("プロフィール情報を取得中です。少し待ってから再度お試しください。");
      return;
    }

    const formData = new FormData(e.currentTarget);

    await fetch("/api/save", {
      method: "POST",
      body: JSON.stringify({
        userId: profile.userId, // ← LINEのユーザーID
        displayName: profile.displayName,
        distance: formData.get("distance"),
        highwayFee: formData.get("highwayFee"),
        lateHour: formData.get("lateHour"),
      }),
      headers: { "Content-Type": "application/json" },
    });

    alert("保存しました！");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>LINE情報を取得中です...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-green-500 text-white py-4 text-center font-semibold shadow-md">
        ドライバー精算
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full px-4">
          {profile && (
            <p className="text-center text-gray-600 mb-4">
              ようこそ{" "}
              <span className="font-semibold">{profile.displayName}</span> さん
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-md rounded-lg p-6 relative"
          >
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                走行距離 (km)
              </label>
              <input
                type="number"
                name="distance"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-400 outline-none"
                placeholder="例: 70"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                高速料金 (円)
              </label>
              <input
                type="number"
                name="highwayFee"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-400 outline-none"
                placeholder="例: 1950"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                遅刻時間 (時)
              </label>
              <input
                type="number"
                name="lateHour"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-400 outline-none"
                placeholder="例: 1"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-green-500 text-white font-semibold px-6 py-2 rounded-lg shadow hover:bg-green-600 active:scale-95 transition"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
