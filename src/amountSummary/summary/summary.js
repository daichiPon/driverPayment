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
} from "firebase/firestore";

export default function Summary({
  overrideUserId = null,
  displayName = "",
  isAdminView = false,
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payments, setPayments] = useState([]);

  // 📆 週範囲計算
  const getWeekRange = (weeksAgo = 0) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() - weeksAgo * 7);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { startOfWeek, endOfWeek };
  };

  // 🟩 LIFF 初期化
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

  // 🔄 月データ取得
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
        setAllPayments(data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchWeekData = async () => {
      const { startOfWeek, endOfWeek } = getWeekRange(0);
      const { startOfWeek: lastStart, endOfWeek: lastEnd } = getWeekRange(1);

      try {
        const q = query(
          collection(db, "driver_payments"),
          where("user_id", "==", overrideUserId || profile.userId),
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

        // --- 不完全データを除外 ---
        const filtered = data.filter(
          (d) =>
            d.mileage !== undefined &&
            d.highway_fee !== undefined &&
            d.hour !== undefined &&
            d.amount !== undefined
        );

        const lastWeek = filtered.filter(
          (d) => d.created_at >= lastStart && d.created_at <= lastEnd
        );

        // 🔽 今週・先週以外のデータ（＝過去データ）
        const others = filtered.filter(
          (d) => d.created_at < lastStart || d.created_at > endOfWeek
        );

        // --- 今日に最も近いデータを取得（今週・先週以外） ---
        const today = new Date();
        const nearest = others.length
          ? others.reduce((prev, curr) => {
              const diffPrev = Math.abs(prev.created_at - today);
              const diffCurr = Math.abs(curr.created_at - today);
              return diffCurr < diffPrev ? curr : prev;
            })
          : null;

        // --- 条件分岐 ---
        let combined = [];

        if (lastWeek.length <= 1) {
          // ✅ 先週が1件または0件のとき
          combined = [...(nearest ? [{ ...nearest, week: "その他" }] : [])];
        } else {
          // ✅ 先週が2件以上のとき
          const lastWeekExcludingLast = lastWeek.slice(0, -1); // 最後の1日を除く
          combined = [
            ...lastWeekExcludingLast.map((d) => ({ ...d, week: "先週" })),
            ...(nearest ? [{ ...nearest, week: "その他" }] : []),
          ];
        }

        setPayments(combined);
      } catch (err) {
        console.error(err);
      }
    };

    fetchWeekData();
    fetchMonthData();
  }, [profile, currentMonth]);

  // 📅 月切替
  const prevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  const nextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <p>LINE情報を取得中です...</p>
      </div>
    );
  }

  // 🎨 共通スタイル
  const containerStyle = {
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const cardStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "16px",
    width: "100%",
    maxWidth: "600px",
    overflowX: "auto",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  };

  const thStyle = {
    borderBottom: "2px solid #ccc",
    padding: "10px 6px",
    backgroundColor: "#f3f4f6",
    fontWeight: "bold",
    textAlign: "center",
  };

  const tdStyle = {
    borderBottom: "1px solid #eee",
    padding: "8px 4px",
    textAlign: "center",
  };

  const buttonStyle = {
    backgroundColor: "#e5e7eb",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    margin: "0 8px",
    cursor: "pointer",
  };

  const headerText = {
    fontWeight: "bold",
    color: "#333",
    marginBottom: "12px",
    fontSize: "16px",
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      {/* 📊 週次テーブル */}
      <div style={cardStyle}>
        <p style={headerText}>週別精算データ</p>
        <table style={tableStyle}>
          <thead>
            <tr>
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

      {/* 📅 月次データ */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <p style={headerText}>
          {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}
          月の精算一覧
        </p>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <button style={buttonStyle} onClick={prevMonth}>
            ◀ 前月
          </button>
          <button style={buttonStyle} onClick={nextMonth}>
            次月 ▶
          </button>
        </div>

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>日付</th>
              <th style={thStyle}>走行距離</th>
              <th style={thStyle}>高速料金</th>
              <th style={thStyle}>遅刻時間</th>
              <th style={thStyle}>精算額</th>
            </tr>
          </thead>
          <tbody>
            {allPayments.length > 0 ? (
              allPayments.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.created_at.toLocaleDateString()}</td>
                  <td style={tdStyle}>{p.mileage} km</td>
                  <td style={tdStyle}>{p.highway_fee} 円</td>
                  <td style={tdStyle}>{p.hour} h</td>
                  <td style={tdStyle}>{p.amount} 円</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, color: "#999" }}>
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
