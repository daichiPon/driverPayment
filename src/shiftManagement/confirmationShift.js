import React, { useEffect, useState, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, getDocs, where, Timestamp } from "firebase/firestore";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

const ConfirmShiftView = () => {
  const [loading, setLoading] = useState(true);
  const [confirmedShifts, setConfirmedShifts] = useState([]);
  const [weekStart, setWeekStart] = useState(null);
  const [weekEnd, setWeekEnd] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [users, setUsers] = useState([]);

  console.log('user',JSON.stringify(users))

  const getWeekStart = useCallback((date = new Date(), offset = 0) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + offset * 7;
    const sunday = new Date(d.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  }, []);

  const getWeekEnd = useCallback(
    (date = new Date(), offset = 0) => {
      const sunday = getWeekStart(date, offset);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      return saturday;
    },
    [getWeekStart]
  );

  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

  const fetchConfirmed = useCallback(
    async (offset) => {
      setLoading(true);
      try {
        const ws = getWeekStart(new Date(), offset);
        const weekStr = ws.toISOString();

        const q = query(
          collection(db, "confirmed_shift"),
          where("week", "==", weekStr)
        );
        const snapshot = await getDocs(q);

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
    },
    [getWeekEnd, getWeekStart]
  );

  useEffect(() => {
    fetchConfirmed(weekOffset);
  }, [weekOffset, fetchConfirmed]);

    // 🔹 Firestoreからuser一覧を取得
    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const q = collection(db, "user");
          const querySnapshot = await getDocs(q);
          const data = querySnapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
            created_at:
              docItem.data().created_at instanceof Timestamp
                ? docItem.data().created_at.toDate()
                : docItem.data().created_at ?? null,
          }));
          setUsers(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchUsers();
    }, []);

  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);

  const handleDateSelect = (e) => {
    const selectedDate = new Date(e.target.value);
    const selectedSunday = getWeekStart(selectedDate, 0);
    const currentSunday = getWeekStart(new Date(), 0);
    const diffDays = Math.floor((selectedSunday - currentSunday) / (1000 * 60 * 60 * 24));
    setWeekOffset(Math.floor(diffDays / 7));
  };

  if (loading) return <p style={{ textAlign: "center" }}>読み込み中...</p>;

  return (
    <div style={{ padding: "16px", fontFamily: "sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      {/* 週切替 */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <button
          onClick={handlePrevWeek}
          style={{
            padding: "8px 16px",
            marginRight: "8px",
            background: "#ccc",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          前週
        </button>
        <button
          onClick={handleNextWeek}
          style={{
            padding: "8px 16px",
            marginRight: "16px",
            background: "#ccc",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          次週
        </button>

        <input type="date" onChange={handleDateSelect} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ccc" }} />
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
        <h2>{formatDate(weekStart)}〜{formatDate(weekEnd)} の確定シフト</h2>
      </div>

      {/* シフトテーブル */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
          <thead style={{ background: "#88949e", color: "white" }}>
            <tr>
              <th style={{ padding: "8px" }}>ユーザー</th>
              {weekdays.map((day) => (
                <th key={day} style={{ padding: "8px" }}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {confirmedShifts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "16px", textAlign: "center" }}>シフトは登録されていません</td>
              </tr>
            ) : (
              confirmedShifts.map((user) => (
                <tr key={user.user_id}>
                  <td style={{ padding: "8px", fontWeight: "bold", background: "#f0f2f5", textAlign: "center", whiteSpace: "nowrap" }}>
                    {(() => {
                      const foundUser = users.find((u) => u.user_id === user.user_id);
                      return foundUser?.display_name ?? user.display_name ?? user.user_id;
                    })()}
                  </td>
                  {weekdays.map((day) => {
                    const shift = user.shifts?.[day];
                    const status = shift?.status || "×";
                    const location = shift?.location || "";
                    return (
                      <td
                        key={day}
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          background: status === "〇" ? "#4CAF50" : "#f44336",
                          color: "white",
                          fontWeight: "bold",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                          fontSize: "0.9rem",
                        }}
                      >
                        {status} <br />
                          {status === "〇" ? (
                              <span style={{ fontWeight: "normal", fontSize: "0.8rem" }}>
                                {location}
                              </span>
                            ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConfirmShiftView;
