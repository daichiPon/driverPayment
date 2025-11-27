import React, { useEffect, useState,useCallback } from "react";
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

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const locations = ["北新地", "日本橋"]; // 🔹 選択肢

const ShiftInput = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState("");
  const [shifts, setShifts] = useState(
    weekdays.reduce(
      (acc, day) => ({ ...acc, [day]: { status: "×", location: "" } }),
      {}
    )
  );

    // ✅ 週の開始・終了日
const getWeekStart = useCallback((date = new Date(), offset = 1) => {
  const day = date.getDay(); // 0=日, 1=月,...
  const diff = date.getDate() - day + offset * 7;
  const sunday = new Date(date.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}, []);


const getWeekEnd = useCallback((date = new Date(), offset = 1) => {
  const weekStartDate = getWeekStart(date, offset);
  const saturday = new Date(weekStartDate);
  saturday.setDate(weekStartDate.getDate() + 6);
  return saturday;
}, [getWeekStart]);


  const weekStart = getWeekStart(new Date(), 1);
  const weekEnd = getWeekEnd(new Date(), 1);
  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

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
        setProfile(p);
      } catch (err) {
        console.error("LIFF init error:", err);
      } finally {
        setLoading(false);
      }
    };
    initLiff();
  }, []);

  // ✅ userテーブルから勤務地取得
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!profile) return;
      try {
        const q = query(
          collection(db, "user"),
          where("user_id", "==", profile.userId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          if (userData.location) {
            setUserLocation(userData.location);

            // 🔹 初期状態に勤務地をセット
            setShifts((prev) =>
              weekdays.reduce((acc, day) => {
                acc[day] = {
                  ...prev[day],
                  location: userData.location,
                };
                return acc;
              }, {})
            );
          }
        }
      } catch (err) {
        console.error("ユーザー情報取得エラー:", err);
      }
    };
    fetchUserInfo();
  }, [profile]);

  // ✅ Firestoreから今週のシフト取得
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
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
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
  }, [profile,getWeekEnd,getWeekStart]);

  // ✅ 〇×切り替え
  const handleChangeStatus = (day) => {
    setShifts((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        status: prev[day].status === "〇" ? "×" : "〇",
        location:
          prev[day].status === "〇" ? "" : prev[day].location || userLocation,
      },
    }));
  };

  // ✅ 勤務地変更
  const handleChangeLocation = (day, value) => {
    setShifts((prev) => ({
      ...prev,
      [day]: { ...prev[day], location: value },
    }));
  };

  // ✅ Firestoreに保存
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
      shifts,
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

  if (loading) return <p>Loading...</p>;

  // ✅ UI部分
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
            marginBottom: "8px",
          }}
        >
          {profile.displayName} さん
        </div>
      )}

      <p style={{ textAlign: "center", color: "#666", marginBottom: "16px" }}>
        登録勤務地：<strong>{userLocation}</strong>
      </p>

      {weekdays.map((day) => (
        <div
          key={day}
          style={{
            background: "#f9f9f9",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "12px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
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

          {shifts[day].status === "〇" && (
            <div style={{ marginTop: "10px", textAlign: "center" }}>
              <select
                value={shifts[day].location}
                onChange={(e) => handleChangeLocation(day, e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  width: "80%",
                }}
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}

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
