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

// ----------ここから----------
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
var request = require('request');

var async = require('async');

app.post('/callback', function(req, res){

    async.waterfall([
        // ぐるなびAPI
        function(callback) {

            var json = req.body;

            // 受信テキスト
            var search_place = json['result'][0]['content']['text'];
            var search_place_array = search_place.split("\n");

            //検索キーワード
            var gnavi_keyword = "";
            if(search_place_array.length == 2){
                var keyword_array = search_place_array[1].split("、");
                gnavi_keyword = keyword_array.join();
            }

            // ぐるなびAPI レストラン検索API http://api.gnavi.co.jp/api/tools/
            var gnavi_url = 'https://api.gnavi.co.jp/RestSearchAPI/20150630/';

            // ぐるなび リクエストパラメータの設定
            var gnavi_query = {
                "keyid":"35492d64fa5b3a5e84c63f7167a9aea2",	//<ぐるなびのアクセスキー>
                "format": "json",
                "address": search_place_array[0],
                "hit_per_page": 1,
                "freeword": gnavi_keyword,
                "freeword_condition": 2
            };
            var gnavi_options = {
                url: gnavi_url,
                headers : {'Content-Type' : 'application/json; charset=UTF-8'},
                qs: gnavi_query,
                json: true
            };

            // 検索結果をオブジェクト化
            var search_result = {};

            request.get(gnavi_options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    if('error' in body){
                        console.log("検索エラー" + JSON.stringify(body));
                        return;
                    }

                    // 店名
                    if('name' in body.rest){
                        search_result['name'] = body.rest.name;
                    }
                    // 画像
                    if('image_url' in body.rest){
                        search_result['shop_image1'] = body.rest.image_url.shop_image1;
                    }
                    // 住所
                    if('address' in body.rest){
                        search_result['address'] = body.rest.address;
                    }
                    // 緯度
                    if('latitude' in body.rest){
                        search_result['latitude'] = body.rest.latitude;
                    }
                    // 軽度
                    if('longitude' in body.rest){
                        search_result['longitude'] = body.rest.longitude;
                    }
                    // 営業時間
                    if('opentime' in body.rest){
                        search_result['opentime'] = body.rest.opentime;
                    }

                    callback(null, json, search_result);

                } else {
                    console.log('error: '+ response.statusCode);
                }
            });

        },
    ],


    // LINE BOT
    function(err, json, search_result) {
        if(err){
            return;
        }

        //ヘッダーを定義
        var headers = {
            'Content-Type' : 'application/json; charset=UTF-8',
            'X-Line-ChannelID' : '1501662864',
//            'X-Line-ChannelSecret' : '',
//            'X-Line-Trusted-User-With-ACL' : '<Your MID>'
        };

        // 送信相手の設定（配列）
        var to_array = [];
        to_array.push(json['result'][0]['content']['from']);


        // 送信データ作成
        var data = {
            'to': to_array,
            'toChannel': 1501662864, //固定
//            'eventType':'140177271400161403', //固定
            "content": {
                "messageNotified": 0,
                "messages": [
                    // テキスト
                    {
                        "contentType": 1,
                        "text": 'こちらはいかがですか？\n【お店】' + search_result['name'] + '\n【営業時間】' + search_result['opentime'],
                    },
                    // 画像
                    {
                        "contentType": 2,
                        "originalContentUrl": search_result['shop_image1'],
                        "previewImageUrl": search_result['shop_image1']
                    },
                    // 位置情報
                    {
                        "contentType":7,
                        "text": search_result['name'],
                        "location":{
                            "title": search_result['address'],
                            "latitude": Number(search_result['latitude']),
                            "longitude": Number(search_result['longitude'])
                        }
                    }
                ]
            }
        };

        //オプションを定義
        var options = {
          method: 'POST',
          uri: 'https://api.line.me/v2/bot/message/reply',
          auth: {
              bearer: 'eTHucFEaH/DE70uArA1jo81RAjUkI6twA9jmlsfjoZje/hobzKQr23VevFH53QtLN9gdnMgdKT3TW3lWX3oU6cIC/ez/g6kaIF1I0hV3Hxd1PAbgsWKncQF4IbjGNWJy7Qf/gq6hz83dQRicq6lbgAdB04t89/1O/w1cDnyilFU='
          },
          json: true,

          headers: headers,	//TRIAL
          proxy : process.env.FIXIE_URL,	//TRIAL
          body: data	//TRIAL

//          body: {
//            replyToken: req.body.events[0].replyToken,
//            messages: [{
//              type: "text",
//              text: req.body.events[0].message.text,
//            }]
//          },

        };
  
        request(options, function(err, res, body) {
          console.log(JSON.stringify(res));
        });
        
        res.send('OK');
        
      });
    });

// --------ここまで追加--------

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
