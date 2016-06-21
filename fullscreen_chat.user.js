// ==UserScript==
// @name            Kongregate Fullscreen Chat
// @namespace       tag://kongregate
// @description     Adds a chat action which hides the game and makes the chat use the available free space
// @author          Ventero
// @include         http://www.kongregate.com/games/*
// @date            2014-08-18
// @version         1.6
// @grant           none
// @require         http://kong.ventero.de/require.js
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 02/27/10
// Based on an idea by SavageWolf (http://www.kongregate.com/accounts/SavageWolf - http://www.wolfthatissavage.com)
// Licensed under MIT/X11 license
// Copyright (c) 2010-2012 Ventero
// Full text of the license here:
// http://www.opensource.org/licenses/mit-license.php

function init_resize(){
  function d(c){
    return document.getElementById(c);
  }

  if(!d("maingame")) return;

  function setWidth(width, gamewidth){
    d("maingame").style.width = (gamewidth + width) + "px";
    d("maingamecontent").style.width = (gamewidth + width) + "px";
    d("flashframecontent").style.width = (gamewidth + width) + "px";
    d("chat_container").style.width = width + "px";

    if (d('chat_this_spinner'))
      d('chat_this_spinner').style.right = width/2 - 38 + "px";

    if(d('high_scores_spinner'))
      d('high_scores_spinner').style.right = width/2 - 38 + "px";
    var z = d("kong_game_ui").childNodes;
    for(var i=0;i<z.length;i++){
      if(z[i].tagName == "DIV")
        z[i].style.width = (width - 17) + "px";
    }

    [].slice.call(d("kong_game_ui").querySelectorAll("textarea.chat_input")).forEach(function (e) {
      e.style.width = (width - 21) + "px";
    });
  }

  function p(a){
    return parseInt(d(a).style.width, 10);
  }

  var isIFrame = !document.getElementById("game_wrapper")
  var wrapper = isIFrame?"gameiframe":"game_wrapper";
  var initialized = false;

  function initOrigValues(){
    this.__oldWidth = p("chat_container");
    this.__gameHolderWidth = p("gameholder");
    this.__gameWrapperWidth = p(wrapper);
    this.__gameWidth = p("game");
    initialized = true;
  }

  function resizeChat(){
    if(!initialized) initOrigValues();
    if(p("game") == 0){
      d("chat_container").style.marginLeft = "3px";
      d("gameholder").style.width = this.__gameHolderWidth + "px";
      d("game").style.width = this.__gameWidth + "px";
      d(wrapper).style.width = this.__gameWrapperWidth + "px";
      if(!isIFrame)
        d("gamediv").width = this.__gameDivWidth;
      if(typeof this.__setChatWidth === "function")
        this.__setChatWidth(this.__oldWidth);
      else
        setWidth(this.__oldWidth, this.__gameWidth + 3);
    } else {
      d("chat_container").style.marginLeft = "0px";
      d("gameholder").style.width = "0px";
      d("game").style.width = "0px";
      d(wrapper).style.width = "0px";
      if(!isIFrame){
        this.__gameDivWidth = d("gamediv").width;
        d("gamediv").width = 0;
      }
      if(typeof this.__setChatWidth === "function")
        this.__setChatWidth(p("flashframecontent"));
      else
        setWidth(p("flashframecontent"), 0);
    }
  }

  addChatAction("Fullscreen Chat", "resize_chat", resizeChat);
}

runWhenReady(init_resize);
