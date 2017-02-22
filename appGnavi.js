/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// --------------------
var bodyParser = require('body-parser');
var request = require('request');
var async = require('async');

///app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.urlencoded({
	extended: true
})); // JSON
app.use(bodyParser.json()); // JSON

// LINE developersWebhook URL
app.post('/gnavi', function(req, res) {

	async.waterfall([
			// ぐるなびAPI
			function(gnavi) {

				var json = req.body;

				// 受信テキスト
				var search_place = json.events[0].message.text;
				var search_place_array = search_place.split("\n");

				//検索キーワード
				var gnavi_keyword = "";
				if (search_place_array.length == 2) {
					var keyword_array = search_place_array[1].split("、");
					gnavi_keyword = keyword_array.join();
				}

				// ぐるなびAPI レストラン検索API
				var gnavi_url = 'http://api.gnavi.co.jp/RestSearchAPI/20150630/';
				// ぐるなび リクエストパラメータの設定
				var gnavi_query = {
					"keyid": "83975583b82248b328ea8cd4480932f3", //Access Key @kazu535gn
					"format": "json",
					"hit_per_page": 1,
					"freeword_condition": 2,
					"address": search_place_array[0],
					"freeword": gnavi_keyword
				};
				var gnavi_options = {
					url: gnavi_url,
					headers: {
						'Content-Type': 'application/json; charset=UTF-8'
					},
					qs: gnavi_query,
					json: true
				};

				/// DEBUG
				console.log("DEBUG -- gnavi_options    : " + JSON.stringify(gnavi_options));

				// 検索結果をオブジェクト化
				var search_result = {};

				request.get(gnavi_options, function(error, response, body) {
					/// DEBUG
					console.log("DEBUG -- body             : " + JSON.stringify(body));

					if (!error && response.statusCode == 200) {
						if ('error' in body) {
							console.log("" + JSON.stringify(body));
							return;
						}

						//店名
						if ('name' in body.rest) {
							search_result['name'] = body.rest.name;
						}
						//予算
						if ('budget' in body.rest) {
							search_result['budget'] = body.rest.budget;
						}
						//電話番号
						if ('tel' in body.rest) {
							search_result['tel'] = body.rest.tel;
						}
						//営業時間
						if ('opentime' in body.rest) {
							search_result['opentime'] = body.rest.opentime;
						}
						//住所
						if ('address' in body.rest) {
							search_result['address'] = body.rest.address;
						}
						//URL
						if ('url' in body.rest) {
							search_result['url'] = body.rest.url;
						}
						//画像
						if ('image_url' in body.rest) {
							search_result['shop_image1'] = body.rest.image_url.shop_image1;
						}

						//緯度	
						if ('latitude' in body.rest) {
							search_result['latitude'] = body.rest.latitude;
						}
						//経度
						if ('longitude' in body.rest) {
							search_result['longitude'] = body.rest.longitude;
						}
						/// DEBUG
						/// console.log("DEBUG -- search_result[name]: " + search_result["name"]);

						gnavi(null, json, search_result);

					} else {
						console.log('error: ' + response.statusCode);
					}
				});
			},
		],


		// LINE BOT
		function(err, json, search_result) {
			if (err) {
				return;
			}

			//ヘッダーを定義
			var headers = {
				'Content-Type': 'application/json; charset=UTF-8',
				///            'X-Line-ChannelID' : '1501556388',
				///            'X-Line-ChannelSecret' : '',
				///            'X-Line-Trusted-User-With-ACL' : '<Your MID>'
			};

			// 送信データ作成
			var data = {
				replyToken: req.body.events[0].replyToken,
				messages: [

					/* TEST
					                    // REference: https://devdocs.line.me/ja/#webhook-event-object
					                    {
					                    type: "text",
					                    text: "TEST MESSAGE!"
					                    },
					*/

					//テキスト
					{
						type: "text",
						text: '◆店名：\n' + search_result['name'] + '\n◆予算：\n' + search_result['budget'] + '\n◆営業時間：\n' + search_result['opentime'] + '\n◆電話番号：\n' + search_result['tel'] + '\n◆住所：\n' + search_result['address'] + '\n◆URL：\n' + search_result['url'],
					},

					//画像
					{
						type: "image",
						originalContentUrl: search_result['shop_image1'],
						previewImageUrl: search_result['shop_image1']
					},

					//位置情報
					{
						type: "location",
						title: '◆地図：',
						address: search_result['address'],
						latitude: Number(search_result['latitude']),
						longitude: Number(search_result['longitude'])
					}
				]
			};

			//オプションを定義
			var options = {
				method: 'POST',
				uri: 'https://api.line.me/v2/bot/message/reply',
				headers: headers,
				proxy: process.env.FIXIE_URL,
				body: data,
				auth: {
					//himekawa
					bearer: 'eTHucFEaH/DE70uArA1jo81RAjUkI6twA9jmlsfjoZje/hobzKQr23VevFH53QtLN9gdnMgdKT3TW3lWX3oU6cIC/ez/g6kaIF1I0hV3Hxd1PAbgsWKncQF4IbjGNWJy7Qf/gq6hz83dQRicq6lbgAdB04t89/1O/w1cDnyilFU=' //himekawa
				},
				json: true
			};

			request(options, function(err, res, body) {
				console.log("RESPONSE: " + JSON.stringify(res));
			});

			res.send('OK');

		});
});

// ----------------

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));


// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
	// print a message when the server starts listening
	console.log("server starting on " + appEnv.url);
});