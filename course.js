/* ============================================================
   POKERUN MAIN LOGIC (FINAL v6)
   - 10% Accuracy Loop (Retry Logic)
   - Loading Spinner Fix (Always hide on finish)
   - UI Overlap Fix
   ============================================================ */

const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';
// ORS 키 (제공해주신 키 사용 - 403 발생 시 할당량 확인 필요)
const KEY_ORS = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk3NTU2OTk1ODQ1NjQ0YWE5NzA3ZTM1OWExMGE3NTU4IiwiaCI6Im11cm11cjY0In0=';

const ALL_LANDMARKS = [];
if (typeof STATIONS_DATA !== 'undefined') ALL_LANDMARKS.push(...STATIONS_DATA);
if (typeof CAMPUS_DATA !== 'undefined') ALL_LANDMARKS.push(...CAMPUS_DATA);

let map, polylineLayer;
let startMarker, endMarker;
let userLoc = { lat: 37.5665, lng: 126.9780 };
let startPoint = null;
let endPoint = null;
let routeCoords = [];
let rotationCount = 0;

// 로딩 요소
const loadingOverlay = document.getElementById('loadingOverlay');

window.onload = function() {
    initMap();
    getUserLocation();
};

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([userLoc.lat, userLoc.lng], 14);
    L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${KEY_VWORLD}/Base/{z}/{y}/{x}.png`, {
        maxZoom: 19, attribution: 'V-WORLD'
    }).addTo(map);
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            map.setView([userLoc.lat, userLoc.lng], 15);
        }, err => console.log(err));
    }
}

// [초기화 버튼]
document.getElementById('resetBtn').addEventListener('click', () => {
    startPoint = null; endPoint = null; routeCoords = [];
    document.getElementById('startInput').value = '';
    document.getElementById('endInput').value = '';
    document.getElementById('goalDistInput').value = '3';
    document.getElementById('startDistBadge').style.display = 'none';
    document.getElementById('endDistBadge').style.display = 'none';
    document.getElementById('searchDistDisplay').innerText = '0.00 km';
    document.getElementById('actualDistDisplay').innerText = '0.00 km';
    
    if(polylineLayer) map.removeLayer(polylineLayer);
    if(startMarker) map.removeLayer(startMarker);
    if(endMarker) map.removeLayer(endMarker);
    startMarker = null; endMarker = null;
    map.setView([userLoc.lat, userLoc.lng], 15);
});

function setMapMarker(type, lat, lng, name) {
    const latLng = [lat, lng];
    if (type === 'start') {
        if (startMarker) map.removeLayer(startMarker);
        startMarker = L.marker(latLng).addTo(map).bindPopup(`<b>출발</b><br>${name}`).openPopup();
    } else if (type === 'end') {
        if (endMarker) map.removeLayer(endMarker);
        endMarker = L.marker(latLng).addTo(map).bindPopup(`<b>도착</b><br>${name}`).openPopup();
    }
}

// --- SEARCH ---
const ps = new kakao.maps.services.Places();
setupAutocomplete('startInput', 'startSuggestions', true);
setupAutocomplete('endInput', 'endSuggestions', false);

document.getElementById('myLocationBtn').addEventListener('click', () => {
    getUserLocation();
    document.getElementById('startInput').value = "내 위치 (GPS)";
    startPoint = { lat: userLoc.lat, lng: userLoc.lng, name: "내 위치" };
    document.getElementById('startDistBadge').style.display = 'none';
    setMapMarker('start', userLoc.lat, userLoc.lng, "내 위치");
});

function setupAutocomplete(inputId, listId, isStart) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    input.addEventListener('focus', () => showLandmarkRecommendations(list, isStart));
    input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length > 0) {
            ps.keywordSearch(val, (data, status) => {
                if (status === kakao.maps.services.Status.OK) renderSearchList(list, data, isStart);
            });
        } else showLandmarkRecommendations(list, isStart);
    });
    document.addEventListener('click', (e) => {
        if(e.target !== input && e.target !== list && !list.contains(e.target)) list.classList.remove('active');
    });
}

function showLandmarkRecommendations(listEl, isStart) {
    const candidates = ALL_LANDMARKS.map(lm => ({ ...lm, dist: calcDist(userLoc.lat, userLoc.lng, lm.lat, lm.lng) }));
    const filtered = candidates.filter(lm => lm.dist <= 30.0);
    filtered.sort((a, b) => {
        const aPri = a.dist <= 5.0 ? 0 : 1;
        const bPri = b.dist <= 5.0 ? 0 : 1;
        if(aPri !== bPri) return aPri - bPri;
        return a.dist - b.dist;
    });
    if(filtered.length > 0) renderLandmarkList(listEl, filtered, isStart);
    else listEl.classList.remove('active');
}

function renderLandmarkList(listEl, items, isStart) {
    listEl.innerHTML = ''; listEl.classList.add('active');
    items.forEach(item => {
        const isPriority = item.dist <= 5.0;
        const li = document.createElement('li'); li.className = 'suggestion-item';
        const tag = isPriority ? `<span class="landmark-tag">추천</span>` : ``;
        li.innerHTML = `<div><div class="sug-name">${tag}${item.name}</div><div class="sug-addr">${item.type==='station'?'지하철역':'캠퍼스'}</div></div><div class="sug-dist">${item.dist.toFixed(1)}km</div>`;
        li.onclick = () => selectPlace(item, isStart, listEl);
        listEl.appendChild(li);
    });
}

function renderSearchList(listEl, items, isStart) {
    listEl.innerHTML = ''; listEl.classList.add('active');
    items.forEach(item => {
        const lat = parseFloat(item.y), lng = parseFloat(item.x);
        const dist = calcDist(userLoc.lat, userLoc.lng, lat, lng);
        const li = document.createElement('li'); li.className = 'suggestion-item';
        li.innerHTML = `<div><div class="sug-name">${item.place_name}</div><div class="sug-addr">${item.address_name}</div></div><div class="sug-dist">${dist.toFixed(1)}km</div>`;
        li.onclick = () => selectPlace({name: item.place_name, lat: lat, lng: lng}, isStart, listEl);
        listEl.appendChild(li);
    });
}

function selectPlace(place, isStart, listEl) {
    const input = document.getElementById(isStart ? 'startInput' : 'endInput');
    const badge = document.getElementById(isStart ? 'startDistBadge' : 'endDistBadge');
    input.value = place.name;
    const dist = calcDist(userLoc.lat, userLoc.lng, place.lat, place.lng);
    badge.innerText = dist.toFixed(1) + 'km'; badge.style.display = 'block';
    listEl.classList.remove('active');
    if (isStart) { startPoint = place; setMapMarker('start', place.lat, place.lng, place.name); }
    else { endPoint = place; setMapMarker('end', place.lat, place.lng, place.name); }
    if(startPoint && endPoint) {
        const d = calcDist(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
        document.getElementById('searchDistDisplay').innerText = d.toFixed(2) + ' km';
    }
}

// --- COURSE GENERATION (IMPROVED LOOP) ---
document.getElementById('createCourseBtn').addEventListener('click', async () => {
    // 1. 출발지 체크
    if(!startPoint) {
        startPoint = { ...userLoc, name: "내 위치" };
        setMapMarker('start', userLoc.lat, userLoc.lng, "내 위치");
    }

    let goalKm = parseFloat(document.getElementById('goalDistInput').value) || 3.0;
    if(goalKm <= 0) goalKm = 3.0;

    // 2. 로딩 시작
    loadingOverlay.classList.remove('hidden');

    try {
        await generateAndCheckRoute(goalKm);
    } catch(e) {
        console.error("Course Error:", e);
        // 에러 메시지 분기 처리
        if(e.message.includes("403") || e.message.includes("API")) {
            alert("API 오류: 코스를 생성할 수 없습니다. (키 할당량 초과 가능성)");
        } else {
            alert("코스 생성 실패. 다시 시도해주세요.");
        }
    } finally {
        // [중요] 성공/실패 여부와 관계없이 로딩창 닫기
        loadingOverlay.classList.add('hidden');
        rotationCount++;
    }
});

// [핵심] 오차범위 10% 이내 보정 루프 (최대 3회 시도)
async function generateAndCheckRoute(targetKm) {
    let scale = 1.0;
    let bestResult = null;
    let minError = Infinity;

    for (let i = 0; i < 3; i++) {
        console.log(`생성 시도 ${i+1}/3 (Scale: ${scale.toFixed(2)})`);
        
        let waypoints = createWaypoints(targetKm, scale);
        let result = await fetchRouteData(waypoints);

        if (!result) break; // API 실패시 중단

        let actualKm = parseFloat(result.dist);
        let errorRate = Math.abs(actualKm - targetKm) / targetKm;

        // 현재 결과 저장
        bestResult = result;
        
        console.log(`-> 결과: ${actualKm}km (오차: ${(errorRate*100).toFixed(1)}%)`);

        // 10% 이내면 즉시 성공
        if (errorRate <= 0.1) {
            break;
        }

        // 보정 비율 계산 (다음 루프를 위해)
        let ratio = targetKm / (actualKm || 1);
        
        // 너무 급격한 변화 방지 (0.5배 ~ 1.5배 사이로 제한)
        if (ratio > 1.5) ratio = 1.5;
        if (ratio < 0.6) ratio = 0.6;
        
        scale *= ratio;
    }

    if (bestResult) {
        drawPolyline(bestResult.coords);
        document.getElementById('actualDistDisplay').innerText = bestResult.dist + " km";
        routeCoords = bestResult.coords;
    } else {
        throw new Error("No Valid Route Found");
    }
}

function createWaypoints(goalKm, scale) {
    const mode = document.querySelector('input[name="tripType"]:checked').value;
    const geoKm = (goalKm / 1.3) * scale; 

    if (!endPoint) {
        // [순환] Diamond Shape
        const side = geoKm / 4;
        const baseBearing = 45 + (rotationCount * 45); 
        const p1 = getPointByBearing(startPoint, baseBearing, side);
        const p2 = getPointByBearing(p1, baseBearing + 90, side);
        const p3 = getPointByBearing(p2, baseBearing + 90, side);
        return [
            [startPoint.lng, startPoint.lat],
            [p1.lng, p1.lat],
            [p2.lng, p2.lat],
            [p3.lng, p3.lat],
            [startPoint.lng, startPoint.lat]
        ];
    } else {
        const straight = calcDist(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
        // 목표가 너무 짧으면 직선
        if (goalKm <= straight * 1.1) return [[startPoint.lng, startPoint.lat], [endPoint.lng, endPoint.lat]];

        if (mode === '편도') {
            const midLat = (startPoint.lat + endPoint.lat) / 2;
            const midLng = (startPoint.lng + endPoint.lng) / 2;
            const term = Math.pow(geoKm/2, 2) - Math.pow(straight/2, 2);
            const h = Math.sqrt(Math.max(0, term)); 
            const dir = (rotationCount % 2 === 0) ? 90 : -90;
            const wp = getPointByBearing({lat:midLat, lng:midLng}, dir, h);
            return [[startPoint.lng, startPoint.lat], [wp.lng, wp.lat], [endPoint.lng, endPoint.lat]];
        } else {
            // 왕복/추천: Wide Loop
            const remain = Math.max(0, geoKm - (straight * 2));
            const width = Math.max(0.2, remain / 4);
            const midLat = (startPoint.lat + endPoint.lat) / 2;
            const midLng = (startPoint.lng + endPoint.lng) / 2;
            const bear = getBearing(startPoint, endPoint);
            const offset = (rotationCount % 2 === 0) ? 90 : -90;
            const wp1 = getPointByBearing({lat:midLat, lng:midLng}, bear + offset, width);
            const wp2 = getPointByBearing({lat:midLat, lng:midLng}, bear - offset, width);
            return [[startPoint.lng, startPoint.lat], [wp1.lng, wp1.lat], [endPoint.lng, endPoint.lat], [wp2.lng, wp2.lat], [startPoint.lng, startPoint.lat]];
        }
    }
}

async function fetchRouteData(coords) {
    try {
        const isValid = coords.every(pt => !isNaN(pt[0]) && !isNaN(pt[1]));
        if (!isValid) return null;

        const res = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
            method: 'POST',
            headers: { 'Authorization': KEY_ORS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: coords })
        });
        
        if(!res.ok) {
            console.warn(`API Error: ${res.status}`);
            return null; 
        }
        const data = await res.json();
        const lineCoords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
        let distM = 0;
        for(let i=0; i<lineCoords.length-1; i++) distM += map.distance(lineCoords[i], lineCoords[i+1]);
        return { coords: lineCoords, dist: (distM / 1000).toFixed(2) };
    } catch(e) { return null; }
}

function drawPolyline(coords) {
    if(polylineLayer) map.removeLayer(polylineLayer);
    polylineLayer = L.polyline(coords, { color: '#3586ff', weight: 6, opacity: 0.8 }).addTo(map);
    const bounds = polylineLayer.getBounds();
    if(startMarker) bounds.extend(startMarker.getLatLng());
    if(endMarker) bounds.extend(endMarker.getLatLng());
    map.fitBounds(bounds, { padding:[40,40] });
}

// Math Utils
function calcDist(lat1, lon1, lat2, lon2) {
    const R = 6371; const dLat = deg2rad(lat2-lat1), dLon = deg2rad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2))*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function getPointByBearing(pt, bearing, distKm) {
    const R = 6371; const lat1 = deg2rad(pt.lat), lon1 = deg2rad(pt.lng), brng = deg2rad(bearing);
    const lat2 = Math.asin(Math.sin(lat1)*Math.cos(distKm/R) + Math.cos(lat1)*Math.sin(distKm/R)*Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(distKm/R)*Math.cos(lat1), Math.cos(distKm/R)-Math.sin(lat1)*Math.sin(lat2));
    return { lat: rad2deg(lat2), lng: rad2deg(lon2) };
}
function getBearing(start, end) {
    const y = Math.sin(deg2rad(end.lng-start.lng)) * Math.cos(deg2rad(end.lat));
    const x = Math.cos(deg2rad(start.lat))*Math.sin(deg2rad(end.lat)) - Math.sin(deg2rad(start.lat))*Math.cos(deg2rad(end.lat))*Math.cos(deg2rad(end.lng-start.lng));
    return (rad2deg(Math.atan2(y, x)) + 360) % 360;
}
function deg2rad(d) { return d * (Math.PI/180); }
function rad2deg(r) { return r * (180/Math.PI); }

// Buttons
document.getElementById('startRunningBtn').addEventListener('click', () => {
    if(routeCoords.length === 0) return alert("코스 생성 필요");
    localStorage.setItem('currentRunRoute', JSON.stringify(routeCoords));
    localStorage.setItem('currentRunDist', document.getElementById('actualDistDisplay').innerText);
    window.location.href = 'running.html';
});
document.getElementById('saveBtn').addEventListener('click', () => {
    if(routeCoords.length === 0) return alert("저장할 코스 없음");
    const name = prompt("코스 이름"); if(!name) return;
    const list = JSON.parse(localStorage.getItem('myCourses') || "[]");
    list.push({ id: Date.now(), name, date: new Date().toLocaleDateString(), dist: document.getElementById('actualDistDisplay').innerText, path: routeCoords });
    localStorage.setItem('myCourses', JSON.stringify(list));
    alert("저장 완료");
});
const loadModal = document.getElementById('loadModal');
document.getElementById('loadBtn').addEventListener('click', () => {
    const list = JSON.parse(localStorage.getItem('myCourses') || "[]");
    const listEl = document.getElementById('savedList');
    listEl.innerHTML = list.length ? '' : '<li style="padding:15px;text-align:center;">저장된 코스 없음</li>';
    list.forEach(c => {
        const li = document.createElement('li'); li.className = 'saved-item';
        const lats=c.path.map(p=>p[0]), lngs=c.path.map(p=>p[1]);
        const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
        let d=""; c.path.forEach((p,i)=>{
            const y=50-((p[0]-minLat)/(maxLat-minLat||1))*50, x=((p[1]-minLng)/(maxLng-minLng||1))*50;
            d+=`${i===0?'M':'L'} ${x} ${y} `;
        });
        li.innerHTML = `<div><div style="font-weight:bold;">${c.name}</div><div style="font-size:12px;color:#888;">${c.date} | ${c.dist}</div></div><svg class="mini-map" viewBox="0 0 50 50"><path d="${d}" fill="none" stroke="#3586ff" stroke-width="2"/></svg>`;
        li.onclick = () => {
            if(polylineLayer) map.removeLayer(polylineLayer);
            routeCoords = c.path;
            polylineLayer = L.polyline(c.path, {color:'#3586ff', weight:6}).addTo(map);
            map.fitBounds(polylineLayer.getBounds(), { padding:[40,40] });
            document.getElementById('actualDistDisplay').innerText = c.dist;
            loadModal.classList.add('hidden');
        };
        listEl.appendChild(li);
    });
    loadModal.classList.remove('hidden');
});
document.getElementById('closeLoadBtn').addEventListener('click', () => loadModal.classList.add('hidden'));