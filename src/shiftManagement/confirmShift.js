import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";

const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

const ConfirmShift = () => {
  const [loading, setLoading] = useState(true);
  const [desiredShifts, setDesiredShifts] = useState([]);
  const [confirmedShifts, setConfirmedShifts] = useState({});

  const getWeekStart = (date = new Date(), offset = 1) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const weekStr = weekStart.toISOString();

        // 希望シフト
        const desiredQuery = query(
          collection(db, "desired_shift"),
          where("week", "==", weekStr)
        );
        const desiredSnapshot = await getDocs(desiredQuery);
        const desiredData = [];
        desiredSnapshot.forEach((doc) => {
          desiredData.push({ id: doc.id, ...doc.data() });
        });
        setDesiredShifts(desiredData);

        // 確定シフト
        const confirmedQuery = query(
          collection(db, "confirmed_shift"),
          where("week", "==", weekStr)
        );
        const confirmedSnapshot = await getDocs(confirmedQuery);
        const confirmedData = {};
        confirmedSnapshot.forEach((doc) => {
          const data = doc.data();
          confirmedData[data.user_id] = {};
          weekdays.forEach((day) => {
            confirmedData[data.user_id][day] = data[day] || "×";
          });
        });

        // 存在しない場合は希望を初期値としてコピー
        desiredData.forEach((u) => {
          if (!confirmedData[u.user_id]) {
            confirmedData[u.user_id] = {};
            weekdays.forEach((day) => {
              confirmedData[u.user_id][day] = u[day] || "×";
            });
          }
        });

        setConfirmedShifts(confirmedData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, []);

  const handleChange = (userId, day) => {
    setConfirmedShifts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [day]: prev[userId][day] === "〇" ? "×" : "〇",
      },
    }));
  };

  const handleSave = async () => {
    try {
      const weekStr = weekStart.toISOString();

      for (const user of desiredShifts) {
        const userId = user.user_id;
        const payload = {
          user_id: userId,
          display_name: user.display_name || "",
          week: weekStr,
          ...confirmedShifts[userId],
          updated_at: Timestamp.now(),
        };

        const q = query(
          collection(db, "confirmed_shift"),
          where("user_id", "==", userId),
          where("week", "==", weekStr)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          await updateDoc(snapshot.docs[0].ref, payload);
        } else {
          await addDoc(collection(db, "confirmed_shift"), payload);
        }
      }
      alert("確定シフトを保存しました！");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
  };

  if (loading) return <p>読み込み中...</p>;

  return (
    <div
      style={{
        padding: "16px",
        fontFamily: "sans-serif",
        background: "#f9fafb",
        minHeight: "100vh",
      }}
    >
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
        <h2 style={{ margin: "0 0 8px" }}>確定シフト設定</h2>
        <p style={{ color: "#555", margin: 0 }}>
          {formatDate(weekStart)}〜{formatDate(weekEnd)}
        </p>
        <p style={{ fontSize: "13px", color: "#888" }}>
          左：希望　右：確定（タップで切替）
        </p>
      </div>

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
          <thead style={{ background: "#88949eff", color: "white" }}>
            <tr>
              <th style={{ padding: "8px", whiteSpace: "nowrap" }}>ユーザー</th>
              {weekdays.map((day) => (
                <th key={day} colSpan={2} style={{ padding: "8px" }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {desiredShifts.map((user) => (
              <tr key={user.user_id}>
                <td
                  style={{
                    padding: "8px",
                    fontWeight: "bold",
                    background: "#f0f2f5",
                    textAlign: "center",
                  }}
                >
                  {user.display_name || user.user_id}
                </td>
                {weekdays.map((day) => (
                  <React.Fragment key={day}>
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        background: "#f9f9f9",
                        color: user[day] === "〇" ? "#4CAF50" : "#f44336",
                        fontWeight: "bold",
                      }}
                    >
                      {user[day] || "×"}
                    </td>
                    <td
                      onClick={() => handleChange(user.user_id, day)}
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        cursor: "pointer",
                        background:
                          confirmedShifts[user.user_id][day] === "〇"
                            ? "#4CAF50"
                            : "#f44336",
                        color: "white",
                        borderRadius: "4px",
                        transition: "0.2s",
                        fontWeight: "bold",
                      }}
                    >
                      {confirmedShifts[user.user_id][day]}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
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
        保存
      </button>
    </div>
  );
};

export default ConfirmShift;
