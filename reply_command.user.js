// ==UserScript==
// @name           Reply Command
// @namespace      tag://kongregate
// @description    Adds a /r-command for Kongregate's chat which automatically replaces with "/w <Last user who sent you a whisper>" when pressing space. If you didn't receive a whisper yet, it gets replaced by "/w "
// @include        http://www.kongregate.com/games/*
// @author         Ventero
// @version        1.9
// @date           2014-08-14
// @require        http://kong.ventero.de/require.js
// @grant          none
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 05/01/09
// Copyright (c) 2009-2012 Ventero, licensed under MIT/X11 license
// http://www.opensource.org/licenses/mit-license.php

function init_reply(){
  if (!ChatDialogue || ChatDialogue.prototype.oldKeyPressReply)
    return;

  ChatDialogue.prototype.oldKeyPressReply = ChatDialogue.prototype.onKeyPress;

  if(ChatDialogue.prototype.reply){
    ChatDialogue.prototype.oldreply = ChatDialogue.prototype.reply
  } else {
    ChatDialogue.prototype.oldreply = function(a){};
  }
  ChatDialogue.prototype.reply = function(a){
    this._holodeck._reply = a;
    this.oldreply(a);
  }

  if(!ChatDialogue.prototype.showReceivedPM){
    ChatDialogue.prototype.showReceivedPM = ChatDialogue.prototype.receivedPrivateMessage;
    ChatDialogue.prototype.receivedPrivateMessage = function(a){
      if (a.data.success){
        this.reply(a.data.from)
      }
      this.showReceivedPM(a);
    }
  }

  ChatDialogue.prototype.onKeyPress = function (a) {
    var z, node = (this._input_node.wrappedJSObject || this._input_node);
    if(a.which == 32 &&
       ((a.currentTarget.selectionStart == 2 && (z = node.getValue().match(/^\/r(.*)/i))) ||
       (z = node.getValue().match(/^\/r\b(.*)/i)))){
      var x=z[1]||"";
      if (this._holodeck._reply) {
        this.setInput("/w "+this._holodeck._reply+" "+x);
      } else {
        this.setInput("/w ");
      }
      if(a.stop) a.stop();
      if(a.preventDefault) a.preventDefault();
    };

    this.oldKeyPressReply(a);
  }
};

runWhenReady(init_reply);
