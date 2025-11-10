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

const allowedUserId = "U9c71f18a533fe0600a3bd97a02346cc8";

function Root() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

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
