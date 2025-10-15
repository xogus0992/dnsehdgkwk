// exercises.js

// 각 부위를 대표하는 기본 이미지 경로
const bodyPartImages = {
    "가슴": "images/chest.png",
    "등": "images/back.png",
    "어깨": "images/shoulders.png",
    "하체": "images/legs.png",
    "팔": "images/arms.png",
    "복근/코어": "images/core.png"
};

// 기본으로 제공되는 운동 목록
// image: null 로 된 곳은 해당 부위의 대표 이미지(bodyPartImages)가 자동으로 사용됩니다.
const exercisesData = {
    "가슴": [
        { name: "벤치 프레스", image: "images/chest.png" },
        { name: "덤벨 프레스", image: null },
        { name: "덤벨 플라이", image: null },
        { name: "케이블 플라이", image: null },
        { name: "딥스", image: "images/arms.png" }, // 딥스는 팔 이미지를 우선 사용
        { name: "체스트 프레스 머신", image: null }
    ],
    "등": [
        { name: "풀업", image: "images/back.png" },
        { name: "랫 풀다운", image: null },
        { name: "바벨 로우", image: null },
        { name: "덤벨 로우", image: null },
        { name: "스트레이트 암 풀다운", image: null },
        { name: "컨벤셔널 데드리프트", image: null },
        { name: "루마니안 데드리프트", image: null },
        { name: "숄더 슈러그", image: null },
        { name: "티 바 로우", image: null },
        { name: "시티드 케이블 로우", image: null },
        { name: "인버티드 로우", image: null }
    ],
    "어깨": [
        { name: "오버헤드 프레스", image: "images/shoulders.png" },
        { name: "덤벨 숄더 프레스", image: null },
        { name: "사이드 레터럴 레이즈", image: null },
        { name: "벤트 오버 레터럴 레이즈", image: null },
        { name: "페이스 풀", image: null },
        { name: "리버스 케이블 플라이", image: null },
        { name: "프론트 레이즈", image: null },
        { name: "업라이트 로우", image: null }
    ],
    "팔": [
        { name: "바벨 컬", image: null },
        { name: "덤벨 컬", image: null },
        { name: "해머 컬", image: null },
        { name: "라잉 트라이셉스 익스텐션", image: null },
        { name: "트라이셉스 푸시 다운", image: null },
        { name: "딥스", image: "images/arms.png" }, // 딥스는 팔, 가슴 공통
        { name: "케이블 오버헤드 익스텐션", image: null },
        { name: "컨센트레이션 컬", image: null },
        { name: "프리처 컬", image: null }
    ],
    "하체": [
        { name: "스쿼트", image: "images/legs.png" },
        { name: "레그 프레스", image: null },
        { name: "런지", image: null },
        { name: "데드리프트", image: null },
        { name: "힙 쓰러스트", image: null },
        { name: "힙 브릿지", image: null },
        { name: "레그 익스텐션", image: null },
        { name: "레그 컬", image: null },
        { name: "카프 레이즈", image: null },
        { name: "스텝업", image: null },
        { name: "불가리안 스플릿 스쿼트", image: null },
        { name: "글루트 킥백", image: null }
    ],
    "복근/코어": [
        { name: "크런치", image: "images/core.png" },
        { name: "레그 레이즈", image: null },
        { name: "V-니업", image: null },
        { name: "러시안 트위스트", image: null },
        { name: "플랭크", image: null },
        { name: "드로잉인", image: null },
        { name: "사이드 플랭크", image: null },
        { name: "마운틴 클라이머", image: null },
        { name: "버드독", image: null },
        { name: "케이블 크런치", image: null }
    ]
};