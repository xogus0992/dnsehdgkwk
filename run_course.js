import { db, auth } from './firebase-service.js';
import { ref, push, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN MAIN LOGIC (FINAL v16 - Firebase Integrated)
   - Mobile Search Fix: Added 'click' listener to inputs
   - Storage: LocalStorage (Temp) -> Firebase (Permanent)
   ============================================================ */

const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';
const KEY_ORS = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk3NTU2OTk1ODQ1NjQ0YWE5NzA3ZTM1OWExMGE3NTU4IiwiaCI6Im11cm11cjY0In0=';

const ALL_LANDMARKS = [];
// 데이터 로드 대기 (HTML 상단에서 로드되었다고 가정)
if (typeof STATIONS_DATA !== 'undefined') ALL_LANDMARKS.push(...STATIONS_DATA);
if (typeof CAMPUS_DATA !== 'undefined') ALL_LANDMARKS.push(...CAMPUS_DATA);

let map, polylineLayer;
let startMarker, endMarker;
let userLoc = { lat: 37.5665, lng: 126.9780 };
let startPoint = null;
let endPoint = null;
let routeCoords = [];
let rotationCount = 0; // 모양 변경용 인덱스
let currentUser = null; // Firebase User

const loadingOverlay = document.getElementById('loadingOverlay');
const loadModal = document.getElementById('loadModal'); 
const goalInput = document.getElementById('goalDistInput');

// --- INITIALIZATION ---
// window.onload 대신 addEventListener를 써야 layout.js와 충돌하지 않습니다.
window.addEventListener('load', () => {
    initMap();
    getUserLocation();
    
    // Auth Check
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("Logged in:", user.email);
            // 로그인 확인 후 저장된 목록 한 번 불러오기 (선택사항)
        } else {
             // 로그인 안 되어 있으면 처리
             console.log("No user logged in");
        }
    });
});

function initMap() {
    // Zoom Control false로 깔끔하게
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
            // 내 위치가 잡히면 기본 시작점은 내 위치로 설정 안함 (사용자 선택 존중)
            // 다만, UI 편의를 위해 버튼 누르면 이동
        }, err => console.log(err));
    }
}

// 리셋 버튼
document.getElementById('resetBtn').addEventListener('click', () => {
    startPoint = null; endPoint = null; routeCoords = [];
    document.getElementById('startInput').value = '';
    document.getElementById('endInput').value = '';
    goalInput.value = '3.00';
    document.getElementById('startDistBadge').style.display = 'none';
    document.getElementById('endDistBadge').style.display = 'none';
    document.getElementById('searchDistDisplay').innerText = '0.00 km';
    document.getElementById('actualDistDisplay').innerText = '0.00 km';
    if(polylineLayer) map.removeLayer(polylineLayer);
    if(startMarker) map.removeLayer(startMarker);
    if(endMarker) map.removeLayer(endMarker);
    startMarker = null; endMarker = null;
    map.setView([userLoc.lat, userLoc.lng], 15);
    rotationCount = 0;
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

// --- SEARCH LOGIC (Mobile Fix Included) ---
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
    
    // [Mobile Fix] focus 뿐만 아니라 'click' 이벤트에도 반응하도록 추가
    // 모바일에서는 이미 포커스된 상태에서 다시 누를 때 focus 이벤트가 발생하지 않을 수 있음
    const openHandler = () => {
        if(input.value.trim() === "") showLandmarkRecommendations(list, isStart);
    };

    input.addEventListener('focus', openHandler);
    input.addEventListener('click', openHandler); // ★ 모바일 터치 대응 추가

    input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length > 0) {
            // 1. 로컬 데이터(랜드마크) 검색
            const localMatches = ALL_LANDMARKS.filter(lm => {
                const dist = calcDist(userLoc.lat, userLoc.lng, lm.lat, lm.lng);
                return lm.name.includes(val) && dist <= 30.0;
            }).map(lm => ({...lm, source: 'landmark', dist: calcDist(userLoc.lat, userLoc.lng, lm.lat, lm.lng)}));

            // 2. 카카오 API 검색
            const searchOptions = { location: new kakao.maps.LatLng(userLoc.lat, userLoc.lng), radius: 20000, sort: kakao.maps.services.SortBy.DISTANCE };
            ps.keywordSearch(val, (data, status) => {
                let kakaoMatches = [];
                if (status === kakao.maps.services.Status.OK) {
                    kakaoMatches = data.map(item => ({
                        name: item.place_name, address: item.address_name, lat: parseFloat(item.y), lng: parseFloat(item.x),
                        source: 'kakao', dist: calcDist(userLoc.lat, userLoc.lng, parseFloat(item.y), parseFloat(item.x))
                    }));
                }
                mergeAndRenderList(list, localMatches, kakaoMatches, isStart);
            }, searchOptions);
        } else {
            showLandmarkRecommendations(list, isStart);
        }
    });

    // 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if(e.target !== input && e.target !== list && !list.contains(e.target)) {
            list.classList.remove('active');
        }
    });
}

function showLandmarkRecommendations(listEl, isStart) {
    const candidates = ALL_LANDMARKS.map(lm => ({ ...lm, source: 'landmark', dist: calcDist(userLoc.lat, userLoc.lng, lm.lat, lm.lng) }));
    const filtered = candidates.filter(lm => lm.dist <= 30.0);
    
    // 거리순 정렬, 단 5km 이내는 우선
    filtered.sort((a, b) => {
        const aPri = a.dist <= 5.0 ? 0 : 1; const bPri = b.dist <= 5.0 ? 0 : 1;
        if(aPri !== bPri) return aPri - bPri; return a.dist - b.dist;
    });

    if(filtered.length > 0) renderList(listEl, filtered, isStart);
    else listEl.classList.remove('active');
}

function mergeAndRenderList(listEl, localItems, kakaoItems, isStart) {
    const combined = [...localItems, ...kakaoItems];
    combined.sort((a, b) => {
        const aPri = (a.source === 'landmark' && a.dist <= 5.0) ? 0 : 1;
        const bPri = (b.source === 'landmark' && b.dist <= 5.0) ? 0 : 1;
        if(aPri !== bPri) return aPri - bPri; return a.dist - b.dist;
    });
    renderList(listEl, combined, isStart);
}

function renderList(listEl, items, isStart) {
    listEl.innerHTML = ''; 
    listEl.classList.add('active'); // CSS display:block
    
    if(items.length === 0) { 
        listEl.innerHTML = '<li class="suggestion-item" style="color:#999">검색 결과 없음</li>'; 
        return; 
    }

    items.forEach(item => {
        const isPriority = (item.source === 'landmark' && item.dist <= 5.0);
        const li = document.createElement('li'); li.className = 'suggestion-item';
        const tag = isPriority ? `<span class="landmark-tag">추천</span>` : ``;
        const addr = item.address || (item.type==='station'?'지하철역':'캠퍼스');
        
        li.innerHTML = `<div><div class="sug-name">${tag}${item.name}</div><div class="sug-addr">${addr}</div></div><div class="sug-dist">${item.dist.toFixed(1)}km</div>`;
        
        // 클릭 이벤트 (Touch Friendly)
        li.addEventListener('click', (e) => {
             e.stopPropagation(); // 부모 이벤트 전파 방지
             selectPlace(item, isStart, listEl);
        });
        
        listEl.appendChild(li);
    });
}

function selectPlace(place, isStart, listEl) {
    const input = document.getElementById(isStart ? 'startInput' : 'endInput');
    const badge = document.getElementById(isStart ? 'startDistBadge' : 'endDistBadge');
    
    input.value = place.name;
    const dist = calcDist(userLoc.lat, userLoc.lng, place.lat, place.lng);
    badge.innerText = dist.toFixed(1) + 'km'; badge.style.display = 'block';
    
    listEl.classList.remove('active'); // 리스트 닫기

    if (isStart) { 
        startPoint = place; 
        setMapMarker('start', place.lat, place.lng, place.name); 
    } else { 
        endPoint = place; 
        setMapMarker('end', place.lat, place.lng, place.name); 
    }
    
    if(startPoint && endPoint) {
        const d = calcDist(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
        document.getElementById('searchDistDisplay').innerText = d.toFixed(2) + ' km';
    }
}

// --- COURSE GENERATION (Logic Preserved) ---
document.getElementById('createCourseBtn').addEventListener('click', async () => {
    if(!startPoint) {
        startPoint = { ...userLoc, name: "내 위치" };
        setMapMarker('start', userLoc.lat, userLoc.lng, "내 위치");
    }
    let goalKm = parseFloat(goalInput.value) || 3.0;
    if(goalKm <= 0) goalKm = 3.0;

    loadingOverlay.classList.remove('hidden');

    try {
        await generateAndCheckRoute(goalKm);
    } catch(e) {
        console.error("Course Error:", e);
        if(e.message && e.message.includes("403")) alert("API 오류(403): 키 할당량 초과");
        else alert("코스 생성 실패.\n(경로를 찾을 수 없거나 API 오류입니다)");
    } finally {
        loadingOverlay.classList.add('hidden');
        rotationCount++; // 다음 생성 시 모양 변경
    }
});

// [API] Generate Route
async function generateAndCheckRoute(targetKm) {
    let scale = 1.0;
    let bestResult = null;
    let attempts = 0; 

    // Accuracy Loop (정확도 보정 반복문)
    while (attempts < 3) {
        let waypoints = createWaypoints(targetKm, scale);
        let result = await fetchRouteData(waypoints);

        if (!result) break; 

        let actualKm = parseFloat(result.dist);
        let errorRate = Math.abs(actualKm - targetKm) / targetKm;
        bestResult = result;
        
        if (errorRate <= 0.1) break; // 오차 10% 이내면 성공

        // 보정 계수 조정
        let ratio = targetKm / (actualKm || 1);
        if (ratio > 1.5) ratio = 1.5; if (ratio < 0.6) ratio = 0.6;
        scale *= ratio;
        attempts++;
    }

    if (bestResult) {
        drawPolyline(bestResult.coords);
        document.getElementById('actualDistDisplay').innerText = bestResult.dist + " km";
        routeCoords = bestResult.coords;
    } else {
        throw new Error("No Valid Route Found");
    }
}

// [Logic] Create Waypoints (Pattern Logic Preserved)
function createWaypoints(goalKm, scale) {
    const mode = document.querySelector('input[name="tripType"]:checked').value;
    const geoKm = (goalKm / 1.3) * scale; 

    if (!endPoint) {
        // [목적지 없음] 순환형
        const side = geoKm / 4;
        const baseBearing = 45 + (rotationCount * 45); 
        const p1 = getPointByBearing(startPoint, baseBearing, side);
        const p2 = getPointByBearing(p1, baseBearing + 90, side);
        const p3 = getPointByBearing(p2, baseBearing + 90, side);
        return toCoords([startPoint, p1, p2, p3, startPoint]);
    } else {
        // [목적지 있음]
        const straight = calcDist(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
        const bear = getBearing(startPoint, endPoint);
        const midLat = (startPoint.lat + endPoint.lat) / 2;
        const midLng = (startPoint.lng + endPoint.lng) / 2;
        
        const remain = Math.max(0, geoKm - straight); 
        let width = Math.max(0.3, remain / 3);

        const pattern = rotationCount % 3; 

        if (mode === '편도') {
            if (pattern === 0) { // ZigZag
                const p1_3 = getIntermediatePoint(startPoint, endPoint, 0.33);
                const p2_3 = getIntermediatePoint(startPoint, endPoint, 0.66);
                const z1 = getPointByBearing(p1_3, bear + 90, width);
                const z2 = getPointByBearing(p2_3, bear - 90, width);
                return toCoords([startPoint, z1, z2, endPoint]);
            }
            else if (pattern === 1) { // Arch
                const p1_3 = getIntermediatePoint(startPoint, endPoint, 0.33);
                const p2_3 = getIntermediatePoint(startPoint, endPoint, 0.66);
                const z1 = getPointByBearing(p1_3, bear + 90, width);
                const z2 = getPointByBearing(p2_3, bear + 90, width);
                return toCoords([startPoint, z1, z2, endPoint]);
            }
            else { // Big Detour
                const h = Math.sqrt(Math.pow(geoKm/2, 2) - Math.pow(straight/2, 2)) || width;
                const wp = getPointByBearing({lat:midLat, lng:midLng}, bear - 90, h);
                return toCoords([startPoint, wp, endPoint]);
            }
        } else {
            // 왕복/추천
            if (pattern === 0) { // Diamond
                const wp1 = getPointByBearing({lat:midLat, lng:midLng}, bear + 90, width);
                const wp2 = getPointByBearing({lat:midLat, lng:midLng}, bear - 90, width);
                return toCoords([startPoint, wp1, endPoint, wp2, startPoint]);
            }
            else if (pattern === 1) { // Box
                const p1_3 = getIntermediatePoint(startPoint, endPoint, 0.33);
                const p2_3 = getIntermediatePoint(startPoint, endPoint, 0.66);
                const z1 = getPointByBearing(p1_3, bear + 90, width);
                const z2 = getPointByBearing(p2_3, bear + 90, width);
                return toCoords([startPoint, z1, z2, endPoint, startPoint]);
            }
            else { // Complex
                const p1_3 = getIntermediatePoint(startPoint, endPoint, 0.33);
                const p2_3 = getIntermediatePoint(startPoint, endPoint, 0.66);
                const z1 = getPointByBearing(p1_3, bear + 90, width);
                const z2 = getPointByBearing(p2_3, bear - 90, width);
                return toCoords([startPoint, z1, z2, endPoint, startPoint]);
            }
        }
    }
}

function getIntermediatePoint(start, end, fraction) {
    const latDiff = end.lat - start.lat;
    const lngDiff = end.lng - start.lng;
    return {
        lat: start.lat + (latDiff * fraction),
        lng: start.lng + (lngDiff * fraction)
    };
}

function toCoords(points) {
    return points.map(p => [p.lng, p.lat]);
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
        
        if(!res.ok) return null;
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


// --- SAVED LIST (Firebase Version) ---
function renderSavedCourses() {
    if (!currentUser) return alert("로그인 정보가 없습니다.");
    
    const listEl = document.getElementById('savedList');
    listEl.innerHTML = '<li style="padding:15px;text-align:center;">불러오는 중...</li>';

    const coursesRef = ref(db, `users/${currentUser.uid}/myCourses`);
    // onValue를 쓰면 데이터 변경 시 실시간 업데이트됨 (매우 좋음)
    onValue(coursesRef, (snapshot) => {
        listEl.innerHTML = ''; // 초기화
        const data = snapshot.val();
        
        if (!data) {
            listEl.innerHTML = '<li style="padding:15px;text-align:center;">저장된 코스 없음</li>';
            return;
        }

        // Firebase 객체 -> 배열로 변환
        const list = Object.entries(data).map(([key, value]) => ({...value, key})); // key 포함

        list.forEach(c => {
            const li = document.createElement('li'); li.className = 'saved-item';
            
            // 미니맵 SVG 생성 로직 (그대로 유지)
            const lats=c.path.map(p=>p[0]), lngs=c.path.map(p=>p[1]);
            const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
            let d=""; c.path.forEach((p,i)=>{
                const y=50-((p[0]-minLat)/(maxLat-minLat||1))*50, x=((p[1]-minLng)/(maxLng-minLng||1))*50;
                d+=`${i===0?'M':'L'} ${x} ${y} `;
            });
            const svg = `<svg class="mini-map" viewBox="0 0 50 50" style="margin-left: 10px;"><path d="${d}" fill="none" stroke="#3586ff" stroke-width="2"/></svg>`;
            
            const infoMapWrapper = document.createElement('div');
            infoMapWrapper.style.display = 'flex'; infoMapWrapper.style.alignItems = 'center'; infoMapWrapper.style.flexGrow = '1'; infoMapWrapper.style.paddingRight = '10px';
            infoMapWrapper.innerHTML = `<div><div style="font-weight:bold;">${c.name}</div><div style="font-size:12px;color:#888;">${c.date} | ${c.dist}</div></div>${svg}`;
            
            // 코스 선택 시 로드
            infoMapWrapper.onclick = () => {
                if(polylineLayer) map.removeLayer(polylineLayer);
                routeCoords = c.path;
                polylineLayer = L.polyline(c.path, {color:'#3586ff', weight:6}).addTo(map);
                map.fitBounds(polylineLayer.getBounds(), { padding:[40,40] });
                document.getElementById('actualDistDisplay').innerText = c.dist;
                loadModal.classList.add('hidden');
            };
            li.appendChild(infoMapWrapper);

            // 삭제 버튼 (Firebase Remove)
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-course-btn';
            deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); 
                if (confirm(`"${c.name}" 코스를 삭제하시겠습니까?`)) {
                    // Firebase 삭제
                    const itemRef = ref(db, `users/${currentUser.uid}/myCourses/${c.key}`);
                    remove(itemRef)
                        .then(() => alert("삭제되었습니다."))
                        .catch(err => alert("삭제 실패: " + err.message));
                }
            };
            li.appendChild(deleteBtn);
            listEl.appendChild(li);
        });
    });
}

// --- BUTTONS ---
document.getElementById('startRunningBtn').addEventListener('click', () => {
    if(routeCoords.length === 0) return alert("코스 생성 필요");
    
    // [중요] 다음 페이지로 넘길 때는 localStorage가 가장 빠르고 간편함
    // 여기서는 영구 저장이 아니라 '세션 이동' 개념이므로 유지
    localStorage.setItem('currentRunRoute', JSON.stringify(routeCoords));
    localStorage.setItem('currentRunDist', document.getElementById('actualDistDisplay').innerText);
    
    window.location.href = 'run_running.html';
});

// 코스 저장 (Firebase Push)
document.getElementById('saveBtn').addEventListener('click', () => {
    if(!currentUser) return alert("로그인이 필요합니다.");
    if(routeCoords.length === 0) return alert("저장할 코스 없음");
    
    const name = prompt("코스 이름"); 
    if(!name) return;

    const newCourse = { 
        name, 
        date: new Date().toLocaleDateString(), 
        dist: document.getElementById('actualDistDisplay').innerText, 
        path: routeCoords,
        createdAt: Date.now()
    };

    const coursesRef = ref(db, `users/${currentUser.uid}/myCourses`);
    push(coursesRef, newCourse)
        .then(() => alert("클라우드에 저장 완료!"))
        .catch((e) => alert("저장 실패: " + e.message));
});

document.getElementById('loadBtn').addEventListener('click', () => { 
    renderSavedCourses(); // Firebase Load 호출
    loadModal.classList.remove('hidden'); 
});

document.getElementById('closeLoadBtn').addEventListener('click', () => loadModal.classList.add('hidden'));