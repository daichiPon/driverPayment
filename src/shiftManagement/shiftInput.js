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

const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

const ShiftInput = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState(
    weekdays.reduce((acc, day) => ({ ...acc, [day]: "×" }), {})
  );

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

  const handleChange = (day) => {
    setShifts((prev) => ({
      ...prev,
      [day]: prev[day] === "〇" ? "×" : "〇",
    }));
  };

  const handleSubmit = async () => {
    if (!profile) return;

    const weekStart = getWeekStart(new Date(), 1);
    const weekStr = weekStart.toISOString();

    const payload = {
      user_id: profile.userId,
      display_name: profile.displayName,
      week: weekStr,
      ...shifts,
      created_at: Timestamp.now(),
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

  return (
    <div
      style={{
        padding: "16px",
        maxWidth: "400px",
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          marginBottom: "60px",
        }}
      >
        {weekdays.map((day) => (
          <div
            key={day}
            onClick={() => handleChange(day)}
            style={{
              background: shifts[day] === "〇" ? "#4CAF50" : "#f44336",
              color: "white",
              textAlign: "center",
              padding: "14px 0",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              transition: "background 0.3s",
            }}
          >
            {day}：{shifts[day]}
          </div>
        ))}
      </div>

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
