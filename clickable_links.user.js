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
// @require        http://gregjacobs.github.io/Autolinker.js/dist/Autolinker.min.js
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 08/08/2010
// Licensed under MIT/X11 license
// Copyright (c) 2010 Ventero
// http://www.opensource.org/licenses/mit-license.php

var autolinker = new Autolinker( {
    urls : {
        schemeMatches : true,
        wwwMatches    : true,
        tldMatches    : true
    },
    email       : false,
    phone       : false,
    twitter     : false,
    hashtag     : false,

    stripPrefix : true,
    newWindow   : true,

    truncate : {
        length   : 30,
        location : 'smart'
    },

    className : ''
} );

function init_clickable_links(){
  if(typeof holodeck !== "undefined" && !holodeck.__urlregex){
    holodeck.__urlregex = true;
    // more or less rfc3986 compliant (probably too lenient on what it matches)
    holodeck.addIncomingMessageFilter(function(message, nextFunction){
      nextFunction(autolinker.link(message), nextFunction);
    });
  }
}

runWhenReady(init_clickable_links);
