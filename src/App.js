import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { createClient } from "@supabase/supabase-js";

// Supabase 初期化
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false); // 保存完了フラグ
  const [formData, setFormData] = useState({
    distance: "",
    highwayFee: "",
    lateHour: "",
  });
  const [isUpdate, setIsUpdate] = useState(false);
  const [recordId, setRecordId] = useState(null);

  // LIFF初期化 & プロフィール取得
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

  // 今日のデータを取得してフォームにセット
  useEffect(() => {
    if (!profile) return;

    const fetchTodayData = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("driver_payments")
        .select("*")
        .eq("user_id", profile.userId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error(error);
        return;
      }

      if (data) {
        setFormData({
          distance: data.mileage,
          highwayFee: data.highway_fee,
          lateHour: data.late_hour,
        });
        setRecordId(data.id);
        setIsUpdate(true);
      }
    };

    fetchTodayData();
  }, [profile]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) return;

    const payload = {
      user_id: profile.userId,
      display_name: profile.displayName,
      mileage: formData.distance,
      highway_fee: formData.highwayFee,
      late_hour: formData.lateHour || 0,
    };

    let error;
    if (isUpdate) {
      // 更新
      ({ error } = await supabase
        .from("driver_payments")
        .update(payload)
        .eq("id", recordId));
    } else {
      // 新規作成
      ({ error } = await supabase.from("driver_payments").insert([payload]));
    }

    if (error) {
      console.error(error);
      alert("保存に失敗しました");
    } else {
      setSaved(true);
    }
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

          {saved ? (
            <div className="bg-white shadow-md rounded-lg p-6 text-center">
              <p className="text-green-600 font-semibold text-lg">
                保存完了しました！
              </p>
            </div>
          ) : (
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
                  value={formData.distance}
                  onChange={handleChange}
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
                  value={formData.highwayFee}
                  onChange={handleChange}
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
                  value={formData.lateHour}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-400 outline-none"
                  placeholder="例: 1"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-green-500 text-white font-semibold px-6 py-2 rounded-lg shadow hover:bg-green-600 active:scale-95 transition"
                >
                  {isUpdate ? "更新" : "保存"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
