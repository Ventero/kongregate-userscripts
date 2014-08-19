// ==UserScript==
// @name          Kongregate Chat Line Highlighting
// @include       http://www.kongregate.com/games/*
// @description   This script will highlight lines which include your name and other words you choose. To set the words which get highlighted, just type "/hl list of words".
// @author        Ventero
// @version       2.7
// @date          2014-08-19
// @grant         unsafeWindow
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_deleteValue
// @require       http://kong.ventero.de/require.js
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 05/23/09
// Copyright (c) 2009-2012 Ventero, licensed under MIT/X11 license
// http://www.opensource.org/licenses/mit-license.php

function init_highlighting_content(getPref, savePref, resavePref){
  if (!ChatRoom || !ChatDialogue || ChatDialogue.prototype.searchWord)
    return;

  if(!String.prototype.trim){
    String.prototype.trim = function(){
      return this.replace(/^\s+/, "").replace(/\s+$/, "");
    }
  }

  function getStyleSheet(insert) {
    if (insert) {
      // guarantee we have a non-crossdomain stylesheet
      var style = document.createElement("style");
      var head = document.getElementsByTagName("head")[0];
      (head || document.body).appendChild(style);
    }

    // now find it...
    var sheet = null;
    for(var s = document.styleSheets.length - 1; s >= 0; --s) {
      try{
        if(document.styleSheets[s].cssRules && document.styleSheets[s].cssRules.length) {
          sheet = document.styleSheets[s];
          break;
        }
      }catch(e){ /* no-op */ }
    }

    return sheet;
  }

  ChatDialogue.prototype.searchWord = function(a, b){
    for (var i=0;i<b.length;i++){
      var r = b[i].replace(/(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g, '\\$1'),
              reg = new RegExp("\\b"+r+"\\b");
      if (reg.test(a)) return true;
    }
    return false;
  };

  ChatDialogue.prototype.searchUser = function(a){
    return this.searchWord(a, this._holodeck._hluser);
  };

  ChatDialogue.prototype.searchText = function(a){
    var l = this._holodeck,
    z = l._highlighting.concat([l._username.toLowerCase()]);
    return this.searchWord(a, z);
  }

  ChatWindow.prototype.hlFriend = function(a){
    return this._holodeck._hl_friends && this.isFriend(a);
  }

  ChatWindow.prototype.hlMod = function(a){
    if(!this._holodeck._hl_mods) return;

    return this._rooms.any(function(roomArr){
      var room = roomArr[1];
      var user = room.user(a);
      return user && room.canUserModerate(user);
    });
  }

  ChatWindow.prototype.friendOrMod = function(a){
    if(a.toLowerCase() == this._holodeck._username.toLowerCase()) return "";

    var colors = [];
    if(this.hlMod(a)) colors.push(" hlmod");
    if(this.hlFriend(a)) colors.push(" hlfriend");
    if(colors.length > 1)
      return colors[this._holodeck._hl_priority]


    return (colors[0] || "");
  }

  ChatDialogue.prototype.displayUnsanitizedMessageOldHighlight = ChatDialogue.prototype.displayUnsanitizedMessage;

  ChatDialogue.prototype.displayUnsanitizedMessage = function(user, msg, attributes, options){
    if(!attributes) attributes = {};
    var classes = attributes["class"] || "";
    var isWhisper = (classes.indexOf("whisper") >= 0);

    if(!(options && options["private"]))
      classes += this._user_manager.friendOrMod(user.toLowerCase());

    if(!isWhisper &&
       !this._user_manager.isMuted(user.toLowerCase()) &&
       (this.searchUser(user.toLowerCase()) ||
       this.searchText(msg.toLowerCase()))) {
      classes += " highlight";
      if(typeof this.new_private_message === "function") {
        var oldChime = holodeck._pm_chime;
        holodeck._pm_chime = holodeck._hl_chime;
        this.new_private_message();
        holodeck._pm_chime = oldChime;
      }
    }

    attributes["class"] = classes;

    this.displayUnsanitizedMessageOldHighlight(user, msg, attributes, options);
  }

  holodeck.addChatCommand("highlight", function(l,n){
    var k = n.match(/^\/\S+\s+(.+)/),
    z = "";
    k&&(z = k[1])
    if(z){
      z = z.replace(/\s+/g, ' ').trim();
      savePref("kong_highlighting", z.toLowerCase());
      l.activeDialogue().kongBotMessage("Now highlighting: "+z+" "+l._username);
      l._highlighting = z.toLowerCase().split(' ');
    }
    return false;
  });

  holodeck.addChatCommand("hluser", function(l,n){
    var k = n.match(/^\/\S+\s+(.+)/),
    z = "";
    k&&(z = k[1])
    if(z){
      z = z.replace(/\s+/g, ' ').trim();
      savePref("kong_highlightuser", z.toLowerCase());
      l.activeDialogue().kongBotMessage("Now highlighting user(s): "+z);
      l._hluser = z.toLowerCase().split(' ');
    }
    return false;
  });

  function generateCallback(name, stop, start){
    return function(l, n){
      if(l["_hl_" + name]){
        l["_hl_" + name] = 0;
        l.activeDialogue().kongBotMessage(stop || "Stopped highlighting messages by " + name);
      }else{
        l["_hl_" + name] = 1;
        l.activeDialogue().kongBotMessage(start || "Now highlighting messages by " + name);
      }
      savePref("kong_highlight"+name, l["_hl_" + name]);
      return false;
    }
  }

  holodeck.addChatCommand("hlmods", generateCallback("mods"));
  holodeck.addChatCommand("hlfriends", generateCallback("friends"));
  holodeck.addChatCommand("hlchime", generateCallback("chime", "Stopped playing the chime for highlighted messages",
                                                      "Now playing the chime for highlighted messages"));
  holodeck.addChatCommand("hlpriority", generateCallback("priority", "Now prioritizing mods over friends", "Now prioritizing friends over mods"));

  function generateColorCallback(selector, rule, name, text, max){
    if(!max) max = 1;
    return function(l, n){
      var sheet = getStyleSheet();
      var k = n.match(/^\/\S+\s+#?([0-9a-f]{6})/i),
          z = "",
          count = 0;
      if(k) z = "#" + k[1];
      if(z){
        for(var i = 0; i < sheet.cssRules.length; i++){
          if(sheet.cssRules[i].selectorText.indexOf(selector) == 0){
            sheet.cssRules[i].style.setProperty(rule, z, "important");
            if(++count == max){
              savePref("kong_" + name, z);
              l.activeDialogue().kongBotMessage("New " + (text||name) + ": " + z);
              return false;
            }
          }
        }
      } else {
        l.activeDialogue().kongBotMessage("No valid color! Format is /" + name + " XXXXXX (X = hex character)");
      }
      return false;
    }
  };

  holodeck.addChatCommand(
    "whispercolor",
    generateColorCallback("#kong_game_ui .chat_message_window .whisper",
                          "background-color",
                          "whispercolor")
  )

  holodeck.addChatCommand(
    "friendcolor",
    generateColorCallback("#kong_game_ui .chat_message_window .hlfriend span.chat_message_window_username",
                          "color",
                          "friendcolor")
  )
  holodeck.addChatCommand(
    "hlcolor",
    generateColorCallback("#kong_game_ui .chat_message_window .highlight",
                          "background-color",
                          "hlcolor",
                          "highlighting-color",
                          2)
  )
  holodeck.addChatCommand(
    "modcolor",
    generateColorCallback("#kong_game_ui .chat_message_window .hlmod span.chat_message_window_username",
                          "color",
                          "modcolor")
  )

  holodeck.addChatCommand("hllist", function(l, n) {
    var diag = l.activeDialogue();
    function botMessage(msg) {
      diag.displayUnsanitizedMessage("Kong Bot", msg);
    }

    botMessage("Current highlighting settings:");

    if(holodeck._hluser.length > 0) {
      botMessage('Users:');
      botMessage('Users: ' + holodeck._hluser.map(function(user) {
        return ['<a href="#" onclick="holodeck.showMiniProfile(\'', user,
                '\'); return false;">', user, '</a>'].join("");
      }).join(" "));
    } else {
      botMessage("No users highlighted");
    }

    if(holodeck._highlighting.length > 0) {
      botMessage('Words: ' + holodeck._highlighting.join(" "));
    } else {
      botMessage("No words highlighted");
    }

    botMessage('Highlight color: <span style="color: ' + color + '">' +
                        color + '</span>');
    botMessage('Whisper color: <span style="color: ' + wcolor + '">' +
                        wcolor + '</span>');

    botMessage("Highlighting friends: " +
                        (holodeck._hl_friends ? "Yes" : "No") +
                        ' (color: <span style="color: ' + fcolor + '">' +
                        fcolor + '</span>)');
    botMessage("Highlighting mods: " +
                        (holodeck._hl_mods ? "Yes" : "No") +
                        ' (color: <span style="color: ' + mcolor + '">' +
                        mcolor + '</span>)');

    botMessage("Highlight priority: " +
                        (holodeck._hl_priority ? "Friends over mods" : "Mods over friends"));
    botMessage("Playing chime: " +
              (holodeck._hl_chime ?
                (typeof holodeck._pm_chime !== "undefined" ? "Yes" :
                    'No, <a href="http://userscripts.org/scripts/show/65622">script</a> not installed') :
                "No"));
    return false;
  });

  holodeck.addChatCommand("hlreset", function(l, n) {
    var diag = l.activeDialogue();
    diag.kongBotMessage("Resetting all highlighting preferences");

    holodeck._chat_commands.hlcolor[0](holodeck, "/color #def6ea");
    holodeck._chat_commands.whispercolor[0](holodeck, "/color #deeaf6");
    holodeck._chat_commands.friendcolor[0](holodeck, "/color #006600");
    holodeck._chat_commands.modcolor[0](holodeck, "/color #ba6328");
    holodeck._hl_priority = 1;
    holodeck._hl_friends = 1;
    holodeck._hl_mods = 1;
    holodeck._hl_chime = 1;
    holodeck._highlighting = [];
    holodeck._hluser = [];

    resavePrefs();

    return false;
  });

  holodeck._chat_commands.hl = holodeck._chat_commands.highlight;
  holodeck._chat_commands.hlfriend = holodeck._chat_commands.hlfriends;

  holodeck._highlighting = [];
  holodeck._hluser = [];


  var color = "#def6ea", wcolor = "#deeaf6", fcolor = "#006600", mcolor = "#ba6328", priority = 1, friends = 1, mods = 1, chime = 1;
  var list = getPref("kong_highlighting"),
      user = getPref("kong_highlightuser");
  color = getPref("kong_hlcolor", "#def6ea")||"#def6ea";
  wcolor = getPref("kong_whispercolor", "#deeaf6")||"#deeaf6";
  fcolor = getPref("kong_friendcolor", "#006600")||"#006600";
  mcolor = getPref("kong_modcolor", "#ba6328")||"#ba6328";
  friends = getPref("kong_highlightfriends", 1);
  priority = getPref("kong_highlightpriority", 1);
  mods = getPref("kong_highlightmods", 1);
  chime = getPref("kong_highlightchime", 1);
  if(list){holodeck._highlighting = list.trim().split(' ')};
  if(user){holodeck._hluser = user.trim().split(' ')}

  holodeck._hl_friends = friends;
  holodeck._hl_mods = mods;
  holodeck._hl_chime = chime;
  holodeck._hl_priority = priority;

  var sheet = getStyleSheet(true);

  if(!sheet) {
    alert("Kongregate Chat Line Highlighting could not find a style sheet!\nPlease send a message to Ventero about this problem.");
    return;
  }

  sheet.insertRule('#kong_game_ui .chat_message_window .whisper { background-color: '+wcolor+' !important; }', sheet.cssRules.length);
  sheet.insertRule('#kong_game_ui .chat_message_window .highlight.even { background-color: '+color+' !important; }', sheet.cssRules.length);
  sheet.insertRule('#kong_game_ui .chat_message_window .highlight { background-color: '+color+' !important; }', sheet.cssRules.length);
  sheet.insertRule('#kong_game_ui .chat_message_window .hlfriend span.chat_message_window_username { color: '+fcolor+' !important; }', sheet.cssRules.length);
  sheet.insertRule('#kong_game_ui .chat_message_window .hlmod span.chat_message_window_username { color: '+mcolor+' !important; }', sheet.cssRules.length);
}

var valid_prefs = [
  "kong_highlighting", "kong_highlightuser", "kong_hlcolor", "kong_whispercolor",
  "kong_friendcolor", "kong_modcolor", "kong_highlightfriends",
  "kong_highlightpriority", "kong_highlightmods", "kong_highlightchime"
];

function getPref(pref, def) {
  if (!valid_prefs.indexOf(pref))
    return def;

  return GM_getValue(pref, def);
}

function savePref(pref, value) {
  if (!valid_prefs.indexOf(pref))
    return;

  GM_setValue(pref, value);
}

function resavePrefs() {
  for (var i = 0; i < valid_prefs.length; ++i)
    GM_deleteValue(valid_prefs[i]);
}

function init_highlighting() {
  runInScope(init_highlighting_content, false, "__init_HL");
  unsafeWindow.__init_HL(
    exportFunction(getPref, unsafeWindow),
    exportFunction(savePref, unsafeWindow),
    exportFunction(resavePrefs, unsafeWindow)
  );
}

runWhenReady(init_highlighting);
