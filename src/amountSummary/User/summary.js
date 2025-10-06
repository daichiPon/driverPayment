import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { createClient } from "@supabase/supabase-js";

// Supabase 初期化
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function Summary() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState([]);

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

  // Supabaseからデータ取得
  useEffect(() => {
    if (!profile) return;

    const fetchAllData = async () => {
      const { data, error } = await supabase
        .from("driver_payments")
        .select("*")
        .eq("user_id", profile.userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      if (data) setAllPayments(data);
    };

    fetchAllData();
  }, [profile]);

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
        ドライバー精算履歴
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {profile && (
          <p className="text-center text-gray-600 mb-6">
            ようこそ{" "}
            <span className="font-semibold">{profile.displayName}</span> さん
          </p>
        )}

        <div className="bg-white rounded-lg shadow-md w-full max-w-md p-4">
          <h2 className="text-lg font-semibold mb-3 text-center border-b pb-2">
            支払い履歴一覧
          </h2>

          {allPayments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">データがありません</p>
          ) : (
            <table className="w-full border border-gray-300 border-collapse">
              <thead className="bg-gray-200 text-gray-700">
                <tr>
                  <th className="p-2 border border-gray-300">日付</th>
                  <th className="p-2 border border-gray-300">走行距離</th>
                  <th className="p-2 border border-gray-300">高速料金</th>
                  <th className="p-2 border border-gray-300">遅刻時間</th>
                </tr>
              </thead>
              <tbody>
                {allPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-2 border border-gray-300 text-center">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-2 border border-gray-300 text-center">
                      {p.mileage} km
                    </td>
                    <td className="p-2 border border-gray-300 text-center">
                      {p.highway_fee} 円
                    </td>
                    <td className="p-2 border border-gray-300 text-center">
                      {p.late_hour} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default Summary;
