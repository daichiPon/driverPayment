import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import Summary from "../User/summary"; // 既存のSummaryを再利用（少し改修が必要）

function AdminSummary() {
  const [drivers, setDrivers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // ドライバー一覧を取得
  useEffect(() => {
    const fetchDrivers = async () => {
      const snapshot = await getDocs(collection(db, "driver_payments"));
      const all = snapshot.docs.map((doc) => doc.data());
      // 重複除去
      const uniqueDrivers = Array.from(
        new Map(
          all.map((d) => [
            d.user_id,
            { user_id: d.user_id, name: d.display_name },
          ])
        ).values()
      );
      setDrivers(uniqueDrivers);
    };
    fetchDrivers();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">管理者：ドライバー一覧</h1>
      <div
        style={{
          display: "flex",
          paddingLift: "8px",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "24px",
          justifyContent: "flex-start",
          paddingLeft: "32px",
        }}
      >
        {drivers.map((driver) => {
          const isSelected = selectedUser?.user_id === driver.user_id;
          return (
            <button
              key={driver.user_id}
              onClick={() => setSelectedUser(driver)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: isSelected ? "#22c55e" : "#fff", // 緑 or 白
                color: isSelected ? "#fff" : "#333",
                cursor: "pointer",
                transition: "background-color 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.target.style.backgroundColor = "#f2f2f2";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.target.style.backgroundColor = "#fff";
              }}
              onMouseDown={(e) => {
                e.target.style.transform = "scale(0.97)";
              }}
              onMouseUp={(e) => {
                e.target.style.transform = "scale(1)";
              }}
            >
              {driver.name}
            </button>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          paddingLift: "8px",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "24px",
          justifyContent: "flex-start",
          paddingLeft: "32px",
        }}
      >
        {/* 選択されたユーザーのSummary */}
        {selectedUser ? (
          <Summary
            key={selectedUser.user_id}
            overrideUserId={selectedUser.user_id}
            displayName={selectedUser.name}
            isAdminView
          />
        ) : (
          <p className="text-gray-500">ユーザーを選択してください</p>
        )}
      </div>
      {/* ドライバー一覧 */}
    </div>
  );
}

export default AdminSummary;
