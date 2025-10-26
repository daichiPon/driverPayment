import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, getDocs, where } from "firebase/firestore";

const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

const ConfirmShiftView = () => {
  const [loading, setLoading] = useState(true);
  const [confirmedShifts, setConfirmedShifts] = useState([]);
  const [weekStart, setWeekStart] = useState(null);
  const [weekEnd, setWeekEnd] = useState(null);

  // 今週の月曜日を取得
  const getWeekStart = (date = new Date(), offset = 1) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

  useEffect(() => {
    const fetchConfirmed = async () => {
      try {
        const ws = getWeekStart();
        const weekStr = ws.toISOString();
        const queryRef = query(
          collection(db, "confirmed_shift"),
          where("week", "==", weekStr)
        );
        const snapshot = await getDocs(queryRef);

        if (snapshot.empty) {
          setConfirmedShifts([]);
        } else {
          const data = [];
          snapshot.forEach((doc) => {
            data.push(doc.data());
          });
          setConfirmedShifts(data);
        }

        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        setWeekStart(ws);
        setWeekEnd(we);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchConfirmed();
  }, []);

  if (loading) return <p>読み込み中...</p>;

  // ✅ データがない場合のメッセージ
  if (confirmedShifts.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          fontFamily: "sans-serif",
          color: "#555",
        }}
      >
        <h2 style={{ marginBottom: "16px" }}>今週のシフトはまだ出ていません</h2>
        <p>管理者が確定シフトを登録するとここに表示されます。</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px",
        fontFamily: "sans-serif",
        background: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          background: "#fff",
          padding: "16px",
          borderRadius: "12px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 8px" }}>今週の確定シフト</h2>
        {weekStart && weekEnd && (
          <p style={{ color: "#555", margin: 0 }}>
            {formatDate(weekStart)}〜{formatDate(weekEnd)}
          </p>
        )}
      </div>

      {/* シフト一覧テーブル */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            background: "#fff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <thead style={{ background: "#88949e", color: "white" }}>
            <tr>
              <th style={{ padding: "8px" }}>ユーザー</th>
              {weekdays.map((day) => (
                <th key={day} style={{ padding: "8px" }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {confirmedShifts.map((user) => (
              <tr key={user.user_id}>
                <td
                  style={{
                    padding: "8px",
                    fontWeight: "bold",
                    background: "#f0f2f5",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.display_name || user.user_id}
                </td>
                {weekdays.map((day) => (
                  <td
                    key={day}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      background: user[day] === "〇" ? "#4CAF50" : "#f44336",
                      color: "white",
                      fontWeight: "bold",
                      borderRadius: "4px",
                    }}
                  >
                    {user[day] || "×"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConfirmShiftView;
