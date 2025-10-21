import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  startAt,
  endAt,
} from "firebase/firestore";

function Summary({
  overrideUserId = null,
  displayName = "",
  isAdminView = false,
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payments, setPayments] = useState([]);

  const getWeekRange = (weeksAgo = 0) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() - weeksAgo * 7); // 日曜始まり
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { startOfWeek, endOfWeek };
  };

  // LIFF初期化
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

  // 指定月のデータ取得
  useEffect(() => {
    if (!profile && !overrideUserId) return;

    const fetchMonthData = async () => {
      const start = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const end = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      try {
        const q = query(
          collection(db, "driver_payments"),
          where("user_id", "==", overrideUserId || profile.userId),
          where("created_at", ">=", start),
          where("created_at", "<=", end),
          orderBy("created_at", "asc")
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            created_at:
              d.created_at instanceof Timestamp
                ? d.created_at.toDate()
                : new Date(d.created_at.seconds * 1000),
          };
        });
        console.log("data", JSON.stringify(data));

        setAllPayments(data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchWeekData = async () => {
      const { startOfWeek, endOfWeek } = getWeekRange(0); // 今週
      const { startOfWeek: lastStart, endOfWeek: lastEnd } = getWeekRange(1); // 先週

      try {
        const q = query(
          collection(db, "driver_payments"),
          where("user_id", "==", profile.userId),
          orderBy("created_at", "asc")
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            mileage: d.mileage,
            highway_fee: d.highway_fee,
            hour: d.hour,
            amount: d.amount,
            created_at:
              d.created_at instanceof Timestamp
                ? d.created_at.toDate()
                : new Date(d.created_at.seconds * 1000),
          };
        });

        // 🔹 欠けてるデータは除外
        const filtered = data.filter(
          (d) =>
            d.mileage !== undefined &&
            d.highway_fee !== undefined &&
            d.hour !== undefined &&
            d.amount !== undefined
        );

        // 🔹 今週と先週をそれぞれ抽出
        const thisWeek = filtered.filter(
          (d) => d.created_at >= startOfWeek && d.created_at <= endOfWeek
        );
        const lastWeek = filtered.filter(
          (d) => d.created_at >= lastStart && d.created_at <= lastEnd
        );

        // 🔹 条件処理
        const thisWeekResult =
          thisWeek.length >= 2 ? thisWeek.slice(0, -1) : thisWeek;
        const lastWeekResult =
          lastWeek.length > 0 ? [lastWeek[lastWeek.length - 1]] : [];

        // 🔹 一つにまとめて表示
        const combined = [
          ...thisWeekResult.map((d) => ({ ...d, week: "今週" })),
          ...lastWeekResult.map((d) => ({ ...d, week: "先週" })),
        ];

        setPayments(combined);
      } catch (err) {
        console.error(err);
      }
    };

    fetchWeekData();

    fetchMonthData();
  }, [profile, currentMonth]);

  // DOM生成
  useEffect(() => {
    const container = document.getElementById("table-container");
    if (!container) return;
    container.innerHTML = "";
    container.style.paddingLeft = "16px";
    container.style.paddingRight = "16px";

    const tbl = document.createElement("table");
    const tblBody = document.createElement("tbody");
    tbl.style.border = "2px solid #555";
    tbl.style.borderCollapse = "collapse";
    tbl.style.width = "100%";

    // ヘッダー
    const header = document.createElement("tr");
    ["日付", "走行距離", "高速料金", "遅刻時間", "精算額"].forEach((head) => {
      const th = document.createElement("th");
      th.textContent = head;
      th.style.border = "1px solid #999";
      th.style.padding = "8px";
      th.style.backgroundColor = "#eee";
      header.appendChild(th);
    });
    tblBody.appendChild(header);

    // データ
    if (allPayments.length > 0) {
      allPayments.forEach((p) => {
        const row = document.createElement("tr");
        const rowData = [
          p.created_at.toLocaleDateString(),
          `${p.mileage} km`,
          `${p.highway_fee} 円`,
          `${p.hour} h`,
          `${p.amount} 円`,
        ];

        rowData.forEach((text) => {
          const cell = document.createElement("td");
          cell.textContent = text;
          cell.style.border = "1px solid #ccc";
          cell.style.padding = "6px";
          cell.style.textAlign = "center";
          row.appendChild(cell);
        });

        tblBody.appendChild(row);
      });
    } else {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.textContent = "データがありません";
      cell.colSpan = 5;
      cell.style.textAlign = "center";
      cell.style.padding = "6px";
      row.appendChild(cell);
      tblBody.appendChild(row);
    }

    tbl.appendChild(tblBody);
    container.appendChild(tbl);
  }, [allPayments]);

  // 月切替
  const prevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  const nextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );

  const thStyle = {
    border: "1px solid #ccc",
    padding: "8px",
    fontWeight: "bold",
    color: "#333",
  };

  const tdStyle = {
    border: "1px solid #ddd",
    padding: "8px",
    color: "#555",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>LINE情報を取得中です...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {profile && (
          <p className="text-center text-gray-600 mb-4">
            ようこそ{" "}
            <span className="font-semibold">{profile.displayName}</span> さん
          </p>
        )}
        <div
          style={{
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            padding: "16px",
            width: "100%",
            maxWidth: "600px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#e5e7eb" }}>
                <th style={thStyle}>週</th>
                <th style={thStyle}>日付</th>
                <th style={thStyle}>走行距離</th>
                <th style={thStyle}>高速料金</th>
                <th style={thStyle}>遅刻時間</th>
                <th style={thStyle}>精算額</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{p.week}</td>
                    <td style={tdStyle}>{p.created_at.toLocaleDateString()}</td>
                    <td style={tdStyle}>{p.mileage} km</td>
                    <td style={tdStyle}>{p.highway_fee} 円</td>
                    <td style={tdStyle}>{p.hour} h</td>
                    <td style={tdStyle}>{p.amount} 円</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, color: "#999" }}>
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: 20, paddingLeft: 16 }}>
          <button onClick={prevMonth} className="px-2 py-1 bg-gray-300 rounded">
            前月
          </button>
          <span>
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </span>
          <button onClick={nextMonth} className="px-2 py-1 bg-gray-300 rounded">
            次月
          </button>
        </div>

        <div
          id="table-container"
          className="bg-white rounded-lg shadow-md w-full max-w-md p-4"
        ></div>
        {/* テスト */}
      </main>
    </div>
  );
}

export default Summary;
