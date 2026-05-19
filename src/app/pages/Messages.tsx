import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Textarea } from "../components/ui/textarea";
import { Paperclip, Search, Send, X } from "lucide-react";
import { cn } from "../../lib/utils";

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
        "w-full p-4 text-left transition-colors hover:bg-accent/60",
        active && "bg-emerald-50/80 dark:bg-emerald-950/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar>
            <AvatarFallback className="bg-success/10 text-success">{conversation.avatar}</AvatarFallback>
          </Avatar>
          <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background", statusClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{conversation.name}</p>
              <p className="text-xs text-muted-foreground">{conversation.role}</p>
            </div>
            {conversation.unread > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">
                {conversation.unread}
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>
          <p className="mt-1 text-xs text-muted-foreground">{conversation.timestamp}</p>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message }: Readonly<{ message: ChatMessage }>) {
  return (
    <div className={cn("flex", message.isOwn ? "justify-end" : "justify-start")}> 
      <div
        className={cn(
          "max-w-[78%] rounded-2xl border px-4 py-3 shadow-sm",
          message.isOwn ? "border-emerald-500/30 bg-emerald-500 text-white" : "border-border bg-background"
        )}
      >
        <p className={cn("text-xs font-medium", message.isOwn ? "text-white/80" : "text-muted-foreground")}>{message.sender}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <div
                key={`${message.id}-${attachment.name}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-sm",
                  message.isOwn ? "border-white/20 bg-white/10" : "border-border bg-muted/40"
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
        <p className={cn("mt-2 text-xs", message.isOwn ? "text-white/75" : "text-muted-foreground")}>{message.timestamp}</p>
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedChat, setSelectedChat] = useState<number>(initialConversations[0]?.id ?? 1);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([]);

  // If another page requests opening a conversation with a document, create or open it
  const processInitialOpen = (detail: NonNullable<typeof initialOpen>) => {
    const { conversationId, recipientName, recipientRole, document } = detail;

    const loadAttachment = (doc: { id: number; title: string }) => {
      const attachment: AttachmentItem = {
        name: `${doc.title}.pdf`,
        sizeLabel: "—",
        typeLabel: "Documento PDF",
      };
      setPendingAttachments((cur) => [attachment, ...cur]);
      setMessage("");
    };

    if (conversationId) {
      const exists = conversations.find((c) => c.id === conversationId);
      if (exists) {
        setSelectedChat(conversationId);
        if (document) loadAttachment(document);
        onConsume?.();
        return;
      }
    }

    if (recipientName) {
      const found = conversations.find((c) => c.name === recipientName);
      if (found) {
        setSelectedChat(found.id);
        if (document) loadAttachment(document);
        onConsume?.();
        return;
      }

      const newId = Date.now();
      const initials = recipientName.split(" ").map((n) => n[0]).slice(0, 2).join("");
      const newConversation: Conversation = {
        id: newId,
        name: recipientName,
        role: recipientRole || "Docente",
        lastMessage: document ? `Documento: ${document.title}` : "Nuevo chat",
        timestamp: "Ahora",
        unread: 0,
        avatar: initials,
        status: "online",
        messages: document
          ? [
              { id: Date.now() - 1, sender: recipientName, content: `Se enlaza el documento: ${document.title} (ID ${document.id})`, timestamp: getTimeLabel(), isOwn: false },
            ]
          : [],
      };

      setConversations((c) => [newConversation, ...c]);
      setSelectedChat(newId);
      if (document) loadAttachment(document);
      onConsume?.();
    }
  };

  React.useEffect(() => {
    if (!initialOpen) return;
    processInitialOpen(initialOpen);
  }, [initialOpen]);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return conversations;

    return conversations.filter((conversation) =>
      [conversation.name, conversation.role, conversation.lastMessage].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [conversations, search]);

  const activeConversation = conversations.find((conversation) => conversation.id === selectedChat) ?? conversations[0];

  const updateConversation = (conversationId: number, updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => current.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)));
  };

  const handleConversationSelect = (conversationId: number) => {
    setSelectedChat(conversationId);
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

    const currentConversation = conversations.find((conversation) => conversation.id === selectedChat);
    if (!currentConversation) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: "Tú",
      content: trimmedMessage || "Adjunto enviado",
      timestamp: getTimeLabel(),
      isOwn: true,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Mensajes</h1>
        <p className="text-muted-foreground">Simulación de chat con conversaciones y archivos adjuntos</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
          <CardHeader className="space-y-4 border-b border-border/60">
            <div>
              <CardTitle>Chats</CardTitle>
              <CardDescription>Todas las conversaciones disponibles</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar chat o mensaje..." className="pl-9" />
            </div>
          </CardHeader>

          <ScrollArea className="h-[700px] pr-1">
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {filteredConversations.map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    active={selectedChat === conversation.id}
                    onSelect={handleConversationSelect}
                  />
                ))}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>

        <Card className="flex h-[760px] flex-col overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
          <CardHeader className="border-b border-border/60 bg-background/80">
            {activeConversation ? (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-success/10 text-success">{activeConversation.avatar}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{activeConversation.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {activeConversation.role}
                    <span className="inline-flex items-center gap-1">
                      <StatusDot status={activeConversation.status} />
                      {getStatusLabel(activeConversation.status)}
                    </span>
                  </CardDescription>
                </div>
              </div>
            ) : (
              <div>
                <CardTitle className="text-base">Selecciona un chat</CardTitle>
                <CardDescription>No hay conversaciones disponibles</CardDescription>
              </div>
            )}
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-[500px] px-3 py-4 pr-2">
              <div className="space-y-4">
                {activeConversation?.messages.map((messageItem) => (
                  <MessageBubble key={messageItem.id} message={messageItem} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>

          <div className="border-t border-border/60 bg-background/90 p-3">
            {pendingAttachments.length > 0 && <PendingAttachmentsBar attachments={pendingAttachments} onRemove={handleRemoveAttachment} />}

            <div className="space-y-2.5">
              <Textarea
                placeholder="Escribe un mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[72px] max-h-[120px] resize-none rounded-2xl border-border/70 bg-background/80"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-full border-emerald-200/70 bg-white/80 shadow-sm hover:bg-emerald-50" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4 mr-1" />
                    Adjuntar archivo
                  </Button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                </div>

                <Button variant="success" className="rounded-full shadow-md shadow-emerald-500/20" onClick={handleSend}>
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
