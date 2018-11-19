function fullName (body) {
  const {appUser, messages} = body;
  if (!appUser) {
    return 'Anonymous'
  }

  let fullName = [appUser.givenName, appUser.surname].filter((p) => p).join(' ')
  const messageName = messages && messages[0] && messages[0].name
  fullName = fullName || messageName || 'Anonymous'

  return fullName
}

function findConversation (body) {
  const appUser = body.appUser;
  if (!appUser) {
    return;
  }

  return Conversations.findOne({
    userId: appUser._id
  });
}

function createConversation (body) {
  let conv = findConversation(body)
  let owner = "none";

  if(body.appUser.properties && body.appUser.properties.owner) {
      owner = body.appUser.properties.owner;
  }

  if (!conv) {
    conv = {};
    conv._id = Conversations.insert({
      name: fullName(body),
      userId: body.appUser._id,
      owner: owner,
      avatarUrl: Utils.resolveAvatarUrl(body.appUser)
    });
    return conv;
  }
}

function addMessages (conversation, messages, name) {
  if (!messages) {
    return
  }

  messages.forEach(function (m) {
    m.smoochMessageId = m._id;

    delete m._id;
    Messages.insert(Object.assign({}, m, {
      conversationId: conversation._id,
      name: name || m.name || 'Anonymous'
    }));
  });
}

Router.map(function () {
  this.route('hook', {
    path: '/hook',
    where: 'server',
    action: function () {
      const body = this.request.body;
      const trigger = body.trigger;
      let conv = findConversation(body)

      /** 1. Receve user messages */
      switch (trigger) {
        case 'message:appUser':
          if (!conv) {
            conv = createConversation(body)
            SmoochApi.appUsers.getMessages(Meteor.settings.public.smoochAppId, body.appUser._id)
              .then(function(data) {
                addMessages(conv, data.messages)
              })
              .catch(function(error) {
                console.log('Error fetching history', error);
                addMessages(conv, body.messages, fullName(body))
              })
          } else {
            addMessages(conv, body.messages, fullName(body))
          }
          break;

        case 'typing:appUser':
          if(conv) {
            let isTyping = false;

            if(body.activity.type == "typing:start") {
              isTyping = true;
            }

            console.log(isTyping);
            
            Conversations.update({_id: conv._id}, {$set: {typing: isTyping}});
          }
        break;

        case 'message:appMaker':
          if (!conv) {
            break;
          }
          addMessages(conv, body.messages)
          break;

        case 'postback':
          if (!conv) {
            break;
          }
          body.postbacks.forEach(function (pb) {
            const pbMessage = 'Postback ' + pb.action.text + ' | Payload: ' + pb.action.payload;
            Messages.insert({
              conversationId: conv._id,
              message: pbMessage,
              name: fullName(body),
              role: 'appUser'
            });
          })
          break;
        case 'merge:appUser':
          body.discarded.forEach((discarded) => {
            Conversations.remove({userId: discarded._id});
          });
          break;
        default:
          break;
      }
      /* */

      if (conv && body.appUser && trigger === 'message:appUser') {
        Conversations.update({
          _id: conv._id
        }, {
          $set: {
            avatarUrl: Utils.resolveAvatarUrl(body.appUser),
            name: fullName(body)
          }
        });
      }

      this.response.end()
    }
  })
})
