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
  updateDoc,
  doc,
} from "firebase/firestore";

function UserData() {
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "user")); // ← user テーブル
        const querySnapshot = await getDocs(q);

        const users = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          // created_at が Timestamp の場合は Date に変換
          created_at:
            doc.data().created_at instanceof Timestamp
              ? doc.data().created_at.toDate()
              : doc.data().created_at ?? null,
        }));

        setAllPayments(users); // 変数名はそのままでもOK
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
  }, []);

  const handleAmountChange = (index, value) => {
    setAllPayments((prev) => {
      const copy = [...prev];
      copy[index].amount = Number(value);
      return copy;
    });
  };

  const saveAmounts = async () => {
    for (const user of allPayments) {
      const userRef = doc(db, "user", user.id);
      await updateDoc(userRef, { amount: user.amount || 0 });
    }
    alert("保存完了しました");
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
          id="table-container"
          className="bg-white rounded-lg shadow-md w-full max-w-md p-4"
        >
          <table className="w-full border-collapse border border-gray-500">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">名前</th>
                <th className="border border-gray-300 p-2">日当</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.map((user, index) => (
                <tr key={user.id}>
                  <td className="border border-gray-300 p-2">
                    {user.display_name}
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="number"
                      value={user.amount}
                      onChange={(e) =>
                        handleAmountChange(index, e.target.value)
                      }
                      className="border p-1 w-full text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={saveAmounts}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            保存
          </button>
        </div>
        {/* テスト */}
      </main>
    </div>
  );
}

export default UserData;
