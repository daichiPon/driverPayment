import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    mileage: "",
    highwayFee: 0,
    hour: 0,
    amount: 0
  });
  const [isUpdate, setIsUpdate] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const navigator = useNavigate();

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
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const q = query(
      collection(db, "driver_payments"),
      where("user_id", "==", profile.userId),
      where("created_at", ">=", Timestamp.fromDate(start)),
      where("created_at", "<=", Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      setFormData({
        mileage: data.mileage,
        highwayFee: data.highway_fee,
        hour: data.hour,
      });
      setRecordId(docSnap.id);
      setIsUpdate(true);
    }
  };

  fetchTodayData();
}, [profile]);


  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    console.log("e",e)
    e.preventDefault();
    if (!profile) return;

    const mileageFee= Math.floor(formData.mileage/7)*100
    console.log('距離料金',mileageFee)
    formData.amount = mileageFee + Number(formData.highwayFee)+ (Number(formData.hour)*1600)
    console.log('合計金額',formData.amount)

    const payload = {
      user_id: profile.userId,
      display_name: profile.displayName,
      mileage: formData.mileage,
      highway_fee: formData.highwayFee,
      hour: formData.hour || 0,
      amount: formData.amount,
      created_at: Timestamp.now(),
    };
    console.log("payLoad",payload)

    try {
      if (isUpdate && recordId) {
        // 更新
        const docRef = doc(db, "driver_payments", recordId);
        await updateDoc(docRef, payload);
      } else {
        // 新規作成
        await addDoc(collection(db, "driver_payments"), payload);
      }
      setSaved(true);
      console.log('保存')
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
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
                  name="mileage"
                  value={formData.mileage}
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
                  増減時間 (時)
                </label>
                <input
                  type="number"
                  name="hour"
                  value={formData.hour}
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
        <button onClick={() => navigator("/summary")}>
          <span>集計ページ</span>
        </button>
      </main>
    </div>
  );
}

export default App;
