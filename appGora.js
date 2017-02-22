/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require("express");

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require("cfenv");

// create a new express server
var app = express();

// --------------------
var bodyParser = require("body-parser");
var request = require("request");
var async = require("async");





/// nano ADD start
var nano = require('nano')('https://b70e7dcb-0e1e-4d2c-ae0a-644126271fa2-bluemix:61ec6bc0109eef5d422f5720a1f583fca558f046abdd171fc75de21f9c408a4b@b70e7dcb-0e1e-4d2c-ae0a-644126271fa2-bluemix.cloudant.com');

// clean up the database we created previousl
nano.db.destroy('prints', function() {
  // create a new database
  nano.db.create('prints', function() {
    // specify the database we are going to use
    var prints = nano.use('prints');
    // and insert a document in it
    prints.insert({ 'landscapes': [
    	{ 
    	  'id' : 1, 
    	  'title':  'Antarctica' ,
          'description': "Lauren's husband took this spectacular photo when they visited Antarctica in December of 2012. This is one of our hot sellers, so it rarely goes on sale."  ,
          'imgsrc': 'penguin.jpg' ,
           'price': 100 ,
            'quan':  6 },

     	{
     	  'id' : 2,
     	  'title':  'Alaska' ,
          'description': "Lauren loves this photo even though she wasn't present when the photo was taken. Her husband took this photo on a guy's weekend in Alaska."  ,
          'imgsrc': 'alaska.jpg' ,
           'price': 75 ,
            'quan':  1 },
    	{
    	  'id' : 3,
    	  'title':  'Australia' ,
          'description': "This photo is another one of Lauren's favorites! Her husband took these photos of the Sydney Opera House in 2011."  ,
          'imgsrc': 'sydney.jpg' ,
           'price': 100 ,
            'quan':  0 },
    	]}, 'inventory', function(err, body, header) {
      if (err) {
        console.log('Error creating document - ', err.message);
        return;
      }
      console.log('all records inserted.')
      console.log(body);
    });
  });
});
/// nano ADD end





app.use(bodyParser.urlencoded({
	extended: true
})); // JSON
app.use(bodyParser.json()); // JSON


app.post("/gora", function(req, res) {

	// 1.rakuten GORA
	async.waterfall([
			function(gora) {

				// 1-1.rakuten GORA API - URL
				// https://webservice.rakuten.co.jp/explorer/api/Gora/GoraGolfCourseSearch/
				var gora_url = "https://app.rakuten.co.jp/services/api/Gora/GoraGolfCourseSearch/20131113";


				// 1-2.rakuten GORA API - Request Parameter
				var json = req.body;
				var search_place = json.events[0].message.text;
				// 都道府県
				var search_place_array = search_place.split("\n");
				// 検索キーワード
				var gora_keyword = "";
				if (search_place_array.length === 2) {
					var keyword_array = search_place_array[1].split("、");
					gora_keyword = keyword_array.join();
				}

				var gora_query = {
					"format": "json",
					"areaCode": search_place_array[0],
					"keyword": gora_keyword,
					"formatVersion": "2",
					///                "hits": "1",
					"applicationId": "1085867087619845466" // @kazu535
				};
				/// DEBUG
				///console.log("DEBUG(I) -- Line1 areaCode                : " + search_place_array[0]);
				///console.log("DEBUG(I) -- Line2 keyword                 : " + gora_keyword);

				var gora_options = {
					url: gora_url,
					headers: {
						"Content-Type": "application/json; charset=UTF-8"
					},
					qs: gora_query,
					json: true
				};


				// 1-3.rakuten GORA API - Object
				var search_result = {};


				// 1-4.rakuten GORA API - Request
				/// DEBUG
				console.log("DEBUG(I) -- REQUEST for gora             : " + JSON.stringify(gora_options));

				request.get(gora_options, function(error, response, body) {
					/// DEBUG
					///console.log("DEBUG(O) -- REPLY from gora           : " + JSON.stringify(body));

					if (!error && response.statusCode === 200) {
						if ("error_description" in body) {
							console.log("Error@1-4   : rakuten GORA API - error_description in body");
							console.log(" statusCode : " + response.statusCode);
							console.log(" response   : " + JSON.stringify(response));
							return;
						}

						if ("count" in body) {
							// 検索数
							search_result["count"] = body.count;
							///console.log("DEBUG(O) -- search_result[count]         : " + search_result["count"]);

							// ヒット件数
							search_result["hits"] = body.hits;
							///console.log("DEBUG(O) -- search_result[hits]          : " + search_result["hits"]);

							// ゴルフ場ID
							search_result["golfCourseId"] = body.Items[0].golfCourseId;
							///console.log("DEBUG(O) -- search_result[golfCourseId]  : " + search_result["golfCourseId"]);

							// ゴルフ場名
							search_result["golfCourseName"] = body.Items[0].golfCourseName;
							///console.log("DEBUG(O) -- search_result[golfCourseName]: " + search_result["golfCourseName"]);
						}

						// 1-5-1.rakuten GORA detail API - URL
						// https://webservice.rakuten.co.jp/explorer/api/Gora/GoraGolfCourseDetail/
						var gora_detail_url = "https://app.rakuten.co.jp/services/api/Gora/GoraGolfCourseDetail/20140410";


						// 1-5-2.rakuten GORA detail API - Request Parameter
						var gora_detail_query = {
							"format": "json",
							"formatVersion": "2",
							"golfCourseId": search_result["golfCourseId"],
							///                "golfCourseId": "120035",
							"applicationId": "1085867087619845466" // @kazu535
						};

						var gora_detail_options = {
							url: gora_detail_url,
							headers: {
								"Content-Type": "application/json; charset=UTF-8"
							},
							qs: gora_detail_query,
							json: true
						};

						// 1-5-3.rakuten GORA detail API - Request
						///
						console.log("DEBUG(I) -- REQUEST for gora detail      : " + JSON.stringify(gora_detail_options));
						request.get(gora_detail_options, function(error, response, body) {
							/// DEBUG
							///console.log("DEBUG(O) -- REPLY from gora detail    : " + JSON.stringify(body));

							if (!error && response.statusCode === 200) {
								if ("error_description" in body) {
									console.log("Error@1-5-3 : rakuten GORA detail API - error_description in body");
									console.log(" statusCode : " + response.statusCode);
									console.log(" response   : " + JSON.stringify(response));
									return;
								}

								// 住所
								search_result["address"] = body.Item.address;
								// ホール数
								search_result["holeCount"] = body.Item.holeCount;
								// 距離
								search_result["courseDistance"] = body.Item.courseDistance;
								// 総合評価
								search_result["evaluation"] = body.Item.evaluation;
								// 距離が長い
								search_result["distance"] = body.Item.distance;
								// フェアウェイが広い
								search_result["fairway"] = body.Item.fairway;
								// 予約カレンダーURL
								search_result["reserveCalUrl"] = body.Item.reserveCalUrl;
								// 交通情報(地図)URL
								search_result["routeMapUrl"] = body.Item.routeMapUrl;

								gora(null, json, search_result);

							} else {
								console.log("Error@1-5-3 : rakuten GORA detail API - error");
								console.log(" statusCode : " + response.statusCode);
								console.log(" response   : " + JSON.stringify(response));
							}

						});

					} else {
						console.log("Error@1-4   : rakuten GORA API - error");
						console.log(" statusCode : " + response.statusCode);
						console.log(" response   : " + JSON.stringify(response));
					}
				});
			},
		],


		// 2.LINE BOT
		function(err, json, search_result) {
			if (err) {
				return;
			}

			// 2-1.LINE BOT - Response Parameter
			var headers = {
				"Content-Type": "application/json; charset=UTF-8",
			};

			var data = {
				replyToken: req.body.events[0].replyToken,
				messages: [
					//テキスト
					{
						type: "text",
						text: search_result["golfCourseName"] +
							"\n" + search_result["address"] +
							"\n\n◆距離： " + search_result["courseDistance"] +
							"\n◆評価： " + search_result["evaluation"] +
							"\n  Distance " + search_result["distance"] +
							"\n  Fairway   " + search_result["fairway"] +
							"\n◆予約：\n" + search_result["reserveCalUrl"] +
							"\n◆地図：\n" + search_result["routeMapUrl"]
					}
				]
			};

			var options = {
				method: "POST",
				uri: "https://api.line.me/v2/bot/message/reply",
				headers: headers,
				proxy: process.env.FIXIE_URL,
				body: data,
				auth: {
					//himekawa
					bearer: "eTHucFEaH/DE70uArA1jo81RAjUkI6twA9jmlsfjoZje/hobzKQr23VevFH53QtLN9gdnMgdKT3TW3lWX3oU6cIC/ez/g6kaIF1I0hV3Hxd1PAbgsWKncQF4IbjGNWJy7Qf/gq6hz83dQRicq6lbgAdB04t89/1O/w1cDnyilFU=" //himekawa
				},
				json: true
			};

			// 2-2.LINE BOT - Response
			request(options, function(err, res, body) {
				console.log("DEBUG(O) -- RESPONSE                     : " + JSON.stringify(res));

				// 403の場合、LINEのServer IP Whitelistへの追加が必要
				if (res.statusCode === 403) {
					console.log("DEBUG(O) -- add Server IP Whitelist      : " + res.body.message);
				}

			});

			res.send("OK");

		});
});


app.use(express.static(__dirname + "/public"));


var appEnv = cfenv.getAppEnv();

app.listen(appEnv.port, "0.0.0.0", function() {
	console.log("server starting on " + appEnv.url);
});