var express = require('express');
var router = express.Router();

var lunr = require('lunr');
var ioredis = require('ioredis');
var async = require('async');

var redis = new ioredis({
	host: '127.0.0.1',
	port: 6379,
	db: 0,
	password: 'redisy470'
});

var REDIS_KEY = 'search';

/* GET home page. */
router.post('/', function(req, res, next) {
	var redisList = undefined;
	var redisResult = [];

	async.series([
		(callback) => {
			redis.hgetall(REDIS_KEY, (oError, oResults) => {
				for (var sKey of Object.keys(oResults)) {
					redisList = oResults;

					var oResult = JSON.parse(oResults[sKey]);
					// oResult.contents = oResult.contents.replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi, ' ');
					oResult.contents = oResult.contents.replace(/\s+/g, ' ').trim();
					redisResult.push({
						id: oResult.id,
						title: oResult.title,
						contents: oResult.contents
					});
				}

				callback(null);
			});
		}
	], function() {
		var idx = lunr(function () {
			this.ref('id');
			this.field('title');
			this.field('contents');

			for (var i = 0; i < redisResult.length; i++) {
				this.add(redisResult[i]);
			}
		});

		let reqSearch = req.body.search.trim();
		// reqSearch = reqSearch.replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi, ' ');
		reqSearch = reqSearch.replace(/\s+/g, ' ');

		const reqSearchList = [];
		reqSearchList.push(req.body.search.trim());

		let searchQuery = '';

		for (var i = 0; i < reqSearchList.length; i++) {
			searchQuery += `title:*${reqSearchList[i]}* contents:*${reqSearchList[i]}*`;
			if ((reqSearchList.length - 1) !== i) {
				searchQuery += ' ';
			}
		}

		var searchResults = idx.search(searchQuery);

		searchResults.sort(function (a, b) {
			return (a.score < b.score) ? 1 : ((b.score < a.score) ? -1 : 0);
		});

		var redisSearchResults = [];
		// console.log(JSON.stringify(searchResults[0]));
		// console.log(JSON.stringify(searchResults[1]));
		// console.log(JSON.stringify(searchResults[2]));
		for (var i = 0; i < searchResults.length; i++) {
			redisSearchResults.push(JSON.parse(redisList[searchResults[i].ref]));
		}

		// console.log(redisSearchResults);

		res.render('search', {
			search_list: redisSearchResults,
			search_text: reqSearchList.join(',')
		});
	});
});

module.exports = router;
