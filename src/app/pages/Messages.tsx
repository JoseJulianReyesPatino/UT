import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Textarea } from "../components/ui/textarea";
import { CornerUpLeft, Paperclip, Search, Send, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../context/AuthContext";

type AttachmentItem = {
  name: string;
  sizeLabel: string;
  typeLabel: string;
};

type ChatMessage = {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  attachments?: AttachmentItem[];
  replyTo?: {
    id: number;
    sender: string;
    content: string;
  };
};

type Conversation = {
  id: number;
  name: string;
  role: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar: string;
  status: "online" | "offline" | "away";
  messages: ChatMessage[];
};

const initialConversations: Conversation[] = [
  {
    id: 1,
    name: "Mtra. María González",
    role: "Administrador",
    lastMessage: "Tu documento ha sido aprobado",
    timestamp: "Hace 5 min",
    unread: 2,
    avatar: "MG",
    status: "online",
    messages: [
      { id: 1, sender: "María González", content: "Hola, revisé tu documento de planeación", timestamp: "10:30 AM", isOwn: false },
      { id: 2, sender: "Tú", content: "Gracias por la revisión. ¿Hay algo que deba corregir?", timestamp: "10:32 AM", isOwn: true },
      { id: 3, sender: "María González", content: "Todo está perfecto. Tu documento ha sido aprobado.", timestamp: "10:35 AM", isOwn: false },
      { id: 4, sender: "Tú", content: "Excelente, muchas gracias!", timestamp: "10:36 AM", isOwn: true },
    ],
  },
  {
    id: 2,
    name: "Mtro. Roberto Silva",
    role: "Docente",
    lastMessage: "¿Tienes el formato de planeación?",
    timestamp: "Hace 1 hora",
    unread: 0,
    avatar: "RS",
    status: "away",
    messages: [
      { id: 1, sender: "Mtro. Roberto Silva", content: "¿Tienes el formato de planeación?", timestamp: "9:10 AM", isOwn: false },
      { id: 2, sender: "Tú", content: "Sí, te lo comparto en un momento.", timestamp: "9:12 AM", isOwn: true },
    ],
  },
  {
    id: 3,
    name: "Dra. Ana Martínez",
    role: "Coordinadora",
    lastMessage: "Reunión pendiente",
    timestamp: "Ayer",
    unread: 1,
    avatar: "AM",
    status: "offline",
    messages: [
      { id: 1, sender: "Dra. Ana Martínez", content: "Tenemos reunión pendiente para revisar avances.", timestamp: "Ayer 4:20 PM", isOwn: false },
      { id: 2, sender: "Tú", content: "Claro, quedo atento al horario.", timestamp: "Ayer 4:23 PM", isOwn: true },
    ],
  },
  {
    id: 5,
    name: "Mtro. Juan Pérez",
    role: "Docente",
    lastMessage: "Envié la planeación",
    timestamp: "Hace 3 días",
    unread: 0,
    avatar: "JP",
    status: "online",
    messages: [
      { id: 1, sender: "Mtro. Juan Pérez", content: "Adjunto mi planeación.", timestamp: "Hace 3 días", isOwn: false },
    ],
  },
  {
    id: 6,
    name: "Mtro. Carlos López",
    role: "Docente",
    lastMessage: "Lista concentrada enviada",
    timestamp: "Hace 4 días",
    unread: 0,
    avatar: "CL",
    status: "away",
    messages: [
      { id: 1, sender: "Mtro. Carlos López", content: "Envío la lista concentrada.", timestamp: "Hace 4 días", isOwn: false },
    ],
  },
  {
    id: 7,
    name: "Dra. Laura Gómez",
    role: "Tutor",
    lastMessage: "Ficha técnica subida",
    timestamp: "Hace 5 días",
    unread: 0,
    avatar: "LG",
    status: "online",
    messages: [
      { id: 1, sender: "Dra. Laura Gómez", content: "Subí la ficha técnica.", timestamp: "Hace 5 días", isOwn: false },
    ],
  },
  {
    id: 4,
    name: "Lic. Karla Hernández",
    role: "Administración",
    lastMessage: "Te envié los archivos por aquí",
    timestamp: "Hace 2 días",
    unread: 0,
    avatar: "KH",
    status: "online",
    messages: [
      {
        id: 1,
        sender: "Lic. Karla Hernández",
        content: "Te envié los archivos por aquí.",
        timestamp: "Hace 2 días",
        isOwn: false,
        attachments: [{ name: "formatos.zip", sizeLabel: "2.4 MB", typeLabel: "Archivo comprimido" }],
      },
    ],
  },
];

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getTimeLabel = () =>
  new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

function PendingAttachmentChip({
  attachment,
  index,
  onRemove,
}: Readonly<{
  attachment: AttachmentItem;
  index: number;
  onRemove: (index: number) => void;
}>) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
      <Paperclip className="h-3.5 w-3.5" />
      <span className="max-w-[180px] truncate">{attachment.name}</span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="rounded-full p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
        aria-label={`Eliminar adjunto ${attachment.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function StatusDot({ status }: Readonly<{ status: Conversation["status"] }>) {
  let statusClassName = "bg-slate-400";

  if (status === "online") {
    statusClassName = "bg-emerald-500";
  } else if (status === "away") {
    statusClassName = "bg-amber-500";
  }

  return <span className={cn("h-2 w-2 rounded-full", statusClassName)} />;
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: Readonly<{
  conversation: Conversation;
  active: boolean;
  onSelect: (conversationId: number) => void;
}>) {
  let statusClassName = "bg-slate-400";

  if (conversation.status === "online") {
    statusClassName = "bg-emerald-500";
  } else if (conversation.status === "away") {
    statusClassName = "bg-amber-500";
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "group relative mx-2 my-1 w-[calc(100%-1rem)] overflow-hidden rounded-2xl border text-left transition-all duration-200",
        active
          ? "border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 shadow-[0_8px_24px_rgba(16,185,129,0.12)] ring-1 ring-emerald-200/70 dark:border-emerald-800 dark:from-emerald-950/40 dark:via-slate-950 dark:to-cyan-950/30 dark:ring-emerald-900/60"
          : "border-transparent bg-transparent hover:border-emerald-100 hover:bg-white/90 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600" />}
      <div className="flex items-start gap-3 px-3 py-3.5">
        <div className="relative mt-0.5 shrink-0">
          <Avatar className="h-9 w-9 ring-1 ring-white/70 dark:ring-slate-900/60">
            <AvatarFallback className="bg-success/10 text-success">{conversation.avatar}</AvatarFallback>
          </Avatar>
          <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background", statusClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="truncate text-sm font-semibold text-foreground">{conversation.name}</p>
              <p className="text-[11px] text-muted-foreground">{conversation.role}</p>
            </div>
            {conversation.unread > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[11px]">
                {conversation.unread}
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{conversation.lastMessage}</p>
          <p className="mt-1 text-[11px] text-muted-foreground/90">{conversation.timestamp}</p>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  onReply,
}: Readonly<{ message: ChatMessage; onReply: (message: ChatMessage) => void }>) {
  return (
    <div className={cn("flex", message.isOwn ? "justify-end" : "justify-start")}> 
      <div
        className={cn(
          "max-w-[76%] rounded-[1.4rem] border px-4 py-3 shadow-sm",
          message.isOwn
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/15"
            : "border-border/80 bg-white/95 shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:bg-slate-950/80"
        )}
      >
        {message.replyTo && (
          <div
            className={cn(
              "mb-2 rounded-xl border-l-4 px-3 py-2 text-xs",
              message.isOwn
                ? "border-white/70 bg-white/15 text-white/90"
                : "border-emerald-500/60 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
            )}
          >
            <p className="font-semibold">{message.replyTo.sender}</p>
            <p className="truncate">{message.replyTo.content}</p>
          </div>
        )}
        <p className={cn("text-xs font-medium", message.isOwn ? "text-white/80" : "text-muted-foreground")}>{message.sender}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <div
                key={`${message.id}-${attachment.name}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-sm",
                  message.isOwn ? "border-white/20 bg-white/10" : "border-border/70 bg-muted/40"
                )}
              >
                <Paperclip className={cn("h-4 w-4", message.isOwn ? "text-white" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-medium", message.isOwn ? "text-white" : "text-foreground")}>{attachment.name}</p>
                  <p className={cn("text-xs", message.isOwn ? "text-white/80" : "text-muted-foreground")}>{attachment.typeLabel} • {attachment.sizeLabel}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={cn("text-xs", message.isOwn ? "text-white/75" : "text-muted-foreground")}>{message.timestamp}</p>
          <button
            type="button"
            onClick={() => onReply(message)}
            className={cn(
              "inline-flex items-center gap-1 text-xs transition-colors",
              message.isOwn ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            Responder
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingAttachmentsBar({
  attachments,
  onRemove,
}: Readonly<{
  attachments: AttachmentItem[];
  onRemove: (index: number) => void;
}>) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {attachments.map((attachment, index) => (
        <PendingAttachmentChip key={`${attachment.name}-${index}`} attachment={attachment} index={index} onRemove={onRemove} />
      ))}
    </div>
  );
}

function getStatusLabel(status: Conversation["status"]) {
  if (status === "online") return "En línea";
  if (status === "away") return "Ausente";
  return "Desconectado";
}

export function Messages(props: Readonly<{
  initialOpen?: { conversationId?: number; recipientName?: string; recipientRole?: string; document?: { id: number; title: string } } | null;
  onConsume?: () => void;
}> = {}) {
  const { initialOpen, onConsume } = props;
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedChat, setSelectedChat] = useState<number>(initialConversations[0]?.id ?? 1);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const currentRoleLabel = user?.role === "docente" ? "Docente" : "Administrador";
  const peerRoleLabel = currentRoleLabel === "Docente" ? "Administrador" : "Docente";

  // If another page requests opening a conversation with a document, create or open it
  const processInitialOpen = (detail: NonNullable<typeof initialOpen>) => {
    const { conversationId, recipientName, recipientRole, document } = detail;
    const buildDocumentAttachment = (doc: { id: number; title: string }): AttachmentItem => ({
      name: `${doc.title}.pdf`,
      sizeLabel: "—",
      typeLabel: "Documento PDF",
    });

    const appendDocumentToConversation = (conv: Conversation, doc: { id: number; title: string }): Conversation => {
      const documentMessage: ChatMessage = {
        id: Date.now(),
        sender: "Tú",
        content: `Te comparto el documento: ${doc.title}`,
        timestamp: getTimeLabel(),
        isOwn: true,
        attachments: [buildDocumentAttachment(doc)],
      };

      return {
        ...conv,
        messages: [...conv.messages, documentMessage],
        lastMessage: documentMessage.content,
        timestamp: "Ahora",
      };
    };

    if (conversationId) {
      setSelectedChat(conversationId);
      if (document) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId ? appendDocumentToConversation(conversation, document) : conversation
          )
        );
      }
      onConsume?.();
      return;
    }

    if (!recipientName) return;

    setConversations((current) => {
      const found = current.find((conversation) => conversation.name === recipientName);
      if (found) {
        setSelectedChat(found.id);
        return document
          ? current.map((conversation) =>
              conversation.id === found.id ? appendDocumentToConversation(conversation, document) : conversation
            )
          : current;
      }

      const newId = Date.now();
      const initials = recipientName.split(" ").map((n) => n[0]).slice(0, 2).join("");
      const baseConversation: Conversation = {
        id: newId,
        name: recipientName,
        role: recipientRole || "Docente",
        lastMessage: "Nuevo chat",
        timestamp: "Ahora",
        unread: 0,
        avatar: initials,
        status: "online",
        messages: [],
      };

      const newConversation = document ? appendDocumentToConversation(baseConversation, document) : baseConversation;
      setSelectedChat(newId);
      return [newConversation, ...current];
    });

    onConsume?.();
  };

  React.useEffect(() => {
    if (!initialOpen) return;
    processInitialOpen(initialOpen);
  }, [initialOpen]);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesRole = conversation.role === peerRoleLabel;
      const matchesSearch =
        !normalizedSearch ||
        [conversation.name, conversation.role, conversation.lastMessage].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesRole && matchesSearch;
    });
  }, [conversations, peerRoleLabel, search]);

  const activeConversation = filteredConversations.find((conversation) => conversation.id === selectedChat) ?? filteredConversations[0];

  useEffect(() => {
    if (!activeConversation) return;
    if (selectedChat !== activeConversation.id) {
      setSelectedChat(activeConversation.id);
    }
  }, [activeConversation, selectedChat]);

  const updateConversation = (conversationId: number, updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => current.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)));
  };

  const handleConversationSelect = (conversationId: number) => {
    setSelectedChat(conversationId);
    setReplyingTo(null);
    updateConversation(conversationId, (conversation) => ({ ...conversation, unread: 0 }));
  };

  const handleRemoveAttachment = (removeIndex: number) => {
    setPendingAttachments((current) => current.filter((_, currentIndex) => currentIndex !== removeIndex));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const attachments = files.map((file) => ({
      name: file.name,
      sizeLabel: formatSize(file.size),
      typeLabel: file.type || "Archivo",
    }));

    setPendingAttachments((current) => [...current, ...attachments]);
    event.target.value = "";
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage && pendingAttachments.length === 0) return;

    const currentConversation = filteredConversations.find((conversation) => conversation.id === selectedChat);
    if (!currentConversation) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: "Tú",
      content: trimmedMessage || "Adjunto enviado",
      timestamp: getTimeLabel(),
      isOwn: true,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            sender: replyingTo.sender,
            content: replyingTo.content,
          }
        : undefined,
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedChat
          ? {
              ...conversation,
              messages: [...conversation.messages, newMessage],
              lastMessage: newMessage.content,
              timestamp: "Ahora",
            }
          : conversation
      )
    );

    setMessage("");
    setPendingAttachments([]);
    setReplyingTo(null);
  };

  return (
    <div className="flex h-[calc(100dvh-1.5rem)] min-h-0 flex-col gap-5 overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1>Mensajes</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Comunicación directa entre administración y docentes, con seguimiento de mensajes y archivos adjuntos.</p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
          {filteredConversations.length} conversaciones
        </Badge>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
          <CardHeader className="space-y-4 border-b border-border/60 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Chats</CardTitle>
                <CardDescription>Conversaciones permitidas para tu rol</CardDescription>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px]">
                  Tu rol: {currentRoleLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                  Chateas con: {peerRoleLabel}
                </Badge>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o mensaje..." className="pl-9" />
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-full pr-1">
              {filteredConversations.length > 0 ? (
                <div className="space-y-1.5 py-2">
                  {filteredConversations.map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      active={selectedChat === conversation.id}
                      onSelect={handleConversationSelect}
                    />
                  ))}
                </div>
              ) : (
                <EmptyConversationState
                  title={search ? "Sin resultados" : "No hay chats disponibles"}
                  description={search ? "Prueba con otro texto o limpia la búsqueda." : "Solo verás conversaciones que correspondan a tu rol."}
                />
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
          <CardHeader className="border-b border-border/60 bg-background/80 pb-4">
            {activeConversation ? (
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                  <AvatarFallback className="bg-success/10 text-success">{activeConversation.avatar}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{activeConversation.name}</CardTitle>
                    {activeConversation.unread > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[11px]">
                        {activeConversation.unread}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{activeConversation.role}</span>
                    <span className="inline-flex items-center gap-1">
                      <StatusDot status={activeConversation.status} />
                      {getStatusLabel(activeConversation.status)}
                    </span>
                    <span>{activeConversation.timestamp}</span>
                  </CardDescription>
                </div>
              </div>
            ) : (
              <div>
                <CardTitle className="text-base">Selecciona un chat</CardTitle>
                <CardDescription>Elige una conversación para ver el historial y responder.</CardDescription>
              </div>
            )}
          </CardHeader>

          <CardContent className="min-h-0 flex-1 p-0">
            {activeConversation ? (
              <ScrollArea className="h-full bg-gradient-to-b from-slate-50/60 via-white to-cyan-50/40 px-3 py-4 pr-2 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20">
                <div className="space-y-4 pb-2 pt-1">
                  {activeConversation.messages.length > 0 ? (
                    activeConversation.messages.map((messageItem) => (
                      <MessageBubble key={messageItem.id} message={messageItem} onReply={setReplyingTo} />
                    ))
                  ) : (
                    <EmptyConversationState
                      title="Sin mensajes"
                      description="Todavía no hay mensajes en esta conversación. Puedes iniciar la charla desde abajo."
                    />
                  )}
                </div>
              </ScrollArea>
            ) : (
              <EmptyConversationState
                title="Panel vacío"
                description="Selecciona una conversación del panel lateral para ver el historial y responder."
              />
            )}
          </CardContent>

          <div className="shrink-0 border-t border-border/60 bg-background/95 p-4 shadow-[0_-12px_30px_rgba(16,185,129,0.06)] backdrop-blur-sm">
            {replyingTo && (
              <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">Respondiendo a {replyingTo.sender}</p>
                  <p className="truncate text-emerald-700 dark:text-emerald-400">{replyingTo.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancelar respuesta"
                  className="rounded-full p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {pendingAttachments.length > 0 && <PendingAttachmentsBar attachments={pendingAttachments} onRemove={handleRemoveAttachment} />}

            <div className="space-y-3">
              <Textarea
                placeholder="Escribe un mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[88px] resize-none rounded-[1.35rem] border-border/70 bg-background/90 px-4 py-3 shadow-inner"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-full border-emerald-200/70 bg-white/80 px-4 shadow-sm hover:bg-emerald-50" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4 mr-1" />
                    Adjuntar archivo
                  </Button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                </div>

                <Button variant="success" className="rounded-full px-5 shadow-md shadow-emerald-500/20" onClick={handleSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar mensaje
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
