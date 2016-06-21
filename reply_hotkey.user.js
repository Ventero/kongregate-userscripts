// ==UserScript==
// @name           Kongregate Chat Reply Command (hotkey)
// @namespace      tag://kongregate
// @description    Inserts the username of the last user who whispered you when pressing Alt-R
// @include        http://www.kongregate.com/games/*
// @author         Ventero
// @version        1.7
// @date           2014-08-19
// @require        http://kong.ventero.de/require.js
// @grant          none
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 05/02/09
// Copyright (c) 2009-2012 Ventero, licensed under MIT/X11 license
// http://www.opensource.org/licenses/mit-license.php

function init_replyHotkey(){
  if (!ChatDialogue || !holodeck || ChatDialogue.prototype.oldKeyPressReplyHotkey)
    return;

  ChatDialogue.prototype.oldKeyPressReplyHotkey = ChatDialogue.prototype.onKeyPress;

  ChatDialogue.prototype.onKeyPress = function (a) {
    var node = (this._input_node.wrappedJSObject || this._input_node);
    if (a.which == 13) {
      this.cnt=0;
    } else if (a.altKey && a.which == 114) {
      this.cnt+=1;
      l=this._holodeck._replyHotkey.length||-1;
      reply=this._holodeck._replyHotkey[l-this.cnt]||"";
      if(reply && this.cnt<=l){
        if(z=node.getValue()){
          if(z.match(/^\/[\s]*/)){
            z=z.replace(/^([^\s]+)\s*[^\s]*\s*(.*)/, '/w '+reply+' $2')
          }else{
            z="/w "+reply+" "+z
          };
          this.setInput(z)
        }else{
          this._holodeck.insertPrivateMessagePrefixFor(reply);
        }
      }else if(this.cnt>l){
        z=node.getValue();
        if (z=="/w "+this._holodeck._replyHotkey[0]+" "){
          this.setInput("/w ");
          this.cnt=0;
        }else if(z=="" && l>0){
          this.cnt-=1;
          this.setInput("/w "+this._holodeck._replyHotkey[l-this.cnt]+" ");
        }else{
          r=z.match(/^\/[^\s]+\s+[^\s]+\s+(.*)/);
          r&&(z=r[1]);
          this.setInput(z);
          this.cnt=0;
        }
      }
    }
    this.oldKeyPressReplyHotkey(a);
  }

  ChatDialogue.prototype.cnt=0;

  ChatDialogue.prototype.whisperArray = function(a,x){var i=a.indexOf(x);if(-1!==i)a.splice(i, 1);return a.concat(x);};

  if(ChatDialogue.prototype.reply){
    ChatDialogue.prototype.oldreplyHotkey = ChatDialogue.prototype.reply
  } else {
    ChatDialogue.prototype.oldreplyHotkey = function(a){};
  }

  ChatDialogue.prototype.reply = function(a){
    this._holodeck._replyHotkey=this.whisperArray(this._holodeck._replyHotkey, a);
    this.oldreplyHotkey(a);
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


  holodeck._replyHotkey= new Array();
};

runWhenReady(init_replyHotkey);
