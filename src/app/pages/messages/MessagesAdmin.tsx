import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { CornerUpLeft, Paperclip, PencilLine, Search, Send, X, Trash, EyeOff, Eye } from "lucide-react";
import { cn } from "../../../lib/utils";
import downloadIcon from "../../../assets/icons/download-circle.svg";
import apiFetch from "../../lib/api";
import { resolveApiAssetUrl, AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getInitials, isImageUrl, useResolvedAvatarUrl } from "../../lib/avatar";
import defaultAvatar from "../../../assets/perfil2.png";

const DEFAULT_AVATAR_PATH = defaultAvatar;

type AttachmentItem = {
  file?: File;
  name: string;
  sizeLabel: string;
  typeLabel: string;
  url?: string;
};

async function tryFetchAndDownload(url: string, filename: string) {
  try {
    const headers: Record<string, string> = {};
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
    if (!res.ok) throw new Error('Network response not ok');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
    return true;
  } catch (err) {
    return false;
  }
}

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
  avatar?: string | null;
  avatarFallback: string;
  status: "online" | "offline" | "away";
  messages: ChatMessage[];
};

type DraftRecipient = {
  id: number;
  name: string;
  role: string;
  avatar?: string | null;
  avatarFallback: string;
  status: "online" | "offline" | "away";
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

const isConversationAccessDenied = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('acceso denegado a esta conversación') || msg.includes('acceso denegado a esta conversacion');
};

const isUnauthenticatedError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('no autenticado') || msg.includes('401');
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
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
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
  if (status === "online") statusClassName = "bg-emerald-500";
  else if (status === "away") statusClassName = "bg-amber-500";
  return <span className={cn("h-2 w-2 rounded-full", statusClassName)} />;
}

const ConversationRow = React.memo(({
  conversation,
  active,
  onSelect,
  onSuppress,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: (conversationId: number) => void;
  onSuppress?: (conversationId: number) => void;
}) => {
  const imageUrl = useResolvedAvatarUrl(conversation.avatar);
  const showImage = !!imageUrl;
  const initials = conversation.avatarFallback || getInitials(conversation.name);
  
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(conversation.id);
        }
      }}
      className={cn(
        "group relative mx-2 my-1 w-[calc(100%-1rem)] overflow-hidden rounded-2xl border text-left transition-all duration-200",
        active
          ? "border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 shadow-[0_8px_24px_rgba(16,185,129,0.12)] ring-1 ring-emerald-200/70 dark:border-emerald-800 dark:from-emerald-950/40 dark:via-slate-950 dark:to-cyan-950/30 dark:ring-emerald-900/60"
          : "border-transparent bg-transparent hover:border-emerald-100 hover:bg-white/90 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600" />}
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSuppress?.(conversation.id);
        }}
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-emerald-100 hover:text-emerald-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
        aria-label={`Suprimir chat con ${conversation.name}`}
      >
        <EyeOff className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 px-3 py-3.5">
        <div className="relative mt-0.5 shrink-0">
          <Avatar className="h-9 w-9 ring-1 ring-white/70 dark:ring-slate-900/60">
            {showImage && imageUrl ? (
              <AvatarImage src={imageUrl} alt={conversation.name} className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-sm font-medium">
                {initials}
              </AvatarFallback>
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
    </div>
  );
});

const SuppressedConversationRow = React.memo(({
  conversation,
  onRestore,
}: {
  conversation: Conversation;
  onRestore: (conversationId: number) => void;
}) => {
  const imageUrl = useResolvedAvatarUrl(conversation.avatar);
  const showImage = !!imageUrl;
  const initials = conversation.avatarFallback || getInitials(conversation.name);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2">
      <div className="min-w-0 flex items-center gap-3">
        <Avatar className="h-9 w-9 ring-1 ring-white/80 dark:ring-slate-900/60">
          {showImage && imageUrl ? (
            <AvatarImage src={imageUrl} alt={conversation.name} className="h-full w-full object-cover" />
          ) : (
            <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold">{conversation.name}</p>
          <p className="text-xs text-muted-foreground truncate">{conversation.role}</p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          onRestore(conversation.id);
        }}
      >
        Restaurar
      </Button>
    </div>
  );
});

const MessageBubble = React.memo(({
  message,
  onReply,
  onDelete,
  onEdit,
}: {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onDelete?: (messageId: number) => void;
  onEdit?: (messageId: number, body: string) => void;
}) => {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(message.content);
  const editable = message.isOwn && canEditMessage(message.timestamp);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const imageUrl = useResolvedAvatarUrl(message.avatar);
  const showImage = !!imageUrl;
  const senderInitials = getInitials(message.sender);

  useEffect(() => {
    if (editOpen) setEditBody(message.content);
  }, [editOpen, message.content]);

  return (
    <div className={cn("flex items-end", message.isOwn ? "justify-end" : "justify-start")}> 
      {!message.isOwn && (
        <div className="mr-2 mt-0.5 shrink-0">
          <Avatar className="h-8 w-8 ring-1 ring-white/80 dark:ring-slate-900/50">
            {showImage && imageUrl ? (
              <AvatarImage src={imageUrl} alt={message.sender} className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium">
                {senderInitials}
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
            : cn("bg-white/95 border border-border/70 text-foreground", isDark && "bg-slate-800/95 border-slate-700 text-slate-200")
        )}
        title={message.timestamp}
      >
        <div className={cn("text-xs font-medium mb-1", message.isOwn ? "text-white/80" : "text-muted-foreground")}>
          {!message.isOwn && message.sender}
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={`${message.id}-${attachment.name}`} className="flex items-center gap-3 rounded-lg border p-2 text-sm bg-muted/40 dark:bg-slate-700/40">
                <Paperclip className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium dark:text-slate-200">
                      {attachment.url ? (
                        <a
                          href={resolveApiAssetUrl(attachment.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-emerald-700 dark:hover:text-emerald-300"
                        >
                          {attachment.name}
                        </a>
                      ) : (
                        attachment.name
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">{attachment.typeLabel} • {attachment.sizeLabel}</p>
                  </div>

                  {attachment.url && (
                    <a
                      href={resolveApiAssetUrl(attachment.url)}
                      onClick={async (e) => {
                        e.preventDefault();
                        const resolved = resolveApiAssetUrl(attachment.url!);
                        const ok = await tryFetchAndDownload(resolved, attachment.name);
                        if (!ok) {
                          window.open(resolved, '_blank', 'noopener');
                        }
                      }}
                      className="ml-3 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300"
                      title={`Descargar ${attachment.name}`}
                      >
                      <img src={downloadIcon} alt="Descargar" className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <span className={cn("opacity-90", message.isOwn ? "text-white/80" : "text-muted-foreground dark:text-slate-400")}>
            {message.timestamp}
          </span>
          <div className="inline-flex items-center gap-2">
            <button type="button" onClick={() => onReply(message)} className={cn("inline-flex items-center gap-1", message.isOwn ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200")}>
              <CornerUpLeft className="h-3.5 w-3.5" />
              Responder
            </button>
            {editable && onEdit && (
              <button type="button" onClick={() => setEditOpen(true)} className={cn("inline-flex items-center gap-1", message.isOwn ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200")}>
                <PencilLine className="h-3.5 w-3.5" />
              </button>
            )}
            {message.isOwn && onDelete && (
              <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <button type="button" onClick={() => setRemoveOpen(true)} className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
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
              <Button variant="success" onClick={() => { const nextBody = editBody.trim(); if (!nextBody) return; setEditOpen(false); onEdit(message.id, nextBody); }}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

function PendingAttachmentsBar({ attachments, onRemove }: Readonly<{ attachments: AttachmentItem[]; onRemove: (index: number) => void }>) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {attachments.map((attachment, index) => (
        <PendingAttachmentChip key={`${attachment.name}-${index}`} attachment={attachment} index={index} onRemove={onRemove} />
      ))}
    </div>
  );
}

function EmptyConversationState({ title, description }: Readonly<{ title: string; description: string }>) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="flex h-full min-h-[260px] items-center justify-center px-6 py-10 text-center">
      <div className={cn("max-w-sm space-y-2 rounded-3xl border border-dashed p-6 shadow-sm", isDark ? "border-emerald-800 bg-slate-900/60" : "border-emerald-200 bg-white/70")}>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function MessagesAdmin(props: Readonly<{
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
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientUsers, setRecipientUsers] = useState<any[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [recipientFetchError, setRecipientFetchError] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [draftRecipient, setDraftRecipient] = useState<DraftRecipient | null>(null);
  const [suppressedChatIds, setSuppressedChatIds] = useState<number[]>([]);
  const deniedConversationIdsRef = useRef<Set<number>>(new Set());
  
  const peerRoleLabel = "Docente";
  const recipientRoleCodes = ["docente", "tutor"];
  const peerRoleLabels = ["Docente", "Tutor"];
  const isTeacher = false;
  const suppressionStorageKey = `ut-suppressed-chats:${user?.id ?? "anon"}`;
  const conversationsCacheKey = `chat_conversations:admin:${user?.id ?? "anon"}`;
  const selectedChatCacheKey = `chat_selected_chat:admin:${user?.id ?? "anon"}`;

  const toDraftRecipient = useCallback((raw: any, fallbackRole: string): DraftRecipient => {
    const rawName = (raw?.full_name ?? raw?.name ?? "Usuario") as string;
    const roleCode = (raw?.role ?? raw?.roles?.[0]?.code ?? raw?.roles?.[0] ?? "").toString().toLowerCase();
    const role = roleCode === "administrador" ? "Administrador" : roleCode === "tutor" ? "Tutor" : fallbackRole;
    const avatarUrl = raw?.avatar_url ?? raw?.avatar ?? null;
    return {
      id: Number(raw?.id ?? 0),
      name: rawName,
      role,
      avatar: avatarUrl && isImageUrl(avatarUrl) ? avatarUrl : DEFAULT_AVATAR_PATH,
      avatarFallback: raw?.avatar_fallback ?? getInitials(rawName),
      status: "offline",
    };
  }, []);

  const draftToConversation = useCallback((draft: DraftRecipient): Conversation => ({
    id: -draft.id,
    name: draft.name,
    role: draft.role,
    lastMessage: "",
    timestamp: "",
    unread: 0,
    avatar: draft.avatar,
    avatarFallback: draft.avatarFallback,
    status: draft.status,
    messages: [],
  }), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(suppressionStorageKey);
      if (!stored) {
        setSuppressedChatIds([]);
        return;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setSuppressedChatIds(parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value)));
      }
    } catch {
      setSuppressedChatIds([]);
    }
  }, [suppressionStorageKey]);

  useEffect(() => {
    localStorage.setItem(suppressionStorageKey, JSON.stringify(suppressedChatIds));
  }, [suppressedChatIds, suppressionStorageKey]);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatarVersion(prev => prev + 1);
      loadConversations();
    };
    window.addEventListener('ut-avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('ut-avatar-updated', handleAvatarUpdate);
  }, []);

  const updateUnreadCount = useCallback(async () => {
    if (!isReady || !user?.id) return;
    try {
      const payload = (await apiFetch('/conversations', { method: 'GET' })) as { data?: Array<{ unread?: number }> };
      const totalUnread = (payload?.data ?? []).reduce((sum, conv) => sum + Number(conv.unread ?? 0), 0);
      window.dispatchEvent(new CustomEvent('ut-messages-count-updated', { detail: { unread: totalUnread } }));
    } catch (err) {
      if (isUnauthenticatedError(err)) return;
      console.error('Error updating unread count:', err);
    }
  }, [isReady, user?.id]);

  const loadRecipientUsers = useCallback(async () => {
    if (!isReady || !user?.id) return;
    try {
      setIsLoadingRecipients(true);
      setRecipientFetchError(null);
      const usersPayload = (await apiFetch('/users', { method: 'GET' })) as { data?: any[] } | null;
      const users = usersPayload?.data ?? [];
      const filtered = (users ?? []).filter((recipient) => {
        if (!recipient) return false;
        const roles = recipient.roles ?? [];
        const hasPeerRole = roles.some((role: any) => recipientRoleCodes.includes((role.code ?? role).toString().toLowerCase()));
        return recipient.id !== user?.id && hasPeerRole;
      });
      setRecipientUsers(filtered);
    } catch (err) {
      if (isUnauthenticatedError(err)) return;
      console.error('loadRecipientUsers error', err);
      setRecipientFetchError('No fue posible cargar usuarios');
    } finally {
      setIsLoadingRecipients(false);
    }
  }, [isReady, user?.id]);

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
        setDraftRecipient(null);
        setNewConversationOpen(false);
        setRecipientQuery('');
        await loadMessages(existingConversation.id);
        await markConversationAsRead(existingConversation.id);
        return;
      }

      setDraftRecipient(toDraftRecipient(recipient, peerRoleLabel));
      setSelectedChat(null);
      setReplyingTo(null);
      setMessage("");
      setPendingAttachments([]);
      setNewConversationOpen(false);
      setRecipientQuery('');
    } catch (err) {
      console.error('createConversation error', err);
      toast.error('No fue posible crear la conversación');
    }
  };

  useEffect(() => {
    if (conversations.length > 0 && !isInitialLoad) {
      sessionStorage.setItem(conversationsCacheKey, JSON.stringify(conversations));
    }
  }, [conversations, conversationsCacheKey, isInitialLoad]);

  useEffect(() => {
    if (selectedChat !== null) {
      sessionStorage.setItem(selectedChatCacheKey, String(selectedChat));
      return;
    }
    sessionStorage.removeItem(selectedChatCacheKey);
  }, [selectedChat, selectedChatCacheKey]);

  const normalizeConversation = useCallback((raw: any): Conversation => {
    let displayName = raw.name;
    let participantRole = raw.role;
    let avatarUrl = raw.avatar_url || raw.avatar;
    let avatarFallback = raw.avatar_fallback || '';
    
    if (raw.participants && Array.isArray(raw.participants) && user) {
      const otherParticipant = raw.participants.find((p: any) => p.id !== Number(user.id));
      if (otherParticipant) {
        displayName = otherParticipant.name;
        const otherRole = otherParticipant.role === 'administrador' ? 'Administrador' : 
                         otherParticipant.role === 'tutor' ? 'Tutor' : 'Docente';
        participantRole = otherRole;
        if (otherParticipant.avatar_url || otherParticipant.avatar) {
          avatarUrl = otherParticipant.avatar_url ?? otherParticipant.avatar;
        }
        if (otherParticipant.avatar_fallback) avatarFallback = otherParticipant.avatar_fallback;
      }
    }
    
    const resolvedAvatarFallback = avatarFallback || getInitials(displayName);
    const avatarValue = avatarUrl && isImageUrl(avatarUrl) ? avatarUrl : DEFAULT_AVATAR_PATH;
    
    return {
      id: raw.id,
      name: displayName ?? 'Conversación',
      role: participantRole ?? 'Docente',
      lastMessage: raw.lastMessage ?? raw.last_message ?? 'Nuevo chat',
      timestamp: raw.timestamp ?? raw.lastMessageAt ?? raw.updated_at ?? '',
      unread: Number(raw.unread ?? 0),
      avatar: avatarValue,
      avatarFallback: resolvedAvatarFallback,
      status: raw.status ?? 'offline',
      messages: [],
    };
  }, [user]);

  const normalizeMessage = useCallback((raw: any): ChatMessage => {
    const avatarUrl = raw.avatar_url ?? raw.avatar;
    const avatarFallback = raw.avatar_fallback || getInitials(raw.sender);
    const avatarValue = avatarUrl && isImageUrl(avatarUrl) ? avatarUrl : DEFAULT_AVATAR_PATH;
    
    return {
      id: raw.id,
      sender: raw.sender ?? raw.user_name ?? 'Usuario',
      content: raw.content ?? raw.body ?? '',
      timestamp: raw.timestamp ?? raw.created_at ?? new Date().toISOString(),
      isOwn: Boolean(raw.isOwn || raw.is_own || raw.sender_id === Number(user?.id)),
      avatar: avatarValue,
      attachments: raw.attachments ?? [],
      replyTo: raw.replyTo ?? null,
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isReady || !user?.id) return;

    const savedConversations = sessionStorage.getItem(conversationsCacheKey);
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed.map((conversation: any) => ({
            ...normalizeConversation(conversation),
            messages: Array.isArray(conversation.messages)
              ? conversation.messages.map((message: any) => normalizeMessage(message))
              : [],
          })));
        }
      } catch (e) {
        console.error('Error loading cached conversations', e);
      }
    }
    const savedSelectedChat = sessionStorage.getItem(selectedChatCacheKey);
    if (savedSelectedChat) {
      setSelectedChat(Number(savedSelectedChat));
    }
  }, [conversationsCacheKey, isReady, normalizeConversation, normalizeMessage, selectedChatCacheKey, user?.id]);

  const loadConversations = useCallback(async () => {
    if (!isReady || !user?.id) return [];
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
      setSelectedChat((prev) => {
        const saved = sessionStorage.getItem(selectedChatCacheKey);
        const currentCandidate = prev ?? (saved ? Number(saved) : null);
        if (
          currentCandidate !== null
          && Number.isFinite(currentCandidate)
          && convs.some((conversation) => conversation.id === currentCandidate)
        ) {
          return currentCandidate;
        }
        if (saved && !convs.some((conversation) => conversation.id === Number(saved))) {
          sessionStorage.removeItem(selectedChatCacheKey);
        }
        return convs.length > 0 ? convs[0].id : null;
      });
      setIsInitialLoad(false);
      await updateUnreadCount();
      window.dispatchEvent(new Event('ut-messages-updated'));
      return convs;
    } catch (err) {
      if (isUnauthenticatedError(err)) {
        setConversations([]);
        setSelectedChat(null);
        return [];
      }
      console.error('loadConversations error', err);
      setIsInitialLoad(false);
      return [];
    }
  }, [isReady, normalizeConversation, selectedChatCacheKey, updateUnreadCount, user?.id]);

  const loadMessages = useCallback(async (conversationId: number) => {
    if (!isReady || !user?.id) return [];
    try {
      const payload = (await apiFetch(`/conversations/${conversationId}/messages`, { method: 'GET' })) as { data?: any[] };
      const rows = payload?.data ?? [];
      const msgs = rows.map(normalizeMessage);
      setConversations((current) => current.map((c) => (c.id === conversationId ? { ...c, messages: msgs } : c)));
      deniedConversationIdsRef.current.delete(conversationId);
      return msgs;
    } catch (err) {
      if (isUnauthenticatedError(err)) {
        setSelectedChat(null);
        return [];
      }
      if (isConversationAccessDenied(err)) {
        setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
        setSuppressedChatIds((current) => current.filter((id) => id !== conversationId));
        setSelectedChat((current) => (current === conversationId ? null : current));
        if (!deniedConversationIdsRef.current.has(conversationId)) {
          deniedConversationIdsRef.current.add(conversationId);
          toast.error('La conversación seleccionada ya no está disponible para tu usuario.');
        }
      }
      console.error('loadMessages error', err);
      return [];
    }
  }, [isReady, normalizeMessage, user?.id]);

  const markConversationAsRead = useCallback(async (conversationId: number) => {
    if (!isReady || !user?.id) return;
    try {
      await apiFetch(`/conversations/${conversationId}/read`, { method: 'PATCH' });
      setConversations((current) => current.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
      await updateUnreadCount();
      window.dispatchEvent(new Event('ut-messages-updated'));
    } catch (err) {
      if (isUnauthenticatedError(err)) return;
      if (isConversationAccessDenied(err)) {
        setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
        setSuppressedChatIds((current) => current.filter((id) => id !== conversationId));
        setSelectedChat((current) => (current === conversationId ? null : current));
      }
      console.error('Error marking conversation as read:', err);
    }
  }, [isReady, updateUnreadCount, user?.id]);

  const resolveTeacherAdminDraft = useCallback(async () => {
    if (!isTeacher) return;
    try {
      const peerPayload = (await apiFetch('/conversations/peer', { method: 'GET' })) as { data?: any } | null;
      const peer = peerPayload?.data ?? null;
      if (peer) {
        setDraftRecipient(toDraftRecipient(peer, "Administrador"));
        return;
      }

      const usersPayload = (await apiFetch('/users', { method: 'GET' })) as { data?: any[] } | null;
      const users = usersPayload?.data ?? [];
      const admin = users.find((u: any) =>
        (u.roles ?? []).some((r: any) => (r.code ?? r).toString().toLowerCase() === 'administrador')
      );
      if (admin) {
        setDraftRecipient(toDraftRecipient(admin, "Administrador"));
        return;
      }
      setDraftRecipient({
        id: 0,
        name: "Administrador",
        role: "Administrador",
        avatar: DEFAULT_AVATAR_PATH,
        avatarFallback: "AD",
        status: "offline",
      });
    } catch (err) {
      console.error('Error resolving teacher admin draft recipient:', err);
      setDraftRecipient({
        id: 0,
        name: "Administrador",
        role: "Administrador",
        avatar: DEFAULT_AVATAR_PATH,
        avatarFallback: "AD",
        status: "offline",
      });
    }
  }, [isTeacher, toDraftRecipient]);

  const loadMessagesRef = useRef(loadMessages);
  const loadConversationsRef = useRef(loadConversations);

  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);
  useEffect(() => { loadConversationsRef.current = loadConversations; }, [loadConversations]);

  useEffect(() => {
    if (!isReady || !user?.id || !selectedChat) return;
    const interval = setInterval(() => {
      void loadMessagesRef.current(selectedChat);
      void loadConversationsRef.current();
    }, 3000);
    return () => clearInterval(interval);
  }, [isReady, selectedChat, user?.id]);

  // Carga inicial: obtener conversaciones. Si docente no tiene chat con admin, solo preparar borrador.
  useEffect(() => {
    if (!isReady) return;
    void (async () => {
      const convs = await loadConversations();
      if (!isTeacher) return;
      const hasAdminConv = convs.some((conversation) => conversation.role === "Administrador");
      if (!hasAdminConv) {
        await resolveTeacherAdminDraft();
      } else {
        setDraftRecipient(null);
      }
    })();
  }, [isReady, isTeacher, loadConversations, resolveTeacherAdminDraft]);

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
      void markConversationAsRead(conversationId);
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
          setDraftRecipient(null);
          if (document) await apiFetch(`/conversations/${found.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: `Te comparto el documento: ${document.title}` }),
          });
          await loadMessages(found.id);
          await markConversationAsRead(found.id);
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

        if (recipient && document) {
          const created = (await apiFetch('/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_user_id: recipient.id }),
          })) as { data?: any };
          const conversationId = created?.data?.id ?? null;

          if (conversationId) {
            await loadConversations();
            setSelectedChat(conversationId);
            setDraftRecipient(null);
            await apiFetch(`/conversations/${conversationId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ body: `Te comparto el documento: ${document.title}` }),
            });
            await loadMessages(conversationId);
            await markConversationAsRead(conversationId);
          }
        } else if (recipient) {
          setDraftRecipient(toDraftRecipient(recipient, recipientRole ? recipientRole : peerRoleLabel));
          setSelectedChat(null);
        }

        onConsume?.();
      } catch (err) {
        console.error('openInitialConversation error', err);
      }
    })();
  }, [conversations, loadConversations, loadMessages, markConversationAsRead, onConsume, peerRoleLabel, toDraftRecipient]);

  React.useEffect(() => {
    if (!initialOpen) return;
    processInitialOpen(initialOpen);
  }, [initialOpen, processInitialOpen]);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesRole = peerRoleLabels.includes(conversation.role);
      const notSuppressed = !suppressedChatIds.includes(conversation.id);
      const matchesSearch = !normalizedSearch ||
        [conversation.name, conversation.role, conversation.lastMessage].some((value) => 
          value?.toLowerCase().includes(normalizedSearch)
        );
      return matchesRole && matchesSearch && notSuppressed;
    });
  }, [conversations, search, suppressedChatIds]);

  const suppressedConversations = useMemo(() => {
    return conversations.filter((conversation) => (
      peerRoleLabels.includes(conversation.role) && suppressedChatIds.includes(conversation.id)
    ));
  }, [conversations, suppressedChatIds]);

  useEffect(() => {
    const validSuppressedIds = new Set(
      conversations
        .filter((conversation) => peerRoleLabels.includes(conversation.role))
        .map((conversation) => conversation.id)
    );

    setSuppressedChatIds((current) => {
      const next = current.filter((id) => validSuppressedIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [conversations]);

  const selectedConversation = selectedChat !== null
    ? filteredConversations.find((conversation) => conversation.id === selectedChat)
    : undefined;
  const fallbackConversation = selectedChat === null && !draftRecipient ? filteredConversations[0] : undefined;
  const activeConversation = selectedConversation ?? fallbackConversation;
  const targetConversation = activeConversation ?? (draftRecipient ? draftToConversation(draftRecipient) : undefined);
  const activeConversationAvatarUrl = useResolvedAvatarUrl(targetConversation?.avatar);

  const suppressConversation = useCallback((conversationId: number) => {
    setSuppressedChatIds((current) => (current.includes(conversationId) ? current : [...current, conversationId]));
    if (selectedChat === conversationId) {
      setSelectedChat(null);
      setReplyingTo(null);
    }
    toast.success("Chat suprimido de la lista");
  }, [selectedChat]);

  const restoreSuppressedConversation = useCallback((conversationId: number) => {
    setSuppressedChatIds((current) => current.filter((id) => id !== conversationId));
    toast.success("Chat restaurado en la lista");
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedChat, targetConversation?.messages.length]);

  useEffect(() => {
    if (draftRecipient) return;

    if (selectedChat !== null) {
      const exists = filteredConversations.some((conversation) => conversation.id === selectedChat);
      if (!exists) {
        setSelectedChat(filteredConversations[0]?.id ?? null);
      }
      return;
    }

    if (filteredConversations.length > 0) {
      setSelectedChat(filteredConversations[0].id);
    }
  }, [draftRecipient, filteredConversations, selectedChat]);

  const updateConversation = (conversationId: number, updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => current.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)));
  };

  const handleConversationSelect = (conversationId: number) => {
    setSelectedChat(conversationId);
    setDraftRecipient(null);
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
      file,
      name: file.name,
      sizeLabel: formatSize(file.size),
      typeLabel: file.type || "Archivo",
    }));
    setPendingAttachments((current) => [...current, ...attachments]);
    event.target.value = "";
  };

  const addFiles = (files: File[]) => {
    const attachments = files.map((file) => ({
      file,
      name: file.name,
      sizeLabel: formatSize(file.size),
      typeLabel: file.type || "Archivo",
    }));
    setPendingAttachments((current) => [...current, ...attachments]);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && pendingAttachments.length === 0) return;

    (async () => {
      try {
        let targetConversationId = selectedChat;

        if (!targetConversationId) {
          const createPayload = draftRecipient && draftRecipient.id > 0
            ? { recipient_user_id: draftRecipient.id }
            : isTeacher
            ? {}
            : null;

          if (!createPayload) {
            toast.error('Selecciona un chat o destinatario para enviar el mensaje');
            return;
          }

          const created = (await apiFetch('/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload),
          })) as { data?: any };
          targetConversationId = Number(created?.data?.id ?? 0) || null;
        }

        if (!targetConversationId) {
          toast.error('Selecciona un chat o destinatario para enviar el mensaje');
          return;
        }

        const formData = new FormData();
        formData.append('body', trimmedMessage || (pendingAttachments.length > 0 ? 'Adjunto enviado' : ''));
        if (replyingTo?.id) {
          formData.append('reply_to_message_id', String(replyingTo.id));
        }
        pendingAttachments.forEach((attachment) => {
          if (attachment.file) {
            formData.append('attachments[]', attachment.file, attachment.file.name);
          }
        });

        await apiFetch(`/conversations/${targetConversationId}/messages`, {
          method: 'POST',
          body: formData,
        });
        setMessage('');
        setPendingAttachments([]);
        setReplyingTo(null);
        setIsTyping(false);
        setDraftRecipient(null);
        setSelectedChat(targetConversationId);
        await Promise.all([loadMessages(targetConversationId), loadConversations()]);
        await markConversationAsRead(targetConversationId);
      } catch (err) {
        if (targetConversationId && isConversationAccessDenied(err)) {
          setConversations((current) => current.filter((conversation) => conversation.id !== targetConversationId));
          setSuppressedChatIds((current) => current.filter((id) => id !== targetConversationId));
          setSelectedChat((current) => (current === targetConversationId ? null : current));
          toast.error('No tienes acceso a esta conversación. Se actualizará la lista de chats.');
          await loadConversations();
          return;
        }
        console.error('send message error', err);
      }
    })();
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      await apiFetch(`/conversations/${selectedChat}/messages/${messageId}`, { method: 'DELETE' });
      await Promise.all([loadMessages(selectedChat), loadConversations()]);
      await updateUnreadCount();
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

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA DOCENTE
  // ─────────────────────────────────────────────────────────────────────────────
  if (isTeacher) {
    const adminConversation = targetConversation;

    return (
      <div className="flex h-[calc(100dvh-1.5rem)] min-h-0 flex-col gap-5 overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1>Mensajes</h1>
            <p className="max-w-2xl text-sm text-muted-foreground hidden sm:block">Mensajería interna con el Administrador</p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-1">
          <Card className="flex min-h-0 flex-col overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
            <CardHeader className="border-b border-border/60 bg-background/80 pb-4">
              {adminConversation ? (
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                    {activeConversationAvatarUrl ? (
                      <AvatarImage 
                        src={activeConversationAvatarUrl} 
                        alt={adminConversation.name} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-sm font-medium">
                        {adminConversation.avatarFallback || getInitials(adminConversation.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{adminConversation.name}</CardTitle>
                      {adminConversation.unread > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[11px]">
                          {adminConversation.unread}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{adminConversation.role}</span>
                      <span>{adminConversation.timestamp}</span>
                    </CardDescription>
                  </div>
                </div>
              ) : (
                <div>
                  <CardTitle className="text-base">Chat con Administrador</CardTitle>
                  <CardDescription>Escribe el primer mensaje para iniciar el chat con administración.</CardDescription>
                </div>
              )}
            </CardHeader>

            <CardContent className="min-h-0 flex-1 p-0">
              {adminConversation ? (
                <ScrollArea className="h-full bg-gradient-to-b from-slate-50/60 via-white to-cyan-50/40 px-3 py-4 pr-2 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20">
                  <div className="space-y-4 pb-2 pt-1">
                    {adminConversation.messages.length > 0 ? (
                      adminConversation.messages.map((messageItem) => (
                        <MessageBubble 
                          key={messageItem.id}
                          message={messageItem} 
                          onReply={setReplyingTo} 
                          onDelete={handleDeleteMessage} 
                          onEdit={handleEditMessage} 
                        />
                      ))
                    ) : (
                      <EmptyConversationState
                        title="Sin mensajes aún"
                        description="Escribe el primer mensaje para iniciar la conversación con el administrador."
                      />
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              ) : (
                <EmptyConversationState
                  title="Preparando tu chat..."
                  description="Estamos conectando tu chat con el administrador, un momento por favor."
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
                  <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancelar respuesta" className="rounded-full p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
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
                  className="min-h-[88px] resize-none rounded-[1.35rem] border-border/70 bg-background/90 px-4 py-3 shadow-inner dark:bg-slate-900 dark:border-slate-700"
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

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA ADMINISTRADOR
  // ─────────────────────────────────────────────────────────────────────────────
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
              {suppressedConversations.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setRestoreDialogOpen(true)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Restaurar ({suppressedConversations.length})
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o mensaje..." className="pl-9" />
            </div>
            {(user?.role === "administrador" || user?.roles?.includes("administrador")) && (
              <div className="flex items-center justify-end">
                <Button variant="secondary" size="sm" onClick={() => setNewConversationOpen(true)}>
                  Nuevo chat
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-full pr-1">
              {filteredConversations.length > 0 ? (
                <div className="space-y-1.5 py-2">
                  {filteredConversations.map((conversation) => (
                    <ConversationRow
                      key={`${conversation.id}-${avatarVersion}`}
                      conversation={conversation}
                      active={selectedChat === conversation.id}
                      onSelect={handleConversationSelect}
                      onSuppress={suppressConversation}
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
              <DialogDescription>Selecciona un {peerRoleLabel.toLowerCase()}. El chat se creará cuando se envíe el primer mensaje.</DialogDescription>
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
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Cargando...
                </div>
              ) : recipientFetchError ? (
                <p className="text-sm text-destructive">{recipientFetchError}</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-background/80 p-3">
                  {filteredRecipientUsers.length > 0 ? (
                    filteredRecipientUsers.map((recipient) => {
                      const recipientName = recipient.full_name ?? recipient.name ?? "Usuario";
                      const recipientAvatarUrl = recipient.avatar_url ?? recipient.avatar ?? null;
                      const recipientAvatar = recipientAvatarUrl && isImageUrl(recipientAvatarUrl) ? recipientAvatarUrl : DEFAULT_AVATAR_PATH;
                      const recipientAvatarFallback = recipient.avatar_fallback ?? getInitials(recipientName);

                      return (
                        <button
                          key={recipient.id}
                          type="button"
                          onClick={() => handleCreateConversation(recipient)}
                          className="w-full rounded-xl border border-border/60 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/80"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-1 ring-white/80 dark:ring-slate-900/60">
                              <AvatarImage src={recipientAvatar} alt={recipientName} className="h-full w-full object-cover" />
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium">
                                {recipientAvatarFallback}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{recipientName}</p>
                              <p className="text-sm text-muted-foreground">{peerRoleLabel}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No se encontraron usuarios.</p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restaurar chats suprimidos</DialogTitle>
              <DialogDescription>
                Selecciona qué chat deseas restaurar. No se restauran todos automáticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-background/80 p-3">
              {suppressedConversations.length > 0 ? (
                suppressedConversations.map((conversation) => (
                  <SuppressedConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    onRestore={restoreSuppressedConversation}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay chats suprimidos para restaurar.</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="flex min-h-0 flex-col overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
          <CardHeader className="border-b border-border/60 bg-background/80 pb-4">
            {targetConversation ? (
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                  {activeConversationAvatarUrl ? (
                    <AvatarImage 
                      src={activeConversationAvatarUrl}
                      alt={targetConversation.name}
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-sm font-medium">
                      {targetConversation.avatarFallback || getInitials(targetConversation.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{targetConversation.name}</CardTitle>
                    {targetConversation.unread > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[11px]">
                        {targetConversation.unread}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{targetConversation.role}</span>
                    {targetConversation.timestamp && <span>{targetConversation.timestamp}</span>}
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
            {targetConversation ? (
              <ScrollArea className="h-full bg-gradient-to-b from-slate-50/60 via-white to-cyan-50/40 px-3 py-4 pr-2 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20">
                <div className="space-y-4 pb-2 pt-1">
                  {targetConversation.messages.length > 0 ? (
                    targetConversation.messages.map((messageItem) => (
                      <MessageBubble 
                        key={messageItem.id}
                        message={messageItem} 
                        onReply={setReplyingTo} 
                        onDelete={handleDeleteMessage} 
                        onEdit={handleEditMessage} 
                      />
                    ))
                  ) : (
                    <EmptyConversationState
                      title="Sin mensajes"
                      description="Esta conversación se creará cuando se envíe el primer mensaje."
                    />
                  )}
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
                <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancelar respuesta" className="rounded-full p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
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
                className="min-h-[88px] resize-none rounded-[1.35rem] border-border/70 bg-background/90 px-4 py-3 shadow-inner dark:bg-slate-900 dark:border-slate-700"
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