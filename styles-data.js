/* FITON 스타일 카드 데이터(1차: 수동 등록 더미). shorts.js 가 읽는다. 서버 없음.
   - tabs: 메인 화면 분류 탭. 'today' 는 전체(오늘의 스타일).
   - plans: 구독 플랜과 월 입어보기 횟수. 결제 연동 전이라 선택은 이 기기 안에서만 적용된다.
   - styles[].items: 상의(top)/하의(bottom)/신발(shoe) 구성 상품. 옷장 기록과 같은 형식(cat·measureType·fabric·sizes)이라
     스타일을 고르면 그대로 옷장에 들어가 기존 핏 판정(fit-engine.js)에 연결된다. photo 가 비어 있으면 modelImage 를 상품 사진 대신 쓴다.
   - coupangUrl/naverUrl 이 비어 있으면 '구매 링크 준비중' 으로 안내한다.
   - modelImage 는 기본 AI 모델(여성) 착용 이미지. 남성 프로필도 1차에서는 같은 이미지를 본다. */
window.FITON = {
  slogan: '쇼츠에서 본 스타일, 바로 입어보기',
  tabs: [
    { key: 'today', label: '오늘' },
    { key: 'fall', label: '가을룩' },
    { key: 'work', label: '출근룩' },
    { key: 'date', label: '데이트룩' },
    { key: 'value', label: '가성비룩' }
  ],
  plans: {
    free: { name: '무료', limit: 3, price: '0원', features: ['기본 모델 착용 보기', '구매 링크', '내 아바타 입어보기 월 3회 체험'] },
    basic: { name: '베이직', limit: 30, price: '월 4,900원(예정)', features: ['내 아바타 입어보기 월 30회', '스타일 저장'] },
    premium: { name: '프리미엄', limit: 100, price: '월 9,900원(예정)', features: ['내 아바타 입어보기 월 100회', '고화질 저장', '전체 스타일'] },
    creator: { name: '크리에이터', limit: 300, price: '월 19,900원(예정)', features: ['내 아바타 입어보기 월 300회', '쇼츠용 이미지 저장'] }
  },
  styles: [
    {
      id: 'fall_work', title: '2026 가을 출근룩', tags: ['today', 'fall', 'work'],
      priceText: '39,000원부터', points: '베이지 트렌치 + 블랙 슬랙스 + 로퍼. 깔끔하고 단정한 오피스 핏',
      fitNote: '트렌치는 어깨가 살짝 떨어지는 세미오버, 슬랙스는 일자 정핏',
      modelImage: 'assets/styles/look1.jpg',
      coupangUrl: 'https://www.coupang.com/np/search?q=%ED%8A%B8%EB%A0%8C%EC%B9%98%EC%BD%94%ED%8A%B8',
      naverUrl: 'https://search.shopping.naver.com/search/all?query=%ED%8A%B8%EB%A0%8C%EC%B9%98%EC%BD%94%ED%8A%B8',
      items: {
        top: { name: '베이지 트렌치 코트', measureType: 'flat', fabric: 'normal', price: '89000', url: '', sizes: [
          { label: 'S', chest: '52', shoulder: '42', length: '105', sleeve: '58' }, { label: 'M', chest: '55', shoulder: '44', length: '107', sleeve: '59' }, { label: 'L', chest: '58', shoulder: '46', length: '109', sleeve: '60' }] },
        bottom: { name: '블랙 슬랙스', measureType: 'flat', fabric: 'normal', price: '39000', url: '', sizes: [
          { label: 'S', waist: '34', hip: '46', thigh: '28', rise: '28', inseam: '72' }, { label: 'M', waist: '36', hip: '48', thigh: '29', rise: '29', inseam: '73' }, { label: 'L', waist: '38', hip: '50', thigh: '30', rise: '30', inseam: '74' }] },
        shoe: { name: '블랙 로퍼', measureType: '', fabric: 'normal', price: '59000', url: '', sizes: [
          { label: '230' }, { label: '235' }, { label: '240' }, { label: '245' }, { label: '250' }] }
      }
    },
    {
      id: 'fall_cardigan', title: '가을 카디건 데이트룩', tags: ['today', 'fall', 'date', 'value'],
      priceText: '19,900원부터', points: '카멜 카디건 + 흰 티 + 연청 데님 + 흰 스니커즈. 편하면서 포근한 캐주얼',
      fitNote: '카디건은 여유 있는 오버핏, 데님은 스트레이트',
      modelImage: 'assets/styles/look2.jpg',
      coupangUrl: 'https://www.coupang.com/np/search?q=%EC%B9%B4%EB%94%94%EA%B1%B4',
      naverUrl: 'https://search.shopping.naver.com/search/all?query=%EC%B9%B4%EB%94%94%EA%B1%B4',
      items: {
        top: { name: '카멜 오버핏 카디건', measureType: 'flat', fabric: 'knit', price: '29900', url: '', sizes: [
          { label: 'FREE', chest: '60', shoulder: '52', length: '70', sleeve: '52' }] },
        bottom: { name: '연청 스트레이트 데님', measureType: 'flat', fabric: 'denim', price: '19900', url: '', sizes: [
          { label: '26', waist: '34', hip: '46', thigh: '28', rise: '28', inseam: '74' }, { label: '27', waist: '35', hip: '47', thigh: '29', rise: '28', inseam: '74' }, { label: '28', waist: '36', hip: '48', thigh: '30', rise: '29', inseam: '75' }, { label: '29', waist: '37.5', hip: '49.5', thigh: '31', rise: '29', inseam: '75' }] },
        shoe: { name: '화이트 스니커즈', measureType: '', fabric: 'normal', price: '49000', url: '', sizes: [
          { label: '230' }, { label: '235' }, { label: '240' }, { label: '245' }, { label: '250' }] }
      }
    },
    {
      id: 'knit_dress', title: '니트 원피스 데이트룩', tags: ['fall', 'date'],
      priceText: '35,000원부터', points: '버건디 골지 니트 롱 원피스 + 앵클부츠. 라인이 살아나는 가을 데이트 핏',
      fitNote: '몸에 붙는 슬림핏, 스판이 있어 한 사이즈 작게 입어도 됨',
      modelImage: 'assets/styles/look3.jpg',
      coupangUrl: '', naverUrl: '',
      items: {
        top: { name: '버건디 골지 니트 원피스', measureType: 'flat', fabric: 'knit', price: '35000', url: '', sizes: [
          { label: 'S', chest: '40', shoulder: '34', length: '120', sleeve: '58' }, { label: 'M', chest: '43', shoulder: '36', length: '122', sleeve: '59' }, { label: 'L', chest: '46', shoulder: '38', length: '124', sleeve: '60' }] },
        bottom: null,
        shoe: { name: '버건디 앵클부츠', measureType: '', fabric: 'normal', price: '69000', url: '', sizes: [
          { label: '230' }, { label: '235' }, { label: '240' }, { label: '245' }] }
      }
    },
    {
      id: 'active', title: '가성비 운동룩', tags: ['today', 'value'],
      priceText: '15,900원부터', points: '라벤더 레깅스 + 크롭 브라탑 + 바람막이 + 러닝화. 헬스장도 산책도 OK',
      fitNote: '레깅스는 하이웨이스트 압박핏, 바람막이는 여유핏',
      modelImage: 'assets/styles/look4.jpg',
      coupangUrl: 'https://www.coupang.com/np/search?q=%EB%A0%88%EA%B9%85%EC%8A%A4', naverUrl: '',
      items: {
        top: { name: '라이트 바람막이 재킷', measureType: 'flat', fabric: 'normal', price: '29900', url: '', sizes: [
          { label: 'S', chest: '50', shoulder: '42', length: '60', sleeve: '58' }, { label: 'M', chest: '53', shoulder: '44', length: '62', sleeve: '59' }, { label: 'L', chest: '56', shoulder: '46', length: '64', sleeve: '60' }] },
        bottom: { name: '하이웨이스트 레깅스', measureType: 'flat', fabric: 'stretch', price: '15900', url: '', sizes: [
          { label: 'S', waist: '28', hip: '38', thigh: '22', rise: '27', inseam: '68' }, { label: 'M', waist: '30', hip: '40', thigh: '23', rise: '28', inseam: '69' }, { label: 'L', waist: '32', hip: '42', thigh: '24', rise: '29', inseam: '70' }] },
        shoe: { name: '그레이 러닝화', measureType: '', fabric: 'normal', price: '59000', url: '', sizes: [
          { label: '230' }, { label: '235' }, { label: '240' }, { label: '245' }, { label: '250' }] }
      }
    },
    {
      id: 'home', title: '포근한 홈웨어 세트', tags: ['value'],
      priceText: '24,900원부터', points: '아이보리 플리스 파자마 상하 세트 + 룸슈즈. 집에서 쇼츠 찍기 좋은 편안함',
      fitNote: '상하 모두 넉넉한 여유핏',
      modelImage: 'assets/styles/look5.jpg',
      coupangUrl: '', naverUrl: 'https://search.shopping.naver.com/search/all?query=%ED%94%8C%EB%A6%AC%EC%8A%A4%20%ED%8C%8C%EC%9E%90%EB%A7%88',
      items: {
        top: { name: '플리스 파자마 상의', measureType: 'flat', fabric: 'normal', price: '24900', url: '', sizes: [
          { label: 'M', chest: '56', shoulder: '46', length: '68', sleeve: '58' }, { label: 'L', chest: '59', shoulder: '48', length: '70', sleeve: '59' }] },
        bottom: { name: '플리스 파자마 하의', measureType: 'flat', fabric: 'normal', price: '', url: '', sizes: [
          { label: 'M', waist: '32', hip: '52', thigh: '32', rise: '30', inseam: '72' }, { label: 'L', waist: '34', hip: '54', thigh: '33', rise: '31', inseam: '74' }] },
        shoe: { name: '룸슈즈', measureType: '', fabric: 'normal', price: '12900', url: '', sizes: [
          { label: '230' }, { label: '240' }, { label: '250' }] }
      }
    }
  ]
};
