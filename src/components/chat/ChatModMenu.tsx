import { Divider, Menu, MenuItem } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TimerOffOutlinedIcon from '@mui/icons-material/TimerOffOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { useState } from 'react';
import { CHAT_TIMEOUT_PRESETS } from './chat.constants';
import { getChatPopoverContainer } from './chat.utils';
import { IChatMessage } from '../../types/share';
import { ReportDialog } from '../report/ReportDialog';

const modMenuItemSx = {
  gap: 1,
  fontSize: 13,
  color: 'rgba(255,255,255,0.92)',
  '& .MuiSvgIcon-root': {
    color: 'rgba(255,255,255,0.85)',
  },
  '&:hover': {
    bgcolor: 'rgba(255,255,255,0.08)',
  },
} as const;

const modMenuPaperSx = {
  bgcolor: 'rgba(18,16,32,0.98)',
  border: '1px solid rgba(255,255,255,0.1)',
} as const;

type ChatModMenuProps = {
  msg: IChatMessage;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onReply: (msg: IChatMessage) => void;
  streamerId?: number;
  showModActions?: boolean;
  isBanned?: boolean;
  onDelete?: (messageId: string) => void;
  onTimeout?: (userId: number, seconds: number) => void;
  onBan?: (userId: number) => void;
  onUnban?: (userId: number) => void;
};

export const ChatModMenu = ({
  msg,
  anchorEl,
  onClose,
  onReply,
  streamerId,
  showModActions = false,
  isBanned = false,
  onDelete,
  onTimeout,
  onBan,
  onUnban,
}: ChatModMenuProps) => {
  const [timeoutAnchorEl, setTimeoutAnchorEl] = useState<HTMLElement | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  if (!msg.id) return null;

  const canReport = msg.role !== 'System' && Boolean(msg.userId);

  const handleClose = () => {
    setTimeoutAnchorEl(null);
    onClose();
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        container={getChatPopoverContainer}
        slotProps={{
          root: { sx: { zIndex: 10000 } },
          paper: {
            sx: {
              ...modMenuPaperSx,
              minWidth: 180,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            onReply(msg);
            handleClose();
          }}
          sx={{ ...modMenuItemSx }}
        >
          <ReplyOutlinedIcon sx={{ fontSize: 18 }} />
          Ответить
        </MenuItem>

        {canReport && (
          <MenuItem
            onClick={() => {
              setReportOpen(true);
              handleClose();
            }}
            sx={{ ...modMenuItemSx }}
          >
            <FlagOutlinedIcon sx={{ fontSize: 18 }} />
            Пожаловаться
          </MenuItem>
        )}

        {showModActions && onDelete && onTimeout && (onBan || onUnban) && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5 }} />
            <MenuItem
              onClick={() => {
                onDelete(msg.id);
                handleClose();
              }}
              sx={{ ...modMenuItemSx }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
              Удалить
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                setTimeoutAnchorEl(e.currentTarget);
              }}
              sx={{ ...modMenuItemSx }}
            >
              <TimerOffOutlinedIcon sx={{ fontSize: 18 }} />
              Мут
            </MenuItem>
            <MenuItem
              onClick={() => {
                onTimeout(msg.userId, 0);
                handleClose();
              }}
              sx={{ ...modMenuItemSx, color: '#6fff79', '& .MuiSvgIcon-root': { color: '#6fff79' } }}
            >
              <HowToRegOutlinedIcon sx={{ fontSize: 18 }} />
              Снять мут
            </MenuItem>
            {isBanned && onUnban ? (
              <MenuItem
                onClick={() => {
                  onUnban(msg.userId);
                  handleClose();
                }}
                sx={{ ...modMenuItemSx, color: '#6fff79', '& .MuiSvgIcon-root': { color: '#6fff79' } }}
              >
                <HowToRegOutlinedIcon sx={{ fontSize: 18 }} />
                Разбанить
              </MenuItem>
            ) : (
              onBan && (
                <MenuItem
                  onClick={() => {
                    onBan(msg.userId);
                    handleClose();
                  }}
                  sx={{ ...modMenuItemSx, color: '#ff8a8a', '& .MuiSvgIcon-root': { color: '#ff8a8a' } }}
                >
                  <BlockOutlinedIcon sx={{ fontSize: 18 }} />
                  Забанить
                </MenuItem>
              )
            )}
          </>
        )}
      </Menu>

      {showModActions && onTimeout && (
        <Menu
          anchorEl={timeoutAnchorEl}
          open={Boolean(timeoutAnchorEl)}
          onClose={handleClose}
          container={getChatPopoverContainer}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            root: { sx: { zIndex: 10001 } },
            paper: {
              sx: {
                ...modMenuPaperSx,
                minWidth: 140,
              },
            },
          }}
        >
          <MenuItem
            onClick={() => {
              onTimeout(msg.userId, 0);
              handleClose();
            }}
            sx={{ ...modMenuItemSx, gap: 0, color: '#6fff79' }}
          >
            Снять мут
          </MenuItem>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5 }} />
          {CHAT_TIMEOUT_PRESETS.map(({ seconds, label }) => (
            <MenuItem
              key={seconds}
              onClick={() => {
                onTimeout(msg.userId, seconds);
                handleClose();
              }}
              sx={{ ...modMenuItemSx, gap: 0 }}
            >
              {label}
            </MenuItem>
          ))}
        </Menu>
      )}

      {canReport && (
        <ReportDialog
          open={reportOpen}
          title="Пожаловаться на сообщение"
          subtitle={msg.username}
          payload={{
            targetType: 'message',
            targetUserId: msg.userId,
            messageId: msg.id,
            messageSnapshot: msg.text || undefined,
            streamerId,
          }}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
};
