var map, markerGroup;
var sparql = ""

$(document).ready(function() {
  initMap();
  sparql = `PREFIX prop: <http://data.lodosaka.jp/hanabi-data-kanto.csv/property/>

    SELECT DISTINCT ?name ?lat ?lng ?place ?month ?scale
    WHERE 
    {
      ?s prop:名前 ?name;
          prop:緯度 ?lat;
          prop:経度 ?lng;
          prop:開催日 ?month;
          prop:場所 ?place;
          prop:総打上数 ?scale.
    }`

  // 最初はすべて表示
  d3sparql.query("http://localhost:3030/hanabi_data/query", sparql, render);    


  // 全選択・全解除の実装
  $('input[name="allcheck1"]').change(function() {
    if($(this).is(':checked')) $('input[name="month"]').prop('checked', true);
    else $('input[name="month"]').prop('checked', false);
  })

  $('input[name="allcheck2"]').change(function() {
    if($(this).is(':checked')) $('input[name="place"]').prop('checked', true);
    else $('input[name="place"]').prop('checked', false);
  })

  $('input[name="allcheck3"]').change(function() {
    if($(this).is(':checked')) $('input[name="scale"]').prop('checked', true);
    else $('input[name="scale"]').prop('checked', false);
  })

  // チェックボックスに応じた検索
  $('input').change(function() {
    var monval = [];
    var plval = [];

    // チェックされたものをmonvalに格納
    $('input[name="month"]:checked').each(function() {
      monval.push($(this).val());
    })
    
    // チェックされたものをplvalに格納
    $('input[name="place"]:checked').each(function() {
      plval.push($(this).val());
    })

    sparql = `PREFIX prop: <http://data.lodosaka.jp/hanabi-data-kanto.csv/property/>

    SELECT DISTINCT ?name ?lat ?lng ?place ?month ?scale
    WHERE 
    {
      ?s prop:名前 ?name;
          prop:緯度 ?lat;
          prop:経度 ?lng;
          prop:開催日 ?month;
          prop:場所 ?place;
          prop:総打上数 ?scale.
          `
    // 何もチェックされなかったら何にもヒットしないような条件を追加
    if (monval.length == 0) sparql += `?s prop:名前 "".`;
    for (var i = 0; i < monval.length; i++) {
      sparql += `{ ?s prop:開催日 ?month. FILTER REGEX (?month, "${monval[i]}"). }`;
      if (i != monval.length - 1) sparql += ` UNION `;  // 最後以外はUNIONでつなぐ
    }
    sparql += `\n`;

    if (plval.length == 0) sparql += `?s prop:名前 "".`;
    for (var i = 0; i < plval.length; i++) {
      sparql += `{ ?s prop:場所 ?place. FILTER REGEX (?place, "${plval[i]}"). }`;
      if (i != plval.length - 1) sparql += ` UNION `; 
    }
    sparql += `\n}`;

    //console.log(sparql);

    d3sparql.query("http://localhost:3030/hanabi_data/query", sparql, render);
  })
});


// Mapへのマーカー描画
var markerGroup = L.layerGroup().addTo(map);  // マッピングしたマーカーを記憶
function render(json) {
  var count = 0;
  markerGroup.clearLayers();  // マーカーの全削除
  filter(json);
  $.each(json["results"]["bindings"], function(key, value) {
    var name = value["name"]["value"];
    var lat = value["lat"]["value"];
    var lng = value["lng"]["value"];
    var place = value["place"]["value"];
    var month = value["month"]["value"];
    var scale = value["scale"]["value"];    
    
    
    
    var marker = L.marker([+lat, +lng]).addTo(markerGroup);
    marker.bindPopup(`<h3>${name}</h3><br> 打上日：${month} <br> 場所：${place} <br> 打上数：${scale}発`);
    count++;  // ヒット件数をカウント
  });
  console.log(json.results.bindings);
  $('#hit').html('<h3>' + count + '件</h3>'); // ヒット件数を表示
}

// 規模で絞る(sparqlでinteger型が利用できなかったためjqueryで実装)
function filter(json) {
  var scval = [];
  $('input[name="scale"]:not(:checked)').each(function() {
    scval.push($(this).val());
  })

  if (scval.length == 4) {
    var nll = $.grep(json.results.bindings, function (elem, index) {
      return false;
    });
    json.results.bindings = nll;
  }
  for (var i = 0; i < scval.length; i++) {
    if (scval[i] == "0") {
      var zero = $.grep(json.results.bindings, function (elem, index) {
        return (elem.scale.value >= 5000);
      });
      json.results.bindings = zero;
    }
    if (scval[i] == "1") {
      var one = $.grep(json.results.bindings, function (elem, index) {
        return (elem.scale.value < 5000 || elem.scale.value >= 10000);
      });
      json.results.bindings = one;
    }
    if (scval[i] == "2") {
      var two = $.grep(json.results.bindings, function (elem, index) {
        return (elem.scale.value < 10000 || elem.scale.value >= 20000);
      });
      json.results.bindings = two;
    }
    if (scval[i] == "3") {
      var thr = $.grep(json.results.bindings, function (elem, index) {
        return (elem.scale.value < 20000);
      });
      json.results.bindings = thr;
    }
  }
}

// Mapの初期化
function initMap() {
  map = L.map('gmap').setView([36.105, 139.751], 8);
  markerGroup = L.layerGroup().addTo(map);
  // 地理院地図レイヤー追加
  L.tileLayer(
    // 地理院地図利用
    'http://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
    {
      attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
    }
  ).addTo(map);
}
