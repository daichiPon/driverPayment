import React from "react";
import { Navigate } from "react-router-dom";

// allowedUserId: 特定ユーザーのID
// currentUserId: 現在ログイン中のユーザーID
// defaultElement: 通常表示するコンポーネント
// redirectElement: 特定ユーザーが見るコンポーネント
function ProtectedRedirect({
  allowedUserId,
  currentUserId,
  defaultElement,
  redirectElement,
}) {
  if (currentUserId === allowedUserId) {
    return redirectElement;
  } else {
    return defaultElement;
  }
}

export default ProtectedRedirect;
