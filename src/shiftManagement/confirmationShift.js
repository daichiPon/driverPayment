import React, { useEffect, useState ,useCallback} from "react";
import { db } from "../firebase";
import { collection, query, getDocs, where } from "firebase/firestore";

const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

const ConfirmShiftView = () => {
  const [loading, setLoading] = useState(true);
  const [confirmedShifts, setConfirmedShifts] = useState([]);
  const [weekStart, setWeekStart] = useState(null);
  const [weekEnd, setWeekEnd] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = 今週, -1 = 先週

  // 週の開始（月曜）を取得
  const getWeekStart = useCallback((date = new Date(), offset = 0) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  // 週の終了（日曜）を取得
const getWeekEnd = useCallback((date = new Date(), offset = 0) => {
  const monday = getWeekStart(date, offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}, [getWeekStart]); // ← getWeekStartを依存に入れる


  // 日付フォーマット（例：11/11）
  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

const fetchConfirmed = useCallback(async (offset) => {
    setLoading(true);
    try {
      const ws = getWeekStart(new Date(), offset);
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
        snapshot.forEach((doc) => data.push(doc.data()));
        setConfirmedShifts(data);
      }

      const we = getWeekEnd(new Date(), offset);
      setWeekStart(ws);
      setWeekEnd(we);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getWeekEnd,getWeekStart]);

  // 初回ロード＆weekOffset変更時に再実行
  useEffect(() => {
    fetchConfirmed(weekOffset);
  }, [weekOffset, fetchConfirmed]);

  // 表示切り替えボタン押下
  const handleWeekChange = (offset) => {
    setWeekOffset(offset);
  };

  if (loading) return <p style={{ textAlign: "center" }}>読み込み中...</p>;

  // データがない場合のメッセージ
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
        <h2 style={{ marginBottom: "16px" }}>
          {weekOffset === 0 ? "今週" : "先週"}のシフトはまだ出ていません
        </h2>
        <p>管理者が確定シフトを登録するとここに表示されます。</p>
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => handleWeekChange(0)}
            style={{
              padding: "8px 16px",
              marginRight: "8px",
              background: weekOffset === 0 ? "#2196F3" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            今週
          </button>
          <button
            onClick={() => handleWeekChange(-1)}
            style={{
              padding: "8px 16px",
              background: weekOffset === -1 ? "#2196F3" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            先週
          </button>
        </div>
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
      {/* 週切り替えボタン */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <button
          onClick={() => handleWeekChange(0)}
          style={{
            padding: "8px 16px",
            marginRight: "8px",
            background: weekOffset === 0 ? "#2196F3" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          今週
        </button>
        <button
          onClick={() => handleWeekChange(-1)}
          style={{
            padding: "8px 16px",
            background: weekOffset === -1 ? "#2196F3" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          先週
        </button>
      </div>

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
        <h2 style={{ margin: "0 0 8px" }}>
          {weekOffset === 0 ? "今週" : "先週"}の確定シフト
        </h2>
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
