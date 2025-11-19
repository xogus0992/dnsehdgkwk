const bodyPartImages = {
    "가슴": "images/chest.png",
    "등": "images/back.png",
    "어깨": "images/shoulders.png",
    "하체": "images/legs.png",
    "팔": "images/arms.png",
    "복근": "images/core.png"
};

const exercisesData = {
    "가슴": [
        { name: "벤치 프레스", image: "images/chest.png" },
        { name: "덤벨 프레스", image: null },
        { name: "인클라인 벤치 프레스", image: null },
        { name: "인클라인 덤벨 프레스", image: null },
        { name: "체스트 프레스 머신", image: null },
        { name: "펙 덱 플라이", image: null },
        { name: "덤벨 플라이", image: null },
        { name: "케이블 크로스 오버", image: null },
        { name: "딥스", image: "images/arms.png" },
        { name: "푸시업", image: null },
        { name: "스미스머신 벤치 프레스", image: null }
    ],
    "등": [
        { name: "풀업", image: "images/back.png" },
        { name: "랫 풀다운", image: null },
        { name: "바벨 로우", image: null },
        { name: "덤벨 로우", image: null },
        { name: "시티드 케이블 로우", image: null },
        { name: "암 풀다운", image: null },
        { name: "티바 로우", image: null },
        { name: "데드리프트", image: null },
        { name: "백 익스텐션", image: null },
        { name: "어시스트 풀업", image: null }
    ],
    "어깨": [
        { name: "오버헤드 프레스", image: "images/shoulders.png" },
        { name: "덤벨 숄더 프레스", image: null },
        { name: "사이드 레터럴 레이즈", image: null },
        { name: "프론트 레이즈", image: null },
        { name: "벤트오버 레터럴 레이즈", image: null },
        { name: "페이스 풀", image: null },
        { name: "업라이트 로우", image: null },
        { name: "아놀드 프레스", image: null },
        { name: "비하인드 넥 프레스", image: null },
        { name: "숄더 프레스 머신", image: null }
    ],
    "팔": [
        { name: "바벨 컬", image: "images/arms.png" },
        { name: "덤벨 컬", image: null },
        { name: "해머 컬", image: null },
        { name: "이지바 컬", image: null },
        { name: "케이블 컬", image: null },
        { name: "트라이셉스 푸시 다운", image: null },
        { name: "라잉 트라이셉스 익스텐션", image: null },
        { name: "케이블 오버헤드 익스텐션", image: null },
        { name: "덤벨 킥백", image: null },
        { name: "클로즈 그립 벤치 프레스", image: null }
    ],
    "하체": [
        { name: "스쿼트", image: "images/legs.png" },
        { name: "레그 프레스", image: null },
        { name: "런지", image: null },
        { name: "레그 익스텐션", image: null },
        { name: "레그 컬", image: null },
        { name: "스티프 레그 데드리프트", image: null },
        { name: "브이 스쿼트", image: null },
        { name: "핵 스쿼트", image: null },
        { name: "힙 쓰러스트", image: null },
        { name: "카프 레이즈", image: null },
        { name: "이너 싸이", image: null },
        { name: "아웃 싸이", image: null }
    ],
    "복근": [
        { name: "크런치", image: "images/core.png" },
        { name: "레그 레이즈", image: null },
        { name: "행잉 레그 레이즈", image: null },
        { name: "플랭크", image: null },
        { name: "AB 슬라이드", image: null },
        { name: "러시안 트위스트", image: null },
        { name: "케이블 크런치", image: null },
        { name: "시티드 니업", image: null },
        { name: "바이시클 크런치", image: null }
    ]
};