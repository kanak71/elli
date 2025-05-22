//js 파일 * yes,no 버튼 수정본
//전역변수로 지정해 놔야 map에 다른 marker, line이 사용 가능하다.
let map;
let marker;
let line;
let tdata;
let markerArr = [];
let nowX, nowY;

//현재위치 얻어오기
function getGeo(){
    navigator.geolocation.getCurrentPosition(function(pos) {
    console.log(pos);
    nowX = pos.coords.latitude;
    nowY = pos.coords.longitude;
    });
    map.setCenter(new Tmapv3.LatLng(nowX,nowY));

    makeMarker(new Tmapv3.LatLng(nowX,nowY),"start","현재 위치");
    startPoint = [nowX,nowY];

}

//vector Map 생성
function tMapMake(){
    //임시 시작자표
    nowX = 35.13932536; 
    nowY = 129.09792776;

    map = new Tmapv3.Map("mapLoc",
    {
        center: new Tmapv3.LatLng(nowX, nowY),
        width:"700px",
        height:"400px",
        zoom:16,
        scaleBar:true
        
    });
    map.on("Click",function(event){
        if(winList.length>0){
            winList[0].setMap(null);
            winList = [];
        }

    });
}




//마커 저장 구조체
let markerList = {
    start : [],
    end : []
}

//마커 생성 함수
function makeMarker(LatLng, type, name){
    let img;
    switch(type){
        case "start":
            img = "https://tmapapi.tmapmobility.com/upload/tmap/marker/pin_b_m_s.png";
            break;
        case "end":
            img = "https://tmapapi.tmapmobility.com/upload/tmap/marker/pin_r_m_e.png";
            break;
    }
    let marker = new Tmapv3.Marker({
        position:LatLng,
        map:map,
        icon : img,
        // label:name
    })
    //마커 클릭 시 이벤트 삽입
    marker.on("Click",function(evt){
        makeWin(marker.getPosition(),type, name);

        let makerName = markerList[type].find(list => list.marker === marker)?.name;
        
        //나타내기, 변수에 위치정보 저장하기
              
    });
    

    markerList[type].push({marker:marker, name : name});


}

//라인 저장 배열
lineList = [];

//선 그리기
function makeLine(array,color="#FF0000"){
    lineList.push(new Tmapv3.Polyline({
        path:array,
        strokeColor:color,
        strokeWeight:8,
        direction : true,
        map:map
    }));
}

//키워드로 위치 찾기
function search(event, inputBox){
    if(window.event.keyCode!=13) return;

    //이미 경로 검색했으면 선 지우기
    if(lineList.length>0){
        lineList.forEach(item=>{
            item.setMap(null);
        })
        lineList = [];
    }
    
    let text = inputBox.value;
    let type = inputBox.id;
    console.log(text);

    let mapCenter = map.getCenter();

    var optionObj = {
        reqCoordType:"WGS84GEO", //요청 좌표계 형식
        resCoordType:"WGS84GEO",  //응답 좌표계 형식

        centerLon:mapCenter.lng(),  //POI검색시의 중앙좌표
        centerLat:mapCenter.lat(),  //POI검색시의 중앙좌표
        count : 6
    };
    var params = {
        onComplete:(res)=>{
            // console.log("onComplite");
            console.log("위치 검색 : "+res);
            onSearchComplete(res,type);
            
        },
        onProgress:()=>{
            //여기에 로딩창 보여주는 부분을 끼워 넣을 수도?
            // console.log("onProgress");
        },
        onError:()=>{
            console.log("onError");
        }
    };
    var tData = new Tmapv3.extension.TData();
    tData.getPOIDataFromSearchJson(encodeURIComponent(text),optionObj,params);

    
}
//키워드 검색 완료시 호출되는 함수
function onSearchComplete(res,type){
    let poi = res._responseData.searchPoiInfo.pois.poi;
    //마커 타입 이상할 시 오류  
    if(!markerList[type]){
        console.log("marker Type Error");
        return 1;
    }
    else{
        //이미 마커가 존재하면 기존 타입의 마커 전부 지우기
        if(markerList[type].length!=0){
            for(let i=0;i<markerList[type].length;i++){
                markerList[type][i].marker.setMap(null);
            }
            markerList[type] = [];
        }
    }
    //마커 생성
    for(let i = 0;i<poi.length;i++){
        makeMarker(new Tmapv3.LatLng(poi[i].noorLat,poi[i].noorLon),
        type,poi[i].name);
    }
    console.log("markerList : "+markerList);
    //마커위치로 지도 포커스 맞추는 기능
    //임시로 0번 인덱스를 중심으로 맞추도록 지정 
    //이건 어케해야하는지 감도 안잡힌다
    map.setCenter(new Tmapv3.LatLng(poi[0].noorLat,poi[0].noorLon));
    map.setZoom(14);

}



//fetch 사용, 경로안내 api 받아오기-------------------------- 

let startPoint = [];
let endPoint = [];

async function getData() {
    // 로딩 화면 표시
    document.getElementById('loading-overlay').style.display = 'flex';

    try {
        const res = await fetch("https://apis.openapi.sk.com/transit/routes", {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                appKey: 'h1O5fL07Hj7MBUnmtKjF5azPoDWeLeAW9prwnT6B'
            },
            body: JSON.stringify({
                startX: startPoint[1],
                startY: startPoint[0],
                endX: endPoint[1],
                endY: endPoint[0],
                format: "json",
                count: 1
            })
        });

        const data = await res.json();
        
        console.log("경로 표시:", data);
        
        let itinerary = data.metaData.plan.itineraries[0];
        let legs = itinerary.legs;
        let totalTime = itinerary.totalTime;  // ✅ 총 소요시간 추출

        if (lineList.length > 0) {
            for (let i = 0; i < lineList.length; i++) {
                lineList[i].setMap(null);
                transportInfoHtml = ``;
            }
            lineList = [];
        }

        map.setCenter(new Tmapv3.LatLng(startPoint[0], startPoint[1]));

        let lastPoint = new Tmapv3.LatLng(startPoint[0], startPoint[1]);
        
        for (let i = 0; i < legs.length; i++) {
            let arr = [];
            arr.push(lastPoint);
            if (legs[i].mode === "WALK" && legs[i].steps) {
                for (let step of legs[i].steps) {
                    step.linestring.split(" ").forEach((item, index) => {
                        let tempStr = item.split(",");
                        arr.push(new Tmapv3.LatLng(tempStr[1], tempStr[0]));
                    });
                }
            } else {
                legs[i].passShape.linestring.split(" ").forEach((item, index) => {
                    let tempStr = item.split(",");
                    arr.push(new Tmapv3.LatLng(tempStr[1], tempStr[0]));
                });
            }

            let r = (i * 40) % 256;  
            let g = (i * 70) % 256;  
            let b = (i * 100) % 256; 

            let color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

            lastPoint = arr[arr.length - 1];
            makeLine(arr, color);
        }

        drawPublicTransportRoute(legs, totalTime);

    } catch (err) {
        alert("📌출발지와 도착지를 선택해주세요📌");
    } finally {
        // 로딩 화면 숨기기
        document.getElementById('loading-overlay').style.display = 'none';
    }
}


// 대중교통 경로 그리기 (지도 오른쪽에 정보 표시)
// 경로 정보 패널 출력
function drawPublicTransportRoute(legs, totalTime) {
    let currentTime = new Date();
    let arrivalTime = new Date(currentTime.getTime() + totalTime * 1000); // ✅ 초 단위로 변환
    let arrivalTimeStr = `${arrivalTime.getHours()}시 ${arrivalTime.getMinutes()}분`;

    let durationHour = Math.floor(totalTime / 3600);
    let durationMinutes = Math.floor(totalTime / 60);

    let transportInfoHtml = `<div style="background: #FFFFFF; padding: 15px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0,0,0,0.2);">
                                <h3 style="margin: 0 0 10px 0;">🚀 경로 정보</h3>
                                <p><strong>⏳ 도착 예정:</strong> ${arrivalTimeStr}</p>
                                <p><strong>⏱️ 총 소요 시간:</strong> ${durationHour}시간 ${durationMinutes}분</p>
                                <hr>`;

    legs.forEach(leg => {
        let icon;
        switch (leg.mode) {
            case "BUS": icon = "🚌"; break;
            case "SUBWAY": icon = "🚇"; break;
            case "WALK": icon = "🚶"; break;
            default: icon = "❓"; break;
        }

        transportInfoHtml += `<p>${icon} <strong>${leg.route ? leg.route : "도보"}</strong></p>
                              <p style="color: gray;">(${leg.start.name} → ${leg.end.name})</p>`;
    });

    transportInfoHtml += `</div>`;
    document.getElementById("sidePanel3").innerHTML = transportInfoHtml;
}

//정보창 저장
winList = [];


//정보창 만들기
function makeWin(latlng,type, name){

    //yes or no 버튼
    let content = `
    <div class="bubble">
      <strong>${name}</strong>을 <strong>${type === 'start' ? '출발지' : '도착지'}</strong>로 설정할까요?
  
      <div class="bubble-yes" onclick="winYes(${latlng.lat()}, ${latlng.lng()}, '${type}', '${name}')">
        💖 Yes
      </div>
  
      <div class="bubble-no" onclick="winNo('${name}')">
        ❌ No
      </div>
    </div> `;
  
    if(winList.length>0){
        winList[0].setMap(null);
        winList = [];
    }

    winList.push(new Tmapv3.InfoWindow({
    position : latlng,
    //임시로 사용 
    content : content,
    type : 2,
    map : map
    }));
}


//yes 혹은 no 선택 시 호출되는 함수
function winYes(lat,lng,type,name){
    markerList[type].forEach((item)=>{
        item.marker.setMap(null);
    });
    markerList[type] = [];

    console.log(name+" 선택됨");
    
    let showInfo;
    switch(type){
        case "start":
            marker = new Tmapv3.Marker({
                position : new Tmapv3.LatLng(lat, lng),
                icon : "https://tmapapi.tmapmobility.com/upload/tmap/marker/pin_b_b_s.png",
                map : map,
        
            });
            markerList[type].push({marker : marker,name : name});

            showInfo = document.getElementById("sidePanel1");
            startPoint[0] = lat;
            // 출발지 또는 도착지 입력창에 이름 넣기
            document.getElementById(type).value = name;

            startPoint[1] = lng;
            break;
        case "end":
            marker = new Tmapv3.Marker({
                position : new Tmapv3.LatLng(lat, lng),
                icon : "https://tmapapi.tmapmobility.com/upload/tmap/marker/pin_r_b_e.png",
                map : map,
        
            })
            markerList[type].push({marker : marker,name : name});
        
            showInfo = document.getElementById("sidePanel2");
            endPoint[0] = lat;
            document.getElementById(type).value = name;
            endPoint[1] = lng;
            break;

    }

    //출발지 이름 표시 부분
    // showInfo.innerText = lat+",  "+lng+"\n"+name;
        
    winList[0].setMap(null);
    winList = [];
}
function winNo(name){
    console.log(name+" 지점 선택 취소");
    winList[0].setMap(null);
    winList = [];

}