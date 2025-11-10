import React, { useEffect, useState, useMemo } from "react";
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

const AdminShift = () => {
  const [loading, setLoading] = useState(true);
  const [desiredShifts, setDesiredShifts] = useState([]);
  const [confirmedShifts, setConfirmedShifts] = useState({});
  const [showDesired, setShowDesired] = useState(true);

  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

  // 🔹 安定した weekStart を生成
  const getWeekStart = (date = new Date(), offset = 1) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  }, [weekStart]);

  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

  // 🔹 Firestore から希望・確定シフト取得
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
        const desiredData = desiredSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
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
          confirmedData[data.user_id] = data.shifts || {};
        });

        // 存在しない場合は希望を初期値としてコピー
        desiredData.forEach((u) => {
          if (!confirmedData[u.user_id]) {
            confirmedData[u.user_id] = {};
            weekdays.forEach((day) => {
              confirmedData[u.user_id][day] = {
                status: u.shifts?.[day]?.status || "×",
                location: u.shifts?.[day]?.location || "日本橋",
              };
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
  }, [weekStart]);

  // 🔹 status(○×) 切替
  const toggleStatus = (userId, day) => {
    setConfirmedShifts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [day]: {
          ...prev[userId][day],
          status: prev[userId][day].status === "〇" ? "×" : "〇",
        },
      },
    }));
  };

  // 🔹 location(拠点) 変更
  const handleLocationChange = (userId, day, newLocation) => {
    setConfirmedShifts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [day]: {
          ...prev[userId][day],
          location: newLocation,
        },
      },
    }));
  };

  // 🔹 保存処理
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
          shifts: confirmedShifts[userId],
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
          左：希望　右：確定（ステータス切替・拠点選択可）
        </p>
      </div>

      {/* 希望シフトトグル */}
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

      {/* テーブル */}
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
                <th
                  key={day}
                  colSpan={showDesired ? 4 : 2}
                  style={{ padding: "8px" }}
                >
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

                {weekdays.map((day) => {
                  const desired = user.shifts?.[day];
                  const confirmed = confirmedShifts[user.user_id]?.[day];
                  return showDesired ? (
                    <React.Fragment key={day}>
                      {/* 希望 */}
                      <td
                        style={{
                          padding: "6px",
                          textAlign: "center",
                          color:
                            desired?.status === "〇" ? "#4CAF50" : "#f44336",
                          fontWeight: "bold",
                        }}
                      >
                        {desired?.status || "×"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {desired?.location || "-"}
                      </td>

                      {/* 確定（status切替＋location選択） */}
                      <td
                        onClick={() => toggleStatus(user.user_id, day)}
                        style={{
                          padding: "6px",
                          textAlign: "center",
                          cursor: "pointer",
                          background:
                            confirmed?.status === "〇"
                              ? "#4CAF50"
                              : "#f44336",
                          color: "white",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {confirmed?.status || "×"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <select
                          value={confirmed?.location || "日本橋"}
                          onChange={(e) =>
                            handleLocationChange(
                              user.user_id,
                              day,
                              e.target.value
                            )
                          }
                          style={{
                            padding: "4px 6px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                          }}
                        >
                          <option value="日本橋">日本橋</option>
                          <option value="北新地">北新地</option>
                        </select>
                      </td>
                    </React.Fragment>
                  ) : (
                    <React.Fragment key={day}>
                      <td
                        onClick={() => toggleStatus(user.user_id, day)}
                        style={{
                          padding: "6px",
                          textAlign: "center",
                          cursor: "pointer",
                          background:
                            confirmed?.status === "〇"
                              ? "#4CAF50"
                              : "#f44336",
                          color: "white",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {confirmed?.status || "×"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <select
                          value={confirmed?.location || "日本橋"}
                          onChange={(e) =>
                            handleLocationChange(
                              user.user_id,
                              day,
                              e.target.value
                            )
                          }
                          style={{
                            padding: "4px 6px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                          }}
                        >
                          <option value="日本橋">日本橋</option>
                          <option value="北新地">北新地</option>
                        </select>
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
