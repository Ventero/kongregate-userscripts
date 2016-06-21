// ==UserScript==
// @name           Kongregate Chat Character Limit
// @namespace      tag://kongregate
// @description    Limits your textinput to 250 characters
// @include        http://www.kongregate.com/games/*
// @version        1.6
// @date           2014-08-18
// @author         Ventero
// @grant          none
// @require        http://kong.ventero.de/require.js
// ==/UserScript==

// Written by Ventero (http://www.kongregate.com/accounts/Ventero) 05/12/09

function init_characterLimit(){
  if (ChatDialogue.prototype.oldKeyPressLimit_V)
    return;

  ChatDialogue.prototype.oldKeyPressLimit_V = ChatDialogue.prototype.onKeyPress;
  ChatDialogue.prototype.onKeyPress = function () {
    var node = (this._input_node.wrappedJSObject || this._input_node);

    this.oldKeyPressLimit_V.apply(this, arguments);

    if (node.getValue().length > 249) {
      var z = node.getValue();
      var y = "";
      if (n=z.match(/^(\/\S+\s+\S*\s*)(.*)/)){
        y = n[2];
        if (y.length > 249){
          node.setValue(n[1] + y.substr(0, 249))
        }
      } else {
        node.setValue(z.substr(0, 249))
      }
    }
  }
};

runWhenReady(init_characterLimit);
