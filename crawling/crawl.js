'use strict';

const oRequest = require('request');
const oCheerio = require('cheerio');
const oAsync = require('async');
const oHe = require('he');
const oIoRedis = require('ioredis');

const oRedis = new oIoRedis({
	host: '127.0.0.1',
	port: 6379,
	db: 0,
	password: 'redisy470'
});

const REDIS_KEY = 'search';

// TODO 삭제 (확인용)
const oResults = [];

const oCrawlingList = {
	api: {
		baseUrl: 'https://developer.cafe24.com/docs/api',
		typeList: [ 'front', 'admin' ]
	}
};

const oCrawlApiDoc = (sBaseUrl, sApiType, oCallback) => {
	oRequest.get({
		url: `${sBaseUrl}/${sApiType}/`,
		timeout: 3000
	}, (oError, oResponse, oBody) => {
		let $ = oCheerio.load(oBody), jQuery = $;
		$ = oCheerio.load($('div > .content').html()), jQuery = $;

		const aH2IdList = [];

		$('h2').each((nIndex, oVal) => {
			const oAttr = oVal.attribs || {};

			if (typeof oAttr.id === 'string' || oAttr.id instanceof String) {
				aH2IdList.push(oAttr.id);
			}
		});

		oAsync.forEachOf(aH2IdList, (oVal, nIndex, _oCallback) => {
			const sTitle = $(`#${aH2IdList[nIndex]}`).html();
			const sHref = `${sBaseUrl}/${sApiType}/#${aH2IdList[nIndex]}`;
			let sContents = '';

			const oContents = $(`#${aH2IdList[nIndex]}`).nextUntil(`#${aH2IdList[nIndex + 1]}`);
			sContents = oHe.decode(oContents.text());
			sContents = sContents.replace(/\s+/g, ' ').trim();

			oRedis.hset(REDIS_KEY, `${sApiType}-${nIndex}`, JSON.stringify({
				id: `${sApiType}-${nIndex}`, title: sTitle,
				href: sHref, contents: sContents
			}), (_oError) => {
				_oCallback(_oError);

				// TODO 삭제 (확인용)
				if (!_oError) {
					oResults.push({
						id: `${sApiType}-${nIndex}`, title: sTitle,
						href: sHref, contents: sContents
					});
				}
			});
		}, (oError) => {
			if (oError) {
				console.log(`redis hset error: ${oError}`);
			}

			oCallback(null);
		});
	});
};

oAsync.parallel([
	// redis clear
	(oCallback) => {
		oRedis.del(REDIS_KEY, (oError) => {
			oCallback(oError);
		});
	},
	// api
	(oCallback) => {
		const oApiCrawlInfo = oCrawlingList.api;

		oAsync.each(oApiCrawlInfo.typeList, (sApiType, _oCallback) => {
			oCrawlApiDoc(oApiCrawlInfo.baseUrl, sApiType, () => {
				_oCallback(null);
			});
		}, () => {
			oCallback(null);
		});
	},
	// TODO guide
	(oCallback) => {
		oCallback(null);
	}
], (oError) => {
	if (oError) {
		console.log(oError);
	}

	console.log('all done');

	// TODO 삭제 (확인용)
	console.log(oResults);

	process.exit(0);
});
