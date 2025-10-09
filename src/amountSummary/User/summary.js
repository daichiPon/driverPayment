import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../../firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";

function Summary() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState([]);

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

  // Firestore からデータ取得
useEffect(() => {
  if (!profile) return;

  const fetchAllData = async () => {
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
          ...d,
          created_at: d.created_at instanceof Timestamp 
            ? d.created_at.toDate()          // Firestore Timestampの場合
            : new Date(d.created_at.seconds * 1000), // JSONオブジェクトの場合
        };
      });

      console.log(JSON.stringify(data));
      setAllPayments(data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchAllData();
}, [profile]);

  // テーブルをDOMに直接生成する関数
  useEffect(() => {
    if (allPayments.length === 0) return;

    const container = document.getElementById("table-container");
    if (!container) return;

    // 既存のテーブルをクリア
    container.innerHTML = "";
    //　横のスペース確保
    container.style.paddingLeft = "16px";
    container.style.paddingRight = "16px";
    // <table> と <tbody> 作成
    const tbl = document.createElement("table");
    const tblBody = document.createElement("tbody");
    // 枠線などのスタイル
    tbl.style.border = "2px solid #555";
    tbl.style.borderCollapse = "collapse";
    tbl.style.width = "100%";

    // ヘッダー行作成
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

    // データ行を追加
    allPayments.forEach((p) => {
      const row = document.createElement("tr");
      const rowData = [
        new Date(p.created_at).toLocaleDateString(),
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

    tbl.appendChild(tblBody);
    container.appendChild(tbl);
  }, [allPayments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>LINE情報を取得中です...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-green-500 text-white py-4 text-center font-semibold shadow-md">
        ドライバー精算履歴
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {profile && (
          <p className="text-center text-gray-600 mb-6">
            ようこそ{" "}
            <span className="font-semibold">{profile.displayName}</span> さん
          </p>
        )}

        <div
          id="table-container"
          className="bg-white rounded-lg shadow-md w-full max-w-md p-4"
        >
        </div>
      </main>
    </div>
  );
}

export default Summary;
