import { db, auth } from './firebase-service.js';
import { ref, push, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
    POKERUN MAIN LOGIC (v18 - Destination Routing & Fallback Fixed)
    ============================================================ */

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
let currentUser = null;
let ps;

const loadingOverlay = document.getElementById('loadingOverlay');
const loadModal = document.getElementById('loadModal'); 
const goalInput = document.getElementById('goalDistInput');
const searchOverlay = document.getElementById('searchOverlay');
const searchSuggestions = document.getElementById('searchSuggestions');

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    initMap();
    getUserLocation();
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("Logged in:", user.email);
        } else {
            console.log("No user logged in");
        }
    });
});

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([userLoc.lat, userLoc.lng], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    kakao.maps.load(() => {
        ps = new kakao.maps.services.Places();
        setupAutocomplete('startInput', true);
        setupAutocomplete('endInput', false);
    });
}

function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                map.setView([userLoc.lat, userLoc.lng], 15);
                if (callback) callback(userLoc);
            },
            err => {
                console.warn("GPS 수신 실패:", err);
                if (callback) callback(null);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        if (callback) callback(null);
    }
}

// 내 위치 버튼
document.getElementById('myLocationBtn')?.addEventListener('click', () => {
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    getUserLocation((loc) => {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');

        if (!loc) {
            alert("내 위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.");
            return;
        }

        const startIn = document.getElementById('startInput');
        if (startIn) startIn.value = "내 위치 (GPS)";

        startPoint = { lat: loc.lat, lng: loc.lng, name: "내 위치" };

        const startBadge = document.getElementById('startDistBadge');
        if (startBadge) startBadge.style.display = 'none';

        setMapMarker('start', loc.lat, loc.lng, "내 위치");
    });
});

// 리셋 버튼
document.getElementById('resetBtn')?.addEventListener('click', () => {
    startPoint = null; endPoint = null; routeCoords = [];
    const startIn = document.getElementById('startInput');
    const endIn = document.getElementById('endInput');
    if(startIn) startIn.value = '';
    if(endIn) endIn.value = '';
    if(goalInput) goalInput.value = '3.00';
    
    const startBadge = document.getElementById('startDistBadge');
    const endBadge = document.getElementById('endDistBadge');
    if(startBadge) startBadge.style.display = 'none';
    if(endBadge) endBadge.style.display = 'none';
    
    const searchDistDisp = document.getElementById('searchDistDisplay');
    const actualDistDisp = document.getElementById('actualDistDisplay');
    if(searchDistDisp) searchDistDisp.innerText = '0.00 km';
    if(actualDistDisp) actualDistDisp.innerText = '0.00 km';

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

// --- SEARCH & AUTOCOMPLETE ---
function setupAutocomplete(inputId, isStart) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const openHandler = () => {
        if (input.value.trim() === "") {
            showLandmarkRecommendations(isStart);
        }
    };

    input.addEventListener('focus', openHandler);
    input.addEventListener('click', openHandler);

    input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length > 0) {
            const localMatches = ALL_LANDMARKS.filter(lm => {
                const dist = calcDist(userLoc.lat, userLoc.lng, lm.lat, lm.lng);
                return lm.name.includes(val) && dist <= 30.0;
            }).map(lm => ({...lm, source: 'landmark', dist: calcDist(userLoc.lat, userLoc.lng, lm.lat, lm.lng)}));

            if (ps) {
                const searchOptions = { 
                    location: new kakao.maps.LatLng(userLoc.lat, userLoc.lng), 
                    radius: 20000, 
                    sort: kakao.maps.services.SortBy.DISTANCE 
                };
                ps.keywordSearch(val, (data, status) => {
                    let kakaoMatches = [];
                    if (status === kakao.maps.services.Status.OK) {
                        kakaoMatches = data.map(item => ({
                            name: item.place_name, 
                            address: item.address_name, 
                            lat: parseFloat(item.y), 
                            lng: parseFloat(item.x),
                            source: 'kakao', 
                            dist: calcDist(userLoc.lat, userLoc.lng, parseFloat(item.y), parseFloat(item.x))
                        }));
                    }
                    mergeAndRenderList(localMatches, kakaoMatches, isStart);
                }, searchOptions);
            } else {
                renderList(localMatches, isStart);
            }
        } else {
            showLandmarkRecommendations(isStart);
        }
    });
}

document.addEventListener('click', (e) => {
    const startIn = document.getElementById('startInput');
    const endIn = document.getElementById('endInput');
    if (
        searchOverlay && 
        e.target !== startIn && 
        e.target !== endIn && 
        !searchOverlay.contains(e.target)
    ) {
        searchOverlay.classList.add('hidden');
    }
});

function showLandmarkRecommendations(isStart) {
    if (!searchSuggestions) return;
    const candidates = ALL_LANDMARKS.map(lm => ({ ...lm, source: 'landmark', dist: calcDist(userLoc.lat, userLoc.lng, lm.lat, lm.lng) }));
    const filtered = candidates.filter(lm => lm.dist <= 30.0);
    
    filtered.sort((a, b) => {
        const aPri = a.dist <= 5.0 ? 0 : 1; const bPri = b.dist <= 5.0 ? 0 : 1;
        if(aPri !== bPri) return aPri - bPri; return a.dist - b.dist;
    });

    if (filtered.length > 0) renderList(filtered, isStart);
    else if (searchOverlay) searchOverlay.classList.add('hidden');
}

function mergeAndRenderList(localItems, kakaoItems, isStart) {
    const combined = [...localItems, ...kakaoItems];
    combined.sort((a, b) => {
        const aPri = (a.source === 'landmark' && a.dist <= 5.0) ? 0 : 1;
        const bPri = (b.source === 'landmark' && b.dist <= 5.0) ? 0 : 1;
        if(aPri !== bPri) return aPri - bPri; return a.dist - b.dist;
    });
    renderList(combined, isStart);
}

function renderList(items, isStart) {
    if (!searchSuggestions) return;
    searchSuggestions.innerHTML = ''; 
    if (searchOverlay) searchOverlay.classList.remove('hidden'); 
    
    if (items.length === 0) { 
        searchSuggestions.innerHTML = '<li class="suggestion-item" style="color:#999">검색 결과 없음</li>'; 
        return; 
    }

    items.forEach(item => {
        const isPriority = (item.source === 'landmark' && item.dist <= 5.0);
        const li = document.createElement('li'); 
        li.className = 'suggestion-item';
        const tag = isPriority ? `<span class="landmark-tag">추천</span>` : ``;
        const addr = item.address || (item.type === 'station' ? '지하철역' : '캠퍼스');
        
        li.innerHTML = `<div><div class="sug-name">${tag}${item.name}</div><div class="sug-addr">${addr}</div></div><div class="sug-dist">${item.dist.toFixed(1)}km</div>`;
        
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            selectPlace(item, isStart);
        });
        
        searchSuggestions.appendChild(li);
    });
}

function selectPlace(place, isStart) {
    const input = document.getElementById(isStart ? 'startInput' : 'endInput');
    const badge = document.getElementById(isStart ? 'startDistBadge' : 'endDistBadge');
    
    if (input) input.value = place.name;
    const dist = calcDist(userLoc.lat, userLoc.lng, place.lat, place.lng);
    if (badge) {
        badge.innerText = dist.toFixed(1) + 'km'; 
        badge.style.display = 'block';
    }
    
    if (searchOverlay) searchOverlay.classList.add('hidden');

    if (isStart) { 
        startPoint = place; 
        setMapMarker('start', place.lat, place.lng, place.name); 
    } else { 
        endPoint = place; 
        setMapMarker('end', place.lat, place.lng, place.name); 
    }
    
    if (startPoint && endPoint) {
        const d = calcDist(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
        const searchDistDisp = document.getElementById('searchDistDisplay');
        if (searchDistDisp) searchDistDisp.innerText = d.toFixed(2) + ' km';
    }
}

// 장소 텍스트를 좌표로 자동 변환 (목록에서 안 눌렀을 때 대응)
async function resolvePlaceByName(query) {
    return new Promise((resolve) => {
        if (!ps || !query) return resolve(null);
        ps.keywordSearch(query, (data, status) => {
            if (status === kakao.maps.services.Status.OK && data.length > 0) {
                const item = data[0];
                resolve({
                    name: item.place_name,
                    address: item.address_name,
                    lat: parseFloat(item.y),
                    lng: parseFloat(item.x)
                });
            } else {
                resolve(null);
            }
        });
    });
}

// --- COURSE GENERATION ---
document.getElementById('createCourseBtn')?.addEventListener('click', async () => {
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    try {
        const startVal = document.getElementById('startInput')?.value.trim();
        const endVal = document.getElementById('endInput')?.value.trim();

        // 1. 출발지가 지정되어 있지 않으면 입력값 또는 내 위치로 설정
        if (!startPoint) {
            if (startVal && startVal !== "내 위치 (GPS)") {
                const res = await resolvePlaceByName(startVal);
                if (res) startPoint = res;
            }
            if (!startPoint) {
                startPoint = { ...userLoc, name: "내 위치" };
            }
            setMapMarker('start', startPoint.lat, startPoint.lng, startPoint.name);
        }

        // 2. 도착지 입력창에 글자가 써있는데 endPoint가 없을 경우 자동 조회
        if (endVal && !endPoint) {
            const res = await resolvePlaceByName(endVal);
            if (res) {
                endPoint = res;
                setMapMarker('end', endPoint.lat, endPoint.lng, endPoint.name);
            }
        }

        let goalKm = parseFloat(goalInput?.value) || 3.0;
        if (goalKm <= 0) goalKm = 3.0;

        await generateAndCheckRoute(goalKm);
    } catch(e) {
        console.error("Course Error:", e);
        alert("코스 생성 실패.\n경로를 도보로 찾을 수 없거나 목적지 위치를 확인해주세요.");
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        rotationCount++;
    }
});

async function generateAndCheckRoute(targetKm) {
    let scale = 1.0;
    let bestResult = null;
    let attempts = 0; 

    // 1차 시도: 경유지 포함 러닝 코스 계산
    while (attempts < 3) {
        let waypoints = createWaypoints(targetKm, scale);
        let result = await fetchRouteData(waypoints);

        if (result) {
            let actualKm = parseFloat(result.dist);
            let errorRate = Math.abs(actualKm - targetKm) / targetKm;
            bestResult = result;
            
            if (errorRate <= 0.1) break; 

            let ratio = targetKm / (actualKm || 1);
            if (ratio > 1.5) ratio = 1.5; if (ratio < 0.6) ratio = 0.6;
            scale *= ratio;
        }
        attempts++;
    }

    // 2차 시도: 경유지가 보행 불가 구역에 걸려 실패한 경우, 단순 [출발지 -> 도착지] 직접 경로로 Fallback
    if (!bestResult && endPoint) {
        console.warn("경유지 코스 길찾기 실패 -> 단순 출발지-도착지 경로 연결 시도");
        const directWaypoints = toCoords([startPoint, endPoint]);
        bestResult = await fetchRouteData(directWaypoints);
    }

    if (bestResult) {
        drawPolyline(bestResult.coords);
        const actualDistDisp = document.getElementById('actualDistDisplay');
        if (actualDistDisp) actualDistDisp.innerText = bestResult.dist + " km";
        routeCoords = bestResult.coords;
    } else {
        throw new Error("No Valid Route Found");
    }
}

function createWaypoints(goalKm, scale) {
    const checkedTrip = document.querySelector('input[name="tripType"]:checked');
    const mode = checkedTrip ? checkedTrip.value : '편도';
    const geoKm = (goalKm / 1.3) * scale; 

    if (!endPoint) {
        const side = geoKm / 4;
        const baseBearing = 45 + (rotationCount * 45); 
        const p1 = getPointByBearing(startPoint, baseBearing, side);
        const p2 = getPointByBearing(p1, baseBearing + 90, side);
        const p3 = getPointByBearing(p2, baseBearing + 90, side);
        return toCoords([startPoint, p1, p2, p3, startPoint]);
    } else {
        const straight = calcDist(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
        const bear = getBearing(startPoint, endPoint);
        const midLat = (startPoint.lat + endPoint.lat) / 2;
        const midLng = (startPoint.lng + endPoint.lng) / 2;
        
        const remain = Math.max(0, geoKm - straight); 
        let width = Math.max(0.2, remain / 3);

        const pattern = rotationCount % 3; 

        if (mode === '편도') {
            if (pattern === 0) {
                const p1_3 = getIntermediatePoint(startPoint, endPoint, 0.33);
                const p2_3 = getIntermediatePoint(startPoint, endPoint, 0.66);
                const z1 = getPointByBearing(p1_3, bear + 90, width);
                const z2 = getPointByBearing(p2_3, bear - 90, width);
                return toCoords([startPoint, z1, z2, endPoint]);
            }
            else if (pattern === 1) {
                const p1_3 = getIntermediatePoint(startPoint, endPoint, 0.33);
                const p2_3 = getIntermediatePoint(startPoint, endPoint, 0.66);
                const z1 = getPointByBearing(p1_3, bear + 90, width);
                const z2 = getPointByBearing(p2_3, bear + 90, width);
                return toCoords([startPoint, z1, z2, endPoint]);
            }
            else {
                const h = Math.sqrt(Math.max(0, Math.pow(geoKm/2, 2) - Math.pow(straight/2, 2))) || width;
                const wp = getPointByBearing({lat:midLat, lng:midLng}, bear - 90, h);
                return toCoords([startPoint, wp, endPoint]);
            }
        } else {
            if (pattern === 0) {
                const wp1 = getPointByBearing({lat:midLat, lng:midLng}, bear + 90, width);
                const wp2 = getPointByBearing({lat:midLat, lng:midLng}, bear - 90, width);
                return toCoords([startPoint, wp1, endPoint, wp2, startPoint]);
            }
            else if (pattern === 1) {
                const p1_3 = getIntermediatePoint(startPoint, endPoint, 0.33);
                const p2_3 = getIntermediatePoint(startPoint, endPoint, 0.66);
                const z1 = getPointByBearing(p1_3, bear + 90, width);
                const z2 = getPointByBearing(p2_3, bear + 90, width);
                return toCoords([startPoint, z1, z2, endPoint, startPoint]);
            }
            else {
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
    return {
        lat: start.lat + ((end.lat - start.lat) * fraction),
        lng: start.lng + ((end.lng - start.lng) * fraction)
    };
}

function toCoords(points) {
    return points.map(p => [p.lng, p.lat]);
}

// ORS 및 OSRM 길찾기 API 연동 (이중화 처리)
async function fetchRouteData(coords) {
    const isValid = coords.every(pt => !isNaN(pt[0]) && !isNaN(pt[1]));
    if (!isValid) return null;

    // 1차 시도: OpenRouteService (ORS)
    try {
        const res = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
            method: 'POST',
            headers: { 'Authorization': KEY_ORS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: coords })
        });
        
        if (res.ok) {
            const data = await res.json();
            const lineCoords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
            let distM = 0;
            for (let i = 0; i < lineCoords.length - 1; i++) distM += map.distance(lineCoords[i], lineCoords[i+1]);
            return { coords: lineCoords, dist: (distM / 1000).toFixed(2) };
        }
    } catch(e) {
        console.warn("ORS API 실패, OSRM 대체 시도:", e);
    }

    // 2차 시도 (Fallback): OSRM (무료 / 인증키 불필요 도보 길찾기)
    try {
        const coordStr = coords.map(pt => `${pt[0]},${pt[1]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${coordStr}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);
        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const lineCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
                const distKm = (route.distance / 1000).toFixed(2);
                return { coords: lineCoords, dist: distKm };
            }
        }
    } catch(e) {
        console.error("OSRM Routing Error:", e);
    }

    return null;
}

function drawPolyline(coords) {
    if (polylineLayer) map.removeLayer(polylineLayer);
    polylineLayer = L.polyline(coords, { color: '#3586ff', weight: 6, opacity: 0.8 }).addTo(map);
    const bounds = polylineLayer.getBounds();
    if (startMarker) bounds.extend(startMarker.getLatLng());
    if (endMarker) bounds.extend(endMarker.getLatLng());
    map.fitBounds(bounds, { padding: [40, 40] });
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

// --- SAVED LIST ---
function renderSavedCourses() {
    if (!currentUser) return alert("로그인 정보가 없습니다.");
    
    const listEl = document.getElementById('savedList');
    if (!listEl) return;
    listEl.innerHTML = '<li style="padding:15px;text-align:center;">불러오는 중...</li>';

    const coursesRef = ref(db, `users/${currentUser.uid}/myCourses`);
    onValue(coursesRef, (snapshot) => {
        listEl.innerHTML = ''; 
        const data = snapshot.val();
        
        if (!data) {
            listEl.innerHTML = '<li style="padding:15px;text-align:center;">저장된 코스 없음</li>';
            return;
        }

        const list = Object.entries(data).map(([key, value]) => ({...value, key}));

        list.forEach(c => {
            const li = document.createElement('li'); li.className = 'saved-item';
            
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
            
            infoMapWrapper.onclick = () => {
                if(polylineLayer) map.removeLayer(polylineLayer);
                routeCoords = c.path;
                polylineLayer = L.polyline(c.path, {color:'#3586ff', weight:6}).addTo(map);
                map.fitBounds(polylineLayer.getBounds(), { padding:[40,40] });
                const actualDistDisp = document.getElementById('actualDistDisplay');
                if (actualDistDisp) actualDistDisp.innerText = c.dist;
                if (loadModal) loadModal.classList.add('hidden');
            };
            li.appendChild(infoMapWrapper);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-course-btn';
            deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); 
                if (confirm(`"${c.name}" 코스를 삭제하시겠습니까?`)) {
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
document.getElementById('startRunningBtn')?.addEventListener('click', () => {
    if(routeCoords.length === 0) return alert("코스 생성 필요");
    
    localStorage.setItem('currentRunRoute', JSON.stringify(routeCoords));
    const actualDistDisp = document.getElementById('actualDistDisplay');
    localStorage.setItem('currentRunDist', actualDistDisp ? actualDistDisp.innerText : '0.00 km');
    
    window.location.href = 'run_running.html';
});

document.getElementById('saveBtn')?.addEventListener('click', () => {
    if(!currentUser) return alert("로그인이 필요합니다.");
    if(routeCoords.length === 0) return alert("저장할 코스 없음");
    
    const name = prompt("코스 이름"); 
    if(!name) return;

    const actualDistDisp = document.getElementById('actualDistDisplay');
    const newCourse = { 
        name, 
        date: new Date().toLocaleDateString(), 
        dist: actualDistDisp ? actualDistDisp.innerText : '0.00 km', 
        path: routeCoords,
        createdAt: Date.now()
    };

    const coursesRef = ref(db, `users/${currentUser.uid}/myCourses`);
    push(coursesRef, newCourse)
        .then(() => alert("클라우드에 저장 완료!"))
        .catch((e) => alert("저장 실패: " + e.message));
});

document.getElementById('loadBtn')?.addEventListener('click', () => { 
    renderSavedCourses(); 
    if (loadModal) loadModal.classList.remove('hidden'); 
});

document.getElementById('closeLoadBtn')?.addEventListener('click', () => {
    if (loadModal) loadModal.classList.add('hidden');
});
