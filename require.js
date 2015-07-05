// Written by Ventero (https://github.com/Ventero)
// Licensed under MIT/X11 license
// Copyright (c) 2014-2015 Ventero
// http://www.opensource.org/licenses/mit-license.php

var inSandbox = (typeof unsafeWindow !== "undefined" && unsafeWindow !== window);
var sharedScope = inSandbox ? unsafeWindow : window;

function runInScope(fn, timeout, defineAs) {
  var s = document.createElement("script");
  var src = defineAs ?
    "window." + defineAs + "= (" + fn + ");" :
    "(" + fn + ")()";

  if (inSandbox) {
    // prefix with scope object generation
    // ugly hack to prevent global scope pollution
    // also ensures that every script is injected with its own version of the
    // require helpers, which prevents version conflicts
    src = [
      "(function() {",
        "var scope = {};",
        "(" + exportHelper + ")(scope)",
        "with (scope)",
          src,
      "})();"
    ].join("\n");
  }

  console.log(src);
  s.textContent = src;

  function inject() {
    document.body.appendChild(s);
    document.body.removeChild(s);
  }

  if (typeof timeout === "number") {
    setTimeout(inject, timeout);
  } else {
    inject();
  }
}

function runWhenReady(fn, timeout) {
  if (sharedScope.__injectionReady) {
    return setTimeout(fn, timeout || 0);
  }

  var target = ("Holodeck" in sharedScope ? "holodeck:ready" : "dom:javascript_loaded");
  document.addEventListener("dataavailable", function listener(e) {
    var evt = e.wrappedJSObject || e;
    if (evt.eventName != target) return;

    sharedScope.__injectionReady = true;

    setTimeout(fn, timeout || 0);

    document.removeEventListener("dataavailable", listener);
  }, false);
}


function exportHelper(scope) {
  if (!scope) return;

  function ContentLightbox() {
    return this.initialize();
  }

  ContentLightbox.prototype = {
    initialize: function() {
      var self = this;
      this._lb = lightbox.prototype;
      this._lb.deactivate();
      this._lb.staticContent = '<div id="kongregate_lightbox_wrapper"><div class="header_bar"><h3>Kongregate</h3>' +
                               '<a href="' + location.pathname + '" class="close_link" id="lb_close_link"' +
                               'onclick="lightbox.prototype.deactivate(); return false;">close &#215;</a></div>' +
                               '<div id="kongregate_lightbox_spinner"><span class="spinner_big">loading</span></div>' +
                               '<div id="lightbox_form" style="padding: 12px 15px 0px;"></div></div>';
      this._lb.done_class_name = "kred_purchase";

      this._load_callbacks = [];
      this._lb.afterStaticContentLoad = function() {
        self._load_callbacks.each(function(cb) {
          cb(self._lb);
        });
        self._load_callbacks = [];
      }
    },

    addCloseCallback: function(cb) {
      this._lb.addOnCloseCallback(cb);
    },

    addLoadCallback: function(cb) {
      this._load_callbacks.push(cb);
    },

    show: function() {
      this._lb.activate();
    },

    close: function() {
      this._lb.deactivate();
    }
  }

  function addChatAction(text, value, callback) {
    var actions = $$("#chat_tab_pane div.chat_actions_container");
    if (!holodeck || !actions.length)
      // not on chat page
      return;

    if (!holodeck._chat_actions) holodeck._chat_actions = {};
    if (!holodeck._chat_action_nodes) holodeck._chat_action_nodes = [];
    holodeck._chat_actions[value] = callback;

    var action = document.createElement("li");
    action.setAttribute("class", "action");
    action.setAttribute("data-chat-action", value);
    action.innerHTML = text;

    var template = $("chat_actions_dropdown_template");
    template.innerHTML = template.innerHTML.replace("</ul>", action.outerHTML + "</ul>");

    if (holodeck._chat_window._active_room)
      holodeck._chat_window._active_room._chat_actions_options.appendChild(action);
  }

  if (typeof ChatRoom !== "undefined" && ChatRoom.prototype &&
    !ChatRoom.prototype._chat_action_wrapped) {
    ChatRoom.prototype._chat_action_wrapped = true;

    ChatRoom.prototype.initialize = ChatRoom.prototype.initialize.wrap(function(orig) {
      var ret = orig.apply(this, [].slice.call(arguments, 1));

      try {
        this._chat_actions_options.observe("click", function(e) {
          var target = $j(e.target);
          var action = (target.is("li") ? target : target.parent("li")).attr("data-chat-action");

          if (holodeck._chat_actions && holodeck._chat_actions[action])
            holodeck._chat_actions[action](e);
        });
      } catch(e) {
        if (typeof console !== "undefined")
          console.error(e);
      }

      return ret;
    });
  }

  scope.ContentLightbox = ContentLightbox;
  scope.addChatAction = addChatAction;
}

exportHelper(this);
