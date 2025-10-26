import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import Summary from "./amountSummary/summary/summary";
import AdminSummary from "./amountSummary/summary/adminSummary";
import ShiftInput from "./shiftManagement/shiftInput";
import AdminShift from "./shiftManagement/adminShift";
import ConfirmShiftView from "./shiftManagement/confirmationShift";
import UserData from "./amountSummary/User/userData";
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
        <Route path="/AdminShift" element={<AdminShift />} />
        <Route path="/ConfirmShift" element={<ConfirmShiftView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
