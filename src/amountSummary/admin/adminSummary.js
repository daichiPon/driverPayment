import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
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
        new Map(all.map((d) => [d.user_id, { user_id: d.user_id, name: d.display_name }])).values()
      );
      setDrivers(uniqueDrivers);
    };
    fetchDrivers();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">管理者：ドライバー一覧</h1>

      {/* ドライバー一覧 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {drivers.map((driver) => (
          <button
            key={driver.user_id}
            onClick={() => setSelectedUser(driver)}
            className={`px-3 py-1 rounded border ${
              selectedUser?.user_id === driver.user_id
                ? "bg-green-500 text-white"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            {driver.name}
          </button>
        ))}
      </div>

      {/* 選択されたユーザーのSummary */}
      {selectedUser ? (
        <Summary overrideUserId={selectedUser.user_id} displayName={selectedUser.name} isAdminView />
      ) : (
        <p className="text-gray-500">ユーザーを選択してください。</p>
      )}
    </div>
  );
}

export default AdminSummary;
