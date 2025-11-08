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

const weekdays = ["全曜日", "月", "火", "水", "木", "金", "土", "日"];

const AdminShift = () => {
  const [loading, setLoading] = useState(true);
  const [desiredShifts, setDesiredShifts] = useState([]);
  const [confirmedShifts, setConfirmedShifts] = useState({});
  const [selectedDay, setSelectedDay] = useState("全曜日");
  const [showDesired, setShowDesired] = useState(true); // ← 希望を表示するか

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
          ["月", "火", "水", "木", "金", "土", "日"].forEach((day) => {
            confirmedData[data.user_id][day] = data[day] || "×";
          });
        });

        // 存在しない場合は希望を初期値としてコピー
        desiredData.forEach((u) => {
          if (!confirmedData[u.user_id]) {
            confirmedData[u.user_id] = {};
            ["月", "火", "水", "木", "金", "土", "日"].forEach((day) => {
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

      const now = new Date();
      const threeMonthsLater = new Date(now);
      threeMonthsLater.setMonth(now.getMonth() + 3);

      for (const user of desiredShifts) {
        const userId = user.user_id;
        const payload = {
          user_id: userId,
          display_name: user.display_name || "",
          week: weekStr,
          ...confirmedShifts[userId],
          updated_at: Timestamp.now(),
          expireAt: threeMonthsLater,
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
        <h2 style={{ margin: "0 0 8px" }}>確定シフト設定</h2>
        <p style={{ color: "#555", margin: 0 }}>
          {formatDate(weekStart)}〜{formatDate(weekEnd)}
        </p>
        <p style={{ fontSize: "13px", color: "#888" }}>
          左：希望　右：確定（タップで切替）
        </p>
      </div>

      {/* 曜日タブ */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          marginBottom: "12px",
          gap: "8px",
        }}
      >
        {weekdays.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              flex: "0 0 auto",
              padding: "8px 16px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              background: selectedDay === day ? "#2196F3" : "rgba(0,0,0,0.1)",
              color: selectedDay === day ? "white" : "#333",
              fontWeight: "bold",
              transition: "0.2s",
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* 全曜日トグル */}
      {selectedDay === "全曜日" && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <label style={{ fontWeight: "bold", fontSize: "14px" }}>
            希望シフトを表示
          </label>
          <input
            type="checkbox"
            checked={showDesired}
            onChange={(e) => setShowDesired(e.target.checked)}
            style={{ transform: "scale(1.2)" }}
          />
        </div>
      )}

      {/* テーブル表示 */}
      {selectedDay === "全曜日" ? (
        // 🗓 全曜日表示
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
                {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
                  <th
                    key={day}
                    colSpan={showDesired ? 2 : 1}
                    style={{ padding: "8px" }}
                  >
                    {day}
                  </th>
                ))}
              </tr>
              {showDesired && (
                <tr style={{ background: "#a1a8b3", color: "white" }}>
                  <th></th>
                  {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
                    <React.Fragment key={day}>
                      <th style={{ fontSize: "12px" }}>希望</th>
                      <th style={{ fontSize: "12px" }}>確定</th>
                    </React.Fragment>
                  ))}
                </tr>
              )}
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
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.display_name || user.user_id}
                  </td>
                  {["月", "火", "水", "木", "金", "土", "日"].map((day) =>
                    showDesired ? (
                      <React.Fragment key={day}>
                        <td
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            color: user[day] === "〇" ? "#4CAF50" : "#f44336",
                            fontWeight: "bold",
                          }}
                        >
                          {user[day] || "×"}
                        </td>
                        <td
                          onClick={() => handleChange(user.user_id, day)}
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            cursor: "pointer",
                            background:
                              confirmedShifts[user.user_id]?.[day] === "〇"
                                ? "#4CAF50"
                                : "#f44336",
                            color: "white",
                            borderRadius: "4px",
                            transition: "0.2s",
                            fontWeight: "bold",
                          }}
                        >
                          {confirmedShifts[user.user_id]?.[day] || "×"}
                        </td>
                      </React.Fragment>
                    ) : (
                      <td
                        key={day}
                        onClick={() => handleChange(user.user_id, day)}
                        style={{
                          padding: "6px",
                          textAlign: "center",
                          cursor: "pointer",
                          background:
                            confirmedShifts[user.user_id]?.[day] === "〇"
                              ? "#4CAF50"
                              : "#f44336",
                          color: "white",
                          borderRadius: "4px",
                          transition: "0.2s",
                          fontWeight: "bold",
                        }}
                      >
                        {confirmedShifts[user.user_id]?.[day] || "×"}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // 📅 単一曜日表示
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
              <th style={{ padding: "8px" }}>希望</th>
              <th style={{ padding: "8px" }}>確定</th>
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
                <td
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    color: user[selectedDay] === "〇" ? "#4CAF50" : "#f44336",
                    fontWeight: "bold",
                  }}
                >
                  {user[selectedDay] || "×"}
                </td>
                <td
                  onClick={() => handleChange(user.user_id, selectedDay)}
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    cursor: "pointer",
                    background:
                      confirmedShifts[user.user_id]?.[selectedDay] === "〇"
                        ? "#4CAF50"
                        : "#f44336",
                    color: "white",
                    borderRadius: "4px",
                    transition: "0.2s",
                    fontWeight: "bold",
                  }}
                >
                  {confirmedShifts[user.user_id]?.[selectedDay] || "×"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 保存ボタン */}
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

export default AdminShift;
