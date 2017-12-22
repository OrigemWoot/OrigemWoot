API.on(API.ADVANCE, callback);

function callback () {

	var a = API.getMedia().cid;
	setTimeout(function() {
	    var b = API.getMedia().cid;
	    if (a === b) {
	        API.sendChat("Track stuck, force skipping!");
	        API.moderateForceSkip();
	    }
	}, (API.getMedia().duration * 1000) + 5000);

}
