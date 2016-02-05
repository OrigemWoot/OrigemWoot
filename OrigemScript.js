/**
	E lá vamos nós... portar o script do OW do plug para o dub.
	
	O script está em processo de migração, logo alguns recursos poderão não funcionar
	ou apresentar falhas.
*/	

/*	Alternative API		*/

(function(){
	if (window.API)
		return;
	
	window.API = {};
	_.extend(API, Backbone.Events);
	
	var waitlist = [],
		lastMedia = {song:null, songInfo: null, user: null, startTime: 0};
	
	API.events = {
		USER_JOIN: 'user-join',
		USER_LEAVE: 'user-leave',
		USER_SET_ROLE: 'user-setrole',
		USER_UNSET_ROLE: 'user-unsetrole',
		USER_BAN: 'user-ban',
		USER_KICK: 'user-kick',
		USER_MUTE: 'user-mute',
		USER_UNBAN: 'user-unban',
		USER_UNMUTE: 'user-unmute',
		USER_UPDATE: 'user-update',
		CHAT_MESSAGE: 'chat-message',
		CHAT_SKIP: 'chat-skip',
		DELETE_CHAT_MESSAGE: 'delete-chat-message',
		ROOM_UPDATE: 'room-update',
		ROOM_PLAYLIST_UPDATE: 'room_playlist-update',
		ROOM_PLAYLIST_QUEUE_REORDER: 'room_playlist-queue-reorder',
		ROOM_PLAYLIST_QUEUE_UPDATE_DUB: 'room_playlist-queue-update-dub',
		ROOM_PLAYLIST_DUB: 'room_playlist-dub'
	};

	API.consts = {
		COHOST : '5615fa9ae596154a5c000000',
		MANAGER : '5615fd84e596150061000003',
		MOD : '52d1ce33c38a06510c000001',
		VIP : '5615fe1ee596154fc2000001',
		RESDJ : '5615feb8e596154fc2000002',
		DJ : '564435423f6ba174d2000001',
		NONE : undefined
	};
	
	API.chat = {
		groupMessages : true
	};
	
	API.getTimeRemaining = function(){
		var remaining = 0,
			yt = Dubtrack.room.player.YTplayerDelegate,
			sc = Dubtrack.room.player.SCplayerDelegate;
		
		if (sc && sc.scPlayer){
			remaining = ~~((sc.scPlayer.duration-sc.scPlayer.position)/1e3);
		} else if (yt && yt.player){
			remaining = ~~(yt.player.getDuration()-yt.player.getCurrentTime());
		}
		return remaining;
	};

	API.getWaitListPosition = function(userid){
		if (!waitlist || waitlist.length==0)
			return -1;
			
		if ((!userid || typeof userid != 'string') && API.getUser())
			userid = API.getUser().userid;
			
		var pos = 0;
		for (var song of waitlist){
			if (song.userid == userid){
				return pos;
			}
			pos++;
		}
		return -1;
	};

	API.getWaitList = function(){		
		return waitlist;
	};
	
	API.getRoom = function(){
		return Dubtrack.room.model.toJSON();
	};

	API.getDJ = function(){
		var media = this.getMedia();
		
		if (!media || !media.user)
			return null;
		
		return this.getUser(media.user.toJSON()._id);
	};
	
	API.getSelf = function(){
		return Dubtrack.session.toJSON();
	};
	
	API.getUser = function(id){
		if (!id)
			id = this.getSelf()._id;
		
		return this.getUsers().filter(function(a){return a.userid==id;})[0];
	};
	
	API.getHost = function(){
		return this.getUser(Dubtrack.room.model.toJSON().userid);
	};
	
	API.getUserByName = function(username){
		return this.getUsers().filter(function(a){return a.username==username;})[0];
	};
	
	API.getUsers = function(){
		if (!Dubtrack.room.users || !Dubtrack.cache.users)
			return [];
			
		var list = [],
			users1 = Dubtrack.room.users.collection.toJSON(),
			users2 = Dubtrack.cache.users.collection.toJSON();
			
		for (var user of users1){
			var aux = users2.filter(function(a){return a._id==user.userid})[0];
			
			if (aux){
				var uaux = Object.keys(aux);
				
				for (var k of uaux){
					if (!user.hasOwnProperty(k))
						user[k] = aux[k];
				}
				delete user._user;
				if (!user.roleid)
					user.role=0;
				else{
					switch(user.roleid.type){
						case 'co-owner':
							if (Dubtrack.room.model.toJSON().userid==user.userid)
								user.role=7;
							else
								user.role=6;
							break;
						
						case 'manager':
							user.role=5;
							break;
						
						case 'mod':
							user.role=4;
							break;
						
						case 'vip':
							user.role=3;
							break;
							
						case 'resident-dj':
							user.role=2;
							break;
						
						case 'dj':
							user.role=1;
							break;
						
						default:
							user.role=0;
					}
				}
			}
			list.push(user);
		}
		return list;
	};
	
	API.sendChat = function(a){
		var c = new Dubtrack.Model.chat({
			user: Dubtrack.session.toJSON(),
			message: a,
			time: Date.now(),
			realTimeChannel: Dubtrack.room.model.get("realTimeChannel"),
			type: "chat-message"
		}),
		chat_context = getChatContext();
		if (!chat_context) return;
		c.urlRoot = chat_context.context.chatEndPointUrl;
		c.save();
		chat_context.context.model.add(c);
	};

	API.chatLog = function(msg,title,img){
		var chat = $('.chat-messages'),
			end = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28;
		
		chat.find('.chat-main').append('<li class="user-log current-chat-user"><div class="stream-item-content"><div class="chatDelete"onclick="$(this).closest(\'li\').remove();"><span class="icon-close"></span></div><div class="image_row"><img src="'+(img ||  'https://res.cloudinary.com/hhberclba/image/upload/c_lpad,h_100,w_100/v1400351432/dubtrack_new_logo_fvpxa6.png')+'"alt="log"class="cursor-pointer"></div><div class="activity-row"><div class="text"><p><a href="#"class="username">'+(title || 'Log message')+'</a> '+(msg||'')+'</p></div><div class="meta-info"><span class="username">'+(title || 'Log message')+'</span><i class="icon-dot"></i><span class="timeinfo"></span></div></div></div></li>');
		
		if ( end )
			chat.scrollTop(chat.prop("scrollHeight"));
		
		var cc = getChatContext();
		if (cc) cc.context.lastItemEl=null;
	};
	
	API.setVolume = function(vol){
		if (vol<0)
			vol = 0;
		
		if (vol>100)
			vol = 100;
			
		vol = ~~vol;
		
		$slider = $('#volume-div');
		$('#volume-div .ui-slider-range').css({'width':vol+'%'});
		$('#volume-div .ui-slider-handle').css({'left':vol+'%'});
		$slider.slider('option', 'slide')(null, { value: vol});
	};
	
	API.getVolume = function(){
		return Dubtrack.playerController.volume;
	};
	
	API.getMedia = function(){
		return Dubtrack.room.player.activeSong.toJSON();
	};
	
	API.getLastMedia = function(){
		return lastMedia;
	};
	
	API.getPlaylists = function(){
		return Dubtrack.user.playlist.toJSON();
	};

	API.djJoin = function(){
		$('#main_player .play-song-link-container .play-song-link.active-queue-display').click();
	}
	
	API.dubup = function(){
		$('.dubup').click();
	};

	API.dubdown = function(){
		$('.dubdown').click();
	};
	
	API.moderateSetRole = function(userid,role,callback){
		var user = this.getUser(userid),
			self = this.getUser();
		
		if (!user || !self || self.role < 2 || self.role < user.role || (user.role==0 && !role))
			return;
		
		var url = Dubtrack.config.apiUrl+"/chat/:roleid/:roomid/user/:id".replace(':roleid',role||user.roleid._id).replace(':roomid',this.getRoom()._id).replace(':id',userid);
		return ajax(url,role?'POST':'DELETE',JSON.stringify({realTimeChannel:this.getRoom().realTimeChannel}),callback);
	};
	
	API.moderateSkip = function(callback){
		if (!this.getMedia().song || this.getUser().role < 3)
			return;
		
		var url = Dubtrack.config.apiUrl+Dubtrack.config.urls.skipSong.replace(':id',this.getRoom()._id).replace(':songid',this.getMedia().song._id);
		return ajax(url,'POST',JSON.stringify({realTimeChannel:this.getRoom().realTimeChannel}),callback);
	};
	
	API.moderateDeleteChat = function(cid,callback){
		if (this.getUser().role < 4 || typeof cid != 'string')
			return;
		
		var url = Dubtrack.config.apiUrl+Dubtrack.config.urls.deleteChat.replace(':id',this.getRoom()._id).replace(':chatid',cid);
		return ajax(url,'DELETE',null,callback);
	};
	
	API.moderateMoveDJ = function(userid, position, callback){
		if (this.getUser().role < 4 || typeof userid != 'string' || typeof position != 'number' || position < 1 
				|| !API.getUser(userid))
			return;
				
		this.getRESTRoomQueue(function(data){
			var list = data.data,
				users = [];
			
			for (var i in list)
				users.push(list[i].userid);
			
			if (users.length < position)
				return;
			
			if (users.indexOf(userid) == --position)
				return;
			
			var pos = users.indexOf(userid);
			if (pos!=-1){
				users.splice(pos,1);
				users.splice(position,0,userid);
			}else{
				return;
			}
			
			var url = Dubtrack.config.apiUrl+Dubtrack.config.urls.roomUserQueueOrder.replace(':id',API.getRoom()._id);
			return ajax(url,'POST',{order:users},callback,null,null);
		});
	};
	
	API.moderateBanUser = function(userid, time, callback){
		if (typeof userid != "string" || typeof time != "number" || time < 1 || this.getUser().role < 4 || this.getUser(userid) > 0)
			return;
		
		var url = Dubtrack.config.apiUrl+Dubtrack.config.urls.banUser.replace(':roomid',this.getRoom()._id).replace(':id',userid);
		return ajax(url,'POST',JSON.stringify({time:time,realTimeChannel:this.getRoom().realTimeChannel}),callback);
	};
	
	API.lockQueue = function(lock,callback){
		if (this.getUser().role < 4 || typeof lock != 'boolean' || API.getRoom().lockQueue == lock)
			return;
		
		var url = 'https://api.dubtrack.fm/room/:roomid/lockQueue'.replace(':roomid',this.getRoom()._id);
		return ajax(url,'PUT','lockQueue='+(lock?1:0),callback,null,'application/x-www-form-urlencoded');
	};
	
	API.getRESTRoomQueue = function(callback){
		var url = Dubtrack.config.apiUrl+Dubtrack.config.urls.roomQueueDetails.replace(':id',this.getRoom()._id);
		return ajax(url,'GET',null,callback);
	};
	
	API.getRESTRoomHistory = function(callback){
		var url = Dubtrack.config.apiUrl+Dubtrack.config.urls.roomHistory.replace(':id',this.getRoom()._id);
		return ajax(url,'GET',null,callback);
	};

	var _rtb = Dubtrack.realtime.callback;

	function getChatContext(){
		return Dubtrack.Events._events['realtime:chat-message'].filter(function(a){return typeof a == 'object' && typeof a.context == 'object' && a.context.chatEndPointUrl;})[0];		
	};
	
	function updateWaitList(){
		API.getRESTRoomQueue(function(a){
			waitlist = a.data;
			API.trigger('waitListChanged', waitlist);
		});
	}
	
	function groupChatMessages(){
		if (API.chat.groupMessages)
			return;
			
		var chat_ctx = getChatContext();		
		if (chat_ctx) chat_ctx.context.lastItemEl=undefined;
	};
	
	function saveLastMedia(){
		lastMedia = API.getMedia();
	}
	
	function ajax(_url, method, parameters, func, par_to_func, ctype){
		return $.ajax({
			cache: false,
			type: method || 'GET',
			url: _url,
			contentType: typeof ctype == 'string' ? ctype : (typeof ctype === 'undefined' ? 'application/json' : undefined),
			data: parameters
		}).done(function( msg ) {
			if (typeof func == 'function')
				func(msg, par_to_func);
		});
	};
	
	function eventsDispatch(a){
		API.trigger('_'+a.type,a);
		_rtb(a);
		API.trigger(a.type, a);
		API.trigger('event', a);		
	};
	Dubtrack.realtime.callback = eventsDispatch;	
	API.on(API.events.CHAT_MESSAGE,groupChatMessages);
	API.on('_'+API.events.ROOM_PLAYLIST_UPDATE, saveLastMedia);
	API.on(API.events.ROOM_PLAYLIST_UPDATE, updateWaitList);
	API.on(API.events.ROOM_PLAYLIST_QUEUE_REORDER, updateWaitList);
	API.on(API.events.ROOM_PLAYLIST_QUEUE_UPDATE_DUB, updateWaitList);
	updateWaitList();
})();

(function(){
	var ow = {
		attr : {
			aw : true,	//autowoot
			aj : false, //autojoin
			fs : false, //full screen
			sm : false, //show meh
			uuj : false, //user join
			uul : false, //user leave
			mbg : false, //menu background
			cbg : false, //CUstom BG 
			ci : false, //chat image
			id : false, //info dj
			ag : {
				on : false,
				sel : null
			},
			ce : {
				on : true,
				max : 10
			},
			gm : true, //group message
			ml : 0, //max sound length
			ba : 0, //booth alert
			hc : false, //history check
			bg : '',
			pw : '',
			afk: {
				on : false,
				msg: ''
			},
			eta: {
				on : true
			},
			lng : {
				def : null
			},
			snd : {	//som dlç
				dlc : -1
			},
			aafk : {
				time : 0,
				msg : ''
			},
			urlemotes : []
		},
		tmp : {
			version: "1.0.0.6 alpha",
			script : 'https://rawgit.com/OrigemWoot/OrigemWoot/master/OrigemScript.js',
			css : 'https://rawgit.com/OrigemWoot/OrigemWoot/master/CSS/OrigemCSS.css',
			background : $(".backstrech img").attr("src"),
			emotes : {},
			url : document.location.pathname.substring(1),
			pl : [],
			ag : false,
			plsel : null,
			focus : true,
			snd : {},
			eta : {
				med: 0,
				str : ''
			},
			lng : {
				av : {},
				sel : []
			},
			afk : {
				ls: 0
			},
			adv : {
				song : null,
				songInfo : null
			},
			aafk : {
				vl : -1
			},
			ba : {
				lastpos : -1
			},
			control : {
				grab : [],
				meh : []
			},
			itens: null,
			auth : null,
			nsubimg : null
		},
		ti : {
			eta : 0,
			rm : 0,
			aafk : 0,
			ccq : 0
		},
		to : {
			djAdv : 0,
			dlpl : 0
		},
		misc : {
			events : {
				resize : function(){
//					ow.gui.util.fixMenuLocation();
				},
				focusin : function(){
					ow.tmp.focus = true;
				},
				focusout : function(){
					ow.tmp.focus = false;
				},
				windowClose : function(){
					return "Do you really want to leave now?";
				}
			}
		},
		gui : {	//objeto de eventos e controle dos menus
			control :{	//
				lockdrag : false
			},
			pg : {	//controle de página do menu
				len: 4,
				now: 1,
				lock:false
			},
			events : {
				aw: function(){
					ow.attr.aw = $(this).prop('checked');

					API.dubup();
					ow.storage.save();
				},
				aj: function(){
					ow.attr.aj = $(this).prop('checked');

					API.djJoin();
					ow.storage.save();
				},
				cbg: function(){
					ow.attr.cbg = $(this).prop('checked');
					ow.util.changeBG();
					ow.storage.save();
				},
				sm : function(){
					ow.attr.sm = $(this).prop('checked');
					ow.storage.save();
				},
				uuj : function(){
					ow.attr.uuj = $(this).prop('checked');
					ow.storage.save();
				},
				uul : function(){
					ow.attr.uul = $(this).prop('checked');
					ow.storage.save();
				},
				hv: function(){	//hide video
					ow.attr.hv = $(this).prop('checked');
/*					if (ow.attr.hv)				
						$('#playback').slideUp();
					else
						$('#playback').slideDown();
					
					if (ow.attr.fs)
						ow.gui.util.pcHover.mouseenter();
*/
					ow.storage.save();
				},
				fs: function(){	// full screen
					ow.gui.util.remfs();
					ow.attr.fs = $(this).prop('checked');

//					if (ow.attr.fs) ow.gui.util.fullScreen();
					
					ow.storage.save();

					// workaround, for some reason the checkmark doesn't 
					// change otherwise ._.
//					$(window).trigger('resize');
				},
				tbg: function(url){
/*					$(".room-background").css("background-image", "url(" + url + ")");
					var img = new Image();
					img.onload = function(){
						$(".room-background").css({"width": img.width + 'px', "height": img.height + 'px'});
						if (url == ow.tmp.itens.bgs[0]){
							$('#playback .background img').show();
							$('.room-background').children().show();
						}else{
							$('#playback .background img').hide();
							$('.room-background').children().hide();
						}
					}
					img.src = url;
*/
				},
				tafk: function(){
					ow.attr.afk.on = $(this).prop('checked');
					ow.tmp.afk.ls = 0;
					ow.storage.save();
				},				
				tci: function(){	//toogle chat image
					ow.attr.ci = $(this).prop('checked');
					ow.storage.save();
				},

				afktifo: function(){ // afk text input focus out
					ow.attr.afk.msg = $('#afkmessage').val();
					ow.storage.save();
				},
				bgtifo: function(){ // afk text input focus out
					var url = $('#bgurl').val().trim();
					
					if ( !url ){
						ow.attr.bg = url;
						ow.storage.save();
						return;
					}
					if ( url.indexOf('http') != 0)
						return;
					ow.attr.bg = url;
//					ow.gui.events.tbg(ow.attr.bg);
					ow.storage.save();
				},
				bc: function(event){	//background change
/*					$(".room-background").css("background-image", "url(" + event.data.bg + ")");
					ow.attr.bg = (event.data.bg == ow.tmp.itens.bgs[0] ? '' : event.data.bg);
					if (event.data.bg == ow.tmp.itens.bgs[0]){
						$('#playback .background img').show();
						$('.room-background').children().show();
					}else{
						$('#playback .background img').hide();
						$('.room-background').children().hide();
					}
*/
					ow.storage.save();
				},
				agm: function(){
					var pid = $(this).attr('id');
					if (pid)
						pid = pid.match(/\d{1,}/);
					
					ow.attr.ag.on = $('#checkbox-owagpl-pl-on').prop('checked');
					
					if (pid)
						ow.attr.ag.sel=parseInt(pid[0]);
					if (ow.attr.ag.on&&ow.attr.ag.sel)
						ow.util.grab.grab();
					
					ow.storage.save();
				},
				agrb: function(){
/*					ow.util.playlist.getPlaylists(function(){
						ow.gui.util.disableAGPlaylistElements();
						ow.gui.util.addAGListPlaylist();
					},true);
*/
				},
				id : function(){
					ow.attr.id = $(this).prop('checked');
					ow.storage.save();
				},
				gm : function(){
					ow.attr.gm = $(this).prop('checked');
					API.chat.groupMessages=ow.attr.gm;
					ow.storage.save();
				},
				hc : function(){
					ow.attr.hc = $(this).prop('checked');
					
//					if ( ow.attr.hc )
//						ow.util.history.getHistory();
					
					ow.storage.save();
				},
				maxLength : function(val) {
					ow.attr.ml = parseInt(!isNaN(val) ? val : $(this).val());
					if ( !isNaN(val) )
						$('#slider-maxLength').val(ow.attr.ml);

					$('#origem-slider-maxLength-value').text(ow.attr.ml == 0 ? 'off' : ow.util.getTimeString(ow.attr.ml).substring(3));

					ow.storage.save();
				},
				ba : function(val) {
					ow.attr.ba = parseInt(!isNaN(val) ? val : $(this).val());
					if ( !isNaN(val) )
						$('#slider-boothAlert').val(ow.attr.ba);

					$('#origem-slider-boothAlert-value').text(ow.attr.ba === 0 ? 'off' : ow.attr.ba);

					ow.storage.save();
				},
				sce : function(){
					ow.attr.ce.on = $(this).prop('checked');					
					ow.storage.save();
				},
				me : function() {
					var val = parseInt($(this).val())+1;
					if (val==ow.attr.ce.max)	return;
					ow.attr.ce.max = val;
					$('#slider-maxem').val(ow.attr.ce.max-1);
					$('#origem-slider-maxem-value').text(val);

					ow.storage.save();
				},
				ccs : function() {
					var val = parseInt($(this).val())*2;
					if (val==ow.attr.ccs)	return;
					ow.attr.ccs = val;
					$('#origem-slider-maxccspeed-value').text(val||'max');

					ow.storage.save();
				},
				lang: function(){
					var objdiv = $(this).attr('id');
					objdiv = objdiv.split('-')[3];
					
					ow.attr.lng.def = objdiv;
					ow.storage.save();
					ow.main.reload();
				},
				aafktifo: function(){ // anti afk text input focus out
					ow.attr.aafk.msg = $('#aafkmessage').val();
					ow.storage.save();
				},
				aafk : function(val) {
					ow.attr.aafk.time = parseInt(!isNaN(val) ? val*600 : $(this).val()*600);
					if (ow.attr.aafk.time) ow.attr.aafk.time+=600;
					if ( !isNaN(val) )
						$('#slider-aafk').val(ow.attr.aafk.time);

					$('#origem-slider-aafk-value').text(ow.attr.aafk.time === 0 ? 'off' : ow.util.getTimeString(ow.attr.aafk.time));
					
					if ( ow.attr.aafk.time == ow.tmp.aafk.lv)
						return;
					
					ow.tmp.aafk.lv = ow.attr.aafk.time;
					
					ow.util.aafk.threadInterval();					
					ow.storage.save();
				},
				eta : function(){
					ow.attr.eta.on = $(this).prop('checked');
					
					ow.util.eta.getMed();
					ow.util.eta.threadUpdate();
					
					ow.storage.save();
				},
				toggleMenu : function(){
					if ($('.origem-menu-container').css('display')==='block') {
						
						$('.origem-menu-container').animate({width:'0px'},400,'swing',function (argument) {
							$('.origem-menu-container').css({
								display: 'none'
							});
						});
					} else {
						$('.origem-menu-container').css({
							width: '0px',
							display: 'block'
						});
						$('.origem-menu-container').animate({width:'250px'},400);
					}
				},
				toggleSubmenu : function (id) {
					var activeOpeners = $('.origem-submenu-opener.active');
					$('.origem-submenu-opener').removeClass('active');
					$('.origem-menu-subcontainer').removeClass('active');
					if (!(activeOpeners.length>0&&activeOpeners.attr('data-target')===id)) {
						var currentOpeners = $('.origem-submenu-opener[data-target='+id+']');
						$(currentOpeners).addClass('active');
						$('.origem-menu-submenu').css('display','none');
						$('#origem-submenu-'+id).css('display','block');
						$('.origem-menu-subcontainer').addClass('active');
					}
				},
				updatePage : function(){
					var activePage = $('#origem-menu-page-selector').val();
					$('.origem-submenu-opener, .origem-menu-subcontainer').removeClass('active');
					$('.origem-menu-page-visible')
						.removeClass('origem-menu-page-visible');
					$('#origem-menu-page-'+activePage)
						.addClass('origem-menu-page-visible');
				}
			},
			util : {
				fixMenuLocation : function () {
				},
				remfs : function(rm){
				},
				fullScreen: function(){
/*					ow.gui.util.remfs(true);
*/
				},
				pcHover: {
					mouseenter : function(){
					},
					mouseleave : function(){
					}
				},
				pages:{},
				addMenu : function(){
					$('#owicone').remove();
					
					var menuButton = $('<div>')
						.addClass('origem-menu-opener')
						.append('<div class="origem-menu-icon">')
						.appendTo('body');
					ow.gui.util.fixMenuLocation();

					var menuContainer = $('<div>')
						.addClass('origem-menu-container')
						.appendTo('body');

					var heading = $('<div>')
						.addClass('origem-menu-heading origem-menu-section')
						.html('<span class="owtitle">' + ow.util.chat.parseLang('subtitle') + '</span><spam class="title-variant">woot</spam>')
						.appendTo(menuContainer);
					var closeButton = $('<div>')
						.attr('id','origem-menu-close')
						.appendTo(heading);
					var closeArrow = $('<i>')
						.addClass('icon icon-arrow-left')
						.appendTo(closeButton);

					var pageSelector = $('<div>')
						.addClass('origem-menu-pages origem-menu-section')
						.appendTo(menuContainer);
					var pageDropdown = $('<select>')
						.attr('id','origem-menu-page-selector')
						.appendTo(pageSelector);

					var submenuContainer = $('<div>')
						.addClass('origem-menu-subcontainer')
						.appendTo(menuContainer);
						
					// create menu pages
					ow.gui.util.addMenuPage('tools',ow.util.chat.parseLang('ow-tools'))
					.addMenuPage('visuals',ow.util.chat.parseLang('ow-cust'))
					.addMenuPage('lang',ow.util.chat.parseLang('owlang'))
					.addMenuPage('staff',ow.util.chat.parseLang('ow-stafftools'))
					.addMenuPage('about','About')

					.addSubMenu('alerts',ow.util.chat.parseLang('alerts'))
					.addSubMenu('agplaylists',ow.util.chat.parseLang('ag_title'))
					.addSubMenu('backgrounds',ow.util.chat.parseLang('backgrounds'))
					.addSubMenu('owlang',ow.util.chat.parseLang('owlang'))
					
					// create menu elements
					.addCheckboxMenuItem('tools', ow.util.chat.parseLang('aw'), 'autowoot', ow.attr.aw)
					.addCheckboxMenuItem('tools', ow.util.chat.parseLang('aj'), 'autojoin', ow.attr.aj)
//					.addSubmenuOpenerMenuItem('tools', ow.util.chat.parseLang('ag_title'), 'agplaylists')
					.addSubmenuOpenerMenuItem('tools', ow.util.chat.parseLang('alerts'), 'alerts')
//					.addCheckboxMenuItem('tools', ow.util.chat.parseLang('fs'), 'fullscreen', ow.attr.fs)
					.addMenuSeperator('tools')
					.addCheckboxMenuItem('tools', ow.util.chat.parseLang('afkResp'), 'afk', ow.attr.afk.on)
					.addTextMenuItem('tools', 'afkmessage', ow.util.chat.parseLang('afkTextF'), ow.attr.afk.msg)
					.addMenuSeperator('tools')
					.addSliderMenuItem('tools', ow.util.chat.parseLang('aafk_title'), 'slider-aafk', 11, ow.attr.aafk.time,true)
					.addTextMenuItem('tools', 'aafkmessage', ow.util.chat.parseLang('aafkTextF'), ow.attr.aafk.msg)
					.addMenuSeperator('tools')
					.addButtonMenuItem('tools', 'Reload', 'owReload')
					.addButtonMenuItem('tools', 'Kill', 'owKill')
									
//					.addSubmenuOpenerMenuItem('visuals', ow.util.chat.parseLang('mbg'), 'backgrounds')
//					.addSubmenuOpenerMenuItem('visuals', ow.util.chat.parseLang('chatcolors'), 'chatcolors')
					.addMenuSeperator('visuals')
					.addButtonMenuItem('visuals', ow.util.chat.parseLang('emotes'), 'owEmotes')
					.addCheckboxMenuItem('visuals', ow.util.chat.parseLang('ce_show_msg'), 'showce', ow.attr.ce.on)
					.addSliderMenuItem('visuals', ow.util.chat.parseLang('ce_max'), 'slider-maxem', 29, ow.attr.ce.max-1)
					.addMenuSeperator('visuals')
//					.addCheckboxMenuItem('visuals', ow.util.chat.parseLang('chtImgs'), 'chatimg', ow.attr.ci)
//					.addCheckboxMenuItem('visuals', ow.util.chat.parseLang('ct'), 'customTheme', ow.attr.ct.on)
//					.addCheckboxMenuItem('visuals', ow.util.chat.parseLang('cr'), 'customRoom', ow.attr.ct.cr)
					.addCheckboxMenuItem('visuals', 'Custom Background', 'bgchange', ow.attr.cbg)
					.addTextMenuItem('visuals', 'bbgchange', 'Background URL')
					.addCheckboxMenuItem('visuals', ow.util.chat.parseLang('gm'), 'groupMessage', ow.attr.gm)
					.addCheckboxMenuItem('visuals', ow.util.chat.parseLang('eta'), 'eta', ow.attr.eta.on)

					.addButtonMenuItem('staff', ow.util.chat.parseLang('ls'), 'lockskip')
					.addButtonMenuItem('staff', ow.util.chat.parseLang('skpdj'), 'skipdj')
//					.addButtonMenuItem('staff', ow.util.chat.parseLang('remdj'), 'remdj')
//					.addMenuSeperator('staff')
					.addButtonMenuItem('staff', ow.util.chat.parseLang('clrcht'), 'clearchat')
//					.addSliderMenuItem('staff', ow.util.chat.parseLang('ccs_title'), 'slider-maxccspeed', 30, ow.attr.ccs/2)
					
					.addValueMenuItem('about', 'OrigemWoot v'+ow.tmp.version, 'about-version')
					.addMenuSeperator('about')
					.addValueMenuItem('about', 'Creators/Developers', 'about-copyright')
					.addValueMenuItem('about', '<a href="#" onclick="Dubtrack.helpers.displayUser(\'56016d9e2e803803001001f4\', this);" style="color:#12A9E0;">Caipira</a>', 'about-dev1')
					.addValueMenuItem('about', '<a href="#" onclick="Dubtrack.helpers.displayUser(\'5618102d6d8d111d002aca6f\', this);" style="color:#12A9E0;">Igorce9</a>', 'about-dev1')
					
					.addMenuSeperator('about')
					.addValueMenuItem('about', 'Links', 'about-links')
					.addValueMenuItem('about', '<a href="https://www.facebook.com/pages/OrigemWoot/323799137819519" target="_blank" style="color:#12A9E0;">Facebook</a>', 'about-fb');

					$('#origem-slider-maxem-value').text(ow.attr.ce.max);
					$('#origem-slider-maxccspeed-value').text(ow.attr.ccs||'max');
					$('#slider-aafk').val(ow.attr.aafk.time/600);
					$('#origem-slider-aafk-value').html(ow.attr.aafk.time === 0 ? 'off' : ow.util.getTimeString(ow.attr.aafk.time));
					
					ow.gui.util.addAlerts();
//					ow.gui.util.addAGListPlaylist();
					ow.gui.util.addLangs();
				},
				addSubMenu : function(id, name) {
					ow.gui.util.pages[id] = $('<div>')
						.addClass('origem-menu-submenu')
						.attr('id', 'origem-submenu-'+id)
						.appendTo($('.origem-menu-subcontainer'));
					var heading = $('<div>')
						.addClass('origem-submenu-heading')
						.html(name)
						.appendTo(ow.gui.util.pages[id]);
					return this;
				},
				addMenuPage : function(id, name) {
					$('#origem-menu-page-selector').append('<option value="'+id+'">'+name+'</option>');
					var page = $('<div>')
						.addClass('origem-menu-page')
						.attr('id', 'origem-menu-page-'+id)
						.appendTo($('.origem-menu-container'));
					var scrollContainer = $('<div>')
						.addClass('origem-menu-scrollContainer')
						.appendTo(page);

					if (Object.keys(ow.gui.util.pages).length===0) {
						page.addClass('origem-menu-page-visible');
					}
					ow.gui.util.pages[id] = scrollContainer;
					return this;
				},
				addSubmenuOpenerMenuItem : function(page, label, submenuId) {
					var container = $('<div>')
						.addClass('origem-menu-element origem-submenu-opener')
						.attr('data-target',submenuId)
						.appendTo(ow.gui.util.pages[page]);
					var label = $('<div>')
						.html(label)
						.appendTo(container);
					var arrowicon = $('<div>')
						.addClass('arrowicon')
						.appendTo(container);
					$(container).on('click',function(){
						ow.gui.events.toggleSubmenu(submenuId);
					});
					return this;
				},
				addValueMenuItem : function(page,label,id) {
					var container = $('<div>')
						.addClass('origem-menu-element')
						.append('<p>'+label+'</p>')
						.appendTo(ow.gui.util.pages[page]);
						return this;
				},
				addSliderMenuItem : function(page,label,id,max,value,istime) {
					var valuetext = value===0?"off":(istime ? ow.util.getTimeString(value).substring(3) : value);

					var container = $('<div>')
						.addClass('origem-menu-element')
						.append('<p>'+label+'</p>')
						if (page)
							container.appendTo(ow.gui.util.pages[page]);
					var valueDiv = $('<div>')
						.addClass('origem-slider-value')
						.attr('id', 'origem-'+id+'-value')
						.html(valuetext)
						.appendTo(container);
					var slider = $('<div>')
						.addClass('origem-slider')
						.append('<input id="'+id+'" type="range" max="'+max+'" value="'+value+'">')
						.appendTo(container);
						return (page?this:container);
				},
				addCheckboxMenuItem : function(page, label, id, state) {
					var container = $('<div>')
						.addClass('origem-menu-element origem-menu-checkbox');
					if (page)
						container.appendTo(ow.gui.util.pages[page]);
					var labelElement = $('<label>')
						.attr('for','checkbox-'+id)
						.html(label)
						.appendTo(container);
					var checkbox = $('<input>')
						.attr('type','checkbox')
						.attr('name',id)
						.attr('id','checkbox-' + id)
						.prop('checked',state)
						.appendTo(labelElement);
					labelElement.append('<span class="origem-checkmark">');
					return (page?this:container);
				},
				addRadioItem : function(page, label, id, name, state) {
					var container = $('<div>')
						.addClass('origem-menu-element origem-menu-radio');
					if (page)
						container.appendTo(ow.gui.util.pages[page]);
					var labelElement = $('<label>')
						.attr('for','radio-'+id)
						.html(label)
						.appendTo(container);
					var radio = $('<input>')
						.attr('type','radio')
						.attr('name',name)
						.attr('id','radio-' + id)
						.prop('checked',state)
						.appendTo(labelElement);
					labelElement.append('<span class="origem-checkmark">');
					return (page?this:container);
				},
				addButtonMenuItem : function(page, label, id) {
					var container = $('<div>')
						.addClass('origem-menu-element');
						if (page)
							container.appendTo(ow.gui.util.pages[page]);
					var button = $('<div>')
						.addClass('origem-menu-button')
						.attr('id',id)
						.html(label)
						.appendTo(container);
					return (page?this:container);
				},
				addCustomMenuItem : function(page, item) {
					$(item).appendTo(ow.gui.util.pages[page]);
				},
				addDropdownMenuItem : function(page, label, id, options, state) {
					var container = $('<div>')
						.addClass('origem-menu-element')
						.addClass('origem-menu-dropdown')
						.append('<p>'+label+'</p>')
						.appendTo(ow.gui.util.pages[page]);
					var dropdown = $('<select>')
						.attr('id',id)
						.appendTo(container);
					var option
					for (var i = 0; i < options.length; i++) {
						option = $('<option>')
							.attr('value',options[i].value)
							.html(options[i].text)
							.appendTo(dropdown);
						if (options[i].value===state) 
							option.attr('selected',true);
					};
					return this;
				},
				addTextMenuItem : function(page, id, placeholder, value) {
					value = value?value:"";
					var container = $('<div>')
						.addClass('origem-menu-element')
						.addClass('origem-menu-text')
						.appendTo(ow.gui.util.pages[page]);
					var input = $('<input>')
						.attr('id',id)
						.attr('placeholder',placeholder)
						.val(value)
						.appendTo(container);
					return this;
				},
				addMenuSeperator : function(page) {
					$('<div>').addClass('origem-menu-seperator').appendTo(ow.gui.util.pages[page]);
					return this;
				},
				updMenuTitle : function(){
					$('.owtitle').text('Origem');
				},
				addListBg : function(){
					var mbg = '<div class="origem-menu-text" style="margin: 10px auto; max-height: 440px; width:180px;overflow-x:hidden;overflow-y:auto;">\
							<input id="bgurl" type="text" value="' + (ow.attr.bg || '') + '" placeholder="' + ow.util.chat.parseLang('bgTextF') + '" maxlength="256" size="14">';

					mbg += '<div><p id="default" class="owLinks">' + ow.util.chat.parseLang('background_orig') + '</p></div>';
					for (var i = 1; i < ow.tmp.itens.bgs.length; i++){
						mbg += '<div><p id="owbg' + (i-1) + '" class="owLinks">' + ow.util.chat.parseLang('background') + ' ' + i + '</p></div>';
					}
					ow.gui.util.addCustomMenuItem('backgrounds',mbg+'</div>');
				},
				addLangs : function(){
					var langsp = Object.keys(ow.tmp.itens.lng);
					
					for (var i = 0; i < langsp.length; i++){
						ow.gui.util.addRadioItem('lang',
												ow.tmp.itens.lng[langsp[i]].name,
												'owlang-lang-'+langsp[i],
												'owlang-lang',
												ow.attr.lng.def==langsp[i]);
					}										
				},
				addAlerts : function(){
					var mal = $('<div>')
						.append(ow.gui.util.addCheckboxMenuItem(null, ow.util.chat.parseLang('uuj'), 'userJoin', ow.attr.uuj))
						.append(ow.gui.util.addCheckboxMenuItem(null, ow.util.chat.parseLang('uul'), 'userLeave', ow.attr.uul))
						.append(ow.gui.util.addCheckboxMenuItem(null, ow.util.chat.parseLang('hc'), 'histcheck', ow.attr.hc))
						.append(ow.gui.util.addCheckboxMenuItem(null, ow.util.chat.parseLang('sm'), 'showmehs', ow.attr.sm))
						.append(ow.gui.util.addCheckboxMenuItem(null, ow.util.chat.parseLang('id'), 'infoDJ', ow.attr.id))
						.append(ow.gui.util.addSliderMenuItem(null, ow.util.chat.parseLang('ba_title'), 'slider-boothAlert', 10, ow.attr.ba))
						.append(ow.gui.util.addSliderMenuItem(null, ow.util.chat.parseLang('max_len'), 'slider-maxLength', 600, ow.attr.ml,true));
					ow.gui.util.addCustomMenuItem('alerts',mal);					
				},
				disableAGPlaylistElements : function(){
					var plelm=$('#owagpl-pl');
					plelm.find('div').off();
					plelm.find('input').off();
					plelm.remove();
				},
				addAGListPlaylist : function(){
					var pl = API.getPlaylists();
					
					ow.gui.util.disableAGPlaylistElements();
					var mpl = $('<div id="owagpl-pl">')
							.append(ow.gui.util.addCheckboxMenuItem(null, ow.util.chat.parseLang('ag_active'), 'owagpl-pl-on', ow.attr.ag.on))
							.append(ow.gui.util.addButtonMenuItem(null, ow.util.chat.parseLang('ag_rl'), 'owagpl-pl-rb')),
						hpl = $('<div id="owagpl-pl-head" style="max-height:370px;overflow-y: auto;">');

					for (var i in pl)
						hpl.append(ow.gui.util.addRadioItem(null, pl[i].name, 'owagpl-pl-'+pl[i]._id, 'owagpl-pl-pll', (ow.attr.ag.sel?pl[i]._id==ow.attr.ag.sel:(i==0?true:false))))

					mpl.append(hpl);
					ow.gui.util.addCustomMenuItem('agplaylists',mpl);
					
					$('input[id^="radio-owagpl-pl"]').on('click',ow.gui.events.agm);
					$('#checkbox-owagpl-pl-on').on('click',ow.gui.events.agm);
					$('#owagpl-pl-rb').on('click',ow.gui.events.agrb);
				}
			}
		},
		api: {
			events : {
				'room_playlist-dub': function (obj){
					if (ow.attr.sm) {
						if (obj.dubtype == 'downdub' || obj.dubtype == 'downd'){
							if (!obj.user || ow.tmp.control.meh.indexOf(obj.user._id) != -1)	return;
							
							API.chatLog(ow.util.chat.parseLang('mehnotif', { User : _.escape(obj.user.username) }),ow.util.chat.parseLang('sm'));
							ow.tmp.control.meh.push(obj.user._id);
						}
					}
				},
				'room_playlist-update': function(obj) {
					if (!obj || !obj.song || obj.song._id == API.getLastMedia().song._id)	return;
//					if (!obj || obj.startTime > 0)	return;
					
					if (ow.attr.aw)
						API.dubup();

					if (ow.attr.aj) API.djJoin();
					
					ow.tmp.control.grab = [];
					ow.tmp.control.meh = [];

					if ( ow.attr.id )
						ow.util.djAdvance.djScore(API.getLastMedia());
					
					ow.tmp.adv = API.getMedia();
/*					
					if ( ow.attr.hc ){
						ow.util.history.check(obj);
						ow.util.history.addMedia(obj);
					}
*/					ow.util.djAdvance.checkMaxDuration(obj);
				},
				'chat-message': function(obj){
					if (!obj.chatid)
						return;

					var sender = API.getUser(obj.user._id),
						mention = obj.message.indexOf('@'+API.getUser().username) != -1;
					
					if (!sender)
						return;
					
					if (sender.role >= 4 && mention){
						if ( ow.attr.afk.on && !obj.message.toLowerCase().indexOf('!afkdisable') ){
							document.getElementById('checkbox-afk').checked = false;
							ow.attr.afk.on = false;
							API.chatLog(ow.util.chat.parseLang('afkdisable', { User : _.escape(sender.username) }), 'AFK disable');
							return API.sendChat('@' + sender.username + ' AFK message disabled');
						}

//						if ( obj.type.indexOf('mention') != -1 )
//							ow.util.chat.playSound();						
					}
					
					var afks = ow.attr.afk;
					
					if ( mention && afks.on && afks.msg && ow.util.aafk.filter(afks.msg.toLowerCase()) && (((new Date().getTime()) - ow.tmp.afk.ls) > (5 * 60 * 1e3)) )
						API.sendChat('[AFK] @' + sender.username + ' ' + afks.msg);
					
					if ( API.getUser().userid == sender.userid ){
						if (afks.on )
							ow.tmp.afk.ls = new Date().getTime();
						ow.util.aafk.threadInterval();
					}

					ow.util.chat.custEmotes($('li[class^="user-'+sender.userid+'"]').last().find('p').last());
				},
				'user-join': function(obj){
					if ( ow.attr.uuj )
						API.chatLog(ow.util.chat.parseLang('user_join', { User : _.escape(obj.user.username) }),ow.util.chat.parseLang('uuj'));
				},
				'user-leave': function(obj){
					if ( ow.attr.uul )
						API.chatLog(ow.util.chat.parseLang('user_leave', { User : _.escape(obj.user.username) }),ow.util.chat.parseLang('uul'));					
				},
				chatCommand : function(obj){
					var split = obj.trim().split(' ');
					
					split[0] = split[0].substring(1).toLowerCase();

					if ( ow.commands[split[0]] )
						ow.commands[split[0]](obj, split);
				}
			}
		},
		util : {
			changeBG: function(){
				var URL = $('#bbgchange').val();
                if (URL !== null && URL !== "") {
                    URL.toLowerCase();    
                	if(ow.attr.cbg) {
                		$(".backstretch img").attr("src", URL);
                	}else{
                		$(".backstretch img").attr("src", ow.tmp.background);
                	}
                }
            },
			getUniqueHash : function(){
				var chars = 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789+_#@$.',
					maxloop = Math.round((Math.random()*100)%20+10),
					proc = '';
				
				for (var i =0; i < maxloop; i++){
					proc += chars.charAt(Math.round((Math.random()*100)%chars.length));
				}
				return proc;
			},
			djAdvance : {
				djScore : function(obj){
					if ( !obj.song || !obj.songInfo )
						return;
					
					var  user = API.getUser(obj.song.userid);
					if (!user)
						return;
					
					var title = {
							User : user.username
						},
						info = {
							Author : '',
							Media : obj.songInfo.name,
							Woot : obj.song.updubs,
							Add : 0,
							Meh : obj.song.downdubs
						};
					
					API.chatLog(_.escape(ow.util.chat.parseLang('dj_played_info', info)), _.escape(ow.util.chat.parseLang('dj_played_title', title)), obj.songInfo.images.thumbnail);
				},
				checkMaxDuration: function(obj){
					if ( !obj.songInfo )
						return;
					
					var type = (obj.songInfo.type == 'youtube' ? 'video' : 'music' );
					
					if ( ow.attr.ml !== 0 && (~~(obj.songInfo.songLength/1e3)) > ow.attr.ml ){
						ow.util.chat.playSound();
						API.chatLog(ow.util.chat.parseLang('ml_exc_msg', { Type : ow.util.chat.parseLang(type) }),ow.util.chat.parseLang('ml_exc_title'));
					}
				}
			},
			history : {
				getHistory : function(){
					ow.tmp.hist = [];
				},
				addMedia : function(obj){
					if ( !obj.media || !obj.dj)
						return;
						
					var now = new Date(),
						media = {
							cid : obj.media.cid,
							username : obj.dj.username,
							date : new Date(now.getTime() + (now.getTimezoneOffset()*6e4))
						},
						len = ow.tmp.hist.length;
					
					if (len>=0&&(new Date(media.date).getTime() - new Date(ow.tmp.hist[len-1].date).getTime()<1e3))
						return;
					if ( ow.tmp.hist.unshift(media) > 50 )
						ow.tmp.hist.pop();
				},
				check : function(obj){
/*					if ( !obj.media )
						return;
					
					for (var i in ow.tmp.hist){
						if ( ow.tmp.hist[i].cid == obj.media.cid ){
							var diff = Math.round((new Date((new Date().getTime()) + (new Date().getTimezoneOffset()*6e4)).getTime() - ow.tmp.hist[i].date.getTime())/1e3),
								info = {
									Type : ow.util.chat.parseLang((obj.media.format == 1 ? 'video' : 'music')),
									Position : (parseInt(i)+1),
									Total : ow.tmp.hist.length,
									Time : ow.util.getTimeString(diff),
									Times : ow.tmp.hist.filter(function(a){return a.cid == obj.media.cid;}).length,
									User : ow.tmp.hist.filter(function(a){return a.cid == obj.media.cid;})[0].username
								};
							if ( diff < ( 3600 * 2 ) )
								ow.util.chat.playSound();
							
							ow.util.chat.addChatLog('icon icon-history-white',
													ow.util.getHexaColor(''),
													ow.util.chat.parseLang('med_in_hist_msg', info),
													ow.util.chat.parseLang('med_in_hist_title'),
													ow.util.getHexaColor('yellow'));
							break;
						}
					}
*/				}
			},
			eta : {
				getMed: function(){
					var wl = API.getWaitList(),
						wlp = API.getWaitListPosition(),
						dj = API.getDJ();
					
					ow.tmp.eta.med = 0;
					
					if (!wl.length)
						return;
						
					if (wlp==-1)
						wlp = wl.length;
					
					for (var i = 0; i < wlp; i++)
						ow.tmp.eta.med += ~~(wl[i].songLength/1e3);

					ow.tmp.eta.med+=API.getTimeRemaining();					
				},
				updateETA: function(){
					ow.util.eta.getMed();					
					var wlp = API.getWaitListPosition(),
						dj = API.getDJ();
					
					var wl = '(' + (wlp != -1 ? (wlp+1) + '/' : '') + API.getWaitList().length + ')';
						
					if ( wlp == -1 && dj && dj.userid != API.getUser().userid )
						wlp = API.getWaitList().length;
						
					if ( !ow.tmp.eta.med )
						ow.util.eta.getMed();
					
					var time = ow.util.getTimeString(ow.tmp.eta.med);
					if ( !ow.attr.eta.on ){
						time == 'N/A';
						clearInterval(ow.ti.eta);
						ow.ti.eta = null;
					}
					ow.tmp.eta.str = 'ETA: ' + time + ' ' + wl;
					$('.eta').text(ow.tmp.eta.str);
				},
				threadUpdate : function(){
/*					var pos = API.getWaitListPosition(),
						len = API.getWaitList().length,
						dj = API.getDJ();
*/						
					if ( ow.attr.eta.on && !ow.ti.eta ){
						ow.ti.eta = setInterval(ow.util.eta.updateETA, 1000);
					}
				}
			},
			aafk : {
				filter : function(msg){
					var deny = ['origem','ncs','p3','tasty','radiant','woot','http','www','utilize','use','know','bit.ly','ad.fly'];
					
					for (var i in deny){
						if (msg.indexOf(deny[i])!=-1)
							return false;
					}
					return true;
				},
				threadInterval : function(){
					window.clearInterval(ow.ti.aafk);

					if (ow.attr.aafk.time){
						if (ow.attr.aafk.time > 0 && ow.attr.aafk.time <= 600)
							ow.attr.aafk.time = 1200;
						
						ow.ti.aafk = setInterval(function(){							
							if(ow.attr.aafk.time && ow.attr.aafk.msg && (API.getWaitListPosition() != -1 || API.getDJ() && API.getDJ().userid == API.getUser().userid )){
								if (ow.util.aafk.filter(ow.attr.aafk.msg.toLowerCase()))
									API.sendChat((!ow.attr.aafk.msg.indexOf('/') ? ' ':'')+ow.attr.aafk.msg);
							}
						}, ow.attr.aafk.time*1e3);
					}
				}
			},
			chat : {
				playSound : function(){				
					var snds = ow.tmp.snd[ow.attr.lng.def];
					
					if ( !ow.tmp.focus ){
						if ( ow.attr.snd.dlc <= -1 || !snds || !snds.length)
							ow.tmp.snd.mention.play();
						else
							snds[( ow.attr.snd.dlc == 0 ? (Math.floor(Math.random()*100)%snds.length) : ow.attr.snd.dlc-1)].play();
					}
				},
				parseLang : function(key, item){
					var txt = ow.tmp.lng.sel[key];
					if ( !txt )
						return '[Error : key not found "' + key + '"]';
						
					if ( !item)
						return txt;
					for ( var i in item ){
						while ( txt.indexOf('%%' + i + '%%') != -1 )
							txt = txt.replace('%%' + i + '%%', item[i]);
					}
					return txt;
				},
				parseLinks : function(msg){
					if (!msg)
						return;
					msg = _.escape(msg);
					
					if ( !msg.match(/https?/) )
						return msg;
					
					var split = msg.split(' '),
						done = '';
					
					for (var i in split){
						if (split[i].match(/^https?/))
							split[i] = '<a href="' + split[i] + '" ' +('target="_blank"')+'>' + split[i] + '</a>';
						
						done += split[i] + ' ';
					}
					return done.trim();
				},
				custEmotes: function(a) {
					if (!ow.attr.ce.on || !Object.keys(ow.tmp.emotes).length) return;
					var b = a.html();
					if (typeof b != 'string') return;
					var chat = $('.chat-messages'), end = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28;

					a.html(ow.util.chat.custEmotesContext(b));
					if (end) chat.scrollTop(chat[0].scrollHeight);
				},
				custEmotesContext: function(message, ctx) {
					if (!ow.attr.ce.on || !Object.keys(ow.tmp.emotes).length) return message;
					emotes = ow.tmp.emotes;
					var msgbkp = message,
						repc=0;
					for (var i in emotes) {
						var j = ':' + i.toLowerCase() + ':';
						message = message.replace(new RegExp(j,'gi'),function(x){
							repc++;
							return '<img class="ow-emoji" src="' + emotes[i].url + '" title=":' + i + ':" alt=":' + i + ':" align="absmiddle"></img>';
						});
						if (repc>ow.attr.ce.max)	return msgbkp;
					}
					return message;
				}
			},
			gui : {
				toggleDropdown: function(selector){
					var dropdown = $(selector)[0],
						mouseEvent = document.createEvent('MouseEvents');
					mouseEvent.initMouseEvent('mousedown', true, true, window);
					dropdown.dispatchEvent(mouseEvent);
				}
			},
			ajax :	function(_url, method, parameters, func, par_to_func, type){
				return $.ajax({
					cache: false,
					type: method || 'GET',
					url: _url,
					contentType: type || 'application/json',
					data: parameters
				}).done(function( msg ) {
					if (func)
						func(msg, par_to_func);
				});
			},
			grab : {
				grab : function(){

				}
			},
			autoWoot: function(){
				API.dubup();
			},
			getTimeString: function (sec) {
				if ( !sec || isNaN(sec) || sec <= 0 )
					return 'N/A';
					
				var v = [3600, 60, 0],
					t = [0,0,0],
					str = '';
					
				for ( var i in v){
					while ( sec >= v[i] && v[i] > 0){
						t[i]++;
						sec -= v[i];
					}
					if ( i == v.length-1 )
						t[i] = sec;
						
					str += ((t[i] < 10 ) ? ('0' + t[i]) : t[i]);
					if ( i < v.length-1 )
						str += ':';
				}
				
				return str;
			},
			getHexaColor: function(name){
				switch(name.toLowerCase()){
					case 'aqua'		: return '#009cdd';
					case 'roxo'		: return '#ac76ff';
					case 'pink'  	: return '#E600A0';
					case 'rede'	 	: return '#F3508F';
					case 'orange'	: return '#f46b40';
					case 'active'	: return '#02BCFF';
					case 'green' 	: return '#00FF00';
					case 'gold'  	: return '#FFD700';
					case 'cean'  	: return '#00F5FF';
					case 'red'   	: return '#EF2525';
					case 'laranja' 	: return '#D87F0E';
					case 'yellow'	: return '#eec81b';
					default		 	: return '#FFFFFF';
				}
			},
			refreshMehs: function() {
			},
			user : {
				getUserID : function(nick) {
					if ( nick == null )
						return -1;
													
					var users 	= API.getUsers();
					
					for (var i in users ) {
						if (nick == users[i].username )
								return users[i].userid;
					}
					return -1;
				},
								
				getNickUserByMention : function(ini, array){
					if ( array.length <= ini )
						return null;
															
					var user 	= array[ini];

					for (var x = ini+1; x < array.length; x++)
						user += " " + array[x];
					
					return user.substring(1);
				},
									
				getIDUserByMention : function(ini, array){
					if ( ini == array.length )
						return API.getUser().userid;
						
					var id = ow.util.user.getUserID(ow.util.user.getNickUserByMention(ini, array));

					if ( id == -1 )
						API.chatLog('User not found!');
					
					return id;
				}
			},
			staff : {
				lockskip : function(){
					var user = API.getDJ();
					if (!user)	return;
					API.API.moderateSkip(function(){API.moderateMoveDJ(user.userid,1);});
				},
				skipdj : function(){
					API.moderateSkip();
				},
				clearChat : function(){
					$('.chatDelete').click();
				}
			},
			emotes : {
				load : function(url, show){
					$.getScript( url )
					.done(function( script, textStatus ) {
						var cont=0, a = window.ow_emotes;
						delete window.ow_emotes;
						for (var i in a) {
							for (var j in a[i]) {
								ow.tmp.emotes[j] = a[i][j];
								cont++;
							}
						}
						if (show)
							API.chatLog(cont + ' emotes loaded from ' + url + ', Total: ' + Object.keys(ow.tmp.emotes).length);
					})
					.fail(function( jqxhr, settings, exception ) {
						window.owc = false; API.chatLog('[OrigemWoot] URL: ' + url + ' : ' + ow.util.chat.parseLang('loadEmotes_fail'));
					});
				}
			}
		},
		commands: {		
			cmd : function(str, split){
				var cmds = '';

				for (var i in ow.commands )
					cmds += (!cmds ? '' : '<br>') + ' /' + i;

				API.chatLog(cmds, ow.util.chat.parseLang('ow_cmds'));
			},
			vol : function(str, split) {
				API.setVolume(parseInt(split[1]));
			},
			reload : function(str, split){
				API.chatLog(ow.util.chat.parseLang('reloading'));
				ow.main.reload();
			},
			reset : function(str, split){
				if (split.length == 1 || split[1] && split[1].toLowerCase() == 'origem'){
					delete localStorage.ow;
					API.chatLog(ow.util.chat.parseLang('reseting'));
					ow.main.reload();
				}
			},
			kill : function(str, split){
				ow.main.end();
			},
			lang : function(str, split){
				if ( split.length == 1 ){
					var opt = '';
					for (var i in ow.tmp.itens.lng)
						opt += (!opt ? '' : '<br/>') + '<span title="' + ow.util.chat.parseLang('langChange_title') + '" style="cursor:pointer" onclick="API.sendChat(\'/lang ' + i + '\');">' + ow.tmp.itens.lng[i].name + '</span>';
					
					var txt = ow.util.chat.parseLang(opt ? 'langList' : 'langList_fail');
//					return ow.util.chat.addChatLog(null, ow.util.getHexaColor(''), (opt ? opt : ''), txt, ow.util.getHexaColor('gold') );	
					return API.chatLog((opt ? opt : ''),txt);
				}
				if ( split[1] && ow.tmp.itens.lng[split[1].toLowerCase()] && ow.attr.lng.def != split[1] ){
					ow.attr.lng.def = split[1].toLowerCase();
					ow.storage.save();
					ow.main.reload();
				}
			},
			leave : function(str,split){
//				API.djLeave();
			},
			image : function(str, split){
				var b = API.getMedia();
				if (b.format == 1) API.chatLog(ow.util.chat.parseLang('image_link') + ' <a href="http://i.ytimg.com/vi/' + b.cid + '/hqdefault.jpg" target="_blank">' + ow.util.chat.parseLang('clk_here') + '</a>','Image');
			},
			love : function(str, split){
				API.sendChat(':heart: :purple_heart: :blue_heart: :green_heart: :yellow_heart: :heart: :purple_heart: :blue_heart: :green_heart: :yellow_heart:');
			},
			link : function(str, split){
				var a = API.getMedia();
				
				if (a.format == 1)
					API.chatLog(ow.util.chat.parseLang('song_link') + '&nbsp;<a href="https://youtu.be/' + a.cid + '" target="_blank">' + ow.util.chat.parseLang('clk_here') + '</a>','Link');
				else
					SC.get('/tracks', {ids: a.cid}, function(tracks) {
						API.chatLog(ow.util.chat.parseLang('song_link') + '&nbsp;<a href="' + tracks[0].permalink_url + '" target="_blank">' + ow.util.chat.parseLang('clk_here') + '</a>','Link');
					});
			},
			download : function(str, split){
				var a = API.getMedia();
				
				if (!a || !a.songInfo)
					return;
				
				if (a.songInfo.type == 'youtube')
					API.chatLog(ow.util.chat.parseLang('song_link') + '&nbsp;<a href="http://youtubeinmp3.com/fetch/?video=http://www.youtube.com/watch?v=' + a.songInfo.fkid + '" target="_blank">' + ow.util.chat.parseLang('clk_here') + '</a>','Download');
				else
					$.ajax({
						url:'https://api.soundcloud.com/tracks/'+a.songInfo.fkid+'/streams?client_id=bd7fb07288b526f6f190bfd02b31b25e&format=json&_status_code_map[302]=200'
					}).done(function(sound){
						API.chatLog(ow.util.chat.parseLang('song_link') + '&nbsp;<a href="' + sound.http_mp3_128_url + '"  download="'+a.author+' - '+a.title+'.mp3">' + ow.util.chat.parseLang('clk_here') + '</a>','Download');
					});
			},
			lockskip : function(str, split){
/*				if (API.getUser().role < 3 && !API.getUser().gRole){
					API.chatLog(ow.util.chat.parseLang('noRight_ls'));
					return;
				}
				var pos = split[1];
				pos = (pos && !isNaN(pos) && pos <= API.getWaitList().length ? pos : 1);
				
*/				ow.util.staff.lockskip();
			},
			whois : function(str, split){
			},
			maxlength : function(str, split){
				if ( split.length == 1 )
					return API.chatLog(ow.util.chat.parseLang('max_length_val', {Time : (ow.util.getTimeString(ow.attr.ml).substring(3) || ow.util.chat.parseLang('off'))}),
										ow.util.chat.parseLang('max_len'));

				var val = -1;
				if ( !isNaN(split[1]) ){
					val = Math.round(parseInt(split[1]));
				}else{
					if ( split[1].match(/\d{1,2}\:\d{1,2}/) ){
						var time = split[1].split(':'),
							min = parseInt(time[0]),
							sec = parseInt(time[1]);
						
						val = ( min > 10 || sec > 59 ? -1 :  min*60 + sec);
					}else
						val = -1;
				}
				if ( val <= -1 || val > 600 )
					return API.chatLog(ow.util.chat.parseLang('max_length_valerr'),
										ow.util.chat.parseLang('max_len'));

				ow.gui.events.maxLength(val);
				API.chatLog(ow.util.chat.parseLang('max_length_val', {Time : (ow.util.getTimeString(ow.attr.ml).substring(3) || ow.util.chat.parseLang('off'))}),
							ow.util.chat.parseLang('max_len'));
			},
			boothalert : function(str, split){
				if ( split.length == 1 )
					return API.chatLog(ow.util.chat.parseLang('ba_info', {Position : ow.attr.ba}),
										ow.util.chat.parseLang('ba_title'));

				var val = -1;
				if ( !isNaN(split[1]) )
					val = Math.round(parseInt(split[1]));
				if ( val <= -1 || val > 10 )
					return API.chatLog(ow.util.chat.parseLang('ba_length_error'),
										ow.util.chat.parseLang('ba_title'));

				ow.gui.events.maxLength(val);
				API.chatLog(ow.util.chat.parseLang('ba_length_error'),
							ow.util.chat.parseLang('ba_title'));
			},
			emotes : function(str, split){
				if ( split.length == 1 ){
					for (var i in ow.attr.emotes)
						API.chatLog(ow.attr.emotes[i]);
					
					return;
				}
				if (split[1].toLowerCase() == 'list')
					return API.sendChat('OrigemWoot Emotes List: https://rawgit.com/OrigemWoot/OrigemWoot/master/emotes.html');

				var split1 = split[1].trim();
				if ( split1.indexOf('http') != 0 )
					return API.chatLog('Invalid URL!');

				if ( ow.attr.emotes.indexOf(split1) == -1 ){
					ow.util.emotes.load(split1, true);
					ow.attr.emotes.push(split1);
				}else{
					ow.attr.emotes.splice(ow.attr.emotes.indexOf(split1), 1);
					return API.chatLog('Emote List URL ' + split1 + ' removed.');
				}
				ow.storage.save();
			},
			delicia : function(str, split){
				if ( ow.attr.lng.def != 'pt' )
					return API.chatLog('Command not avaliable to your language.','Forbidden');

				var snds = ow.tmp.snd[ow.attr.lng.def],
					len = (snds ? snds.length : 0);
				if ( split[1] == null || split[2] == null ){
					return API.chatLog(ow.util.chat.parseLang('delicia_info', {Length : len}), 
										ow.util.chat.parseLang('delicia_title'));
				}
				
				if (split[1].toLowerCase() == 'play'){
					if ( isNaN(split[2]) || parseInt(split[2]) < 0 || parseInt(split[2]) > len){
						return API.chatLog(ow.util.chat.parseLang('delicia_invalid', {Length : len}), 
											ow.util.chat.parseLang('delicia_title'));
					}
					else
						snds[( parseInt(split[2]) == 0 ? (Math.floor(Math.random()*100)%len) : parseInt(split[2])-1)].play();
				}
				if	(split[1].toLowerCase() == 'set'){
					if ( split[2].toLowerCase() == 'off' || split[2] < 0){
						ow.attr.snd.dlc = -1;
						ow.util.API.chatLog(ow.util.chat.parseLang('delicia_off'), 
											ow.util.chat.parseLang('delicia_title'));
						return ow.storage.save();
					}
					if ( split[2] == 0){
						ow.attr.snd.dlc = 0;
						API.chatLog(ow.util.chat.parseLang('delicia_rand'), 
												ow.util.chat.parseLang('delicia_title'));
						return ow.storage.save();
					}
					if ( isNaN(split[2]) || parseInt(split[2]) < 0 || parseInt(split[2]) > len){
						return API.chatLog(ow.util.chat.parseLang('delicia_invalid', {Length : len}), 
												ow.util.chat.parseLang('delicia_title'));
					}else{
						ow.attr.snd.dlc = split[2];
						API.chatLog(ow.util.chat.parseLang('delicia_sel') + ow.util.chat.parseLang(!split[2] ? 'delicia_sndval' : 'delicia_randval'),
												ow.util.chat.parseLang('delicia_title'));
						ow.storage.save();
					}
				}
			}
		},
		storage : {
			load : function(){
				if ( !localStorage.ow )
					return console.log('You no have previous settings.');
				
				try{
					ow.attr = JSON.parse(localStorage.ow);
				}catch(e){
					console.log(e.stack);
				}				
			},
			save : function(){
				localStorage.ow = JSON.stringify(ow.attr);
			}
		},
		main : {
			init : function(){
				if (window.owc)
					return;
				window.owc = true;

				$('#owmenucss').remove();			
				ow.storage.load();

				$('head').append('<link id="owmenucss" rel="stylesheet" type="text/css" href="https://rawgit.com/OrigemWoot/OrigemWoot/master/CSS/OrigemCSS-main.css">');
				$('head').append('<link id="owteamcss" rel="stylesheet" type="text/css" href="https://rawgit.com/OrigemWoot/OrigemWoot/master/CSS/team.css">');
				$('#owmenucss')[0].onload = ow.main.loadItens;
			},
			loadItens : function(){
				$.getScript( "https://rawgit.com/OrigemWoot/OrigemWoot/master/JSON/main.js" )
				.done(function( script, textStatus ) {
					ow.tmp.itens = window.ow_main;
					delete window.ow_main;
					ow.main.loadLang();
				})
				.fail(function( jqxhr, settings, exception ) {
					$.getScript( "https://rawgit.com/OrigemWoot/OrigemWoot/master/JSON/main_stable.js" )
					.done(function( script2, textStatus2 ) {
						ow.tmp.itens = window.ow_main;
						delete window.ow_main;					
						ow.main.loadLang();
					})
					.fail(function( jqxhr2, settings2, exception2 ) {
						window.owc = false; API.chatLog('[OrigemWoot] Failed to load default settings from Origem Woot, refresh or try again!');
					});
				});
			},
			loadEmotes : function(){
				ow.util.emotes.load('https://rawgit.com/OrigemWoot/OrigemWoot/master/JSON/emotes.js');
				
				for (var i in ow.attr.emotes )
					ow.util.emotes.load(ow.attr.emotes[i]);
			},
			loadLang : function(){
				if ( !ow.tmp.itens.lng[ow.attr.lng.def])
					ow.attr.lng.def = 'en';
					
				$.getScript( ow.tmp.itens.lng[ow.attr.lng.def].url )
				.done(function( script, textStatus ) {
					ow.tmp.lng.sel = window.ow_lang;
					delete window.ow_lang;
					ow.main.loadEmotes();
					ow.main.loadItems();
				})
				.fail(function( jqxhr, settings, exception ) {
					$.getScript( ow.tmp.itens.lng['en'].url )
					.done(function( script2, textStatus2 ) {
						ow.tmp.lng.sel = window.ow_lang;
						delete window.ow_lang;
						ow.main.loadEmotes();
						ow.main.loadItems();
					})
					.fail(function( jqxhr2, settings2, exception2 ) {
						window.owc = false; API.chatLog('[OrigemWoot] Failed to load lang, refresh or try again later!');
					});
				});
			},
			reload : function(){
				ow.main.end();
				$.getScript(ow.tmp.script);
			},
			end : function(){
				ow.main.remEvents();
				$(window).trigger('resize');
			},
			loadItems : function(){
				ow.tmp.url = document.location.pathname.substring(1);
							
				API.chatLog('V' + ow.tmp.version + ' Loaded', ow.util.chat.parseLang('owtitle'), 'https://i.imgur.com/hAFKXly.png');

				if ( ow.attr.aw )
					ow.util.autoWoot();
					
				ow.tmp.adv = API.getMedia();
								
				ow.gui.util.addMenu();				
				ow.util.eta.getMed();
				ow.util.eta.threadUpdate();
				ow.util.aafk.threadInterval();

				ow.gui.util.updMenuTitle();
				ow.main.addEvents();				
			},
			addEvents: function(){
				API.chat.groupMessages=ow.attr.gm;
				ow.tmp.snd.mention = $('<audio/>', { src: ow.tmp.itens.sounds.mention[0]})[0];
				
//				$('#default').on('click', {bg : ow.tmp.itens.bgs[0]}, ow.gui.events.bc);
//				for (var i = 1; i < ow.tmp.itens.bgs.length; i++){
//					$('#owbg' + (i-1)).on('click', {bg : ow.tmp.itens.bgs[i]}, ow.gui.events.bc);
//				}

				if (ow.tmp.itens.sounds[ow.attr.lng.def]){
					ow.tmp.snd[ow.attr.lng.def] = [];
					for (var i = 0; i < ow.tmp.itens.sounds[ow.attr.lng.def].length; i++){
						ow.tmp.snd[ow.attr.lng.def].push($('<audio/>', { src: ow.tmp.itens.sounds[ow.attr.lng.def][i]})[0]);
					}
				}
						
				$('input[id^="radio-owlang-lang-"]').on('click',ow.gui.events.lang);
				
				$('.origem-menu-opener, #origem-menu-close').click(
					ow.gui.events.toggleMenu);

				$('#origem-menu-page-selector').change(
					ow.gui.events.updatePage);
				$('#backgrounds,#backgrounds + .arrowicon').on('click', function () {
					ow.gui.events.toggleSubmenu('backgrounds');
				});
				
				$('#checkbox-autowoot').on('change', ow.gui.events.aw ); 
//				$('#checkbox-fullscreen').on('change', ow.gui.events.fs ); 
				$('#checkbox-showmehs').on('change', ow.gui.events.sm ); 
				$('#checkbox-userJoin').on('change', ow.gui.events.uuj ); 
				$('#checkbox-userLeave').on('change', ow.gui.events.uul ); 
				$('#checkbox-afk').on('change', ow.gui.events.tafk);
				$('#afkmessage').focusout(ow.gui.events.afktifo);
//				$('#bgurl').focusout(ow.gui.events.bgtifo);
//				$('#checkbox-chatimg').on('change', ow.gui.events.tci);
				$('#bgchange').on('change', ow.gui.events.cbg);
				$('#lockskip').on('click', ow.util.staff.lockskip);
				$('#clearchat').on('click', ow.util.staff.clearChat);
				
				$('#skipdj').on('click', ow.util.staff.skipdj);
//				$('#remdj').on('click',  ow.util.staff.removeDJ);

				$('#owReload').on('click', ow.main.reload);
				$('#owKill').on('click', ow.main.end);

				$('#owEmotes').on('click', function() {
					window.open('https://rawgit.com/OrigemWoot/OrigemWoot/master/emotes.html');
				});
				$('#checkbox-infoDJ').on('change', ow.gui.events.id );
				$('#checkbox-groupMessage').on('change', ow.gui.events.gm);				
//				$('#checkbox-histcheck').on('change', ow.gui.events.hc);
				$('#slider-maxem').on('mousemove', ow.gui.events.me);
				$('#checkbox-showce').on('change', ow.gui.events.sce);
				$('#slider-maxLength').on('mousemove', ow.gui.events.maxLength);
				$('#slider-boothAlert').on('mousemove', ow.gui.events.ba);
				$('#aafkmessage').focusout(ow.gui.events.aafktifo);
				$('#slider-aafk').on('mousemove', ow.gui.events.aafk);
//				$('#slider-maxccspeed').on('mousemove', ow.gui.events.ccs);
				
				$('#checkbox-eta').on('change', ow.gui.events.eta);

				$('.origem-menu-pages').click(function(event){
					if (event.target===this) {
						ow.util.gui.toggleDropdown('#origem-menu-page-selector');
					}
				});
						
				$('#main_player .player_sharing').append('<span class="eta"></span>');

				jQuery.ajax({
					type:'GET',
					dataType:'script',
					url:'https://cdnjs.cloudflare.com/ajax/libs/jquery.nicescroll/3.5.1/jquery.nicescroll.js',
					success:function(){
						var config = {
							zindex:12,
							hwacceleration : true,
							horizrailenabled: false,
							autohidemode: false
						};
						
						$('.origem-menu-page').niceScroll(JSON.parse(JSON.stringify(config)));
					}
				});
			
				$(window).resize(ow.misc.events.resize)
					.bind('beforeunload', ow.misc.events.windowClose);
					
				$(document)
					.focusin(ow.misc.events.focusin)
					.focusout(ow.misc.events.focusout);
				
				API.on(ow.api.events);
				window.ow = {
					kill : ow.main.end
				};

				$(window).trigger('resize');
			},
			remEvents: function(){
				API.chat.groupMessages=true;
				API.off(ow.api.events);
				
				ow.gui.util.remfs();
				
				for (var i in ow.ti)
					window.clearInterval(ow.ti[i]);
				
				for (var i in ow.to)
					window.clearTimeout(ow.to[i]);
				
				$('#default').off();
				
				$(document).off('focusin', ow.misc.events.focusin)
					.off('focusout', ow.misc.events.focusout);
				$(window).off('resize', ow.misc.events.resize)
					.off('beforeunload', ow.misc.events.windowClose);
				
				$('.origem-menu-opener, .origem-menu-container, #origem-menu-page-selector').off();
				$('#backgrounds,#backgrounds + .arrowicon').off();
				$('input[id^="radio-owlang-lang-"]').off('click',ow.gui.events.lang);

				$('#owicone, #owmenucss, #origem-chat-color-styles, #cssstaffcolors').remove();
				
				$('#origem-menu-container').find('input').off();
				$('#origem-menu-container').find('div').off();
				$('#origem-menu-container').find('g').off();
				$('#origem-menu-container').find('p').off();

				ow.gui.util.disableAGPlaylistElements();
				
				$('.eta, #hide-donate').remove();
				
				$('.origem-menu-opener, .origem-menu-container, #origem-menu-page-selector').remove();
				$('#backgrounds,#backgrounds + .arrowicon').remove();

				window.owc = false;				
			}
		}
	};
	if (window.owc)
		try{
			window.ow.kill();
		}catch(e){}

	ow.main.init();
})();
