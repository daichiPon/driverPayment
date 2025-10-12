import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    mileage: "",
    highwayFee: 0,
    hour: 0,
    amount: 0,
  });
  const [isUpdate, setIsUpdate] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [user, setUser] = useState(null);
  const navigator = useNavigate();

  // LIFF初期化 & プロフィール取得
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

  // 今日のデータ取得
  useEffect(() => {
    if (!profile) return;

    const fetchTodayData = async () => {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0
      );
      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59
      );

      const q = query(
        collection(db, "driver_payments"),
        where("user_id", "==", profile.userId),
        where("created_at", ">=", Timestamp.fromDate(start)),
        where("created_at", "<=", Timestamp.fromDate(end))
      );

      const u = query(
        collection(db, "user"),
        where("user_id", "==", profile.userId)
      );

      const docsDriverPayment = await getDocs(q);
      const docsUser = await getDocs(u);
      const resUser = docsUser.docs[0].data();
      setUser(resUser);

      if (!docsDriverPayment.empty) {
        const resDriverPayment = docsDriverPayment.docs[0];
        const data = resDriverPayment.data();
        setFormData({
          mileage: data.mileage,
          highwayFee: data.highway_fee,
          hour: data.hour,
        });
        setRecordId(resDriverPayment.id);
        setIsUpdate(true);
      }
    };

    fetchTodayData();
  }, [profile]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) return;

    const perHour = user.amount / 5;
    const mileageFee = Math.floor(formData.mileage / 7) * 100;
    formData.amount =
      mileageFee +
      Number(formData.highwayFee) +
      user.amount +
      Number(formData.hour) * perHour;

    const payload = {
      user_id: profile.userId,
      display_name: profile.displayName,
      mileage: formData.mileage,
      highway_fee: formData.highwayFee,
      hour: formData.hour || 0,
      amount: formData.amount,
      created_at: Timestamp.now(),
    };

    if (!user) {
      await addDoc(collection(db, "user"), {
        display_name: profile.displayName,
        user_id: profile.userId,
      });
    }

    try {
      if (isUpdate && recordId) {
        await updateDoc(doc(db, "driver_payments", recordId), payload);
      } else {
        await addDoc(collection(db, "driver_payments"), payload);
      }
      setSaved(true);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
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
      <header
        style={{
          backgroundColor: "#28a745",
          color: "#fff",
          padding: "16px 0",
          textAlign: "center",
          fontWeight: "bold",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        終了報告
      </header>

      <main
        style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}
      >
        <div style={{ maxWidth: "500px", width: "100%" }}>
          {profile && (
            <p
              style={{
                textAlign: "center",
                marginBottom: "24px",
                fontSize: "16px",
                color: "#555",
              }}
            >
              ようこそ{" "}
              <span style={{ fontWeight: "bold" }}>{profile.displayName}</span>{" "}
              さん
            </p>
          )}

          {saved ? (
            <div
              style={{
                backgroundColor: "#d4edda",
                padding: "16px",
                borderRadius: "8px",
                textAlign: "center",
                color: "#155724",
                fontWeight: "bold",
              }}
            >
              保存完了しました！
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                backgroundColor: "#fff",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  走行距離 (km)
                </label>
                <input
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  placeholder="例: 70"
                  required
                  style={{
                    width: "95%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  高速料金 (円)
                </label>
                <input
                  type="number"
                  name="highwayFee"
                  value={formData.highwayFee}
                  onChange={handleChange}
                  placeholder="例: 1950"
                  required
                  style={{
                    width: "95%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  増減時間 (時)
                </label>
                <input
                  type="number"
                  name="hour"
                  value={formData.hour}
                  onChange={handleChange}
                  placeholder="例: 1"
                  style={{
                    width: "95%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ textAlign: "right" }}>
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#28a745",
                    color: "#fff",
                    fontWeight: "bold",
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#218838")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#28a745")
                  }
                >
                  {isUpdate ? "更新" : "保存"}
                </button>
              </div>
            </form>
          )}

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              justifyContent: "space-around",
            }}
          >
            <button
              onClick={() => navigator("/Summary")}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              集計ページ
            </button>
            <button
              onClick={() => navigator("/AdminSummary")}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              管理者用集計ページ
            </button>
            <button
              onClick={() => navigator("/UserData")}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              ユーザ
            </button>
            <button
              onClick={() => navigator("/ShiftInput")}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              シフト
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
