'use strict';

const oRequest = require('request');
const oCheerio = require('cheerio');
const oAsync = require('async');
const oHe = require('he');
const oLunr = require('lunr');
const oFs = require('fs');

const aResults = [];

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

		const aHTagIdList = [];

		$('h1, h2').each((nIndex, oVal) => {
			const oAttr = oVal.attribs || {};

			if (typeof oAttr.id === 'string' || oAttr.id instanceof String) {
				aHTagIdList.push(oAttr.id);
			}
		});

		oAsync.forEachOf(aHTagIdList, (oVal, nIndex, _oCallback) => {
			const sTitle = $(`#${aHTagIdList[nIndex]}`).html();
			const sHref = `${sBaseUrl}/${sApiType}/#${aHTagIdList[nIndex]}`;
			let sContents = '';

			const oContents = $(`#${aHTagIdList[nIndex]}`).nextUntil(`#${aHTagIdList[nIndex + 1]}`);
			sContents = oHe.decode(oContents.text());
			sContents = sContents.replace(/\s+/g, ' ').trim();

			aResults.push({
				id: `${sApiType}-${nIndex}`, title: sTitle,
				href: sHref, contents: sContents
			});

			_oCallback(null);
		}, (oError) => {
			if (oError) {
				console.log(`make results error: ${oError}`);
			}

			oCallback(null);
		});
	});
};

oAsync.parallel([
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
		process.exit(1);
	}

	const store = {};
	const index = oLunr(function () {
		this.pipeline.reset();
		this.ref('id');
		this.field('title');
		this.field('href');
		this.field('contents');

		aResults.forEach((oResult) => {
			oResult.contents = oResult.contents.replace(/\s+/g, ' ').trim();
			this.add({
				id: oResult.id,
				title: oResult.title,
				href: oResult.href,
				contents: oResult.contents
			});

			store[oResult.id] = {
				id: oResult.id,
				title: oResult.title,
				href: oResult.href,
				contents: oResult.contents
			};
		});
	});

	oFs.writeFileSync('../crawl-server/public/searchIndex.json', JSON.stringify({
		index: index.toJSON(), store: store
	}));

	console.log('all done');
	process.exit(0);
});

