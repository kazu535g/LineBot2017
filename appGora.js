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
var request = require('request');
var async = require('async');

///app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.urlencoded({extended: true}));  // JSONの送信を許可
app.use(bodyParser.json());                        // JSONのパースを楽に（受信時）

// LINE developersのWebhook URL設定と同値
app.post('/gora', function(req, res){

    async.waterfall([
        // 楽天GORA API
        // https://webservice.rakuten.co.jp/explorer/api/Gora/GoraGolfCourseSearch/
        function(gora) {

            var json = req.body;

            // 受信テキスト
            var arg = json.events[0].message.text;
            var search_place_array = arg.split("\n");

            //検索キーワード
///            var gnavi_keyword = "";
///            if(search_place_array.length == 2){
///                var keyword_array = search_place_array[1].split("、");
///                gnavi_keyword = keyword_array.join();
///            }

            // 楽天GORA API https://webservice.rakuten.co.jp/explorer/api/Gora/GoraGolfCourseSearch/
            var gora_url = 'https://app.rakuten.co.jp/services/api/Gora/GoraGolfCourseSearch/20131113';

            // 楽天GORA リクエストパラメータの設定
            var gora_query = {
                "format": "json",
///                "keyword": search_place_array[0],
                "keyword": "golf",
                "applicationId":"1085867087619845466"	//<楽天GORAのアプリID>
            };

            var gora_options = {
                url: gora_url,
                headers : {'Content-Type' : 'application/json; charset=UTF-8'},
                qs: gora_query,
                json: true
            };

            // 検索結果をオブジェクト化
            var search_result = {};

            request.get(gora_options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    if('error' in body){
                        console.log("検索エラー" + JSON.stringify(body));
                        return;
                    }

                    // ゴルフ場名
///                    if('golfCourseName' in body.rest){
                        search_result['golfCourseName'] = body.rest.golfCourseName;
///                    }

                    gora(null, json, search_result);

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

        //ヘッダー定義
        var headers = {
            'Content-Type' : 'application/json; charset=UTF-8',
        };

        // 送信データ作成
        var data = {
　　　　　      replyToken: req.body.events[0].replyToken,

            messages: [

/*　TEST
                    // type:
                    // Must be one of the following values: [text, image, video, audio, location, sticker, template, imagemap]
                    // REference: https://devdocs.line.me/ja/#webhook-event-object
                    {
                    type: "text",
                    text: "TEST MESSAGE!"
                    },
*/

                    // テキスト
                    {
                        type: "text",
                        text: '◆ゴルフ場名：\n' + search_result['golfCourseName']
/*
                    },
                    // 画像
                    {
                        type: "image",
                        originalContentUrl: search_result['shop_image1'],
                        previewImageUrl: search_result['shop_image1']
                    },

                    // 位置情報
                    {
                        type: "location",
                        title: '◆地図：',
                        address: search_result['address'],
                        latitude: Number(search_result['latitude']),
                        longitude: Number(search_result['longitude'])
*/
                    }
            ]
        };

        //オプションを定義
        var options = {
          method: 'POST',
          uri: 'https://api.line.me/v2/bot/message/reply',
          headers: headers,
          proxy : process.env.FIXIE_URL,
          body: data,
          auth: {
    　　　　　　　//himekawa
            bearer: 'eTHucFEaH/DE70uArA1jo81RAjUkI6twA9jmlsfjoZje/hobzKQr23VevFH53QtLN9gdnMgdKT3TW3lWX3oU6cIC/ez/g6kaIF1I0hV3Hxd1PAbgsWKncQF4IbjGNWJy7Qf/gq6hz83dQRicq6lbgAdB04t89/1O/w1cDnyilFU=' //himekawa
    　　　　　　　//himekawa_trial
            //bearer: 'kot0ml/nHkq0mplbcLKa5NIl0gi58FGRdQw/u9sL8ZBUtM1QztJyo+MD131tkUgnal6ThOWsRwLssL2oL1f69iWbYdNsHZf3ZJT3VuqafwRpf6Z5/S5oKU0bIe+OqhdIPn/CwHdAMZIwyp65j0Km4gdB04t89/1O/w1cDnyilFU=' //himekawa_trial
          },
          json: true
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
