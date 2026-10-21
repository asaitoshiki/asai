// カードに載せられる言語（日本語は常に表示するので含めない）
const LANGS = [
  { code: "en", label: "English", htmlLang: "en" },
  { code: "zhHans", label: "简体中文", htmlLang: "zh-Hans" },
  { code: "zhHant", label: "繁體中文", htmlLang: "zh-Hant" },
  { code: "ko", label: "한국어", htmlLang: "ko" },
];

const CATEGORIES = [
  { id: "common", label: "共通" },
  { id: "food", label: "飲食店" },
  { id: "shop", label: "物販・小売" },
  { id: "bath", label: "温泉・銭湯・宿" },
  { id: "sight", label: "観光地・寺社" },
];

// カード見出しと締めの一文
const HEADINGS = {
  title: {
    ja: "ご協力のお願い",
    en: "House Rules",
    zhHans: "注意事项",
    zhHant: "注意事項",
    ko: "이용 안내",
  },
  thanks: {
    ja: "ご協力ありがとうございます",
    en: "Thank you for your cooperation",
    zhHans: "感谢您的配合",
    zhHant: "感謝您的配合",
    ko: "협조해 주셔서 감사합니다",
  },
};

const RULES = [
  // 共通
  { id: "no-smoking", cat: "common", icon: "🚭", ja: "禁煙です", en: "No smoking", zhHans: "禁止吸烟", zhHant: "禁止吸菸", ko: "금연입니다" },
  { id: "no-photo", cat: "common", icon: "📵", ja: "撮影はご遠慮ください", en: "No photography", zhHans: "禁止拍照", zhHant: "禁止拍照", ko: "촬영을 삼가 주세요" },
  { id: "ask-photo", cat: "common", icon: "📸", ja: "撮影の際はスタッフにお声がけください", en: "Please ask staff before taking photos", zhHans: "拍照前请先询问工作人员", zhHant: "拍照前請先詢問工作人員", ko: "촬영 전에 직원에게 말씀해 주세요" },
  { id: "shoes-off", cat: "common", icon: "👟", ja: "ここで靴を脱いでください", en: "Please take off your shoes here", zhHans: "请在此处脱鞋", zhHant: "請在此處脫鞋", ko: "여기에서 신발을 벗어 주세요" },
  { id: "quiet", cat: "common", icon: "🤫", ja: "お静かにお願いします", en: "Please keep your voice down", zhHans: "请保持安静", zhHant: "請保持安靜", ko: "조용히 해 주세요" },
  { id: "queue", cat: "common", icon: "🚶", ja: "列に並んでお待ちください", en: "Please wait in line", zhHans: "请排队等候", zhHant: "請排隊等候", ko: "줄을 서서 기다려 주세요" },
  { id: "trash-home", cat: "common", icon: "🗑️", ja: "ゴミはお持ち帰りください", en: "Please take your trash home with you", zhHans: "请将垃圾带走", zhHant: "請將垃圾帶走", ko: "쓰레기는 가져가 주세요" },
  { id: "no-pets", cat: "common", icon: "🐕", ja: "ペットを連れての入店はできません", en: "No pets allowed", zhHans: "禁止携带宠物入内", zhHant: "禁止攜帶寵物入內", ko: "반려동물 동반 입장은 불가합니다" },
  { id: "cash-only", cat: "common", icon: "💴", ja: "お支払いは現金のみです", en: "Cash only", zhHans: "仅限现金支付", zhHant: "僅接受現金付款", ko: "현금 결제만 가능합니다" },
  { id: "no-tip", cat: "common", icon: "🙅", ja: "チップは必要ありません", en: "No tipping necessary", zhHans: "无需支付小费", zhHant: "無需支付小費", ko: "팁은 필요 없습니다" },
  { id: "toilet-paper", cat: "common", icon: "🚽", ja: "トイレットペーパーは便器に流してください", en: "Please flush toilet paper down the toilet", zhHans: "请将卫生纸丢入马桶冲走", zhHant: "請將衛生紙丟入馬桶沖走", ko: "화장지는 변기에 넣고 물을 내려 주세요" },

  // 飲食店
  { id: "wait-seat", cat: "food", icon: "🙋", ja: "こちらでお待ちください。お席へご案内します", en: "Please wait here to be seated", zhHans: "请在此等候，我们将为您安排座位", zhHant: "請在此等候，我們將為您安排座位", ko: "여기에서 기다려 주시면 자리로 안내해 드립니다" },
  { id: "one-order", cat: "food", icon: "🍽️", ja: "お一人様1品以上のご注文をお願いします", en: "Please order at least one item per person", zhHans: "每位客人请至少点一份餐", zhHant: "每位客人請至少點一份餐", ko: "1인당 1메뉴 이상 주문해 주세요" },
  { id: "no-outside-food", cat: "food", icon: "🥡", ja: "飲食物の持ち込みはご遠慮ください", en: "No outside food or drinks", zhHans: "请勿携带外食入内", zhHant: "請勿攜帶外食入內", ko: "외부 음식물 반입을 삼가 주세요" },
  { id: "time-limit", cat: "food", icon: "⏱️", ja: "混雑時はご利用時間を制限させていただきます", en: "A time limit applies when we are busy", zhHans: "客满时将限制用餐时间", zhHant: "客滿時將限制用餐時間", ko: "혼잡 시에는 이용 시간이 제한됩니다" },
  { id: "return-tray", cat: "food", icon: "🍱", ja: "食べ終わった食器は返却口へお戻しください", en: "Please return your tray when finished", zhHans: "用餐后请将餐具送回回收处", zhHant: "用餐後請將餐具送回回收處", ko: "다 드신 식기는 반납구에 가져다 주세요" },
  { id: "ticket-machine", cat: "food", icon: "🎫", ja: "先に券売機で食券をお買い求めください", en: "Please buy a meal ticket from the machine first", zhHans: "请先在售票机购买餐券", zhHant: "請先在售票機購買餐券", ko: "먼저 자판기에서 식권을 구입해 주세요" },
  { id: "reserved-only", cat: "food", icon: "📅", ja: "ご予約のお客様のみご案内しています", en: "Reservations only", zhHans: "仅接待预约顾客", zhHant: "僅接待預約顧客", ko: "예약 손님만 이용 가능합니다" },

  // 物販・小売
  { id: "no-touch", cat: "shop", icon: "✋", ja: "商品には手を触れないでください", en: "Please do not touch the merchandise", zhHans: "请勿触摸商品", zhHant: "請勿觸摸商品", ko: "상품을 만지지 말아 주세요" },
  { id: "no-eat-in-store", cat: "shop", icon: "🍦", ja: "店内での飲食はご遠慮ください", en: "No eating or drinking in the store", zhHans: "店内禁止饮食", zhHant: "店內禁止飲食", ko: "매장 내 취식을 삼가 주세요" },
  { id: "bag", cat: "shop", icon: "🛍️", ja: "レジ袋は有料です", en: "Plastic bags are not free", zhHans: "购物袋需另付费", zhHant: "購物袋需另外付費", ko: "비닐봉지는 유료입니다" },

  // 温泉・銭湯・宿
  { id: "wash-first", cat: "bath", icon: "🚿", ja: "湯船に入る前に体を洗ってください", en: "Please wash your body before entering the bath", zhHans: "入浴前请先清洗身体", zhHant: "入浴前請先清洗身體", ko: "탕에 들어가기 전에 몸을 씻어 주세요" },
  { id: "no-towel-bath", cat: "bath", icon: "🧺", ja: "タオルを湯船に入れないでください", en: "Do not put towels in the bath", zhHans: "请勿将毛巾放入浴池", zhHant: "請勿將毛巾放入浴池", ko: "수건을 탕에 넣지 마세요" },
  { id: "no-swimsuit", cat: "bath", icon: "🩱", ja: "水着での入浴はできません", en: "Swimsuits are not allowed in the bath", zhHans: "禁止穿泳衣入浴", zhHant: "禁止穿泳衣入浴", ko: "수영복을 입고 입욕할 수 없습니다" },
  { id: "tattoo", cat: "bath", icon: "🐉", ja: "タトゥーのある方はご入浴いただけません", en: "Guests with tattoos may not use the bath", zhHans: "有纹身者谢绝入浴", zhHant: "有刺青者謝絕入浴", ko: "문신이 있으신 분은 입욕하실 수 없습니다" },
  { id: "dry-off", cat: "bath", icon: "💧", ja: "脱衣所に戻る前に体を拭いてください", en: "Please dry yourself before returning to the changing room", zhHans: "返回更衣室前请擦干身体", zhHant: "返回更衣室前請擦乾身體", ko: "탈의실로 돌아가기 전에 몸을 닦아 주세요" },

  // 観光地・寺社
  { id: "no-walk-eat", cat: "sight", icon: "🍡", ja: "食べ歩きはご遠慮ください", en: "Please do not eat while walking", zhHans: "请勿边走边吃", zhHant: "請勿邊走邊吃", ko: "걸으면서 먹지 말아 주세요" },
  { id: "private", cat: "sight", icon: "🚧", ja: "私有地のため立ち入りできません", en: "Private property. No entry", zhHans: "私人土地，禁止进入", zhHant: "私人土地，禁止進入", ko: "사유지이므로 출입할 수 없습니다" },
  { id: "no-drone", cat: "sight", icon: "🛸", ja: "ドローンの飛行は禁止です", en: "No drones", zhHans: "禁止使用无人机", zhHant: "禁止使用無人機", ko: "드론 비행 금지" },
  { id: "no-sit", cat: "sight", icon: "🪨", ja: "ここに座ったり登ったりしないでください", en: "Please do not sit or climb here", zhHans: "请勿在此坐卧或攀爬", zhHant: "請勿在此坐臥或攀爬", ko: "여기에 앉거나 올라가지 마세요" },
  { id: "hat-off", cat: "sight", icon: "🧢", ja: "お堂の中では帽子をお取りください", en: "Please remove your hat inside the hall", zhHans: "进入殿内请脱帽", zhHant: "進入殿內請脫帽", ko: "법당 안에서는 모자를 벗어 주세요" },
];
