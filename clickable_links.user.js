// ==UserScript==
// @name           Kongregate Chat Clickable Links
// @namespace      ventero.de
// @description    Makes all links in chat clickable
// @include        http://www.kongregate.com/games/*
// @author         Ventero
// @date           2014-08-18
// @version        1.2
// @grant          none
// @require        http://kong.ventero.de/require.js
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 08/08/2010
// Licensed under MIT/X11 license
// Copyright (c) 2010 Ventero
// http://www.opensource.org/licenses/mit-license.php

function init_clickable_links(){
  if(typeof holodeck !== "undefined" && !holodeck.__urlregex){
    holodeck.__urlregex = true;
    // more or less rfc3986 compliant (probably too lenient on what it matches)
    var urlregex = /\b((?:(?:((?:ht|f)tps?)\:\/\/(\w+:\w+@)?)|(?:www\.))((?:[\w-.]+\.\w{2,6})|(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(:\d{1,5})?((\/(?:(?:[\w\/;:@&=$-.+~!*(),])|(?:%[a-f0-9]{2}))*)(\?(?:(?:[\w\/;:@&=$-.+~!*(),?])|(?:%[a-f0-9]{2}))*)?(#(?:(?:[\w\/;:@&=$-.+~!*(),?])|(?:%[a-f0-9]{2}))*)?)?)(?![^<]+<\/a>)/gi;
    holodeck.addIncomingMessageFilter(function(message, nextFunction){
      nextFunction(message.replace(urlregex, function(a){
        return '<a href="'+(arguments[2]?a:"http://"+a)+'">'+a+'</a>';
      }), nextFunction);
    })
  }
}

runWhenReady(init_clickable_links);
