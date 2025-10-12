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

// 曜日リスト
const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

const ConfirmShift = () => {
  const [loading, setLoading] = useState(true);
  const [desiredShifts, setDesiredShifts] = useState([]); // 希望シフト
  const [confirmedShifts, setConfirmedShifts] = useState({}); // 確定シフト

  // 来週の月曜
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

  // 希望シフト＋確定シフトを取得
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
        // 初期値として存在しない場合は希望シフトをコピー
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

  // 確定シフト変更ハンドラ
  const handleChange = (userId, day, value) => {
    setConfirmedShifts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [day]: value },
    }));
  };

  // 保存処理
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
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h2>
        確定シフト設定 ({formatDate(weekStart)}〜{formatDate(weekEnd)})
      </h2>
      <p> 左：希望シフト　右確定シフト</p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>ユーザ</th>
            {weekdays.map((day) => (
              <th
                key={day}
                colSpan={2}
                style={{ border: "1px solid #ccc", padding: "8px" }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {desiredShifts.map((user) => (
            <tr key={user.user_id}>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                {user.display_name || user.user_id}
              </td>
              {weekdays.map((day) => (
                <React.Fragment key={day}>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "8px",
                      textAlign: "center",
                    }}
                  >
                    {user[day] || "×"}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "8px",
                      textAlign: "center",
                    }}
                  >
                    <select
                      value={confirmedShifts[user.user_id][day]}
                      onChange={(e) =>
                        handleChange(user.user_id, day, e.target.value)
                      }
                    >
                      <option value="〇">〇</option>
                      <option value="×">×</option>
                    </select>
                  </td>
                </React.Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        style={{ marginTop: "20px", padding: "10px 20px", cursor: "pointer" }}
        onClick={handleSave}
      >
        保存
      </button>
    </div>
  );
};

export default ConfirmShift;
