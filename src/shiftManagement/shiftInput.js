import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import liff from "@line/liff";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";

// 曜日リスト
const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
// 店舗リスト
const locations = ["北新地", "日本橋"];

const ShiftInput = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 各曜日の初期データ（〇×と店舗名）
  const [shifts, setShifts] = useState(
    weekdays.reduce(
      (acc, day) => ({ ...acc, [day]: { status: "×", location: "" } }),
      {}
    )
  );

  // ✅ LIFF初期化
  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: "2008216612-q94xYdNk" });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        console.log('p',p)
        setProfile(p);
      } catch (err) {
        console.error("LIFF init error:", err);
      } finally {
        setLoading(false);
      }
    };
    initLiff();
  }, []);

  // ✅ Firestoreから今週のシフトを取得
  useEffect(() => {
    const fetchWeek = async () => {
      if (!profile) return;

      try {
        const weekStart = getWeekStart(new Date(), 1);
        const weekEnd = getWeekEnd(new Date(), 1);

        const q = query(
          collection(db, "desired_shift"),
          where("user_id", "==", profile.userId),
          where("week", ">=", weekStart.toISOString()),
          where("week", "<=", weekEnd.toISOString())
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.shifts) {
            setShifts(data.shifts);
          }
        });
      } catch (err) {
        console.error("Fetch shift error:", err);
      }
    };
    fetchWeek();
  }, [profile]);

  // ✅ 曜日タップで〇⇄×切り替え
  const handleChangeStatus = (day) => {
    setShifts((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        status: prev[day].status === "〇" ? "×" : "〇",
        location: prev[day].status === "〇" ? "" : prev[day].location, // ×にしたら店舗リセット
      },
    }));
  };

  // ✅ 店舗変更
  const handleLocationChange = (day, location) => {
    setShifts((prev) => ({
      ...prev,
      [day]: { ...prev[day], location },
    }));
  };

  // ✅ Firestoreへ登録
  const handleSubmit = async () => {
    if (!profile) return;

    const weekStart = getWeekStart(new Date(), 1);
    const weekStr = weekStart.toISOString();

    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(now.getMonth() + 3);

    const payload = {
      user_id: profile.userId,
      display_name: profile.displayName,
      week: weekStr,
      shifts, // ← 曜日ごとのオブジェクト構造
      created_at: Timestamp.now(),
      expireAt: threeMonthsLater,
    };

    try {
      const q = query(
        collection(db, "desired_shift"),
        where("user_id", "==", profile.userId),
        where("week", "==", weekStr)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        await updateDoc(querySnapshot.docs[0].ref, payload);
        alert("シフトを更新しました！");
      } else {
        await addDoc(collection(db, "desired_shift"), payload);
        alert("シフトを提出しました！");
      }
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
  };

  // ✅ 週の開始日（月）と終了日（日）を取得
  function getWeekStart(date = new Date(), offset = 1) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function getWeekEnd(date = new Date(), offset = 1) {
    const monday = getWeekStart(date, offset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday;
  }

  const weekStart = getWeekStart(new Date(), 1);
  const weekEnd = getWeekEnd(new Date(), 1);
  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

  if (loading) return <p>Loading...</p>;

  // ✅ UI表示部分
  return (
    <div
      style={{
        padding: "16px",
        maxWidth: "420px",
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "8px" }}>
        来週のシフト入力
      </h2>
      <p style={{ textAlign: "center", color: "#666", marginBottom: "12px" }}>
        {formatDate(weekStart)}〜{formatDate(weekEnd)}
      </p>

      {profile && (
        <div
          style={{
            textAlign: "center",
            fontWeight: "bold",
            color: "#333",
            marginBottom: "16px",
          }}
        >
          {profile.displayName} さん
        </div>
      )}

      {/* 曜日ごとのシフト入力ブロック */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "80px",
        }}
      >
        {weekdays.map((day) => (
          <div
            key={day}
            style={{
              background: "#f9f9f9",
              borderRadius: "12px",
              padding: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            {/* 出勤希望 〇× 切り替え */}
            <div
              onClick={() => handleChangeStatus(day)}
              style={{
                background:
                  shifts[day].status === "〇" ? "#4CAF50" : "#f44336",
                color: "white",
                textAlign: "center",
                padding: "12px",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background 0.3s",
              }}
            >
              {day}：{shifts[day].status}
            </div>

            {/* 出勤の場合のみ店舗を選択可能 */}
            {shifts[day].status === "〇" && (
              <select
                value={shifts[day].location}
                onChange={(e) => handleLocationChange(day, e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              >
                <option value="">店舗を選択</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* 提出ボタン */}
      <button
        onClick={handleSubmit}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#2196F3",
          color: "white",
          border: "none",
          padding: "12px 24px",
          borderRadius: "30px",
          fontSize: "16px",
          fontWeight: "bold",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          cursor: "pointer",
        }}
      >
        提出
      </button>
    </div>
  );
};

export default ShiftInput;
