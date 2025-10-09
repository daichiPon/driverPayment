import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../../firebase";
import { collection, query, where, getDocs, orderBy, Timestamp, startAt, endAt } from "firebase/firestore";

function Summary({ overrideUserId = null, displayName = "", isAdminView = false }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

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
            created_at: d.created_at instanceof Timestamp
              ? d.created_at.toDate()
              : new Date(d.created_at.seconds * 1000),
          };
        });

        setAllPayments(data);
      } catch (err) {
        console.error(err);
      }
    };

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
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p>LINE情報を取得中です...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {profile && <p className="text-center text-gray-600 mb-4">ようこそ <span className="font-semibold">{profile.displayName}</span> さん</p>}

        <div style={{ marginBottom: 20 ,paddingLeft :16}}>
          <button onClick={prevMonth} className="px-2 py-1 bg-gray-300 rounded">前月</button>
          <span>{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</span>
          <button onClick={nextMonth} className="px-2 py-1 bg-gray-300 rounded">次月</button>
        </div>

        <div id="table-container" className="bg-white rounded-lg shadow-md w-full max-w-md p-4"></div>
        {/* テスト */}

      </main>
    </div>
  );
}

export default Summary;
