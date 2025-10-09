import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import Summary from "./amountSummary/User/summary";
import AdminSummary from "./amountSummary/admin/adminSummary";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/Summary" element={<Summary />} />
        <Route path="/AdminSummary" element={<AdminSummary />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
