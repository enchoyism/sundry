var lunr = require('lunr');

var idx = lunr(function () {
	this.ref('id');
	this.field('title');
	this.field('contents');

	this.add({
	    "id": "admin-76",
	    "title": "Create a Products tag",
	    "contents": "Definition POST 'https://{mallid}.cafe24api.com/api/v2/admin/products/{#id}/tags' Request example: curl -X POST \\ 'https://{mallid}.cafe24api.com/api/v2/admin/products/7/tags' \\ -H 'Authorization: Bearer {access_token}' \\ -H 'Content-Type: application/json' \\ -d '{ \"request\": { \"tag\": [ \"Tag1\", \"Tag2\" ] } }' Response example: { \"tag\": { \"shop_no\": 1, \"product_no\": 7, \"tag\": [ \"Tag1\", \"Tag2\" ] } } 기본스펙 Property Description SCOPE 상품 쓰기권한 (WRITE_PRODUCT) 호출건수 제한 10 요청사양 Parameter Description shop_no 멀티쇼핑몰 번호 shop_no 멀티쇼핑몰 번호 product_no Required 상품 번호 tag 상품 태그"
	});
});

console.log(JSON.stringify(idx.search('title:*cafe24* contents:*cafe24*')));
