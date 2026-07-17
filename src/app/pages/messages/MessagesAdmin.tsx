import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { ChevronDown, ChevronLeft, CornerUpLeft, Paperclip, PencilLine, Plus, Search, Send, X, Trash, EyeOff, Eye, MessageSquareX } from "lucide-react";
import { cn } from "../../../lib/utils";
import downloadIcon from "../../../assets/icons/download-circle.svg";
import apiFetch from "../../lib/api";
import { resolveApiAssetUrl, AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";
import { fetchDocumentBlob, getDocumentFileUrl } from "../../lib/documents";
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
  documentId?: number;
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

async function tryFetchAndOpen(url: string) {
  try {
    const headers: Record<string, string> = {};
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
    if (!res.ok) throw new Error('Network response not ok');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
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
  rawTimestamp?: string;
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
  peerUserId?: number;
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

// Sonora / Hermosillo = UTC-7, sin horario de verano
const MST_OFFSET_MS = -7 * 60 * 60 * 1000;

const toMSTDate = (utcDate: Date): Date => new Date(utcDate.getTime() + MST_OFFSET_MS);

const parseUTC = (raw: string): Date | null => {
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZ = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : normalized + 'Z';
  const d = new Date(withZ);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmt12h = (local: Date): string => {
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
};

const formatMessageTimestamp = (raw: string): string => {
  const utc = parseUTC(raw);
  return utc ? fmt12h(toMSTDate(utc)) : raw;
};

const formatConversationTimestamp = (raw: string): string => {
  if (!raw) return '';
  const utc = parseUTC(raw);
  if (!utc) return raw;
  const local = toMSTDate(utc);
  const now = toMSTDate(new Date());
  const localDay = Math.floor(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) / 86400000);
  const nowDay  = Math.floor(Date.UTC(now.getUTCFullYear(),  now.getUTCMonth(),  now.getUTCDate())  / 86400000);
  const diff = nowDay - localDay;
  if (diff === 0) return fmt12h(local);
  if (diff === 1) return 'Ayer';
  if (diff < 7) {
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return dias[local.getUTCDay()];
  }
  return `${String(local.getUTCDate()).padStart(2,'0')}/${String(local.getUTCMonth()+1).padStart(2,'0')}/${local.getUTCFullYear()}`;
};

const formatDateSeparator = (raw: string): string => {
  const utc = parseUTC(raw);
  if (!utc) return raw;
  const local = toMSTDate(utc);
  return `${String(local.getUTCDate()).padStart(2, '0')}/${String(local.getUTCMonth() + 1).padStart(2, '0')}/${local.getUTCFullYear()}`;
};

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getTimeLabel = () => fmt12h(toMSTDate(new Date()));

const parseMessageDate = (timestamp: string) => {
  const normalized = timestamp.includes("T") ? timestamp : timestamp.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const canEditMessage = (timestamp: string) => {
  const parsed = parseMessageDate(timestamp);
  if (!parsed) return false;
  return Date.now() - parsed.getTime() <= 15 * 60 * 1000;
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

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-4 py-1 text-xs font-medium text-muted-foreground bg-muted/60 rounded-full dark:bg-slate-800/60 dark:text-slate-400">
        {date}
      </span>
    </div>
  );
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
            <AvatarImage src={imageUrl ?? DEFAULT_AVATAR_PATH} alt={conversation.name} className="h-full w-full object-cover" />
            <AvatarFallback className="bg-transparent p-0 overflow-hidden">
              <img src={DEFAULT_AVATAR_PATH} alt={conversation.name} className="h-full w-full object-cover" />
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            conversation.status === "online" ? "bg-emerald-500" :
            conversation.status === "away"   ? "bg-amber-500"   : "bg-slate-400"
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="truncate text-sm font-semibold text-foreground dark:text-white">{conversation.name}</p>
              <p className="text-[11px] text-muted-foreground dark:text-slate-400">{conversation.role}</p>
            </div>
            {conversation.unread > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[11px]">
                {conversation.unread}
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground dark:text-slate-400">{conversation.lastMessage}</p>
          {conversation.lastMessage && conversation.lastMessage !== 'Nuevo chat' && (
            <p className="mt-1 text-[11px] text-muted-foreground/90 dark:text-slate-500">{formatConversationTimestamp(conversation.timestamp)}</p>
          )}
        </div>
      </div>
    </div>
  );
});

const RecipientRow = React.memo(({
  recipient,
  peerRoleLabel,
  onClick,
}: {
  recipient: any;
  peerRoleLabel: string;
  onClick: () => void;
}) => {
  const recipientName = recipient.full_name ?? recipient.name ?? "Usuario";
  const recipientAvatarUrl = recipient.avatar_url ?? recipient.avatar ?? null;
  const rawAvatar = recipientAvatarUrl && isImageUrl(recipientAvatarUrl) ? recipientAvatarUrl : null;
  const imageUrl = useResolvedAvatarUrl(rawAvatar);

  return (
    <button
      key={recipient.id}
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border/60 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-slate-700/60 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 ring-1 ring-white/80 dark:ring-slate-900/60">
          {imageUrl && (
            <AvatarImage src={imageUrl} alt={recipientName} className="h-full w-full object-cover" />
          )}
          <AvatarFallback className="bg-transparent p-0 overflow-hidden">
            <img src={DEFAULT_AVATAR_PATH} alt={recipientName} className="h-full w-full object-cover" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold dark:text-white">{recipientName}</p>
          <p className="text-sm text-muted-foreground dark:text-slate-400">{peerRoleLabel}</p>
        </div>
      </div>
    </button>
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
    <div className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50 dark:hover:bg-slate-800/40">
      <div className="min-w-0 flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={imageUrl ?? DEFAULT_AVATAR_PATH} alt={conversation.name} className="h-full w-full object-cover" />
          <AvatarFallback className="bg-transparent p-0 overflow-hidden">
            <img src={DEFAULT_AVATAR_PATH} alt={conversation.name} className="h-full w-full object-cover" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold dark:text-white">{conversation.name}</p>
          <p className="text-xs text-muted-foreground dark:text-slate-400 truncate">{conversation.role}</p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="shrink-0 h-8 px-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
        onClick={() => onRestore(conversation.id)}
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
  const editable = message.isOwn && canEditMessage(message.rawTimestamp ?? message.timestamp);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const imageUrl = useResolvedAvatarUrl(message.avatar);
  const showImage = !!imageUrl;
  const senderInitials = getInitials(message.sender);

  useEffect(() => {
    if (editOpen) setEditBody(message.content);
  }, [editOpen, message.content]);

  return (
    <div className={cn("flex w-full min-w-0 items-end", message.isOwn ? "justify-end" : "justify-start")}>
      {!message.isOwn && (
        <div className="mr-2 mt-0.5 shrink-0">
          <Avatar className="h-8 w-8 ring-1 ring-white/80 dark:ring-slate-900/50">
            <AvatarImage src={imageUrl ?? DEFAULT_AVATAR_PATH} alt={message.sender} className="h-full w-full object-cover" />
            <AvatarFallback className="bg-transparent p-0 overflow-hidden">
              <img src={DEFAULT_AVATAR_PATH} alt={message.sender} className="h-full w-full object-cover" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div
        className={cn(
          "max-w-[78%] min-w-0 overflow-hidden rounded-2xl px-4 py-3 shadow-sm relative",
          message.isOwn
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
            : cn("bg-white/95 border border-border/70 text-foreground", isDark && "bg-slate-800/95 border-slate-700 text-slate-200")
        )}
        title={message.timestamp}
      >
        <div className={cn("text-xs font-medium mb-1", message.isOwn ? "text-white/80" : "text-muted-foreground")}>
          {!message.isOwn && message.sender}
        </div>

        {message.replyTo && (
          <div className={cn(
            "mb-2 rounded-lg border-l-4 px-3 py-1.5 text-xs cursor-default select-none",
            message.isOwn
              ? "border-white/50 bg-white/10"
              : "border-emerald-400 bg-emerald-50/80 dark:border-emerald-600 dark:bg-emerald-950/40"
          )}>
            <p className={cn("font-semibold mb-0.5 truncate", message.isOwn ? "text-white/90" : "text-emerald-700 dark:text-emerald-400")}>
              {message.replyTo.sender}
            </p>
            <p className={cn("line-clamp-2 leading-snug", message.isOwn ? "text-white/70" : "text-muted-foreground dark:text-slate-400")}>
              {message.replyTo.content}
            </p>
          </div>
        )}

        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={`${message.id}-${attachment.name}`} className="flex items-center gap-2 rounded-lg border p-2 text-sm bg-muted/40 dark:bg-slate-700/40 dark:border-slate-700 min-w-0 overflow-hidden">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
                <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="truncate font-medium dark:text-slate-200">
                      {attachment.url ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const resolved = resolveApiAssetUrl(attachment.url!);
                            const ok = await tryFetchAndOpen(resolved!);
                            if (!ok) window.open(resolved, '_blank', 'noopener');
                          }}
                          className="block w-full truncate text-left underline hover:text-emerald-700 dark:hover:text-emerald-300"
                        >
                          {attachment.name}
                        </button>
                      ) : (
                        <span className="block truncate">{attachment.name}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">{attachment.typeLabel} • {attachment.sizeLabel}</p>
                  </div>

                  {attachment.url && (
                    <button
                      type="button"
                      onClick={async () => {
                        const resolved = resolveApiAssetUrl(attachment.url!);
                        const ok = await tryFetchAndDownload(resolved!, attachment.name);
                        if (!ok) window.open(resolved, '_blank', 'noopener');
                      }}
                      className="shrink-0 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300"
                      title={`Descargar ${attachment.name}`}
                    >
                      <img src={downloadIcon} alt="Descargar" className="h-4 w-4" />
                    </button>
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
                <DialogContent className="dark:bg-slate-950 dark:border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="dark:text-white">Eliminar mensaje</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">¿Seguro que deseas eliminar este mensaje? Esta acción no se puede deshacer.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" className="dark:border-slate-700 dark:text-white dark:hover:bg-slate-800" onClick={() => setRemoveOpen(false)}>Cancelar</Button>
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
          <DialogContent className="dark:bg-slate-950 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Editar mensaje</DialogTitle>
              <DialogDescription className="dark:text-slate-400">Modifica el contenido del mensaje y guarda los cambios.</DialogDescription>
            </DialogHeader>
            <Textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} className="min-h-[120px] dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500" />
            <DialogFooter>
              <Button variant="outline" className="dark:border-slate-700 dark:text-white dark:hover:bg-slate-800" onClick={() => setEditOpen(false)}>Cancelar</Button>
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

function EmptyConversationState({ title, description, iconOnly }: Readonly<{ title: string; description?: string; iconOnly?: boolean }>) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="flex h-full min-h-[260px] items-center justify-center px-6 py-10 text-center">
      <div className={cn("max-w-sm space-y-3 rounded-3xl border border-dashed p-6 shadow-sm", isDark ? "border-emerald-800 bg-slate-900/60" : "border-emerald-200 bg-white/70")}>
        {iconOnly && (
          <div className="flex justify-center">
            <MessageSquareX className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-1 py-2" aria-busy="true" aria-label="Cargando conversaciones">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="mx-2 my-1 animate-pulse rounded-2xl border border-transparent px-3 py-3.5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3 w-3/5 rounded-full bg-muted" />
              <div className="h-2.5 w-2/5 rounded-full bg-muted" />
              <div className="h-2.5 w-full rounded-full bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageListSkeleton() {
  return (
    <div className="space-y-4 px-4 pb-2 pt-3" aria-busy="true" aria-label="Cargando mensajes">
      <div className="flex animate-pulse items-end gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
        <div className="h-14 w-2/5 rounded-2xl bg-muted" />
      </div>
      <div className="flex animate-pulse items-end justify-end">
        <div className="h-20 w-1/2 rounded-2xl bg-muted" />
      </div>
      <div className="flex animate-pulse items-end gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
        <div className="h-10 w-1/3 rounded-2xl bg-muted" />
      </div>
      <div className="flex animate-pulse items-end justify-end">
        <div className="h-16 w-2/5 rounded-2xl bg-muted" />
      </div>
      <div className="flex animate-pulse items-end gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
        <div className="h-12 w-3/5 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

const groupMessagesByDate = (messages: ChatMessage[]) => {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';
  messages.forEach((msg) => {
    const date = formatDateSeparator(msg.rawTimestamp || msg.timestamp);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  });
  return groups;
};

export function MessagesAdmin(props: Readonly<{
  initialOpen?: { conversationId?: number; recipientName?: string; recipientRole?: string; document?: { id: number; title: string; filePath?: string } } | null;
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
  const [hasProcessedInitialOpen, setHasProcessedInitialOpen] = useState(false);
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
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [confirmedLoadedChatId, setConfirmedLoadedChatId] = useState<number | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const prevScrollMsgLenRef = useRef<number>(0);
  const prevScrollChatRef = useRef<number | null>(null);

  const peerRoleLabel = "Docente";
  const recipientRoleCodes = ["docente", "tutor"];
  const peerRoleLabels = ["Docente", "Tutor"];
  const isTeacher = false;
  const suppressionStorageKey = `ut-suppressed-chats:${user?.id ?? "anon"}`;
  const suppressionStorageKeyRef = useRef(suppressionStorageKey);
  suppressionStorageKeyRef.current = suppressionStorageKey;
  const suppressionMountedRef = useRef(true);
  const conversationsCacheKey = `chat_conversations:admin:${user?.id ?? "anon"}`;
  const selectedChatCacheKey = `chat_selected_chat:admin:${user?.id ?? "anon"}`;

  const toDraftRecipient = useCallback((raw: any, fallbackRole: string): DraftRecipient => {
    const rawName = (raw?.full_name ?? raw?.name ?? "Usuario") as string;
    const roleCode = (raw?.role ?? raw?.roles?.[0]?.code ?? raw?.roles?.[0] ?? "").toString().toLowerCase();
    const role = roleCode === "administrador" ? "Administrador" : roleCode === "tutor" ? "Tutor" : fallbackRole;
    const avatarUrl = raw?.avatar_url ?? raw?.avatar ?? null;
    const toPath = (u: string) => { try { return u.startsWith("http") ? new URL(u).pathname : u; } catch { return u; } };
    return {
      id: Number(raw?.id ?? 0),
      name: rawName,
      role,
      avatar: avatarUrl && isImageUrl(avatarUrl) ? toPath(avatarUrl) : DEFAULT_AVATAR_PATH,
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
    if (suppressionMountedRef.current) {
      suppressionMountedRef.current = false;
      return;
    }
    localStorage.setItem(suppressionStorageKeyRef.current, JSON.stringify(suppressedChatIds));
  }, [suppressedChatIds]);

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

  const existingConversationPeerIds = useMemo(() => {
    return new Set(conversations.map((c) => c.peerUserId).filter(Boolean));
  }, [conversations]);

  const recipientUsersWithoutConversation = useMemo(() => {
    return recipientUsers.filter((recipient) => !existingConversationPeerIds.has(Number(recipient.id)));
  }, [recipientUsers, existingConversationPeerIds]);

  const filteredRecipientUsers = useMemo(() => {
    const normalizedSearch = recipientQuery.trim().toLowerCase();
    return recipientUsersWithoutConversation.filter((recipient) => {
      const fullName = ((recipient.full_name ?? recipient.name ?? '') as string).toLowerCase();
      return !normalizedSearch || fullName.includes(normalizedSearch);
    });
  }, [recipientQuery, recipientUsersWithoutConversation]);

  const handleCreateConversation = async (recipient: any) => {
    try {
      const recipientId = Number(recipient.id ?? 0);
      const existingConversation = recipientId > 0
        ? conversations.find((c) => c.peerUserId === recipientId)
        : conversations.find((c) => c.name.trim().toLowerCase() === ((recipient.full_name ?? recipient.name ?? '') as string).trim().toLowerCase());
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
    let peerUserId: number | undefined;

    if (raw.participants && Array.isArray(raw.participants) && user) {
      const otherParticipant = raw.participants.find((p: any) => p.id !== Number(user.id));
      if (otherParticipant) {
        peerUserId = Number(otherParticipant.id);
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
    const toPath = (u: string) => { try { return u.startsWith("http") ? new URL(u).pathname : u; } catch { return u; } };
    const avatarValue = avatarUrl && isImageUrl(avatarUrl) ? toPath(avatarUrl) : DEFAULT_AVATAR_PATH;

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
      peerUserId,
    };
  }, [user]);

  const normalizeMessage = useCallback((raw: any): ChatMessage => {
    const avatarUrl = raw.avatar_url ?? raw.avatar;
    const avatarFallback = raw.avatar_fallback || getInitials(raw.sender);
    const toPath = (u: string) => { try { return u.startsWith("http") ? new URL(u).pathname : u; } catch { return u; } };
    const avatarValue = avatarUrl && isImageUrl(avatarUrl) ? toPath(avatarUrl) : DEFAULT_AVATAR_PATH;
    const rawTs = raw.rawTimestamp ?? raw.created_at ?? raw.timestamp ?? new Date().toISOString();

    return {
      id: raw.id,
      sender: raw.sender ?? raw.user_name ?? 'Usuario',
      content: raw.content ?? raw.body ?? '',
      timestamp: formatMessageTimestamp(rawTs),
      rawTimestamp: rawTs,
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
    } finally {
      setConfirmedLoadedChatId(conversationId);
    }
  }, [isReady, normalizeMessage, user?.id]);

  const markConversationAsRead = useCallback(async (conversationId: number) => {
    if (!isReady || !user?.id) return;
    try {
      await apiFetch(`/conversations/${conversationId}/read`, { method: 'PATCH' });
      setConversations((current) => current.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
      // Calcular el nuevo total localmente para no hacer una llamada API extra
      const newTotal = conversationsRef.current.reduce(
        (sum, c) => sum + (c.id === conversationId ? 0 : (c.unread || 0)),
        0
      );
      window.dispatchEvent(new CustomEvent('ut-messages-count-updated', { detail: { unread: newTotal } }));
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
  }, [isReady, user?.id]);

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
  const conversationsRef = useRef(conversations);
  const markConversationAsReadRef = useRef(markConversationAsRead);

  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);
  useEffect(() => { loadConversationsRef.current = loadConversations; }, [loadConversations]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { markConversationAsReadRef.current = markConversationAsRead; }, [markConversationAsRead]);

  useEffect(() => {
    if (!isReady || !user?.id) return;
    const interval = setInterval(() => {
      void loadConversationsRef.current();
    }, 5000);
    return () => clearInterval(interval);
  }, [isReady, user?.id]);

  useEffect(() => {
    if (!isReady || !user?.id || !selectedChat) return;
    const interval = setInterval(() => {
      void loadMessagesRef.current(selectedChat);
    }, 3000);
    return () => clearInterval(interval);
  }, [isReady, selectedChat, user?.id]);

  // Cuando la carga inicial termina y hay una conversación seleccionada:
  // marcar como leída (para bajar el badge de inmediato) y cargar mensajes si no hay en caché.
  const initialMessageLoadedRef = useRef(false);
  useEffect(() => {
    if (isInitialLoad || initialMessageLoadedRef.current || !selectedChat) return;
    initialMessageLoadedRef.current = true;
    void markConversationAsReadRef.current(selectedChat);
    const conv = conversations.find(c => c.id === selectedChat);
    if (conv?.messages.length) return;
    setIsLoadingMessages(true);
    void loadMessagesRef.current(selectedChat)
      .then(() => setIsLoadingMessages(false))
      .catch(() => setIsLoadingMessages(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad, selectedChat]);

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

  const processInitialOpen = useCallback(async (detail: NonNullable<typeof initialOpen>) => {
    const { conversationId, recipientName, recipientRole, document } = detail;
    const toAttachmentName = (title: string) =>
      title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;

    const buildDocumentAttachment = (doc: { id: number; title: string; filePath?: string }): AttachmentItem => ({
      documentId: doc.id,
      name: toAttachmentName(doc.title),
      sizeLabel: "—",
      typeLabel: "Documento PDF",
      url: doc.filePath || undefined,
    });

    const addDocumentAsPending = (doc: { id: number; title: string; filePath?: string }) => {
      const attachmentUrl = doc.filePath || getDocumentFileUrl(doc.id);
      if (!doc?.id) {
        setPendingAttachments((current) => [...current, buildDocumentAttachment(doc)]);
        return;
      }

      setPendingAttachments((current) => {
        if (current.some((attachment) => attachment.documentId === doc.id)) {
          return current;
        }
        return [...current, { ...buildDocumentAttachment(doc), url: attachmentUrl }];
      });

      void fetchDocumentBlob(doc.id).then((blob) => {
        const name = toAttachmentName(doc.title);
        const file = new File([blob], name, { type: blob.type || 'application/pdf' });
        setPendingAttachments((current) =>
          current.map((item) =>
            item.documentId === doc.id
              ? { ...item, file, name, sizeLabel: formatSize(blob.size), typeLabel: blob.type || 'application/pdf' }
              : item,
          ),
        );
      }).catch((err) => {
        console.error('addDocumentAsPending error', err);
        toast.error('No fue posible adjuntar el documento automáticamente; se añadió como enlace.');
      });
    };

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
        // Agregar documento como attachment pendiente en lugar de mensaje
        addDocumentAsPending(document);
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
          if (document) {
            // Agregar documento como attachment pendiente en lugar de enviarlo inmediatamente
            addDocumentAsPending(document);
          }
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
            // Agregar documento como attachment pendiente en lugar de enviarlo inmediatamente
            if (document) addDocumentAsPending(document);
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
    if (!initialOpen || !isReady || !user?.id || hasProcessedInitialOpen) return;
    void processInitialOpen(initialOpen);
    setHasProcessedInitialOpen(true);
  }, [initialOpen, processInitialOpen, isReady, user?.id, hasProcessedInitialOpen]);

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
    if (isInitialLoad) return;

    const validSuppressedIds = new Set(
      conversations
        .filter((conversation) => peerRoleLabels.includes(conversation.role))
        .map((conversation) => conversation.id)
    );

    setSuppressedChatIds((current) => {
      const next = current.filter((id) => validSuppressedIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [conversations, isInitialLoad]);

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
    const currentLen = targetConversation?.messages.length ?? 0;
    const prevLen = prevScrollMsgLenRef.current;
    const chatChanged = selectedChat !== prevScrollChatRef.current;
    prevScrollMsgLenRef.current = currentLen;
    prevScrollChatRef.current = selectedChat;
    if (!chatChanged && currentLen <= prevLen) return;
    const timeoutId = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedChat, targetConversation?.messages.length]);

  useEffect(() => {
    setShowScrollBottom(false);
    const container = chatScrollAreaRef.current;
    if (!container) return;
    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;
    const handleScroll = () => {
      setShowScrollBottom(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 80);
    };
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [selectedChat]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

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
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv?.messages.length) setIsLoadingMessages(true);
    setSelectedChat(conversationId);
    setDraftRecipient(null);
    setReplyingTo(null);
    setMobileView('chat');
    updateConversation(conversationId, (conversation) => ({ ...conversation, unread: 0 }));
    void Promise.all([loadMessages(conversationId), markConversationAsRead(conversationId)])
      .then(() => setIsLoadingMessages(false))
      .catch(() => setIsLoadingMessages(false));
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
      let targetConversationId: number | null = selectedChat;
      let tempId = 0;
      try {

        if (!targetConversationId) {
          const createPayload = draftRecipient && draftRecipient.id > 0
            ? { recipient_user_id: draftRecipient.id }
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

        const convId = targetConversationId;
        tempId = -(Date.now());
        const capturedAttachments = [...pendingAttachments];
        const capturedReplyingTo = replyingTo;

        // Optimistic: mostrar mensaje de inmediato
        const tempMessage: ChatMessage = {
          id: tempId,
          sender: user?.name ?? 'Tú',
          content: trimmedMessage || (capturedAttachments.length > 0 ? 'Adjunto enviado' : ''),
          timestamp: getTimeLabel(),
          rawTimestamp: new Date().toISOString(),
          isOwn: true,
          attachments: capturedAttachments.map((a) => ({
            name: a.name,
            sizeLabel: a.sizeLabel,
            typeLabel: a.typeLabel,
            url: a.file ? URL.createObjectURL(a.file) : a.url,
          })),
          replyTo: capturedReplyingTo
            ? { id: capturedReplyingTo.id, sender: capturedReplyingTo.sender, content: capturedReplyingTo.content }
            : undefined,
        };
        setConversations((prev) => prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, tempMessage], lastMessage: tempMessage.content }
            : c
        ));

        // Limpiar entradas de inmediato (sin esperar al servidor)
        setMessage('');
        setPendingAttachments([]);
        setReplyingTo(null);
        setIsTyping(false);
        setDraftRecipient(null);
        setSelectedChat(convId);

        const formData = new FormData();
        formData.append('body', trimmedMessage || (capturedAttachments.length > 0 ? 'Adjunto enviado' : ''));
        if (capturedReplyingTo?.id) {
          formData.append('reply_to_message_id', String(capturedReplyingTo.id));
        }
        capturedAttachments.forEach((attachment) => {
          if (attachment.file) {
            formData.append('attachments[]', attachment.file, attachment.file.name);
          } else if (attachment.url) {
            formData.append('attachment_urls[]', attachment.url);
          }
        });

        const response = await apiFetch(`/conversations/${convId}/messages`, {
          method: 'POST',
          body: formData,
        }) as any;

        // Reemplazar mensaje temporal con el confirmado por el servidor
        if (response?.data) {
          const realMessage = normalizeMessage(response.data);
          setConversations((prev) => prev.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.map((m) => (m.id === tempId ? realMessage : m)) }
              : c
          ));
        }

        // Sincronización en segundo plano (sin bloquear)
        void Promise.all([loadMessages(convId), loadConversations(), markConversationAsRead(convId)]);
      } catch (err) {
        // Revertir mensaje optimista si falla el envío
        if (tempId !== 0) {
          setConversations((prev) => prev.map((c) =>
            c.id === targetConversationId
              ? { ...c, messages: c.messages.filter((m) => m.id !== tempId) }
              : c
          ));
        }
        if (targetConversationId && isConversationAccessDenied(err)) {
          setConversations((current) => current.filter((conversation) => conversation.id !== targetConversationId));
          setSuppressedChatIds((current) => current.filter((id) => id !== targetConversationId));
          setSelectedChat((current) => (current === targetConversationId ? null : current));
          toast.error('No tienes acceso a esta conversación. Se actualizará la lista de chats.');
          void loadConversations();
          return;
        }
        toast.error('No fue posible enviar el mensaje');
        console.error('send message error', err);
      }
    })();
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!selectedChat) return;
    const convId = selectedChat;
    const prevMessages = conversations.find((c) => c.id === convId)?.messages ?? [];

    // Optimistic: eliminar de inmediato
    setConversations((prev) => prev.map((c) =>
      c.id === convId ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) } : c
    ));

    try {
      await apiFetch(`/conversations/${convId}/messages/${messageId}`, { method: 'DELETE' });
      toast.success("Mensaje eliminado");
      window.dispatchEvent(new Event('ut-messages-updated'));
      void Promise.all([loadMessages(convId), loadConversations()]);
      void updateUnreadCount();
    } catch (err: any) {
      // Revertir si falla
      setConversations((prev) => prev.map((c) =>
        c.id === convId ? { ...c, messages: prevMessages } : c
      ));
      console.error('delete message error', err);
      toast.error(err?.message ?? 'No fue posible eliminar el mensaje');
    }
  };

  const handleEditMessage = async (messageId: number, body: string) => {
    if (!selectedChat) return;
    const convId = selectedChat;
    const prevMessages = conversations.find((c) => c.id === convId)?.messages ?? [];

    // Optimistic: actualizar contenido de inmediato
    setConversations((prev) => prev.map((c) =>
      c.id === convId
        ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, content: body } : m)) }
        : c
    ));

    try {
      await apiFetch(`/conversations/${convId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      toast.success('Mensaje actualizado');
      window.dispatchEvent(new Event('ut-messages-updated'));
      void loadMessages(convId);
    } catch (err: any) {
      // Revertir si falla
      setConversations((prev) => prev.map((c) =>
        c.id === convId ? { ...c, messages: prevMessages } : c
      ));
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
        <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
          <div className="relative">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Mensajes</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Mensajería interna con el Administrador.</p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-1">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border-border/70 bg-card shadow-sm dark:border-emerald-900/30 dark:bg-slate-950/60 dark:backdrop-blur-md">
            {/* Cabecera del chat docente */}
            <div className="shrink-0 border-b border-border/60 bg-card px-4 pt-4 pb-3 dark:bg-slate-950/60">
              {adminConversation ? (
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 ring-2 ring-emerald-200/60 dark:ring-emerald-900/40">
                      <AvatarImage
                        src={activeConversationAvatarUrl ?? DEFAULT_AVATAR_PATH}
                        alt={adminConversation.name}
                        className="h-full w-full object-cover"
                      />
                      <AvatarFallback className="bg-transparent p-0 overflow-hidden">
                        <img src={DEFAULT_AVATAR_PATH} alt={adminConversation.name} className="h-full w-full object-cover" />
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                      adminConversation.status === "online" ? "bg-emerald-500" :
                      adminConversation.status === "away"   ? "bg-amber-500"   : "bg-slate-400"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground leading-tight">{adminConversation.name}</p>
                      {adminConversation.unread > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[11px]">
                          {adminConversation.unread}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {adminConversation.role} &middot;{" "}
                      <span className={cn(
                        adminConversation.status === "online" ? "text-emerald-500" :
                        adminConversation.status === "away"   ? "text-amber-500"   : "text-slate-400"
                      )}>
                        {adminConversation.status === "online" ? "En línea" :
                         adminConversation.status === "away"   ? "Ausente"  : "Sin conexión"}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-foreground">Chat con Administrador</p>
                  <p className="text-xs text-muted-foreground">Escribe el primer mensaje para iniciar el chat con administración.</p>
                </div>
              )}
            </div>

            {/* Área de mensajes */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full bg-muted/20">
                <div className="w-full min-w-0 overflow-x-hidden">
                  {isInitialLoad && !adminConversation ? (
                    <MessageListSkeleton />
                  ) : adminConversation && (isLoadingMessages || confirmedLoadedChatId !== selectedChat) && !adminConversation.messages.length ? (
                    <MessageListSkeleton />
                  ) : adminConversation && adminConversation.messages.length > 0 ? (
                    <div className="pb-2 pt-3 px-4">
                      {groupMessagesByDate(adminConversation.messages).map((group, groupIndex) => (
                        <div key={groupIndex}>
                          <DateSeparator date={group.date} />
                          <div className="space-y-3">
                            {group.messages.map((messageItem) => (
                              <MessageBubble
                                key={messageItem.id}
                                message={messageItem}
                                onReply={setReplyingTo}
                                onDelete={handleDeleteMessage}
                                onEdit={handleEditMessage}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : adminConversation ? (
                    <EmptyConversationState
                      title="Sin mensajes aún"
                      description="Escribe el primer mensaje para iniciar la conversación con el administrador."
                    />
                  ) : (
                    <EmptyConversationState
                      title="Preparando tu chat..."
                      description="Estamos conectando tu chat con el administrador, un momento por favor."
                    />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Pie: redacción */}
            <div className="shrink-0 border-t border-border/60 bg-card p-4 dark:bg-slate-950/60">
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

              <div data-tour="admin-messages-composer" className="space-y-3">
                <Textarea
                  placeholder="Escribe un mensaje..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[48px] resize-none rounded-[1.35rem] border-border/70 bg-background px-4 py-3"
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
                      className="rounded-full px-4"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-1" />
                      Adjuntar archivo
                    </Button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                  </div>

                  <Button data-tour="admin-messages-send-btn" variant="success" className="rounded-full px-5 shadow-md shadow-emerald-500/20" onClick={handleSend}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar mensaje
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA ADMINISTRADOR
  // ─────────────────────────────────────────────────────────────────────────────
 return (
    <div className="flex h-[calc(100dvh-64px)] min-h-0 flex-col gap-5 overflow-hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Mensajes</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Mensajería interna: mensajes, archivos y seguimiento.</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-[300px_minmax(0,1fr)]">
        {/* ── Panel izquierdo: lista de conversaciones ── */}
        <div className={cn("overflow-hidden rounded-[22px] border border-border bg-card shadow-sm min-h-0 flex-col dark:border-slate-800/70 dark:bg-slate-950/60", mobileView === 'list' ? "flex" : "hidden sm:flex")}>
          {/* Cabecera */}
          <div className="shrink-0 border-b border-border/60 bg-card px-4 pt-4 pb-3 space-y-3 dark:border-slate-700 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-foreground dark:text-white">Chats</p>
                {filteredConversations.filter((c) => c.unread > 0).length > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[11px]">
                    {filteredConversations.filter((c) => c.unread > 0).length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {suppressedConversations.length > 0 && (
                  <button
                    type="button"
                    title={`Restaurar chats (${suppressedConversations.length})`}
                    onClick={() => setRestoreDialogOpen(true)}
                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition hover:border-emerald-400 hover:text-emerald-700 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {suppressedConversations.length}
                    </span>
                  </button>
                )}
                {(user?.role === "administrador" || user?.roles?.includes("administrador")) && (
                  <button
                    type="button"
                    data-tour="admin-messages-new-conv-btn"
                    title="Nuevo chat"
                    onClick={() => setNewConversationOpen(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-tour="admin-messages-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o mensaje..."
                className="pl-9 rounded-xl border-border/70 bg-background/80 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {isInitialLoad && conversations.length === 0 ? (
                <ConversationListSkeleton />
              ) : filteredConversations.length > 0 ? (
                <div className="space-y-1 py-2">
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
          </div>
        </div>

        <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
          <DialogContent className="dark:bg-slate-950 dark:border-slate-800">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="dark:text-white">Iniciar nuevo chat</DialogTitle>
                {!isLoadingRecipients && recipientUsersWithoutConversation.length > 0 && (
                  <span className="text-sm text-muted-foreground dark:text-slate-400 font-normal">
                    {filteredRecipientUsers.length} sin chat
                  </span>
                )}
              </div>
              <DialogDescription className="dark:text-slate-400">Selecciona un {peerRoleLabel.toLowerCase()}. El chat se creará cuando se envíe el primer mensaje.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={recipientQuery}
                  onChange={(e) => setRecipientQuery(e.target.value)}
                  placeholder={`Buscar ${peerRoleLabel.toLowerCase()} por nombre...`}
                  className="pl-9 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
                />
              </div>
              {isLoadingRecipients ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground dark:border-slate-700 dark:text-slate-400">
                  Cargando...
                </div>
              ) : recipientFetchError ? (
                <p className="text-sm text-destructive">{recipientFetchError}</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-background/80 p-3 dark:border-slate-700/70 dark:bg-slate-900/80">
                  {filteredRecipientUsers.length > 0 ? (
                    filteredRecipientUsers.map((recipient) => (
                      <RecipientRow
                        key={recipient.id}
                        recipient={recipient}
                        peerRoleLabel={peerRoleLabel}
                        onClick={() => handleCreateConversation(recipient)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground dark:text-slate-400">No se encontraron usuarios.</p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 dark:bg-slate-950 dark:border-slate-800">
            <DialogHeader className="px-5 pt-5 pb-4">
              <DialogTitle className="dark:text-white">Restaurar chats suprimidos</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Selecciona qué chat deseas restaurar.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-64 overflow-y-auto border-y border-border/50 divide-y divide-border/40 dark:border-slate-700/50 dark:divide-slate-700/40">
              {suppressedConversations.length > 0 ? (
                suppressedConversations.map((conversation) => (
                  <SuppressedConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    onRestore={restoreSuppressedConversation}
                  />
                ))
              ) : (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground dark:text-slate-400">No hay chats suprimidos para restaurar.</p>
              )}
            </div>

            <div className="px-5 py-4 flex justify-end">
              <Button variant="ghost" className="h-9 px-4 text-sm dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => setRestoreDialogOpen(false)}>Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Panel derecho: vista del chat ── */}
        <div className={cn("overflow-hidden rounded-[22px] border border-border bg-card shadow-sm min-h-0 flex-col dark:border-slate-800/70 dark:bg-slate-950/60", mobileView === 'chat' ? "flex" : "hidden sm:flex")}>
          {/* Cabecera del chat */}
          <div className="shrink-0 border-b border-border/60 bg-card px-4 pt-4 pb-3 dark:border-slate-700 dark:bg-slate-950/60">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="sm:hidden mb-2 -ml-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Chats
            </button>
            {targetConversation ? (
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 ring-2 ring-emerald-200/60 dark:ring-emerald-900/40">
                    <AvatarImage
                      src={activeConversationAvatarUrl ?? DEFAULT_AVATAR_PATH}
                      alt={targetConversation.name}
                      className="h-full w-full object-cover"
                    />
                    <AvatarFallback className="bg-transparent p-0 overflow-hidden">
                      <img src={DEFAULT_AVATAR_PATH} alt={targetConversation.name} className="h-full w-full object-cover" />
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn(
                    "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                    targetConversation.status === "online" ? "bg-emerald-500" :
                    targetConversation.status === "away"   ? "bg-amber-500"   : "bg-slate-400"
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground leading-tight dark:text-white">{targetConversation.name}</p>
                    {targetConversation.unread > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[11px]">
                        {targetConversation.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {targetConversation.role} &middot;{" "}
                    <span className={cn(
                      targetConversation.status === "online" ? "text-emerald-500" :
                      targetConversation.status === "away"   ? "text-amber-500"   : "text-slate-400"
                    )}>
                      {targetConversation.status === "online" ? "En línea" :
                       targetConversation.status === "away"   ? "Ausente"  : "Sin conexión"}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-foreground">Selecciona un chat</p>
                <p className="text-xs text-muted-foreground">Elige una conversación para ver el historial y responder.</p>
              </div>
            )}
          </div>

          {/* Área de mensajes */}
          <div ref={chatScrollAreaRef} className="relative min-h-0 flex-1 overflow-hidden">
            {targetConversation ? (
              <ScrollArea className="h-full bg-muted/20 dark:bg-slate-900/30">
                <div className="w-full min-w-0 overflow-x-hidden">
                  {(isLoadingMessages || confirmedLoadedChatId !== selectedChat) && !targetConversation.messages.length ? (
                    <MessageListSkeleton />
                  ) : targetConversation.messages.length > 0 ? (
                    <div className="pb-2 pt-3 px-4">
                      {groupMessagesByDate(targetConversation.messages).map((group, groupIndex) => (
                        <div key={groupIndex}>
                          <DateSeparator date={group.date} />
                          <div className="space-y-3">
                            {group.messages.map((messageItem) => (
                              <MessageBubble
                                key={messageItem.id}
                                message={messageItem}
                                onReply={setReplyingTo}
                                onDelete={handleDeleteMessage}
                                onEdit={handleEditMessage}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyConversationState
                      title="Sin mensajes"
                      iconOnly
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
            {showScrollBottom && targetConversation && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                aria-label="Ir al final de la conversación"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Pie: redacción de mensaje */}
          <div className="shrink-0 border-t border-border/60 bg-card p-4 dark:border-slate-700 dark:bg-slate-950/60">
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
                className="min-h-[48px] resize-none rounded-[1.35rem] border-border/70 bg-background px-4 py-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
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
                    className="rounded-full px-4 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    Adjuntar archivo
                  </Button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                </div>

                <Button variant="success" className="rounded-full px-5 shadow-md shadow-emerald-500/20 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white" onClick={handleSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar mensaje
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}