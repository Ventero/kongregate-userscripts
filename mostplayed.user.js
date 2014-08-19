// ==UserScript==
// @name          Most played
// @namespace     ventero.de
// @include       http://www.kongregate.com/games/*
// @description   /mp #number lists the mostplayed games in the room
// @author        Ventero
// @version       1.2
// @date          2014-08-19
// @require       http://kong.ventero.de/require.js
// @grant          none
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 08/23/09
// Licensed under MIT/X11 license
// Copyright (c) 2010 Ventero
// Full text of the license here:
// http://www.opensource.org/licenses/mit-license.php

function init_mp(){
  if(!holodeck || !ChatDialogue || holodeck._chat_commands.mostplayed)
    return;

  holodeck.addChatCommand("mostplayed", function(l,n){
    var matchArr = n.match(/\/\S+\s+(\d+)/),
        dialog = l.activeDialogue(),
        gamesCount = 5,
        userList = $A(l.chatWindow().activeRoom().users()),
        usersCount = userList.length;

    if(matchArr && matchArr[1]) gamesCount = matchArr[1];

    function p(count){
      return count == 1?"":"s";
    }

    function makeLink(user){
      return '<a href="#" onclick="holodeck.showMiniProfile(\'' +
             user + '\'); return false;">' + user + '</a>';
    }

    var games = $H();
    userList.each(function(user){
      var o = user._game_url;
      if(!games.get(o)){
        games.set(o, {
          title: user._game_title,
          count: 0,
          user: "",
          url: o
        });
      }
      games.get(o).count++;
      games.get(o).user = user.username
    })

    var countArr = games.values().sort(function(a,b){
      return +b.count - +a.count;
    }).slice(0, gamesCount);
    var totalCount = games.size();

    dialog.unsanitizedKongBotMessage(usersCount + " user" + p(usersCount) + " playing " +
                                                 totalCount + " different game" + p(totalCount));

    dialog.unsanitizedKongBotMessage(gamesCount + " most played game" + p(gamesCount) + ":");

    countArr.each(function(obj){
      dialog.unsanitizedKongBotMessage(
        obj.count + " user" + p(obj.count) + " (" +
        (obj.count > 1 ? "" : makeLink(obj.user) + ", ") +
        (100*obj.count/usersCount).toFixed(1) + "%) " +
        (obj.count > 1 ? "are" : "is") + ' playing <a href="' +
        obj.url + '">' + obj.title + "</a>"
      );
    });

    return false;
  });

  holodeck._chat_commands.mp = holodeck._chat_commands.mostplayed;

  ChatDialogue.prototype.unsanitizedKongBotMessage = function(message){
    this.displayUnsanitizedMessage("Kong Bot", message, {class: "whisper received_whisper"}, {non_user: true});
  }
}

runWhenReady(init_mp);
