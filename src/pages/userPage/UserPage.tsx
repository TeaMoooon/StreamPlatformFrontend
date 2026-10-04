import { FC } from 'react';
import { useParams } from 'react-router-dom';
// pages
import { appLayout } from '../../layout';
import { StreamPage } from '../streamPage/StreamPage';
// components
import { UserAbout } from './components/userAbout/UserAbout';
import { ContainerBox } from '../../components/StylesComponents';
import { UserBanner } from './components/userBanner/UserBanner';
import { ContentWrapperSwitch } from '../../components/сontentWrapperSwitch/ContentWrapperSwitch';
// hooks
import { useUserPage } from '../../hooks/useUserPage';

export const UserPage: FC = appLayout(() => {
  const { nickname: paramNickname } = useParams<{ nickname: string }>();
  const {
    userData,
    isNotProfileData,
    currentStream,
    viewerCount,
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
  } = useUserPage(paramNickname);

  const isLive = Boolean(currentStream?.isLive && currentStream.hlsUrl);

  return (
    <ContainerBox>
      <ContentWrapperSwitch
        isLoading={isLoading}
        isError={isError}
        data={userData ? [userData] : []}
        onRetry={() => {}}
        text={'Такого пользователя не существует'}
      >
        {currentStream?.isLive && currentStream.hlsUrl && (
          <StreamPage
            streamInfo={currentStream}
            viewerCount={viewerCount}
            messages={messages}
            sendMessage={sendMessage}
            deleteMessage={deleteMessage}
            timeoutUser={timeoutUser}
            banUser={banUser}
            unbanUser={unbanUser}
            bannedUserIds={bannedUserIds}
            chatError={chatError}
            clearChatError={clearChatError}
            inputRestore={inputRestore}
            consumeInputRestore={consumeInputRestore}
            slowModeSeconds={slowModeSeconds}
            setSlowMode={setSlowMode}
            chatRules={chatRules}
            chatRulesTitle={chatRulesTitle}
            chatMode={chatMode}
            canSendChat={canSendChat}
            canManageChat={canManageChat}
            streamer={
              userData
                ? { nickname: userData.nickname, avatarUrl: userData.profileImage }
                : { nickname: currentStream.streamerName }
            }
          />
        )}
        <UserBanner userData={userData} isNotProfileData={isNotProfileData} isLive={isLive} />
        {!isLive && <UserAbout userData={userData} />}
      </ContentWrapperSwitch>
    </ContainerBox>
  );
});
