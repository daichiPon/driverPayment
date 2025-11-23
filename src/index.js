import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import liff from "@line/liff";
import App from "./App";
import Summary from "./amountSummary/summary/summary";
import AdminSummary from "./amountSummary/summary/adminSummary";
import ShiftInput from "./shiftManagement/shiftInput";
import AdminShift from "./shiftManagement/adminShift";
import ConfirmShiftView from "./shiftManagement/confirmationShift";
import UserData from "./amountSummary/User/userData";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const allowedUserId = "U9c71f18a533fe0600a3bd97a02346cc8";

function Root() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function deleteExpiredData() {
    const now = new Date();

    try {
      // expireAtフィールドが「今より前」のデータを検索
      const driverquery = query(
        collection(db, "driver_payments"),
        where("expireAt", "<", now)
      );
      const driver = await getDocs(driverquery);
      const driverDeletes = driver.docs.map((d) =>
        deleteDoc(doc(db, "driver_payments", d.id))
      );

      const desiredquery = query(
        collection(db, "desired_shift"),
        where("expireAt", "<", now)
      );
      const desired = await getDocs(desiredquery);
      const desiredDeletes = desired.docs.map((d) =>
        deleteDoc(doc(db, "desired_shift", d.id))
      );

      const confirmedquery = query(
        collection(db, "confirmed_shift"),
        where("expireAt", "<", now)
      );
      const confirmed = await getDocs(confirmedquery);
      const confirmedDeletes = confirmed.docs.map((d) =>
        deleteDoc(doc(db, "confirmed_shift", d.id))
      );

      await Promise.all(driverDeletes);
      await Promise.all(desiredDeletes);
      await Promise.all(confirmedDeletes);

      console.log(`✅ ${driver.size} 件の期限切れデータを削除しました`);
      console.log(`✅ ${desired.size} 件の期限切れデータを削除しました`);
      console.log(`✅ ${confirmed.size} 件の期限切れデータを削除しました`);
    } catch (error) {
      console.error("❌ 有効期限データ削除エラー:", error);
    }
  }

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: "2008216612-q94xYdNk" });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const profile = await liff.getProfile();
        setCurrentUserId(profile.userId);

        //有効期限切れのデータを削除
        await deleteExpiredData();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initLiff();
  }, []);

  if (loading) {
    return <p>LINE情報取得中...</p>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={currentUserId === allowedUserId ? <UserData /> : <App />}
      />
      <Route
        path="/Summary"
        element={
          currentUserId === allowedUserId ? <AdminSummary /> : <Summary />
        }
      />
      <Route
        path="/ShiftInput"
        element={
          currentUserId === allowedUserId ? <AdminShift /> : <ShiftInput />
        }
      />
      <Route path="/ConfirmShift" element={<ConfirmShiftView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);
