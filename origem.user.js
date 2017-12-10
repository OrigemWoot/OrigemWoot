// ==UserScript==
// @name           ORIGEMLoader
// @description    Autorun ORIGEM on plug.dj
// @author         Origem Music
// @downloadURL    https://rawgit.com/OrigemWoot/OrigemWoot/master/origem.user.js
// @updateURL      https://rawgit.com/OrigemWoot/OrigemWoot/master/origem.user.js
// @include	   	   https://plug.dj/*
// @include        https://*.plug.dj/*
// @exclude        https://plug.dj/_/*
// @exclude        https://plug.dj/@/*
// @exclude        https://plug.dj/ba
// @exclude        https://plug.dj/plot
// @exclude        https://plug.dj/press
// @exclude        https://plug.dj/partners
// @exclude        https://plug.dj/team
// @exclude        https://plug.dj/about
// @exclude        https://plug.dj/jobs
// @exclude        https://plug.dj/purchase
// @exclude        https://plug.dj/subscribe
// @exclude        https://*.plug.dj/_/*
// @exclude        https://*.plug.dj/@/*
// @exclude        https://*.plug.dj/ba
// @exclude        https://*.plug.dj/plot
// @exclude        https://*.plug.dj/press
// @exclude        https://*.plug.dj/partners
// @exclude        https://*.plug.dj/team
// @exclude        https://*.plug.dj/about
// @exclude        https://*.plug.dj/jobs
// @exclude        https://*.plug.dj/purchase
// @exclude        https://*.plug.dj/subscribe

// @version        1.7
// @grant          none
// ==/UserScript==

(function() {
    
    var loaded = false;

    window.Intercom = {}, window.amplitude = { __VERSION__: true };
    
    var a = {
        b: function() {
            if (typeof API !== 'undefined' && API.enabled) {
            	this.c();
            }
            else if (!loaded) {
                setTimeout(function() { a.b(); }, 1000);
            }
        },
        c: function() {
            loaded = true;
            console.log('[ORIGEM] AutoLoad enabled!');
            API.chatLog('ORIGEM AutoLoad enabled!');
            $.getScript('https://rawgit.com/OrigemWoot/OrigemWoot/master/origem.min.js');
        }
    };
    a.b();
})();
