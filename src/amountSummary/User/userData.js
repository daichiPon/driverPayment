import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

function UserData() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

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

  // Firestore から user テーブル取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = collection(db, "user");
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
          created_at:
            docItem.data().created_at instanceof Timestamp
              ? docItem.data().created_at.toDate()
              : docItem.data().created_at ?? null,
        }));
        setUsers(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, []);

  // amount 更新
  const handleAmountChange = (index, value) => {
    setUsers((prev) => {
      const copy = [...prev];
      copy[index].amount = value === "" ? "" : Number(value);
      return copy;
    });
  };

  // Firestore 保存
  const saveAmounts = async () => {
    for (const user of users) {
      const userRef = doc(db, "user", user.id);
      await updateDoc(userRef, { amount: user.amount || 0 });
    }
    alert("保存完了しました");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <p>LINE情報を取得中です...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f3f3",
        padding: "16px",
      }}
    >
      {profile && (
        <p
          style={{
            textAlign: "center",
            marginBottom: "24px",
            fontSize: "18px",
            color: "#555",
          }}
        >
          ようこそ{" "}
          <span style={{ fontWeight: "bold" }}>{profile.displayName}</span> さん
        </p>
      )}

      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          padding: "16px",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead
            style={{ backgroundColor: "#f0f0f0", position: "sticky", top: 0 }}
          >
            <tr>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                名前
              </th>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                日当
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr
                key={user.id}
                style={{
                  backgroundColor: "#fff",
                  transition: "background 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f9f9f9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#fff")
                }
              >
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {user.display_name}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    width: "50%",
                  }}
                >
                  <input
                    type="number"
                    value={user.amount}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    placeholder="例: 8000"
                    style={{
                      width: "95%",
                      padding: "4px",
                      textAlign: "center",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    textAlign: "center",
                    padding: "12px",
                    color: "#888",
                  }}
                >
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ textAlign: "right", marginTop: "16px" }}>
          <button
            onClick={saveAmounts}
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#0056b3")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#007bff")
            }
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserData;
