angular.module('ionicDessiApp.controllers', [])

  .controller('AppCtrl', function ($scope, $ionicModal, $timeout, $state, LoginService, SignupService, $ionicPopup, ResetService, $stateParams, $ionicLoading) {

    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:
    //$scope.$on('$ionicView.enter', function(e) {
    //});

    if ($stateParams.message !== null) {
      showToast($stateParams.message, $ionicLoading);
    }

    if (LoginService.isLogged()) {
      $state.go('chat.channel');
    }

    if ($scope.message !== undefined) {
      showToast($scope.message);
    }

    // Form data for the login modal
    $scope.loginData = {};

    // Create the login modal that we will use later
    $ionicModal.fromTemplateUrl('templates/login.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.loginmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeLogin = function () {
      $scope.loginmodal.hide();
    };

    // Open the login modal
    $scope.login = function () {
      $scope.loginmodal.show();
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function (user) {

      $scope.message = '';
      $scope.error = 0;
      if (user.mail && user.password) {
        LoginService.login(user).then(function (res) {
          window.localStorage.setItem('username', res.data.username);
          window.localStorage.setItem('token', res.data.token);
          window.localStorage.setItem('userid', res.data.id);
          window.localStorage.setItem('mail', res.data.mail);
          $scope.loginmodal.hide();
          $state.go('chat.channel');
        }, function (res) {
          console.log("****************************************************************hay error, por que??");
          console.log(JSON.stringify(res));
          for(var i = 0; i<res.length; i++){
            console.log("ESto vale el objeto en i: "+res[i]);

          }
          showAlert(res.message);
        });
      }

    };

    function showAlert(message) {
      console.log("cual es el error2?");
      console.log(message);
      var alertPopup = $ionicPopup.alert({
        title: 'Error!!',
        template: message
      })
    };


    // Modal para signup
    $scope.signupData = {};

    $ionicModal.fromTemplateUrl('templates/signup.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.signupmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeSignup = function () {
      $scope.signupmodal.hide();
    };

    // Open the login modal
    $scope.signup = function () {
      $scope.signupmodal.show();
    };

    // Perform the login action when the user submits the login form
    $scope.doSignup = function (user) {
      $scope.message = '';
      $scope.error = 0;
      if (user.mail && user.username && user.password) {
        SignupService.signup(user).then(function (res) {
          $scope.signupmodal.hide();
          $scope.loginmodal.show();
          showToast('Signed up succesfully!! Check your email to activate your account');
        }, function (res) {
          showAlert(res.data.message);
        });
      }
    };

    $scope.forgotPassword = function () {
      $scope.data = {};
      $ionicPopup.show({
        template: '<input type="text" placeholder="Email" ng-model="data.mail">',
        title: 'Forgot password',
        subtitle: 'Enter your mail in order to remember your password',
        scope: $scope,
        buttons: [
          {text: 'Cancel'},
          {
            text: '<b>Confirm</b>',
            type: 'button-positive',
            onTap: function (e) {
              if (!$scope.data.mail) {
                showErrorAlert('Email is required');
              } else {
                ResetService.check($scope.data).then(function (res) {
                  if (window.localStorage.getItem('ResetToken') != null) {
                    delete window.localStorage.removeItem('ResetToken');
                  }

                  window.localStorage.setItem('ResetToken', res.data);

                }, function (res) {
                  showAlert(res.data.message);
                });
              }
            }
          }
        ]
      });
    }


  })

  .controller('ChatCtrl', function ($scope, $state, $ionicHistory, GroupsService, ChatService, $ionicPopup, Socket, $ionicScrollDelegate, $ionicLoading, $sce, $ionicModal, $ionicTabsDelegate, $ionicActionSheet, $ionicSideMenuDelegate, md5, SearchService, $cordovaFile) {

    $scope.userid = window.localStorage.getItem('userid');
    $scope.username = window.localStorage.getItem('username');
    $scope.showGroups = true;
    $scope.showChannels = false;
    $scope.showUsers = false;
    $scope.showInvitations = false;
    $scope.groups = [];
    $scope.messagess = [];
    $scope.activeGroup = -1;
    $scope.activeChannel = null;
    $scope.users = {};
    $scope.showSettingsNameButtons = false;
    $scope.showSettingsMembers = false;
    $scope.showSystemUsers = true;
    $scope.systemUsers = null;
    $scope.showChannelSettings = false;
    $scope.showGroupSettings = false;
    $scope.state = $state;
    $scope.searchModalClosed = true;
    $scope.notifications = {};
    $scope.globalSearchResult = [];
    $scope.selectedIndex = 0;

    $scope.logout = function() {

      window.localStorage.removeItem('userid');
      window.localStorage.removeItem('username');
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('mail');

      $ionicHistory.nextViewOptions({
        disableBack: true
      });

      $state.go('home');

    };

    // Emitimos evento de conexion a chat para recibir nuevas invitaciones a grupos
    Socket.emit('newChatConnection', {'userid': window.localStorage.getItem('userid')});

    $scope.updateActiveGroup = function (i) {


      $scope.activeGroup = i;
      if (i !== -1) {
        // Emitimos evento de selecion de grupo para notificaciones de usuarios coenctados al grupo
        Socket.emit('selectGroup', {
          'groupid': $scope.groups[$scope.activeGroup].id,
          'userid': window.localStorage.getItem('userid')
        });

        GroupsService.getChannels($scope.groups[i].id).then(
          function(data) {
          $scope.groups[i] = data;
        }, function(err) {
          showErrorAlert(err.message);
        });
      }
      $scope.activeChannel = null;
      $scope.messagess = [];

      $scope.showChannelSettings = false;

      if($scope.showSettingsMembers && i !== -1){
        $ionicSideMenuDelegate.canDragContent(false);
      }

      if(i === -1) {
        $ionicSideMenuDelegate.canDragContent(true);
        $scope.showGroupSettings = false;
      } else {
        $scope.showGroupSettings = true;
      }
    };

    GroupsService.getChatInfo().then(function (data) {
        $scope.groups = data;
        createConnectedUserList();
        createNotifications();
      }
      , function (err) {
        // Tratar el error
        console.log("Hay error");
        console.log(err.message);
        if (err.code === 419) {
          $scope.logout();
          $state.go('home', {message: err.message}).then();

        } else {
          $scope.error = err.message;
        }

      });

    function createConnectedUserList() {
      var tempList = {};
      for (var i = 0; i < $scope.groups.length; i++) {
        for (var j = 0; j < $scope.groups[i].users.length; j++) {
          tempList[$scope.groups[i].users[j].id] = false;
        }
      }
      $scope.users = tempList;
    }

    function createNotifications() {
      for(var i = 0; i<$scope.groups.length ; i++) {
        $scope.notifications[$scope.groups[i].id] = 0;
        for(var j = 0 ;  j<$scope.groups[i].publicChannels.length ; j++){
          $scope.notifications[$scope.groups[i].publicChannels[j].id] = 0;
        }
        for(var k = 0; k<$scope.groups[i].privateChannels.length ; k++) {
          $scope.notifications[$scope.groups[i].privateChannels[k].id] = 0;
        }
        for(var l = 0; l<$scope.groups[i].users.length ; l++) {
          $scope.notifications[$scope.groups[i].users[l].id] = 0;
        }
      }
    }

    ChatService.getInvitations().then(function (data) {
        $scope.invitations = data;
      }
      , function (err) {
        $scope.error = err.message;
      });


    $scope.logout = function () {
      window.localStorage.removeItem('username');
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('userid');
      window.localStorage.removeItem('mail');

      $state.go('home');
    };

    $scope.toggleGroups = function () {
      $scope.showGroups = !$scope.showGroups;
    }

    $scope.toggleChannels = function () {
      $scope.showChannels = !$scope.showChannels;
    }

    $scope.unhideChannels = function (cond) {
      $scope.showChannels = cond;
    }

    $scope.toggleUsers = function () {
      $scope.showUsers = !$scope.showUsers;
    }

    $scope.unhideUsers = function (cond) {
      $scope.showUsers = cond;
    }

    $scope.toggleInvitations = function () {
      $scope.showInvitations = !$scope.showInvitations;
    }

    $scope.selectChannel = function (index, type) {
      if (type === 'private') {
        $scope.activeChannel = $scope.groups[$scope.activeGroup].privateChannels[index];
        $scope.notifications[$scope.groups[$scope.activeGroup].id] = $scope.notifications[$scope.groups[$scope.activeGroup].id]-$scope.notifications[$scope.groups[$scope.activeGroup].privateChannels[index].id];
        $scope.notifications[$scope.groups[$scope.activeGroup].privateChannels[index].id] = 0;
        // Emitimos evento de selecion de canal para recibir nuevos mensajes
        Socket.emit('selectChannel', {'channelid': $scope.groups[$scope.activeGroup].privateChannels[index].id});
      } else {
        $scope.activeChannel = $scope.groups[$scope.activeGroup].publicChannels[index];
        $scope.notifications[$scope.groups[$scope.activeGroup].id] = $scope.notifications[$scope.groups[$scope.activeGroup].id]-$scope.notifications[$scope.groups[$scope.activeGroup].publicChannels[index].id];
        $scope.notifications[$scope.groups[$scope.activeGroup].publicChannels[index].id] = 0;
        // Emitimos evento de selecion de canal para recibir nuevos mensajes
        Socket.emit('selectChannel', {'channelid': $scope.groups[$scope.activeGroup].publicChannels[index].id});
      }
      getMessages($scope.activeGroup, type);
      $ionicSideMenuDelegate.canDragContent(true);
      $scope.showChannelSettings = false;
      $scope.showGroupSettings = false;
      $scope.activeChannel.type = type;
    };

    function getMessages(groupindex, type) {

      if (type === 'public') {
        ChatService.getMessages($scope.groups[groupindex].id, $scope.activeChannel).then(function (data) {

          for(var i = 0; i < data.data.length; i++){
            if(data.data[i].messageType == 'URL'){
              data.data[i].visible = 0;
            }
          }


          $scope.messagess = data.data;

          //addMessages(data);
        });
      } else {
        ChatService.getMessages($scope.groups[groupindex].id, $scope.activeChannel).then(function (data) {

          for(var i = 0; i < data.data.length; i++){
            if(data.data[i].messageType == 'URL'){
              data.data[i].visible = 0;
            }
          }


          $scope.messagess = data.data;
          //addMessages(data);
        });
      }

    };

    $scope.getInternalMessage = function ($index) {
      var internalMessage = $scope.messagess[$index].text;
      var re = /internalMessage#(\w+)\./i;
      var matchArr, answerData;
      var messageType, messageText = "";

      var matchArr = internalMessage.match(re);
      if (matchArr) (matchArr.length > 1) ? messageType=matchArr[1] : messageType="";

      if (messageType == 'NEW_ANSWER') {
        answerData = getAnswerData(internalMessage);
        messageText = "<strong>"+answerData.answerUser + "</strong> added a new answer for a <a class=\"question-link\" ng-click=\"gotoAnchor('" + answerData.questionId + "')\">"+answerData.questionTitle+"</a>";
      }

      return messageText;

    };

    function getAnswerData (internalMessage) {
      var re, matchArr;
      var answerData = {};

      re = /QuestionId: \'(\w+)\'/i;
      matchArr = internalMessage.match(re);
      if (matchArr) answerData.questionId=matchArr[1];

      re = /AnswerId: \'(\w+)\'/i;
      matchArr = internalMessage.match(re);
      if (matchArr) answerData.answerId=matchArr[1];

      for (var i = 0; i < $scope.messagess.length; i++) {
        if ($scope.messagess[i].id == answerData.questionId) {
          answerData.questionTitle = $scope.messagess[i].title;
          for (var j=0; j < $scope.messagess[i].answers.length; j++) {
            if ($scope.messagess[i].answers[j].id == answerData.answerId) {
              answerData.answerUser = $scope.messagess[i].answers[j].user.username;
              break;
            }
          }
          break;
        }
      }

      return answerData;

    }

    $scope.gotoAnchor = function (anchor) {
      $ionicScrollDelegate.scrollTo(0, document.getElementById('56cf0485591482783e6595dc').offsetTop, true);
      //$ionicScrollDelegate.anchorScroll(anchor);
    }

    $scope.trustAsHtml = function(string) {
      return $sce.trustAsHtml(string);
    };

    $scope.$on('messageRenderCallback', function (messageRenderCallbackEvent) {
      $ionicScrollDelegate.$getByHandle('messageScroll').scrollBottom(true);
    });

    function addMessages(messages) {
      for (var i = 0; i < messages.data.length; i++) {
        var messageContainer = document.createElement('div');
        messageContainer.classList.add('list');
        messageContainer.classList.add('card');
        var newMessage = document.createElement('div');
        newMessage.classList.add('item');
        newMessage.classList.add('item-text-wrap');
        var messageText = document.createTextNode(messages.data[i].user.username + ': ' + messages.data[i].text);
        newMessage.appendChild(messageText);
        messageContainer.appendChild(newMessage);
        document.getElementById('cardList').appendChild(messageContainer);

        //cotenedor titulo
        var titleItem = document.createElement('div');
        titleItem.classList.add('item');
        titleItem.classList.add('item-text-wrap');
        var messageTextTitle = document.createTextNode(messages.data[i].user.username + ': ' + messages.data[i].text);
        var subtitle = document.createElement('p');
        var messageTextSubtitle = document.createTextNode(messages.data[i].user.username + ': ' + messages.data[i].text);
      }
    }

    function addMessage(message) {
      /*
       var newMessage = document.createElement('div');
       newMessage.classList.add('item');
       newMessage.classList.add('item-text-wrap');
       var messageText = document.createTextNode(window.localStorage.getItem('username')+': '+message);
       newMessage.appendChild(messageText);
       document.getElementById('cardList').appendChild(newMessage);
       */
    }

    $scope.searchDirectChannel = function (member) {

      $scope.notifications[$scope.groups[$scope.activeGroup].id] = $scope.notifications[$scope.groups[$scope.activeGroup].id]-$scope.notifications[member.id];
      $scope.notifications[member.id] = 0;

      $scope.showChannelSettings == false;
      $scope.showGroupSettings == false;

      var userid = window.localStorage.getItem('userid');
      var groupid = $scope.groups[$scope.activeGroup].id;
      var directChannels = $scope.groups[$scope.activeGroup].directMessageChannels;

      var channel = GroupsService.searchDirectChannel(userid, member, directChannels);
      if (channel != null) {
        $scope.activeChannel = channel;
        getMessages($scope.activeGroup, 'private');
      }
      else {
        GroupsService.createDirectChannel(userid, $scope.username, member, groupid)
          .then(function (channel) {
            $scope.groups[$scope.activeGroup].directMessageChannels.push(channel);
            $scope.activeChannel = channel;
            getMessages($scope.activeGroup, 'private');
            $ionicSideMenuDelegate.canDragContent(true);
          },
          function (err) {
            // Tratar el error
            console.log("Error al crear el canal para mensajes directos");
            console.log(err.message);
            $scope.error = err.message;
          })
      }
    };



    /** new **/

    $scope.changeVisible = function ($index) {
      console.log("cambio visible aaa ");


      if($scope.messagess[$index].visible == 0){
        $scope.messagess[$index].visible = 1;



      }
      else{
        $scope.messagess[$index].visible = 0;

      }
      console.log($scope.messagess[$index].visible );

    };




    $scope.getMetaTags = function (msg, $index) {
      var url = msg.text;
      console.log("entro en metatags");

      var userid = window.localStorage.getItem('userid');

      var data = {
        userid: userid,
        url: url
      };


      ChatService.getMetaTags(data).then(
        function(result) {


          console.log("esto vale data");
          console.log(result);

          if(result.data == null){
            /* si la url no esta soportada */
            console.log("hay error al coger los metadatos");
            $scope.messagess[$index].response_data_url = $sce.trustAsHtml( "<h3> No information available </h3>");
          }
          else{


            /* sino tiene tipo es 1 link */
            if(typeof (result.data.type) == 'undefined'){
              /* 1 link puede tener imagen o no */

              var image = '';
              var tittle = '';
              var descrip = '';
              var author_link = '';
              var keywords = '';

              if(typeof (result.data.title) !== 'undefined') {
                tittle = "<h3>"+result.data.title+"</h3>";

              }

              if(typeof (result.data.description) !== 'undefined') {
                descrip = "<p>"+result.data.description+"</p>";

              }

              if(typeof (result.data.author) !== 'undefined') {
                author_link = "<p>From "+result.data.author+"</p>";

              }

              if(result.data.keywords.length > 0) {
                for(var i = 0; i<  result.data.keywords.length; i++){
                  keywords = keywords + "<p><span class='label label-info'>"+result.data.keywords[i]+"</span></p>";

                }

              }


              if(typeof (result.data.image) !== 'undefined') {
                image = "<img src=" + result.data.image + ">";

              }

              $scope.messagess[$index].response_data_url = $sce.trustAsHtml( tittle +
                descrip +
                author_link +
                keywords +
                image);


            }/* end if typeof (result.type) == 'undefined' */
            /* es 1 video, audio, etc. */
            else{
              /* si es video = html
               * si es foto url para src de img
               * si es rich = html */

              var author = '';
              var html_img = '';
              var title2 = '';
              var provider = '';

              if(typeof (result.data.title) !== 'undefined'){
                title2 = "<h3>"+result.data.title+"</h3>";
              }


              if(typeof (result.data.provider_name) !== 'undefined'){
                provider = "<p>"+result.data.provider_name+"</p>";
              }


              if(typeof (result.data.author_name) !== 'undefined'){
                author = "<p> From "+result.data.author_name+"</p>";
              }


              if(result.data.type == 'video' || result.data.type == 'rich'){
                html_img = result.data.html;
              }

              else if(result.data.type == 'photo'){
                html_img = "<img src="+result.data.url+">";
              }

              $scope.messagess[$index].response_data_url = $sce.trustAsHtml(title2 +
                provider +
                author +
                html_img);


            }/* end else typeof (data.type) == 'undefined' */

          }



          /*$scope.gotoAnchor(msg.id);*/


        },
        function(error) {
          // TODO: mostrar error
          console.log("error getMetaTags");
          console.log(error);
        }
      );

    };





    /** end new **/


    /**** new ***/

    $scope.loadUrl = function (url) {

      window.open(url, '_system', 'location=no');
      showToast('Started load url', $ionicLoading);


    }



    function findUrls( text )
    {
      var source = (text || '').toString();
      var urlArray = [];
      var url;
      var matchArray;

      // Regular expression to find FTP, HTTP(S) and email URLs.
      var regexToken = /(((ftp|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g;

      // Iterate through any URLs in the text.
      while( (matchArray = regexToken.exec( source )) !== null )
      {
        var token = matchArray[0];
        urlArray.push( token );
      }

      return urlArray;
    }

    $scope.sendText = function (text) {

      //addMessage(text);

      //$scope.messagess.push(data);
      if ($scope.activeGroup === -1) {
        showToast('Seleccione un grupo', $ionicLoading);
      }
      else {


        if ($scope.activeChannel === null) {
          showToast('Seleccione un canal', $ionicLoading);
        }
        else {
          var data = {
            userid: window.localStorage.getItem('userid'),
            groupid: $scope.groups[$scope.activeGroup].id,
            channelid: $scope.activeChannel.id,
            text: text,
            messageType: 'TEXT'
          };

          var tempdata = text.slice();
          var arrayurls = findUrls(tempdata);
          var atempdata = tempdata.split(" ");


          /* sino hay url se manda el mensaje */
          if (arrayurls.length == 0) {
            ChatService.postMessage(data).then(
              function (result) {
                $scope.text = "";
                console.log(result.data);
              },
              function (error) {
                // TODO: Mostrar error
                console.log(error);
              }
            );

          }
          /* hay urls */
          else {
            /* si hay urls pero es lo uniko */
            if (atempdata.length == 1) {
              data.messageType = 'URL';

              ChatService.postMessage(data).then(
                function (result) {
                  $scope.text = "";
                  console.log(result.data);
                },
                function (error) {
                  // TODO: Mostrar error
                  console.log(error);
                }
              );

            }
            /* si hay de tod0: texto y urls  */
            else {

              var sortarrayall = [];
              var texttemp = '';
              var indexsortarrayall = 0;
              var indexurls = 0;

              /* para cada obj mirar si es o no url
               * sino lo es: lo vamos metiendo tod0 en 1 var temporal
               * si lo es, hacemos push de la temporal y luego de la url */

              for (var i = 0; i < atempdata.length; i++) {

                if (atempdata[i] == arrayurls[indexurls]) {
                  /* metemos lo anterior si hay, y sino la url */

                  if (texttemp !== '') {
                    var objdata = {};
                    objdata.text = texttemp;
                    objdata.messageType = 'TEXT';
                    sortarrayall[indexsortarrayall] = objdata;
                    texttemp = '';
                    indexsortarrayall++;

                  }
                  var objdata = {};
                  objdata.text = atempdata[i];
                  objdata.messageType = 'URL';
                  sortarrayall[indexsortarrayall] = objdata;
                  indexsortarrayall++;
                  indexurls++;


                }
                else {
                  //si es la ultima posicion en el for y no es url, meterlo en el array

                  if (i == atempdata.length - 1 && atempdata[i] !== '') {
                    var objdata = {};

                    texttemp = texttemp + atempdata[i] + " ";
                    objdata.text = texttemp;
                    objdata.messageType = 'TEXT';
                    sortarrayall[indexsortarrayall] = objdata;
                    texttemp = '';

                    indexsortarrayall++;


                  }
                  texttemp = texttemp + atempdata[i] + " ";

                }

              }
              /* end for */
              /* ahora que tenemos los campos a modificar y enteros
               los mandamos*/

              angular.forEach(sortarrayall, function (value, key) {

                var data = {
                  userid: window.localStorage.getItem('userid'),
                  groupid: $scope.groups[$scope.activeGroup].id,
                  channelid: $scope.activeChannel.id,
                  text: value.text,
                  messageType: value.messageType
                };

                console.log("esto envio desde el controlador");
                console.log("con index " + key);
                console.log(data.text);
                console.log(data.messageType);
                console.log("********************");

                ChatService.postMessage(data).then(
                  function (result) {
                    $scope.text = "";
                    console.log(result.data);
                  },
                  function (error) {
                    // TODO: Mostrar error
                    console.log(error);
                  }
                );


              });
              /* end foreach */

            }
            /* end else:hay urls y texto normal */

          }
          /*end else arrayurls.length == 0 */
        } /* end else $scope.activeChannel === null */
      } /* end else $scope.activeGroup === -1 */

    };



    /** end new **/

    /*
     $scope.clearMessages = function() {
     var div = document.getElementById('cardList');
     if (div) {
     while (div.firstChild) {
     div.removeChild(div.firstChild);
     }
     $scope.activeChannel = null;
     }
     }
     */
    $scope.showNewChannelPopup = function (type) {
      $scope.newChannel = {};

      $ionicPopup.show({
        template: '<input type="text" placeholder="Channel Name" ng-model="newChannel.channelName">',
        title: 'Enter new channel name',
        scope: $scope,
        buttons: [
          {text: 'Cancel'},
          {
            text: '<b>Confirm</b>',
            type: 'button-positive',
            onTap: function (e) {
              if (!$scope.newChannel.channelName) {
                showErrorAlert('Channel name is required');
              } else {
                $scope.newChannel.channelType = type;
                GroupsService.createNewChannel($scope.groups[$scope.activeGroup].id, $scope.newChannel).then(
                  function (data) {
                    if (type === 'PUBLIC') {
                      //$scope.groups[$scope.activeGroup].publicChannels[$scope.groups[$scope.activeGroup].publicChannels.length] = data.data;
                    } else {
                      //$scope.groups[$scope.activeGroup].privateChannels[$scope.groups[$scope.activeGroup].privateChannels.length] = data.data;
                    }
                  }, function (err) {
                    // Tratar el error
                    showErrorAlert(err);
                  }
                );
              }
            }
          }
        ]
      });
    };

    $scope.showNewGroupPopup = function () {
      $scope.data = {};

      $ionicPopup.show({
        template: '<input type="text" placeholder="Group Name" ng-model="data.groupName">',
        title: 'Enter new group name',
        scope: $scope,
        buttons: [
          {text: 'Cancel'},
          {
            text: '<b>Confirm</b>',
            type: 'button-positive',
            onTap: function (e) {
              if (!$scope.data.groupName) {
                showErrorAlert('Group name is required');
              } else {
                GroupsService.createNewGroup($scope.data).then(
                  function (data) {
                    $scope.groups.push(data.data);
                    /*GroupsService.getChannels(data.data.id).then(
                      function (dataChannels) {
                        $scope.groups[$scope.groups.length] = dataChannels;
                      }, function (err) {
                        showErrorAlert(err);
                      }
                    );*/
                  }, function (err) {
                    // Tratar el error
                    showErrorAlert(err);
                  }
                );
              }
            }
          }
        ]
      });
    };

    $scope.showInviteUserPopup = function () {
      $scope.data = {};

      $ionicPopup.show({
        template: '<input type="text" placeholder="User email" ng-model="data.newUser">',
        title: 'Invite new user',
        scope: $scope,
        buttons: [
          {text: 'Cancel'},
          {
            text: '<b>Confirm</b>',
            type: 'button-positive',
            onTap: function (e) {
              if (!$scope.data.newUser) {
                showErrorAlert('Email is required');
              } else {
                return $scope.data.newUser;
              }
            }
          }
        ]
      });
    };

    $scope.acceptInvitation = function (invitation, index) {
      ChatService.acceptInvitation(invitation.groupid)
        .then(function (data) {
          $scope.invitations.splice(index, 1);
          $scope.groups.push(data);

        }
        , function (err) {
          // Tratar el error
          console.log("Hay error");
          console.log(err.message);
          $scope.error = err.message;

        });

    };

    $scope.refuseInvitation = function (invitation, index) {

      ChatService.refuseInvitation(invitation.groupid)
        .then(function (data) {
          $scope.invitations.splice(index, 1);
        }
        , function (err) {
          // Tratar el error
          console.log("Hay error");
          console.log(err.message);
          $scope.error = err.message;

        });
    };

    //SETTINGS

    $scope.cancelNameInput = function () {
      var target = document.getElementById('settingsNameInput');
      target.value = $scope.groups[$scope.activeGroup].groupName;
    };

    $scope.updateGroupName = function () {

      var newName = document.getElementById('settingsNameInput').value;
      GroupsService.editGroup($scope.groups[$scope.activeGroup].id, newName).then(
        function (data) {
          $scope.groups[$scope.activeGroup] = data;
        }, function (err) {
          showErrorAlert(err.message);
        }
      );
    };

    $scope.memberCardStyle = function () {
      var memberCard = document.getElementById('membersCard');
      memberCard.style.boxShadow = 'none';
      memberCard.style.backgroundColor = 'transparent';
      setTimeout(function () {
        memberCard.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
        memberCard.style.backgroundColor = 'background-color: #fff';
      }, 1500);
    };

    $scope.highlight = function (text, search) {
      if(text != undefined) {
        if (!search) {
          return $sce.trustAsHtml(text);
        }
        return $sce.trustAsHtml(text.replace(new RegExp(search, 'gi'), '<span class="highlightedText">$&</span>'));
      }
    };

    $scope.leaveGroupConfirm = function () {

      var confirmPopup = $ionicPopup.confirm({
        title: 'Leaving ' + $scope.groups[$scope.activeGroup].groupName,
        template: 'Are you sure you want to leave this group?'
      });

      confirmPopup.then(function (res) {
        if (res) {
          GroupsService.unsuscribeFromGroup($scope.groups[$scope.activeGroup].id).then(
            function (data) {
              $scope.groups.splice($scope.activeGroup, 1);
              $scope.activeGroup = -1;
              $scope.showChannels = false;
              $scope.activeChannel = null;
              $scope.showUsers = false;
            }, function (err) {
              showErrorAlert("Error occurred while leaving the group: " + err.message);
            }
          );
        }
      });
    };

    $scope.deleteGroupConfirm = function () {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Deleting ' + $scope.groups[$scope.activeGroup].groupName,
        template: 'Are you sure you want to delete this group?'
      });

      confirmPopup.then(function (res) {
        if (res) {
          GroupsService.deleteGroup($scope.groups[$scope.activeGroup].id).then(
            function (data) {
              $scope.groups.splice($scope.activeGroup, 1);
              $scope.activeGroup = -1;
              $scope.showChannels = false;
              $scope.activeChannel = null;
              $scope.showUsers = false;
            }, function (err) {
              showErrorAlert("Error occurred while deleting the group: " + err.message);
            }
          );
        }
      });
    };

    $scope.expelUser = function(user) {
      GroupsService.removeUserFromGroup(user, $scope.groups[$scope.activeGroup]).then(
        function(data) {
          $scope.groups[$scope.activeGroup] = data.data;
        }, function(err) {
          showErrorAlert(err.message);
        }
      );
    };

    $scope.expelUserFromChannel = function(user) {
      GroupsService.deleteUserFromChannel($scope.groups[$scope.activeGroup].id, $scope.activeChannel.id, user).then(
        function(data) {

        }, function(err) {
          showErrorAlert(err.message);
        }
      );
    };

    $scope.toggleChannelSettings = function() {
      if($scope.activeChannel !== null) {
        $scope.showChannelSettings = !$scope.showChannelSettings;
        $scope.showGroupSettings = false;
      }
    };

    $scope.toggleGroupSettings = function() {
      $scope.showChannelSettings = false;
      $scope.showGroupSettings = !$scope.showGroupSettings;
    };

    $scope.channelMemberCardStyle = function () {
      var memberCard = document.getElementById('channelMembersCard');
      memberCard.style.boxShadow = 'none';
      memberCard.style.backgroundColor = 'transparent';
      setTimeout(function () {
        memberCard.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
        memberCard.style.backgroundColor = 'background-color: #fff';
      }, 1500);
    };

    $scope.cancelChannelNameInput = function () {
      var target = document.getElementById('channelSettingsNameInput');
      target.value = $scope.activeChannel.channelName;
    };

    $scope.updateChannelName = function () {

      var newName = document.getElementById('channelSettingsNameInput').value;
      GroupsService.editChannel($scope.groups[$scope.activeGroup].id, $scope.activeChannel.id, newName).then(
        function (data) {

        }, function (err) {
          showErrorAlert(err.message);
        }
      );
    };

    $scope.leaveChannelConfirm = function () {

      var confirmPopup = $ionicPopup.confirm({
        title: 'Leaving ' + $scope.activeChannel.channelName,
        template: 'Are you sure you want to leave this channel?'
      });

      confirmPopup.then(function (res) {
        if (res) {
          GroupsService.unsubscribeFromChannel($scope.groups[$scope.activeGroup].id, $scope.activeChannel.id).then(
            function (data) {
              console.log(data);
            }, function (err) {
              showErrorAlert("Error occurred while leaving the channel: " + err.message);
            }
          );
        }
      });
    };

    $scope.deleteChannelConfirm = function () {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Deleting ' + $scope.activeChannel.channelName,
        template: 'Are you sure you want to delete this channel?'
      });

      confirmPopup.then(function (res) {
        if (res) {
          GroupsService.deleteChannel($scope.groups[$scope.activeGroup].id, $scope.activeChannel.id).then(
            function (data) {
              console.log(data);
            }, function (err) {
              showErrorAlert("Error occurred while deleting the channel: " + err.message);
            }
          );
        }
      });
    };

    //MODALS

    $ionicModal.fromTemplateUrl('templates/searchUsers.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.searchmodal = modal;
    });


    $scope.closeSearch = function() {
      $scope.searchModalClosed = true;
      $scope.searchmodal.hide();
    };


    $scope.search = function() {
      $scope.searchModalClosed = false;
      $scope.searchmodal.show();
      ChatService.getSystemUsers().then(
        function(data) {
          $scope.systemUsers = data;
        }, function(err) {
          showErrorAlert(err.message);
        }
      );
    };

    $scope.inviteUser = function(user) {

      GroupsService.inviteUserToGroup(user, $scope.groups[$scope.activeGroup]).then(
        function(data) {
          showToast('User invited successfully to the group', $ionicLoading);
        }, function(err) {
          showErrorAlert(err.message);
        }
      );

    };

    $scope.inviteUserToChannel = function(user) {

      GroupsService.addUserToChannel($scope.groups[$scope.activeGroup].id, $scope.activeChannel.id, user).then(
        function(data) {
          showToast('User added successfully to the channel', $ionicLoading);
        }, function(err) {
          showErrorAlert(err.message);
        }
      );

    };

    $scope.toggleSystemUsers = function(cond) {
      if(cond === true){
        $ionicTabsDelegate.select(0);
      } else {
        $ionicTabsDelegate.select(1);
      }
      $scope.showSystemUsers = cond;
    };

    $scope.isInGroup = function(user) {
      if(!$scope.searchModalClosed) {
        var tempUsers = $scope.groups[$scope.activeGroup].users;
        if (tempUsers !== undefined) {
          for (var i = 0; i < tempUsers.length; i++) {
            if (tempUsers[i].id === user.id) {
              return true;
            }
          }
        }
      }
      return false;
    };

    $scope.isInChannel = function(user) {
      var tempUsers = $scope.activeChannel.users;
      if(tempUsers !== undefined) {
        for (var i = 0; i < tempUsers.length; i++) {
          if (tempUsers[i].id === user.id) {
            return true;
          }
        }
      }
      return false;
    };

    //MESSAGES

    $scope.showActionSheet = function() {

      // Show the action sheet
      $ionicActionSheet.show({
        buttons: [
          {text: '<i class="icon ion-camera"></i>Take picture'},
          {text: '<i class="icon ion-document"></i>Upload a file'},
          {text: '<i class="icon ion-help"></i>Create a question'}
        ],
        titleText: 'Action',
        cancelText: 'Cancel',
        cancel: function () {
          // add cancel code..
        },
        buttonClicked: function (index) {
          if(index == 0){
            navigator.camera.getPicture(
              function(data) {
                console.log("**************************************************************************************************************"+data+'+++++++++++++++++++++++++++++++++++++++');
                $scope.confirmTakePicture(data);
              }, function(err) {
                showErrorAlert(err);
              }, null);
          } else if(index == 1){
            ionic.trigger('click', { target: document.getElementsByClassName('file')[0] });
          } else if(index == 2) {
            if($scope.activeGroup !== -1 && $scope.activeChannel !== -1 && !$scope.showGroupSettings && !$scope.showChannelSettings) {
              $scope.newQuestion();
            }
          }
          return true;
        }
      })
    };

    //ANSWER MODAL

    $ionicModal.fromTemplateUrl('templates/answer.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.answermodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeAnswer = function () {
      $scope.answermodal.hide();
    };

    // Open the login modal
    $scope.answer = function (messageid) {
      $scope.activeMessageId = messageid;
      if(window.localStorage.getItem('token') != undefined) {
        $scope.answermodal.show();
      } else {
        $scope.login();
      }
    };

    $scope.doAnswer = function (answer) {

      var requestData = {
        userid: window.localStorage.getItem('userid'),
        groupid: $scope.groups[$scope.activeGroup].id,
        channelid: $scope.activeChannel.id,
        messageid: $scope.activeMessageId,
        text: answer.body,
        messageType: 'QUESTION'
      };

      ChatService.postAnswer(requestData).then(
        function (data) {
          $scope.closeAnswer();
        },
        function (err) {
          showErrorAlert(err.message);
        }
      );

    };

    //NEW QUESTION MODAL

    $ionicModal.fromTemplateUrl('templates/newQuestion.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.newquestionmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeNewQuestion = function () {
      $scope.newquestionmodal.hide();
    };

    // Open the login modal
      $scope.newQuestion = function () {
      if(window.localStorage.getItem('token') != undefined) {
        $scope.newquestionmodal.show();
      } else {
        $scope.login();
      }
    };

    $scope.doNewQuestion = function (newquestion) {

      var requestData = {
        userid: window.localStorage.getItem('userid'),
        groupid: $scope.groups[$scope.activeGroup].id,
        channelid: $scope.activeChannel.id,
        title: newquestion.title,
        text: newquestion.body,
        messageType: 'QUESTION'
      };

      ChatService.postMessage(requestData).then(
        function (data) {
          $scope.closeNewQuestion();
        },
        function (err) {
          showErrorAlert(err.message);
        }
      );

    };

    //PUBLISH
    $ionicModal.fromTemplateUrl('templates/shareQuestion.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.sharequestionmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeShareQuestion = function () {
      $scope.sharequestionmodal.hide();
    };

    // Open the login modal
    $scope.shareQuestion = function (question) {
      $scope.questionToShare = question;
      if(window.localStorage.getItem('token') != undefined) {
        $scope.sharequestionmodal.show();
      } else {
        $scope.login();
      }
    };

    $scope.doShareQuestion = function (sharedQuestion) {

      if (!sharedQuestion.tags) {
        showErrorAlert('Tags required');
      }
      else {
        var requestData = {
          groupid: $scope.groups[$scope.activeGroup].id,
          channelid: $scope.activeChannel.id,
          messageid: $scope.questionToShare.id,
          tags: sharedQuestion.tags
        };

        ChatService.publishMessage(requestData).then(
          function(result) {
            showToast('Question published successfully!', $ionicLoading);
            $scope.closeShareQuestion();
          },
          function(error) {
            showErrorAlert(error.message);
          }
        );

      }

    };

/*
    $scope.shareQuestion = function(question){
      $ionicPopup.show({
        template: '<label>Your Question</label><p>{{question.text}}</p> <br> <label>Tags</label> <tags-input type="text" placeholder="Tags" ng-model="sharedQuestion.tags" replace-spaces-with-dashes="false" display-property="text" add-on-space="true" min-length="2"></tags-input>',
        title: 'Share Question',
        scope: $scope,
        buttons: [
          {
            text: 'Cancel'
          },
          {
            text: '<b>Confirm</b>',
            type: 'button-positive',
            onTap: function (e) {

              if (!$scope.sharedQuestion.tags) {
                showErrorAlert('Tags required');
              }
              else {
                var requestData = {
                  messageid: question.id,
                  tags: $scope.sharedQuestion.tags
                };

                ChatService.publishMessage(requestData).then(
                  function(result) {
                    showToast('Question published successfully!', $ionicLoading);

                  },
                  function(error) {
                    showErrorAlert(error.message);
                  }
                );

              }

            }
          }
        ]
      });

    };
*/
    //ERRORS

    function showErrorAlert(message) {
      var alertPopup = $ionicPopup.alert({
        title: 'Error!',
        template: message
      });
    }

    //FILES

    $scope.confirmUploadFile = function(){
      $ionicPopup.show({
        template: '<label>Your File</label><input type="text" ng-value="file.name" disabled> <br> <label>Comment(Optional)</label> <input type="text" ng-value="file.name" placeholder="Comment" ng-model="comment">',
        title: 'Upload File',
        scope: $scope,
        buttons: [
          {
            text: 'Cancel',
            onTap: function (e) {
              $scope.file = '';
            }
          },
          {
            text: '<b>Confirm</b>',
            type: 'button-positive',
            onTap: function (e) {
              if (!$scope.file) {
                showErrorAlert('File required');
              } else {

                $scope.progress=0;
                $scope.uploading = true;

                var uploadData = {
                  userid: window.localStorage.getItem('userid'),
                  groupid: $scope.groups[$scope.activeGroup].id,
                  channelid: $scope.activeChannel.id,
                  file: $scope.file,
                  filename: $scope.file.name,
                  messageType: 'FILE'
                };

                if ($scope.comment) {
                  uploadData.comment = $scope.comment;
                }

                ChatService.uploadFileS3(uploadData).then(
                  function (result) {
                    $ionicLoading.hide();
                    showToast('File uploaded successfully!!', $ionicLoading);
                    ChatService.postMessage(uploadData).then(
                      function (result) {

                      },
                      function (error) {
                        showErrorAlert(error.message);
                      }
                    );

                  },
                  function (error) {
                    showErrorAlert(error.message);
                  },
                  function (progress) {
                    $scope.progress = Math.min(100, parseInt(100.0 * progress.loaded / progress.total));
                    $ionicLoading.show({
                      template: $scope.progress+'%'
                    });
                    //console.log('Uploading: '+progress+'%');
                  }
                );
              }
            }
          }
        ]
      });
    };

    $scope.confirmTakePicture = function(fileData){

      window.resolveLocalFileSystemURI(fileData, function(fileEntry) {
        fileEntry.file(function(file) {
          $scope.filename = file.name;
          console.log('******************************************************************************************'+JSON.stringify(fileData));
          console.log('******************************************************************************************'+JSON.stringify(file));
          var reader = new FileReader();
          reader.onloadend = function (evt) {
            var theBody = btoa(evt.target._result);
            $ionicPopup.show({
              template: '<label>Your Picture</label><input type="text" ng-value="filename" disabled> <br> <label>Comment(Optional)</label> <input type="text" placeholder="Comment" ng-model="comment">',
              title: 'Upload File',
              scope: $scope,
              buttons: [
                {
                  text: 'Cancel',
                  onTap: function (e) {
                    $scope.file = '';
                  }
                },
                {

                  text: '<b>Confirm</b>',
                  type: 'button-positive',
                  onTap: function (e) {
                    var filename = 'Capture from ' + new Date();
                    if ($scope.pictureTitle != undefined && $scope.pictureTitle != '') {
                      filename = $scope.pictureTitle;
                    }
                    console.log('******************************************************************************************************' + filename + '*****************************************');



                    $scope.progress = 0;
                    $scope.uploading = true;
                    var decodedData = window.atob(theBody);

                    var uploadData = {
                      userid: window.localStorage.getItem('userid'),
                      groupid: $scope.groups[$scope.activeGroup].id,
                      channelid: $scope.activeChannel.id,
                      file: file,
                      filename: file.name,
                      messageType: 'FILE'
                    };

                    if ($scope.comment) {
                      uploadData.comment = $scope.comment;
                    }

                    ChatService.uploadFileS3FromPicture(uploadData, fileData).then(
                      function (result) {
                        $ionicLoading.hide();
                        //uploadData.file = fileEntry;
                        showToast('File uploaded successfully!!', $ionicLoading);
                        ChatService.postMessage(uploadData).then(
                          function (result) {

                          },
                          function (error) {
                            console.log('-----------------------------------------------'+JSON.stringify(error));
                            showErrorAlert(error.data.message);
                          }
                        );

                      },
                      function (error) {
                        console.log('++++++++++++++++++++++++++++++++++++++++++++++++'+JSON.stringify(error));
                        showErrorAlert(error.data.message);
                      },
                      function (progress) {
                        $scope.progress = Math.min(100, parseInt(100.0 * progress.loaded / progress.total));
                        $ionicLoading.show({
                          template: $scope.progress + '%'
                        });
                        //console.log('Uploading: '+progress+'%');
                      }
                    );
                  }
                }
              ]
            });
          };
          reader.readAsDataURL(file);
        });
      });
    };

    $scope.getDownloadLink = function (filename, ev, userid) {

      ev.preventDefault();

      var data = {
        userid: userid,
        groupid: $scope.groups[$scope.activeGroup].id,
        channelid: $scope.activeChannel.id,
        filename: filename
      };

      ChatService.getDownloadUrl(data).then(
        function (result) {
          window.open(result.data.url, '_system', 'location=no');
          showToast('Started downloading file', $ionicLoading);
        },
        function (error) {
          // TODO: Mostrar error
          showErrorAlert(error.message);
        }
      );

    };

    //Gestion de recepcion de sockets
    $scope.lastNotificationId = 1;

    Socket.on('newMessage', function (data) {
      var messageGroupName = getGroup(data.groupid);
      //var notificationId = getNotificationId();
      /* si esta en el canal */
      if(($scope.activeChannel != null && data.message.channel.id === $scope.activeChannel.id) || ($scope.activeChannel != null && data.message.channel.channelType == 'DIRECT' && data.message.channel.channelName == $scope.activeChannel.channelName.split('-')[1]+'-'+$scope.activeChannel.channelName.split('-')[0])) {

        if(data.message.messageType == 'URL'){

          data.message.visible = 0;


        }

        $scope.messagess.push(data.message);
      } else {
        $scope.notifications[data.groupid]++;
        var groupElem = document.getElementById(data.groupid+'-badge');
        groupElem.className = 'badge badge-assertive shake';
        setTimeout(function(){
          groupElem.className = 'badge badge-assertive';
        }, 1000);
        //NOTIFICATION
        cordova.plugins.notification.local.schedule({
          id: notificationId,
          title: messageGroupName+" > "+data.message.channel.channelName,
          text: '@'+data.message.user.username+': '+data.message.text
        });
        console.log('**************************************************Nuevo Mensaje!!!!! '+data.message.text);
        if(data.message.channel.channelType == 'DIRECT'){
          $scope.notifications[data.message.user.id]++;
          var userElem = document.getElementById(data.message.user.id+'-badge');
          userElem.className = 'badge badge-assertive shake';
          setTimeout(function(){
            userElem.className = 'badge badge-assertive';
          }, 1000);

        } else {
          //NOTIFICATION
          cordova.plugins.notification.local.schedule({
            id: notificationId,
            title: messageGroupName+" > "+data.message.channel.channelName+" > "+data.message.user.username,
            text: '@'+data.message.user.username+': '+data.message.text
          });
          console.log('***********************************************************Nuevo Mensaje!!!!! '+data.message.text);
          $scope.notifications[data.message.channel.id]++;
          var channelElem = document.getElementById(data.message.channel.id+'-badge');
          channelElem.className = 'badge badge-assertive shake';
          setTimeout(function(){
            channelElem.className = 'badge badge-assertive';
          }, 1000);
        }
      }
      $scope.$apply();
    });

    function getGroup(id) {
      for(var i = 0 ; i<$scope.groups.length ; i++) {
        if($scope.groups[i].id == id) {
          return $scope.groups[i].groupName;
          break;
        }
      }
    }

    function getChannel(groupid, channelid, type) {
      for(var i = 0 ; i<$scope.groups.length ; i++) {
        if($scope.groups[i].id == groupid) {
          if(type == 'PUBLIC') {
            for (var j = 0; j < $scope.groups.publicChannels.length; j++){
              if($scope.groups.publicChannels[j].id == channelid){
                return $scope.groups.publicChannels[j].channelName;
              }
            }
          } else if(type == 'PRIVATE') {
            for (var j = 0; j < $scope.groups.privateChannels.length; j++){
              if($scope.groups.privateChannels[j].id == channelid){
                return $scope.groups.privateChannels[j].channelName;
              }
            }
          } else if(type == 'DIRECT') {
            return 'isDirect';
          }
        }
      }
    }

    function getNotificationId() {
      cordova.plugins.notification.local.getAllIds(function (ids) {
        if (ids.length == 0) {
          $scope.lastNotificationId = 1;
          return 1;
        } else if(ids.length == 10) {
          if($scope.lastNotificationId == 10){
            $scope.lastNotificationId = 1;
          }else {
            $scope.lastNotificationId++;
          }
          return $scope.lastNotificationId;
        } else {
          $scope.lastNotificationId = ids.length;
          return ids.length;
        }
      });
    }

    Socket.on('newQuestionAnswer', function (data) {
      var message = data;
      for (var i=0; i < $scope.messagess.length; i++) {
        if ($scope.messagess[i].id == message.id) {
          $scope.messagess[i].answers.push(message.answer);
          break;
        }
      }
      $scope.$apply();
    });

    Socket.on('newUserConnect', function (data) {
      console.log("newUserConnect: ");
      updateConnectedUser(data.userid);
      $scope.$apply();
    });

    function updateConnectedUser(userid) {
      $scope.users[userid] = true;
    }

    Socket.on('usersConnected', function (data) {
      console.log("usersConnected: ");
      console.log(data);
      if (data.users) {
        for (var i = 0; i < data.users.length; i++) {
          $scope.users[data.users[i]] = true;
        }
        $scope.$apply();
      }
    });

    Socket.on('userDisconnect', function (data) {
      $scope.users[data.userid] = false;
      $scope.$apply();
    });


    //recibir evento de invitación a grupo
    Socket.on('newGroupInvitation', function (data) {
      console.log("newGroupInvitation received from server");
      console.log(data);
      $scope.invitations.push(data);
      $scope.$apply();
    });

    //recibir evento de nuevo canal publico en grupo
    Socket.on('newPublicChannel', function (data) {
      console.log("newPublicChannel received from server");
      console.log(data);
      $scope.groups[$scope.activeGroup].publicChannels.push(data);
      $scope.$apply();
    });

    //recibir evento de nuevo canal privado en grupo
    Socket.on('newPrivateChannel', function (data) {
      console.log("newPrivateChannel receive from server");
      console.log(data);
      $scope.groups[$scope.activeGroup].privateChannels.push(data);
      $scope.$apply();
    });

    //recibir evento de nuevo usuario en grupo
    Socket.on('newMemberInGroup', function (data) {
      $scope.groups[$scope.activeGroup].users.push(data.user);
      $scope.$apply();
    });

    //recibir evento de usuario eliminado de grupo
    Socket.on('deletedMemberInGroup', function (data) {
      for (var i = 0; i < $scope.groups.length; i++) {
        if ($scope.groups[i].id === data.groupid) {
          if(data.user.id !== window.localStorage.getItem('userid')) {
            for (var j = 0; j < $scope.groups[i].users.length; j++) {
              if ($scope.groups[i].users[j].id == data.user.id) {
                $scope.groups[i].users.splice(j);
              }
            }
            $scope.groups[i] = data;
            break;
          } else {
            showToast('You have been ejected from group '+$scope.groups[i].groupName, $ionicLoading);
            if($scope.activeGroup === i){
              $scope.updateActiveGroup(-1);
              $scope.unhideChannels(false);
              $scope.unhideUsers(false);
            }
            $scope.groups.splice(i);
            break;
          }
        }
      }
      $scope.$apply();
    });

    //recibir evento de nuevo usuario en canal
    Socket.on('newMemberInChannel', function (data) {
      console.log("newMemberInChannel receive from server");
      console.log(data);
      //$scope.groups[$scope.activeGroup].
      for(var i = 0 ; i < $scope.groups[$scope.activeGroup].privateChannels.length ; i++) {
        if($scope.groups[$scope.activeGroup].privateChannels[i].id === data.channelid){
          $scope.groups[$scope.activeGroup].privateChannels[i].users.push(data.user);
        }
      }
      $scope.groups[$scope.activeGroup].privateChannels.push(data);
      $scope.$apply();
    });

    //recibir evento de usuario eliminado de canal

    Socket.on('deletedUserFromChannel', function (data) {
      if(data.user.id == $scope.userid) {
        for (var i = 0; i < $scope.groups[$scope.activeGroup].privateChannels.length; i++) {
          if ($scope.groups[$scope.activeGroup].privateChannels[i].id == data.channelid) {
            if($scope.activeChannel.id === data.channelid){
              $scope.updateActiveGroup($scope.activeGroup);
            }
            $scope.groups[$scope.activeGroup].privateChannels.splice(i,1);
          }
        }
      } else {
        for (var i = 0; i < $scope.groups[$scope.activeGroup].privateChannels.length; i++) {
          if ($scope.groups[$scope.activeGroup].privateChannels[i].id == data.channelid) {
            for (var j = 0; j < $scope.groups[$scope.activeGroup].privateChannels[i].users.length; j++) {
              if (data.user.id == $scope.groups[$scope.activeGroup].privateChannels[i].users[j].id) {
                $scope.groups[$scope.activeGroup].privateChannels[i].users.splice(j, 1);
                break;
              }
            }
            $scope.$apply();
          }
        }
      }
    });

    //recibir evento de nombre de grupo editado
    Socket.on('editedGroup', function (data) {
      $scope.groups[$scope.activeGroup] = data;
      $scope.$apply();
    });

    //recibir evento de nombre de canal publico editado
    Socket.on('editedPublicChannel', function (data) {
      console.log("editedPublicChannel receive from server");
      console.log(data);
      for (var i = 0; i < $scope.groups[$scope.activeGroup].publicChannels.length; i++) {
        if ($scope.groups[$scope.activeGroup].publicChannels[i].id == data.id) {
          $scope.groups[$scope.activeGroup].publicChannels[i].channelName = data.channelName;
          $scope.$apply();
        }
      }
    });

    //recibir evento de nombre de canal privado editado
    Socket.on('editedPrivateChannel', function (data) {
      console.log("editedPrivateChannel receive from server");
      console.log(data);
      for (var i = 0; i < $scope.groups[$scope.activeGroup].privateChannels.length; i++) {
        if ($scope.groups[$scope.activeGroup].privateChannels[i].id == data.id) {
          $scope.groups[$scope.activeGroup].privateChannels[i].channelName = data.channelName;
          $scope.$apply();
        }
      }
    });

    //recibir evento de canal privado eliminado
    Socket.on('deletedPrivateChannel', function (data) {
      console.log("deletedPrivateChannelInGroup receive from server");
      console.log(data);
      for (var i = 0; i < $scope.groups[$scope.activeGroup].privateChannels.length; i++) {
        if ($scope.groups[$scope.activeGroup].privateChannels[i].id == data.id) {
          $scope.groups[$scope.activeGroup].privateChannels.splice(i, 1);
          $scope.$apply();
        }
      }
    });

    //recibir evento de canal publico eliminado
    Socket.on('deletedPublicChannel', function (data) {
      console.log("deletedPublicChannelInGroup receive from server");
      if($scope.activeChannel != null && $scope.activeChannel.id == data.id) {
        $scope.activeChannel = null;
        $scope.showChannelSettings = false;
        $scope.showGroupSettings = true;
        showToast('This channel has been deleted', $ionicLoading);
      }
      for (var i = 0; i < $scope.groups[$scope.activeGroup].publicChannels.length; i++) {
        if ($scope.groups[$scope.activeGroup].publicChannels[i].id == data.id) {
          $scope.groups[$scope.activeGroup].publicChannels.splice(i, 1);
          $scope.$apply();
        }
      }
    });

    //recibir evento de grupo eliminado
    Socket.on('deletedGroup', function (data) {
      console.log("deletedGroup receive from server");
      for (var i = 0; i < $scope.groups.length; i++) {
        if ($scope.groups[i].id == data) {
          if($scope.activeGroup === i){
            $scope.updateActiveGroup(-1);
            $scope.unhideChannels(false);
            $scope.unhideUsers(false);
            showToast('This group has been deleted', $ionicLoading);
          }
          $scope.groups[i].splice(i, 1);
          $scope.$apply();
        }
      }
    });

    Socket.on('newGroupEvent', function (data) {
      var messageGroupName = data.groupName;
      //NOTIFICATION
      $scope.notifications[data.groupid]++;
      cordova.plugins.notification.local.schedule({
        id: 1,
        title: messageGroupName,
        text: data.message
      });
      $scope.$apply();
    });

    //Eventos de canales listados y no conectados
    Socket.on('newChannelEvent', function (data) {
      var messageGroupName = data.groupName;
      var messageChannelName = data.channelName;
      //NOTIFICATION
      cordova.plugins.notification.local.schedule({
        id: 1,
        title: messageChannelName,
        text: data.message
      });
      $scope.$apply();
    });

    Socket.on('newMessageEvent', function (data) {
      var messageGroupName = data.groupName;
      var messageChannelName = data.channelName;

      $scope.notifications[data.groupid]++;
      $scope.$apply();
      var groupElem = document.getElementById(data.groupid+'-badge');
      groupElem.className = 'badge badge-assertive shake';
      setTimeout(function(){
        groupElem.className = 'badge badge-assertive';
      }, 1000);
      //NOTIFICATION
      if(!!window.cordova) {
        cordova.plugins.notification.local.schedule({
          id: 1,
          title: data.channelType === 'DIRECT' ? data.message.user.username : messageGroupName+" > "+messageChannelName,
          text: '@' + data.message.user.username + ': ' + data.message.text
        });
      }
      console.log('**************************************************Nuevo Mensaje!!!!! '+data.message.text);
      if(data.message.channel.channelType == 'DIRECT'){
        $scope.notifications[data.message.user.id]++;
        $scope.$apply();
        var userElem = document.getElementById(data.message.user.id+'-badge');
        userElem.className = 'badge badge-assertive shake';
        setTimeout(function(){
          userElem.className = 'badge badge-assertive';
        }, 1000);

      } else {
        $scope.notifications[data.message.channel.id]++;
        $scope.$apply();
        var channelElem = document.getElementById(data.message.channel.id+'-badge');
        channelElem.className = 'badge badge-assertive shake';
        setTimeout(function(){
          channelElem.className = 'badge badge-assertive';
        }, 1000);
      }
      $scope.$apply();
    });
    /*
    cordova.plugins.notification.local.on("click", function (notification, state) {
      $scope.notificationActiveText = notification.text;
      $scope.notificationActive = false;
    }, this);

    cordova.plugins.notification.local.on("click", function (notification, state) {
      $scope.notificationActive = false;
    }, this);
    */
    //SEARCH

    $ionicModal.fromTemplateUrl('templates/globalSearch.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.globalsearchmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeGlobalSearch = function () {
      $scope.globalsearchmodal.hide();
    };

    $scope.globalSearch = function() {
      if(window.localStorage.getItem('token') != undefined) {
        $scope.globalsearchmodal.show();
      } else {
        $scope.login();
      }
    };

    $scope.doGlobalSearch = function (textToSearch) {

      if($scope.activeChannel != null && textToSearch != '') {
        SearchService.chatsearch(textToSearch, $scope.activeChannel.id, $scope.groups[$scope.activeGroup].id).then(
          function (data) {
            $scope.globalSearchResult = data;
            for(var i = 0 ; i<data.length ; i++) {
              var tempid = data[i].source._user;
              if($scope.activeChannel.type == 'public'){
                for(var j = 0 ; j<$scope.groups[$scope.activeGroup].users.length ; j++) {
                  if($scope.groups[$scope.activeGroup].users[j].id === tempid){
                    $scope.globalSearchResult[i].source.user = $scope.groups[$scope.activeGroup].users[j];
                    break;
                  }
                }
              } else {
                for (var k = 0; k < $scope.activeChannel.users.length ; k++) {
                  if($scope.activeChannel.users[k].id === tempid) {
                    $scope.globalSearchResult[i].source.user = $scope.activeChannel.users[k];
                    break;
                  }
                }
              }
            }
          }, function (err) {
            showErrorAlert(err.message);
          }
        )
      }

    };

    //Sidebar

    $scope.showLogoutAction = function() {

      // Show the action sheet
      var hideSheet = $ionicActionSheet.show({
        buttons: [],
        destructiveText: '<i class="icon ion-power"></i>Logout',
        titleText: $scope.username,
        cancelText: 'Cancel',
        cancel: function () {
          // add cancel code..
        },
        buttonClicked: function (index) {
          return true;
        },
        destructiveButtonClicked: function(){
          $scope.logout();
        }

      });
    };


      //MD5

    $scope.getHash = function (str) {
      if(str != undefined) {
        return md5.createHash(str);
      }
      return '';
    };

    //Forum

    $scope.goToForum = function() {
      $state.go('forum.latest');
    };

  })

  .controller('ForumCtrl', function ($scope, ForumService, $sce, $stateParams, $ionicModal, $ionicPopup, LoginService, $state, $ionicActionSheet, $ionicHistory, SearchService) {

    $scope.username = window.localStorage.getItem('username');
    $scope.mail = window.localStorage.getItem('mail');
    $scope.questions = null;
    $scope.activeQuestion = null;
    $scope.activeQuestionIndex = -1;
    $scope.state = $state;
    $scope.selected = 'latest';

    $scope.goTo = function(where) {
      if(where === 'latest') {
        $state.go('forum.latest');
      } else if(where === 'viewed') {
        $state.go('forum.mostViewed');
      } else if(where === 'voted') {
        $state.go('forum.mostVoted');
      }
    };

    $scope.gotoChat = function(e) {
      if(window.localStorage.getItem('token') != undefined) {
        $state.go('chat.channel');
      } else {
        e.preventDefault();
        $scope.login();
      }
    };

    $scope.goToDetail = function(questionid){
      $state.go('questionDetail',{id:questionid}).then();
    };

    /*Obtener lista de preguntas*/
    $scope.getQuestions = function() {
      ForumService.getQuestions().then(function (res){
        $scope.questions = res.data;
      },function(err){
        $scope.error = err.data.message;
      });
    };

    $scope.trustAsHtml = function(string) {
      return $sce.trustAsHtml(string);
    };

    //NEW QUESTION MODAL

    $ionicModal.fromTemplateUrl('templates/newQuestion.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.newquestionmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeNewQuestion = function () {
      $scope.newquestionmodal.hide();
    };

    // Open the login modal
    $scope.newQuestion = function () {
      if(window.localStorage.getItem('token') != undefined) {
        $scope.newquestionmodal.show();
      } else {
        $scope.login();
      }
    };

    $scope.doNewQuestion = function (newquestion) {

      ForumService.createQuestion(newquestion).then(
        function(data){
          $scope.questions.push(data.data);
          $scope.closeNewQuestion();
        }, function(err){
          $scope.closeNewQuestion();
          showErrorAlert(err.data.message);
        }
      );

    };

    //LOGIN MODAL

    $ionicModal.fromTemplateUrl('templates/login.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.loginmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeLogin = function () {
      $scope.loginmodal.hide();
    };

    // Open the login modal
    $scope.login = function () {
      console.log("Entro en login");
      $scope.loginmodal.show();
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function (user) {

      $scope.message = '';
      $scope.error = 0;
      if (user.mail && user.password) {
        LoginService.login(user).then(function (res) {
          window.localStorage.setItem('username', res.data.username);
          window.localStorage.setItem('token', res.data.token);
          window.localStorage.setItem('userid', res.data.id);
          $scope.loginmodal.hide();
        }, function (res) {
          showAlert(res.data.message);
        });
      }

    };

    //Sidebar

    $scope.showLogoutAction = function() {

      // Show the action sheet
      var hideSheet = $ionicActionSheet.show({
        buttons: [],
        destructiveText: '<i class="icon ion-power"></i>Logout',
        titleText: $scope.username,
        cancelText: 'Cancel',
        cancel: function () {
          // add cancel code..
        },
        buttonClicked: function (index) {
          return true;
        },
        destructiveButtonClicked: function(){
          $scope.logout();
        }

      });
    };

    $scope.logout = function() {

      window.localStorage.removeItem('userid');
      window.localStorage.removeItem('username');
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('mail');

      $ionicHistory.nextViewOptions({
        disableBack: true
      });

      $state.go('home');

    };

    //SEARCH

    $ionicModal.fromTemplateUrl('templates/globalSearchForum.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.globalsearchmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeGlobalSearch = function () {
      $scope.globalsearchmodal.hide();
    };

    $scope.globalSearch = function() {
        $scope.globalsearchmodal.show();
    };

    $scope.doGlobalSearch = function (textToSearch) {

      if(textToSearch != '') {
        SearchService.forumsearch(textToSearch).then(
          function (data) {
            $scope.globalSearchResult = data;
          }, function (err) {
            showErrorAlert(err.message);
          }
        )
      }

    };

    function showErrorAlert(message) {
      var alertPopup = $ionicPopup.alert({
        title: 'Error!',
        template: message
      });
    }

      $scope.getQuestions();

  })

  .controller('DetailCtrl', function ($scope, ForumService, $sce, $stateParams, $ionicModal, $ionicPopup, LoginService, $state) {

    $scope.activeQuestion = null;
    $scope.activeAnswerIndex = null;
    $scope.showQuestionComments = false;
    $scope.showAnswerComments = false;

    $scope.gotoForum = function(){
      $state.transitionTo('forum.latest', null, {reload:true});
    };

    $scope.getQuestion = function()
    {
      ForumService.getQuestion($stateParams.id).then(function (res){
        $scope.activeQuestion = res.data;
      },function(err){
        showErrorAlert(err.data.message);
      });
    };


    $scope.trustAsHtml = function(string) {
      return $sce.trustAsHtml(string);
    };

    //VOTES

    $scope.questionUpVote = function(){
      if(window.localStorage.getItem('token') != undefined) {
        ForumService.questionUpVote($scope.activeQuestion._id).then(
          function (data) {
            $scope.activeQuestion.votes = parseInt($scope.activeQuestion.votes) + 1;
          }, function (err) {
            showErrorAlert(err.data.message);
          }
        );
      } else {
        $scope.login();
      }
    };

    $scope.questionDownVote = function(){
      if(window.localStorage.getItem('token') != undefined) {
        ForumService.questionDownVote($scope.activeQuestion._id).then(
          function (data) {
            $scope.activeQuestion.votes = parseInt($scope.activeQuestion.votes) - 1;
          }, function (err) {
            showErrorAlert(err.data.message);
          }
        );
      } else {
        $scope.login();
      }
    };

    $scope.answerUpVote = function(index, answerid){
      if(window.localStorage.getItem('token') != undefined) {
        $scope.activeAnswerIndex = index;
        ForumService.answerUpVote($scope.activeQuestion._id, answerid).then(
          function (data) {
            $scope.activeQuestion.answers[$scope.activeAnswerIndex].votes = parseInt($scope.activeQuestion.answers[$scope.activeAnswerIndex].votes) + 1;
          }, function (err) {
            showErrorAlert(err.data.message);
          }
        );
      } else {
        $scope.login();
      }
    };

    $scope.answerDownVote = function(index, answerid){
      if(window.localStorage.getItem('token') != undefined) {
        $scope.activeAnswerIndex = index;
        ForumService.answerDownVote($scope.activeQuestion._id, answerid).then(
          function (data) {
            $scope.activeQuestion.answers[$scope.activeAnswerIndex].votes = parseInt($scope.activeQuestion.answers[$scope.activeAnswerIndex].votes) - 1;
          }, function (err) {
            showErrorAlert(err.data.message);
          }
        );
      } else {
        $scope.login();
      }
    };

    //COMMENTS

    $scope.commentQuestion = function (comment) {
      if(window.localStorage.getItem('token') != undefined) {
        ForumService.commentQuestion($scope.activeQuestion._id, comment).then(
          function (data) {
            $scope.activeQuestion.comments = data.data;
            for(var i = 0 ; i<document.getElementsByClassName('questionArea').length ; i++){
              document.getElementsByClassName('questionArea')[i].value = '';
            }
          }, function (err) {
            showErrorAlert(err.data.message);
          }
        );
      } else {
        $scope.login();
      }
    };

    $scope.commentAnswer = function(index, answerid, comment){
      if(window.localStorage.getItem('token') != undefined) {
        $scope.activeAnswerIndex = index;
        ForumService.commentAnswer($scope.activeQuestion._id, answerid, comment).then(
          function (data) {
            $scope.activeQuestion.answers[$scope.activeAnswerIndex].comments = data.data;
            for(var i = 0 ; i<document.getElementsByClassName('answerArea').length ; i++){
              document.getElementsByClassName('answerArea')[i].value = '';
            }
          }, function (err) {
            showErrorAlert(err.data.message);
          }
        );
      } else {
        $scope.login();
      }
    };

    //ANSWER MODAL

    $ionicModal.fromTemplateUrl('templates/answer.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.answermodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeAnswer = function () {
      $scope.answermodal.hide();
    };

    // Open the login modal
    $scope.answer = function () {
      if(window.localStorage.getItem('token') != undefined) {
        $scope.answermodal.show();
      } else {
        $scope.login();
      }
    };

    $scope.doAnswer = function (answer) {

      ForumService.newAnswer($scope.activeQuestion._id, answer).then(
        function(data){
          $scope.activeQuestion.answers.push(data.data);
          $scope.closeAnswer();
        }, function(err){
          $scope.closeAnswer();
          showErrorAlert(err.data.message);
        }
      );

    };


    //LOGIN MODAL

    $ionicModal.fromTemplateUrl('templates/login.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.loginmodal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeLogin = function () {
      $scope.loginmodal.hide();
    };

    // Open the login modal
    $scope.login = function () {
      $scope.loginmodal.show();
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function (user) {

      $scope.message = '';
      $scope.error = 0;
      if (user.mail && user.password) {
        LoginService.login(user).then(function (res) {
          window.localStorage.setItem('username', res.data.username);
          window.localStorage.setItem('token', res.data.token);
          window.localStorage.setItem('userid', res.data.id);
          $scope.loginmodal.hide();
        }, function (res) {
          showAlert(res.data.message);
        });
      }

    };

    function showErrorAlert(message) {
      var alertPopup = $ionicPopup.alert({
        title: 'Error!',
        template: message
      });
    }

    $scope.getQuestion();

  });

function showToast(message, $ionicLoading) {
  if (window.plugins && window.plugins.toast) {
    window.plugins.toast.showShortCenter(message);
  }
  else $ionicLoading.show({template: message, noBackdrop: true, duration: 2000});
}
