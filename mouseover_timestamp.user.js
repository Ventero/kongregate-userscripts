// ==UserScript==
// @name          Kongregate Chat Timestamp
// @namespace     tag://kongregate
// @description   Shows a timestamp and a whisper-link when you mouseover the sender of a message
// @include       http://www.kongregate.com/games/*
// @author        Ventero
// @version       1.3
// @date          2014-08-19
// @grant         unsafeWindow
// @grant         GM_setValue
// @grant         GM_getValue
// @require       http://kong.ventero.de/require.js
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 06/04/09
// Copyright (c) 2009-2013 Ventero, licensed under MIT/X11 license
// http://www.opensource.org/licenses/mit-license.php

function init_mo_timestamp_content(timeformat, savePref){
  if(!holodeck || !ChatDialogue || holodeck.__mouseover)
    return;

  console.log(timeformat, savePref);

  holodeck.__mouseover = true;

  var message_rollover_template = new Element("div", {id: "message_rollover_template", "class": "user_rollover_container spritesite", style: "display: none"});
  var message_rollover = new Element("div", {"class": "user_rollover spritesite"});
  var message_rollover_inner = new Element("div", {"class": "user_rollover_inner"});
  var rollover_private_message_holder = new Element("p", {"class": "rollover_message_private_message_link_message_link_holder"});
  var rollover_private_message_link = new Element("a", {id: "rollover_message_private_message_link", "class": "rollover_message_private_message_link", href: "#"}).update("Private Message");
  rollover_private_message_holder.appendChild(rollover_private_message_link);
  var rollover_time_text = new Element("p", {id: "rollover_time_text"});
  message_rollover_inner.appendChild(rollover_time_text);
  message_rollover_inner.appendChild(rollover_private_message_holder);
  message_rollover.appendChild(message_rollover_inner);
  message_rollover_template.appendChild(message_rollover);
  $('chat_tab_pane').appendChild(message_rollover_template);

  function MessageRollover(chat_dialogue) {
    this.initialize(chat_dialogue);
  }

  MessageRollover.prototype = {
    initialize: function(chat_dialogue){
      this._active_dialogue = chat_dialogue;
      this._holodeck = chat_dialogue._holodeck;
      this._rollover_template_node = $('message_rollover_template');
      this._private_message_node = $('rollover_message_private_message_link');
      this._time_node = $('rollover_time_text');

      this._private_message_observer = function(){};

      if(this._rollover_template_node){
        var rollover = this;
        this._rollover_template_node.observe('mouseover', function(event){
          rollover.stopHide();
          Event.stop(event);
        });
        this._rollover_template_node.observe('mouseout', function(event){
          rollover.beginHide();
          Event.stop(event);
        });
      }
    },
    show: function(time, user, event){
      if(this._hideTimer) clearTimeout(this._hideTimer);
      this.updatePrivateMessageLink(user);
      this.updateTimeText(time);
      this.setRolloverPosition(event);
      this._rollover_template_node.show();
    },
    setRolloverPosition: function(event) {
      var messagenode = event.target;
      var current_scroll_top = this._active_dialogue._message_window_node.scrollTop;
      var current_message_top = messagenode.positionedOffset()[1];
      // nudge the user rollover up a little
      current_message_top = current_message_top - 9;

      var new_top_val = current_message_top;
      if ( current_scroll_top < current_message_top ) {
        new_top_val = current_message_top - current_scroll_top;
      }

      var top_style_str = new_top_val + 'px';
      this._rollover_template_node.setStyle({ top: top_style_str });

      // set left position based on username length
      var username_width = messagenode.getWidth();
      var new_left_val = 20 + username_width;

      var left_style_str = new_left_val + 'px';
      this._rollover_template_node.setStyle({ left: left_style_str });
    },

    updatePrivateMessageLink: function(username){
      var cw = this._holodeck.chatWindow();
      // replace observer
      this._private_message_node.stopObserving('click');
      this._private_message_observer = CapturesToInlineRegistration.decorate(function(event){
        // just put /w <username> in the chat input field
        cw.insertPrivateMessagePrefixFor(username);
        Event.stop(event);
        return false;
      });
      this._private_message_node.observe('click', this._private_message_observer);
    },
    updateTimeText: function(time){
      this._time_node.innerHTML = time;
    },
    beginHide: function() {
      var rollover = this;
      if(this._hideTimer){ clearTimeout(this._hideTimer); }
      this._hideTimer = setTimeout(function() { rollover.hide(); }, 500);
    },
    stopHide: function() {
      clearTimeout(this._hideTimer);
    },
    hide: function() {
      this._rollover_template_node.hide();
    }
  };

  ChatDialogue.MESSAGE_TEMPLATE.template = '<p class="#{classNames}"><span username="#{username}" time="#{time}" class="username #{userClassNames}">#{prefix}#{username}</span><span class="separator">: </span><span class="message">#{message}</span><span class="clear"></span></p>';
  ChatDialogue.MESSAGE_TEMPLATE.old_evaluate = ChatDialogue.MESSAGE_TEMPLATE.evaluate;
  ChatDialogue.MESSAGE_TEMPLATE.evaluate = function(args){
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var time;
    if (holodeck._timeFormat == 12){
      time = (hours<10?(hours==0?"12":"0"+hours):(hours>12?(hours>21?hours-12:"0"+(hours-12)):hours))+":"+(minutes<10?"0":"")+minutes+":"+(seconds<10?"0":"")+seconds+(hours>11?" PM":" AM"); // 12-hour clock
    } else {
      time = (hours<10?"0":"")+hours+":"+(minutes<10?"0":"")+minutes+":"+(seconds<10?"0":"")+seconds; //24-hour clock
    }
    args.time = time;
    return this.old_evaluate(args);
  };

  ChatDialogue.prototype.initialize = function(parent_node, onInputFunction, holodeck, user_manager) {
    this._messages_until_next_collection = 0;
    this._holodeck = holodeck;
    this._user_manager = user_manager;
    this._parent_node = parent_node;
    this._messages_count = 0;
    this._insertion_count = 0;
    this._onInputFunction = onInputFunction;
    this._message_rollover_manager = new MessageRollover(this);

    // Establish references to re-used nodes
    this._message_window_node = parent_node.down('.chat_message_window');
    this._input_node = parent_node.down('.chat_input');

    this._messages_to_retain = 200;

    this._message_window_node.stopObserving();

    this._message_window_node.observe('mouseover', function(event) {
    var time = event.target.getAttribute("time"),
        user = event.target.getAttribute("username");
      if (time){
        holodeck.activeDialogue().showMessageRollover(time, user, event);
        Event.stop(event);
      }
    });

    this._message_window_node.observe('mouseout', function(event) {
      holodeck.activeDialogue().hideMessageRollover();
      Event.stop(event);
    });

    // Bind event listeners
    var dialogue = this,
        input_node = this._input_node;
    this._input_node.observe('keypress', function(event) { dialogue.onKeyPress(event); });
    this._input_node.observe('focus', function(event) { dialogue.clearPrompt(); });

    // Trigger mini-profile for clicks on usernames in chat.
    this._message_window_node.observe('click',
      function(event) {
        if (event.target) {
          var username = event.target.getAttribute('username');
          if(username){
            event.stop();
            user_manager.showProfile(username);
          }
        }
      });
  }

  ChatDialogue.prototype.showMessageRollover = function (time, user, event){
    this._message_rollover_manager.show(time, user, event);
  }

  ChatDialogue.prototype.hideMessageRollover = function(){
    this._message_rollover_manager.beginHide();
  }

  holodeck.addChatCommand("timeformat", function(l,n){
    var k = n.match(/^\/\S+\s+(\d+)/),
        m = "",
        q = l.activeDialogue();
    k && (m=k[1]);
    if(m==12 || m==24){
      l._timeFormat = m;
      savePref(m);
      q.displayMessage("Timeformat", "Set to "+m+"-hour clock (hh:mm:ss"+(m==12?" AM/PM)":")"), { "class": "whisper received_whisper"}, {non_user: true});
    } else {
      q.displayMessage("Timeformat", "Allowed values: 12 and 24", { "class": "whisper received_whisper"}, {non_user: true});
    }
    return false;
  });

  holodeck._timeFormat = timeformat;
}

var TIMEFORMAT = "kong_timeformat";

function savePref(format) {
  GM_setValue(TIMEFORMAT, format);
}

function init_mouseover_timestamp() {
  runInScope(init_mo_timestamp_content, false, "__init_MO_Timestamp");
  unsafeWindow.__init_MO_Timestamp(
    GM_getValue(TIMEFORMAT, 12) || 12,
    exportFunction(savePref, unsafeWindow)
  );
}

runWhenReady(init_mouseover_timestamp);
