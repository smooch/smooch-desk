
Meteor.methods({
  sendMessage: (userId, message) => {
    /** 2. Send messages */

    SmoochApi.appUsers.sendMessage({
      appId: Meteor.settings.public.smoochAppId,
      userId,
      message
    }).catch(console.error)
    /* */
  },

  sendReadReceipt: (userId) => {
    SmoochApi.appUsers.conversationActivity({
      appId: Meteor.settings.public.smoochAppId,
      userId: userId,
      activityProps: {
        role: 'appMaker',
        type: 'conversation:read'
      }
    }).catch(console.error);
  },

  sendTyping: (userId, start) => {
    let props = {
      role:'appMaker',
      type:'typing:stop'
    }

    if(start) {
      props.type = 'typing:start';
    }

    console.log(start);
    console.log(props);

    SmoochApi.appUsers.conversationActivity({
      appId: Meteor.settings.public.smoochAppId,
      userId: userId,
      activityProps: props
    }).catch(console.error);
  },

  getUser: (userId) => {
    /** 3. Get user profile */
    return SmoochApi.appUsers.get({
      appId: Meteor.settings.public.smoochAppId,
      userId
    }).then(({appUser}) => {
      appUser.avatarUrl = Utils.resolveAvatarUrl(appUser)
      return appUser
    }).catch(console.error)
    /* */
  },

  getAuthCode: (appUserId) => {
    const appId = Meteor.settings.public.smoochAppId;
    return SmoochApi.appUsers.getAuthCode(appId, appUserId)
      .then(({authCode}) => authCode)
      .catch(console.error);
  },

  getLinkRequests: (userId) => {
    return Integrations.getIntegrations().then((integrations) => {
      const integrationIds = integrations.map((i) => i._id);
      return SmoochApi.appUsers.getLinkRequests({
        appId: Meteor.settings.public.smoochAppId,
        userId,
        integrationIds});
    }).then(({linkRequests}) => linkRequests)
  },

  setUserProperties: (userId, props) => {
    const appId = Meteor.settings.public.smoochAppId;

    return SmoochApi.appUsers.update(appId, userId, {"properties": props}).then(({appUser}) => {
      return appUser
    }).catch(console.error)
  }
});
