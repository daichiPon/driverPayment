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
import "./AdminShift.css";

const AdminShift = () => {
  const [loading, setLoading] = useState(true);
  const [desiredShifts, setDesiredShifts] = useState([]);
  const [confirmedShifts, setConfirmedShifts] = useState({});
  const [showDesired, setShowDesired] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // ✅ "table" or "card"

  const weekdays = useMemo(()=>["日", "月", "火", "水", "木", "金", "土"],[]);

  const getWeekStart = (date = new Date(), offset = 1) => {
    const day = date.getDay();      // 0=日,1=月,...
    const diff = date.getDate() - day + offset * 7;
    const sunday = new Date(date.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  };

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  }, [weekStart]);

  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const weekStr = weekStart.toISOString();

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
  }, [weekStart,weekdays]);

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
    <div className="admin-shift-container">
      <div className="header">
        <h2>確定シフト設定</h2>
        <p>
          {formatDate(weekStart)}〜{formatDate(weekEnd)}
        </p>
        <p className="sub">左：希望　右：確定（ステータス切替・拠点選択可）</p>
      </div>

      {/* ✅ 表示切替スイッチ */}
      <div className="view-mode-toggle">
        <label>
          <input
            type="radio"
            name="viewMode"
            value="table"
            checked={viewMode === "table"}
            onChange={() => setViewMode("table")}
          />
          テーブル表示
        </label>
        <label>
          <input
            type="radio"
            name="viewMode"
            value="card"
            checked={viewMode === "card"}
            onChange={() => setViewMode("card")}
          />
          全体表示
        </label>
      </div>

      {/* ✅ 希望シフトのON/OFF */}
      <div className="toggle">
        <label>希望シフトを表示</label>
        <input
          type="checkbox"
          checked={showDesired}
          onChange={(e) => setShowDesired(e.target.checked)}
        />
      </div>

      {/* ✅ 表示切替 */}
      {viewMode === "table" ? (
        // ======= テーブル表示 =======
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
      ) : (
        // ======= 全体（カード）表示 =======
        <div className="mobile-list">
          {desiredShifts.map((user) => (
            <div key={user.user_id} className="user-card">
              <h3>{user.display_name}</h3>
              {weekdays.map((day) => {
                const desired = user.shifts?.[day];
                const confirmed = confirmedShifts[user.user_id]?.[day];
                return (
                  <div key={day} className="day-row">
                    <strong>{day}</strong>
                    {showDesired && (
                      <div className="desired">
                        <span
                          className={desired?.status === "〇" ? "ok" : "ng"}
                        >
                          {desired?.status}
                        </span>
                        <small>{desired?.location}</small>
                      </div>
                    )}
                    <div className="confirmed">
                      <button
                        className={
                          confirmed?.status === "〇" ? "ok-btn" : "ng-btn"
                        }
                        onClick={() => toggleStatus(user.user_id, day)}
                      >
                        {confirmed?.status}
                      </button>
                      <select
                        value={confirmed?.location || "日本橋"}
                        onChange={(e) =>
                          handleLocationChange(
                            user.user_id,
                            day,
                            e.target.value
                          )
                        }
                      >
                        <option value="日本橋">日本橋</option>
                        <option value="北新地">北新地</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <button className="save-btn" onClick={handleSave}>
        保存
      </button>
    </div>
  );
};

export default AdminShift;
