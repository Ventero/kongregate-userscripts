// ==UserScript==
// @name           Kongregate In-Chat Timestamp
// @namespace      tag://kongregate
// @description    Adds a timestamp to every message (format: "[01:23:34 AM] user: message"). You can change the format with /timeformat 12 or 24 to 12/24-hour-clock. /tscolor hexcode changes color of timestamp. /toggleseconds
// @include        http://www.kongregate.com/games/*
// @author         Ventero
// @version        1.3
// @date           2014-08-19
// @grant          unsafeWindow
// @grant          GM_setValue
// @grant          GM_getValue
// @require        http://kong.ventero.de/require.js
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 06/04/09
// Copyright (c) 2009-2012 Ventero, licensed under MIT/X11 license
// http://www.opensource.org/licenses/mit-license.php

function init_timestamp_content(getPref, savePref){
  if (!holodeck || !ChatDialogue || holodeck.__timestamp)
    return;

  holodeck.__timestamp = true;

  holodeck.addChatCommand("timeformat", function(l,n){
      var k = n.match(/^\/\S+\s+(\d+)/),
          m = "",
          q = l.activeDialogue();
      k && (m=k[1]);
      if(m==12 || m==24){
        l._timeFormat = m;
        savePref("kong_timeformat", m);
        q.displayMessage("Timeformat", "Set to "+m+"-hour clock (hh:mm:ss"+(m==12?" AM/PM)":")"), { "class": "whisper received_whisper"}, {non_user: true});
      } else {
        q.displayMessage("Timeformat", "Allowed values: 12 and 24", { "class": "whisper received_whisper"}, {non_user: true});
      }
      return false;
    });

  holodeck.addChatCommand("tscolor", function(l,n){
    var k = n.match(/^\/\S+\s+([0-9a-f]{6})/i),
    z = "";
    k&&(z = "#"+k[1]);
    if (z){
      updateColor(z);
      savePref("kong_timestampcolor", z);
      l.activeDialogue().displayMessage("Timestamp", "Set font-color to "+z, { "class": "whisper received_whisper"}, {non_user: true});
    } else {
      l.activeDialogue().displayMessage("Timestamp", "No valid color! Format is /hlcolor ###### (# = hex character)", {"class":"whisper received_whisper"}, {non_user: true})
    }
    return false;
  });

  holodeck.addChatCommand("toggleseconds", function(l,n){
    if(l._showSeconds){
      l._showSeconds = 0;
      l.activeDialogue().displayMessage("Timestamp", "Now hiding seconds", { "class": "whisper received_whisper"}, {non_user: true});
    }else{
      l._showSeconds = 1;
      l.activeDialogue().displayMessage("Timestamp", "Now showing seconds", { "class": "whisper received_whisper"}, {non_user: true})
    }
    savePref("kong_timeshowseconds", l._showSeconds);
    return false;
  });

  var timeformat = 12, fontcolor = "#999999", seconds = 0;
  timeformat = getPref("kong_timeformat", 12)||12;
  fontcolor = getPref("kong_timestampcolor", "#999999")||"#999999";
  seconds = getPref("kong_timeshowseconds", 0)||0;

  holodeck._timeFormat = timeformat;
  holodeck._showSeconds = seconds;

  var updateColor = (function(c){
    var style = document.createElement("style");
    style.setAttribute("type", "text/css");
    function _updateColor(color){
      style.innerHTML = "span.inline_timestamp { color: " + color + " !important; }";
    };

    _updateColor(c);
    document.body.appendChild(style);

    return _updateColor;
  })(fontcolor);

  ChatDialogue.MESSAGE_TEMPLATE.template = '<p class="#{classNames}"><span style="float: left;" class="inline_timestamp">[#{time}]&nbsp;</span><span username="#{username}" class="username #{userClassNames}">#{prefix}#{username}</span><span class="separator">: </span><span class="message">#{message}</span><span class="clear"></span></p>'
  ChatDialogue.MESSAGE_TEMPLATE.old_evaluate_inline = ChatDialogue.MESSAGE_TEMPLATE.evaluate;
  ChatDialogue.MESSAGE_TEMPLATE.evaluate = function(args){
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var time;
    if (holodeck._timeFormat == 12){
      time = (hours<10?(hours==0?"12":"0"+hours):(hours>12?(hours>21?hours-12:"0"+(hours-12)):hours))+":"+(minutes<10?"0":"")+minutes+(holodeck._showSeconds?(":"+(seconds<10?"0":"")+seconds):"")+(hours>11?" PM":" AM");
    } else {
      time = (hours<10?"0":"")+hours+":"+(minutes<10?"0":"")+minutes+(holodeck._showSeconds?(":"+(seconds<10?"0":"")+seconds):"");
    }
    args.time = time;
    return this.old_evaluate_inline(args);
  };
};

var valid_prefs = ["kong_timeformat", "kong_timestampcolor", "kong_timeshowseconds"];

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

function init_mouseover_timestamp() {
  runInScope(init_timestamp_content, false, "__init_Timestamp");
  unsafeWindow.__init_Timestamp(
    exportFunction(getPref, unsafeWindow),
    exportFunction(savePref, unsafeWindow)
  );
}

runWhenReady(init_mouseover_timestamp);
