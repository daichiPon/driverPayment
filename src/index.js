import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import Summary from "./amountSummary/User/summary";
import AdminSummary from "./amountSummary/admin/adminSummary";
import ShiftInput from "./shiftManagement/shiftInput";
import ConfirmShift from "./shiftManagement/confirmShift";
import UserData from "./amountSummary/admin/userData";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/Summary" element={<Summary />} />
        <Route path="/AdminSummary" element={<AdminSummary />} />
        <Route path="/userData" element={<UserData />} />
        <Route path="/ShiftInput" element={<ShiftInput />} />
        <Route path="/ConfirmShift" element={<ConfirmShift />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
