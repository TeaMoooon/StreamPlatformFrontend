import { useEffect } from 'react';
// redux
import { useDispatch } from 'react-redux';
import { useAppSelector } from './redux';
import { fetchUserByNickname } from '../store/actions/UserActions';
import { SelectUserSlice } from '../store/slices/SelectUserSlice';
import { AppDispatch } from '../store/store';
// context
import { useNickname } from '../context/NicknameContext';
// hooks
import { useStreamHub } from './hubs/useStreamHub';
import { useChat } from './hubs/useChat';

export const useUserPage = (paramNickname?: string) => {
  const { nickname, setNickname } = useNickname();
  const dispatch = useDispatch<AppDispatch>();
  const { data: profile } = useAppSelector((state) => state.user);
  const { data: selectedUser, isLoading, isError } = useAppSelector((state) => state.selectUser);
  const { Clear } = SelectUserSlice.actions;

  // Устанавливаем nickname
  useEffect(() => {
    if (paramNickname) setNickname(paramNickname);
  }, [paramNickname, setNickname]);

  useEffect(() => {
    if (!paramNickname) {
      dispatch(Clear());
      return;
    }
    if (profile && profile.nickname === paramNickname) {
      dispatch(Clear());
      return;
    }

    dispatch(fetchUserByNickname(paramNickname));
  }, [paramNickname, profile, dispatch]);

  // Определяем данные пользователя
  const isOwnPage = !paramNickname || profile?.nickname === paramNickname;

  const userData = isOwnPage ? profile : selectedUser;
  const isNotProfileData = !isOwnPage;

  // console.log(userData);

  const { videoRef, currentStream, viewerCount, connection } = useStreamHub({
    nickname: nickname || paramNickname,
    userData,
    authUserId: profile?.id ?? null,
  });

  const {
    messages,
    sendMessage,
    deleteMessage,
    timeoutUser,
    banUser,
    unbanUser,
    chatError,
    clearChatError,
    slowModeSeconds,
    setSlowMode,
    chatRules,
    chatRulesTitle,
    chatMode,
    canSendChat,
    canManageChat,
    bannedUserIds,
    inputRestore,
    consumeInputRestore,
  } = useChat(connection, nickname || paramNickname, profile);

  return {
    userData,
    isNotProfileData,
    videoRef,
    currentStream,
    viewerCount,
    connection,
    isLoading,
    isError,
    messages,
    sendMessage,
    deleteMessage,
    timeoutUser,
    banUser,
    unbanUser,
    chatError,
    clearChatError,
    slowModeSeconds,
    setSlowMode,
    chatRules,
    chatRulesTitle,
    chatMode,
    canSendChat,
    canManageChat,
    bannedUserIds,
    inputRestore,
    consumeInputRestore,
  };
};
