import { ReactNode } from 'react';

// slice
export interface IUserProfileSlice {
  data: IProfile | null;
  isAuth?: boolean;
  isLoading: boolean;
  isError: string | null | boolean;
}

export interface ISettingsSlice {
  data: ISetting | null;
  isError: string | null | boolean;
  isLoading: boolean;
}

export interface IStreamSlice {
  data: IStream | null;
  isError: string | null | boolean;
  isLoading: boolean;
}

export interface INotificationSlice {
  paged: {
    notifications: INotificationUnified[];
    totalCount: number;
    page: number;
    limit: number;
  };
  live: INotificationUnified[];
  isError: string | null | boolean;
  isLoading: boolean;
}

export interface IStreamsSlice {
  data: null | IStreamsData;
  isError: string | null | boolean;
  isLoading: boolean;
}

export interface IStreamsHistorySlice {
  data: null | IStreamHistoryData;
  isError: string | null | boolean;
  isLoading: boolean;
  lastNickname: string | null;
}

// Types
export type NotificationsType = 'NewFollower' | 'StreamStarted' | 'SupportTicketReply' | string;

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code?: number;
}

// data
export interface IProfile {
  id: number;
  email: string;
  nickname: string;
  profileDescription: string;
  backgroundImage: string;
  profileImage: string;
  registrationDate: Date;
  isOnline: boolean;
  cashBalance: number;
  socialLinks: ISocialLink[] | null;
}
export interface ISocialLink {
  platform: string;
  url: string;
}

export interface IProfileChange {
  nickname: string;
  email: string | null;
  profileDescription: string | null;
  currentPassword: string | null;
  newPassword: string | null;
  profileImage: File | null | undefined;
  backgroundImage: File | null | undefined;
  socialLinks: ISocialLink[] | null;
}

export interface ISocials {
  platform: string;
  url: string;
}

export interface ISubscriber {
  nickname: string;
  profileImage: string;
  isOnline: boolean;
  streamersLeague: string;
  previewUrl: string;
  streamName: string;
}

export interface IStreamOnline {
  isOnline: boolean;
  nickname: string;
  previewUrl: string;
  profileImage: string;
  streamId: number | null;
  streamName: string;
  streamersLeague: string;
  totalCount?: number;
  viewerCount?: number;
  categoryId?: number | null;
  categoryName?: string | null;
}

export interface IStreamsData {
  totalStreams: number;
  page: number;
  pageSize: number;
  streams: IStreamOnline[];
}

export interface ISetting {
  streamKey: string;
  streamingBlocked?: boolean;
  blockMessage?: string | null;
  blockType?: string | null;
  blockReason?: string | null;
  blockExpiresAt?: string | null;
  blockSanctionId?: number | null;
}

export interface IStream {
  streamId: number;
  streamName: string;
  streamerName: string;
  streamerId: number;
  tags: Array<string>;
  previewUrl: File | null;
  hlsUrl: string;
  totalViews: number;
  startedAt: string | Date;
  isLive: boolean;
  categoryId?: number;
  categoryName?: string | null;
  categoryBannerImageUrl?: string | null;
  streamLanguage?: string;
}

export interface IStreamHistoryData {
  page: number;
  pageSize: number;
  totalStreams: number;
  streams: IStreamHistory[];
}

export interface IStreamHistory {
  id: number;
  startedAt: string;
  endedAt: string;
  hasRecord: boolean;
  recordPath: string;
  streamName: string;
  categoryName: string | null;
  tags: Array<string>;
}

export interface IUpdateStream {
  streamName: string;
  category: number | null;
  previewUrl: File | null;
  tags: string[];
}

type StreamInfo = {
  [K in keyof IStream]: IStream[K];
};

export interface ILiveStatusStream {
  isStreaming: boolean;
  streamInfo:
    | (StreamInfo & {
        title: string;
        endedAt: string | null;
      })
    | null;
}

export interface INotificationBase {
  type: NotificationsType;
  payload: string;
  date?: string;
  id?: number;
  isRead?: boolean;
  createdAt?: string;
  totalCount?: number;
  page?: number;
  limit?: number;
  notifications?: any[];
}

export interface INotificationUnified {
  id: number;
  title: string;
  message: string;
  link: string | null;
  date: string;
  icon: React.ElementType;
  isRead: boolean;
}

// components
export interface IStyledButtonForm {
  bgcolor?: string;
  hoverbgcolor?: string;
  hovercolor?: string;
  c?: string;
}

export interface ITabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface ITabsComponentProps {
  propsChild: (ReactNode | (() => ReactNode))[];
  propTabsTitle: string[];
  /** Which tab is selected when the tabs mount / remount. */
  initialTab?: number;
}

export interface IModalRegistForm {
  password: string;
  confirmPassword: string;
  username: string;
  email?: string;
}

export interface IModalLoginForm {
  password: string;
  loginOrEmail: string;
}

export type SidebarContextType = {
  open: boolean;
  setOpen: (s: boolean) => void;
};

export type ModalContextType = {
  showAlert: (message: string, type?: AlertType, title?: string, link?: string) => void;
};

export interface ICardTypography {
  c?: string;
  fs?: string;
  isEllipsis: boolean;
}

export interface StyledButtonSearchProps {
  h?: string;
}

export interface StyledDragBoxProps {
  dragActive?: boolean;
}

export interface IUser {
  id: string;
  name: string;
  avatar?: string;
  live?: boolean;
}

// Chat
export interface IChatMessage {
  id: string;
  userId: number;
  username: string;
  text: string;
  role: string;
  timestamp: string;
  offsetSeconds: number;
  isDeleted?: boolean;
  deletedText?: string;
}

// Settings
export interface IChip {
  key: string;
  label: string;
}

export interface ICategories {
  id: number;
  name: string;
  bannerImageUrl: string | null;
}
