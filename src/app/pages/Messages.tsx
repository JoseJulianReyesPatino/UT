import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { CornerUpLeft, Paperclip, PencilLine, Search, Send, X, Trash } from "lucide-react";
import { cn } from "../../lib/utils";
import apiFetch from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";


// Función para convertir URL relativa a absoluta
const getAbsoluteUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
    return `${baseUrl}${url}`;
  }
  return url;
};

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
  avatar?: string;
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

const initialConversations: Conversation[] = [];

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

const parseMessageDate = (timestamp: string) => {
  const normalized = timestamp.includes("T") ? timestamp : timestamp.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const canEditMessage = (timestamp: string) => {
  const parsed = parseMessageDate(timestamp);
  if (!parsed) return false;
  return Date.now() - parsed.getTime() <= 5 * 60 * 1000;
};

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
            {conversation.avatar?.startsWith('http') || conversation.avatar?.startsWith('/') ? (
              <img src={conversation.avatar} alt={conversation.name} className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-success/10 text-success">{conversation.avatar}</AvatarFallback>
            )}
          </Avatar>
          <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background", StatusDot({ status: conversation.status }))} />
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
  onDelete,
  onEdit,
}: Readonly<{ message: ChatMessage; onReply: (message: ChatMessage) => void; onDelete?: (messageId: number) => void; onEdit?: (messageId: number, body: string) => void }>) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(message.content);
  const editable = message.isOwn && canEditMessage(message.timestamp);

  useEffect(() => {
    if (editOpen) {
      setEditBody(message.content);
    }
  }, [editOpen, message.content]);

  return (
    <div className={cn("flex items-end", message.isOwn ? "justify-end" : "justify-start")}> 
      {!message.isOwn && (
        <div className="mr-2 mt-0.5 shrink-0">
          <Avatar className="h-8 w-8 ring-1 ring-white/80 dark:ring-slate-900/50">
            {message.avatar?.startsWith('http') || message.avatar?.startsWith('/') ? (
              <img src={message.avatar} alt={message.sender} className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-success/10 text-success">
                {message.sender.split(" ").map(n=>n[0]).slice(0,2).join("")}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      )}

      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 shadow-sm relative",
          message.isOwn
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
            : "bg-white/95 border border-border/70 text-foreground dark:bg-slate-950/80"
        )}
        title={message.timestamp}
      >
        <div className="text-xs font-medium mb-1 text-foreground/70">{!message.isOwn && message.sender}</div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={`${message.id}-${attachment.name}`} className="flex items-center gap-3 rounded-lg border p-2 text-sm bg-muted/40">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">{attachment.typeLabel} • {attachment.sizeLabel}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="opacity-90">{message.timestamp}</span>
          <div className="inline-flex items-center gap-2">
            <button type="button" onClick={() => onReply(message)} className="inline-flex items-center gap-1">
              <CornerUpLeft className="h-3.5 w-3.5" />
              Responder
            </button>
            {editable && onEdit && (
              <button type="button" onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1" aria-label="Editar mensaje" title="Editar mensaje">
                <PencilLine className="h-3.5 w-3.5" />
              </button>
            )}
            {message.isOwn && onDelete && (
              <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <button type="button" onClick={() => setRemoveOpen(true)} className="inline-flex items-center gap-1 text-destructive">
                  <Trash className="h-3.5 w-3.5" />
                </button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Eliminar mensaje</DialogTitle>
                    <DialogDescription>¿Seguro que deseas eliminar este mensaje? Esta acción no se puede deshacer.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={() => { setRemoveOpen(false); onDelete(message.id); }}>Eliminar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {editable && onEdit && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar mensaje</DialogTitle>
              <DialogDescription>Modifica el contenido del mensaje y guarda los cambios.</DialogDescription>
            </DialogHeader>
            <Textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} className="min-h-[120px]" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button
                variant="success"
                onClick={() => {
                  const nextBody = editBody.trim();
                  if (!nextBody) return;
                  setEditOpen(false);
                  onEdit(message.id, nextBody);
                }}
              >
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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

function EmptyConversationState({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <div className="flex h-full min-h-[260px] items-center justify-center px-6 py-10 text-center">
      <div className="max-w-sm space-y-2 rounded-3xl border border-dashed border-emerald-200 bg-white/70 p-6 shadow-sm dark:border-emerald-900/50 dark:bg-slate-950/40">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
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
  const { user, isReady } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientUsers, setRecipientUsers] = useState<any[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [recipientFetchError, setRecipientFetchError] = useState<string | null>(null);
  
  const currentRoleLabel = user?.roles?.length && user.roles.length > 1
    ? user.roles.map((role) => (role === "administrador" ? "Administrador" : role === "tutor" ? "Tutor" : "Docente")).join(" y ")
    : user?.role === "administrador"
    ? "Administrador"
    : user?.role === "tutor"
    ? "Tutor"
    : "Docente";
  const peerRoleLabel = currentRoleLabel === "Administrador" ? "Docente" : "Administrador";

  const recipientRoleCode = peerRoleLabel.toLowerCase();

  const loadRecipientUsers = useCallback(async () => {
    try {
      setIsLoadingRecipients(true);
      setRecipientFetchError(null);
      const usersPayload = (await apiFetch('/users', { method: 'GET' })) as { data?: any[] } | null;
      const users = usersPayload?.data ?? [];
      const filtered = (users ?? []).filter((recipient) => {
        if (!recipient) return false;
        const roles = recipient.roles ?? [];
        const hasPeerRole = roles.some((role: any) => (role.code ?? role).toString().toLowerCase() === recipientRoleCode);
        return recipient.id !== user?.id && hasPeerRole;
      });
      setRecipientUsers(filtered);
    } catch (err) {
      console.error('loadRecipientUsers error', err);
      setRecipientFetchError('No fue posible cargar usuarios');
    } finally {
      setIsLoadingRecipients(false);
    }
  }, [recipientRoleCode, user?.id]);

  useEffect(() => {
    if (!newConversationOpen) return;
    void loadRecipientUsers();
  }, [newConversationOpen, loadRecipientUsers]);

  const filteredRecipientUsers = useMemo(() => {
    const normalizedSearch = recipientQuery.trim().toLowerCase();
    return recipientUsers.filter((recipient) => {
      const fullName = ((recipient.full_name ?? recipient.name ?? '') as string).toLowerCase();
      return !normalizedSearch || fullName.includes(normalizedSearch);
    });
  }, [recipientQuery, recipientUsers]);

  const handleCreateConversation = async (recipient: any) => {
    try {
      const normalizedRecipientName = ((recipient.full_name ?? recipient.name ?? '') as string).trim().toLowerCase();
      const existingConversation = conversations.find((conversation) => conversation.name.trim().toLowerCase() === normalizedRecipientName);
      if (existingConversation) {
        setSelectedChat(existingConversation.id);
        setNewConversationOpen(false);
        setRecipientQuery('');
        await loadMessages(existingConversation.id);
        return;
      }

      const created = (await apiFetch('/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_user_id: recipient.id }),
      })) as { data?: any };
      const newConversation = normalizeConversation(created.data);
      setConversations((current) => [newConversation, ...current]);
      setSelectedChat(newConversation.id);
      setNewConversationOpen(false);
      setRecipientQuery('');
      await loadMessages(newConversation.id);
    } catch (err) {
      console.error('createConversation error', err);
      toast.error('No fue posible crear la conversación');
    }
  };

  // Recuperar conversaciones guardadas al montar
  useEffect(() => {
    const savedConversations = sessionStorage.getItem('chat_conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
        }
      } catch (e) {
        console.error('Error loading cached conversations', e);
      }
    }
    const savedSelectedChat = sessionStorage.getItem('chat_selected_chat');
    if (savedSelectedChat) {
      setSelectedChat(Number(savedSelectedChat));
    }
  }, []);

  // Guardar conversaciones en sessionStorage
  useEffect(() => {
    if (conversations.length > 0 && !isInitialLoad) {
      sessionStorage.setItem('chat_conversations', JSON.stringify(conversations));
    }
  }, [conversations, isInitialLoad]);

  // Guardar selectedChat en sessionStorage
  useEffect(() => {
    if (selectedChat !== null) {
      sessionStorage.setItem('chat_selected_chat', String(selectedChat));
    }
  }, [selectedChat]);

  const getInitials = (name?: string) => {
    if (!name) return "CH";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "CH";
  };

const normalizeConversation = useCallback((raw: any): Conversation => {
  // Usar avatar_url y convertir a URL absoluta
  const avatarValue = getAbsoluteUrl(raw.avatar_url) ?? getInitials(raw.name ?? raw.display_name);
  
  return {
    id: raw.id,
    name: raw.name ?? raw.display_name ?? 'Conversación',
    role: raw.role ?? 'Docente',
    lastMessage: raw.lastMessage ?? raw.last_message ?? raw.lastMessage ?? 'Nuevo chat',
    timestamp: raw.timestamp ?? raw.lastMessageAt ?? raw.updated_at ?? '',
    unread: Number(raw.unread ?? 0),
    avatar: avatarValue,
    status: 'offline',
    messages: [],
  };
}, [getInitials]);

const normalizeMessage = useCallback((raw: any): ChatMessage => ({
  id: raw.id,
  sender: raw.sender ?? raw.user_name ?? 'Usuario',
  content: raw.content ?? raw.body ?? '',
  timestamp: raw.timestamp ?? raw.created_at ?? new Date().toISOString(),
  isOwn: Boolean(raw.isOwn || raw.is_own || raw.sender_id === Number(user?.id)),
  avatar: getAbsoluteUrl(raw.avatar_url ?? raw.avatar),
  attachments: raw.attachments ?? [],
  replyTo: raw.replyTo ?? null,
}), [user?.id]);

  const loadConversations = useCallback(async () => {
    try {
      const payload = (await apiFetch('/conversations', { method: 'GET' })) as { data?: any[] };
      const rows = payload?.data ?? [];
      const convs = rows.map(normalizeConversation);
      setConversations((current) => {
        const merged = convs.map((conversation) => {
          const existing = current.find((item) => item.id === conversation.id);
          return existing ? { ...conversation, messages: existing.messages } : conversation;
        });
        return merged;
      });
      if (convs.length > 0 && selectedChat === null) {
        const savedSelected = sessionStorage.getItem('chat_selected_chat');
        if (savedSelected) {
          setSelectedChat(Number(savedSelected));
        } else {
          setSelectedChat(convs[0].id);
        }
      }
      setIsInitialLoad(false);
      window.dispatchEvent(new Event('ut-messages-updated'));
      return convs;
    } catch (err) {
      console.error('loadConversations error', err);
      setIsInitialLoad(false);
      return [];
    }
  }, [normalizeConversation, selectedChat]);

  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      const payload = (await apiFetch(`/conversations/${conversationId}/messages`, { method: 'GET' })) as { data?: any[] };
      const rows = payload?.data ?? [];
      const msgs = rows.map(normalizeMessage);
      setConversations((current) => current.map((c) => (c.id === conversationId ? { ...c, messages: msgs } : c)));
      return msgs;
    } catch (err) {
      console.error('loadMessages error', err);
      return [];
    }
  }, [normalizeMessage]);

  const markConversationAsRead = useCallback(async (conversationId: number) => {
    try {
      await apiFetch(`/conversations/${conversationId}/read`, { method: 'PATCH' });
      setConversations((current) => current.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
    } catch (err) {
      // ignore
    }
  }, []);

  // POLLING: Actualizar mensajes cada 3 segundos si hay una conversación activa
  useEffect(() => {
    if (!selectedChat) return;
    
    const interval = setInterval(async () => {
      await loadMessages(selectedChat);
      await loadConversations();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [selectedChat, loadMessages, loadConversations]);

  const processInitialOpen = useCallback((detail: NonNullable<typeof initialOpen>) => {
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

    (async () => {
      try {
        const normalizedRecipientName = recipientName.trim().toLowerCase();
        let availableConversations = conversations;
        let found = availableConversations.find((c) => c.name.trim().toLowerCase() === normalizedRecipientName);
        if (!found) {
          availableConversations = await loadConversations();
          found = availableConversations.find((c) => c.name.trim().toLowerCase() === normalizedRecipientName);
        }

        if (found) {
          setSelectedChat(found.id);
          if (document) await apiFetch(`/conversations/${found.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: `Te comparto el documento: ${document.title}` }),
          });
          await loadMessages(found.id);
          onConsume?.();
          return;
        }

        const usersPayload = (await apiFetch('/users', { method: 'GET' })) as { data?: any[] } | null;
        const users = usersPayload?.data ?? [];
        const recipient = users.find((u) => {
          const fullName = (u.full_name ?? u.name ?? '').trim().toLowerCase();
          const roleMatches = recipientRole && (u.roles ?? []).some((r: any) => (r.code ?? r).toString().toLowerCase().includes(recipientRole.toLowerCase()));
          return fullName === normalizedRecipientName || roleMatches;
        });

        let conversationId: number | null = null;
        if (recipient) {
          const created = (await apiFetch('/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_user_id: recipient.id }),
          })) as { data?: any };
          conversationId = created?.data?.id ?? null;
        }

        if (conversationId) {
          await loadConversations();
          setSelectedChat(conversationId);
          if (document) await apiFetch(`/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: `Te comparto el documento: ${document.title}` }),
          });
          await loadMessages(conversationId);
        }

        onConsume?.();
      } catch (err) {
        console.error('openInitialConversation error', err);
      }
    })();
  }, [conversations, loadConversations, loadMessages, onConsume]);

  React.useEffect(() => {
    if (!initialOpen) return;
    processInitialOpen(initialOpen);
  }, [initialOpen, processInitialOpen]);

  useEffect(() => {
    if (!isReady) return;
    void loadConversations();
  }, [isReady, loadConversations]);

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

  // Scroll al final cuando se selecciona una conversación o cambian los mensajes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedChat, activeConversation?.messages.length]);

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
    void Promise.all([loadMessages(conversationId), markConversationAsRead(conversationId)]);
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

  const addFiles = (files: File[]) => {
    const attachments = files.map((file) => ({
      name: file.name,
      sizeLabel: formatSize(file.size),
      typeLabel: file.type || "Archivo",
    }));

    setPendingAttachments((current) => [...current, ...attachments]);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage && pendingAttachments.length === 0) return;

    const currentConversation = filteredConversations.find((conversation) => conversation.id === selectedChat);
    if (!currentConversation) return;
    (async () => {
      try {
        await apiFetch(`/conversations/${selectedChat}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmedMessage || (pendingAttachments.length > 0 ? 'Adjunto enviado' : ''), reply_to_message_id: replyingTo?.id ?? null }),
        });
        setMessage('');
        setPendingAttachments([]);
        setReplyingTo(null);
        setIsTyping(false);
        await Promise.all([loadMessages(selectedChat as number), loadConversations()]);
      } catch (err) {
        console.error('send message error', err);
      }
    })();
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      await apiFetch(`/conversations/${selectedChat}/messages/${messageId}`, { method: 'DELETE' });
      await Promise.all([loadMessages(selectedChat), loadConversations()]);
      window.dispatchEvent(new Event('ut-messages-updated'));
      toast.success("Mensaje eliminado");
    } catch (err: any) {
      console.error('delete message error', err);
      toast.error(err?.message ?? 'No fue posible eliminar el mensaje');
    }
  };

  const handleEditMessage = async (messageId: number, body: string) => {
    if (!selectedChat) return;
    try {
      await apiFetch(`/conversations/${selectedChat}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      await Promise.all([loadMessages(selectedChat), loadConversations()]);
      window.dispatchEvent(new Event('ut-messages-updated'));
      toast.success('Mensaje actualizado');
    } catch (err: any) {
      console.error('edit message error', err);
      toast.error(err?.message ?? 'No fue posible editar el mensaje');
    }
  };

  useEffect(() => {
    if (!message) return;
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 1200);
    return () => clearTimeout(t);
  }, [message]);

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length > 0) addFiles(files as File[]);
  };

  return (
    <div className="flex h-[calc(100dvh-1.5rem)] min-h-0 flex-col gap-5 overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1>Mensajes</h1>
          <p className="max-w-2xl text-sm text-muted-foreground hidden sm:block">Mensajería interna: mensajes, archivos y seguimiento.</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="hidden sm:flex min-h-0 flex-col overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
          <CardHeader className="space-y-4 border-b border-border/60 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Chats</CardTitle>
                <CardDescription className="hidden sm:block">Conversaciones recientes</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o mensaje..." className="pl-9" />
              </div>
              {(user?.role === "administrador" || user?.roles?.includes("administrador")) && (
                <Button variant="secondary" onClick={() => setNewConversationOpen(true)}>
                  Nuevo chat
                </Button>
              )}
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

        <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar nuevo chat</DialogTitle>
              <DialogDescription>Busca un {peerRoleLabel.toLowerCase()} y crea una nueva conversación.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={recipientQuery}
                  onChange={(e) => setRecipientQuery(e.target.value)}
                  placeholder={`Buscar ${peerRoleLabel.toLowerCase()} por nombre...`}
                  className="pl-9"
                />
              </div>
              {isLoadingRecipients ? (
                <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
              ) : recipientFetchError ? (
                <p className="text-sm text-destructive">{recipientFetchError}</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-background/80 p-3">
                  {filteredRecipientUsers.length > 0 ? (
                    filteredRecipientUsers.map((recipient) => (
                      <button
                        key={recipient.id}
                        type="button"
                        onClick={() => handleCreateConversation(recipient)}
                        className="w-full rounded-xl border border-border/60 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/80"
                      >
                        <p className="font-semibold">{recipient.full_name ?? recipient.name}</p>
                        <p className="text-sm text-muted-foreground">{peerRoleLabel}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No se encontraron usuarios.</p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Card className="flex min-h-0 flex-col overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
          <CardHeader className="border-b border-border/60 bg-background/80 pb-4">
            {activeConversation ? (
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                  {activeConversation.avatar?.startsWith('http') || activeConversation.avatar?.startsWith('/') ? (
                    <img src={activeConversation.avatar} alt={activeConversation.name} className="h-full w-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-success/10 text-success">{activeConversation.avatar}</AvatarFallback>
                  )}
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
                      <MessageBubble key={messageItem.id} message={messageItem} onReply={setReplyingTo} onDelete={handleDeleteMessage} onEdit={handleEditMessage} />
                    ))
                  ) : (
                    <EmptyConversationState
                      title="Sin mensajes"
                      description="Todavía no hay mensajes en esta conversación. Puedes iniciar la charla desde abajo."
                    />
                  )}
                  {/* Referencia para scroll al final */}
                  <div ref={messagesEndRef} />
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-emerald-200/70 bg-white/80 px-4 shadow-sm hover:bg-emerald-50 text-foreground dark:bg-slate-800/50 dark:border-emerald-900/40 dark:text-white dark:hover:bg-slate-800/70"
                    onClick={() => fileInputRef.current?.click()}
                  >
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