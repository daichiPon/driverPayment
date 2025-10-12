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

const ShiftInput = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState(
    weekdays.reduce((acc, day) => ({ ...acc, [day]: "×" }), {})
  );

  // LIFF初期化
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

  // 来週のシフトをFirestoreから取得
  useEffect(() => {
    const fetchWeek = async () => {
      if (!profile) return;

      try {
        const weekStart = getWeekStart(new Date(), 1); // 来週の月曜
        const weekEnd = getWeekEnd(new Date(), 1); // 来週の日曜

        const startStr = weekStart.toISOString();
        const endStr = weekEnd.toISOString();

        const q = query(
          collection(db, "desired_shift"),
          where("user_id", "==", profile.userId),
          where("week", ">=", startStr),
          where("week", "<=", endStr)
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          weekdays.forEach((day) => {
            if (data[day]) setShifts((prev) => ({ ...prev, [day]: data[day] }));
          });
        });
      } catch (err) {
        console.error("Fetch shift error:", err);
      }
    };
    fetchWeek();
  }, [profile]);

  // 曜日シフト変更
  const handleChange = (day, value) => {
    setShifts((prev) => ({ ...prev, [day]: value }));
  };

  // 提出ハンドラ
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) return;

    const weekStart = getWeekStart(new Date(), 1); // 来週の月曜
    const weekStr = weekStart.toISOString();

    const payload = {
      user_id: profile.userId,
      display_name: profile.displayName,
      week: weekStr,
      ...shifts, // 曜日ごとの〇/×
      created_at: Timestamp.now(),
    };

    try {
      // 既存データがあるかチェック
      const q = query(
        collection(db, "desired_shift"),
        where("user_id", "==", profile.userId),
        where("week", "==", weekStr)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // 更新
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, payload);
        alert("シフトを更新しました！");
      } else {
        // 新規作成
        await addDoc(collection(db, "desired_shift"), payload);
        alert("シフトを提出しました！");
      }
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
  };

  // 来週の月曜を取得
  function getWeekStart(date = new Date(), offset = 1) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // 来週の日曜を取得
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

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2>
        来週のシフト入力 ({formatDate(weekStart)}〜{formatDate(weekEnd)})
      </h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th
                key={day}
                style={{ border: "1px solid #ccc", padding: "8px" }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {weekdays.map((day) => (
              <td
                key={day}
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                <select
                  value={shifts[day]}
                  onChange={(e) => handleChange(day, e.target.value)}
                >
                  <option value="〇">〇</option>
                  <option value="×">×</option>
                </select>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <button
        style={{ marginTop: "20px", padding: "10px 20px", cursor: "pointer" }}
        onClick={handleSubmit}
      >
        提出
      </button>
    </div>
  );
};

export default ShiftInput;
