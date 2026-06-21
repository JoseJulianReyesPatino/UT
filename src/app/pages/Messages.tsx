import React from "react";
import { useAuth } from "../context/AuthContext";
import { MessagesAdmin } from "./messages/MessagesAdmin";
import { MessagesTeacher } from "./messages/MessagesTeacher";

export function Messages(props: Readonly<{
  initialOpen?: { conversationId?: number; recipientName?: string; recipientRole?: string; document?: { id: number; title: string; filePath?: string } } | null;
  onConsume?: () => void;
}> = {}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "administrador" || user?.roles?.includes("administrador");

  if (isAdmin) {
    return <MessagesAdmin {...props} />;
  }

  return <MessagesTeacher {...props} />;
}
