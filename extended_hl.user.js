// ==UserScript==
// @name           Extended Chat Line Highlighting
// @namespace      ventero.de
// @include        http://www.kongregate.com/games/*
// @version        0.2.0
// @author         Ventero
// @date           29.07.2014
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          unsafeWindow
// ==/UserScript==

// Licensed under MIT/X11 license
// (c) Ventero, 2010-2014
// http://www.kongregate.com/accounts/Ventero, http://ventero.de
// Full text of the license here:
// http://www.opensource.org/licenses/mit-license.php

/* TODO:
 *
 * preview
 * alert when unsaved changes
 * mouseover disabled checkbox doesnt update label (overlay with div?)
 */

/****************************
 *         Commons          *
 ****************************/

var RULE_PREF = "kong_extended_hl_rules";
function loadPref(){
  return cloneInto(JSON.parse(GM_getValue(RULE_PREF, "[]")), unsafeWindow);
}

function savePref(rules){
  GM_setValue(RULE_PREF, JSON.stringify(rules));
}

var s = document.createElement("script");
s.textContent = "window._initExtendedHL = " + (function(loadPref, savePref){
function ContentLightbox(){
  return this.initialize();
}

ContentLightbox.prototype = {
  initialize: function(){
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
    this._lb.afterStaticContentLoad = function(){
      self._load_callbacks.each(function(cb){
        cb(self._lb);
      });
      self._load_callbacks = [];
    }
  },

  addCloseCallback: function(cb){
    this._lb.addOnCloseCallback(cb);
  },

  addLoadCallback: function(cb){
    this._load_callbacks.push(cb);
  },

  show: function(){
    this._lb.activate();
  },

  close: function(){
    this._lb.deactivate();
  }
}

function addChatAction(text, value, callback){
  var actions = $$("#chat_tab_pane div.chat_actions_container");
  if(!holodeck || !actions.length)
    // not on chat page
    return;

  if(!holodeck._chat_actions) holodeck._chat_actions = {};
  if(!holodeck._chat_action_nodes) holodeck._chat_action_nodes = [];
  holodeck._chat_actions[value] = callback;

  var action = document.createElement("li");
  action.setAttribute("class", "action");
  action.setAttribute("data-chat-action", value);
  action.innerHTML = text;

  var template = $("chat_actions_dropdown_template");
  template.innerHTML = template.innerHTML.replace("</ul>", action.outerHTML + "</ul>");

  if(holodeck._chat_window._active_room)
    holodeck._chat_window._active_room._chat_actions_options.appendChild(action);
}

if(ChatRoom && ChatRoom.prototype && !ChatRoom.prototype._chat_action_wrapped){
  ChatRoom.prototype._chat_action_wrapped = true;

  ChatRoom.prototype.initialize = ChatRoom.prototype.initialize.wrap(function(old, window, room){
    old(window, room);
    try{
      this._chat_actions_options.observe("click", function(e) {
        var target = $j(e.target);
        var action = (target.is("li") ? target : target.parent("li")).attr("data-chat-action");

        if (holodeck._chat_actions[action])
          holodeck._chat_actions[action](e);
      });
    } catch(e) { }
  });
}

function Rule(obj){
  this.negateCondition = false;

  this.roomMessages = true;
  this.whisperMessages = false;
  this.playChime = false;
  this.blinkFavicon = false
  this.caseSensitive = false;

  if(Object.isElement(obj)){
    this.index = parseInt(obj.down("td.rule_index").innerHTML, 10);
    this.target = this.parseNode(obj.down("select.rule_target"));
    this.condition = this.parseNode(obj.down("select.rule_usercondition")) ||
                     this.parseNode(obj.down("select.rule_stringcondition"));
    this.matchText = this.parseNode(obj.down("input.rule_matchtext"));

    this.styleType = this.parseNode(obj.down("select.rule_styletype"));
    this.color = this.parseNode(obj.down("input.rule_color"));

    this.negateCondition = !!this.parseNode(obj.down("input.rule_negate"));

    this.roomMessages = !!this.parseNode(obj.down("input.rule_normalmsg"));
    this.whisperMessages = !!this.parseNode(obj.down("input.rule_whispermsg"));
    this.playChime = !!this.parseNode(obj.down("input.rule_chime"));
    this.blinkFavicon = !!this.parseNode(obj.down("input.rule_blink"));
    this.caseSensitive = !!this.parseNode(obj.down("input.rule_casesensitivity"));
  } else if(obj) {
    if(Object.isString(obj)) obj = JSON.parse(obj);
    for(var i in obj){
      if(obj.hasOwnProperty(i)) this[i] = obj[i];
    }
  }
}

Rule.unserialize = function(str){
  var rule = {};
  var delim = String.fromCharCode(0xff); // XXX use better delimiter

  var parts = str.split(delim);
  var bools = parseInt(parts.shift(), 10);
  rule.negateCondition = !!(bools & 32);
  rule.roomMessages = !!(bools & 16);
  rule.whisperMessages = !!(bools & 8);
  rule.playChime = !!(bools & 4);
  rule.blinkFavicon = !!(bools & 2);
  rule.caseSensitive = !!(bools & 1);
  rule.index = parseInt(parts.shift(), 10);
  rule.target = OptionArrays.targets[parts.shift()].name;
  if(rule.target == "any"){
    parts.shift();
  } else {
    rule.condition = (rule.target == "user" ? OptionArrays.attributes : OptionArrays.conditions)[parts.shift()].name;
  }
  rule.styleType = OptionArrays.styles[parts.shift()].name;
  rule.color = parts.shift();
  rule.matchText = parts.join(delim);

  return new Rule(rule);
}

Rule.prototype = {
  set color(val){ this._color = ((val && val[0] == "#") ? "" : "#") + val; },
  get color(){ return this._color == "#" ? "" : this._color; },
  get style() { return this.styleType.split("_")[1]; },
  get hasStyle() { return (this.styleType != "none"); },
  get isUserStyle() { return (this.styleType.substring(0, 5) == "user_") },
  get isStringCondition(){ return (this.target == "msg" || this.target == "name"); },
  get isUserCondition(){ return (this.target == "user"); },
  get isAnyCondition(){ return (this.target == "any"); },
  get matchWords(){
    if(!this._matchWordsCache){
      this._matchWordsCache = this.matchText.trim().split(/\s+/).map(function(word){
        return new RegExp("\\b" + RegExp.escape(word) + "\\b", "i");
      });
    }

    return this._matchWordsCache;
  },

  parseNode: function(node, number){
    return node.visible() ? node.getValue() : null;
  },

  toCSSString: function(){
    return ("#kong_game_ui .chat_message_window ." + this.className + " " +
            (this.isUserStyle ? "span.chat_message_window_username " : "") +
            "{" + this.style + ": " + this.color + " !important; }\n");
  },

  toString: function(){
    return JSON.stringify(this);
  },

  serialize: function(){
    return [
      (
        this.negateCondition << 5 |
        this.roomMessages << 4 |
        this.whisperMessages << 3 |
        this.playChime << 2 |
        this.blinkFavicon << 1 |
        this.caseSensitive
      ),
      this.index,
      Options.targets.get(this.target).index,
      (this.isUserCondition ?
        Options.attributes.get(this.condition).index :
        this.isStringCondition ? Options.conditions.get(this.condition).index : 0),
      Options.styles.get(this.styleType).index,
      this.color,
      this.matchText,
    ].join(String.fromCharCode(0xff)); // XXX use better delimiter
  },

  validate: function(){
    var validMatchWords = true;
    if(this.isStringCondition && this.condition == "includesOne"){
      try{
        validMatchWords = this.matchWords.length > 0;
      } catch(e) {
        // error parsing the regexp
        return false;
      }
    }

    return (this.isStringCondition ^ this.isUserCondition ^ this.isAnyCondition) &&
           (!this.isStringCondition || this.matchText) &&
           (this.roomMessages || this.whisperMessages) &&
           (!this.hasStyle || /^#[0-9a-f]{3,6}$/i.test(this.color)) &&
           validMatchWords;
  },

  matches: function(user, msg){
    var matchFunc, self = this;
    if(this.isUserCondition){
      matchFunc = function(user, msg){
        return user[self.condition];
      }
    } else if(this.isAnyCondition){
      matchFunc = function(user, msg){
        return true;
      }
    } else if(this.isStringCondition){
      var target = (self.target == "name" ? user.username : msg);
      switch(this.condition){
        case "startsWith":
        case "include":
        case "equals":
        case "endsWith":
          matchFunc = function(user, msg) {
            var msg = self.caseSensitive ? target : target.toLowerCase();
            var text = self.caseSensitive ? self.matchText : self.matchText.toLowerCase();
            return msg[self.condition](text);
          };
          break;
        case "includesOne":
          matchFunc = function(user, msg) {
            return self.matchWords.any(function(regexp){
              return regexp.test(target);
            });
          }
          break;
        default:
          console.log("Unsupported string condition", this.condition);
      }
    }
    return (this.negateCondition ? !matchFunc(user, msg) : matchFunc(user, msg));
  }
}

var Options = {
  targets: $H({
    "user": {text: "user", index: 0},
    "name": {text: "username", index: 1},
    "msg": {text: "message", index: 2},
    "any": {text: "any message", index: 3},
  }),
  attributes: $H({
    "_isMe": {text: "is me", index: 0},
    "_moderator": {text: "is a mod", index: 1},
    "_admin": {text: "is an admin", index: 2},
    "_modOrAdmin": {text: "is a mod or admin", index: 3},
    "_friend": {text: "is a friend", index: 4}
  }),
  conditions: $H({
    "startsWith": {text: "starts with", index: 0},
    "endsWith": {text: "ends with", index: 1},
    "include": {text: "includes exactly", index: 2},
    "equals": {text: "equals", index: 3},
    "includesOne": {text: "includes one of", index: 4}
  }),
  styles: $H({
    "user_color": {text: "username text color", index: 0},
    "user_background-color": {text: "username background color", index: 1},
    "message_color": {text: "message text color", index: 2},
    "message_background-color": {text: "message background color", index: 3},
    "none": {text: "nothing", index: 4},
  })
}

var OptionArrays = {};
for(var i in Options){
  if(Options.hasOwnProperty(i)){
    OptionArrays[i] = Options[i].map(function(kv){
      kv.value.name = kv.key;
      return kv.value;
    }).sort(function(a, b){
      return a.index - b.index;
    });
  }
}

/****************************
 *        GUI stuff         *
 ****************************/
function extendElements(){
  if(HTMLSelectElement && HTMLSelectElement.prototype && HTMLSelectElement.prototype.populate) return;

  Element.addMethods("SELECT", {
    "populate": function(element, options){
      var sel = $(element);
      if(!sel) return;
      $H(options).toArray().sort(function(a, b){
        return a.value.index - b.value.index;
      }).each(function(kv){
        sel.insert(new Element("option", {
          value: kv.key
        }).update(kv.value.text));
      });
      return sel;
    }
  });
}

function makeRow(rule, num){
  function showElements(target){
    var hideStr = (target == "user") ? Element.show : Element.hide;
    var showStr = (target == "name" || target == "msg") ? Element.show : Element.hide;

    hideStr(userAttribs);
    showStr(stringConds);
    showStr(value);
    caseSensitive.disabled = !(target == "name" || target == "msg");
  }
  function swapIdxs(a, b){
    var nextIdx = a.down(".rule_index");
    var curIdx = b.down(".rule_index");
    var curIdxNum = curIdx.innerHTML;
    curIdx.update(nextIdx.innerHTML);
    nextIdx.update(curIdxNum);
  }
  function resetInfo(event){
    $("exthl_infomessage").update("");
  }

  var tr = new Element("tr", {"class": "highlight_rule"})
      .insert('<td class="rule_index center">' + num + '</td>');

  var target = new Element("select", {"class": "rule_target"}).observe("change", function(event){
    showElements(event.target.value);
  }).populate(Options.targets);
  var userAttribs = new Element("select", {"class": "rule_usercondition"}).populate(Options.attributes);
  var stringConds = new Element("select", {"class": "rule_stringcondition"}).populate(Options.conditions);

  var value = new Element("input", {
    "type": "text",
    "class": "rule_matchtext"
  });
  var styleType = new Element("select", {"class": "rule_styletype"}).populate(Options.styles);

  var styleP = new Element("p", {"class": "rule_stylecontainer"});
  var color = new Element("input", {
    "type": "color",
    "class": "rule_color",
    "value": "#def6ea",
  });

  styleP.insert(" set ").insert(styleType).insert(" to ").insert(color);
  tr.insert(new Element("td").insert("If ").insert(target).insert(userAttribs)
      .insert(stringConds).insert(" ").insert(value).insert(styleP));

  var negate = new Element("input", {
    "type": "checkbox",
    "checked": false,
    "class": "rule_negate"
  }).observe("mouseover", function(event){
    $("exthl_infomessage").update("Negate rule");
  }).observe("mouseout", resetInfo);
  tr.insert(new Element("td", {"class": "center"}).insert(negate));

  var normalMsg = new Element("input", {
    "type": "checkbox",
    "checked": true,
    "class": "rule_normalmsg"
  }).observe("mouseover", function(event){
    $("exthl_infomessage").update("Apply rule to room messages");
  }).observe("mouseout", resetInfo);

  var whisperMsg = new Element("input", {
    "type": "checkbox",
    "checked": false,
    "class": "rule_whispermsg"
  }).observe("mouseover", function(event){
    $("exthl_infomessage").update("Apply rule to whispers");
  }).observe("mouseout", resetInfo);

  var blink = new Element("input", {
    "type": "checkbox",
    "checked": true,
    "class": "rule_blink"
  }).observe("mouseover", function(event){
    $("exthl_infomessage").update("Blink favicon");
  }).observe("mouseout", resetInfo);

  var chime = new Element("input", {
    "type": "checkbox",
    "checked": false,
    "class": "rule_chime"
  }).observe("mouseover", function(event){
    $("exthl_infomessage").update("Play chime");
  }).observe("mouseout", resetInfo);

  var caseSensitive = new Element("input", {
    "type": "checkbox",
    "checked": false,
    "class": "rule_casesensitivity"
  }).observe("mouseover", function(event){
    $("exthl_infomessage").update("Match text is case sensitive");
  }).observe("mouseout", resetInfo);

  tr.insert(new Element("td", {"class": "center"}).insert(normalMsg)
            .insert(whisperMsg).insert(blink).insert(chime).insert(caseSensitive));

  var up = new Element("input", {type: "button", value: "↑"}).observe("click",
    function(event){
      var tr = event.findElement("tr");
      var prev = tr.previous();
      if(prev){
        prev.insert({before: tr});
        swapIdxs(prev, tr);
      }
      event.stop();
    }
  ).observe("mouseover", function(event){
    $("exthl_infomessage").update("Increase priority");
  }).observe("mouseout", resetInfo);

  var down = new Element("input", {type: "button", value: "↓"}).observe("click",
    function(event){
      var li = event.findElement("tr");
      var next = tr.next();
      if(next){
        next.insert({after: tr});
        swapIdxs(next, tr);
      }
      event.stop();
    }
  ).observe("mouseover", function(event){
    $("exthl_infomessage").update("Decrease priority");
  }).observe("mouseout", resetInfo);

  var remove = new Element("input", {type: "button", value: "x"}).observe("click",
    function(event){
      event.findElement("tr").remove();
      event.stop();
    }
  ).observe("mouseover", function(event){
    $("exthl_infomessage").update("Remove rule");
  }).observe("mouseout", resetInfo);

  tr.insert(new Element("td", {"class": "center"}).insert(up).insert(down).insert(remove));

  if(rule){
    target.selectedIndex = Options.targets.get(rule.target).index
    styleType.selectedIndex = Options.styles.get(rule.styleType).index,
    color.value = rule.color;
    normalMsg.checked = rule.roomMessages;
    whisperMsg.checked = rule.whisperMessages;
    negate.checked = rule.negateCondition;
    blink.checked = rule.blinkFavicon;
    chime.checked = rule.playChime;
    caseSensitive.checked = rule.caseSensitive;

    if(rule.isStringCondition) {
      stringConds.selectedIndex = Options.conditions.get(rule.condition).index;
      value.value = rule.matchText;
    } else if(rule.isUserCondition) {
      userAttribs.selectedIndex = Options.attributes.get(rule.condition).index;
    }
  }

  showElements(target.value);

  return tr;
}

function openConfig(rules){
  // refresh added methods, necessary in chrome
  extendElements();

  var cbox = new ContentLightbox();
  cbox.addLoadCallback(function(lb){
    $("kongregate_lightbox_spinner").remove();

    $("lightbox").setStyle({
      "width": "92em",
      "margin": "0 0 0 -46em"
    });

    var box = $("lightbox_form");
    box.setStyle({"height": "94%"});

    $$("head")[0].insert(new Element("style", {
      "id": "exthl_lightbox_style",
      "type": "text/css",
    }).update([
      "#lightbox, #lightbox form label { font-size: 11px; }",
      "table#hlrule_table tr th, td.center { text-align: center; }",
      "table#hlrule_table tr th {",
      "  background:none repeat scroll 0 0 #333333;",
      "  border:1px solid #222222;",
      "  color:#FFFFFF;",
      "  font-size:0.8em;",
      "  padding:3px 10px;",
      "}",
      "table#hlrule_table tr td {",
      "  border:1px solid #DDDDDD;",
      "  padding:7px;",
      "}",
      "table#hlrule_table {",
      "  width: 99%;",
      "  border-collapse: collapse;",
      "  margin: 0.5em 0 0 0.2em;",
      "}",
      "table#hlrule_table select, input { font-size: 1em; }",
      "table#hlrule_table select.rule_target { min-width: 9em; }",
      "table#hlrule_table select.rule_stringcondition, select.rule_usercondition {",
      "  min-width: 10em;",
      "}",
      "table#hlrule_table select.rule_styletype { min-width: 15em; }",
      "table#hlrule_table p.rule_stylecontainer { float: right; }",
      "table#hlrule_table input.rule_matchtext { min-width: 19em; }",
      "table#hlrule_table input.rule_color { width: 6em; }", // XXX pad when displaying color?
    ].join("\n")));

    box.insert(new Element("h1").update("Kongregate Chat Highlighting Config"));

    var tablediv = new Element("div", {"style": "max-height: 85%; overflow: auto;"});
    var table = new Element("table", {"id": "hlrule_table"})
       .insert(['<thead>',
                  '<tr>',
                    '<th style="width: 0.5em">#</th>',
                    '<th style="width: 81em">Rule</th>',
                    '<th style="width: 3em">Negate</th>',
                    '<th style="width: 7.5em">Actions</th>',
                    '<th style="width: 6em">Move</th>',
                  '</tr>',
                '</thead>'].join(''));
    var body = new Element("tbody");
    rules.sortBy(function(rule){return rule.index;})
         .each(function(rule, idx){
      body.insert(makeRow(rule, idx + 1));
    });
    table.insert(body);
    tablediv.insert(table)
    box.insert(tablediv);

    var bottomdiv = new Element("div", {"style": "margin-top: 5px;"});
    var statusMsg = new Element("p", {
      "id": "exthl_statusmessage",
      "style": "margin-left: 5px; display: inline;"
    });
    var addRule = new Element("input", {type: "button", value: "Add rule"})
        .observe("click", function(event){
      body.insert(makeRow(null, body.select("tr.highlight_rule").length + 1));
      tablediv.scrollTop = tablediv.scrollHeight
      event.stop();
    });
    bottomdiv.insert(addRule);

    var save = new Element("input", {type: "button", value: "Save rules"})
        .observe("click", function(event){
      event.stop();

      var rules = body.select("tr").map(function(tr){return new Rule(tr);});
      var failed = rules.map(function(rule, idx){return [idx+1, rule.validate()];})
                        .reject(function(a){return a[1]});
      if(failed.length){
        statusMsg.update("Couldn't validate rule" + (failed.length > 1 ? "s " : " ") +
                         failed.invoke("first").join(", ") + ".").wrap("b");
      } else {
        saveRules(rules);
        applyRules(rules);
        statusMsg.update("Rules successfully saved!");
      }
    });
    bottomdiv.insert(save);

    //bottomdiv.insert(preview); //TODO
    bottomdiv.insert(statusMsg);

    var infoMsg = new Element("p", {"style": "float: right;"})
        .insert(new Element("b", {"id": "exthl_infomessage"}));
    bottomdiv.insert(infoMsg);
    box.insert(bottomdiv);
  });

  cbox.addCloseCallback(function(lb){
    $("exthl_lightbox_style").remove();
    $("lightbox").setStyle({
      "width": "",
      "margin": ""
    });
  });

  cbox.show();
}

/****************************
 *       Chat stuff         *
 ****************************/

var styleNode = new Element("style");
var ruleIdx = 0;
var head = $$("head")[0];
head.insert(styleNode);

String.prototype.equals = function(other) {
  return this == other;
}

function extendUser(user, room) {
  var u = room.user(user.username);
  user._friend = holodeck.chatWindow().isFriend(user.username);
  user._isMe = (user.username == holodeck._username);
  user._moderator = room.canUserModerate(u);
  user._modOrAdmin = !!(user._moderator || u.isAdmin());
  return user;
}

function getRules(callback) {
  var rules = loadPref();
  callback(rules.map(Rule.unserialize));
}

function saveRules(rules) {
  savePref(rules.invoke("serialize"));
}

function applyRules(rules) {
  holodeck._extended_incoming_message_filters = rules.sortBy(function(rule){
    return -rule.index;
  }).map(function(rule) {
    if(rule.hasStyle){
      rule.className = "hl_rule" + ruleIdx++;
      styleNode.insert(rule.toCSSString());
    }

    return (function(params, nextFunc) {
      var attributes = params.attributes;
      var whisper = params.options.whisper;

      var matches = (rule.roomMessages && !whisper || rule.whisperMessages && whisper) &&
                    rule.matches(params.user, params.msg);

      if(matches){
        if(rule.hasStyle && !attributes[rule.styleType]){
          attributes[rule.styleType] = true;
          attributes["class"] += " " + rule.className;
        }
        attributes.blinkFavicon |= rule.blinkFavicon;
        attributes.playChime |= rule.playChime;
      }

      nextFunc(params, nextFunc);
    })
  });
}

holodeck._extended_incoming_message_filters = [];

holodeck.addExtendedIncomingMessageFilter = function(filter) {
  this._extended_incoming_message_filters.push(filter);
}

holodeck.filterExtendedIncomingMessage = function(params, display) {
  this.filterMessage(params, this._extended_incoming_message_filters, display);
}

holodeck.getUser = function(name) {
  return (this.chatWindow() &&
          holodeck.chatWindow()._rooms.map(function(kv){return kv.value.user(name)}).compact().first() ||
          {username: name, variables: {}}
         );
}

// Call Function#wrap as static because the functions we access might have been
// overwritten by GM-scoped functions, which don't have Prototype's extensions
ChatRoom.prototype.updateUser = Function.wrap.call(ChatRoom.prototype.updateUser,
  function(orig, user, b) {
    var ret = orig.apply(this, [].slice.call(arguments, 1));
    extendUser(user, this);
    return ret;
  }
);

ChatDialogue.prototype.displayUnsanitizedMessage = Function.wrap.call(ChatDialogue.prototype.displayUnsanitizedMessage,
  function(orig, user, msg, attributes, options) {
    var room = holodeck.chatWindow().activeRoom();

    var allow_mutes = !room.canUserModerate(room.self()) || options.whisper;
    if (allow_mutes && this._user_manager.isMuted(user)) return;
    if (!attributes) attributes = {};
    if (!attributes["class"]) attributes["class"] = "";
    if (!options) options = {};

    function displayFunc(params) {
      // only chime if it's no automatically generated message (like Kong Bot stuff
      // or outgoing "I am AFK"-messages)
      if(!params.options.non_user && params.displayUser == params.user.username)
        chime(params.attributes.blinkFavicon, params.attributes.playChime);
      orig(params.displayUser, params.displayMsg, params.attributes, params.options);
    }

    var sendingWhisper = attributes["class"].include("sent_whisper");
    var sender = holodeck.getUser(sendingWhisper ? holodeck.username() : user);

    // since chat messages are escaped, it's impossible to have a < in there, so
    // just split on it to remove the (reply)-link
    var matchMsg = options.whisper ? msg.split("&nbsp; (<a")[0] : msg; //condition necessary?

    holodeck.filterExtendedIncomingMessage({
      user: extendUser(sender, this._user_manager._active_room),
      displayUser: user,
      msg: matchMsg,
      displayMsg: msg,
      attributes: attributes,
      options: options
    }, displayFunc);
  }
);

holodeck.addChatCommand("hlconfig", function(l, n){
  getRules(openConfig);
  return false;
});

addChatAction("Highlight config", "hlconfig", function(event){
  getRules(openConfig);
});


var chime = (function(){
  /**************************************************************
   * Chime/blinking favicon initially written by MrSpontaneous  *
   * http://userscripts.org/users/Aru                           *
   * http://www.kongregate.com/accounts/MrSpontaneous           *
   * Taken from http://userscripts.org/scripts/show/65622       *
   * with permission from MrSpontaneous.                        *
   * DO NOT REDISTRIBUTE OR MODIFY WITHOUT HIS PERMISSION       *
   **************************************************************/
  var chimeNode = new Element("audio", {
    "src": "data:audio/ogg;base64,T2dnUwACAAAAAAAAAACfA9NqAAAAAKUlZssBHgF2b3JiaXMAAAAAARErAAAAAAAASHEAAAAAAACZAU9nZ1MAAAAAAAAAAAAAnwPTagEAAABbEh%2BHCzr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2B1A3ZvcmJpcyoAAABYaXBoLk9yZyBsaWJWb3JiaXMgSSAyMDEwMDMyNSAoRXZlcnl3aGVyZSkAAAAAAQV2b3JiaXMSQkNWAQAAAQAMUhQhJRlTSmMIlVJSKQUdY1BbRx1j1DlGIWQQU4hJGaV7TyqVWErIEVJYKUUdU0xTSZVSlilFHWMUU0ghU9YxZaFzFEuGSQklbE2udBZL6JljljFGHWPOWkqdY9YxRR1jUlJJoXMYOmYlZBQ6RsXoYnwwOpWiQii%2Bx95S6S2FiluKvdcaU%2BsthBhLacEIYXPttdXcSmrFGGOMMcbF4lMogtCQVQAAAQAAQAQBQkNWAQAKAADCUAxFUYDQkFUAQAYAgAAURXEUx3EcR5IkywJCQ1YBAEAAAAIAACiO4SiSI0mSZFmWZVmWpnmWqLmqL%2FuuLuuu7eq6DoSGrAQAyAAAGIYhh95JzJBTkEkmKVXMOQih9Q455RRk0lLGmGKMUc6QUwwxBTGG0CmFENROOaUMIghDSJ1kziBLPejgYuc4EBqyIgCIAgAAjEGMIcaQcwxKBiFyjknIIETOOSmdlExKKK20lkkJLZXWIueclE5KJqW0FlLLpJTWQisFAAAEOAAABFgIhYasCACiAAAQg5BSSCnElGJOMYeUUo4px5BSzDnFmHKMMeggVMwxyByESCnFGHNOOeYgZAwq5hyEDDIBAAABDgAAARZCoSErAoA4AQCDJGmapWmiaGmaKHqmqKqiKKqq5Xmm6ZmmqnqiqaqmqrquqaqubHmeaXqmqKqeKaqqqaqua6qq64qqasumq9q26aq27MqybruyrNueqsq2qbqybqqubbuybOuuLNu65Hmq6pmm63qm6bqq69qy6rqy7Zmm64qqK9um68qy68q2rcqyrmum6bqiq9quqbqy7cqubbuyrPum6%2Bq26sq6rsqy7tu2rvuyrQu76Lq2rsqurquyrOuyLeu2bNtCyfNU1TNN1%2FVM03VV17Vt1XVtWzNN1zVdV5ZF1XVl1ZV1XXVlW%2FdM03VNV5Vl01VlWZVl3XZlV5dF17VtVZZ9XXVlX5dt3fdlWdd903V1W5Vl21dlWfdlXfeFWbd93VNVWzddV9dN19V9W9d9YbZt3xddV9dV2daFVZZ139Z9ZZh1nTC6rq6rtuzrqizrvq7rxjDrujCsum38rq0Lw6vrxrHrvq7cvo9q277w6rYxvLpuHLuwG7%2Ft%2B8axqaptm66r66Yr67ps675v67pxjK6r66os%2B7rqyr5v67rw674vDKPr6roqy7qw2rKvy7ouDLuuG8Nq28Lu2rpwzLIuDLfvK8evC0PVtoXh1XWjq9vGbwvD0jd2vgAAgAEHAIAAE8pAoSErAoA4AQAGIQgVYxAqxiCEEFIKIaRUMQYhYw5KxhyUEEpJIZTSKsYgZI5JyByTEEpoqZTQSiilpVBKS6GU1lJqLabUWgyhtBRKaa2U0lpqKbbUUmwVYxAy56RkjkkopbRWSmkpc0xKxqCkDkIqpaTSSkmtZc5JyaCj0jlIqaTSUkmptVBKa6GU1kpKsaXSSm2txRpKaS2k0lpJqbXUUm2ttVojxiBkjEHJnJNSSkmplNJa5pyUDjoqmYOSSimplZJSrJiT0kEoJYOMSkmltZJKK6GU1kpKsYVSWmut1ZhSSzWUklpJqcVQSmuttRpTKzWFUFILpbQWSmmttVZrai22UEJroaQWSyoxtRZjba3FGEppraQSWympxRZbja21WFNLNZaSYmyt1dhKLTnWWmtKLdbSUoyttZhbTLnFWGsNJbQWSmmtlNJaSq3F1lqtoZTWSiqxlZJabK3V2FqMNZTSYikptZBKbK21WFtsNaaWYmyx1VhSizHGWHNLtdWUWouttVhLKzXGGGtuNeVSAADAgAMAQIAJZaDQkJUAQBQAAGAMY4xBaBRyzDkpjVLOOSclcw5CCCllzkEIIaXOOQiltNQ5B6GUlEIpKaUUWyglpdZaLAAAoMABACDABk2JxQEKDVkJAEQBACDGKMUYhMYgpRiD0BijFGMQKqUYcw5CpRRjzkHIGHPOQSkZY85BJyWEEEIppYQQQiillAIAAAocAAACbNCUWByg0JAVAUAUAABgDGIMMYYgdFI6KRGETEonpZESWgspZZZKiiXGzFqJrcTYSAmthdYyayXG0mJGrcRYYioAAOzAAQDswEIoNGQlAJAHAEAYoxRjzjlnEGLMOQghNAgx5hyEECrGnHMOQggVY845ByGEzjnnIIQQQueccxBCCKGDEEIIpZTSQQghhFJK6SCEEEIppXQQQgihlFIKAAAqcAAACLBRZHOCkaBCQ1YCAHkAAIAxSjknJaVGKcYgpBRboxRjEFJqrWIMQkqtxVgxBiGl1mLsIKTUWoy1dhBSai3GWkNKrcVYa84hpdZirDXX1FqMtebce2otxlpzzrkAANwFBwCwAxtFNicYCSo0ZCUAkAcAQCCkFGOMOYeUYowx55xDSjHGmHPOKcYYc8455xRjjDnnnHOMMeecc845xphzzjnnnHPOOeegg5A555xz0EHonHPOOQghdM455xyEEAoAACpwAAAIsFFkc4KRoEJDVgIA4QAAgDGUUkoppZRSSqijlFJKKaWUUgIhpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoplVJKKaWUUkoppZRSSimlACDfCgcA%2FwcbZ1hJOiscDS40ZCUAEA4AABjDGISMOSclpYYxCKV0TkpJJTWMQSilcxJSSimD0FpqpaTSUkoZhJRiCyGVlFoKpbRWaymptZRSKCnFGktKqaXWMuckpJJaS622mDkHpaTWWmqtxRBCSrG11lJrsXVSUkmttdZabS2klFprLcbWYmwlpZZaa6nF1lpMqbUWW0stxtZiS63F2GKLMcYaCwDgbnAAgEiwcYaVpLPC0eBCQ1YCACEBAAQySjnnnIMQQgghUoox56CDEEIIIURKMeacgxBCCCGEjDHnIIQQQgihlJAx5hyEEEIIIYRSOucghFBKCaWUUkrnHIQQQgillFJKCSGEEEIopZRSSikhhBBKKaWUUkopJYQQQiillFJKKaWEEEIopZRSSimllBBCKKWUUkoppZQSQgihlFJKKaWUUkIIpZRSSimllFJKKCGEUkoppZRSSgkllFJKKaWUUkopIZRSSimllFJKKaUAAIADBwCAACPoJKPKImw04cIDEAAAAAIAAkwAgQGCglEIAoQRCAAAAAAACAD4AABICoCIiGjmDA4QEhQWGBocHiAiJAAAAAAAAAAAAAAAAARPZ2dTAAS6MgAAAAAAAJ8D02oCAAAAvLvehTRcXVphV1RWWlwBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBwhy6FZYZCFtVAFiA1Sq7r%2F97%2FKwblsvmp69njBK7fU%2FSuDQYHTKotq4BoLUv%2FzGXdVbd8%2F6WD%2F8wAEhqCPX8f%2BVTD5bdjdHMAJBdP79Bn4fNerz1yKi7x4z22AjCXGjmuQVgpiMBAwbrAB7V1nptHR9NOOPqRzZbr2RuCRWBkigNV%2FSXzVgdYpmd09SvUpoA5NvHraEKBwmAAab%2Be%2FPuXai8vXcOm04tYZcDqX%2FzfpPQzmT5obmIxwLGnejup%2B%2F8nATQCTAgAUJSBd93zz96iX0cJrhRRhU%2B2GxFR9JFaVSWkaHAcLH70HSqZ6EcGRnmBMvN7G4cWtOfT3dGDSkYkw65%2BEy5N07kHVrUddaPdRcnIwG%2BGwJPb2SOQM5B4dAAgS0AK%2Fbj38vD06XqtyFk9GaWDF9ebURP3framjeRZHbNkyvp7py8ugXyO3vbBDniABqfS8UNf4DiIsHMdotV%2Fztye3J7687d6Su9alUL4HVTOO8Ytt4dM5tiqCXpADKoABvAT%2BrfWZbe1d97jxt6vrWQxLBaE5dheaWfA8SafHkaMwg05LU1SWoAL1RQBUQ%2Bd88ZdEHN2H77BMpcK6eSu91d8a9yUTze8wENtt5%2BnQ97HF4BYJ8IbQ2E6KDW5iPFO4zexm7F1FgY7T%2BQNfzcTwlrgOfmX%2B5uA4CgLgVFiF98mdejECryQbyn7nhZKRxSf6URp7WW0kjNVZ2uzGIKsp6T%2FXQbVQeABvIM1kBxrLmZvWUc3bJW3xDF4oeTDiVp0mWJvtrIA5Tb%2FDNz8nBECVTuDgDOp1BDhWbqrROK%2F3OxufcvnqJ4SfEhOKkpp0dNIr%2BxXAKuHObuVGsAoAK6orC35d%2FxlHWt44e7r1iSv67l7Ipm8aiV5x5NicS5TMa2Fg7%2F%2BPfInHMrbZREzgFii%2FEHdh24bowGxYzQ2IoJTaddq3v5Q0nJzAe3eNgvSRhyC7dLBVAUxUuSp7u2%2F7zZv3Jj%2B8pN79E1OjpHR9coOHU4ReH6t7vf%2BrdrcR%2B3u18fiYk71y%2FupIg7KeJOSsKdFPF7Zgg%2FVpxERssQ%2Fj2t9RsrTlD9a4L6ecb8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA%3D"
  });

  var staticFavicon = $$('link[rel="shortcut icon"]')[0];
  var blinkingFavicon = new Element("link", {
    "rel": "shortcut icon",
    "type": "image/gif",
    "href": "data:image/gif;base64,R0lGODlhIAAgAIQUAGYAAJkAAJkAM5krAJkrM5krZswrM5lVM5lVZsxVM8xVZsyAZsyAmcyqmcyqzP+qzMzVzP/VzP/V////zP///////////////////////////////////////////////yH/C05FVFNDQVBFMi4wAwEAAAAh+QQBZAAfACwAAAAAIAAgAAAFbiAljmRpnmiqrmx7BnAsw+Ns0/Ut53pM9j4RMCgc8oCl3ku53KFuKltztpImoVXqz8riUrAtLjisHZOHONcXTTyzA2qmOaU7tqPetTbr3OanaX57T4OCfSZ1iImGY2iMXo52jUZ6b5aXmJmamzYhACH5BAFkAB8ALAAAAAAgACAAAAXpIBGMZGmeaKquqECKcBCLozDMck4HSuT/wMhjMGIEj8PRgcJsOpm0xnNKoSmozyjWSSNsmzTGl2kgKRqSaWOhKJ2pEcbitJgWUNdnhABA1Z8JJ1JPDS4oAH9OCCZihCyNToEkEFNtLIlNizIPTxAGfY9TgQQRTw87LHlcBJROEywmmEwME1SasAGQY1C4AbJjEbiIWHuqTQ64usdEAaVPc5dTDyVeUwehT9clyhQS0U+WJa1OECu/qCMGVAwoBATcDegEg4So1VvBI796O7tWu5bubRkxbMw1ObsayHGQkNuuhxAjSpzYJAQAOw%3D%3D"
  });

  var blurred = false;
  var animatedFav = false;
  var oldTitle = "";
  var pmCount = 0;

  window.addEventListener("blur", function(e){
    blurred = true;
  }, false);

  window.addEventListener("focus", function(e){
    blurred = false;
    pmCount = 0;
    if(animatedFav){
      animatedFav = false;
      if(blinkingFavicon.parentNode)
        blinkingFavicon.remove();
      head.insert(staticFavicon);
    }
    if(oldTitle) document.title = oldTitle;
    oldTitle = "";
  }, false);

  return function _chime(blink, chime) {
    if(!blurred || !(blink || chime)) return;

    if(!oldTitle) oldTitle = document.title;
    document.title = "[" + ++pmCount + "] " + oldTitle;

    if(blink && !animatedFav){
      animatedFav = true;
      if(staticFavicon.parentNode)
        staticFavicon.remove();
      head.insert(blinkingFavicon);
    }

    if(chime) chimeNode.play();
  }
})();

// getRules(applyRules);
});


var target = ("holodeck" in unsafeWindow ? "holodeck:ready" : "dom:javascript_loaded");
document.addEventListener("dataavailable", function listener(e) {
  var evt = e.wrappedJSObject || e;

  if(evt.eventName != target) return;

  // window.setTimeout(function(){
    document.body.appendChild(s);
    document.body.removeChild(s);
    unsafeWindow._initExtendedHL(
      exportFunction(loadPref, unsafeWindow),
      exportFunction(savePref, unsafeWindow)
    );
  // }, 0);


  document.removeEventListener("dataavailable", listener);
}, false);
