/* 偶然エンジン(層2 + 層3の型) — 偶然イケメンメーカー V4.6.4 から機械生成
   extract_person.py が generateCharacter と buildPrompt の依存閉包を切り出し、
   build.py が手順1・2・2b・6b・6c を当てたもの。**手で編集しない。**
   決定G: グループ・友人ペアの生成20関数は閉包から除外ずみ */
let RNG = () => { throw new Error('setSeed() を先に呼ぶこと。種なしの生成は再現できない'); };
const rand = () => RNG();
export function setSeed(seed){
  let a = seed | 0;
  RNG = function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  resetDecks();
}
let CFG = { initial:{}, fixed:{}, face:null, person:null, strictFace:false };
export function setConfig(c){ CFG = Object.assign({initial:{},fixed:{},face:null,person:null,strictFace:false}, c); }
  const rnd = (min,max,step=1)=> Math.round((min + rand()*(max-min))/step)*step;

  const randomNormal = (mean=0, sd=1) => {
    let u=0, v=0;
    while(u===0) u=rand();
    while(v===0) v=rand();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const shuffleInPlace = arr => {
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(rand()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  };

  const makeBalancedMeasurementDeck = (min,max,targetMean,sdMin,sdMax) => {
    const lo=Math.round(min*10), hi=Math.round(max*10), mean10=Math.round(targetMean*10);
    const targetSum=mean10*100;
    for(let attempt=0;attempt<400;attempt++){
      const targetSd=(sdMin+0.05+rand()*Math.max(0.01,(sdMax-sdMin)-0.10))*10;
      const values=[];
      let drawGuard=0;
      while(values.length<100 && drawGuard++<30000){
        const x=randomNormal(mean10,targetSd);
        if(x>=lo && x<=hi) values.push(Math.max(lo,Math.min(hi,Math.round(x))));
      }
      if(values.length<100) continue;
      let diff=targetSum-values.reduce((a,b)=>a+b,0);
      let guard=0;
      while(diff!==0 && guard++<100000){
        const dir=diff>0 ? 1 : -1;
        let changed=false;
        for(let tries=0;tries<300;tries++){
          const i=Math.floor(rand()*values.length);
          const nv=values[i]+dir;
          if(nv>=lo && nv<=hi){
            values[i]=nv;
            diff-=dir;
            changed=true;
            break;
          }
        }
        if(!changed) break;
      }
      if(diff!==0) continue;
      const sd=Math.sqrt(values.reduce((sum,v)=>sum+Math.pow(v-mean10,2),0)/values.length)/10;
      if(sd>=sdMin && sd<=sdMax){
        return shuffleInPlace(values.map(v=>Number((v/10).toFixed(1))));
      }
    }
    // フォールバック：平均を厳密に保つ対称ペア方式
    const pairCount=50;
    const maxDistance=Math.min(targetMean-min,max-targetMean);
    const targetSd=sdMin + rand()*(sdMax-sdMin);
    const raw=Array.from({length:pairCount},()=>Math.max(0.02,Math.abs(randomNormal())));
    const rmsForScale = scale => Math.sqrt(raw.reduce((sum,z)=>{
      const d=Math.min(maxDistance,z*scale);
      return sum+d*d;
    },0)/pairCount);
    let scaleLo=0, scaleHi=maxDistance*20;
    for(let i=0;i<80;i++){
      const mid=(scaleLo+scaleHi)/2;
      if(rmsForScale(mid)<targetSd) scaleLo=mid; else scaleHi=mid;
    }
    const deck=[];
    raw.forEach(z=>{
      const d=Math.round(Math.min(maxDistance,z*((scaleLo+scaleHi)/2))*10)/10;
      deck.push(Number((targetMean-d).toFixed(1)), Number((targetMean+d).toFixed(1)));
    });
    return shuffleInPlace(deck);
  };

  const C_MEASUREMENT_VALUES = [
    '頭を出せずすっぽり',
    '頭を出せるけどすっぽり',
    '頭の先が少し出ている',
    '頭の半分が出ている',
    '頭の根元らへんまで出ている',
    '頭が完全に出ている'
  ];

  const C_MEASUREMENT_EN = {
    '頭を出せずすっぽり':'Fully covered; the head cannot be exposed',
    '頭を出せるけどすっぽり':'The head can be exposed, but is currently fully covered',
    '頭の先が少し出ている':'Only the tip of the head is slightly exposed',
    '頭の半分が出ている':'Half of the head is exposed',
    '頭の根元らへんまで出ている':'Exposed to around the base of the head',
    '頭が完全に出ている':'The head is fully exposed'
  };

  const makeCMeasurementDeck = () => shuffleInPlace(
    C_MEASUREMENT_VALUES.flatMap((value,index)=>Array(index===0 || index===5 ? 10 : 20).fill(value))
  );
  let measurementDeckState = null;
  function resetDecks(){
  
  measurementDeckState = {
    A:makeBalancedMeasurementDeck(5.0,10.5,8.0,1.5,2.0),
    B:makeBalancedMeasurementDeck(9.0,19.0,13.5,1.5,3.5),
    C:makeCMeasurementDeck(),
    indexA:0,indexB:0,indexC:0
  };
  }


  const drawProfileMeasurement = key => {
    const deck=measurementDeckState[key];
    const indexKey='index'+key;
    const value=deck[measurementDeckState[indexKey] % deck.length];
    measurementDeckState[indexKey]=(measurementDeckState[indexKey]+1)%deck.length;
    return value;
  };

  const gaussRand = (m,s) => { let u=0,v=0; while(!u)u=rand(); while(!v)v=rand(); return m + s*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

  const deriveMeasurementB = a => { const A=Number(a)||7; let B=gaussRand(13.3,1.9); B=Math.max(9.0, Math.min(18.0, B)); B=Math.max(B, A*1.05); return Math.round(B*10)/10; }; // B〜N(13.3,1.9) 9割が10〜16.5・A比は反比例

  const ensureProfileMeasurements = c => {
    if(!c) return;
    const invalidA=!Number.isFinite(Number(c.measurementA)) || Number(c.measurementA)<5 || Number(c.measurementA)>10.5;
    const A0 = Number(c.measurementA);
    const invalidB=!Number.isFinite(Number(c.measurementB)) || Number(c.measurementB) < Math.max(9.0, A0*1.05) - 0.05 || Number(c.measurementB) > 18.0;
    const invalidC=!C_MEASUREMENT_VALUES.includes(c.measurementC);
    if(invalidA) c.measurementA=drawProfileMeasurement('A');
    if(invalidB) c.measurementB=deriveMeasurementB(c.measurementA);
    if(invalidC) c.measurementC=drawProfileMeasurement('C');
  };

  const profileMeasurementCLabel = (value, english=false) => english ? (C_MEASUREMENT_EN[value] || value) : value;

  const pick = arr => arr[Math.floor(rand()*arr.length)];

  const weighted = entries => { const total = entries.reduce((a,b)=>a+b[1],0); let n=rand()*total; for(const [v,w] of entries){n-=w; if(n<=0) return v;} return entries[entries.length-1][0]; };

  const uniqId = () => 'p' + Math.floor(rand() * 0xFFFFFFFF).toString(36) + Math.floor(rand() * 0xFFFFFFFF).toString(36);

  const pools = {
    surnames:['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤','吉田','山田','佐々木','山口','松本','井上','木村','林','斎藤','清水','山崎','森','池田','橋本','阿部','石川','山下','中島','石井','小川','前田','岡田','長谷川','藤田','後藤','近藤','村上','遠藤','青木','坂本','斉藤','福田','太田','西村','藤井','金子','岡本','藤原','三浦','中野','中川','原田','松田','竹内','小野','田村','中山','和田','石田','森田','上田','原','内田','柴田','酒井','宮崎','横山','高木','安藤','宮本','大野','小島','谷口','今井','工藤','高田','増田','丸山','杉山','村田','大塚','新井','小山','平野','藤本','河野','上野','野口','武田','松井','千葉','岩崎','菅原','木下','久保','佐野','野村','松尾','菊地','杉本','市川','古川','大西','島田','水野','桜井','高野','渡部','吉川','山内','西田','飯田','西川','小松','北村','安田','五十嵐','川口','平田','関','服部'],
    surnamesRare:['阿志賀','勅使河原','東雲','五十君','薬袋','栗花落','四月一日','一尾','神','綾小路'],
    givenByEra:{
      s1880:['清','茂','勇','正雄','武雄','辰雄','幸吉','銀次郎','留吉','寅吉','栄吉','千代吉'],
      s1900:['清','勇','正','茂','三郎','正一','武','實','幸雄','正雄','健三','留次郎'],
      s1920:['清','勇','弘','實','正','武','茂','三郎','正夫','勝','進','昭二'],
      s1940:['博','茂','勇','進','清','弘','隆','修','昭','正','勝','実'],
      s1950:['誠','隆','茂','博','豊','明','浩','修','勝','秀樹','健一','徹'],
      s1960:['誠','浩','剛','学','健一','直樹','秀樹','徹','淳','聡','英樹','浩二'],
      s1970:['誠','哲也','剛','直樹','健一','大輔','学','淳','崇','智之','秀幸','雅之'],
      s1980:['大輔','直樹','健太','翔太','達也','亮','拓也','和也','智也','雄太','慎太郎','啓太'],
      s1990:['翔太','拓也','健太','翔','大輝','亮太','駿','大樹','直人','大地','海斗','蓮'],
      s2000:['翔','大翔','拓海','翔真','蓮','颯太','樹','大和','陸','悠斗','悠人','陽向'],
      s2010:['蓮','湊','悠真','陽翔','颯真','大翔','蒼','律','新','陸','碧','朝陽','結翔','旭']
    },
    mbtis:['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'],
    ages:[18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,35,38,40,42,45,48,50,53,55,58,60,63,65,68,70,73,75,78,80],
    eraYears:Array.from({length:2043-1900+1},(_,i)=>1900+i),
    nationalities:['日本','韓国','中国','台湾','ロシア','アメリカ','カナダ','イギリス','フランス','ドイツ','イタリア','スペイン','スウェーデン','ポーランド','トルコ','ブラジル','メキシコ','アルゼンチン','タイ','ベトナム','フィリピン','インドネシア','マレーシア','インド','モンゴル','ナイジェリア','オーストラリア'],
    ethnicities:['日本人','韓国系','東アジア系','中国系','東南アジア系','南アジア系','白人系','スラブ系','北欧系','南欧系','黒人系','中東系','ラテン系','中央アジア系','ミックス'],
    roles:['救急隊員','防衛大学校学生','悠々自適（定年後）','お笑い芸人','声優','YouTuber','プロゲーマー','書道家','パティシエ','寿司職人','ラーメン店店主','僧侶','古着屋店主','大学生','大学1年生','高校卒業直後（進路準備中）','浪人生（予備校生）','大学院生','専門学校生','就活中の大学生','営業職','経理・事務職','企画職','公務員','銀行員','商社勤務','コンサルタント','不動産営業','ITエンジニア','Webデザイナー','ゲーム開発者','動画クリエイター','アプリ開発者','看護師','理学療法士','薬剤師','研修医','介護士','高校教師','塾講師','保育士','大学研究員','体育教師','アパレル店員','カフェ店員','美容師','バーテンダー','ホテルスタッフ','飲食店店長','書店員','コンビニ店長','自動車整備士','電気工事士','大工','建築士','工場勤務','配送ドライバー','農家','漁師','グラフィックデザイナー','カメラマン','ミュージシャン','編集者','イラストレーター','映像ディレクター','消防士','警察官','自衛官','ジムトレーナー','スポーツインストラクター','モデル','俳優','プロスポーツ選手','喫茶店マスター','新聞記者','鉄道職員','アナウンサー','小学校教員','中学校教員','ライフガード','プール監視員（バイト）','医師','歯科医師','弁護士','公認会計士','警備員','タクシー運転手','バス運転手','電車運転士','パイロット','郵便配達員','引越しスタッフ','スーパー店員','家電量販店店員','花屋店員','図書館司書','シェフ（洋食）','理容師','自動車教習所教官','銭湯・サウナ店スタッフ'],
    glasses:['なし','黒縁メガネ','細フレームメガネ','メタルフレームメガネ','丸メガネ','ハーフリムメガネ','縁なしメガネ','金縁メガネ'],
    occInfluences:['服装・場面・体型に反映','場面のみに反映','影響なし'],
    vibes:['ランダム','清潔感のある社会人系','爽やか系','真面目系','ワイルド系','スポーツ系','きれいめ系','カジュアル系','韓国風','中性系','大人っぽい系','やりらふぃー系','ストリート系','塩顔系','犬系男子','クール系','ミステリアス系','サブカル系','古着系','清楚系','陽キャ大学生系','レトロ系','モード系','アウトドア系','バンドマン系','紳士系','ギャル男系','普通系','ブサイク系','地味系','オタク系','ヤンキー系','ホスト系','おじさん系','メガネ知的系'],
    ageLooks:['実年齢相応','やや若く見える','少し大人びて見える','年相応の渋さがある','穏やかな年配の風格'],
    facePresets:['普通顔','爽やか知的アナウンサー系','大学サッカー部系','スーツ映え社会人系','高身長モデル系','親しみやすい大学生系','体育会系スポーツ男子','清潔感のある若手俳優風','落ち着いた大人系','韓国アイドル風','日本の若手俳優風','ワイルド系','真面目系','中性系','やりらふぃー系','塩顔系','犬系男子風','クール系','ミステリアス系','サブカル系','やんちゃ系','ホスト系','おじさん系','ブサイク系','昭和顔（濃い顔立ち）','しょうゆ顔','ソース顔','彫りの深い縄文系','あっさり弥生系','たれ目系','つり目系','平成アイドル風','弟系童顔（笑顔が武器）','垂れ目パピー系','愛嬌くしゃ笑い顔'],
    bodyTypes:['標準体型','中肉中背','やせ型','細身','華奢な体型','細マッチョ','隠れ筋肉質','逆三角形体型','痩せマッチョ','引き締まったスポーツ体型','サッカー選手体型','水泳選手体型','バスケットボール選手体型','ラグビー選手体型','柔道家体型','陸上短距離選手体型','陸上長距離選手体型','クライマー体型','スーツ映え体型','高身長モデル体型','筋肉質','がっしり体型','骨太体型','肩幅広め体型','腹だけぽっちゃり','ビール腹','ぽっちゃり','脚が長い'],
    faceLines:['自然なフェイスライン','シャープなフェイスライン','しっかりしたフェイスライン','柔らかいフェイスライン','逆三角形に近いフェイスライン','やや角ばったフェイスライン','面長のフェイスライン','丸顔寄りのフェイスライン','ベース型のフェイスライン','卵型のフェイスライン','ホームベース型のフェイスライン','卵型寄りのベース型（顎まわりに厚み）'],
    eyes:['力強い目元','優しい目元','涼しげな目元','知的な目元','眠たげな目元','鋭い目元','親しみやすい目元','落ち着いた目元'],
    eyelids:['一重','奥二重','末広二重','平行二重','左右で異なるまぶた（片方だけ二重）'],
    eyeShapes:['標準的な目の形','切れ長の目','アーモンド形の目','丸みのある目','たれ目気味の目','つり目気味の目','細めの目'],
    eyeBalances:['標準的な黒目の位置','黒目が大きめで白目が控えめ','やや三白眼気味（黒目が上寄りで下に白目がのぞく）','三白眼（黒目が小さめで左右と下に白目が見える）','上三白眼気味（黒目が下寄りで上に白目がのぞく）'],
    eyebrows:['太めの直線眉','太めのアーチ眉','標準的な直線眉','標準的なゆるいアーチ眉','やや細めの直線眉','やや細めのアーチ眉','眉尻の下がった優しい眉','への字型の眉','眉山のはっきりした眉','短めで力強い眉','眉尻の上がった太めの直線眉','整えたシャープな直線眉','眉尻の上がったアーチ眉'],
    eyebrowGrooms:['自然なまま','整えた形','きっちりライン取り','剃り込み跡あり'],
    eyebrowGaps:['眉間は近め','標準的な眉間','眉間は離れ気味'],
    eyebrowDensities:['濃い眉','標準的な濃さの眉','薄めの眉','とても濃い眉','やや濃い眉','やや薄めの眉','薄い眉'],
    eyelashes:['短めで控えめなまつ毛','標準的な長さのまつ毛','やや長めのまつ毛','長めで濃いまつ毛','細くまばらなまつ毛'],
    jawChins:['標準的な顎先','尖り気味の顎先','丸みのある顎先','しっかりした顎先','軽く割れた顎先','丸みのあるしっかりした顎先'],
    jawAngles:['エラは目立たない','ほどよく張ったエラ','はっきり張ったエラ'],
    ears:['標準的な耳','立ち耳','寝た耳','福耳','小ぶりな耳','柔道耳（軽度の耳介の厚み）'],
    foreheads:['標準的な広さの額','狭めの額','広めの額'],
    hairlines:['直線的な生え際','ゆるいM字の生え際','富士額の生え際','やや後退気味の生え際'],
    cheeks:['標準的な頬','頬骨が高めの頬','ややこけた頬','ふっくらした頬','ハリのある引き締まった頬','子供の頃の面影が残る丸い頬','餅のように柔らかそうな頬','薄くシャープな頬','頬骨の下がすっと影になる頬','年齢なりに少し位置が下がった頬','たるみはじめた頬'],
    dimples:['えくぼなし','片側にえくぼ','両側にえくぼ'],
    moles:['ほくろなし','目尻の下の泣きぼくろ','口元のほくろ','顎のほくろ','頬のほくろ','首すじのほくろ'],
    hairTextures:['直毛','やわらかい猫っ毛','硬めの剛毛','ゆるいくせ毛','強いくせ毛','強いカールのアフロテクスチャ','細かいカールヘア'],
    eyeBagsPool:['クマなし','うっすらとした目の下のクマ'],
    adamsApples:['のどぼとけは控えめ','標準的なのどぼとけ','のどぼとけがはっきり出ている'],
    lipTones:['血色のよい唇','標準的な血色の唇','やや乾燥気味の唇'],
    browRidges:['彫りは標準的','彫りが深い眉まわり','ややフラットな眉まわり'],
    facialHairGrooms:['きれいに整えている','自然に整えている','伸ばしっぱなし気味'],
    tearBags:['なし','控えめ','自然','ややはっきり','ふっくら','笑うと少し出る'],
    nose:['自然な鼻筋','通った鼻筋','高めの鼻筋','すっきりした鼻筋','しっかりした鼻','控えめで自然な鼻','鼻先の丸い鼻','わし鼻気味の鼻','小鼻の張った鼻','団子鼻気味の鼻','高さ控えめで平たい鼻','鼻筋の細い鼻'],
    mouth:['自然な笑顔','控えめな微笑み','落ち着いた表情','爽やかな笑顔','誠実な表情','余裕のある表情','穏やかな真顔','凛々しい表情','口角だけ軽く上げた表情','落ち着いた無表情'],
    lips:['薄い唇','やや薄い唇','標準的な厚さの唇','厚めの唇','上唇が薄く下唇が厚い唇','口角のきゅっと上がった唇','引き締まった一文字の唇','ふっくらした唇'],
    mouthPos:['標準的な位置・大きさの口','やや大きめの口','小さめの口','鼻と口の距離が近い口','鼻と口の距離がやや長い口','口角の横幅が広い口'],
    faceSpacings:['求心顔（目鼻口が中心に寄った配置）','やや求心寄りの配置','標準的な配置','やや遠心寄りの配置','遠心顔（パーツが外側に離れた配置）','はっきり求心的な配置（自然範囲の上限）','はっきり遠心的な配置（自然範囲の上限）'],
    faceRatios:['標準的なバランスの比率','目が大きめで存在感のある比率','目が小さめ・切れ長寄りの比率','鼻の存在感が強い比率','口が大きめではっきりした比率','口が小さめの比率','全体に小づくりな比率','全体に大ぶりでくっきりした比率'],
    faceAsyms:['左右対称に近い整った顔','ほぼ対称（ごく自然な左右差）','わずかな左右差がある自然な顔','眉の高さに少し左右差がある顔','口角の上がり方に少し左右差がある顔','目の大きさにわずかな左右差がある顔','左右で目の開き方が少し違う顔','笑うと片側の口角が先に上がる顔','鼻筋がごくわずかに湾曲した顔'],
    shoulderWidths:['狭め','普通','広め','非常に広い'],
    waistPositions:['低め','標準','高め'],
    legLengths:['標準','やや長い','長い','非常に長い'],
    armLengths:['標準','やや長い','長い'],
    frames:['コンパクト','標準','大柄','大型'],
    neckLengths:['短め','標準','やや長い'],
    neckImpressions:['すっきりした首すじ','標準的な首','がっしりした首'],
    limbSizes:['小さめ','標準','大きめ'],
    hipShapes:['標準的な丸みの臀部','筋肉質で引き締まった臀部','平たくすっきりした臀部','骨盤幅が広めのどっしりした臀部','小ぶりでコンパクトな臀部','丸みのしっかりした臀部'],
    teethAligns:['整った歯列','ほぼ整った歯列','前歯がわずかに重なる歯列','すきっ歯気味の歯列','八重歯が少し覗く歯列','矯正後のきれいな歯列','前歯2本がやや大きめの歯列','下の前歯に軽い重なりがある歯列','前歯がわずかに前傾した歯列','矯正中（目立ちにくい矯正装置）'],
    teethColors:['自然な白さの歯','やや黄味がかった自然な色の歯','白く手入れされた歯','うっすらした着色のある歯','生まれつきやや灰味・縞状のトーンがある歯','前歯1本だけ色味がわずかに異なる歯（差し歯・補綴由来）'],
    skinDetails:['血色のよい上気した頬','なし（クリアな肌）','頬にそばかす','鼻まわりに薄いそばかす','額に小さなニキビ','頬にニキビ跡（薄い凹凸）','口元のほくろ','目元の泣きぼくろ','首筋のほくろ','頬の小さなほくろ','うっすら青ひげ（剃り跡）','日焼けによる肌ムラ','えくぼ','左頬の薄い傷跡','眉尻の剃り込み跡','目の下のうっすらしたクマ','頬の自然な赤み','額の皮脂感（自然なテカリ）','頬の毛穴感（自然な質感）','腕まくり日焼けの跡','ゴーグル跡の日焼けムラ','眉間のしわ','目尻の笑いじわ','ほうれい線','頬の薄いシミ','首のしわ'],
    skin:['自然な肌質','健康的な肌質','透明感のある肌','ほんのり日焼けした肌','少し日焼けした肌','小麦色に日焼けした肌','しっかり日焼けした肌','屋外仕事のこんがり日焼け肌','マットで自然な肌','スポーツ経験者らしい肌','色白の肌','非常に色白の肌','浅黒い肌','褐色の肌','深い褐色の肌','血色のよい肌'],
    facialHair:['なし','ごく薄い青ひげ','自然な青ひげ','短い無精ひげ','整えた短いひげ','口ひげ','あごひげ','口ひげ＋あごひげ','ワイルドめのひげ'],
    hairStyles:['短髪','アップバング','センターパート','サイドパート','マッシュ','ソフトツーブロック','ビジネス短髪','韓国風センターパート','ニュアンスパーマ','ツイストパーマ','スパイラルパーマ','波巻きパーマ','ウルフミディアム','ロング寄りミディアム','七三分け','ナチュラルテーパー短髪','ショートフェード','タイトなアフロショート','ツイストショート','マンバン','スキンフェード','ローフェード','フェード×ツイストスパイラル','バーバースタイル（七三フェード）','クロップスタイル','マッシュウルフ','ソフトモヒカン','アシメショート'],
    hairColors:['黒','ブルーブラック','ネイビーブラック','黒に近いダークブラウン','ダークアッシュ','ダークチェリーブラウン','チョコレートブラウン','赤みブラウン','マロンブラウン','カーキブラウン','自然な茶髪','アッシュブラウン','オリーブアッシュ','グレージュ','ブルージュ','ラベンダーグレージュ','ミルクティーベージュ','ナチュラルブロンド','ダークブロンド','明るめブラウン','オレンジブラウン','ハイトーンアッシュ','シルバーアッシュ','ブリーチベージュ','金髪（ブリーチ）','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'],
    outfitTypes:['職業制服','書生風スタイル（着物＋袴＋学帽）','着物と羽織','国民服風','開襟シャツスタイル','三つ揃いスーツ','紺スーツ','黒スーツ','グレースーツ','大学生カジュアル','社会人カジュアル','スポーツ練習着','学生服（学ラン）','学生服（ブレザー）','制服風コーデ','私服通学風','ジャケットスタイル','ストリート系','きれいめカジュアル','古着系','ワークマン系機能カジュアル','セットアップカジュアル','アメカジ','ゴープコア','ジャケパン','ビジネスカジュアル','オフィスカジュアル','白シャツ×黒パン','きれいめ私服出勤','ワークウェアスタイル','シティボーイ','ノームコア','Y2K','テックウェア','オールブラック・ミニマル','フレンチカジュアル','ブリティッシュトラッド','サーフ系','裏原系','お兄系','渋谷系','きれいめストリート','ワンマイルウェア','和カジュアル'],
    outfitBrands:['UNIQLO','GU','無印良品','ZARA','H&M','BEAMS','UNITED ARROWS','SHIPS','GLOBAL WORK','nano・universe','URBAN RESEARCH','JOURNAL STANDARD','Calvin Klein','POLO RALPH LAUREN','TOMMY HILFIGER','LACOSTE','AOKI','ORIHICA','SUIT SELECT','THE SUIT COMPANY','P.S.FA','KANKO','TOMBOW','EAST BOY','OLIVE des OLIVE School','NIKE','adidas','MIZUNO','ASICS','PUMA','New Balance','UNDER ARMOUR','Champion','THE NORTH FACE','VAN','JUN','D\'URBAN','TAKEO KIKUCHI','MEN\'S BIGI','COMME des GARÇONS HOMME','A BATHING APE','UNDERCOVER','Stüssy','GAP','洋服の青山','はるやま','無地ノーブランド'],
    jackets:['指定なし','テーラードジャケット','学生ブレザー','学ラン上着','ステンカラーコート','チェスターコート','MA-1','スタジャン','カーディガン','パーカー','デニムジャケット','ナイロンジャケット','スポーツジャケット'],
    tops:['白シャツ','サックスブルーシャツ','制服用ワイシャツ','ブレザー用シャツ','ネクタイ付きシャツ','無地Tシャツ','オーバーサイズTシャツ','ロングスリーブTシャツ','ポロシャツ','ニット','カーディガンインナー','スウェット','パーカー','スポーツシャツ','ゲームシャツ'],
    bottoms:['黒スラックス','紺スラックス','グレースラックス','学生スラックス','ブレザー用スラックス','学ラン用ズボン','チノパン','ワイドパンツ','カーゴパンツ','デニム','ストレートデニム','ジャージパンツ','ナイロンパンツ','黒ショートパンツ','ハーフパンツ'],
    boxerBrands:['指定しない','Calvin Klein','EMPORIO ARMANI','TOM FORD','ANVIL','UNIQLO','BODY WILD','POLO RALPH LAUREN','DIESEL','グンゼ','BVD','無地ノーブランド'],
    boxerColors:['ライトグレー','黒','ネイビー','白','チャコール','ダークグレー'],
    baseWearTypes:['ボクサーパンツ','ショートショーツ','スポーツスパッツ'],
    bangs:['指定なし','額に一束落ちる長め前髪','自然に下ろした前髪','軽く上げた前髪','かき上げ風前髪','眉にかかる重め前髪','短く切り揃えた前髪','両サイドに流した前髪','センターパートで左右に分けた前髪','斜めに流した前髪（左流し）','斜めに流した前髪（右流し）','アップバングで額を出した前髪','オールバック風に上げた前髪','眉上の短めマッシュ前髪'],
    hairFinishes:['指定なし','ツヤを抑えたナチュラルセット','ワックスの束感セット','きっちり撫でつけたセット','無造作セット','パーマ風の動きを出したセット','セットなしの自然に崩れた無造作','湿気でラフにうねった','寝癖が少し残るラフさ','風にラフに乱れた'],
    hairVolumes:['標準的な毛量','毛量多め','毛量少なめ'],
    shoes:[['雪駄（和装ミックス）',1955,1972,1998,'cf'],['スニーカーソール雪駄',2019,2023,9999,'kcfs'],'黒革靴','茶革靴','ローファー','白スニーカー','黒スニーカー','キャンバススニーカー','ランニングシューズ','サッカースパイク','バスケットシューズ','サンダル','ブーツ'],
    sockBrands:['指定しない','UNIQLO','無印良品','Tabio','靴下屋','Fukuske','グンゼ','POLO RALPH LAUREN','Calvin Klein','EMPORIO ARMANI','TOMMY HILFIGER','Paul Smith','BURBERRY','BVD','BODY WILD','NIKE','adidas','Champion','PUMA','New Balance','ASICS','MIZUNO','無地ノーブランド'],
    sockTypes:['ビジネスソックス','柄ありビジネスソックス','スポーツソックス','クルー丈ソックス','くるぶしソックス','インビジブルソックス','ライン入りソックス','ワンポイントソックス','ロゴ入りソックス'],
    sockShapes:['クルー丈','ミドル丈','くるぶし丈','インビジブル丈','リブ編み','薄手ビジネス形状','厚手スポーツ形状'],
    sockMaterials:['綿混','綿＋ナイロン','ウール混','薄手ナイロン混','パイル編み','リブ編みコットン','吸汗速乾素材'],
    sockColors:['黒','紺','白','チャコール','グレー','ブラウン','ネイビー地ストライプ','黒地ドット','アーガイル柄','ライン入り白'],
    sockUse:['新品に近い','自然な使用感','少し履き込まれている','毛羽立ちが少しある','スポーツ後の自然な使用感','清潔だが生活感あり','かかとがやや薄くなっている'],
    footShapes:['ギリシャ型','エジプト型','スクエア型','幅広','細め','甲高','土踏まず高め','土踏まず低め','足指が長め','親指が長め'],
    backgrounds:['シンプルなグレーバック','白背景のスタジオ','ライトグレーのスタジオ','黒背景のスタジオ','大学キャンパス背景','学校の廊下背景','街中スナップ背景','オフィス背景','スポーツ施設背景','ジム背景','テーマパーク風背景','海辺・港町背景','夜景背景','公園背景','室内の自然光背景'],
    lighting:['自然光。明るく清潔感がある。','柔らかいスタジオ照明。','曇天の拡散光。','写真館風の正面ライト。','斜め45度のスタジオライト。','屋外スポーツ撮影風の明るい光。','夜景に馴染む控えめなライティング。'],
    qualities:['実写風','高精細','スマホスナップ風','写真館風','ファッションカタログ風','AI感を抑えた自然写真','商業写真風','雑誌グラビアではなく設定資料風','イラスト風','アニメ風イラスト','漫画風線画','キャラクター設定画風'],
    outputTypes:['前面・側面を1枚にまとめた設定画像','前面・側面・背面を1枚にまとめた設定画像','服装基準カード（職業服装）','服装基準カード（私服）','表情AUリファレンスシート','16:9のリファレンスカードとして、全身の前面・側面、顔の正面・側面・斜め45度、顔正面（歯が見える）、足の正面と側面と足裏（人物が座って自分の足裏をこちらへ見せる構図とし、足裏だけが切り離されて描写された状態にしない）を1枚に整理して表示する。','SNSプロフィール風画像','就活写真風画像','スポーツ選手紹介風画像','比較リファレンスシート（下着×私服・靴なし）','表情差分リファレンスシート','フル設定資料シート','段階着装リファレンスシート','偶然人物ブループリントシート','服装リファレンスシート（職業背景）','人物ポスター（職業・人物像）','街で見かけたイケメンシート：職業編','街で見かけたイケメンシート：オフ編','偶然足元強調場面シート','人物特集雑誌ページ'],
    counts:['1枚','3パターン別々の画像','5パターン別々の画像','10パターン別々の画像'],
    promptLanguages:['日本語','English'],
    promptTargets:['ChatGPT','NanobananaPro','Grok Imagine'],
    captionModes:['表記する','表記しない','画像下部に1行で表記','カード風ミニプロフィールを下部に表示','スタイリッシュなタグ型で表示'],
    cardStyles:['スタンダード','シンプル','スタイリッシュ','スポーツカード風','アイドルカード風','高級感のあるカード風','レアカード風','ホログラム風','コレクターズカード風'],
    cardRarities:['おすすめ自動','なし','N','R','SR','SSR','UR','Secret','Legendary'],
    cardThemes:['モノトーン','ネイビー','ブラックゴールド','シルバー','ブルー','レッド','グリーン','パープル','ランダムカラー'],
    cardLayouts:['縦長カード','横長カード','情報重視型','ビジュアル重視型','ステータス重視型','リファレンス資料型'],
    catchphraseModes:['結果画面のみ表示','画像内にも表示する','表示しない'],
    seasons:['ランダム','春','夏','秋','冬'],
    derivedModes:['参照画像前提（簡潔版）','単体で完結（フル記述）'],
    snapModes:['通常（スタジオ演出）','他撮りスナップ風','自撮り風'],
    groupSizes:['1人（通常）','2人グループ','3人グループ'],
    groupPromptModes:['メンバーごとに別々の指示文','1つの指示文にまとめて生成'],
    mainWearModes:['ボクサーパンツのみ','時代に合った下着の種類'],
    cardWearModes:['ボクサーパンツのみ','職業服装','私服'],
    cardEffects:['なし','光沢風','ホログラム風','箔押し風','キラ加工風','フレーム強調','角丸カード風','エンブレム付き'],
    bodyHairOverall:['ほぼなし','薄め','自然','やや濃い','濃い','部位差あり','手入れされている','ワイルド寄り','スポーツ系で自然','一部のみ目立つ'],
    bodyHairLevels:['なし','ごく薄い','薄め','自然','やや濃い','濃い','手入れ済み','部分的に残している']
  };

  let current = null;

  let locks = {};

  let mode = 'full';

  let spinning = false;

  let uiLang = 'ja';

  const uiText = {
    ja:{
      subtitle:'偶然がつくる、まだ見ぬイケメン。年齢・身長・体型・顔立ち・雰囲気系統・MBTI・体毛・提案服装まで、スロットのようにランダムで決定します。メイン生成はボクサーパンツのみ着用とし、服装案や偶然見かけた場面は別枠で出力します。',
      heroNotice:'成人男性キャラクターの非性的な画像生成用指示文を作成するアプリです。結果はブラウザ内に保存され、外部サーバーへ送信されません。',
      startBtn:'SLOT START', rerollUnlockedBtn:'ロック以外を回す', resetLocksBtn:'ロック解除',
      groupPromptTitle:'集合写真 指示文', copyGroupBtn:'📋 コピー', copyGroupDone:'集合写真の指示文をコピーしました', memberLabel:'メンバー',
      promptAreaTitle:'画像生成用 指示文', copiedLabel:'✓ コピーしました', copyLabel:'📋 コピー',
      promptDescs:{main:'STEP1：キャラの基準になるリファレンスカード（ボクサーパンツ・16:9）を作る指示文です。まずこれで基準画像を生成してください。', derived:'STEP2：下で選んだ形式の派生画像を作る指示文です。基準カードで生成した画像を添付してから貼り付けてください。', outfit:'職業に合わせた仕事着・仕事帰りコーデの差分を作る指示文です。', outfitHoliday:'性格・雰囲気重視の私服コーデの差分を作る指示文です。仕事とは違う一面が出ます。', scene:'日常の一場面を切り取ったスナップ風差分を作る指示文です。', card:'トレーディングカード風の1枚に仕上げる指示文です。カード設定はこの上の「カード差分プロンプト設定」で変更できます。', group:'グループ全員を1枚の集合写真として描く指示文です。', friendPair:'参照画像2枚（本人と友人それぞれの基準カード）を添付して使う、2人のツーショット写真の指示文です。服装（職業服装/私服）と出力枚数はこの下で変更できます。', wearcard:'提案服装を着た全身3面・顔2面・靴下足元アップ・座り足裏アップを1枚に整理する「服装基準カード」の指示文です。上のボタンで職業服装／私服を切り替えます。レイアウト参照画像（エディタ）にも対応します。', docs:'画像生成用ではない、閲覧・転記用の資料置き場です。人物の全設定をまとめた「詳細プロフまとめ」をここからコピーできます。'},
      editTitle:'この項目を直接変更', instantSkip:'演出スキップ', presetPlaceholder:'プリセット名', presetSave:'設定を保存', presetLoad:'読み込み', presetDelete:'削除', importJson:'JSONを読み込む', charsSuffix:'文字', diceTitle:'この項目だけ再抽選', favOn:'★', favOff:'☆', importedMsg:'読み込みました', presetSavedMsg:'プリセットを保存しました', presetNameNeeded:'プリセット名を入力してください',
      tab_slot:'スロット', tab_result:'結果・画像指示文', tab_history:'保存結果', tab_settings:'条件固定',
      initialTitle:'初期設定', initialPill:'スロットを回す前に指定', initialNotice:'ここで国籍・人種・年齢範囲・雰囲気系統・背景・光・画質・出力タイプ・出力枚数・生成先・画像内表記・カード差分プロンプト設定を指定します。これらは抽選せず、ここで選んだ内容が画像指示文へ反映されます。雰囲気系統を選ぶと、髪型・顔立ち・提案服装の抽選傾向が連動します。',
      resultTitle:'完成プロフィール', saveBtn:'結果を保存', jsonBtn:'JSONを書き出す', promptTitle:'基準リファレンスカード 指示文', derivedTitle:'派生出力 指示文', derivedWarn:'⚠ 基準カードの画像を添付してから使用（制服職は承認済みの制服画像1枚目も添付すると同一性が安定）', copyPromptBtn:'📋 コピー', outfitTitle:'職業服装 指示文', outfitHolidayTitle:'私服服装 指示文', copyOutfitBtn:'📋 コピー', sceneTitle:'偶然見かけた場面 指示文', copySceneBtn:'📋 コピー', cardTitle:'トレーディングカード差分 指示文', copyCardBtn:'📋 コピー', footCfgTitlePrefix:'足元強調シート 詳細設定', footCfgNote:'「ランダム」の項目は生成AI側の自由発想に任せます。🎲で全項目を状況連動の重みで一括抽選できます（素足・脱ぎかけは低確率）。', footDiceBtn:'🎲 おまかせ抽選', footResetBtn:'↺ すべてランダムに戻す', friendPairTitle:'友人ツーショット 指示文', friendPairWarn:'⚠ 2人分の基準カード画像を添付してから使用', friendPairWearLabel:'服装', friendPairCountLabel:'出力枚数',
      historyTitle:'保存結果', clearHistoryBtn:'履歴クリア', noHistory:'保存結果はまだありません。', loadBtn:'読み込む',
      settingsTitle:'条件固定ランダム', settingsPill:'空欄はランダム', settingsNotice:'固定条件を選んだ状態で「SLOT START」を押すと、指定した人物・服装項目を優先してランダム生成します。MBTIも固定可能です。背景・光・画質・出力タイプ・出力枚数・生成先・画像内表記は上部の初期設定または結果画面の選択欄で指定します。',
      restoreTitle:'プロンプトから読み込む', restoreCodeBtn:'読み込む', restoreNote:'基準カードの日本語指示文を貼ると、本文から人物設定を読み取って復元します（英語・派生形式は対象外）', restoreNotFound:'プロンプトから人物設定を読み取れませんでした（日本語の基準カード指示文を貼ってください）', restoreFailed:'プロンプトの読み取りに失敗しました', restoreDone:'プロンプトから人物を読み取りました',
      friendBtn:'👥 友人を作成', friendPanelTitle:'友人を作成', friendRelationLabel:'関係', friendHierLabel:'上下関係', friendGoBtn:'この関係で友人を作成', friendNote:'元の人物は履歴に自動保存されます', friendDone:'友人が完成しました',
      slotResult:'Slot Result', waiting:'待機中', spinning:'回転中', done:'完成', lock:'LOCK', locked:'LOCKED', clickLock:'クリックで固定', rarityNoteIdle:'スロットを回すと判定されます。', rarityTitle:'Rarity', modesTitle:'Modes',
      mode_full:'完全ランダム', mode_face:'顔だけ', mode_outfit:'服装だけ', mode_rare:'レア設定', currentMode:'現在：', mode_full_note:'完全ランダム', mode_face_note:'顔だけランダム', mode_outfit_note:'服装だけランダム', mode_rare_note:'レア設定モード',
      saveFirst:'先にスロットを回してください。', saved:'保存しました。', copyMainDone:'メイン指示文をコピーしました。', copyOutfitDone:'服装差分指示文をコピーしました。', copySceneDone:'場面指示文をコピーしました。', copyCardDone:'カード差分指示文をコピーしました。', confirmClear:'保存結果を削除しますか？',
      rows:{weekdayOutfit:'職業コーデ',holidayOutfit:'私服コーデ',holidaySock:'私服の靴下',glasses:'眼鏡',group:'グループ',basic:'基本プロフィール',faceSection:'顔立ち',bodySection:'体型・身体',bodyHairSection:'ひげ・体毛',mainSection:'基準服装',outfitSection:'提案服装',outputSection:'出力設定',sceneSection:'偶然見かけた場面',name:'名前',age:'年齢',natEth:'国籍 / 人種',roleVibe:'職業 / 系統',mbti:'MBTI / 性格',era:'時代設定',hw:'身長 / 体重',body:'体型',foot:'足サイズ',footShape:'足の形',face:'顔立ち',faceLine:'フェイスライン',eyes:'目',nose:'鼻',mouth:'口元',skin:'肌',facialHair:'ひげ',hair:'髪型',bodyHair:'体毛',main:'基準服装',outfit:'提案服装',sock:'提案靴下',background:'背景',output:'出力',promptTarget:'生成先',imageText:'画像内表記',cardSetting:'カード出力設定',scene:'偶然見かけた場面',uniformKind:'制服の種類',headwearRow:'着帽',friendRow:'友人関係'},
      fieldLabels:{initialNationality:'初期国籍',initialEthnicity:'初期人種',initialAgeMin:'年齢下限',initialAgeMax:'年齢上限',initialVibe:'雰囲気系統',initialEraYear:'時代設定',initialBackground:'背景',initialLighting:'光',initialQuality:'画質・質感',initialOutputType:'出力タイプ',initialMainWearMode:'基準服装（下着）',initialGroupSize:'生成モード',initialOccupation:'職業',initialOccInfluence:'職業の影響',initialCatchphrase:'キャッチフレーズ',initialDerivedMode:'派生プロンプト形式',initialSeason:'季節',initialGroupPromptMode:'グループ出力形式',initialCount:'出力枚数',initialPromptLanguage:'指示文言語',initialPromptTarget:'生成先',initialCaptionMode:'画像内スペック表示',manualOutputType:'出力タイプ',manualCount:'出力枚数',manualQuality:'画風・質感',manualBackground:'背景',manualLighting:'光',manualPromptLanguage:'指示文言語',manualPromptTarget:'生成先',manualCaptionMode:'画像内スペック表示',initialCardStyle:'カードスタイル',initialCardRarity:'カードレアリティ表示',initialCardTheme:'カード配色テーマ',initialCardLayout:'カードレイアウト',initialCardWearMode:'カード衣装',initialCardEffect:'装飾効果（レアリティ連動）',manualCardStyle:'カードスタイル',manualCardRarity:'カードレアリティ表示',manualCardTheme:'カード配色テーマ',manualCardLayout:'カードレイアウト',manualCardWearMode:'カード衣装',manualCardEffect:'装飾効果（レアリティ連動）'},
      rarityNotes:{normal:'自然で使いやすい標準寄りの組み合わせです。',rare:'少し特徴的な組み合わせです。',super:'目立つ特徴が複数あります。',legend:'かなり個性的な偶然の組み合わせです。'}
    },
    en:{
      subtitle:'A chance-based handsome character generator. Age, height, build, facial impression, vibe, MBTI, body hair, and suggested outfit are decided like a slot machine. The main generation uses boxer briefs only, while outfit and candid-scene prompts are output separately.',
      heroNotice:'This app creates non-sexual image prompts for adult male characters. Results are stored in your browser and are not sent to an external server.',
      startBtn:'SLOT START', rerollUnlockedBtn:'Spin unlocked only', resetLocksBtn:'Reset locks',
      groupPromptTitle:'Group Photo Prompt', copyGroupBtn:'📋 Copy', copyGroupDone:'Group photo prompt copied.', memberLabel:'Member',
      promptAreaTitle:'Image Generation Prompts', copiedLabel:'✓ Copied!', copyLabel:'📋 Copy',
      promptDescs:{main:'STEP 1: builds the base reference card (boxer briefs, 16:9). Generate the base image with this first.', derived:'STEP 2: builds the selected derived output. Attach the base card image before using this prompt.', outfit:'His work outfit variation, shaped by his occupation.', outfitHoliday:'His casual outfit variation, shaped by his personality and vibe.', scene:'A candid everyday-scene variation prompt.', card:'A trading-card-style variation prompt. Card settings can be changed above.', group:'Renders the whole group as one photo.', friendPair:'A two-shot prompt used with TWO attached reference images (each person\u2019s base card). Outfit (work/casual) and output count can be changed below.', wearcard:'A wear-reference card prompt: clothed full body (3 views), face (2 views), socked-feet close-up and sitting sole close-up on one sheet. Toggle work/casual above. Layout-reference images are supported.', docs:'Reference material for reading and transcription — not an image prompt. Copy the full profile summary from here.'},
      editTitle:'Edit this value directly', instantSkip:'Skip animation', presetPlaceholder:'Preset name', presetSave:'Save preset', presetLoad:'Load', presetDelete:'Delete', importJson:'Import JSON', charsSuffix:' chars', diceTitle:'Re-roll this item only', favOn:'★', favOff:'☆', importedMsg:'Imported.', presetSavedMsg:'Preset saved.', presetNameNeeded:'Enter a preset name.',
      tab_slot:'Slots', tab_result:'Results & Prompts', tab_history:'Saved Results', tab_settings:'Fixed Conditions',
      initialTitle:'Initial Settings', initialPill:'Set before spinning', initialNotice:'Set nationality, ethnicity, age range, vibe, background, lighting, quality, output type, output count, prompt target, image text, and card output settings here. These settings are not randomized and will be reflected directly in the image prompts. Choosing a vibe also influences hairstyle, face type, and suggested outfit generation.',
      resultTitle:'Final Profile', saveBtn:'Save Result', jsonBtn:'Export JSON', promptTitle:'Base Reference Card Prompt', derivedTitle:'Derived Output Prompt', derivedWarn:'⚠ Attach the base card image before use (for uniformed roles, also attach the first approved uniform image for consistency)', copyPromptBtn:'📋 Copy', outfitTitle:'Work Outfit Prompt', outfitHolidayTitle:'Casual Outfit Prompt', copyOutfitBtn:'📋 Copy', sceneTitle:'Candid Encounter Prompt', copySceneBtn:'📋 Copy', cardTitle:'Trading Card Variation Prompt', copyCardBtn:'📋 Copy', footCfgTitlePrefix:'Foot-focus Sheet Details', footCfgNote:'Items left on Random are decided freely by the image AI. 🎲 rolls every item with situation-aware weights (barefoot / mid-removal states stay low-probability).', footDiceBtn:'🎲 Auto-roll all', footResetBtn:'↺ Reset all to Random', friendPairTitle:'Friend Two-shot Prompt', friendPairWarn:'⚠ Attach both base card images before use', friendPairWearLabel:'Outfit', friendPairCountLabel:'Output count',
      historyTitle:'Saved Results', clearHistoryBtn:'Clear History', noHistory:'No saved results yet.', loadBtn:'Load',
      settingsTitle:'Random with Fixed Conditions', settingsPill:'Blank = random', settingsNotice:'If you press “SLOT START” after setting fixed conditions, the selected character and outfit items will be prioritized during random generation. MBTI can also be fixed. Background, lighting, quality, output type, output count, prompt target, and image text are set in the initial settings or in the result panel.',
      restoreTitle:'Load from Prompt', restoreCodeBtn:'Load', restoreNote:'Paste the Japanese base-card prompt; the character is parsed from the text itself (English and derived formats are not supported)', restoreNotFound:'Could not parse a character from this text (paste the Japanese base-card prompt)', restoreFailed:'Failed to parse the prompt', restoreDone:'Character parsed from the prompt',
      friendBtn:'👥 Create a Friend', friendPanelTitle:'Create a Friend', friendRelationLabel:'Relation', friendHierLabel:'Hierarchy', friendGoBtn:'Create friend with this relation', friendNote:'The original person is auto-saved to history', friendDone:'Friend created',
      slotResult:'Slot Result', waiting:'Waiting', spinning:'Spinning', done:'Done', lock:'LOCK', locked:'LOCKED', clickLock:'click to lock', rarityNoteIdle:'Spin the slots to evaluate.', rarityTitle:'Rarity', modesTitle:'Modes',
      mode_full:'Full Random', mode_face:'Face Only', mode_outfit:'Outfit Only', mode_rare:'Rare Mode', currentMode:'Current: ', mode_full_note:'Full random', mode_face_note:'Face-only random', mode_outfit_note:'Outfit-only random', mode_rare_note:'Rare-mode random',
      saveFirst:'Please spin the slots first.', saved:'Saved.', copyMainDone:'Copied the main prompt.', copyOutfitDone:'Copied the outfit prompt.', copySceneDone:'Copied the scene prompt.', copyCardDone:'Copied the card variation prompt.', confirmClear:'Clear saved results?',
      rows:{weekdayOutfit:'Work Outfit',holidayOutfit:'Casual Outfit',holidaySock:'Casual Socks',glasses:'Glasses',group:'Group',basic:'Basic Profile',faceSection:'Face',bodySection:'Body',bodyHairSection:'Facial / Body Hair',mainSection:'Main Clothing',outfitSection:'Suggested Outfit',outputSection:'Output Settings',sceneSection:'Candid Scene',name:'Name',age:'Age',natEth:'Nationality / Ethnicity',roleVibe:'Role / Vibe',mbti:'MBTI / Personality',era:'Era',hw:'Height / Weight',body:'Body Type',foot:'Foot Size',footShape:'Foot Shape',face:'Face Type',faceLine:'Face Line',eyes:'Eyes',nose:'Nose',mouth:'Mouth',skin:'Skin',facialHair:'Facial Hair',hair:'Hair',bodyHair:'Body Hair',main:'Main Clothing',outfit:'Suggested Outfit',sock:'Suggested Socks',background:'Background',output:'Output',promptTarget:'Prompt Target',imageText:'Image Text',cardSetting:'Card Settings',scene:'Candid Scene',uniformKind:'Uniform Type',headwearRow:'Headwear',friendRow:'Friendship'},
      fieldLabels:{initialNationality:'Initial Nationality',initialEthnicity:'Initial Ethnicity',initialAgeMin:'Age Min',initialAgeMax:'Age Max',initialVibe:'Vibe',initialEraYear:'Era Year',initialBackground:'Background',initialLighting:'Lighting',initialQuality:'Quality / Texture',initialOutputType:'Output Type',initialMainWearMode:'Main Underwear Style',initialGroupSize:'Generation Mode',initialOccupation:'Occupation',initialOccInfluence:'Occupation Influence',initialCatchphrase:'Catchphrase',initialDerivedMode:'Derived Prompt Format',initialSeason:'Season',initialGroupPromptMode:'Group Output Format',initialCount:'Output Count',initialPromptLanguage:'Prompt Language',initialPromptTarget:'Prompt Target',initialCaptionMode:'Image Text',manualOutputType:'Output Type',manualCount:'Output Count',manualQuality:'Art / Texture',manualBackground:'Background',manualLighting:'Lighting',manualPromptLanguage:'Prompt Language',manualPromptTarget:'Prompt Target',manualCaptionMode:'Image Text',initialCardStyle:'Card Style',initialCardRarity:'Card Rarity Label',initialCardTheme:'Card Color Theme',initialCardLayout:'Card Layout',initialCardWearMode:'Card Outfit',initialCardEffect:'Effect Linked to Rarity',manualCardStyle:'Card Style',manualCardRarity:'Card Rarity Label',manualCardTheme:'Card Color Theme',manualCardLayout:'Card Layout',manualCardWearMode:'Card Outfit',manualCardEffect:'Effect Linked to Rarity'},
      rarityNotes:{normal:'A natural and versatile combination.',rare:'A slightly distinctive combination.',super:'Several standout features are present.',legend:'A highly distinctive chance-based combination.'}
    }
  };

  function T(key){ return uiText[uiLang][key]; }

  const valueTranslations = {
    '力強い目元':'Strong, intense eyes','優しい目元':'Gentle eyes','涼しげな目元':'Cool, refreshing eyes','知的な目元':'Intelligent eyes','眠たげな目元':'Sleepy-looking eyes','鋭い目元':'Sharp eyes','親しみやすい目元':'Approachable eyes','落ち着いた目元':'Calm eyes',
    '一重':'monolid','奥二重':'hooded double eyelid','末広二重':'tapered double eyelid','平行二重':'parallel double eyelid','左右で異なるまぶた（片方だけ二重）':'differing eyelids (double on one side only)',
    '標準的な目の形':'standard eye shape','切れ長の目':'long, narrow eyes','アーモンド形の目':'almond-shaped eyes','丸みのある目':'round eyes','たれ目気味の目':'slightly downturned eyes','つり目気味の目':'slightly upturned eyes','細めの目':'narrow eyes',
    '太めの直線眉':'thick straight eyebrows','太めのアーチ眉':'thick arched eyebrows','標準的な直線眉':'average straight eyebrows','標準的なゆるいアーチ眉':'average softly arched eyebrows','やや細めの直線眉':'slightly thin straight eyebrows','やや細めのアーチ眉':'slightly thin arched eyebrows','眉尻の下がった優しい眉':'gentle eyebrows sloping down at the ends','への字型の眉':'downward-angled eyebrows','眉山のはっきりした眉':'eyebrows with a distinct peak','短めで力強い眉':'short, strong eyebrows',
    '濃い眉':'dense','標準的な濃さの眉':'average density','薄めの眉':'sparse',
    '短めで控えめなまつ毛':'short, understated eyelashes','標準的な長さのまつ毛':'average-length eyelashes','やや長めのまつ毛':'slightly long eyelashes','長めで濃いまつ毛':'long, dense eyelashes','細くまばらなまつ毛':'fine, sparse eyelashes',
    '標準的な顎先':'an average chin','尖り気味の顎先':'a slightly pointed chin','丸みのある顎先':'a rounded chin','しっかりした顎先':'a strong chin','軽く割れた顎先':'a lightly cleft chin',
    'エラは目立たない':'an unpronounced jaw angle','ほどよく張ったエラ':'a moderately squared jaw','はっきり張ったエラ':'a strongly squared jaw',
    '標準的な耳':'average ears','立ち耳':'protruding ears','寝た耳':'flat-set ears','福耳':'large-lobed ears','小ぶりな耳':'small ears','柔道耳（軽度の耳介の厚み）':'slightly thickened ears from grappling sports',
    '標準的な広さの額':'an average forehead','狭めの額':'a narrow forehead','広めの額':'a broad forehead',
    '直線的な生え際':'a straight hairline','ゆるいM字の生え際':'a softly M-shaped hairline','富士額の生え際':'a widow-peak hairline','やや後退気味の生え際':'a slightly receding hairline',
    '標準的な頬':'average cheeks','頬骨が高めの頬':'high cheekbones','ややこけた頬':'slightly hollow cheeks','ふっくらした頬':'full cheeks',
    'えくぼなし':'no dimples','片側にえくぼ':'a dimple on one side','両側にえくぼ':'dimples on both sides',
    'ほくろなし':'no moles','目尻の下の泣きぼくろ':'a mole below the outer eye','口元のほくろ':'a mole near the mouth','顎のほくろ':'a mole on the chin','頬のほくろ':'a mole on the cheek','首すじのほくろ':'a mole on the neck',
    '直毛':'straight hair','やわらかい猫っ毛':'soft, fine hair','硬めの剛毛':'coarse, stiff hair','ゆるいくせ毛':'loosely wavy hair','強いくせ毛':'strongly wavy hair',
    'クマなし':'no under-eye shadows','うっすらとした目の下のクマ':'faint under-eye shadows',
    'のどぼとけは控えめ':'a subtle throat prominence','標準的なのどぼとけ':'an average throat prominence','のどぼとけがはっきり出ている':'a prominent throat prominence',
    '血色のよい唇':'well-colored lips','標準的な血色の唇':'normally colored lips','やや乾燥気味の唇':'slightly dry lips',
    '彫りは標準的':'average brow definition','彫りが深い眉まわり':'a deep-set brow','ややフラットな眉まわり':'a flatter brow',
    'きれいに整えている':'neatly groomed','自然に整えている':'naturally kept','伸ばしっぱなし気味':'left to grow out',
    '薄い唇':'Thin lips','やや薄い唇':'Slightly thin lips','標準的な厚さの唇':'Average-thickness lips','厚めの唇':'Fuller lips','上唇が薄く下唇が厚い唇':'Thin upper lip with a fuller lower lip','口角のきゅっと上がった唇':'Lips with neatly upturned corners','引き締まった一文字の唇':'A firm, straight-set mouth','ふっくらした唇':'Plump lips',
    '標準的な位置・大きさの口':'Average mouth size and placement','やや大きめの口':'A slightly larger mouth','小さめの口':'A smaller mouth','鼻と口の距離が近い口':'A short nose-to-mouth distance','鼻と口の距離がやや長い口':'A slightly long nose-to-mouth distance','口角の横幅が広い口':'A wide-set mouth',
    '求心顔（目鼻口が中心に寄った配置）':'Centripetal features (set close toward the center)','やや求心寄りの配置':'Slightly centripetal feature spacing','標準的な配置':'Evenly spaced features','やや遠心寄りの配置':'Slightly centrifugal feature spacing','遠心顔（パーツが外側に離れた配置）':'Centrifugal features (set wide toward the outside)',
    '標準的なバランスの比率':'Balanced feature proportions','目が大きめで存在感のある比率':'Proportions with prominent, larger eyes','目が小さめ・切れ長寄りの比率':'Proportions with smaller, narrow eyes','鼻の存在感が強い比率':'Proportions with a prominent nose','口が大きめではっきりした比率':'Proportions with a larger, defined mouth','口が小さめの比率':'Proportions with a smaller mouth','全体に小づくりな比率':'Overall delicate, compact features','全体に大ぶりでくっきりした比率':'Overall bold, well-defined features',
    '左右対称に近い整った顔':'A near-symmetrical, even face','ほぼ対称（ごく自然な左右差）':'Almost symmetrical with natural minor asymmetry','わずかな左右差がある自然な顔':'A natural face with slight asymmetry','眉の高さに少し左右差がある顔':'Slightly uneven eyebrow heights','口角の上がり方に少し左右差がある顔':'Slightly uneven mouth-corner lift','目の大きさにわずかな左右差がある顔':'Slightly uneven eye sizes',
    '防衛大学校の常装冬服風（花紺色の詰襟型短ジャケット）':'NDA winter dress (very dark navy stand-collar jacket)',
    '防衛大学校の第1種夏服風（白の詰襟上下）':'NDA Type-1 summer uniform (white stand-collar, white trousers)',
    '防衛大学校の第3種夏服風（白の半袖開襟シャツ）':'NDA Type-3 summer uniform (white short-sleeve shirt)',
    '防衛大学校の校内服装（水色シャツ＋ネクタイ）':'NDA on-campus uniform (light-blue shirt + navy tie)',
    '防衛大学校の作業服装（65式作業服と同型・OD色）':'NDA work uniform (Type-65 pattern, olive drab)',
    '消防署の活動服（紺の作業服スタイル）':'Firefighter station duty uniform (navy)',
    '救助服（オレンジのレスキュー隊服）':'Rescue-squad uniform (orange)',
    '防火衣（訓練場面向けの耐火装備スタイル）':'Protective fire gear (training style)',
    '警察官の冬制服風（濃紺の長袖＋ネクタイ）':'Police winter uniform (dark navy + tie)',
    '警察官の夏制服風（薄青の半袖シャツ）':'Police summer uniform (light-blue shirt)',
    '警察官の活動服風（出動服スタイル）':'Police field-duty uniform',
    '交通機動隊風の乗車服（白ヘルメット着用）':'Traffic-unit rider uniform (white helmet worn)',
    '機動隊の出動服風（ヘルメット携行）':'Riot-unit duty uniform (helmet carried)',
    '陸上自衛隊風の迷彩作業服':'JGSDF camouflage work uniform',
    '陸自の常装制服風（紫紺）':'JGSDF dress uniform (dark purplish navy)',
    '海自の夏制服風（白）':'JMSDF white summer uniform',
    '空自の制服風（青）':'JASDF blue uniform',
    '救急隊の活動服（白シャツ＋紺パンツ）':'Ambulance-crew duty uniform',
    'ランダム':'Random','日本':'Japan','韓国':'South Korea','中国':'China','台湾':'Taiwan','アメリカ':'United States','カナダ':'Canada','イギリス':'United Kingdom','フランス':'France','ドイツ':'Germany','イタリア':'Italy','スペイン':'Spain','ブラジル':'Brazil','メキシコ':'Mexico','タイ':'Thailand','ベトナム':'Vietnam','フィリピン':'Philippines','インドネシア':'Indonesia','マレーシア':'Malaysia','インド':'India','オーストラリア':'Australia',
    '日本人':'Japanese','韓国系':'Korean','東アジア系':'East Asian','中国系':'Chinese','東南アジア系':'Southeast Asian','南アジア系':'South Asian','白人系':'White','黒人系':'Black','中東系':'Middle Eastern','ラテン系':'Latino','中央アジア系':'Central Asian','ミックス':'Mixed',
    '成人男性キャラクター':'Adult male character','若手社会人':'Young working adult','大学生風の成人男性':'Adult man with a university-student vibe','スポーツ経験者':'Athletic / sports-experienced','モデル風':'Model-like','俳優風':'Actor-like','営業職風':'Sales professional','事務職風':'Office worker','クリエイター風':'Creative professional','研究職風':'Research professional','販売員風':'Retail staff','インストラクター風':'Instructor-like','IT系会社員風':'IT office worker','フリーランス風':'Freelancer-like',
    '爽やか系':'Fresh / clean-cut','真面目系':'Serious','ワイルド系':'Wild','スポーツ系':'Sporty','きれいめ系':'Clean / polished','カジュアル系':'Casual','韓国風':'Korean-inspired','中性系':'Androgynous','大人っぽい系':'Mature','やりらふぃー系':'Trendy party-boy','ストリート系':'Streetwear','塩顔系':'Salt-faced / understated','犬系男子':'Puppy-like boyish','クール系':'Cool','ミステリアス系':'Mysterious','サブカル系':'Subculture','古着系':'Vintage / thrift','清楚系':'Neat / gentle','陽キャ大学生系':'Outgoing college-guy',
    '実年齢相応':'Looks his age','やや若く見える':'Looks slightly younger','少し大人びて見える':'Looks slightly older',
    '普通顔':'Average-looking','爽やか知的アナウンサー系':'Fresh, intelligent announcer type','大学サッカー部系':'University soccer-player type','スーツ映え社会人系':'Suit-friendly working professional type','高身長モデル系':'Tall model type','親しみやすい大学生系':'Friendly college-student type','体育会系スポーツ男子':'Athletic sports guy','清潔感のある若手俳優風':'Clean young-actor type','落ち着いた大人系':'Calm mature type','韓国アイドル風':'K-pop idol type','日本の若手俳優風':'Young Japanese actor type','中性系':'Androgynous','塩顔系':'Understated face type','犬系男子風':'Puppy-like boyish type','クール系':'Cool type','ミステリアス系':'Mysterious type','サブカル系':'Subculture type',
    '標準体型':'Average build','やせ型':'Slim','細身':'Lean','痩せマッチョ':'Lean muscular','引き締まったスポーツ体型':'Toned athletic build','サッカー選手体型':'Soccer-player build','スーツ映え体型':'Suit-friendly build','高身長モデル体型':'Tall model build','筋肉質':'Muscular','がっしり体型':'Solid build','腹だけぽっちゃり':'Only slightly chubby around the belly','ぽっちゃり':'Chubby','脚が長い':'Long-legged',
    '標準的な黒目の位置':'irises in a standard, centered position','黒目が大きめで白目が控えめ':'large irises with little visible sclera','やや三白眼気味（黒目が上寄りで下に白目がのぞく）':'slightly sanpaku eyes — the irises sit a little high with a sliver of white showing beneath','三白眼（黒目が小さめで左右と下に白目が見える）':'sanpaku eyes — smallish irises with white visible on both sides and below them','上三白眼気味（黒目が下寄りで上に白目がのぞく）':'upper-sanpaku leaning eyes — the irises sit low with white showing above','すっきりした首すじ':'a clean, slender neckline','がっしりした首':'a thick, sturdy neck','自然なフェイスライン':'Natural face line','シャープなフェイスライン':'Sharp face line','しっかりしたフェイスライン':'Defined face line','柔らかいフェイスライン':'Soft face line','逆三角形に近いフェイスライン':'Near-inverted-triangle face line','やや角ばったフェイスライン':'Slightly angular face line',
    '二重風・親しみやすい目元':'Friendly double-eyelid eyes','奥二重風・クールな目元':'Cool inner-double-eyelid eyes','切れ長で知的':'Narrow and intelligent','丸みのある優しい目元':'Soft rounded eyes','力強い目元':'Strong eyes','伏し目がちで落ち着いた目元':'Relaxed downcast eyes',
    'おすすめ自動':'Auto suggestion','なし':'None','控えめ':'Subtle','自然':'Natural','ややはっきり':'Slightly defined','ふっくら':'Full','笑うと少し出る':'Slightly visible when smiling',
    '自然な鼻筋':'Natural nose bridge','通った鼻筋':'Defined nose bridge','高めの鼻筋':'High nose bridge','すっきりした鼻筋':'Clean nose bridge','しっかりした鼻':'Well-defined nose','控えめで自然な鼻':'Subtle natural nose',
    '自然な笑顔':'Natural smile','控えめな微笑み':'Subtle smile','落ち着いた表情':'Calm expression','爽やかな笑顔':'Fresh smile','誠実な表情':'Sincere expression','余裕のある表情':'Composed expression',
    '自然な肌質':'Natural skin texture','健康的な肌質':'Healthy skin texture','透明感のある肌':'Clear-looking skin','褐色の肌':'Brown skin','深い褐色の肌':'Deep brown skin','日差しでいっそう深まった褐色の肌':'Sun-deepened brown skin','日差しでいっそう深まった深い褐色の肌':'Sun-deepened deep brown skin','非常に色白の肌':'Very fair skin','浅黒い肌':'Dusky skin','強いカールのアフロテクスチャ':'tightly coiled afro-textured hair','細かいカールヘア':'fine curly hair','ショートフェード':'short fade cut','タイトなアフロショート':'tight afro short cut','ツイストショート':'short twists','額に一束落ちる長め前髪':'long bangs with a single strand falling over the forehead','自然に下ろした前髪':'naturally-down bangs','軽く上げた前髪':'lightly swept-up bangs','かき上げ風前髪':'swept-back bangs','眉にかかる重め前髪':'heavy brow-length bangs','短く切り揃えた前髪':'short trimmed bangs','ツヤを抑えたナチュラルセット':'matte natural styling with soft flow','ワックスの束感セット':'waxed, textured styling','きっちり撫でつけたセット':'neatly slicked styling','無造作セット':'effortless tousled styling','パーマ風の動きを出したセット':'perm-like wavy styling','毛量多め':'Thick hair volume','毛量少なめ':'Thin hair volume','標準的な毛量':'Average hair volume','七三分け':'7:3 side part','ナチュラルテーパー短髪':'natural tapered short cut','清潔感のある社会人系':'Clean-cut professional','卵型寄りのベース型（顎まわりに厚み）':'Oval-leaning square face with a full jawline','眉尻の上がった太めの直線眉':'Thick straight eyebrows with upturned tails','整えたシャープな直線眉':'Groomed sharp straight eyebrows','眉尻の上がったアーチ眉':'Arched eyebrows with upturned tails','丸みのあるしっかりした顎先':'Rounded yet firm chin','とても濃い眉':'Very thick eyebrows','やや濃い眉':'Somewhat thick eyebrows','やや薄めの眉':'Somewhat thin eyebrows','薄い眉':'Thin eyebrows','ほんのり日焼けした肌':'Lightly sun-kissed skin','少し日焼けした肌':'Slightly tanned skin','小麦色に日焼けした肌':'Golden tanned skin','しっかり日焼けした肌':'Deeply tanned skin','屋外仕事のこんがり日焼け肌':'Weathered outdoor working tan','マットで自然な肌':'Matte natural skin','スポーツ経験者らしい肌':'Sporty skin texture',
    'ごく薄い青ひげ':'Very light beard shadow','自然な無精ひげ':'Natural stubble','整えた短いひげ':'Neatly trimmed short beard','口ひげあり':'Mustache','あごひげあり':'Goatee',
    '短髪':'Short hair','アップバング':'Up-bangs','センターパート':'Center part','サイドパート':'Side part','マッシュ':'Mushroom cut','ソフトツーブロック':'Soft two-block','ビジネス短髪':'Business short hair','韓国風センターパート':'Korean-style center part','ニュアンスパーマ':'Loose perm','ツイストパーマ':'Twist perm','スパイラルパーマ':'Spiral perm','波巻きパーマ':'Wave perm','ウルフミディアム':'Medium wolf cut','ロング寄りミディアム':'Long medium hair','マンバン':'Man bun',
    '黒':'Black','ブルーブラック':'Blue-black','黒に近いダークブラウン':'Very dark brown','自然な茶髪':'Natural brown','アッシュブラウン':'Ash brown','グレージュ':'Greige','明るめブラウン':'Light brown',
    '紺スーツ':'Navy suit','黒スーツ':'Black suit','グレースーツ':'Gray suit','大学生カジュアル':'College casual','社会人カジュアル':'Working-adult casual','スポーツ練習着':'Sports practice wear','学生服（学ラン）':'School uniform (gakuran)','学生服（ブレザー）':'School uniform (blazer)','制服風コーデ':'Uniform-inspired outfit','私服通学風':'Casual commuting outfit','ジャケットスタイル':'Jacket style','ストリート系':'Streetwear',
    '指定なし':'Not specified','無地ノーブランド':'Plain unbranded','グンゼ':'GUNZE','学生服メーカー指定なし':'School uniform brand not specified',
    'テーラードジャケット':'Tailored jacket','学生ブレザー':'School blazer','学ラン上着':'Gakuran jacket','ステンカラーコート':'Bal-collar coat','チェスターコート':'Chester coat','MA-1':'MA-1 jacket','スタジャン':'Varsity jacket','カーディガン':'Cardigan','パーカー':'Hoodie','デニムジャケット':'Denim jacket','ナイロンジャケット':'Nylon jacket','スポーツジャケット':'Sports jacket',
    '白シャツ':'White shirt','サックスブルーシャツ':'Sax blue shirt','制服用ワイシャツ':'Uniform shirt','ブレザー用シャツ':'Blazer shirt','ネクタイ付きシャツ':'Shirt with tie','無地Tシャツ':'Plain T-shirt','オーバーサイズTシャツ':'Oversized T-shirt','ロングスリーブTシャツ':'Long-sleeve T-shirt','ポロシャツ':'Polo shirt','ニット':'Knit top','カーディガンインナー':'Cardigan innerwear','スウェット':'Sweatshirt','スポーツシャツ':'Sports shirt','ゲームシャツ':'Game shirt',
    '黒スラックス':'Black slacks','紺スラックス':'Navy slacks','グレースラックス':'Gray slacks','学生スラックス':'Student slacks','ブレザー用スラックス':'Blazer slacks','学ラン用ズボン':'Gakuran trousers','チノパン':'Chinos','ワイドパンツ':'Wide pants','カーゴパンツ':'Cargo pants','デニム':'Denim jeans','ストレートデニム':'Straight jeans','ジャージパンツ':'Track pants','ナイロンパンツ':'Nylon pants','黒ショートパンツ':'Black shorts','ハーフパンツ':'Half pants',
    'ライトグレー':'Light gray','ネイビー':'Navy','白':'White','チャコール':'Charcoal','ダークグレー':'Dark gray',
    '黒革靴':'Black leather shoes','茶革靴':'Brown leather shoes','ローファー':'Loafers','白スニーカー':'White sneakers','黒スニーカー':'Black sneakers','キャンバススニーカー':'Canvas sneakers','ランニングシューズ':'Running shoes','サッカースパイク':'Soccer cleats','バスケットシューズ':'Basketball shoes','サンダル':'Sandals','ブーツ':'Boots',
    'ビジネスソックス':'Business socks','柄ありビジネスソックス':'Patterned business socks','スポーツソックス':'Sports socks','クルー丈ソックス':'Crew socks','くるぶしソックス':'Ankle socks','インビジブルソックス':'Invisible socks','ライン入りソックス':'Striped socks','ワンポイントソックス':'Socks with one-point accent','ロゴ入りソックス':'Logo socks',
    'クルー丈':'Crew length','ミドル丈':'Mid length','くるぶし丈':'Ankle length','インビジブル丈':'Invisible length','リブ編み':'Ribbed','薄手ビジネス形状':'Thin business shape','厚手スポーツ形状':'Thick sports shape',
    '綿混':'Cotton blend','綿＋ナイロン':'Cotton + nylon','ウール混':'Wool blend','薄手ナイロン混':'Light nylon blend','パイル編み':'Pile knit','リブ編みコットン':'Ribbed cotton','吸汗速乾素材':'Moisture-wicking quick-dry material',
    'グレー':'Gray','ブラウン':'Brown','ネイビー地ストライプ':'Navy striped','黒地ドット':'Black with dots','アーガイル柄':'Argyle pattern','ライン入り白':'White with lines',
    '新品に近い':'Like new','自然な使用感':'Naturally worn','少し履き込まれている':'Slightly well-worn','毛羽立ちが少しある':'Slightly fuzzy','スポーツ後の自然な使用感':'Naturally worn after sports','清潔だが生活感あり':'Clean but lived-in',
    'ギリシャ型':'Greek foot','エジプト型':'Egyptian foot','スクエア型':'Square foot','幅広':'Wide','細め':'Narrow','甲高':'High instep','土踏まず高め':'High arch','土踏まず低め':'Low arch','足指が長め':'Long toes','親指が長め':'Long big toe',
    'シンプルなグレーバック':'Simple gray backdrop','白背景のスタジオ':'White studio background','ライトグレーのスタジオ':'Light gray studio','黒背景のスタジオ':'Black studio background','大学キャンパス背景':'University campus background','学校の廊下背景':'School hallway background','街中スナップ背景':'Street-snap background','オフィス背景':'Office background','スポーツ施設背景':'Sports facility background','ジム背景':'Gym background','テーマパーク風背景':'Theme-park-like background','海辺・港町背景':'Seaside / harbor-town background','夜景背景':'Nightscape background','公園背景':'Park background','室内の自然光背景':'Indoor natural-light background',
    '自然光。明るく清潔感がある。':'Natural light, bright and clean.','柔らかいスタジオ照明。':'Soft studio lighting.','曇天の拡散光。':'Overcast diffused light.','写真館風の正面ライト。':'Photo-studio frontal lighting.','斜め45度のスタジオライト。':'45-degree studio lighting.','屋外スポーツ撮影風の明るい光。':'Bright outdoor sports-style lighting.','夜景に馴染む控えめなライティング。':'Subtle lighting suited to night scenes.',
    '実写風':'Photorealistic','高精細':'High detail','スマホスナップ風':'Smartphone snapshot style','写真館風':'Studio portrait style','ファッションカタログ風':'Fashion catalog style','AI感を抑えた自然写真':'Natural photo with reduced AI look','商業写真風':'Commercial photography style','雑誌グラビアではなく設定資料風':'Reference-sheet style rather than gravure','イラスト風':'Illustration style','アニメ風イラスト':'Anime-style illustration','漫画風線画':'Manga-style line art','キャラクター設定画風':'Character reference sheet style',
    '前面・側面を1枚にまとめた設定画像':'Combined front-and-side reference image','前面・側面・背面を1枚にまとめた設定画像':'Combined front-side-back reference image','16:9リファレンスカード（全身前面・側面／顔正面・側面／足詳細）':'16:9 reference card (full body front/side, face front/side, foot details)','16:9のリファレンスカードとして、全身の前面・側面、顔の正面・側面・斜め45度、顔正面（歯が見える）、足の正面と側面と足裏（人物が座って自分の足裏をこちらへ見せる構図とし、足裏だけが切り離されて描写された状態にしない）を1枚に整理して表示する。':'16:9 reference card with full body front/side, face front/side, face front with teeth visible, and foot front/side/sole shown by the seated person himself','SNSプロフィール風画像':'SNS profile-style image','就活写真風画像':'Job-hunting photo style image','スポーツ選手紹介風画像':'Athlete introduction-style image',
    '1枚':'1 image','3パターン別々の画像':'3 separate variations','5パターン別々の画像':'5 separate variations','10パターン別々の画像':'10 separate variations','10パターン別々の画像':'10 separate variations','日本語':'Japanese','English':'English',
    '自然な青ひげ':'Natural beard shadow','短い無精ひげ':'Short stubble','口ひげ':'Mustache','あごひげ':'Goatee','口ひげ＋あごひげ':'Mustache + goatee','ワイルドめのひげ':'Wild beard style',
    'トレーディングカード風画像':'Trading-card-style image','トレーディングカード風リファレンスカード':'Trading-card-style reference card','レアカード風トレーディングカード画像':'Rare trading-card-style image','シンプルな設定カード風画像':'Simple character card-style image',
    'カード風ミニプロフィールを下部に表示':'Mini profile card at the bottom','スタイリッシュなタグ型で表示':'Stylish tag-style display',
    'スタンダード':'Standard','シンプル':'Simple','スタイリッシュ':'Stylish','スポーツカード風':'Sports-card style','アイドルカード風':'Idol-card style','高級感のあるカード風':'Premium card style','レアカード風':'Rare card style','ホログラム風':'Holographic style','コレクターズカード風':'Collectors-card style',
    'モノトーン':'Monotone','ブラックゴールド':'Black gold','シルバー':'Silver','ブルー':'Blue','レッド':'Red','グリーン':'Green','パープル':'Purple','ランダムカラー':'Random colors',
    '縦長カード':'Vertical card','横長カード':'Horizontal card','情報重視型':'Information-focused','ビジュアル重視型':'Visual-focused','ステータス重視型':'Stats-focused','リファレンス資料型':'Reference-sheet layout',
    '偶然人物ブループリントシート':'Chance-encounter character blueprint sheet',
    '街で見かけたイケメンシート：職業編':'Spotted-in-town sheet: at work','街で見かけたイケメンシート：オフ編':'Spotted-in-town sheet: off duty','偶然足元強調場面シート':'Chance foot-focus scene sheet','人物特集雑誌ページ':'Character feature magazine page',
    '服装リファレンスシート（職業背景）':'Outfit reference sheet (occupation backdrop)','人物ポスター（職業・人物像）':'Character poster (occupation & persona)',
    '比較リファレンスシート（下着×私服・靴なし）':'Comparison reference sheet (underwear × outfit, no shoes)','表情差分リファレンスシート':'Expression variation reference sheet','フル設定資料シート':'Full character reference sheet','段階着装リファレンスシート':'Step-by-step dressing reference sheet',
    '大学生':'University student','大学院生':'Graduate student','専門学校生':'Vocational school student','就活中の大学生':'Job-hunting university student',
    '営業職':'Sales representative','経理・事務職':'Accounting / office clerk','企画職':'Planning staff','公務員':'Civil servant','銀行員':'Bank employee','商社勤務':'Trading company employee','コンサルタント':'Consultant','不動産営業':'Real estate agent',
    'ITエンジニア':'IT engineer','Webデザイナー':'Web designer','ゲーム開発者':'Game developer','動画クリエイター':'Video creator','アプリ開発者':'App developer',
    '看護師':'Nurse','理学療法士':'Physical therapist','薬剤師':'Pharmacist','研修医':'Medical resident','介護士':'Care worker',
    '高校教師':'High school teacher','塾講師':'Cram school teacher','保育士':'Childcare worker','大学研究員':'University researcher','体育教師':'PE teacher',
    'アパレル店員':'Apparel shop staff','カフェ店員':'Cafe staff','美容師':'Hair stylist','バーテンダー':'Bartender','ホテルスタッフ':'Hotel staff','飲食店店長':'Restaurant manager','書店員':'Bookstore clerk','コンビニ店長':'Convenience store manager',
    '自動車整備士':'Car mechanic','電気工事士':'Electrician','大工':'Carpenter','建築士':'Architect','工場勤務':'Factory worker','配送ドライバー':'Delivery driver','農家':'Farmer','漁師':'Fisherman',
    'グラフィックデザイナー':'Graphic designer','カメラマン':'Photographer','ミュージシャン':'Musician','編集者':'Editor','イラストレーター':'Illustrator','映像ディレクター':'Film director',
    '消防士':'Firefighter','警察官':'Police officer','自衛官':'JSDF member','ジムトレーナー':'Gym trainer','スポーツインストラクター':'Sports instructor','モデル':'Model','俳優':'Actor','プロスポーツ選手':'Professional athlete',
    '喫茶店マスター':'Coffee shop master','新聞記者':'Newspaper reporter','国鉄職員':'National railway worker','鉄道職員':'Railway staff',
    'お笑い芸人':'Comedian','声優':'Voice actor','YouTuber':'YouTuber','プロゲーマー':'Pro gamer','書道家':'Calligrapher','パティシエ':'Pastry chef','寿司職人':'Sushi chef','ラーメン店店主':'Ramen shop owner','僧侶':'Buddhist monk (in casual clothes)','古着屋店主':'Vintage clothing shop owner','悠々自適（定年後）':'Comfortably retired','救急隊員':'Paramedic','防衛大学校学生':'National Defense Academy cadet',
    '野球':'Baseball','サッカー':'Soccer','バスケットボール':'Basketball','バレーボール':'Volleyball','ラグビー':'Rugby','柔道':'Judo','剣道':'Kendo','陸上短距離':'Sprinting','陸上長距離':'Long-distance running','水泳':'Swimming','テニス':'Tennis','卓球':'Table tennis','ボクシング':'Boxing','ゴルフ':'Golf','自転車ロード':'Road cycling','体操':'Gymnastics',
    'ネイビーブラック':'Navy black','ダークアッシュ':'Dark ash','ダークチェリーブラウン':'Dark cherry brown','チョコレートブラウン':'Chocolate brown','赤みブラウン':'Reddish brown','マロンブラウン':'Marron brown','カーキブラウン':'Khaki brown','オリーブアッシュ':'Olive ash','ブルージュ':'Blue-beige (bluege)','ラベンダーグレージュ':'Lavender greige','ミルクティーベージュ':'Milk tea beige','ナチュラルブロンド':'Natural blond','ダークブロンド':'Dark blond','既製の実用衣料':'Plain practical clothing','ロシア':'Russia','スウェーデン':'Sweden','ポーランド':'Poland','トルコ':'Turkey','アルゼンチン':'Argentina','モンゴル':'Mongolia','ナイジェリア':'Nigeria','スラブ系':'Slavic','北欧系':'Nordic','南欧系':'Southern European','オレンジブラウン':'Orange brown','ハイトーンアッシュ':'High-tone ash','シルバーアッシュ':'Silver ash','ブリーチベージュ':'Bleached beige','金髪（ブリーチ）':'Bleached blond','メッシュ入りブラック':'Black with highlights','インナーカラー（アッシュ）':'Ash inner color','プリン気味の伸びた茶髪':'Grown-out brown with dark roots','白髪まじり':'Salt-and-pepper (slight gray)','ロマンスグレー':'Distinguished gray','ごま塩頭':'Salt-and-pepper hair','ほぼ白髪':'Mostly white hair',
    '黒縁メガネ':'Black-rimmed glasses','細フレームメガネ':'Thin-frame glasses','メタルフレームメガネ':'Metal-frame glasses','丸メガネ':'Round glasses','ハーフリムメガネ':'Half-rim glasses','縁なしメガネ':'Rimless glasses','金縁メガネ':'Gold-rimmed glasses',
    '職業制服':'Work uniform','書生風スタイル（着物＋袴＋学帽）':'Meiji-student style (kimono, hakama, cap)','着物と羽織':'Kimono with haori coat','国民服風':'Wartime national uniform style','開襟シャツスタイル':'Open-collar shirt style','三つ揃いスーツ':'Three-piece suit','仕立て・既製品':'Tailored / ready-made','支給品・制服':'Issued uniform',
    '参照画像前提（簡潔版）':'Reference-image based (concise)','単体で完結（フル記述）':'Standalone (full description)','トレーディングカード':'Trading card',
    'スキンフェード':'Skin fade','ローフェード':'Low fade','フェード×ツイストスパイラル':'Fade with twist-spiral perm','バーバースタイル（七三フェード）':'Barber style (side-part fade)','クロップスタイル':'Crop cut','マッシュウルフ':'Mash-wolf cut','ソフトモヒカン':'Soft mohawk','アシメショート':'Asymmetric short cut',
    '春':'Spring','夏':'Summer','秋':'Autumn','冬':'Winter',
    '結果画面のみ表示':'Show on result screen only','画像内にも表示する':'Also render inside the image','表示しない':'Hide',
    '服装・場面・体型に反映':'Affects outfit, scene, and body','場面のみに反映':'Affects scene only','影響なし':'No influence',
    'ビール腹':'Beer belly','中肉中背':'Average build','細マッチョ':'Lean muscular','隠れ筋肉質':'Secretly muscular','逆三角形体型':'V-shaped torso','華奢な体型':'Delicate slender build','水泳選手体型':'Swimmer build (broad shoulders, V-shape)','バスケットボール選手体型':'Basketball player build (tall, lean-muscular)','ラグビー選手体型':'Rugby player build (thick and powerful)','柔道家体型':'Judoka build (heavy-set, strong)','陸上短距離選手体型':'Sprinter build (explosive muscles)','陸上長距離選手体型':'Distance runner build (lean and wiry)','クライマー体型':'Climber build (defined upper body)','骨太体型':'Big-boned build','肩幅広め体型':'Broad-shouldered build',
    '普通系':'Ordinary','地味系':'Plain / modest','オタク系':'Otaku','ヤンキー系':'Yankee (delinquent style)','ホスト系':'Host club style','おじさん系':'Middle-aged guy','メガネ知的系':'Intellectual with glasses','ブサイク系':'Homely-looking',
    '昭和顔（濃い顔立ち）':'Showa-era bold features','しょうゆ顔':'Light refined features (shoyu-gao)','ソース顔':'Deep bold features (sauce-gao)','彫りの深い縄文系':'Deep-set Jomon-type features','あっさり弥生系':'Soft Yayoi-type features','たれ目系':'Droopy-eyed type','つり目系':'Upturned-eyed type','平成アイドル風':'Heisei idol style',
    'なし（クリアな肌）':'None (clear skin)','頬にそばかす':'Freckles on the cheeks','鼻まわりに薄いそばかす':'Light freckles around the nose','額に小さなニキビ':'A few small pimples on the forehead','頬にニキビ跡（薄い凹凸）':'Faint acne scars on the cheeks','口元のほくろ':'A mole near the mouth','目元の泣きぼくろ':'A teardrop mole under the eye','首筋のほくろ':'A mole on the neck','頬の小さなほくろ':'A small mole on the cheek','うっすら青ひげ（剃り跡）':'A faint shaved-beard shadow','日焼けによる肌ムラ':'Slight tan unevenness','えくぼ':'Dimples','左頬の薄い傷跡':'A faint scar on the left cheek','眉尻の剃り込み跡':'A shaved slit at the eyebrow tail','目の下のうっすらしたクマ':'Faint under-eye circles','頬の自然な赤み':'A natural flush on the cheeks','額の皮脂感（自然なテカリ）':'A natural sheen on the forehead','頬の毛穴感（自然な質感）':'Natural visible pores on the cheeks','腕まくり日焼けの跡':'A rolled-sleeve tan line','ゴーグル跡の日焼けムラ':'A goggle-shaped tan line','眉間のしわ':'A crease between the brows','目尻の笑いじわ':'Smile lines at the eye corners','ほうれい線':'Nasolabial folds','頬の薄いシミ':'Faint sun spots on the cheeks','首のしわ':'Neck lines',
    '年相応の渋さがある':'Age-appropriate seasoned look','穏やかな年配の風格':'Calm elderly dignity',
    'やんちゃ系':'Mischievous type','勤務帰り':'After work','休日':'Day off',
    '1人（通常）':'Solo (normal)','2人グループ':'Group of 2','3人グループ':'Group of 3',
    'メンバーごとに別々の指示文':'Separate prompts per member','1つの指示文にまとめて生成':'One combined prompt for all members',
    '同じ大学のサークル仲間':'University club friends','高校からの友人':'Friends since high school','バイト仲間':'Part-time job coworkers','地元の幼なじみ':'Childhood friends from hometown','職場の同期':'Coworkers who joined the same year','大学時代からの友人':'Friends since university','バンド仲間':'Bandmates','スポーツ仲間':'Sports buddies','ジム仲間':'Gym buddies','職場の仲間':'Workplace friends','学生時代からの友人':'Friends since school days','趣味仲間':'Hobby friends',
    'リーダー格':'Leader type','ムードメーカー':'Mood maker','クール担当':'The cool one','しっかり者':'The reliable one','いじられ役':'The teased one','マイペース担当':'The easygoing one',
    'ボクサーパンツのみ':'Boxer briefs only','職業服装':'Work outfit','私服':'Casual outfit',
    'レトロ系':'Retro','モード系':'Mode / high fashion','アウトドア系':'Outdoor','バンドマン系':'Band musician','紳士系':'Gentleman','ギャル男系':'Gyaru-o (flashy)',
    '商社マン風':'Trading-company businessman style','工場勤務風':'Factory worker style','新聞記者風':'Newspaper reporter style','時代に合った下着の種類':'Era-appropriate underwear','提案服装':'Suggested outfit','白ブリーフ':'Classic white briefs','カラーブリーフ':'Colored classic briefs','トランクス':'Trunks-style boxer shorts','ボクサーパンツ':'Boxer briefs',
    '光沢風':'Glossy effect','箔押し風':'Foil-stamped effect','キラ加工風':'Sparkle effect','フレーム強調':'Emphasized frame','角丸カード風':'Rounded-card style','エンブレム付き':'With emblem',
    'ほぼなし':'Almost none','薄め':'Light','自然':'Natural','やや濃い':'Slightly thick','濃い':'Thick','部位差あり':'Varies by area','手入れされている':'Groomed','ワイルド寄り':'Wild-leaning','スポーツ系で自然':'Natural sporty','一部のみ目立つ':'Only some areas stand out','ごく薄い':'Very light','手入れ済み':'Groomed','部分的に残している':'Partially kept'

  };

  const sceneTranslations = {
    '駅の伝言板や喫茶店の窓際の近くで、当時らしい落ち着いた私服姿を偶然見かけた場面':'A candid moment near a station message board or a coffee shop window, in a calm outfit that suits the era',
    '商店街のレコード店の前で立ち止まっている姿を偶然見かけた場面':'A candid moment of him pausing in front of a record shop in a shopping street',
    '喫茶店や貸レコード店の近くで、時代の空気をまとった私服姿を偶然見かけた場面':'A candid moment near a coffee shop or record rental store, wearing clothes that carry the mood of the era',
    'レンタルビデオ店やゲームセンターの前で、友人を待つ姿を偶然見かけた場面':'A candid moment of him waiting for friends in front of a video rental shop or an arcade',
    '公衆電話の近くで連絡を待つような姿を偶然見かけた場面':'A candid moment of him seemingly waiting for a call near a public phone booth',
    'CDショップや携帯ショップの前で、ふと立ち止まる姿を偶然見かけた場面':'A candid moment of him pausing in front of a CD shop or a mobile phone store',
    'カフェの前でスマートフォンを見ながら待ち合わせている姿を偶然見かけた場面':'A candid moment of him checking his smartphone while waiting in front of a cafe',
    'カフェや商業施設の前で、スマートフォンを片手に自然体でたたずむ姿を偶然見かけた場面':'A candid moment of him standing naturally with a smartphone in hand in front of a cafe or shopping complex',
    '喫茶店やレコードショップの近くで、レトロな雰囲気の私服姿を偶然見かけた場面':'A candid moment near a coffee shop or record store, in a retro-flavored outfit',
    'ライブハウスの入り口近くで、機材を持って立っている姿を偶然見かけた場面':'A candid moment of him standing near a live-house entrance with some equipment',
    '落ち着いたホテルのロビーや上質な街並みで、品のある立ち姿を偶然見かけた場面':'A candid moment of a refined standing figure in a calm hotel lobby or an elegant street',
    '公園の入り口やアウトドアショップの前で、身軽な服装でたたずむ姿を偶然見かけた場面':'A candid moment near a park entrance or an outdoor gear shop, in light comfortable clothes',
    '繁華街の通りで、華やかな雰囲気で友人と話している姿を偶然見かけた場面':'A candid moment of him chatting with friends in a flashy downtown street',
    'セレクトショップやギャラリー前で、モードな私服姿を偶然見かけた場面':'A candid moment in a high-fashion outfit in front of a select shop or gallery',
    'オフィス街の交差点で、書類鞄を持って颯爽と歩く姿を偶然見かけた場面':'A candid moment of him striding through an office-district crossing with a briefcase',
    '工場や作業場の近くで、仕事帰りに私服へ着替えた姿を偶然見かけた場面':'A candid moment near a factory or workshop, changed into casual clothes on his way home',
    '駅から学校へ向かう途中、朝の通学路でふと見かけた場面':'A casually spotted moment on the morning route from the station to school.',
    '出勤前の駅前やオフィス街で偶然すれ違った場面':'A chance encounter near a station or office district before work.',
    '大学施設や作業スペースの近くで、資料やPCを持って移動しているところを偶然見かけた場面':'A chance sighting near a university facility or workspace while he is moving with documents or a laptop.',
    'スポーツ施設の外や練習帰りの通路で、汗が引いた自然な状態を偶然見かけた場面':'A chance sighting outside a sports facility or on the way back from practice, after he has cooled down.',
    '街中で撮影や移動の合間に、ふと立ち止まった瞬間を偶然見かけた場面':'A chance sighting in the city when he briefly pauses between shoots or while moving around.',
    '夕方の街角で、少しラフな雰囲気で歩いているところを偶然見かけた場面':'A chance sighting at a street corner in the evening, walking with a slightly rough vibe.',
    '駅前や繁華街の通りで、友人と合流する前の自然な姿を偶然見かけた場面':'A chance sighting near a station or downtown street before meeting friends.',
    'カフェ前や落ち着いた街角で、柔らかい雰囲気の立ち姿を偶然見かけた場面':'A chance sighting near a café or a calm street corner, standing with a soft vibe.',
    '古着屋や小さなギャラリーの近くで、個性的な私服姿を偶然見かけた場面':'A chance sighting near a thrift shop or a small gallery, wearing distinctive casual clothes.',
    '夜の駅前や静かな通りで、落ち着いた雰囲気で歩く姿を偶然見かけた場面':'A chance sighting near a station at night or on a quiet street, walking with a calm vibe.',
    'カフェや商業施設の近くで、洗練された私服姿を偶然見かけた場面':'A chance sighting near a café or shopping complex, wearing polished casual clothes.',
    '駅前や商店街、学校やオフィスの近くで、日常の流れの中に自然に溶け込んでいるところを偶然見かけた場面':'A chance sighting near a station, shopping street, school, or office, naturally blending into everyday life.',
    '都会的なカフェ通りや商業施設の近くで、洗練された雰囲気の立ち姿を偶然見かけた場面':'A chance sighting near an urban café street or shopping complex, standing with a refined vibe.',
    '大型商業施設や夜の街並みの近くで、都会的な私服姿を偶然見かけた場面':'A chance sighting near a large shopping complex or a night cityscape, wearing urban casual clothes.',
    '大学キャンパス周辺やダウンタウンの歩道で、自然に歩いている姿を偶然見かけた場面':'A chance sighting around a university campus or downtown sidewalk, walking naturally.',
    '街路樹のある通りやカフェテラスの近くで、さりげなく立っている姿を偶然見かけた場面':'A chance sighting on a tree-lined street or near a café terrace, standing casually.',
    '広場やスポーツコートの近くで、活動的で親しみやすい雰囲気の姿を偶然見かけた場面':'A chance sighting near a plaza or sports court, with an active and friendly vibe.',
    'にぎやかな通りや屋外カフェの近くで、軽やかな私服姿を偶然見かけた場面':'A chance sighting near a lively street or outdoor café, wearing light casual clothes.',
    '東南アジアの都市部の街角や屋外カフェの近くで、軽やかな私服姿を偶然見かけた場面':'A chance sighting near an urban street corner or outdoor café in Southeast Asia, wearing light casual clothes.',
    '日常の街中で、自然体の姿を偶然見かけた場面':'A chance sighting in an everyday urban setting, looking natural and at ease.',
    '出勤前の静かな駅前やオフィス街で、落ち着いた雰囲気で歩いているところを偶然見かけた場面':'A chance sighting near a quiet station or office district before work, walking with a calm presence.',
    '夕方の街角やスポーツ施設帰りに、活動的な雰囲気で友人と合流する前の姿を偶然見かけた場面':'A chance sighting at an evening street corner or after leaving a sports facility, before meeting friends with an active vibe.',
    'カフェ前や古着屋、小さなギャラリーの近くで、自然体の私服姿を偶然見かけた場面':'A chance sighting near a café, thrift shop, or small gallery, wearing natural casual clothes.',
    'にぎやかな通りや商業施設周辺で、明るい雰囲気で友人を待つ姿を偶然見かけた場面':'A chance sighting on a lively street or near a shopping complex, waiting for friends with a bright vibe.',
    '大学施設や静かな作業スペースの近くで、考え込むように歩く姿を偶然見かけた場面':'A chance sighting near a university facility or quiet workspace, walking as if deep in thought.'
  };

  function displayValue(key, value){
    if(value===undefined || value===null) return value;
    if(key==='captionMode') return captionModeDisplay(value);
    if(uiLang!=='en') return value;
    if(key==='age') return `${value} years old`;
    if(key==='eraYear') return `${value} CE`;
    if(key==='sceneIdea') return sceneTranslations[String(value)] || value;
    return valueTranslations[String(value)] || value;
  }

  const captionFieldLabelMap = {
    name:{ja:'氏名',en:'Name'}, age:{ja:'年齢',en:'Age'}, era:{ja:'年代',en:'Era'}, height:{ja:'身長',en:'Height'}, weight:{ja:'体重',en:'Weight'}, footSize:{ja:'足のサイズ',en:'Foot Size'}, mbti:{ja:'MBTI・性格',en:'MBTI / Personality'}, nationality:{ja:'国籍',en:'Nationality'}, role:{ja:'職業',en:'Occupation'}
  };

  const cardFieldLabelMap = {
    name:{ja:'氏名',en:'Name'}, age:{ja:'年齢',en:'Age'}, era:{ja:'年代',en:'Era'}, height:{ja:'身長',en:'Height'}, weight:{ja:'体重',en:'Weight'}, footSize:{ja:'足サイズ',en:'Foot Size'}, nationality:{ja:'国籍',en:'Nationality'}, ethnicity:{ja:'人種',en:'Ethnicity'}, role:{ja:'職業',en:'Occupation'}, vibe:{ja:'雰囲気',en:'Vibe'}, mbti:{ja:'MBTI',en:'MBTI'}, facePreset:{ja:'顔立ち',en:'Face Type'}, bodyType:{ja:'体型',en:'Body Type'}, footShape:{ja:'足の形',en:'Foot Shape'}, bodyHairOverall:{ja:'体毛',en:'Body Hair'}, outfitType:{ja:'提案服装',en:'Outfit'}, scene:{ja:'場面',en:'Scene'}, rarity:{ja:'レアリティ',en:'Rarity'}
  };

  function mbtiDescription(code, english=false){
    const ja = {
      INTJ:'戦略的で独立心が強い', INTP:'論理的で探究心が強い', ENTJ:'決断力がありリーダー気質', ENTP:'発想力豊かで刺激を好む',
      INFJ:'理想志向で思慮深い', INFP:'感受性が高くマイペース', ENFJ:'面倒見がよく社交的', ENFP:'明るく自由なムードメーカー',
      ISTJ:'誠実で安定感がある', ISFJ:'穏やかで気配り上手', ESTJ:'現実的で頼れる', ESFJ:'協調性が高く親しみやすい',
      ISTP:'寡黙で実践的', ISFP:'自然体で柔らかい', ESTP:'行動的でノリが良い', ESFP:'華やかで人懐っこい'
    };
    const en = {
      INTJ:'strategic and independent', INTP:'logical and curious', ENTJ:'decisive natural leader', ENTP:'inventive and stimulation-seeking',
      INFJ:'idealistic and thoughtful', INFP:'sensitive and easygoing', ENFJ:'social and supportive', ENFP:'bright and free-spirited',
      ISTJ:'sincere and steady', ISFJ:'gentle and attentive', ESTJ:'practical and dependable', ESFJ:'friendly and cooperative',
      ISTP:'quiet and hands-on', ISFP:'soft and natural', ESTP:'action-oriented and upbeat', ESFP:'charismatic and approachable'
    };
    return (english?en:ja)[code] || code;
  }

  function mbtiDisplay(c){
    if(!c?.mbti) return '';
    return `${c.mbti} / ${mbtiDescription(c.mbti, uiLang==='en')}`;
  }

  function captionModeDisplay(mode){
    if(uiLang!=='en') return mode || '表記しない';
    const map = {'画像下部に1行で表記':'One-line footer text','カード風ミニプロフィールを下部に表示':'Mini profile card at the bottom','スタイリッシュなタグ型で表示':'Stylish tag-style display','表記しない':'No text overlay'};
    return map[mode] || 'No text overlay';
  }

  function getCaptionFieldLabelsArray(c, english=false){
    const labels = [];
    const fields = c?.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true};
    Object.entries(captionFieldLabelMap).forEach(([k,map])=>{ if(fields[k]) labels.push(english?map.en:map.ja); });
    return labels;
  }

  function buildCaptionLine(c, english=false){
    const parts = [];
    const fields = c?.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true};
    if(fields.name) parts.push(english ? `Name: ${nameKana(c)}` : `氏名：${nameKana(c)}`);
    if(fields.age) parts.push(english ? `Age: ${c.age}` : `年齢：${c.age}歳`);
    if(fields.era) parts.push(english ? `Era: ${c.eraYear || '2026'}` : `年代：${eraLabel(c.eraYear)}`);
    if(fields.height) parts.push(english ? `Height: ${c.height}` : `身長：${c.height}`);
    if(fields.weight) parts.push(english ? `Weight: ${c.weight}` : `体重：${c.weight}`);
    if(fields.footSize) parts.push(english ? `Foot Size: ${c.footSize}` : `足のサイズ：${c.footSize}`);
    if(fields.mbti) parts.push(english ? `MBTI: ${c.mbti} (${mbtiDescription(c.mbti, true)})` : `MBTI：${c.mbti}（${mbtiDescription(c.mbti, false)}）`);
    if(fields.nationality) parts.push(english ? `Nationality: ${displayValue('nationality',c.nationality)}` : `国籍：${c.nationality}`);
    if(fields.role) parts.push(english ? `Occupation: ${displayValue('role',c.role)}` : `職業：${c.role}`);
    return parts.join(english ? ' / ' : '｜');
  }

  function buildCaptionInstruction(c, english=false){
    if(!c || c.captionMode==='表記しない'){
      return english ? 'Do not add any extra text inside the image.' : '画像内に追加の文字情報は入れない。';
    }
    const labelsArr = getCaptionFieldLabelsArray(c, english);
    if(!labelsArr.length) return english ? 'Do not add any extra text inside the image.' : '画像内に追加の文字情報は入れない。';
    const labels = labelsArr.join(', ');
    const sample = buildCaptionLine(c, english);
    if(c.captionMode==='カード風ミニプロフィールを下部に表示'){
      return english ? `Place a compact, stylish mini profile card at the lower left or lower right. Use a semi-transparent panel, clean spacing, and readable labels. Include: ${labels}. Example text: "${sample}".` : `画像下部の左または右に、半透明パネルのミニプロフィールカードを配置する。読みやすい余白とラベル設計にし、記載項目は${labels}。例：「${sample}」。`;
    }
    if(c.captionMode==='スタイリッシュなタグ型で表示'){
      return english ? `Display the profile as stylish capsule tags near the bottom. Keep the tags clean, aligned, and readable. Include: ${labels}. Example text: "${sample}".` : `画像下部付近に、スタイリッシュなカプセル型タグとしてプロフィールを表示する。整列感と可読性を重視し、記載項目は${labels}。例：「${sample}」。`;
    }
    if(c.captionMode==='表記する'){
      return english ? `Include a readable, well-designed profile text area that suits the selected output type. Use tasteful typography, good spacing, and a layout that does not distract from the character. Include: ${labels}. Example text: "${sample}".` : `選択した出力タイプに合う、読みやすくデザイン性のあるプロフィール表記を入れる。余白、文字サイズ、整列感を整え、人物を邪魔しない。記載項目は${labels}。例：「${sample}」。`;
    }
    return english ? `Add a clean single line of small readable text at the bottom of the image. Include: ${labels}. Use accurate text like: "${sample}". Keep the typography tasteful and not distracting.` : `画像下部に、小さく読みやすい1行の文字情報を入れる。記載項目は${labels}。例として「${sample}」のように正確に表記する。文字はデザイン性を重視し、人物を邪魔しない。`;
  }

  function normalizePromptTarget(v){ return v === 'Grok' ? 'Grok Imagine' : v; }

  function promptTargetGuide(c, english=false){
    const target = normalizePromptTarget(c?.promptTarget) || 'ChatGPT';
    if(english){
      if(target==='NanobananaPro') return 'Optimize the prompt for NanobananaPro with especially clear identity consistency, balanced full-body proportions, and accurate text rendering.';
      if(target==='Grok Imagine') return 'Describe everything affirmatively in natural language, most important elements first, so the result reads as one naturally captured photograph.';
      return 'Render all in-image text exactly as specified and add no elements that are not requested.';
    }
    if(target==='NanobananaPro') return 'NanobananaPro向けに、同一人物性、全身バランス、文字表記の正確さが安定するように明確に指示する。';
    if(target==='Grok Imagine') return '重要な要素から順に、否定形を避けた肯定形の自然な描写として、1枚の自然な写真になるよう反映する。';
    return '画像内の文字は指定どおり正確に描き、指示にない要素は追加しない。';
  }

  function suggestCardRarity(c){
    // レアリティは外見系（顔立ち・体型・身長）＋イケメン度のみで判定（内面・MBTIは対象外）
    let score = 0;
    try{ score += Math.max(0, ikemenBreakdown(c).reduce((a,[,p])=>a+p,0)); }catch(e){}
    if(['高身長モデル体型','スーツ映え体型','筋肉質','引き締まったスポーツ体型'].includes(c.bodyType)) score += 10;
    if(['高身長モデル系','韓国アイドル風','ミステリアス系','クール系','やりらふぃー系'].includes(c.facePreset)) score += 8;
    const hn = Number(String(c.height||'').replace(/[^0-9.]/g,'')) || 0;
    if(hn >= 183) score += 10; else if(hn >= 178) score += 6; else if(hn >= 174) score += 3;
    if(score >= 110) return 'Legendary';
    if(score >= 92) return 'Secret';
    if(score >= 76) return 'UR';
    if(score >= 60) return 'SSR';
    if(score >= 42) return 'SR';
    if(score >= 22) return 'R';
    return 'N';
  }

  function cardEffectByRarity(rarity){
    const r = rarity || 'R';
    if(r==='Legendary') return 'ホログラム風';
    if(r==='Secret') return '箔押し風';
    if(r==='UR') return 'キラ加工風';
    if(r==='SSR') return '光沢風';
    if(r==='SR') return 'フレーム強調';
    if(r==='R') return '角丸カード風';
    if(r==='N') return 'なし';
    return 'なし';
  }
  function readCardFields(scope){ return Object.assign({}, (CFG.cardFields||{})[scope] || {}); }

  function cardPoseGuide(c, english=false){
    const vibe = c?.vibe || '';
    const role = c?.role || '';
    const mbti = c?.mbti || '';
    if(english){
      if(vibe.includes('スポーツ') || role.includes('スポーツ') || ['ESTP','ESFP'].includes(mbti)) return 'Use a catchy athletic pose with confident movement, like a dynamic step forward or a light action-ready stance.';
      if(vibe.includes('クール') || vibe.includes('ミステリアス') || ['INTJ','INTP'].includes(mbti)) return 'Use a catchy cool pose with a composed gaze, slightly angled shoulders, and one hand near the jacket or pocket.';
      if(vibe.includes('韓国') || vibe.includes('中性') || ['INFP','ISFP'].includes(mbti)) return 'Use a stylish soft pose with a relaxed expression, clean hand placement, and a refined fashion-card feel.';
      if(vibe.includes('ワイルド') || vibe.includes('やりらふぃー') || vibe.includes('ストリート')) return 'Use a catchy street-style pose with confident posture, angled stance, and expressive hand placement.';
      if(vibe.includes('爽やか') || vibe.includes('清楚') || ['ENFJ','ENFP','ESFJ'].includes(mbti)) return 'Use a bright approachable pose with an open stance and a clean friendly expression.';
      return 'Use a catchy character-card pose that reflects his profile, vibe, role, and MBTI while staying natural and non-sexual.';
    }
    if(vibe.includes('スポーツ') || role.includes('スポーツ') || ['ESTP','ESFP'].includes(mbti)) return 'プロフィールに基づき、前へ踏み出すような動きや軽いアクション感のある、キャッチーなスポーツ系ポーズにする。';
    if(vibe.includes('クール') || vibe.includes('ミステリアス') || ['INTJ','INTP'].includes(mbti)) return 'プロフィールに基づき、肩を少し斜めにし、落ち着いた視線でジャケットやポケットに手を添えるようなクールでキャッチーなポーズにする。';
    if(vibe.includes('韓国') || vibe.includes('中性') || ['INFP','ISFP'].includes(mbti)) return 'プロフィールに基づき、柔らかい表情と自然な手元で、洗練されたファッションカード風のキャッチーなポーズにする。';
    if(vibe.includes('ワイルド') || vibe.includes('やりらふぃー') || vibe.includes('ストリート')) return 'プロフィールに基づき、斜め立ちや表情のある手元を使った、自信のあるストリートカード風のキャッチーなポーズにする。';
    if(vibe.includes('爽やか') || vibe.includes('清楚') || ['ENFJ','ENFP','ESFJ'].includes(mbti)) return 'プロフィールに基づき、開いた姿勢と親しみやすい表情の、明るくキャッチーなポーズにする。';
    return 'プロフィール、雰囲気、役割、MBTIに基づいた、自然で非性的なキャッチーなキャラクターカード用ポーズにする。';
  }

  function cardWearDescription(c, english=false){
    const mode = c?.cardWearMode || 'ボクサーパンツのみ';
    if(mode==='職業服装'){
      if(english) return `Use his work outfit: ${c.workUniform ? c.workUniformEn : `${c.outfitBrand?`${c.outfitBrand} `:''}${c.outfitType}`}. Outerwear: ${c.jacket}. Top: ${c.top}.${policeGearText(c,true)} Bottom: ${c.bottom}. Shoes: ${c.shoes}${uniformHatPhrase(c, true)}. Socks: ${c.sockBrand} ${c.sockType}.${c.workUniform ? ` Do not reproduce real organizations' insignia or logos.` : ''}`;
      return `カード内の服装は職業服装にする。${c.workUniform ? `${c.workUniform}を着用し、` : `${c.outfitBrand?`${c.outfitBrand}の`:''}${c.outfitType}を基調に、`}上着は${c.jacket}、トップスは${c.top}、ボトムスは${c.bottom}、靴は${c.shoes}${uniformHatPhrase(c, false)}、靴下は${c.sockBrand}の${c.sockType}。${c.workUniform ? '実在組織の記章・ロゴは正確に再現しない。' : ''}`;
    }
    if(mode==='私服'){
      const hb = c.holidayOutfitBrand || c.outfitBrand, ht = c.holidayOutfitType || c.outfitType;
      const hj = c.holidayJacket || c.jacket, htp = c.holidayTop || c.top, hbm = c.holidayBottom || c.bottom, hsh = c.holidayShoes || c.shoes;
      if(english) return `Use his casual outfit: ${hb} ${ht}. Outerwear: ${hj}. Top: ${htp}. Bottom: ${hbm}. Shoes: ${hsh}. Socks: ${c.holidaySockBrand || c.sockBrand} ${c.holidaySockType || c.sockType}.`;
      return `カード内の服装は私服にする。${hb}の${ht}を基調に、上着は${hj}、トップスは${htp}、ボトムスは${hbm}、靴は${hsh}、靴下は${c.holidaySockBrand || c.sockBrand}の${c.holidaySockType || c.sockType}。`;
    }
    if(english) return `Use only ${underwearDesc(c, true)} as the card outfit. ${underwearShapeGuide(c, true)} Keep the depiction non-sexual and neutral, like a body-reference character card.`;
    return `カード内の服装は${underwearDesc(c, false)}のみ。${underwearShapeGuide(c, false)}非性的で、体型確認用のキャラクターカードとして自然に見せる。`;
  }

  function buildCardInstruction(c, english=false){
    const fields = c.cardFields || {};
    const labels = Object.entries(cardFieldLabelMap).filter(([k])=>fields[k]).map(([k,map])=>english?map.en:map.ja).join(', ');
    const rarityText = c.cardRarity && c.cardRarity!=='おすすめ自動' ? c.cardRarity : suggestCardRarity(c);
    const effect = cardEffectByRarity(rarityText);
    const rarityReasonJa = `レアリティは、体型・顔立ち・雰囲気・MBTI・足サイズ・体毛・服装などの項目の組み合わせから「${rarityText}」を提案する。必要に応じてユーザーが変更できる。装飾効果はレアリティに準じて「${effect}」にする。`;
    const rarityReasonEn = `Suggest the rarity label "${rarityText}" based on the combination of body type, face type, vibe, MBTI, foot size, body hair, and outfit. The user can edit the rarity. The decorative effect should follow the rarity and be "${displayValue('cardEffect',effect)}".`;
    if(english){
      const rareExtra = ['SSR','UR','Secret','Legendary'].includes(rarityText) ? ' Add a premium finish appropriate to the rarity, while keeping the character and all text readable.' : '';
      return `Present the result as a high-quality original trading-card-style character design inspired by the visual polish of popular collectible trading cards, without copying any existing official card design. Put the logo text "GuzenIkemenMakerCARD" clearly on the card as an original brand logo. Card style: ${displayValue('cardStyle',c.cardStyle)}. Rarity label: ${rarityText}. Color theme: ${displayValue('cardTheme',c.cardTheme)}. Layout: ${displayValue('cardLayout',c.cardLayout)}. Decorative effect: ${displayValue('cardEffect',effect)}. ${rarityReasonEn} Include readable information panels or stat tags for: ${labels || 'name, profile, MBTI, and role'}. Use premium card framing, strong typography, clean icon-like accents, and a memorable collectible-card composition.${rareExtra}`;
    }
    const rareExtra = ['SSR','UR','Secret','Legendary'].includes(rarityText) ? '高レアリティにふさわしい高級感、光沢感、特別感を加える。ただし人物や文字の視認性は損なわない。' : '';
    return `人気トレーディングカードのようにデザイン性を高めた、オリジナルのトレーディングカード風キャラクターデザインとして構成する。ただし実在カードや公式カードの模倣ではなく、独自の架空キャラクターカードとして仕上げる。カード内に「GuzenIkemenMakerCARD」のロゴ文字を、オリジナルブランドロゴとしてはっきり入れる。カードスタイルは${c.cardStyle}、レアリティ表示は${rarityText}、配色テーマは${c.cardTheme}、レイアウトは${c.cardLayout}、装飾効果は${effect}。${rarityReasonJa}カード枠、情報パネル、ステータス欄、タグ欄を自然に配置し、表示項目は${labels || '氏名、プロフィール、MBTI、役割'}。人物を主役にしつつ、設定資料としての読みやすさとカードとしての見栄えを両立する。${rareExtra}`;
  }

  function buildBodyHairSummary(c, english=false){
    if(c && c.bodyHairMode === '自然な表現（簡潔）'){
      return english
        ? 'Body hair: a natural, age-appropriate amount overall, kept subtle — neither artificially hairless nor excessive.'
        : '体毛は年齢・体質相応の自然な範囲で、全体に控えめに描く（過度な無毛化も過剰な描写もしない）。';
    }
    if(!c) return '';
    const partsJa = [`体毛は全体として${c.bodyHairOverall}`];
    const areasJa = [['胸毛',c.chestHair],['腹毛',c.abdominalHair],['へそ下',c.lowerAbdomenHair],['腕毛',c.armHair],['すね毛',c.shinHair],['もも毛',c.thighHair],['脇毛',c.armpitHair],['手の甲・指毛',c.handFingerHair],['足の甲・指毛',c.footToeHair],['背中',c.backHair]];
    if(!english) return `${partsJa[0]}。${areasJa.map(([k,v])=>`${k}は${v}`).join('、')}。体毛表現は非性的で、成人男性の自然な身体特徴として描写する。`;
    const areasEn = [['chest hair',c.chestHair],['abdominal hair',c.abdominalHair],['lower abdomen hair',c.lowerAbdomenHair],['arm hair',c.armHair],['shin hair',c.shinHair],['thigh hair',c.thighHair],['armpit hair',c.armpitHair],['hand and finger hair',c.handFingerHair],['foot and toe hair',c.footToeHair],['back hair',c.backHair]];
    return `Body hair overall is ${displayValue('bodyHairOverall',c.bodyHairOverall)}. ${areasEn.map(([k,v])=>`${k}: ${displayValue('bodyHairLevel',v)}`).join('; ')}. Depict body hair non-sexually as a natural adult male body feature.`;
  }
  function readCaptionFields(scope){ return Object.assign({}, (CFG.captionFields||{})[scope] || {}); }
  function getInitial(){
    const d = { nationality:'', ethnicity:'', ageMin:20, ageMax:32,
      vibe:'ランダム', eraYear:'2026', season:'ランダム', occupation:'ランダム',
      trainingMode:'ランダム', sportsBodyInfluence:'ランダム',
      promptLanguage:'日本語', promptTarget:'ChatGPT' };
    const c = Object.assign({}, d, CFG.initial || {});
    if(c.ageMin > c.ageMax){ const t=c.ageMin; c.ageMin=c.ageMax; c.ageMax=t; }
    return c;
  }

  function defaultEthnicityForNationality(nationality){
    if(nationality==='日本') return '日本人';
    if(nationality==='韓国') return '韓国系';
    if(['中国','台湾'].includes(nationality)) return '中国系';
    if(['タイ','ベトナム','フィリピン','インドネシア','マレーシア'].includes(nationality)) return '東南アジア系';
    if(nationality==='インド') return '南アジア系';
    if(['ロシア','ポーランド'].includes(nationality)) return 'スラブ系';
    if(nationality==='スウェーデン') return '北欧系';
    if(['イタリア','スペイン','アルゼンチン'].includes(nationality)) return '南欧系';
    if(nationality==='トルコ') return '中東系';
    if(nationality==='モンゴル') return '東アジア系';
    if(nationality==='ナイジェリア') return '黒人系';
    if(['アメリカ','カナダ','イギリス','フランス','ドイツ','オーストラリア'].includes(nationality)) return '白人系';
    if(['ブラジル','メキシコ'].includes(nationality)) return 'ラテン系';
    return pick(pools.ethnicities);
  }

  const NAMES_BY_YEAR = {"2000":["翔","翔太","大輝","拓海","海斗","蓮","大樹","健太","匠","悠斗","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2001":["大輝","翔","海斗","陸","拓海","翔太","蓮","大和","駿","亮太","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2002":["蓮","大輝","翔","海斗","拓海","陸","颯太","大和","翔太","悠斗","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2003":["大輝","蓮","翔","颯太","海斗","陸","悠斗","拓海","大和","優太","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2004":["蓮","颯太","大輝","翔","悠斗","海斗","陸","大和","悠人","拓海","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2005":["翔","大翔","拓海","翔太","颯太","蓮","悠斗","海斗","陸","大和","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2006":["陸","大翔","蓮","悠斗","颯太","翔","悠人","大和","海斗","優斗","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2007":["大翔","蓮","悠斗","颯太","翔","悠人","陽向","大和","陸","海翔","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2008":["大翔","悠斗","陽向","翔太","悠人","蓮","颯太","大和","悠真","陸","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2009":["大翔","翔太","悠斗","瑛太","悠人","蓮","陽向","悠真","颯太","大和","駿","大地","直人","拓也","翔真","和真","悠","奏太","太陽","大輔","亮","光","怜","蒼空","琉生","悠翔","陽太","陽斗","大貴","智也","雄大","海翔","優","旭","慶","要","丈","航","啓太","慎之介","俊介","光希","一真","歩","遼","洸","司","龍之介","昊","蒼太"],"2010":["大翔","悠真","翔","颯太","歩夢","悠人","陽向","蓮","悠斗","陸","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2011":["大翔","蓮","悠真","颯太","陽向","悠人","悠斗","陽翔","大和","陸","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2012":["蓮","大翔","颯真","悠真","陽向","悠人","陽翔","悠斗","大和","颯太","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2013":["悠真","陸","大翔","蓮","陽翔","悠人","颯真","大和","陽向","湊","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2014":["蓮","大翔","陽翔","悠真","湊","悠人","陸","大和","颯真","樹","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2015":["悠真","悠人","陽翔","蓮","大翔","湊","大和","樹","颯真","陸","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2016":["大翔","蓮","陽翔","悠真","湊","悠人","大和","樹","蒼","律","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2017":["悠真","悠人","陽翔","湊","蓮","大翔","樹","大和","蒼","律","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2018":["蓮","湊","大翔","大和","陽翔","悠真","樹","律","蒼","朝陽","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2019":["蓮","湊","陽翔","律","樹","大和","悠真","朝陽","蒼","新","結翔","湊斗","奏","颯","晴","葵","伊吹","大雅","怜","悠翔","陽斗","琉生","煌","旭","蒼空","悠生","陽大","慶","昊","洸","律希","翔琉","岳","奏太","悠陽","晄","慧","湊翔","蒼真","悠月","絢斗","陽路","旬","凌","塁","律人","丞","暖","晴翔","新太"],"2020":["蒼","樹","蓮","陽翔","湊","朝陽","律","悠真","大和","新","凪","翠","暖","晴","葵","伊吹","奏","颯","怜","悠","旭","慶","昊","湊斗","結翔","蒼真","悠月","絢斗","律希","岳","丞","旬","凌","塁","暁","晄","慧","洸","要","司","新太","晴翔","悠生","煌","蒼空","陽大","翔琉","悠陽","律人","和樹"],"2021":["蓮","陽翔","湊","蒼","樹","朝陽","律","悠真","碧","大和","伊織","結翔","琉生","朔","陽向","藍","蒼空","晴","大翔","暖","凪","湊斗","仁","陽","颯真","想","空","蒼真","蒼大","陽太","颯","一颯","翠","大晴","陽斗","律希","颯太","千颯","奏翔","琉翔","世凪","柊","遥斗","櫂","葵","海斗","叶翔","新","蒼翔","太陽"],"2022":["蒼","凪","蓮","陽翔","湊","碧","律","朝陽","樹","悠真","伊織","結翔","琉生","朔","陽向","藍","大和","蒼空","晴","大翔","暖","湊斗","仁","陽","颯真","想","空","蒼真","蒼大","陽太","颯","一颯","翠","大晴","陽斗","律希","颯太","千颯","奏翔","琉翔","世凪","柊","遥斗","櫂","葵","海斗","叶翔","新","蒼翔","太陽"],"2023":["碧","陽翔","湊","蒼","凪","蓮","朝陽","律","樹","翠","伊織","結翔","琉生","朔","陽向","藍","大和","蒼空","晴","大翔","暖","湊斗","仁","陽","颯真","想","悠真","空","蒼真","蒼大","陽太","颯","一颯","大晴","陽斗","律希","颯太","千颯","奏翔","琉翔","世凪","柊","遥斗","櫂","葵","海斗","叶翔","新","蒼翔","太陽"],"2024":["碧","陽翔","湊","蒼","凪","朝陽","蓮","律","伊織","樹","結翔","琉生","朔","陽向","藍","大和","蒼空","晴","大翔","暖","湊斗","仁","陽","颯真","想","悠真","空","蒼真","蒼大","陽太","颯","一颯","翠","大晴","陽斗","律希","颯太","千颯","奏翔","琉翔","世凪","柊","遥斗","櫂","葵","海斗","叶翔","新","蒼翔","太陽"],"2025":["湊","伊織","結翔","琉生","蓮","朔","碧","陽向","陽翔","藍","大和","朝陽","蒼空","晴","大翔","暖","凪","湊斗","仁","陽","律","颯真","想","悠真","空","蒼真","蒼大","陽太","颯","一颯","翠","大晴","陽斗","律希","颯太","千颯","奏翔","琉翔","樹","世凪","蒼","柊","遥斗","櫂","葵","海斗","叶翔","新","蒼翔","太陽","楓","楓真","碧杜","湊音","悠翔","琥珀","岳","慧","結斗","千隼","優","悠陽","陽大","琉斗","響","善","奏太","想空","想太","唯斗","悠","陽奏","理玖","理仁","玲","翔空","愛翔","旭","一桜","薫","結仁","光","周","晴斗","晴翔","然","禅","碧斗","悠人","悠仁","悠晴","颯斗","絢翔","夏向","海翔","光希","瑞己","晴琉","奏多","奏汰","蒼和","大雅","燈弥","悠希","悠月","陽葵","陽琉","琉維","漣","蓮翔","昴","翔","颯汰"]};

  function chooseSurname(){
    if(rand() < 0.05) return pick(pools.surnamesRare);
    const n = pools.surnames.length;
    return weighted(pools.surnames.map((nm, i)=>[nm, (n + 20 - i) / (n + 20)]));
  }

  const EXTRA_GIVEN_KIRA = ['琉聖','蒼空','陽翔','煌大','光琉','礼音','星那','碧斗','琉生','彪雅','凰輝','煉','雫久','琉夢','絆星','漣','澪央','灯真','來夢','嵐丸'];

  const EXTRA_GIVEN_MODERN = ['理人','啓多','将吾','数馬','峻介','岳大','海都','晴馬','誠也','直輝','佑真','篤史','駿佑','涼太','航平','郁弥','一馬','凱斗','拓真','唯人','稜馬','彰人','修平','恭介','純平','竜馬','哲平','智輝','智哉','慎太郎','凛太郎','駿之介','康太郎','悠一朗','健之介','新太郎','竜之介','健太郎','翔太郎'];

  const EXTRA_GIVEN_CLASSIC = ['智勝','智大','彰宏','剛志','健蔵','征也','毅一','崇志','大介','洋介','耕平','慎吾','哲平','誠也','達也','篤史','数馬','将吾','純平','慎太郎','康太郎','健太郎'];

  function givenNameByBirthYear(birthYear){
    const byNum = Number(birthYear) || 2000;
    if(byNum >= 2000){
      const y = Math.min(2025, byNum);
      const list = NAMES_BY_YEAR[y] || NAMES_BY_YEAR[2025];
      if(list && list.length){
        const kira = byNum >= 2005 ? EXTRA_GIVEN_KIRA.filter(nm=>!list.includes(nm)) : [];
        const extra = EXTRA_GIVEN_MODERN.filter(nm=>!list.includes(nm));
        return weighted(list.map((nm, i)=>[nm, 60/(i+5)]).concat(extra.map(nm=>[nm, 1.2])).concat(kira.map(nm=>[nm, 0.5])));
      }
    }
    const g = pools.givenByEra;
    const by = Number(birthYear) || 2000;
    if(by < 1900) return pick(g.s1880);
    if(by < 1920) return pick(g.s1900);
    if(by < 1940) return pick(g.s1920);
    if(by < 1950) return pick(g.s1940);
    if(by < 1960) return pick(g.s1950);
    if(by < 1970) return pick(g.s1960);
    if(by < 1980) return pick(g.s1970.concat(EXTRA_GIVEN_CLASSIC));
    if(by < 1990) return pick(g.s1980.concat(EXTRA_GIVEN_CLASSIC));
    if(by < 2000) return pick(g.s1990.concat(EXTRA_GIVEN_CLASSIC, EXTRA_GIVEN_MODERN.slice(0,20)));
    if(by < 2010) return pick(g.s2000);
    return pick(g.s2010);
  }

  const NATION_NAMES = {
    'ロシア':{order:'W', given:[['Сергей','セルゲイ'],['Дмитрий','ドミトリー'],['Алексей','アレクセイ'],['Иван','イワン'],['Михаил','ミハイル'],['Николай','ニコライ'],['Андрей','アンドレイ'],['Владимир','ウラジーミル'],['Павел','パーヴェル'],['Юрий','ユーリー'],['Артём','アルチョム'],['Максим','マクシム'],['Егор','エゴール'],['Кирилл','キリル']], old:[['Борис','ボリス'],['Виктор','ヴィクトル'],['Григорий','グリゴリー'],['Пётр','ピョートル']], family:[['Иванов','イワノフ'],['Петров','ペトロフ'],['Смирнов','スミルノフ'],['Соколов','ソコロフ'],['Попов','ポポフ'],['Козлов','コズロフ'],['Новиков','ノヴィコフ'],['Волков','ヴォルコフ'],['Морозов','モロゾフ'],['Фёдоров','フョードロフ']]},
    '韓国':{order:'E', sep:'', given:[['민준','ミンジュン'],['서준','ソジュン'],['도윤','ドユン'],['예준','イェジュン'],['시우','シウ'],['하준','ハジュン'],['지호','ジホ'],['준우','ジュヌ'],['현우','ヒョヌ'],['우진','ウジン']], old:[['성호','ソンホ'],['영수','ヨンス'],['정훈','ジョンフン'],['상철','サンチョル'],['재석','ジェソク']], family:[['김','キム'],['이','イ'],['박','パク'],['최','チェ'],['정','チョン'],['강','カン'],['조','チョ'],['윤','ユン']]},
    '中国':{order:'E', sep:'', given:[['偉','ウェイ'],['磊','レイ'],['軍','ジュン'],['勇','ヨン'],['浩','ハオ'],['傑','ジエ'],['鵬','ポン'],['宇軒','ユーシュエン'],['子豪','ズーハオ'],['浩然','ハオラン']], old:[['建国','ジエングオ'],['国強','グオチャン'],['志明','ジーミン']], family:[['王','ワン'],['李','リー'],['張','チャン'],['劉','リウ'],['陳','チェン'],['楊','ヤン'],['趙','チャオ'],['黄','ホァン']]},
    '台湾':{order:'E', sep:'', given:[['志豪','ジーハオ'],['家豪','ジアハオ'],['冠宇','グァンユー'],['承翰','チェンハン'],['宗翰','ゾンハン'],['彦廷','イェンティン'],['俊傑','ジュンジエ'],['子軒','ズーシュエン']], family:[['陳','チェン'],['林','リン'],['黄','ホァン'],['張','チャン'],['李','リー'],['王','ワン'],['呉','ウー'],['劉','リウ']]},
    'アメリカ':{order:'W', given:[['Liam','リアム'],['Noah','ノア'],['Oliver','オリバー'],['James','ジェームズ'],['Ethan','イーサン'],['Lucas','ルーカス'],['Mason','メイソン'],['Henry','ヘンリー'],['Jack','ジャック'],['Daniel','ダニエル'],['Alex','アレックス'],['Ryan','ライアン']], old:[['Harold','ハロルド'],['Walter','ウォルター'],['Frank','フランク'],['George','ジョージ'],['Arthur','アーサー'],['Albert','アルバート']], family:[['Smith','スミス'],['Johnson','ジョンソン'],['Brown','ブラウン'],['Taylor','テイラー'],['Wilson','ウィルソン'],['Davis','デイヴィス'],['Clark','クラーク'],['Walker','ウォーカー'],['Harris','ハリス'],['Lewis','ルイス']]},
    'フランス':{order:'W', given:[['Louis','ルイ'],['Gabriel','ガブリエル'],['Raphaël','ラファエル'],['Léo','レオ'],['Hugo','ユーゴ'],['Arthur','アルテュール'],['Jules','ジュール'],['Lucas','リュカ'],['Antoine','アントワーヌ'],['Nicolas','ニコラ']], old:[['Pierre','ピエール'],['Jean','ジャン'],['Michel','ミシェル'],['André','アンドレ']], family:[['Martin','マルタン'],['Bernard','ベルナール'],['Dubois','デュボワ'],['Moreau','モロー'],['Laurent','ローラン'],['Lefebvre','ルフェーブル'],['Girard','ジラール'],['Rousseau','ルソー']]},
    'ドイツ':{order:'W', given:[['Leon','レオン'],['Finn','フィン'],['Paul','パウル'],['Lukas','ルーカス'],['Felix','フェリックス'],['Maximilian','マクシミリアン'],['Jonas','ヨナス'],['Elias','エリアス'],['Noah','ノア'],['Tim','ティム']], old:[['Hans','ハンス'],['Karl','カール'],['Werner','ヴェルナー'],['Klaus','クラウス']], family:[['Müller','ミュラー'],['Schmidt','シュミット'],['Schneider','シュナイダー'],['Fischer','フィッシャー'],['Weber','ヴェーバー'],['Wagner','ワーグナー'],['Becker','ベッカー'],['Hoffmann','ホフマン']]},
    'イタリア':{order:'W', given:[['Leonardo','レオナルド'],['Francesco','フランチェスコ'],['Alessandro','アレッサンドロ'],['Lorenzo','ロレンツォ'],['Matteo','マッテオ'],['Andrea','アンドレア'],['Gabriele','ガブリエーレ'],['Riccardo','リッカルド'],['Marco','マルコ'],['Luca','ルカ']], old:[['Giuseppe','ジュゼッペ'],['Antonio','アントニオ'],['Giovanni','ジョヴァンニ']], family:[['Rossi','ロッシ'],['Russo','ルッソ'],['Ferrari','フェラーリ'],['Esposito','エスポジト'],['Bianchi','ビアンキ'],['Romano','ロマーノ'],['Colombo','コロンボ'],['Ricci','リッチ']]},
    'スペイン':{order:'W', given:[['Hugo','ウーゴ'],['Martín','マルティン'],['Pablo','パブロ'],['Alejandro','アレハンドロ'],['Daniel','ダニエル'],['Adrián','アドリアン'],['Álvaro','アルバロ'],['Diego','ディエゴ'],['Mario','マリオ'],['Carlos','カルロス']], old:[['José','ホセ'],['Antonio','アントニオ'],['Manuel','マヌエル'],['Francisco','フランシスコ']], family:[['García','ガルシア'],['Rodríguez','ロドリゲス'],['Fernández','フェルナンデス'],['López','ロペス'],['Martínez','マルティネス'],['Sánchez','サンチェス'],['Pérez','ペレス'],['Gómez','ゴメス']]},
    'スウェーデン':{order:'W', given:[['Erik','エリック'],['Lars','ラーシュ'],['Karl','カール'],['Oskar','オスカル'],['Axel','アクセル'],['Nils','ニルス'],['Gustav','グスタフ'],['Elias','エリアス'],['Hugo','ヒューゴ'],['Viktor','ヴィクトル']], family:[['Andersson','アンデション'],['Johansson','ヨハンソン'],['Karlsson','カールソン'],['Nilsson','ニルソン'],['Eriksson','エリクソン'],['Larsson','ラーション'],['Lindberg','リンドベリ']]},
    'ポーランド':{order:'W', given:[['Jakub','ヤクブ'],['Jan','ヤン'],['Piotr','ピョートル'],['Marek','マレク'],['Tomasz','トマシュ'],['Krzysztof','クシシュトフ'],['Andrzej','アンジェイ'],['Paweł','パヴェウ'],['Michał','ミハウ'],['Wojciech','ヴォイチェフ']], family:[['Nowak','ノヴァク'],['Kowalski','コヴァルスキ'],['Wiśniewski','ヴィシニェフスキ'],['Wójcik','ヴイチク'],['Kowalczyk','コヴァルチク'],['Kamiński','カミンスキ'],['Lewandowski','レヴァンドフスキ'],['Zieliński','ジェリンスキ']]},
    'トルコ':{order:'W', given:[['Mehmet','メフメト'],['Mustafa','ムスタファ'],['Ahmet','アフメト'],['Ali','アリ'],['Hüseyin','ヒュセイン'],['Hasan','ハサン'],['Emre','エムレ'],['Murat','ムラト'],['Kemal','ケマル'],['Burak','ブラク']], family:[['Yılmaz','ユルマズ'],['Kaya','カヤ'],['Demir','デミル'],['Şahin','シャヒン'],['Çelik','チェリク'],['Öztürk','オズテュルク'],['Aydın','アイドゥン']]},
    'ブラジル':{order:'W', given:[['Miguel','ミゲル'],['Arthur','アルトゥール'],['Gabriel','ガブリエル'],['Bernardo','ベルナルド'],['Lucas','ルーカス'],['Pedro','ペドロ'],['Matheus','マテウス'],['Rafael','ハファエル'],['João','ジョアン'],['Thiago','チアゴ']], family:[['Silva','シルバ'],['Santos','サントス'],['Oliveira','オリベイラ'],['Souza','ソウザ'],['Pereira','ペレイラ'],['Costa','コスタ'],['Almeida','アルメイダ']]},
    'メキシコ':{order:'W', given:[['Santiago','サンティアゴ'],['Mateo','マテオ'],['Sebastián','セバスティアン'],['Leonardo','レオナルド'],['Emiliano','エミリアーノ'],['Diego','ディエゴ'],['Miguel','ミゲル'],['Alejandro','アレハンドロ']], family:[['Hernández','エルナンデス'],['García','ガルシア'],['Martínez','マルティネス'],['González','ゴンサレス'],['Rodríguez','ロドリゲス'],['Ramírez','ラミレス']]},
    'アルゼンチン':{order:'W', given:[['Mateo','マテオ'],['Santiago','サンティアゴ'],['Joaquín','ホアキン'],['Valentino','バレンティーノ'],['Tomás','トマス'],['Franco','フランコ'],['Bruno','ブルーノ'],['Nicolás','ニコラス']], family:[['Fernández','フェルナンデス'],['González','ゴンサレス'],['Rodríguez','ロドリゲス'],['López','ロペス'],['Martínez','マルティネス'],['Díaz','ディアス']]},
    'タイ':{order:'W', given:[['Somchai','ソムチャイ'],['Anan','アナン'],['Kittisak','キッティサック'],['Nattapong','ナッタポン'],['Prasert','プラサート'],['Thanawat','タナワット'],['Chaiwat','チャイワット'],['Somsak','ソムサック']], family:[['Jaidee','ジャイディー'],['Srisuk','スリスック'],['Boonmee','ブンミー'],['Chaiyasit','チャイヤシット'],['Wattana','ワッタナー']]},
    'ベトナム':{order:'E', sep:' ', given:[['Minh','ミン'],['Anh','アイン'],['Huy','フイ'],['Khang','カン'],['Bảo','バオ'],['Đức','ドゥック'],['Quân','クアン'],['Hùng','フン']], family:[['Nguyễn','グエン'],['Trần','チャン'],['Lê','レ'],['Phạm','ファム'],['Hoàng','ホアン']]},
    'フィリピン':{order:'W', given:[['Jose','ホセ'],['Juan','フアン'],['Miguel','ミゲル'],['Angelo','アンジェロ'],['Marco','マルコ'],['Paolo','パオロ'],['Rafael','ラファエル'],['Christian','クリスチャン']], family:[['Santos','サントス'],['Reyes','レイエス'],['Cruz','クルス'],['Bautista','バウティスタ'],['Garcia','ガルシア'],['Mendoza','メンドーサ']]},
    'インドネシア':{order:'W', given:[['Budi','ブディ'],['Agus','アグス'],['Andi','アンディ'],['Rizky','リズキ'],['Dimas','ディマス'],['Eko','エコ'],['Fajar','ファジャル'],['Putra','プトラ']], family:[['Santoso','サントソ'],['Wijaya','ウィジャヤ'],['Saputra','サプトラ'],['Pratama','プラタマ'],['Hidayat','ヒダヤット']]},
    'マレーシア':{order:'W', given:[['Ahmad','アフマド'],['Muhammad','ムハマド'],['Amir','アミル'],['Faiz','ファイズ'],['Hafiz','ハフィズ'],['Iqbal','イクバル'],['Syafiq','シャフィク']], family:[['bin Abdullah','ビン・アブドゥラ'],['bin Ismail','ビン・イスマイル'],['bin Hassan','ビン・ハッサン'],['Tan','タン'],['Lim','リム'],['Wong','ウォン']]},
    'インド':{order:'W', given:[['Arjun','アルジュン'],['Rohan','ローハン'],['Aditya','アディティヤ'],['Rahul','ラーフル'],['Vikram','ヴィクラム'],['Sanjay','サンジャイ'],['Amit','アミット'],['Raj','ラージ']], family:[['Sharma','シャルマ'],['Patel','パテル'],['Singh','シン'],['Kumar','クマール'],['Gupta','グプタ'],['Reddy','レッディ']]},
    'モンゴル':{order:'S', given:[['Бат','バト'],['Болд','ボルド'],['Ганбаатар','ガンバータル'],['Батбаяр','バトバヤル'],['Мөнх','ムンフ'],['Төмөр','トゥムル'],['Эрдэнэ','エルデネ'],['Сүх','スフ']]},
    'ナイジェリア':{order:'W', given:[['Chinedu','チネドゥ'],['Emeka','エメカ'],['Oluwaseun','オルワセウン'],['Ade','アデ'],['Ifeanyi','イフェアニ'],['Tunde','トゥンデ'],['Kelechi','ケレチ'],['Chukwuma','チュクマ']], family:[['Okafor','オカフォル'],['Adeyemi','アデイェミ'],['Okeke','オケケ'],['Balogun','バログン'],['Eze','エゼ'],['Nwachukwu','ンワチュク']]}
  };

  function nameKana(c){
    const n = String((c && c.name) || c || '');
    const m = n.match(/（(.+)）$/);
    return m ? m[1] : n;
  }

  function nameByNationality(nationality, eraYear='2026', age=25){
    const d = NATION_NAMES[nationality];
    if(d){
      const birth = (Number(eraYear) || 2026) - (Number(age) || 25);
      const givens = (birth < 1960 && d.old) ? d.old.concat(d.given) : d.given;
      const g = pick(givens);
      if(!d.family) return `${g[0]}（${g[1]}）`;
      const f = pick(d.family);
      if(d.order === 'E') return `${f[0]}${d.sep !== undefined ? d.sep : ''}${g[0]}（${f[1]}・${g[1]}）`;
      return `${g[0]} ${f[0]}（${g[1]}・${f[1]}）`;
    }
    return legacyNameByNationality(nationality, eraYear, age);
  }

  function legacyNameByNationality(nationality, eraYear='2026', age=25){
    if(nationality==='韓国') return `${pick(['キム','パク','イ','チェ','チョン'])} ${pick(['ミンジュン','ソジュン','ジフン','ドユン','ヒョヌ'])}`;
    if(['中国','台湾'].includes(nationality)) return `${pick(['王','李','張','陳','林'])} ${pick(['俊傑','宇航','子軒','浩然','一辰'])}`;
    if(['アメリカ','カナダ','イギリス','オーストラリア'].includes(nationality)) return `${pick(['Alex','Noah','Liam','Lucas','Ethan'])} ${pick(['Smith','Brown','Taylor','Martin','Wilson'])}`;
    if(['フランス','ドイツ','イタリア','スペイン'].includes(nationality)) return `${pick(['Lucas','Matteo','Leon','Hugo','Theo'])} ${pick(['Martin','Rossi','Garcia','Muller','Dubois'])}`;
    if(['ブラジル','メキシコ'].includes(nationality)) return `${pick(['Mateo','Diego','Lucas','Gabriel','Santiago'])} ${pick(['Silva','Garcia','Lopez','Santos','Martinez'])}`;
    if(['タイ','ベトナム','フィリピン','インドネシア','マレーシア'].includes(nationality)) return `${pick(['An','Minh','Kiet','Arun','Niran','Paolo','Rizky','Aiman'])} ${pick(['Tran','Nguyen','Phan','Somsak','Prasert','Santos','Tan','Ahmad'])}`;
    if(nationality==='インド') return `${pick(['Arjun','Rahul','Vihaan','Ayaan','Kabir'])} ${pick(['Sharma','Patel','Singh','Kumar','Gupta'])}`;
    const birthYear = (Number(eraYear) || 2026) - (Number(age) || 25);
    return `${chooseSurname()} ${givenNameByBirthYear(birthYear)}`;
  }

  function faceByEthnicity(ethnicity){
    if(ethnicity==='韓国系') return {facePreset:'韓国アイドル風', skin:'透明感のある肌', hairColor:'黒', eyes:'涼しげな目元'};
    if(ethnicity==='白人系') return {facePreset:'高身長モデル系', skin:'自然な肌質', hairColor:pick(['自然な茶髪','アッシュブラウン','グレージュ']), eyes:'知的な目元'};
    if(ethnicity==='スラブ系') return {facePreset:'クール系', skin:'色白の肌', eyes:'淡い色の切れ長の目元'};
    if(ethnicity==='北欧系') return {facePreset:'高身長モデル系', skin:'非常に色白の肌', eyes:'淡いブルー系の目元'};
    if(ethnicity==='南欧系') return {facePreset:'ワイルド系', skin:'少し日焼けした肌', eyes:'力強い目元'};
    if(ethnicity==='ラテン系') return {facePreset:'ワイルド系', skin:'少し日焼けした肌', hairColor:'黒に近いダークブラウン', eyes:'力強い目元'};
    if(ethnicity==='東南アジア系') return {facePreset:'親しみやすい大学生系', skin:'少し日焼けした肌', hairColor:'黒', eyes:'優しい目元'};
    if(ethnicity==='南アジア系') return {facePreset:'落ち着いた大人系', skin:'褐色の肌', hairColor:'黒', eyes:'力強い目元'};
    if(ethnicity==='黒人系') return {facePreset:'体育会系スポーツ男子', skin:'深い褐色の肌', hairColor:'黒', eyes:'力強い目元'};
    if(ethnicity==='中東系') return {facePreset:'ミステリアス系', skin:'マットで自然な肌', hairColor:'黒', eyes:'知的な目元'};
    if(ethnicity==='中央アジア系') return {facePreset:'クール系', skin:'自然な肌質', hairColor:'黒に近いダークブラウン', eyes:'涼しげな目元'};
    if(ethnicity==='中国系') return {facePreset:'真面目系', skin:'自然な肌質', hairColor:'黒', eyes:'涼しげな目元'};
    return {facePreset:'普通顔', skin:'健康的な肌質', hairColor:'黒', eyes:'親しみやすい目元'};
  }
  function getFixed(){ return Object.assign({}, CFG.fixed || {}); }

  function calcWeight(height, bodyType){
    const table = [
      ['やせ',18.3],['華奢',18.0],['細身',18.8],['陸上長距離',19.2],['バスケットボール',20.5],['高身長モデル',20],
      ['クライマー',21.5],['肩幅広め',22],['逆三角形',22.2],['細マッチョ',21.8],['中肉中背',21.5],['隠れ筋肉',22.0],['水泳',22.5],['陸上短距離',22.8],['痩せマッチョ',22.2],
      ['サッカー',22.5],['筋肉',23],['スポーツ',23],['骨太',23.5],['腹だけ',24.2],['がっしり',24.5],['ビール',24.8],
      ['柔道',26],['ラグビー',26.5],['ぽっちゃり',26.5]
    ];
    const hit = table.find(([k])=>bodyType.includes(k));
    const bmi = hit ? hit[1] : 21.2;
    return Math.round(bmi*Math.pow(height/100,2));
  }

  function chooseBody(height, rare){
    if(rare) return weighted(pools.bodyTypes.map(v=>[v, v.includes('腹だけ')||v.includes('ぽっちゃり')||v.includes('高身長')||v.includes('脚')?5:2]));
    if(height>=182) return weighted([['高身長モデル体型',4],['脚が長い',3],['筋肉質',2],['標準体型',2],['バスケットボール選手体型',1]]);
    if(height<=170) return weighted([['やせ型',3],['細身',3],['標準体型',3],['痩せマッチョ',2],['サッカー選手体型',1]]);
    return weighted([['標準体型',4],['細身',3],['スーツ映え体型',2],['筋肉質',2],['引き締まったスポーツ体型',2],['腹だけぽっちゃり',1]]);
  }

  function chooseOutfit(age, rare, vibe='ランダム'){
    if(vibe==='スポーツ系') return weighted([['スポーツ練習着',5],['大学生カジュアル',2],['私服通学風',2]]);
    if(vibe==='真面目系' || vibe==='大人っぽい系') return weighted([['紺スーツ',4],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2]]);
    if(vibe==='韓国風') return weighted([['ジャケットスタイル',3],['大学生カジュアル',3],['社会人カジュアル',2],['ストリート系',2]]);
    if(vibe==='中性系') return weighted([['大学生カジュアル',3],['ストリート系',3],['社会人カジュアル',2],['私服通学風',2]]);
    if(vibe==='ワイルド系') return weighted([['ストリート系',4],['社会人カジュアル',2],['スポーツ練習着',2],['大学生カジュアル',2]]);
    if(vibe==='やりらふぃー系' || vibe==='ストリート系' || vibe==='陽キャ大学生系') return weighted([['ストリート系',4],['大学生カジュアル',3],['私服通学風',2],['スポーツ練習着',1]]);
    if(vibe==='塩顔系' || vibe==='犬系男子' || vibe==='古着系' || vibe==='サブカル系') return weighted([['大学生カジュアル',3],['私服通学風',3],['社会人カジュアル',2],['ストリート系',2]]);
    if(vibe==='クール系' || vibe==='ミステリアス系') return weighted([['黒スーツ',2],['ジャケットスタイル',3],['社会人カジュアル',2],['ストリート系',2]]);
    if(vibe==='清楚系') return weighted([['ジャケットスタイル',3],['社会人カジュアル',3],['紺スーツ',2],['大学生カジュアル',2]]);
    if(age<=22) return weighted([['大学生カジュアル',3],['私服通学風',3],['学生服（ブレザー）', rare?3:1],['学生服（学ラン）', rare?3:1],['スポーツ練習着',2],['制服風コーデ',2],['ストリート系',2]]);
    if(age<=30) return weighted([['紺スーツ',3],['社会人カジュアル',3],['大学生カジュアル',1],['ジャケットスタイル',2],['黒スーツ',2],['ストリート系',1]]);
    return weighted([['紺スーツ',3],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2],['黒スーツ',2]]);
  }

  function chooseAge(min,max){
    const candidates = pools.ages.filter(v=>v>=min && v<=max);
    return pick(candidates.length?candidates:pools.ages);
  }

  function ageAppearanceByAge(age){
    if(age>=65) return weighted([['穏やかな年配の風格',5],['年相応の渋さがある',3],['やや若く見える',1]]);
    if(age>=50) return weighted([['年相応の渋さがある',5],['実年齢相応',3],['やや若く見える',1]]);
    if(age<=22) return weighted([['実年齢相応',4],['やや若く見える',4],['少し大人びて見える',1]]);
    if(age<=29) return weighted([['実年齢相応',5],['やや若く見える',2],['少し大人びて見える',2]]);
    return weighted([['実年齢相応',5],['少し大人びて見える',4],['やや若く見える',1]]);
  }

  function vibeProfile(vibe, age){
    const map = {
      '爽やか系': { facePresets:[['普通顔',4],['親しみやすい大学生系',4],['日本の若手俳優風',3],['爽やか知的アナウンサー系',2]], hairStyles:[['短髪',3],['アップバング',3],['センターパート',2],['ニュアンスパーマ',2]], hairColors:[['黒',4],['ブルーブラック',3],['黒に近いダークブラウン',2]], outfits:[['大学生カジュアル',3],['社会人カジュアル',3],['ジャケットスタイル',2],['私服通学風',2]], bodyTypes:[['標準体型',4],['細身',3],['スーツ映え体型',2]] },
      '真面目系': { facePresets:[['真面目系',5],['スーツ映え社会人系',4],['普通顔',3]], hairStyles:[['ビジネス短髪',4],['サイドパート',4],['短髪',2]], hairColors:[['黒',5],['ブルーブラック',3]], outfits:[['紺スーツ',4],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2]], bodyTypes:[['標準体型',4],['スーツ映え体型',4],['細身',2]] },
      'ワイルド系': { facePresets:[['ワイルド系',5],['体育会系スポーツ男子',3],['清潔感のある若手俳優風',2]], hairStyles:[['ツイストパーマ',3],['スパイラルパーマ',3],['アップバング',2],['ウルフミディアム',2]], hairColors:[['黒',3],['黒に近いダークブラウン',3],['自然な茶髪',2]], outfits:[['ストリート系',4],['社会人カジュアル',2],['スポーツ練習着',2]], bodyTypes:[['筋肉質',4],['引き締まったスポーツ体型',3],['がっしり体型',2]] },
      'スポーツ系': { facePresets:[['弟系童顔（笑顔が武器）',2],['垂れ目パピー系',1.5],['体育会系スポーツ男子',5],['大学サッカー部系',4],['普通顔',2]], hairStyles:[['短髪',4],['アップバング',3],['ソフトツーブロック',2]], hairColors:[['黒',4],['ブルーブラック',2]], outfits:[['スポーツ練習着',5],['大学生カジュアル',2],['私服通学風',2]], bodyTypes:[['引き締まったスポーツ体型',4],['サッカー選手体型',4],['筋肉質',3],['痩せマッチョ',2]] },
      'きれいめ系': { facePresets:[['スーツ映え社会人系',4],['高身長モデル系',3],['日本の若手俳優風',3]], hairStyles:[['センターパート',3],['サイドパート',3],['韓国風センターパート',2],['ビジネス短髪',2]], hairColors:[['黒',3],['ブルーブラック',3],['アッシュブラウン',2]], outfits:[['ジャケットスタイル',4],['社会人カジュアル',3],['紺スーツ',2]], bodyTypes:[['細身',3],['スーツ映え体型',3],['高身長モデル体型',2]] },
      'カジュアル系': { facePresets:[['親しみやすい大学生系',4],['普通顔',4],['日本の若手俳優風',2]], hairStyles:[['マッシュ',3],['センターパート',2],['ソフトツーブロック',3],['ニュアンスパーマ',2]], hairColors:[['黒',3],['黒に近いダークブラウン',2],['自然な茶髪',2]], outfits:[['大学生カジュアル',4],['私服通学風',4],['ストリート系',2],['社会人カジュアル',2]], bodyTypes:[['標準体型',4],['細身',3],['やせ型',2]] },
      '韓国風': { facePresets:[['弟系童顔（笑顔が武器）',2],['垂れ目パピー系',1.5],['韓国アイドル風',6],['中性系',3],['高身長モデル系',2]], hairStyles:[['韓国風センターパート',5],['センターパート',3],['ニュアンスパーマ',2]], hairColors:[['黒',3],['ブルーブラック',3],['グレージュ',2]], outfits:[['きれいめカジュアル',1],['ジャケットスタイル',3],['大学生カジュアル',2],['社会人カジュアル',2]], bodyTypes:[['細身',4],['高身長モデル体型',3],['標準体型',2]] },
      '中性系': { facePresets:[['中性系',6],['韓国アイドル風',3],['普通顔',2]], hairStyles:[['センターパート',3],['マッシュ',3],['ロング寄りミディアム',2],['ウルフミディアム',2]], hairColors:[['黒',3],['ブルーブラック',2],['グレージュ',2],['アッシュブラウン',2]], outfits:[['大学生カジュアル',3],['ストリート系',2],['社会人カジュアル',2],['ジャケットスタイル',2]], bodyTypes:[['細身',4],['やせ型',3],['高身長モデル体型',2]] },
      '大人っぽい系': { facePresets:[['落ち着いた大人系',5],['スーツ映え社会人系',4],['高身長モデル系',2]], hairStyles:[['サイドパート',3],['ビジネス短髪',3],['センターパート',2]], hairColors:[['黒',4],['黒に近いダークブラウン',2],['アッシュブラウン',1]], outfits:[['紺スーツ',4],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2]], bodyTypes:[['スーツ映え体型',4],['標準体型',3],['高身長モデル体型',2]] },
      'やりらふぃー系': { facePresets:[['やりらふぃー系',5],['ワイルド系',3],['日本の若手俳優風',2],['普通顔',1]], hairStyles:[['ツイストパーマ',4],['波巻きパーマ',4],['スパイラルパーマ',3],['アップバング',2],['ウルフミディアム',2]], hairColors:[['黒',3],['明るめブラウン',4],['アッシュブラウン',3],['自然な茶髪',3]], outfits:[['ストリート系',5],['大学生カジュアル',3],['私服通学風',3],['スポーツ練習着',1]], bodyTypes:[['細身',3],['痩せマッチョ',3],['標準体型',2],['引き締まったスポーツ体型',2]] },
      'ストリート系': { facePresets:[['ワイルド系',3],['やりらふぃー系',3],['日本の若手俳優風',2],['普通顔',2]], hairStyles:[['ツイストパーマ',3],['波巻きパーマ',3],['マッシュ',2],['ウルフミディアム',2],['センターパート',2]], hairColors:[['黒',3],['自然な茶髪',3],['明るめブラウン',2],['アッシュブラウン',2]], outfits:[['ストリート系',6],['大学生カジュアル',2],['私服通学風',2]], bodyTypes:[['細身',3],['標準体型',3],['痩せマッチョ',2],['腹だけぽっちゃり',1]] },
      '塩顔系': { facePresets:[['塩顔系',6],['中性系',3],['普通顔',3],['韓国アイドル風',2]], hairStyles:[['マッシュ',4],['センターパート',4],['韓国風センターパート',2],['ニュアンスパーマ',2]], hairColors:[['黒',5],['ブルーブラック',3],['黒に近いダークブラウン',2]], outfits:[['大学生カジュアル',3],['きれいめカジュアル',1],['社会人カジュアル',3],['ジャケットスタイル',2]], bodyTypes:[['細身',5],['やせ型',3],['標準体型',2]] },
      '犬系男子': { facePresets:[['犬系男子風',6],['親しみやすい大学生系',4],['普通顔',3],['日本の若手俳優風',2]], hairStyles:[['マッシュ',4],['ニュアンスパーマ',3],['短髪',2],['ソフトツーブロック',2]], hairColors:[['黒',4],['黒に近いダークブラウン',3],['自然な茶髪',2]], outfits:[['大学生カジュアル',4],['私服通学風',3],['社会人カジュアル',2],['ジャケットスタイル',1]], bodyTypes:[['標準体型',4],['細身',3],['痩せマッチョ',2]] },
      'クール系': { facePresets:[['クール系',5],['真面目系',3],['高身長モデル系',3],['韓国アイドル風',2]], hairStyles:[['センターパート',3],['サイドパート',3],['ビジネス短髪',2],['韓国風センターパート',2]], hairColors:[['黒',5],['ブルーブラック',4],['アッシュブラウン',1]], outfits:[['黒スーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2],['ストリート系',1]], bodyTypes:[['細身',3],['スーツ映え体型',3],['高身長モデル体型',2],['標準体型',2]] },
      'ミステリアス系': { facePresets:[['ミステリアス系',5],['中性系',3],['クール系',3],['高身長モデル系',2]], hairStyles:[['ロング寄りミディアム',3],['ウルフミディアム',3],['センターパート',3],['波巻きパーマ',2]], hairColors:[['黒',4],['ブルーブラック',3],['グレージュ',2],['アッシュブラウン',2]], outfits:[['黒スーツ',2],['ジャケットスタイル',3],['ストリート系',3],['社会人カジュアル',2]], bodyTypes:[['細身',4],['高身長モデル体型',2],['標準体型',2],['やせ型',2]] },
      'サブカル系': { facePresets:[['サブカル系',5],['中性系',3],['普通顔',2],['塩顔系',2]], hairStyles:[['ウルフミディアム',4],['マッシュ',3],['ロング寄りミディアム',2],['ニュアンスパーマ',2]], hairColors:[['黒',3],['アッシュブラウン',3],['グレージュ',3],['自然な茶髪',2]], outfits:[['古着系',1],['ストリート系',3],['大学生カジュアル',3],['私服通学風',2]], bodyTypes:[['細身',4],['やせ型',3],['標準体型',2]] },
      '古着系': { facePresets:[['普通顔',3],['サブカル系',3],['塩顔系',2],['親しみやすい大学生系',2]], hairStyles:[['マッシュ',3],['ウルフミディアム',3],['ニュアンスパーマ',3],['センターパート',2]], hairColors:[['黒',3],['自然な茶髪',3],['アッシュブラウン',2],['黒に近いダークブラウン',2]], outfits:[['大学生カジュアル',4],['私服通学風',3],['ストリート系',2],['社会人カジュアル',1]], bodyTypes:[['標準体型',4],['細身',3],['やせ型',2],['腹だけぽっちゃり',1]] },
      '清楚系': { facePresets:[['普通顔',4],['真面目系',4],['親しみやすい大学生系',3],['塩顔系',2]], hairStyles:[['短髪',3],['センターパート',3],['サイドパート',2],['マッシュ',2]], hairColors:[['黒',5],['ブルーブラック',3],['黒に近いダークブラウン',2]], outfits:[['ジャケットスタイル',3],['社会人カジュアル',3],['大学生カジュアル',2],['紺スーツ',2]], bodyTypes:[['標準体型',4],['細身',3],['スーツ映え体型',2]] },
      'レトロ系': { facePresets:[['落ち着いた大人系',3],['普通顔',3],['日本の若手俳優風',2],['サブカル系',2]], hairStyles:[['センターパート',4],['ロング寄りミディアム',3],['ウルフミディアム',3],['サイドパート',2]], hairColors:[['黒',5],['黒に近いダークブラウン',3]], outfits:[['ジャケットスタイル',3],['大学生カジュアル',3],['社会人カジュアル',2],['私服通学風',2]], bodyTypes:[['細身',4],['標準体型',3],['やせ型',2]] },
      'モード系': { facePresets:[['高身長モデル系',4],['クール系',4],['ミステリアス系',3],['中性系',2]], hairStyles:[['センターパート',3],['ロング寄りミディアム',3],['マンバン',2],['ウルフミディアム',2]], hairColors:[['黒',5],['ブルーブラック',3]], outfits:[['黒スーツ',3],['ジャケットスタイル',4],['ストリート系',2]], bodyTypes:[['高身長モデル体型',4],['細身',4],['やせ型',2]] },
      'アウトドア系': { facePresets:[['ワイルド系',3],['親しみやすい大学生系',3],['普通顔',3],['体育会系スポーツ男子',2]], hairStyles:[['短髪',4],['アップバング',3],['マッシュ',2],['ニュアンスパーマ',2]], hairColors:[['黒',4],['黒に近いダークブラウン',3],['自然な茶髪',2]], outfits:[['大学生カジュアル',3],['私服通学風',3],['ストリート系',2],['スポーツ練習着',2]], bodyTypes:[['標準体型',3],['がっしり体型',3],['引き締まったスポーツ体型',3]] },
      'バンドマン系': { facePresets:[['サブカル系',4],['ミステリアス系',3],['中性系',3],['塩顔系',2]], hairStyles:[['ウルフミディアム',4],['ロング寄りミディアム',4],['マッシュ',2],['波巻きパーマ',2]], hairColors:[['黒',4],['ブルーブラック',2],['アッシュブラウン',2],['グレージュ',2]], outfits:[['ストリート系',4],['大学生カジュアル',3],['私服通学風',2],['ジャケットスタイル',2]], bodyTypes:[['やせ型',4],['細身',4],['標準体型',2]] },
      '紳士系': { facePresets:[['落ち着いた大人系',5],['スーツ映え社会人系',4],['爽やか知的アナウンサー系',2]], hairStyles:[['サイドパート',4],['ビジネス短髪',4],['短髪',2]], hairColors:[['黒',5],['黒に近いダークブラウン',2]], outfits:[['グレースーツ',3],['紺スーツ',3],['黒スーツ',2],['ジャケットスタイル',3]], bodyTypes:[['スーツ映え体型',4],['標準体型',3],['高身長モデル体型',2]] },
      'ギャル男系': { facePresets:[['やりらふぃー系',4],['ワイルド系',3],['日本の若手俳優風',2]], hairStyles:[['ウルフミディアム',4],['スパイラルパーマ',3],['アップバング',3],['ツイストパーマ',2]], hairColors:[['明るめブラウン',5],['自然な茶髪',3],['アッシュブラウン',2],['金髪（ブリーチ）',2],['ハイトーンアッシュ',2]], outfits:[['ストリート系',5],['大学生カジュアル',3],['私服通学風',2]], bodyTypes:[['細身',4],['痩せマッチョ',3],['やせ型',2]] },
      '普通系': { facePresets:[['普通顔',6],['親しみやすい大学生系',2],['真面目系',2]], hairStyles:[['短髪',3],['マッシュ',2],['センターパート',2],['サイドパート',2]], hairColors:[['黒',5],['黒に近いダークブラウン',2]], outfits:[['大学生カジュアル',3],['社会人カジュアル',3],['私服通学風',2]], bodyTypes:[['標準体型',5],['細身',2],['やせ型',2]] },
      'ブサイク系': { facePresets:[['ブサイク系',6],['普通顔',2]], hairStyles:[['短髪',3],['マッシュ',2],['サイドパート',2]], hairColors:[['黒',6]], outfits:[['大学生カジュアル',3],['社会人カジュアル',2],['私服通学風',2]], bodyTypes:[['標準体型',3],['ぽっちゃり',2],['腹だけぽっちゃり',2],['やせ型',2]] },
      '地味系': { facePresets:[['真面目系',4],['普通顔',3],['塩顔系',2]], hairStyles:[['短髪',3],['サイドパート',3],['ビジネス短髪',2]], hairColors:[['黒',6],['黒に近いダークブラウン',2]], outfits:[['社会人カジュアル',3],['私服通学風',3],['大学生カジュアル',2]], bodyTypes:[['標準体型',4],['やせ型',3],['細身',2]] },
      'オタク系': { facePresets:[['普通顔',3],['真面目系',3],['サブカル系',2],['ブサイク系',1]], hairStyles:[['短髪',3],['マッシュ',3],['センターパート',1]], hairColors:[['黒',6]], outfits:[['私服通学風',3],['大学生カジュアル',3],['社会人カジュアル',1]], bodyTypes:[['やせ型',3],['標準体型',3],['ぽっちゃり',2]] },
      'ヤンキー系': { facePresets:[['ワイルド系',4],['やんちゃ系',4],['やりらふぃー系',1]], hairStyles:[['ウルフミディアム',3],['アップバング',3],['短髪',2],['スパイラルパーマ',2]], hairColors:[['明るめブラウン',4],['自然な茶髪',3],['黒',2],['金髪（ブリーチ）',3],['オレンジブラウン',1]], outfits:[['ストリート系',4],['大学生カジュアル',2],['スポーツ練習着',1]], bodyTypes:[['痩せマッチョ',3],['がっしり体型',2],['細身',2]] },
      'ホスト系': { facePresets:[['ホスト系',6],['日本の若手俳優風',2]], hairStyles:[['ウルフミディアム',3],['センターパート',3],['ニュアンスパーマ',2],['マンバン',1]], hairColors:[['明るめブラウン',3],['アッシュブラウン',3],['グレージュ',2],['黒',1],['シルバーアッシュ',2],['ハイトーンアッシュ',1]], outfits:[['黒スーツ',4],['ジャケットスタイル',3],['ストリート系',1]], bodyTypes:[['細身',4],['やせ型',2],['高身長モデル体型',2]] },
      'おじさん系': { facePresets:[['おじさん系',6],['落ち着いた大人系',3]], hairStyles:[['短髪',3],['サイドパート',3],['ビジネス短髪',3]], hairColors:[['黒',4],['黒に近いダークブラウン',3],['白髪まじり',2],['ロマンスグレー',1]], outfits:[['社会人カジュアル',3],['グレースーツ',2],['紺スーツ',2],['ジャケットスタイル',2]], bodyTypes:[['標準体型',3],['腹だけぽっちゃり',2],['ビール腹',2],['がっしり体型',2]] },
      'メガネ知的系': { facePresets:[['真面目系',4],['爽やか知的アナウンサー系',3],['塩顔系',2]], hairStyles:[['短髪',3],['センターパート',2],['サイドパート',2],['マッシュ',2]], hairColors:[['黒',6],['ブルーブラック',2]], outfits:[['ジャケットスタイル',3],['社会人カジュアル',3],['私服通学風',2]], bodyTypes:[['細身',3],['やせ型',3],['標準体型',3]] },
      '陽キャ大学生系': { facePresets:[['親しみやすい大学生系',5],['やりらふぃー系',3],['日本の若手俳優風',3],['普通顔',2]], hairStyles:[['アップバング',3],['ニュアンスパーマ',3],['波巻きパーマ',2],['短髪',2],['センターパート',2]], hairColors:[['黒',3],['自然な茶髪',3],['明るめブラウン',2],['アッシュブラウン',2]], outfits:[['大学生カジュアル',5],['私服通学風',4],['ストリート系',2],['スポーツ練習着',1]], bodyTypes:[['標準体型',3],['細身',3],['痩せマッチョ',2],['引き締まったスポーツ体型',2]] }
    };
    const chosen = map[vibe] || null;
    if(!chosen) return null;
    if(vibe==='韓国風' && age<22) chosen.outfits = [['大学生カジュアル',3],['ジャケットスタイル',2],['社会人カジュアル',2]];
    return chosen;
  }

  function chooseFaceAgeCompatible(facePreset, ageAppearance, vibe, age){
    if(Number(age) >= 55) return facePreset;
    if(['昭和顔（濃い顔立ち）','しょうゆ顔','ソース顔','彫りの深い縄文系','あっさり弥生系','たれ目系','つり目系','平成アイドル風'].includes(facePreset)) return facePreset;
    if(['ブサイク系','ホスト系','おじさん系','ヤンキー系','ギャル男系','韓国風'].includes(vibe)) return facePreset;
    if(vibe==='大人っぽい系' || ageAppearance==='少し大人びて見える') return weighted([[facePreset,4],['落ち着いた大人系',4],['スーツ映え社会人系',3],['真面目系',2]]);
    if(vibe==='スポーツ系') return weighted([[facePreset,4],['体育会系スポーツ男子',3],['大学サッカー部系',3],['普通顔',2]]);
    if(ageAppearance==='やや若く見える') return weighted([[facePreset,4],['親しみやすい大学生系',4],['普通顔',3],['日本の若手俳優風',2],['韓国アイドル風',2],['弟系童顔（笑顔が武器）',2.5],['垂れ目パピー系',1.5]]);
    return weighted([[facePreset,7],['普通顔',2],['真面目系',1],['清潔感のある若手俳優風',1]]);
  }

  const OCC_SCENES = {
    '大学生':['講義棟から出てきてキャンパスの並木道を歩く姿を偶然見かけた場面','学食の窓際の席でトレーを持って席を探す姿を偶然見かけた場面','図書館の返却ポストに本を入れている姿を偶然見かけた場面','サークル棟の前で仲間と笑い合う姿を偶然見かけた場面','履修相談の掲示板の前で腕を組んで考え込む姿を偶然見かけた場面','大学近くの安い定食屋ののれんをくぐる姿を偶然見かけた場面','試験期間の夜、コンビニコーヒー片手に自習室へ向かう姿を偶然見かけた場面'],
    '大学1年生':['入学したてで慣れないキャンパスの案内図を見上げる姿を偶然見かけた場面','真新しい学生証を首から下げて教科書販売の列に並ぶ姿を偶然見かけた場面','サークルの新歓ビラを何枚も抱えて歩く姿を偶然見かけた場面','初めての履修登録に苦戦してスマホと掲示板を見比べる姿を偶然見かけた場面','高校の制服が抜けきらない雰囲気で通学電車を降りる姿を偶然見かけた場面'],
    '高校卒業直後（進路準備中）':['卒業したばかりの解放感で昼の街をぶらぶら歩く姿を偶然見かけた場面','本屋の資格コーナーで進路の本を立ち読みする姿を偶然見かけた場面','運転免許の教習所から出てくる姿を偶然見かけた場面','バイトの面接帰りらしい少し緊張の残る姿を偶然見かけた場面','同級生と最後の制服姿で写真を撮り合う姿を偶然見かけた場面'],
    '浪人生（予備校生）':['予備校の自習室から夜遅くに出てくる姿を偶然見かけた場面','単語帳を片手に電車を待つ姿を偶然見かけた場面','模試の結果の封筒を持って複雑な表情で歩く姿を偶然見かけた場面','昼休みに予備校近くの公園で気分転換に伸びをする姿を偶然見かけた場面','リュックに参考書を詰め込んで朝の駅へ急ぐ姿を偶然見かけた場面'],
    '大学院生':['実験帰りの深夜、研究棟から自転車で出てくる姿を偶然見かけた場面','学会発表のポスター筒を抱えて新幹線ホームに立つ姿を偶然見かけた場面','ゼミ資料の束を抱えてコピー室から出てくる姿を偶然見かけた場面','研究室の窓から夕日を眺めて一息つく姿を偶然見かけた場面','指導教員との面談を終えて廊下で深呼吸する姿を偶然見かけた場面'],
    '専門学校生':['実習用の道具ケースを提げて登校する姿を偶然見かけた場面','課題の作品を大事そうに抱えて電車に乗る姿を偶然見かけた場面','放課後に同級生と実技の練習を続ける姿を偶然見かけた場面','資格試験の願書を郵便局で出す姿を偶然見かけた場面'],
    '就活中の大学生':['リクルートスーツで会社説明会の会場ビルを見上げる姿を偶然見かけた場面','面接を終えてネクタイを少し緩めながら駅へ歩く姿を偶然見かけた場面','カフェで履歴書を丁寧に書いている姿を偶然見かけた場面','証明写真機のカーテンから出てきて仕上がりを確認する姿を偶然見かけた場面','最終面接の結果待ちでスマホを何度も確認する姿を偶然見かけた場面','内定式帰りらしい晴れやかな表情の姿を偶然見かけた場面'],
    '営業職':['外回りの合間に公園のベンチで午後の準備をする姿を偶然見かけた場面','客先ビルの前で身だしなみを整えてから入っていく姿を偶然見かけた場面','夕方の駅で営業鞄を提げて帰社の電車を待つ姿を偶然見かけた場面','喫茶店で見積書を広げて電話する姿を偶然見かけた場面','大きな契約が決まったのか晴れやかな顔で社に戻る姿を偶然見かけた場面','朝礼前にコンビニで栄養ドリンクを買う姿を偶然見かけた場面'],
    '経理・事務職':['月末の残業帰り、オフィスの明かりを背に駅へ向かう姿を偶然見かけた場面','昼休みにオフィス街の弁当屋の列に並ぶ姿を偶然見かけた場面','銀行の窓口で会社の手続きをする姿を偶然見かけた場面','文房具店で付箋と電卓を選んでいる姿を偶然見かけた場面','定時で上がれた日の少し軽い足取りを偶然見かけた場面'],
    '企画職':['ホワイトボードマーカーの束を持って会議室へ急ぐ姿を偶然見かけた場面','サンプル品の入った紙袋を提げて社に戻る姿を偶然見かけた場面','カフェの窓際で企画書にペンを走らせる姿を偶然見かけた場面','市場調査らしく店頭の商品を熱心に観察する姿を偶然見かけた場面','プレゼン直前にビルの外で深呼吸する姿を偶然見かけた場面'],
    '公務員':['庁舎の通用口から昼休みに出てくる姿を偶然見かけた場面','窓口業務を終えた夕方、疲れた肩を回しながら歩く姿を偶然見かけた場面','地域の掲示板にお知らせを貼っている姿を偶然見かけた場面','防災訓練の会場設営を手伝う姿を偶然見かけた場面','異動の内示が出たのか同僚と立ち話をする姿を偶然見かけた場面'],
    '銀行員':['支店のシャッターが閉まった後も中で働く姿を偶然見かけた場面','取引先へ向かう途中、書類鞄を大事そうに抱えて歩く姿を偶然見かけた場面','昼休みに支店近くの蕎麦屋へ小走りで向かう姿を偶然見かけた場面','ATMコーナーの点検に立ち会う姿を偶然見かけた場面','決算期の夜、最後に支店の明かりを消して出てくる姿を偶然見かけた場面'],
    '商社勤務':['オフィス街の交差点で書類鞄を持って颯爽と歩く姿を偶然見かけた場面','空港の出発ロビーでスーツケースを引いて歩く出張姿を偶然見かけた場面','会食帰りの夜、タクシーを拾う姿を偶然見かけた場面','海外との電話らしく英語で話しながらビルの外を歩く姿を偶然見かけた場面','朝一番の新幹線ホームでコーヒーを飲む姿を偶然見かけた場面'],
    'コンサルタント':['ノートPCを開いたままタクシーに乗り込む姿を偶然見かけた場面','ホテルのラウンジで資料を挟んで打ち合わせる姿を偶然見かけた場面','終電間際のオフィス街を足早に歩く姿を偶然見かけた場面','クライアント先のビルから晴れやかな顔で出てくる姿を偶然見かけた場面'],
    '不動産営業':['物件の鍵の束を持ってマンションの前に立つ姿を偶然見かけた場面','のぼり旗を店先に立てている姿を偶然見かけた場面','内見のお客を案内して部屋の明かりを点ける姿を偶然見かけた場面','契約が決まったのか店の前でガッツポーズをする姿を偶然見かけた場面','週末のモデルルームの前で呼び込みをする姿を偶然見かけた場面'],
    'ITエンジニア':['ノートPCの入ったリュックでコワーキングスペースから出てくる姿を偶然見かけた場面','深夜のリリース作業を終えて朝焼けの街を歩く姿を偶然見かけた場面','カフェの隅でイヤホンをしてコードを書く姿を偶然見かけた場面','勉強会の会場ビルへノベルティの袋を提げて入る姿を偶然見かけた場面','在宅勤務の昼休みに近所へ散歩に出た姿を偶然見かけた場面'],
    'Webデザイナー':['液晶タブレットの箱を抱えて家電量販店から出てくる姿を偶然見かけた場面','カフェで配色見本を並べて悩む姿を偶然見かけた場面','街の看板やポスターを立ち止まって観察する姿を偶然見かけた場面','納品直前の深夜、コンビニへ夜食を買いに出た姿を偶然見かけた場面'],
    'ゲーム開発者':['ゲームショウの会場から社員パスを下げて出てくる姿を偶然見かけた場面','深夜のデバッグ明けに眠そうに始発を待つ姿を偶然見かけた場面','ゲームセンターで他社タイトルを研究するように遊ぶ姿を偶然見かけた場面','発売日の朝、自社タイトルが並ぶ店頭をそっと見に来た姿を偶然見かけた場面'],
    '動画クリエイター':['ジンバル付きカメラで街の風景を撮り歩く姿を偶然見かけた場面','機材ケースを両手に抱えてロケ現場へ向かう姿を偶然見かけた場面','カフェで編集画面とにらめっこする姿を偶然見かけた場面','夕焼けのタイミングを待ってカメラを構え続ける姿を偶然見かけた場面'],
    'アプリ開発者':['リリース審査の通知を見てガッツポーズする姿を偶然見かけた場面','モバイル端末を何台も並べてカフェで動作確認する姿を偶然見かけた場面','ハッカソン帰りに疲れ切った顔で夜の駅に立つ姿を偶然見かけた場面'],
    '看護師':['夜勤明けの朝、病院の通用口からマスクを外しながら出てくる姿を偶然見かけた場面','日勤前にコンビニでゼリー飲料を買い込む姿を偶然見かけた場面','病院前のバス停で患者の家族に道を教えている親切な姿を偶然見かけた場面','休憩時間に非常階段で夜景を眺めて一息つく姿を偶然見かけた場面','ナースシューズのまま売店へ急ぐ姿を偶然見かけた場面'],
    '理学療法士':['リハビリ室の窓越しに患者を励ます姿を偶然見かけた場面','病院の中庭で歩行訓練に付き添う姿を偶然見かけた場面','勤務後にジムで自分のトレーニングをする姿を偶然見かけた場面','学会資料の入ったバッグを提げて帰る姿を偶然見かけた場面'],
    '薬剤師':['調剤薬局の白衣のまま外の花に水をやる姿を偶然見かけた場面','閉店後の薬局で在庫棚を整理する姿を偶然見かけた場面','ドラッグストアの棚で高齢の客に丁寧に説明する姿を偶然見かけた場面','薬局前の自販機でコーヒーを買って一息つく姿を偶然見かけた場面'],
    '研修医':['当直明けの朝、病院前でストレッチをする姿を偶然見かけた場面','白衣のポケットに手帳を差して院内を早足で歩く姿を偶然見かけた場面','医局の窓際で医学書を積み上げて勉強する姿を偶然見かけた場面','コンビニで栄養ドリンクとおにぎりをまとめ買いする姿を偶然見かけた場面'],
    '介護士':['送迎車から利用者の車椅子を丁寧に降ろす姿を偶然見かけた場面','夜勤明けにコインランドリーで制服を洗う姿を偶然見かけた場面','施設の庭で利用者と一緒に体操する姿を偶然見かけた場面','散歩の付き添いで公園をゆっくり歩く姿を偶然見かけた場面'],
    '高校教師':['部活の朝練を見守るためにグラウンドへ向かう姿を偶然見かけた場面','放課後の職員室の窓際で採点の山と向き合う姿を偶然見かけた場面','文化祭の準備で生徒と一緒に看板を運ぶ姿を偶然見かけた場面','進路面談を終えて廊下で生徒の肩を叩く姿を偶然見かけた場面','日曜の模試監督帰りに参考書を抱えて歩く姿を偶然見かけた場面'],
    '塾講師':['授業前に教室の白板を丁寧に消して準備する姿を偶然見かけた場面','夜10時過ぎ、生徒を見送ってから教室の鍵を閉める姿を偶然見かけた場面','ファミレスで赤ペンを持って答案を採点する姿を偶然見かけた場面','合格発表の日に生徒と一緒に掲示板を見上げる姿を偶然見かけた場面'],
    '保育士':['お散歩カートを押して園児の列を引率する姿を偶然見かけた場面','園庭の遊具を閉園後に消毒して回る姿を偶然見かけた場面','壁面飾りの画用紙を大量に抱えて100円ショップから出てくる姿を偶然見かけた場面','運動会の予行練習で誰より大きな声で応援する姿を偶然見かけた場面'],
    '大学研究員':['資料の詰まったキャリーを引いて研究棟へ向かう姿を偶然見かけた場面','学会のネームホルダーを付けたまま昼食に出てきた姿を偶然見かけた場面','図書館の書庫から古い文献を抱えて出てくる姿を偶然見かけた場面','深夜の研究室でひとりホワイトボードに数式を書く姿を偶然見かけた場面'],
    '体育教師':['ジャージ姿で朝のグラウンドにライン引きをする姿を偶然見かけた場面','ホイッスルを首に下げて持久走の生徒を並走して励ます姿を偶然見かけた場面','体育倉庫からマットを軽々と運び出す姿を偶然見かけた場面','球技大会の審判を汗だくでこなす姿を偶然見かけた場面'],
    'アパレル店員':['開店前の店でトルソーの服を整える姿を偶然見かけた場面','ショップ袋を両手に提げて倉庫と店を往復する姿を偶然見かけた場面','休憩中も服のシワを気にして鏡を見る姿を偶然見かけた場面','セール初日の朝、気合いを入れてシャッターを開ける姿を偶然見かけた場面'],
    'カフェ店員':['開店前の店先で黒板メニューを書く姿を偶然見かけた場面','テラス席を拭き上げて椅子を並べる姿を偶然見かけた場面','焙煎豆の袋を抱えて搬入する姿を偶然見かけた場面','閉店後にエスプレッソマシンを丁寧に磨く姿を偶然見かけた場面','ラテアートの練習をカウンターの隅で続ける姿を偶然見かけた場面'],
    '美容師':['閉店後のサロンの前で店の明かりを落とす姿を偶然見かけた場面','朝一番にサロンの鏡を磨き上げる姿を偶然見かけた場面','ウィッグで新しいカットの練習をする姿を窓越しに偶然見かけた場面','講習会帰りにシザーケースを提げて歩く姿を偶然見かけた場面','カラー剤の箱を抱えて美容材料店から出てくる姿を偶然見かけた場面'],
    'バーテンダー':['開店前のバーの前で、仕込みの合間に外に出た姿を偶然見かけた場面','氷屋から大きな氷塊を受け取る姿を偶然見かけた場面','閉店後の明け方、ネクタイを緩めて夜明けの街を歩く姿を偶然見かけた場面','市場で今夜のフルーツを吟味する姿を偶然見かけた場面'],
    'ホテルスタッフ':['車寄せでゲストの荷物をスマートに受け取る姿を偶然見かけた場面','ロビーの花を活け替える姿を偶然見かけた場面','夜勤明けにホテルの裏口から私服で出てくる姿を偶然見かけた場面','宴会場の設営でテーブルクロスを一気に広げる姿を偶然見かけた場面'],
    '飲食店店長':['開店前に店の前を隅々まで掃き清める姿を偶然見かけた場面','市場帰りの軽バンから食材の箱を降ろす姿を偶然見かけた場面','ランチのピークを終えて店先で腰を伸ばす姿を偶然見かけた場面','新メニューの試作を従業員に振る舞う姿を偶然見かけた場面'],
    '書店員':['新刊の段ボールを台車で運ぶ姿を偶然見かけた場面','手書きPOPを真剣な顔で書いている姿を偶然見かけた場面','閉店後に平積みの本を綺麗に揃え直す姿を偶然見かけた場面','返品する本の束を丁寧に紐で縛る姿を偶然見かけた場面'],
    'コンビニ店長':['早朝のコンビニの前で納品を受け取る姿を偶然見かけた場面','廃棄チェックをしながら発注端末を睨む姿を偶然見かけた場面','店の前の駐車場を深夜にひとり掃除する姿を偶然見かけた場面','新人バイトにレジ操作を丁寧に教える姿を偶然見かけた場面'],
    '自動車整備士':['リフトアップした車の下から顔を出す姿を偶然見かけた場面','工場の前で洗い立ての代車を拭き上げる姿を偶然見かけた場面','油で汚れたつなぎのまま自販機でコーヒーを買う姿を偶然見かけた場面','客の車を大事そうにゆっくり車庫入れする姿を偶然見かけた場面'],
    '電気工事士':['電柱の高所作業車から地上に降りてヘルメットを脱ぐ姿を偶然見かけた場面','工具ベルトを腰に巻いて現場ビルへ入っていく姿を偶然見かけた場面','昼休みにワゴン車の荷台に腰掛けて弁当を食べる姿を偶然見かけた場面','夕方、ケーブルドラムを片付けて現場を後にする姿を偶然見かけた場面'],
    '大工':['朝の現場で木材を担いで足場を上がる姿を偶然見かけた場面','昼休みに材木の上に座って弁当を広げる姿を偶然見かけた場面','鉋くずまみれのまま夕方の現場を掃き清める姿を偶然見かけた場面','棟上げを終えて仲間と屋根の上で一息つく姿を偶然見かけた場面'],
    '建築士':['図面ケースを肩に掛けて現場事務所へ入る姿を偶然見かけた場面','ヘルメット姿で建設中のビルを見上げて確認する姿を偶然見かけた場面','カフェで方眼紙にスケッチを描き続ける姿を偶然見かけた場面','完成した建物を少し離れた歩道からじっと眺める姿を偶然見かけた場面'],
    '工場勤務':['交替勤務明けの朝、工場の門から自転車で出てくる姿を偶然見かけた場面','作業服のまま工場前の食堂へ向かう姿を偶然見かけた場面','安全帽を小脇に抱えて朝礼の輪に加わる姿を偶然見かけた場面','夜勤前に駐車場で仮眠から起きて伸びをする姿を偶然見かけた場面'],
    '配送ドライバー':['台車に荷物を山積みにしてマンションへ小走りする姿を偶然見かけた場面','トラックの荷台で汗を拭いながら伝票を確認する姿を偶然見かけた場面','昼下がりにトラックの運転席で束の間の休憩をとる姿を偶然見かけた場面','再配達の階段を駆け上がる姿を偶然見かけた場面'],
    '農家':['直売所の近くで、軽トラックのそばに立つ姿を偶然見かけた場面','朝もやの畑でトマトを収穫する姿を偶然見かけた場面','出荷用の段ボールを軽トラに積み上げる姿を偶然見かけた場面','夕立の前に慌ててビニールハウスを閉めて回る姿を偶然見かけた場面','農協の帰りに長靴のまま自販機で一服する姿を偶然見かけた場面'],
    '漁師':['朝の漁を終えた港の近くで、日に焼けた姿を偶然見かけた場面','水揚げした魚を市場の競り場へ運ぶ姿を偶然見かけた場面','防波堤で網の修繕を黙々と続ける姿を偶然見かけた場面','出港前の暗い港で船のエンジンを確かめる姿を偶然見かけた場面','時化で休漁の日、港の食堂でゆっくり定食を食べる姿を偶然見かけた場面'],
    'グラフィックデザイナー':['刷り上がったポスターの色味を屋外の光で確認する姿を偶然見かけた場面','画材店で紙見本を何枚も見比べる姿を偶然見かけた場面','納品データを送り終えて深夜のオフィスで伸びをする姿を偶然見かけた場面','街の看板の書体を写真に撮って回る姿を偶然見かけた場面'],
    'カメラマン':['大きな機材バッグと三脚を担いでロケへ向かう姿を偶然見かけた場面','夕暮れの一瞬の光を逃すまいと連写する姿を偶然見かけた場面','撮影スタジオの搬入口で機材を積み降ろす姿を偶然見かけた場面','現像所から仕上がりを受け取って中身を確かめる姿を偶然見かけた場面'],
    'ミュージシャン':['ギターケースを背負ってライブハウスの搬入口に立つ姿を偶然見かけた場面','スタジオ練習の帰りに機材を担いで終電に乗る姿を偶然見かけた場面','昼の公園でアコギの弾き語りを試す姿を偶然見かけた場面','レコーディング明けの朝、達成感のある顔で外へ出てきた姿を偶然見かけた場面'],
    '編集者':['ゲラの束を抱えて印刷所へ駆け込む姿を偶然見かけた場面','著者との打ち合わせでカフェの隅に陣取る姿を偶然見かけた場面','校了明けの朝、燃え尽きた顔で会社から出てくる姿を偶然見かけた場面','書店で自分の担当書の並びをそっと直す姿を偶然見かけた場面'],
    'イラストレーター':['画材店の新色マーカーの棚で長考する姿を偶然見かけた場面','原画の入った大きな平箱を慎重に運ぶ姿を偶然見かけた場面','喫茶店の窓際でスケッチブックに街ゆく人を描く姿を偶然見かけた場面','個展の搬入で額装した絵を壁に掛ける姿を偶然見かけた場面'],
    '映像ディレクター':['ロケハンで街角を何度もフレームに見立てて確認する姿を偶然見かけた場面','香盤表を丸めて手に持ち現場を仕切る姿を偶然見かけた場面','編集室に差し入れの袋を提げて入っていく姿を偶然見かけた場面','完成披露試写の会場前で深呼吸する姿を偶然見かけた場面'],
    '消防士':['非番の日、消防署の近くで私服姿を偶然見かけた場面','当直明けの朝、少し眠そうに消防署から出てくる姿を偶然見かけた場面','消防署の前で車両点検を終えて一息つく姿を偶然見かけた場面','署の前でホースを干して整備する姿を偶然見かけた場面','ロープ訓練の合間にヘルメットを脱いで汗を拭う姿を偶然見かけた場面','小学生の署見学で子どもたちに囲まれて照れる姿を偶然見かけた場面','出動から戻った車両を丁寧に洗車する姿を偶然見かけた場面'],
    '警察官':['非番の日、交番の前を私服で通り過ぎる姿を偶然見かけた場面','当直明けの朝、警察署から私服で出てくる姿を偶然見かけた場面','独身寮の近くのコンビニで買い物をする私服姿を偶然見かけた場面','交番の前で道を尋ねる観光客に地図を広げて説明する姿を偶然見かけた場面','朝の通学路で子どもたちに挨拶しながら立哨する姿を偶然見かけた場面','自転車で坂道を上りながら巡回する姿を偶然見かけた場面','落とし物の子ども用の靴を大事そうに交番へ持ち帰る姿を偶然見かけた場面'],
    '自衛官':['非番の日、駐屯地近くの街で私服姿を偶然見かけた場面','外出日に、駐屯地の門から私服で出てくる姿を偶然見かけた場面','駐屯地近くのコインランドリーで、洗濯物を抱えて歩く姿を偶然見かけた場面','駐屯地前のバス停で、外出のバスを待つ私服姿を偶然見かけた場面','朝の駆け足訓練で隊列を組んで走る姿を偶然見かけた場面','災害派遣帰りらしい泥のついた作業服で装備を降ろす姿を偶然見かけた場面','駐屯地祭の準備で装備品を丁寧に並べる姿を偶然見かけた場面'],
    '救急隊員':['非番に消防署の近くで同僚と談笑している姿を偶然見かけた場面','当直明けの朝、コンビニのコーヒーを手に歩く姿を偶然見かけた場面','救急車の資器材を点検して積み直す姿を偶然見かけた場面','出動明けに署の前でストレッチする姿を偶然見かけた場面','応急手当講習会で市民に胸骨圧迫を教える姿を偶然見かけた場面'],
    '防衛大学校学生':['休日に学校近くの坂道を歩いている姿を偶然見かけた場面','外出許可の土曜に、私服で横須賀の街を歩く姿を偶然見かけた場面','学校近くの売店の袋を提げて坂を上る姿を偶然見かけた場面','外出日に駅前で同期と待ち合わせている私服姿を偶然見かけた場面','朝の点呼前に廊下を早足で歩く制服姿を偶然見かけた場面','棒倒しの練習で泥だらけになって笑う姿を偶然見かけた場面'],
    'ジムトレーナー':['開店前のジムでマシンを1台ずつ拭き上げる姿を偶然見かけた場面','会員に丁寧にフォームを指導する姿をガラス越しに偶然見かけた場面','閉店後にひとりで黙々と自分のトレーニングをする姿を偶然見かけた場面','プロテインの箱を両手に抱えて搬入する姿を偶然見かけた場面'],
    'スポーツインストラクター':['スタジオレッスン前に音響とマイクを確認する姿を偶然見かけた場面','キッズクラスの子どもたちとハイタッチする姿を偶然見かけた場面','プールサイドでレッスンの準備体操を先導する姿を偶然見かけた場面','レッスン後に汗だくでタオルを首にかけて出てくる姿を偶然見かけた場面'],
    'モデル':['街中で撮影や移動の合間に、ふと立ち止まった瞬間を偶然見かけた場面','撮影スタジオの前で衣装のガーメントバッグを持って立つ姿を偶然見かけた場面','オーディション会場の前でコンポジを確認する姿を偶然見かけた場面','ショーの帰りにメイクを落とした素の表情で歩く姿を偶然見かけた場面'],
    '俳優':['稽古場の入り口で台本を読み込みながら立つ姿を偶然見かけた場面','ロケバスから降りて現場へ向かう姿を偶然見かけた場面','劇場の楽屋口から公演後に出てくる姿を偶然見かけた場面','セリフを小声で繰り返しながら川沿いを歩く姿を偶然見かけた場面'],
    'プロスポーツ選手':['朝練へ向かう大きなスポーツバッグ姿を偶然見かけた場面','練習後のクールダウンでグラウンドを流す姿を偶然見かけた場面','ファンの子どもにサインをして頭を撫でる姿を偶然見かけた場面','遠征のバスにチームジャージで乗り込む姿を偶然見かけた場面','オフの日に静かなカフェで体をケアしながら過ごす姿を偶然見かけた場面'],
    '喫茶店マスター':['モーニングの仕込みを終えた喫茶店の前で、一息つく姿を偶然見かけた場面','サイフォンの火加減をじっと見つめる姿を窓越しに偶然見かけた場面','常連の席の新聞を丁寧に取り替える姿を偶然見かけた場面','閉店後にカウンターを磨きながらレコードを聴く姿を偶然見かけた場面'],
    '新聞記者':['取材ノートを片手に事件現場の周辺を歩き回る姿を偶然見かけた場面','締切前に公衆電話から原稿を吹き込む姿を偶然見かけた場面','記者クラブの前で他社の記者と情報交換する姿を偶然見かけた場面','夜討ち朝駆けで住宅街の角に立ち続ける姿を偶然見かけた場面'],
    '鉄道職員':['ホームの端で列車の到着を指差確認する姿を偶然見かけた場面','改札で切符やICカードの通過を見守る姿を偶然見かけた場面','駅事務室の前で制帽を被り直して持ち場へ向かう姿を偶然見かけた場面','終電後のホームを点検して回る姿を偶然見かけた場面'],
    '国鉄職員':['ホームの端で列車の到着を指差確認する姿を偶然見かけた場面','改札で切符に鋏を入れる手つきを偶然見かけた場面','駅事務室の前で制帽を被り直して持ち場へ向かう姿を偶然見かけた場面','終電後のホームを点検して回る姿を偶然見かけた場面'],
    'お笑い芸人':['劇場や事務所の近くで、出番前にネタ合わせをしている姿を偶然見かけた場面','相方と公園でネタ合わせを繰り返す姿を偶然見かけた場面','バイト先から劇場へ衣装の入った紙袋を提げて急ぐ姿を偶然見かけた場面','出番を終えて楽屋口から充実した顔で出てくる姿を偶然見かけた場面','単独ライブのチラシを手配りする姿を偶然見かけた場面'],
    '声優':['収録スタジオの近くで、台本を持って歩く姿を偶然見かけた場面','スタジオ前でのど飴を口に入れて発声を整える姿を偶然見かけた場面','マネージャーと台本の束を抱えて移動する姿を偶然見かけた場面','夜の帰り道、マフラーで喉元をしっかり守って歩く姿を偶然見かけた場面'],
    'YouTuber':['撮影機材を持って街中でロケをしている姿を偶然見かけた場面','自撮り棒に向かって話しながら歩く姿を偶然見かけた場面','企画用の大量の買い物袋を両手に提げて出てくる姿を偶然見かけた場面','コラボ撮影の待ち合わせで機材を確認し合う姿を偶然見かけた場面'],
    'プロゲーマー':['イベント会場の近くを、デバイスの入ったバッグを持って歩く姿を偶然見かけた場面','大会前にゲーミングチェアの箱を抱えて搬入する姿を偶然見かけた場面','夜通しの練習明けに朝日を眩しそうに見る姿を偶然見かけた場面','ファンミーティング会場でサイン入りマウスパッドを渡す姿を偶然見かけた場面'],
    '書道家':['書道教室の近くで、道具箱を持って歩く姿を偶然見かけた場面','表具店から仕上がった掛軸を受け取る姿を偶然見かけた場面','展覧会の搬入で大きな作品を慎重に運ぶ姿を偶然見かけた場面','和紙の専門店で紙質を指先で確かめる姿を偶然見かけた場面'],
    'パティシエ':['開店前のパティスリーの前で、仕込みの合間に外へ出た姿を偶然見かけた場面','市場で苺の箱を吟味して仕入れる姿を偶然見かけた場面','ショーケースにケーキを一列に並べていく姿を窓越しに偶然見かけた場面','クリスマス前の徹夜仕込み明けに粉だらけで外へ出た姿を偶然見かけた場面'],
    '寿司職人':['早朝の市場帰りに、仕入れの箱を持って歩く姿を偶然見かけた場面','店先に打ち水をして暖簾を掛ける姿を偶然見かけた場面','仕込みの合間に店の前で白衣のまま伸びをする姿を偶然見かけた場面','市場の競りで真剣な目でマグロを見極める姿を偶然見かけた場面'],
    'ラーメン店店主':['仕込み中のラーメン店の前で、腕組みをして立つ姿を偶然見かけた場面','寸胴からスープの香りが漂う店先で味見を繰り返す姿を偶然見かけた場面','製麺所から麺箱を受け取って店に運び込む姿を偶然見かけた場面','行列の客に「もう少しです」と声をかけて回る姿を偶然見かけた場面'],
    '僧侶':['寺の門前を私服で歩く、穏やかな姿を偶然見かけた場面','朝の境内を竹箒で掃き清める姿を偶然見かけた場面','托鉢で商店街を静かに歩く姿を偶然見かけた場面','法要を終えて袈裟のまま檀家を見送る姿を偶然見かけた場面','夕暮れの鐘楼で鐘を撞く姿を偶然見かけた場面'],
    '古着屋店主':['古着屋の店先で商品を整えている姿を偶然見かけた場面','買い付けたばかりの大きな袋を担いで店に戻る姿を偶然見かけた場面','店先のラックを日差しに合わせて動かす姿を偶然見かけた場面','ヴィンテージのタグを虫眼鏡で確かめる姿を偶然見かけた場面'],
    '悠々自適（定年後）':['朝の公園をゆったり散歩している穏やかな姿を偶然見かけた場面','図書館の新聞コーナーで一日を始める姿を偶然見かけた場面','孫を迎えに小学校の門の前で待つ姿を偶然見かけた場面','園芸店で花の苗を選ぶ姿を偶然見かけた場面','昔の勤め先の近くを懐かしそうに歩く姿を偶然見かけた場面'],
    'アナウンサー':['本番前にテレビ局の玄関で原稿を読み込む姿を偶然見かけた場面','早朝番組を終えて朝日の中を局から出てくる姿を偶然見かけた場面','街頭中継のリハーサルでマイクの高さを確かめる姿を偶然見かけた場面','ロケ先で通行人に丁寧に頭を下げて協力を頼む姿を偶然見かけた場面','局の廊下で滑舌練習をつぶやきながら歩く姿を偶然見かけた場面','ニュース原稿の束を抱えて報道フロアへ急ぐ姿を偶然見かけた場面'],
    '小学校教員':['朝の校門で児童一人ひとりに挨拶して迎える姿を偶然見かけた場面','ジャージ姿で児童と一緒に校庭で鬼ごっこをする姿を偶然見かけた場面','放課後の教室でひとり明日の授業準備をする姿を窓越しに偶然見かけた場面','下校の列に付き添って横断歩道で旗を持つ姿を偶然見かけた場面','運動会の準備で万国旗を張る姿を偶然見かけた場面','家庭訪問の地図を片手に住宅街を自転車で回る姿を偶然見かけた場面','図工の作品を大事そうに抱えて職員室へ運ぶ姿を偶然見かけた場面'],
    '中学校教員':['部活の朝練でノックのバットを振る姿を偶然見かけた場面','放課後の廊下で生徒の相談に真剣に耳を傾ける姿を偶然見かけた場面','定期試験の問題用紙を抱えて印刷室から出てくる姿を偶然見かけた場面','合唱コンクールの練習でピアノの横に立って指揮する姿を偶然見かけた場面','夜の職員室でひとり学級通信を書く姿を偶然見かけた場面'],
    'ライフガード':['監視タワーの上から海全体を見渡す姿を偶然見かけた場面','朝のビーチをパトロールしながら遊泳区域のブイを確認する姿を偶然見かけた場面','レスキューボードを担いで砂浜を走るトレーニング姿を偶然見かけた場面','迷子の子どもの手を引いて本部テントへ連れて行く姿を偶然見かけた場面','夕方、遊泳終了の旗を降ろして片付ける姿を偶然見かけた場面','シーズン前の救助訓練で沖へ力強く泳ぎ出す姿を偶然見かけた場面','日焼け止めを塗り直しながら交代の時間を待つ姿を偶然見かけた場面'],
    'プール監視員（バイト）':['監視台の上で姿勢よくプール全体を見渡す姿を偶然見かけた場面','開場前にコースロープを張り直す姿を偶然見かけた場面','休憩時間の笛を吹いて子どもたちをプールサイドへ誘導する姿を偶然見かけた場面','閉場後にプールサイドをデッキブラシで磨く姿を偶然見かけた場面','塩素の測定キットで水質をチェックする姿を偶然見かけた場面','夏休み最終日、バイト仲間と夕暮れのプールサイドで一息つく姿を偶然見かけた場面'],
    '医師':['白衣のまま院内のコンビニで昼食を急いで買う姿を偶然見かけた場面','夜間当直明けに病院の玄関で朝日を浴びる姿を偶然見かけた場面','外来の合間に廊下で患者の家族へ丁寧に説明する姿を偶然見かけた場面','学会発表のスライドをカフェで直す姿を偶然見かけた場面','往診バッグを提げて住宅街を歩く姿を偶然見かけた場面'],
    '歯科医師':['診療後にクリニックの外で首と肩を回してほぐす姿を偶然見かけた場面','小児の患者を怖がらせないよう膝をついて話しかける姿を偶然見かけた場面','技工物の箱を歯科技工所から受け取る姿を偶然見かけた場面','休診日に学会のハンズオンセミナーへ向かう姿を偶然見かけた場面'],
    '弁護士':['裁判所の門を書類鞄を提げて足早に入る姿を偶然見かけた場面','法廷を終えてバッジを外し一息つく姿を偶然見かけた場面','事務所の窓際で六法をめくりながら夜遅くまで働く姿を偶然見かけた場面','依頼者を事務所の玄関まで丁寧に見送る姿を偶然見かけた場面'],
    '公認会計士':['決算期にクライアント先へ監査調書のキャリーを引いて向かう姿を偶然見かけた場面','電卓を叩きながらオフィスの窓際で残業する姿を偶然見かけた場面','繁忙期明けに晴れやかな顔で定時に退社する姿を偶然見かけた場面'],
    '警備員':['ビルの入口で来訪者に丁寧に敬礼する姿を偶然見かけた場面','深夜の巡回で懐中電灯を手に廊下を確認する姿を偶然見かけた場面','工事現場の前で歩行者を誘導する姿を偶然見かけた場面','夜勤明けの朝、詰所から出て大きく伸びをする姿を偶然見かけた場面','イベント会場の入場列を落ち着いた声で整理する姿を偶然見かけた場面'],
    'タクシー運転手':['駅前のタクシープールで洗車したての車を拭き上げる姿を偶然見かけた場面','高齢の乗客の荷物をトランクへ丁寧に積む姿を偶然見かけた場面','深夜の営業所で日報を書く姿を偶然見かけた場面','客待ちの合間に地図帳で新しい道を確認する姿を偶然見かけた場面'],
    'バス運転手':['始発前の営業所でバスの車体を点検する姿を偶然見かけた場面','終点で車内の忘れ物を確認して回る姿を偶然見かけた場面','バス停で車椅子のスロープを手際よく設置する姿を偶然見かけた場面','折り返しの待機時間に運転席でお茶を飲む姿を偶然見かけた場面'],
    '電車運転士':['ホームの端で指差喚呼して発車させる姿を偶然見かけた場面','乗務行路表を手に詰所から出てくる姿を偶然見かけた場面','終着駅で運転台から降りて制帽を被り直す姿を偶然見かけた場面','早朝の一番列車に乗務するため暗い駅構内を歩く姿を偶然見かけた場面'],
    'パイロット':['フライトケースを引いて空港の職員通路を歩く姿を偶然見かけた場面','出発前の機体を外部点検して回る姿を偶然見かけた場面','フライトを終えて夕暮れのターミナルを歩く姿を偶然見かけた場面','クルーと合流してホテルのロビーを出発する姿を偶然見かけた場面'],
    '郵便配達員':['赤いバイクで住宅街の細い路地を丁寧に回る姿を偶然見かけた場面','雨の日にカッパ姿で郵便物を濡らさないよう配る姿を偶然見かけた場面','年賀状シーズンにバイクの荷台いっぱいの束を積む姿を偶然見かけた場面','ポストの取集で鍵を開けて郵便物を回収する姿を偶然見かけた場面'],
    '引越しスタッフ':['大型トラックの荷台で家具を毛布で手際よく養生する姿を偶然見かけた場面','冷蔵庫を背負ってマンションの階段を上る姿を偶然見かけた場面','搬入を終えて新居の前でお客に深々と頭を下げる姿を偶然見かけた場面','昼休みにトラックの日陰で仲間とスポーツドリンクを回す姿を偶然見かけた場面'],
    'スーパー店員':['開店前に青果コーナーへ野菜を山積みに陳列する姿を偶然見かけた場面','夕方の値引きシールを手早く貼って回る姿を偶然見かけた場面','台車で飲料ケースを何段も運ぶ姿を偶然見かけた場面','閉店後に売場の床をモップがけする姿を偶然見かけた場面'],
    '家電量販店店員':['新製品の展示台を開店前に整える姿を偶然見かけた場面','大型テレビを同僚と慎重に運ぶ姿を偶然見かけた場面','お年寄りの客にスマホの使い方を根気強く教える姿を偶然見かけた場面','決算セールの日に気合いの入った声で呼び込みをする姿を偶然見かけた場面'],
    '花屋店員':['開店前に店先のバケツへ切り花を並べていく姿を偶然見かけた場面','市場で仕入れた花の束を軽バンから降ろす姿を偶然見かけた場面','花束のラッピングを真剣な手つきで仕上げる姿を窓越しに偶然見かけた場面','閉店間際に売れ残りの花の水を替えてやる姿を偶然見かけた場面'],
    '図書館司書':['返却本を積んだブックトラックを押して書架を回る姿を偶然見かけた場面','閉館後に本の背をきれいに揃え直す姿を偶然見かけた場面','子ども向けの読み聞かせ会で絵本を掲げる姿を偶然見かけた場面','新着図書にフィルムカバーを丁寧に掛ける姿を偶然見かけた場面'],
    'シェフ（洋食）':['市場で仕入れた食材の箱を店へ運び込む姿を偶然見かけた場面','ランチ営業前に店先の黒板へ本日のメニューを書く姿を偶然見かけた場面','ディナーの仕込み中に味見のスプーンを口に運ぶ姿を窓越しに偶然見かけた場面','営業後にコックコートのまま店の前で夜風にあたる姿を偶然見かけた場面'],
    '理容師':['開店前にサインポールを回して店を開ける姿を偶然見かけた場面','剃刀を革砥で丁寧に仕上げる姿を窓越しに偶然見かけた場面','常連の老紳士を店の外まで見送る姿を偶然見かけた場面','閉店後に鏡と椅子を磨き上げる姿を偶然見かけた場面'],
    '自動車教習所教官':['教習車の助手席から降りて生徒に丁寧に講評する姿を偶然見かけた場面','コースのパイロンを並べ直す姿を偶然見かけた場面','卒業検定に合格した生徒と握手する姿を偶然見かけた場面','雨の日の路上教習で落ち着いた声で指示する姿を偶然見かけた場面'],
    '銭湯・サウナ店スタッフ':['開店前に暖簾を掛けて湯温を確かめる姿を偶然見かけた場面','薪をくべて釜の火加減を調整する姿を偶然見かけた場面','サウナ室の熱波イベントでタオルを振るう姿を偶然見かけた場面','閉店後に浴場のタイルをデッキブラシで磨く姿を偶然見かけた場面','番台で常連客と楽しそうに世間話をする姿を偶然見かけた場面']
  };

  const OCC_CAT_SCENES = {
    student:['講義帰りのキャンパス周辺で、リュックを背負って歩く姿を偶然見かけた場面','学食の券売機の前でメニューを迷う姿を偶然見かけた場面','キャンパスの芝生で友人と昼を過ごす姿を偶然見かけた場面','図書館の閉館音楽と共に出てくる姿を偶然見かけた場面','バイト先へ急ぐ学生らしい姿を偶然見かけた場面'],
    office:['仕事帰りのオフィス街で、少し力の抜けた表情で歩く姿を偶然見かけた場面','昼休みにオフィス街の弁当屋の列に並ぶ姿を偶然見かけた場面','朝のエレベーターホールでネクタイを直す姿を偶然見かけた場面','退勤後に同僚と居酒屋の暖簾をくぐる姿を偶然見かけた場面','金曜の夜、心なしか軽い足取りで駅へ向かう姿を偶然見かけた場面'],
    it:['ノートPCの入ったバッグを持って、コワーキングスペースやオフィス近くを歩く姿を偶然見かけた場面','昼下がりのカフェでイヤホンをして作業に没頭する姿を偶然見かけた場面','技術書を数冊抱えて書店から出てくる姿を偶然見かけた場面','リモート会議を終えてベランダで伸びをする姿を偶然見かけた場面'],
    medical:['病院や薬局の近くで、勤務を終えて私服で帰る姿を偶然見かけた場面','夜勤明けの朝、まぶしそうに空を見上げる姿を偶然見かけた場面','院内の売店で栄養ドリンクを買い込む姿を偶然見かけた場面','休憩時間に病院の中庭で深呼吸する姿を偶然見かけた場面'],
    edu:['学校や塾の近くで、授業を終えて帰る姿を偶然見かけた場面','教材の束を抱えて職員玄関から出てくる姿を偶然見かけた場面','放課後の校庭で生徒たちと片付けをする姿を偶然見かけた場面','朝の通学路で子どもたちに挨拶する姿を偶然見かけた場面'],
    service:['閉店後の店の前で、看板の明かりを落とす姿を偶然見かけた場面','開店前の店先を掃き清める姿を偶然見かけた場面','搬入の段ボールを抱えて店に運び込む姿を偶然見かけた場面','休憩中に店の裏でまかないを食べる姿を偶然見かけた場面','ピークを乗り切って店先で腰を伸ばす姿を偶然見かけた場面'],
    trade:['作業を終えて道具を片付け、私服に着替えて帰る姿を偶然見かけた場面','朝の現場で仲間とラジオ体操をする姿を偶然見かけた場面','昼休みに車の日陰で弁当を広げる姿を偶然見かけた場面','夕方、汚れた作業着のまま自販機で一服する姿を偶然見かけた場面'],
    creative:['撮影機材や作品の入ったバッグを持って、スタジオ近くを歩く姿を偶然見かけた場面','ギャラリーの搬入口で作品を慎重に運ぶ姿を偶然見かけた場面','喫茶店の隅でアイデアをノートに書き付ける姿を偶然見かけた場面','納品明けの解放感で昼の街をゆっくり歩く姿を偶然見かけた場面'],
    uniform:['非番の日に、私服でリラックスして街を歩く姿を偶然見かけた場面','制服から私服に着替えて勤務先の裏口から出てくる姿を偶然見かけた場面','勤務前に持ち場へ向かうきびきびした姿を偶然見かけた場面','夜勤明けの朝、まぶしい光の中を帰る姿を偶然見かけた場面'],
    showa:['昔ながらの職場の近くで、仕事を終えた姿を偶然見かけた場面','夕刊を小脇に抱えて帰路につく姿を偶然見かけた場面','赤提灯の暖簾をくぐって一日の疲れを癒やしに行く姿を偶然見かけた場面'],
    enta:['出番や収録を終えて会場の裏口から出てくる姿を偶然見かけた場面','機材や台本の入ったバッグを提げて移動する姿を偶然見かけた場面','ファンに気づかれないよう帽子を目深に被って歩く姿を偶然見かけた場面'],
    other:['静かな街並みを落ち着いた足取りで歩く姿を偶然見かけた場面'],
    retired:['朝の公園でラジオ体操の輪に加わる姿を偶然見かけた場面','平日の昼間に悠々と図書館へ向かう姿を偶然見かけた場面']
  };

  function composeCandidScene(c){
    const role = String(c.role||''), y = Number(c.eraYear)||2026;
    const night = /ホスト|バーテン|警備|看護師|夜勤|タクシー/.test(role);
    const early = /漁師|農家|パン職人|市場|新聞/.test(role);
    const times = night ? ['深夜の','終電間際の','明け方の'] : early ? ['夜明け前の','早朝の','朝market'.replace('market','市場帰りの')] : ['朝の通勤時間の','昼下がりの','夕暮れの','日曜の昼の','雨上がりの夕方の'];
    const places = ['商店街のアーケードで','駅前の横断歩道で','コンビニの前で','公園のベンチのそばで','自販機の並ぶ路地で','スーパーの駐輪場で','川沿いの遊歩道で','バス停で'];
    if(/車夫/.test(role)) places.push('観光地の人力車乗り場の近くで','古い町並みの通りで');
    if(/(美容師|アパレル)/.test(role)) places.push('セレクトショップの並ぶ通りで');
    if(String(c.residenceText||'').includes('商店街')) places.push('夕方の商店街で');
    const acts = ['信号待ちをしている','レジ袋を提げて歩いている','スマホを見ながらゆっくり歩いている','自転車を押して歩いている','イヤホンで何か聴きながら歩いている','立ち止まって空を見上げている','ベンチで缶コーヒーを飲んでいる'];
    if(y<2000) { const i=acts.indexOf('スマホを見ながらゆっくり歩いている'); if(i>=0) acts[i]='文庫本を立ち読みしている'; }
    const events = ['小銭を落として拾っていた','野良猫にしゃがんで話しかけていた','自販機の前でしばらく迷っていた','傘を忘れて軒先で雨宿りしていた','子どもに道を聞かれて身振りで教えていた','くしゃみをして少し照れていた'];
    const base = `${pick(times)}${pick(places)}、${pick(acts)}姿を偶然見かけた場面`;
    return rand()<0.2 ? base.replace('姿を偶然見かけた場面', `途中、${pick(events)}のを偶然見かけた場面`) : base;
  }

  function buildEncounterScene(c){
    const scenes = [];
    const nat = c.nationality || '';    if(['ISTJ','ISFJ','ESTJ','ESFJ'].includes(c.mbti)) scenes.push('出勤前の静かな駅前やオフィス街で、落ち着いた雰囲気で歩いているところを偶然見かけた場面');
    if(['ESTP','ESFP'].includes(c.mbti)) scenes.push('夕方の街角やスポーツ施設帰りに、活動的な雰囲気で友人と合流する前の姿を偶然見かけた場面');
    if(['ISFP','INFP'].includes(c.mbti)) scenes.push('カフェ前や古着屋、小さなギャラリーの近くで、自然体の私服姿を偶然見かけた場面');
    if(['ENFP','ENFJ'].includes(c.mbti)) scenes.push('にぎやかな通りや商業施設周辺で、明るい雰囲気で友人を待つ姿を偶然見かけた場面');
    if(['INTJ','INTP'].includes(c.mbti)) scenes.push('大学施設や静かな作業スペースの近くで、考え込むように歩く姿を偶然見かけた場面');
    if(c.role.includes('大学生') || c.outfitType.includes('通学') || c.outfitType.includes('学生服')) scenes.push('駅から学校へ向かう途中、朝の通学路でふと見かけた場面');
    if(c.role.includes('社会人') || c.role.includes('営業') || c.role.includes('事務') || c.role.includes('IT')) scenes.push('出勤前の駅前やオフィス街で偶然すれ違った場面');
    if(c.role.includes('研究') || c.role.includes('クリエイター')) scenes.push('大学施設や作業スペースの近くで、資料やPCを持って移動しているところを偶然見かけた場面');
    if(c.role.includes('スポーツ') || c.vibe==='スポーツ系') scenes.push('スポーツ施設の外や練習帰りの通路で、汗が引いた自然な状態を偶然見かけた場面');
    if(c.role.includes('モデル') || c.role.includes('俳優')) scenes.push('街中で撮影や移動の合間に、ふと立ち止まった瞬間を偶然見かけた場面');
    if(c.vibe==='ワイルド系') scenes.push('夕方の街角で、少しラフな雰囲気で歩いているところを偶然見かけた場面');
    if(c.vibe==='やりらふぃー系' || c.vibe==='ストリート系' || c.vibe==='陽キャ大学生系') scenes.push('駅前や繁華街の通りで、友人と合流する前の自然な姿を偶然見かけた場面');
    if(c.vibe==='塩顔系' || c.vibe==='犬系男子' || c.vibe==='清楚系') scenes.push('カフェ前や落ち着いた街角で、柔らかい雰囲気の立ち姿を偶然見かけた場面');
    if(c.vibe==='サブカル系' || c.vibe==='古着系') scenes.push('古着屋や小さなギャラリーの近くで、個性的な私服姿を偶然見かけた場面');
    if(c.vibe==='クール系' || c.vibe==='ミステリアス系') scenes.push('夜の駅前や静かな通りで、落ち着いた雰囲気で歩く姿を偶然見かけた場面');
    if(c.vibe==='韓国風' || c.vibe==='中性系') scenes.push('カフェや商業施設の近くで、洗練された私服姿を偶然見かけた場面');
    if(nat==='日本') scenes.push('駅前や商店街、学校やオフィスの近くで、日常の流れの中に自然に溶け込んでいるところを偶然見かけた場面');
    if(nat==='韓国') scenes.push('都会的なカフェ通りや商業施設の近くで、洗練された雰囲気の立ち姿を偶然見かけた場面');
    if(nat==='中国' || nat==='台湾') scenes.push('大型商業施設や夜の街並みの近くで、都会的な私服姿を偶然見かけた場面');
    if(nat==='アメリカ' || nat==='イギリス') scenes.push('大学キャンパス周辺やダウンタウンの歩道で、自然に歩いている姿を偶然見かけた場面');
    if(nat==='フランス') scenes.push('街路樹のある通りやカフェテラスの近くで、さりげなく立っている姿を偶然見かけた場面');
    if(nat==='ブラジル' || nat==='メキシコ') scenes.push('広場やスポーツコートの近くで、活動的で親しみやすい雰囲気の姿を偶然見かけた場面');
    if(nat==='タイ' || nat==='ベトナム') scenes.push('にぎやかな通りや屋外カフェの近くで、軽やかな私服姿を偶然見かけた場面');
    scenes.push(composeCandidScene(c), composeCandidScene(c), composeCandidScene(c), composeCandidScene(c));
    let occPicks = [];
    if(c.occInfluence !== '影響なし' && c.role){
      const rolePool = OCC_SCENES[c.role];
      const catPool = OCC_CAT_SCENES[OCC_CAT[c.role]];
      if(c.occupationMode === '休日'){ scenes.push('休日に、仕事とは違う雰囲気の私服でくつろいで歩く姿を偶然見かけた場面'); }
      else occPicks = (rolePool && rolePool.length ? rolePool : (catPool || [])).slice();
    }
    if(c.role && c.role.includes('商社')) scenes.push('オフィス街の交差点で、書類鞄を持って颯爽と歩く姿を偶然見かけた場面');
    if(c.role && c.role.includes('工場')) scenes.push('工場や作業場の近くで、仕事帰りに私服へ着替えた姿を偶然見かけた場面');
    if(c.vibe==='レトロ系') scenes.push('喫茶店やレコードショップの近くで、レトロな雰囲気の私服姿を偶然見かけた場面');
    if(c.vibe==='バンドマン系') scenes.push('ライブハウスの入り口近くで、機材を持って立っている姿を偶然見かけた場面');
    if(c.vibe==='紳士系') scenes.push('落ち着いたホテルのロビーや上質な街並みで、品のある立ち姿を偶然見かけた場面');
    if(c.vibe==='アウトドア系') scenes.push('公園の入り口やアウトドアショップの前で、身軽な服装でたたずむ姿を偶然見かけた場面');
    if(c.vibe==='ギャル男系') scenes.push('繁華街の通りで、華やかな雰囲気で友人と話している姿を偶然見かけた場面');
    if(c.vibe==='モード系') scenes.push('セレクトショップやギャラリー前で、モードな私服姿を偶然見かけた場面');
    const eraYr = Number(c.eraYear) || 2026;
    let eraScene = null;
    if(eraYr < 1980) eraScene = pick(['駅の伝言板や喫茶店の窓際の近くで、当時らしい落ち着いた私服姿を偶然見かけた場面','商店街のレコード店の前で立ち止まっている姿を偶然見かけた場面']);
    else if(eraYr < 1990) eraScene = '喫茶店や貸レコード店の近くで、時代の空気をまとった私服姿を偶然見かけた場面';
    else if(eraYr < 2000) eraScene = pick(['レンタルビデオ店やゲームセンターの前で、友人を待つ姿を偶然見かけた場面','公衆電話の近くで連絡を待つような姿を偶然見かけた場面']);
    else if(eraYr < 2010) eraScene = 'CDショップや携帯ショップの前で、ふと立ち止まる姿を偶然見かけた場面';
    else if(eraYr < 2020) eraScene = 'カフェの前でスマートフォンを見ながら待ち合わせている姿を偶然見かけた場面';
    else eraScene = 'カフェや商業施設の前で、スマートフォンを片手に自然体でたたずむ姿を偶然見かけた場面';
    if(eraScene){ scenes.push(eraScene); scenes.push(eraScene); }
    const genericScenes = ['信号待ちの交差点で、ふと隣に立っていたところを偶然見かけた場面','自動販売機の前で飲み物を選んでいる姿を偶然見かけた場面','書店の店先で立ち読みをしている姿を偶然見かけた場面','コインランドリーの前で洗濯物を待つ姿を偶然見かけた場面','バス停のベンチでバスを待つ姿を偶然見かけた場面','神社の石段をゆっくり上る姿を偶然見かけた場面','河川敷の遊歩道を歩いている姿を偶然見かけた場面','コンビニの前で買い物袋を提げて立つ姿を偶然見かけた場面','横断歩道を渡りきったところを偶然見かけた場面','公園のベンチでひと息ついている姿を偶然見かけた場面','パン屋の店先で香りに足を止めた姿を偶然見かけた場面','花屋の前で花をながめている姿を偶然見かけた場面','ATMの列に並んでいる姿を偶然見かけた場面','ガード下の道を通り抜ける姿を偶然見かけた場面','歩道橋の上から街を見下ろす姿を偶然見かけた場面','ポストに封筒を投函する姿を偶然見かけた場面','クリーニング店から仕上がりを受け取って出てきた姿を偶然見かけた場面','傘立てから傘を取り出している姿を偶然見かけた場面','立ち食いそば屋ののれんをくぐろうとする姿を偶然見かけた場面','駐輪場で自転車の鍵を外している姿を偶然見かけた場面'];
    scenes.push(pick(genericScenes)); scenes.push(pick(genericScenes));
    const seasonScenes = {
      '春':['桜並木の下を歩く姿を偶然見かけた場面','花見帰りらしい和やかな表情の姿を偶然見かけた場面','春風に髪を押さえながら歩く姿を偶然見かけた場面'],
      '夏':['夕立あがりの濡れた路面を歩く姿を偶然見かけた場面','日陰を選んで歩く夏らしい姿を偶然見かけた場面','夏祭りの帰りらしい雰囲気の姿を偶然見かけた場面'],
      '秋':['紅葉した並木道を歩く姿を偶然見かけた場面','落ち葉を踏みながら歩く姿を偶然見かけた場面','金木犀の香る住宅街を歩く姿を偶然見かけた場面'],
      '冬':['白い息を吐きながら足早に歩く姿を偶然見かけた場面','ポケットに手を入れて歩く冬らしい姿を偶然見かけた場面','イルミネーションの灯る通りを歩く姿を偶然見かけた場面']
    };
    if(c.season && seasonScenes[c.season]) scenes.push(pick(seasonScenes[c.season]), pick(seasonScenes[c.season]));
    const occRate = (c.occupationMode === '勤務帰り' || c.occupationMode === '勤務中') ? .82 : .45;
    let sc = (occPicks.length && rand() < occRate) ? pick(occPicks) : pick(scenes);
    const sceneMods = ['夕暮れどき、','朝の澄んだ空気の中、','昼下がり、','日が落ちたばかりの時間帯に、','小雨上がりに、','よく晴れた日に、','曇り空の下、'];
    if(rand() < 0.45 && !/^(朝|夜|夕|早朝|昼|休日|非番|開店前|閉店後|白い息|夕立)/.test(sc)) sc = pick(sceneMods) + sc;
    return sc;
  }

  const FVOCAB = {
  top: [
    ['開襟シャツ',1950,1965,1979,'cfo'],['ボックスシルエットの開襟シャツ',2017,2021,2026,'cskf'],['アイビー風ボタンダウンシャツ',1960,1968,1984,'ckfo'],['VANロゴ入りトレーナー',1965,1972,1982,'cf'],['タートルネックニット',1965,1975,2026,'cko'],['サファリシャツ',1972,1976,1982,'cf'],['ベスト重ねのシャツスタイル',1970,1976,1984,'kfo'],['ラガーシャツ',1980,1986,1996,'cf'],['ポロシャツ（アイビー風）',1962,1970,1989,'cko'],['ポロシャツ',1970,1995,2026,'cko'],['DCブランド風ビッグシャツ',1982,1986,1992,'kf'],['肩パッド入りサマーニット',1983,1987,1992,'kf'],['プレッピー風クルーネックニット',1980,1985,1994,'cko'],['紺ブレザー×白シャツ（渋カジ）',1988,1991,1995,'ckf'],['ボーダーバスクシャツ',1988,1993,2026,'ck'],['チェックのネルシャツ',1990,1996,2010,'csf'],['バンドTシャツ',1990,1997,2026,'sf'],['裏原系ロゴTシャツ',1995,1999,2004,'sf'],['オーバーサイズTシャツ',1993,1998,2003,'cs'],['オーバーサイズTシャツ',2016,2021,2026,'cs'],['無地ヘビーウェイトTシャツ',1994,2000,2026,'csf'],['ルーズシルエットのポロシャツ',1994,1998,2003,'cs'],['スウェット（リバースウィーブ風）',1990,1996,2026,'csf'],['ゲームシャツ',1996,2000,2006,'sp'],['バスケジャージ重ね着（B系）',1997,2001,2006,'s'],['レイヤード風Tシャツ',2003,2006,2010,'cs'],['七分袖カットソー',2003,2007,2011,'ck'],['お兄系の光沢シャツ',2002,2006,2009,'k'],['ドレープカーディガン重ね',2006,2009,2012,'ck'],['Vネックの深いカットソー',2005,2008,2012,'c'],['細身の黒シャツ',2002,2007,2012,'k'],['スタッズ・プリントT（お兄系）',2004,2007,2011,'s'],['チェックシャツ（細身）',2008,2012,2016,'ck'],['オックスフォードシャツ',2010,2014,2026,'cko'],['白無地Tシャツ（ノームコア）',2013,2016,2020,'ck'],['無地カットソー',2010,2015,2026,'cko'],['MA-1インナーの無地T',2015,2017,2020,'cs'],['ビッグシルエットシャツ',2017,2021,2026,'cks'],['ニットベスト重ねスタイル',2019,2022,2026,'ckf'],['オーバーサイズスウェット',2017,2021,2026,'cs'],['韓国風ミニマルニット',2018,2022,2026,'k'],['カラーシャツ（くすみカラー）',2019,2022,2026,'ck'],['メッシュ編みサマーニット',2021,2024,2026,'ck'],['Y2Kリバイバルの古着T',2021,2024,2026,'sf'],['テック系プルオーバー',2019,2023,2026,'cs'],['ヘンリーネックカットソー',1995,2005,2026,'c'],['ロングスリーブTシャツ',1995,2010,2026,'cs'],['スウェット',1985,2000,2026,'cs'],['パーカー（プルオーバー）',1995,2005,2026,'cs'],['ジップパーカー',2000,2008,2026,'cs'],['無地Tシャツ',1970,2000,2026,'csko'],['ケーブルニット',1978,1990,2026,'ckf'],['モックネックカットソー',2018,2022,2026,'ck'],['ハーフジップニット',1992,1997,2003,'cf'],['ハーフジップニット',2020,2023,2026,'ck'],['スケーターブランドのロゴT',1996,2001,2010,'s'],['サーマルロンT',1998,2004,2016,'cs'],['ネイティブ柄カーディガン',2010,2013,2017,'cf'],['シャンブレーシャツ',2010,2014,2020,'ck'],['ダンガリーシャツ',1988,1994,2002,'cf'],['タイダイ柄Tシャツ',1992,1996,2001,'sf'],['タイダイ柄Tシャツ',2019,2021,2024,'sf'],['刺繍ロゴスウェット',2016,2020,2026,'cs'],['ラグランスリーブT',1990,1998,2010,'cp'],['ピケポロシャツ',1980,1992,2026,'cko'],['イタリアンカラーシャツ',2003,2006,2010,'k'],['バンドカラーシャツ',2015,2019,2026,'ckf'],['オープンカラーシャツ（柄物）',2016,2019,2024,'ckf'],['麻シャツ',1985,2000,2026,'ck'],['グラフィックビッグT',2018,2022,2026,'s'],['カレッジロゴスウェット',1980,1990,2026,'cf'],['セーラー風バスクシャツ',1986,1992,1998,'cf'],['アメカジ無地ポケT',1990,1997,2026,'cf'],['ワッフル地ロンT',1998,2004,2014,'c'],['首元ゆるTシャツ',2004,2007,2011,'c'],['ジャガード柄ニット',2019,2023,2026,'kf'],['スタジアムロゴT',1985,1992,2000,'sf'],['アーガイルニット',1978,1988,2004,'kfo'],['タンクトップ重ね着',1997,2001,2006,'s'],['クルーネックスウェット（無地）',2013,2018,2026,'cks'],['起毛チェックシャツ（重ね着）',2011,2014,2018,'c'],['サッカー地ポロ',2014,2018,2026,'cko'],['ラッシュガード風トップス',2002,2006,2012,'p'],['ドライメッシュTシャツ',2004,2012,2026,'p'],['吸汗速乾ポロ',2008,2015,2026,'po'],['コンプレッションインナー重ね',2006,2012,2026,'p'],['クレイジーパターンのラガー',1990,1994,1999,'cf'],['フォトプリントT',2015,2019,2024,'s'],['アニマル柄ニット（お兄）',2005,2008,2011,'k'],['グランジ風ボロニット',1993,1996,2000,'sf']
  ],
  bottom: [
    ['スラックス（細身）',1955,1965,1975,'kfo'],['ベルボトム風スラックス',1970,1974,1979,'cf'],['コーデュロイパンツ',1970,1978,2026,'ckf'],['タック入りスラックス',1982,1988,1996,'kfo'],['チノパン（アイビー）',1962,1970,1990,'cko'],['チノパン',1985,2000,2026,'cko'],['ストレートデニム',1970,1990,2026,'csf'],['ケミカルウォッシュデニム',1986,1989,1994,'csf'],['ルーズストレートデニム',1993,1997,2003,'csf'],['バギーデニム（B系）',1997,2001,2006,'s'],['ワイドカーゴパンツ',1995,1999,2004,'cs'],['カーゴパンツ',1995,2005,2026,'cs'],['ダメージ加工デニム',2002,2006,2011,'cs'],['ブーツカットデニム',2002,2006,2010,'ck'],['細身のブラックデニム',2004,2008,2014,'k'],['スキニーデニム',2008,2013,2019,'ck'],['黒スキニーパンツ',2010,2015,2020,'cks'],['テーパードパンツ',2012,2017,2026,'cko'],['アンクル丈スラックス',2014,2018,2023,'ko'],['ジョガーパンツ',2014,2018,2023,'csp'],['ワイドパンツ',2017,2021,2026,'cks'],['ワイドデニム',2018,2022,2026,'csf'],['バルーンパンツ',2020,2023,2026,'s'],['ワイドスラックス',2018,2022,2026,'ko'],['ナイロントラックパンツ',1996,2000,2005,'sp'],['ナイロントラックパンツ',2017,2020,2025,'s'],['ハーフパンツ（膝下）',1998,2003,2010,'cs'],['ショートパンツ（膝上）',2012,2017,2026,'cs'],['イージーパンツ',2015,2020,2026,'c'],['スウェットパンツ',2012,2018,2026,'cs'],['ペインターパンツ',1994,1998,2004,'csf'],['ペインターパンツ',2020,2023,2026,'sf'],['腰履きルーズデニム',1996,2000,2005,'s'],['クロップドパンツ',2005,2008,2013,'c'],['白パンツ（マリン）',1984,1989,1996,'kf'],['グルカパンツ',2019,2022,2026,'kf'],['プリーツ入りワイド',2019,2023,2026,'k'],['カーブパンツ',2021,2024,2026,'ks'],['フレアスラックス',2021,2024,2026,'kf'],['スタプレ風パンツ',1968,1974,1982,'cf'],['ウエスタン風デニム',1978,1984,1992,'cf'],['サルエルパンツ',2008,2011,2015,'cs'],['ジャージパンツ（ライン入り）',1985,1995,2026,'sp'],['ナイロンパンツ',1995,2005,2026,'sp'],['ハーフパンツ',1995,2005,2026,'csp'],['黒ショートパンツ',2005,2015,2026,'cs'],['デニム',1965,1995,2026,'cs'],['ベイカーパンツ',2015,2019,2026,'ckf'],['コーデュロイワイド',2019,2022,2026,'ckf'],['チェック柄スラックス',2016,2020,2025,'kf'],['迷彩カーゴ',1996,2000,2006,'sf'],['迷彩カーゴ',2013,2016,2020,'s'],['白デニム',2010,2014,2019,'k'],['セルビッチデニム（赤耳）',2005,2012,2026,'cf'],['ダメージリペアの古着リーバイス風',1993,1997,2003,'f'],['太畝コーデュロイ（古着）',1994,1998,2004,'f'],['ミリタリーチノ（M-41風）',2015,2019,2026,'f'],['トラウザーズ（センタープレス）',1988,1994,2002,'ko'],['アンクルカットデニム',2015,2018,2022,'ck'],['リラックスフィットデニム',2019,2023,2026,'c'],['スラックス風イージー',2019,2023,2026,'ko'],['カーゴジョガー',2016,2019,2023,'s'],['ナイロンシャカパン',1994,1998,2003,'sp'],['ベロアトラックパンツ',2001,2004,2008,'s'],['サッカー練習用プラパン',1990,2005,2026,'p'],['クライミングパンツ',2013,2017,2023,'cp'],['ストレッチスリムチノ',2011,2015,2021,'cko'],['ツータックのゆるスラックス',1990,1994,1999,'o'],['ノータックスリムスラックス',2008,2013,2020,'o'],['起毛ウールスラックス',1985,1995,2026,'ko']
  ],
  shoes: [
    ['ローファー',1960,1985,2026,'kfo'],['デッキシューズ',1978,1985,1996,'ckf'],['白のキャンバススニーカー',1965,1985,2026,'csf'],['バスケットハイカット（白）',1985,1990,1997,'csf'],['ハイテクスニーカー（AIR系）',1995,1997,2002,'s'],['ハイテクスニーカー復刻',2015,2018,2023,'s'],['スケートシューズ',1996,2001,2008,'s'],['エンジニアブーツ',2002,2006,2011,'s'],['先の尖った革靴（お兄系）',2003,2006,2010,'k'],['ドライビングシューズ',2010,2014,2020,'k'],['白レザースニーカー（スタンスミス風）',2013,2016,2021,'ck'],['ダッドスニーカー',2018,2021,2025,'s'],['ジャーマントレーナー風',2019,2022,2026,'ck'],['ローテクスニーカー（ガムソール）',2016,2020,2026,'ckf'],['トレイルランニングシューズ',2019,2022,2026,'csp'],['サンダル×ソックス',2018,2021,2026,'s'],['スポーツサンダル',2014,2018,2024,'cs'],['雪駄風サンダル',1995,2000,2008,'cf'],['ワークブーツ（赤茶）',1992,1996,2004,'csf'],['ワークブーツ（赤茶）',2010,2013,2018,'cf'],['サイドゴアブーツ',2015,2019,2024,'k'],['チャッカブーツ',1965,1975,2026,'kf'],['ウイングチップ革靴',1980,1990,2026,'kfo'],['白スニーカー',1985,2005,2026,'cks'],['黒スニーカー',1990,2010,2026,'cks'],['キャンバススニーカー',1970,1995,2026,'csf'],['ランニングシューズ',1980,2000,2026,'p'],['厚底ランニングシューズ',2019,2022,2026,'p'],['サッカースパイク',1980,2000,2026,'p'],['バスケットシューズ',1985,2000,2026,'p'],['トレッキングシューズ',1990,2000,2026,'cp'],['モカシン',1976,1982,1990,'cf'],['ビットローファー',1985,1990,1996,'k'],['ビットローファー',2019,2022,2026,'kf'],['タッセルローファー',1986,1992,2000,'kfo'],['コインローファー（HARUTA風）',1975,1990,2026,'cfo'],['スリッポン',2012,2016,2022,'c'],['スリッポン（チェッカー柄）',1996,2000,2006,'s'],['ハイカットキャンバス',2009,2013,2019,'cs'],['エアクッション系ランニング',2006,2010,2016,'cp'],['レトロランニングシューズ',2013,2017,2023,'ckf'],['ミュール風サンダル',2021,2024,2026,'s'],['ガチャベルト時代の厚底スニーカー',1998,2001,2005,'s'],['黒革靴',1950,1990,2026,'kfo'],['茶革靴',1960,1990,2026,'kfo'],['下駄',1900,1930,1955,'f'],['革のサンダル',1975,1985,2000,'cf'],['メッシュスニーカー',2015,2019,2026,'cp'],['ニットアッパースニーカー',2016,2019,2024,'cs'],['厚底ダッド系ハイテク',2019,2022,2026,'s'],['ボリュームソールのローファー',2020,2023,2026,'k'],['スエードスニーカー',1975,1990,2026,'ckf'],['ジョギングシューズ（青×黄）',1977,1982,1990,'cpf'],['カンフーシューズ（古着流用）',1994,1998,2003,'f'],['ラバーソールシューズ',1998,2002,2008,'sf'],['ムートンブーツ（メンズ）',2008,2011,2015,'c']
  ],
  outer: [
    ['ステンカラーコート',1960,1985,2026,'koWL'],['トレンチコート',1970,1990,2026,'koWL'],['チェスターコート',2013,2016,2022,'kWL'],['ダッフルコート',1978,1988,2004,'ckWf'],['ダッフルコート',2009,2012,2017,'cW'],['ピーコート',1995,2005,2015,'ckW'],['スタジャン',1984,1989,1996,'csWf'],['スタジャン',2021,2024,2026,'sW'],['MA-1',1985,1990,1997,'csWf'],['MA-1',2015,2017,2021,'csWL'],['デニムジャケット',1975,1995,2026,'csfL'],['Gジャン（ケミカル）',1986,1989,1994,'cfL'],['レザーライダース',1980,1990,2026,'skWL'],['ドカジャン風中綿',1975,1985,1995,'cWf'],['ダウンジャケット',1994,2000,2026,'csW'],['インナーダウン重ね',2013,2017,2023,'ckWL'],['マウンテンパーカー',1990,1996,2003,'cfL'],['マウンテンパーカー',2012,2017,2026,'csL'],['アノラックパーカー',1994,1998,2004,'csfL'],['ナイロンコーチジャケット',2015,2018,2023,'sL'],['スウィングトップ',1988,1993,2000,'ckfL'],['スウィングトップ',2018,2021,2026,'kfL'],['ボアフリースジャケット',2018,2021,2026,'csW'],['フリースジャケット',1996,2000,2008,'cWL'],['中綿ベスト重ね',1999,2003,2009,'cL'],['テーラードジャケット',1975,1995,2026,'koL'],['紺ブレザー（金ボタン）',1988,1991,1996,'kfL'],['紺ブレザー（金ボタン）',2021,2024,2026,'kfL'],['ノーカラージャケット',2015,2019,2024,'kL'],['セットアップの上だけ羽織り',2017,2021,2026,'kL'],['カーディガン',1970,1995,2026,'ckoL'],['ロングカーディガン',2014,2017,2021,'cL'],['シャツジャケット（シャケット）',2019,2022,2026,'ckLS'],['CPOジャケット',2019,2022,2026,'cfL'],['ミリタリーM-65',1992,1997,2004,'csfWL'],['ミリタリーM-65',2013,2016,2021,'cfL'],['モッズコート',1996,2000,2006,'csWf'],['モッズコート',2011,2014,2018,'cW'],['キルティングジャケット',2010,2014,2020,'ckL'],['ハリントンジャケット',1965,1975,1990,'ckfL'],['アニメ柄スカジャン',1994,1998,2004,'sf'],['スカジャン',2015,2018,2022,'sfL'],['ウールメルトンPコート',1998,2004,2012,'cW'],['ムスタン（ムートン）ジャケット',2019,2022,2026,'ksW'],['オーバーサイズダウン',2019,2022,2026,'sW'],['ライトダウン',2010,2015,2026,'coWL'],['ウインドブレーカー',1985,1995,2026,'cpL'],['セットアップジャージ上',1985,1995,2026,'spL'],['ベンチコート',1995,2005,2026,'pW'],['羽織りの開襟シャツ',1995,2005,2026,'cS'],['リネンシャツ羽織り',2014,2019,2026,'ckS'],['ビッグシルエットシャツ羽織り',2018,2022,2026,'csS'],['サマーカーディガン',2005,2012,2026,'ckS'],['ナイロンアノラック（ゴープコア）',2019,2022,2026,'sLS'],['パーカー',1995,2005,2026,'csL'],['中綿ジャケット',1990,2005,2026,'cW'],['ロング丈チェスター（オーバー）',2019,2022,2026,'kW'],['コーデュロイジャケット',1976,1984,1994,'ckfL'],['コーデュロイジャケット',2018,2021,2026,'kfL'],['アウトドアシェルジャケット',2016,2020,2026,'cspL']
  ],
  suitSil: [
    ['三つ揃い・細身ラペルの古典シルエット',1950,1965,1978,''],['幅広ラペルのゆったりシルエット',1972,1977,1984,''],['肩パッドの効いたソフトスーツ（ダブル多め）',1985,1989,1994,''],['ゆとりのある3つボタンシルエット',1993,1997,2003,''],['細身2つボタン・ややロング丈',2003,2007,2012,''],['スリムフィット×ナローラペル',2010,2014,2019,''],['程よくゆとりのあるセットアップシルエット',2018,2022,2026,''],['アンコン仕立ての軽いジャケット感',2014,2018,2026,''],['ダブルブレスト回帰のクラシコ',2019,2023,2026,''],['ツータックスラックスの重厚クラシック',1988,1993,1999,''],['ノータック細身スラックス',2008,2013,2020,''],['ワンタック回帰スラックス',2018,2022,2026,''],['布帛たっぷりの90年代ソフト肩',1991,1995,2000,''],['光沢生地のお兄系タイトスーツ',2004,2007,2011,''],['ストレッチ機能素材のセットアップ',2017,2021,2026,''],['ウォッシャブル・セットアップ',2019,2023,2026,'']
  ],
  suitShirt: [
    ['白レギュラーカラーシャツ',1950,1990,2026,''],['クレリックシャツ',1983,1988,1995,''],['ボタンダウンシャツ',1965,1995,2026,''],['ワイドカラーシャツ',2000,2005,2012,''],['ホリゾンタルカラーシャツ',2012,2016,2022,''],['サックスブルーシャツ',1985,2000,2026,''],['ストライプシャツ',1988,1998,2026,''],['カッタウェイカラー',2013,2017,2023,''],['オックスフォードBDシャツ',2010,2015,2026,''],['形態安定シャツ',1995,2005,2026,''],['ニット素材シャツ',2018,2022,2026,''],['バンドカラーシャツ（ジャケット内）',2018,2022,2026,''],['麻混シャツ（夏）',1990,2005,2026,''],['ピンホールカラーシャツ',1986,1991,1998,'']
  ],
  suitTie: [
    ['細身のナロータイ',1960,1966,1974,''],['幅広の派手柄タイ',1972,1977,1985,''],['ブランドロゴ柄タイ',1986,1990,1996,''],['レジメンタルタイ',1980,1995,2026,''],['小紋柄タイ',1985,2000,2026,''],['光沢無地のナロータイ',2005,2009,2015,''],['ニットタイ',2011,2016,2026,''],['無地セミワイドタイ',2015,2020,2026,''],['ペイズリー柄タイ',1988,1994,2002,''],['ドット柄タイ',1990,2005,2026,''],['チェック柄タイ',2008,2013,2020,''],['無地ネクタイ',1950,2000,2026,'']
  ],
  bizShoes: [
    ['ストレートチップ（内羽根）',1960,1990,2026,''],['プレーントゥ',1960,1990,2026,''],['Uチップ',1975,1990,2026,''],['ロングノーズのスクエアトゥ',2002,2006,2011,''],['先の細いポインテッド革靴',2004,2007,2011,''],['ダブルモンクストラップ',2012,2016,2023,''],['ビジネススニーカー（黒レザー調）',2018,2022,2026,''],['ウイングチップ',1980,1992,2026,''],['タッセルローファー（ビズ）',1986,1992,2000,''],['コインローファー（ビズカジ）',2015,2019,2026,''],['サイドゴアのビジネスブーツ',2016,2020,2026,''],['ガムソールの快適革靴',2019,2023,2026,''],['光沢強めのエナメル寄り革靴',2004,2007,2010,''],['雨用ラバー底革靴',1995,2005,2026,'']
  ],
  bizCoat: [
    ['ステンカラーコート',1960,1985,2026,'l'],['トレンチコート',1975,1992,2026,'l'],['チェスターコート',2013,2017,2023,''],['ウールのダブルコート',1986,1991,1997,''],['カシミヤ混ロングコート',1988,1994,2002,''],['ビジネスダウンコート',2005,2012,2026,''],['機能素材のステンカラー',2016,2021,2026,'l'],['ライナー付きトレンチ',1990,2000,2026,'l'],['ハーフ丈のビジネスコート',2000,2008,2016,''],['オーバーサイズ気味チェスター',2019,2023,2026,''],['キルティングビジネスコート',2014,2018,2024,'l'],['アルスターカラーコート',2018,2022,2026,''],['紺のPコート（通勤）',1998,2004,2012,''],['撥水シェルの通勤コート',2018,2022,2026,'l']
  ]};

  function eraItemW(it, y){
    const f = it[1], pk = it[2], t = it[3];
    if(y < f-3 || y > t+8) return 0;
    if(y < f) return 0.5 * (y-(f-3))/3;
    if(y <= t){ const span = Math.max(1, Math.max(pk-f, t-pk)); return 1 + 0.7*(1 - Math.abs(y-pk)/span); }
    return Math.max(0.15, 1 - ((y-t)/8)*0.85);
  }

  function eraRefYear(y, age){
    const a = Number(age)||25;
    if(a > 40 && rand() < 0.55) return y - Math.min(12, Math.round((a-32)*0.45));
    return y;
  }

  function pickEraItem(list, y, tagRe, boostOld){
    const cand = [];
    for(const it of list){
      let w = eraItemW(it, y);
      if(!w) continue;
      if(tagRe && !tagRe.test(it[4]||'')) continue;
      if(boostOld && y > it[3]) w *= 3;
      cand.push([it[0], w]);
    }
    return cand.length ? weighted(cand) : null;
  }

  function eraSilhouetteNote(y){
    if(y < 1975) return '細身〜フレアの70年代前夜シルエット';
    if(y < 1985) return 'アイビー〜プレッピーの端正なシルエット';
    if(y < 1990) return '肩幅にゆとりのある80年代後半シルエット';
    if(y < 1995) return '渋カジ〜キレカジのきれいめカジュアル感';
    if(y < 2000) return '全体にルーズな90年代後半シルエット';
    if(y < 2005) return 'ゆるさの残る2000年代前半シルエット';
    if(y < 2010) return 'Yライン細身の2000年代後半シルエット';
    if(y < 2015) return '細身基調の2010年代前半シルエット';
    if(y < 2020) return 'ノームコア寄りのすっきりした細身シルエット';
    if(y < 2023) return '全体にオーバーサイズの2020年代シルエット';
    return 'オーバーサイズ×Y2Kが混ざる2020年代なかばのシルエット';
  }

  function mbtiStyleNote(mbti){
    const m = String(mbti||'');
    if(!m || m.length < 4) return '';
    const cands = [];
    if(/J$/.test(m)) cands.push('ベーシックな配色で、アイロンの効いた清潔感のある着こなし');
    if(/P$/.test(m)) cands.push('柄物や差し色をその日の気分で取り入れる着こなし');
    if(m[2]==='T') cands.push('モノトーン中心・機能優先の合理的な着こなし');
    if(m[2]==='F') cands.push('柔らかい色味と肌ざわり重視の親しみやすい着こなし');
    return cands.length ? pick(cands) : '';
  }

  const FV_INDEX = (()=>{ const m={}; for(const k of ['top','bottom','shoes','outer']) for(const it of FVOCAB[k]){ if(!m[it[0]]) m[it[0]]=[]; m[it[0]].push(it); } return m; })();

  function fvInWindow(name, y){ const its = FV_INDEX[name]; if(!its) return true; return its.some(it=>eraItemW(it, y) > 0); }

  const TYPE_ERA = {'Y2K':[[1999,2004],[2020,9999]],'テックウェア':[[2016,9999]],'シティボーイ':[[2015,9999]],'ノームコア':[[2014,2020]],'裏原系':[[1995,2005]],'お兄系':[[2003,2012]],'渋谷系':[[1993,2002]],'きれいめストリート':[[2018,9999]],'ワンマイルウェア':[[2020,9999]],'ビジネスカジュアル':[[2000,9999]],'オフィスカジュアル':[[2010,9999]],'和カジュアル':[[1955,9999]],'サーフ系':[[1990,9999]],'ゴープコア':[[2018,9999]],'ワークマン系機能カジュアル':[[2018,9999]],'セットアップカジュアル':[[2015,9999]]};

  const typeInEra = (t,y) => { const w=TYPE_ERA[t]; if(!w) return true; return w.some(([f,to])=>y>=f && y<=to); };

  const CASUAL_NEW = ['シティボーイ','ノームコア','Y2K','テックウェア','オールブラック・ミニマル','フレンチカジュアル','ブリティッシュトラッド','サーフ系','裏原系','お兄系','渋谷系','きれいめストリート','ワンマイルウェア','和カジュアル'];

  function OCC_WORK_STYLES(r, y){
    const T = {
      '保育士':[['エプロンスタイル',5],['社会人カジュアル',2]],
      '花屋店員':[['エプロンスタイル',5],['社会人カジュアル',2]],
      '体育教師':[['ジャージスタイル',5],['ジャケパン',1.5]],
      '小学校教員':[['ジャージスタイル',4],['ビジネスカジュアル',y>=2000?3:1],['ジャケパン',1.5]],
      '中学校教員':[['ジャケパン',3],['ジャージスタイル',3],['ビジネスカジュアル',y>=2000?2:0.6]],
      '高校教師':[['ジャケパン',4],['ビジネスカジュアル',y>=2000?2:0.6],['紺スーツ',1.5],['ジャージスタイル',1.5]],
      'ジムトレーナー':[['ジャージスタイル',4],['スタッフポロスタイル',4]],
      'スポーツインストラクター':[['ジャージスタイル',5],['スタッフポロスタイル',3]],
      'プロスポーツ選手':[['ジャージスタイル',5],['セットアップカジュアル',y>=2015?2:0.5]],
      '大学生':[['大学生カジュアル',5],['ストリート系',2],['きれいめカジュアル',2],['古着系',1.5]],
      '大学1年生':[['大学生カジュアル',5],['ストリート系',2],['きれいめカジュアル',2],['古着系',1.5]],
      '専門学校生':[['大学生カジュアル',5],['ストリート系',2],['きれいめカジュアル',2],['古着系',1.5]],
      '大学院生':[['大学生カジュアル',4],['きれいめカジュアル',3],['ノームコア',y>=2014?2:0]],
      '就活中の大学生':[['黒スーツ',6],['紺スーツ',2]],
      '高校卒業直後（進路準備中）':[['大学生カジュアル',5],['ストリート系',2],['アメカジ',1.5]],
      '浪人生（予備校生）':[['大学生カジュアル',5],['ノームコア',y>=2014?2:0],['ワンマイルウェア',y>=2018?1.5:0]],
      '悠々自適（定年後）':[['ノームコア',y>=2014?4:0],['ワンマイルウェア',y>=2018?3:0],['和カジュアル',2],['ブリティッシュトラッド',1.5],['社会人カジュアル',y<2014?4:0.5]],
      '僧侶':[['作務衣スタイル',6],['ノームコア',y>=2014?1:0]],
      '書道家':[['作務衣スタイル',4],['和カジュアル',3],['きれいめ私服出勤',1.5]],
      '古着屋店主':[['古着系',6],['アメカジ',2],['渋谷系',(y>=1993&&y<=2010)?1.5:0.3]],
      '美容師':[['きれいめ私服出勤',4],['オールブラック・ミニマル',y>=2015?3:1],['きれいめストリート',y>=2015?2:0.5]],
      'アパレル店員':[['きれいめ私服出勤',4],['セットアップカジュアル',y>=2015?2:0.3],['きれいめストリート',y>=2015?2:0.5],['古着系',1.5]],
      'モデル':[['オールブラック・ミニマル',y>=2015?3:1],['きれいめ私服出勤',3],['セットアップカジュアル',y>=2015?2:0.3],['Y2K',(y>=1998&&y<=2008)||y>=2020?1:0]],
      '俳優':[['きれいめ私服出勤',4],['セットアップカジュアル',y>=2015?2:0.3],['社会人カジュアル',2]],
      'お笑い芸人':[['社会人カジュアル',4],['ストリート系',2],['古着系',2],['ジャケパン',1]],
      '声優':[['社会人カジュアル',4],['オフィスカジュアル',y>=2010?3:0],['古着系',1.5]],
      'YouTuber':[['社会人カジュアル',4],['ストリート系',3],['オフィスカジュアル',y>=2010?2:0]],
      'プロゲーマー':[['チームウェアスタイル',y>=2010?4:0],['ストリート系',3],['社会人カジュアル',2]],
      '書店員':[['オフィスカジュアル',y>=2010?4:1],['ビジネスカジュアル',y>=2000?3:1],['ジャケパン',1]],
      '図書館司書':[['オフィスカジュアル',y>=2010?4:1],['ビジネスカジュアル',y>=2000?3:1],['ジャケパン',1]],
      '銭湯・サウナ店スタッフ':[['スタッフポロスタイル',4],['作務衣スタイル',3]],
      'バーテンダー':[['バーテンダースタイル',5],['白シャツ×黒パン',2]],
      '喫茶店マスター':[['バーテンダースタイル',3],['白シャツ×黒パン',3],['ブリティッシュトラッド',1.5]],
      '自動車教習所教官':[['ビジネスカジュアル',y>=2000?4:1],['ジャケパン',2],['ワークウェアスタイル',1.5]],
      '建築士':[['ジャケパン',4],['ビジネスカジュアル',y>=2000?3:1],['ワークウェアスタイル',1.5]],
      '大学研究員':[['オフィスカジュアル',y>=2010?4:1],['ビジネスカジュアル',y>=2000?3:1],['ジャケパン',2]]
    };
    return T[r] || null;
  }

  function roleWorkType(role, y, mbti){
    const r=String(role||'');
    const occT = OCC_WORK_STYLES(r, y);
    if(occT){ const lst = occT.filter(e=>e[1]>0); if(lst.length) return weighted(lst); }
    if(/銀行員|公務員|商社|コンサル|弁護士|会計士|不動産営業|アナウンサー/.test(r)) return weighted([['紺スーツ',5],['グレースーツ',3],['三つ揃いスーツ',/ENTJ|ESTJ/.test(mbti)?1.5:0.4],['黒スーツ',1]]);
    if(/営業職|企画職|経理|新聞記者|編集者/.test(r)) return weighted([['紺スーツ',3],['グレースーツ',2],['ジャケパン',y>=1985?3:0.5],['ビジネスカジュアル',y>=2000?2:0]]);
    if(/教師|教員|塾講師|教官/.test(r)) return weighted([['ジャケパン',3],['ビジネスカジュアル',y>=2000?3:0.6],['紺スーツ',2]]);
    if(/IT|Web|ゲーム開発|アプリ|動画クリエイター/.test(r)) return weighted([['オフィスカジュアル',y>=2010?6:0],['ビジネスカジュアル',y>=2000?3:0.5],['ジャケパン',1.5],['社会人カジュアル',2]]);
    if(/美容師|アパレル|古着屋/.test(r)) return 'きれいめ私服出勤';
    if(/バーテン|カフェ|飲食|ホテル|喫茶|シェフ|店長/.test(r)) return weighted([['白シャツ×黒パン',4],['ビジネスカジュアル',y>=2000?1.5:0.3],['社会人カジュアル',1.5]]);
    if(/大工|整備|電気工事|工場|配送|引越|農|漁|車夫|警備/.test(r)) return 'ワークウェアスタイル';
    if(/デザイナー|カメラマン|イラスト|映像|ミュージシャン|クリエイタ/.test(r)) return weighted([['きれいめ私服出勤',3],['オフィスカジュアル',y>=2010?2:0],['社会人カジュアル',2],['古着系',1.5]]);
    return null;
  }

  const FV_SUIT_TYPES = ['紺スーツ','黒スーツ','グレースーツ','三つ揃いスーツ'];

  const FASHION_CASUAL_TAGS = {'大学生カジュアル':/[csf]/,'私服通学風':/[cf]/,'社会人カジュアル':/o/,'ストリート系':/s/,'ジャケットスタイル':/k/,'きれいめカジュアル':/k/,'古着系':/f/,'ワークマン系機能カジュアル':/[cp]/,'セットアップカジュアル':/k/,'アメカジ':/[cf]/,'ゴープコア':/[cs]/,'ジャケパン':/k/,'ビジネスカジュアル':/k/,'オフィスカジュアル':/[kc]/,'白シャツ×黒パン':/k/,'きれいめ私服出勤':/k/,'ワークウェアスタイル':/[cp]/,'シティボーイ':/[kc]/,'ノームコア':/k/,'Y2K':/s/,'テックウェア':/[sc]/,'オールブラック・ミニマル':/k/,'フレンチカジュアル':/k/,'ブリティッシュトラッド':/k/,'サーフ系':/c/,'裏原系':/s/,'お兄系':/k/,'渋谷系':/[fk]/,'きれいめストリート':/[sk]/,'ワンマイルウェア':/c/,'和カジュアル':/[fc]/};

  function applyEraFashionLayer(res, outfitType, eraYear, opts){
    opts = opts || {};
    const y0 = Number(eraYear) || 2026;
    const age = Number(opts.age)||25, season = opts.season || '', vibe = opts.vibe || '';
    const mute = !!opts.mute; // ファッション無頓着：残存期（型落ち）を3倍で引く
    if(FV_SUIT_TYPES.includes(outfitType)){
      res.silhouette = pickEraItem(FVOCAB.suitSil, y0) || '';
      if(rand() < 0.65){ const s = pickEraItem(FVOCAB.suitShirt, y0); if(s) res.top = s; }
      if(rand() < 0.6){ const s = pickEraItem(FVOCAB.bizShoes, y0); if(s) res.shoes = s; }
      if(season === '夏'){
        if(y0 >= 2005 && rand() < 0.45){ res.jacket = '上着なし（クールビズ）'; res.tie = 'ノータイ'; }
        else { res.tie = rand() < 0.7 ? (pickEraItem(FVOCAB.suitTie, y0) || '無地ネクタイ') : 'ノータイ'; res.jacket += '（盛夏用の薄手生地）'; }
      } else {
        res.tie = rand() < 0.8 ? (pickEraItem(FVOCAB.suitTie, y0) || '無地ネクタイ') : 'ノータイ';
        if(season === '冬') res.coat = pickEraItem(FVOCAB.bizCoat, y0) || 'ステンカラーコート';
        else if(season && rand() < 0.35) res.coat = pickEraItem(FVOCAB.bizCoat, y0, /l/) || '';
      }
      return res;
    }
    const tagRe = FASHION_CASUAL_TAGS[outfitType];
    if(!tagRe){
      if(outfitType === 'スポーツ練習着' && rand() < 0.5){ const s = pickEraItem(FVOCAB.shoes, y0, /p/); if(s) res.shoes = s; }
      return res;
    }
    const y = eraRefYear(y0, age);
    const oldEra = y0 < 1992; // 現代ベース値の混入を防ぐため旧年代はほぼ全置換
    const forceAll = oldEra || outfitType==='きれいめカジュアル' || outfitType==='古着系'; // 新形式はベースが種値なので常に全置換
    if(rand() < (forceAll?1:0.75)){ const t = pickEraItem(FVOCAB.top, y, tagRe, mute) || (forceAll ? pickEraItem(FVOCAB.top, y, null, mute) : null); if(t) res.top = t; }
    if(rand() < (forceAll?1:0.75)){ const b = pickEraItem(FVOCAB.bottom, y, tagRe, mute) || (forceAll ? pickEraItem(FVOCAB.bottom, y, null, mute) : null); if(b) res.bottom = b; }
    if(rand() < (forceAll?1:0.60)){ const s = pickEraItem(FVOCAB.shoes, y, tagRe, mute) || (forceAll ? pickEraItem(FVOCAB.shoes, y, null, mute) : null); if(s) res.shoes = s; }
    // 置換されなかったベース値の年窓検証（範囲外なら強制差し替え）
    for(const [k, lst] of [['top',FVOCAB.top],['bottom',FVOCAB.bottom],['shoes',FVOCAB.shoes]]){
      if(res[k] && !fvInWindow(res[k], y0)){
        const alt = pickEraItem(lst, y, tagRe, mute) || pickEraItem(lst, y, null, mute);
        if(alt) res[k] = alt;
      }
    }
    // 上着：季節連動
    if(season === '夏'){
      res.jacket = rand() < 0.8 ? '指定なし' : (pickEraItem(FVOCAB.outer, y, /S/) || '薄手の羽織りシャツ');
    } else if(season === '冬'){
      const w = pickEraItem(FVOCAB.outer, y, tagRe.source==='k' ? /k.*W|W.*k|[ck]?.*W/ : /W/, mute);
      res.jacket = w || '防寒用の上着';
      if(/サンダル/.test(res.shoes)) res.shoes = pickEraItem(FVOCAB.shoes, y, tagRe, mute) || 'スニーカー';
    } else if(season){
      res.jacket = rand() < 0.55 ? (pickEraItem(FVOCAB.outer, y, /L/, mute) || res.jacket) : '指定なし';
    } else if(rand() < 0.7){
      const l = pickEraItem(FVOCAB.outer, y, /[LW]/, mute); if(l) res.jacket = l;
    }
    res.eraNote = eraSilhouetteNote(y);
    return res;
  }

  const BRAND_TIER_MASS = ['UNIQLO','GU','しまむら','無印良品','無地ノーブランド'];

  const BRAND_DB = [
    ['UNIQLO','tbok','ck','l',1984,2012,9999,3.0],['GU','tbok','c','l',2006,2020,9999,2.2],['無印良品','tbok','ck','l',1980,2016,9999,1.8],['しまむら','tbok','c','l',1961,2010,9999,1.4],['無地ノーブランド','tbsok','ckcfspw','l',1900,2000,9999,1.5],
    ['BEAMS','tbo','kcs','m',1976,2004,9999,2.0],['UNITED ARROWS','tbo','k','m',1989,2006,9999,1.8],['SHIPS','tbo','k','m',1975,2002,9999,1.5],['JOURNAL STANDARD','tbo','cf','m',1997,2010,9999,1.5],['URBAN RESEARCH','tbo','ck','m',1974,2012,9999,1.4],['GLOBAL WORK','tbo','c','l',1994,2014,9999,1.4],['coen','tb','c','l',2008,2016,9999,1.2],['WEGO','tbo','cs','l',1994,2016,9999,1.4],['ZARA','tbo','ck','m',1998,2018,9999,1.5],['H&M','tb','c','l',2008,2016,9999,1.3],
    ['TOMORROWLAND','tbo','k','h',1978,2008,9999,1.4],['EDIFICE','tbo','k','h',1994,2012,9999,1.4],['nano・universe','tbo','k','h',1999,2014,9999,1.3],['AURALEE','tbo','k','h',2015,2022,9999,1.3],['COMOLI','tbo','k','h',2011,2022,9999,1.2],['STUDIOUS','tbo','k','h',2008,2020,9999,1.2],['UNITED TOKYO','tbo','k','h',2015,2021,9999,1.2],['Paul Smith','tbo','k','h',1985,2005,9999,1.4],['RALPH LAUREN','tbo','kc','h',1978,1996,9999,1.8],['LACOSTE','tb','kc','h',1964,1993,9999,1.4],['BROOKS BROTHERS','tbo','k','h',1979,1995,9999,1.2],
    ["Levi's",'b','cfs','m',1971,1997,9999,2.6],['EDWIN','b','c','m',1961,1995,9999,1.8],['BIG JOHN','b','cf','m',1968,1988,9999,1.3],['Lee','b','cf','m',1978,1996,9999,1.4],['Wrangler','b','cf','m',1972,1992,9999,1.1],
    ['NIKE','tbso','spc','m',1982,2000,9999,2.8],['adidas','tbso','spc','m',1971,1998,9999,2.4],['New Balance','s','cp','m',1988,2014,9999,1.8],['PUMA','tbs','sp','m',1972,2003,9999,1.4],['ASICS','tbs','p','m',1977,1995,9999,1.5],['MIZUNO','tbsk','p','m',1906,1992,9999,1.4],['CONVERSE','s','cfs','m',1971,1996,9999,2.0],['VANS','s','s','m',1975,2002,9999,1.5],['REGAL','s','k','m',1961,1998,9999,1.8],['HARUTA','s','k','l',1953,1995,9999,1.2],['Dr.Martens','s','fs','m',1985,2019,9999,1.3],['クラークス','s','kcf','m',1968,1998,9999,1.2],
    ['STÜSSY','to','s','m',1991,2001,9999,1.8],['XLARGE','to','s','m',1992,2003,9999,1.5],['Champion','tok','csp','m',1980,1996,9999,1.6],['Carhartt','tbo','sw','m',1994,2005,9999,1.4],['Dickies','b','sw','m',1992,2004,9999,1.6],['FILA','tbs','sp','m',1994,2000,9999,1.2],['KANGOL','t','s','m',1995,2002,9999,1.0],
    ['THE NORTH FACE','tbo','cps','m',1978,2019,9999,2.0],['mont-bell','tbo','cpw','m',1975,2018,9999,1.5],['DESCENTE','tbo','pw','m',1961,1990,9999,1.2],['ワークマン','tbsok','wc','l',2018,2021,9999,2.0],['patagonia','to','cp','m',1989,2018,9999,1.3],
    ['Tabio','k','k','m',2002,2015,9999,1.6],['靴下屋','k','kc','m',1982,2012,9999,1.6],['Fukuske','k','k','l',1946,1990,9999,1.3],
    ['AOKI','tbo','k','l',1976,2005,9999,1.4],['洋服の青山','tbo','k','l',1974,2003,9999,1.5],['SUIT SELECT','tbo','k','m',2000,2015,9999,1.2],['THE SUIT COMPANY','tbo','k','m',2000,2014,9999,1.2],['ORIHICA','tbo','k','m',2003,2016,9999,1.1],['はるやま','tbo','k','l',1974,2000,9999,1.1],
    ['雲駄','s','kcf','h',2020,2023,9999,1.1],['GRAMICCI','b','cps','m',1995,2021,9999,1.3],['HOKA','s','pc','m',2016,2022,9999,1.4],['On','s','pc','m',2018,2023,9999,1.2],['SALOMON','s','sp','m',2019,2023,9999,1.4],['KEEN','s','cp','m',2005,2018,9999,1.2],['Onitsuka Tiger','s','cf','m',2002,2015,9999,1.3],['Paraboot','s','k','h',1995,2015,9999,1.1],['Danner','s','cw','m',1990,2016,9999,1.1],
    ["FREAK'S STORE",'tbo','cf','m',1986,2016,9999,1.2],['niko and...','tbo','c','l',2007,2017,9999,1.2],['GAP','tb','c','l',1995,2008,9999,1.5],['A.P.C.','tbo','k','h',1992,2012,9999,1.2],['MARGARET HOWELL','tbo','k','h',1983,2010,9999,1.1],['ROTOTO','k','ck','m',2015,2022,9999,1.2],['CHICSTOCKS','k','k','m',2016,2022,9999,1.0],
    ['李寧 Li-Ning','tbs','spc','m',1990,2008,9999,1.6],['ANTA','tbs','sp','m',1991,2015,9999,1.2],['HLA 海瀾之家','tb','kc','l',2002,2015,9999,1.4],['Metersbonwe','tb','c','l',1995,2006,2016,1.8],['Bosideng','o','c','m',1994,2010,9999,1.3],
    ['Giordano','tb','c','l',1981,1995,9999,1.6],['Hang Ten','tb','c','l',1975,1992,2010,1.5],['NET','tb','c','l',1991,2008,9999,1.3],['Baleno','tb','c','l',1996,2006,2018,1.2],
    ['GQ (Thai)','t','k','m',1968,2000,9999,1.2],['Viettien','t','k','m',1990,2010,9999,1.2],['Bench','tb','cs','l',1987,2005,9999,1.4],['Penshoppe','tb','c','l',1986,2004,9999,1.3],['Erigo','tb','cs','m',2011,2021,9999,1.0],
    ['VAN','tbo','k','m',1954,1978,1998,1.6],['McGREGOR','to','kc','m',1965,1985,2010,1.1],['Right-on','tb','c','l',1980,2005,2022,1.3],['コムサデモード','tbo','k','m',1985,1998,2018,1.5],['TAKEO KIKUCHI','tbo','k','h',1984,1999,9999,1.3]
  ];

  const BRAND_POP_W = (rec, y) => {
    const [,,,,from,peak,to,pw] = rec;
    if(y < from-1 || y > (to===9999?9999:to+5)) return 0;
    if(y < from) return 0.2;
    if(y <= peak){ const rise=(y-from)/Math.max(1,peak-from); return 0.35 + rise*(pw-0.35); }
    if(to===9999){ const decay=Math.max(0.35, pw - (y-peak)*0.035); return decay; }
    const fall=Math.max(0.15, pw*(1-(y-peak)/Math.max(1,(to-peak))));
    return fall;
  };

  const FV_PART_KEY = {top:'t', bottom:'b', shoes:'s', outer:'o', socks:'k'};

  const VIBE_BRAND_BAN = {
    '紳士系': /WEGO|GU$|しまむら|XLARGE|STÜSSY|FILA/, 'ミステリアス系': /WEGO|FILA|しまむら/,
    'ホスト系': /ワークマン|しまむら|mont-bell/, 'ギャル男系': /BROOKS BROTHERS|ワークマン/,
    'インテリ系': /WEGO|XLARGE/, 'クール系': /しまむら/
  };

  const JP_DOMESTIC = new Set(['しまむら','ワークマン','AOKI','洋服の青山','はるやま','SUIT SELECT','THE SUIT COMPANY','ORIHICA','Tabio','靴下屋','Fukuske','雲駄','WEGO','coen','niko and...','GLOBAL WORK','URBAN RESEARCH','JOURNAL STANDARD','BEAMS','UNITED ARROWS','SHIPS','TOMORROWLAND','EDIFICE','nano・universe','AURALEE','COMOLI','STUDIOUS','UNITED TOKYO',"FREAK'S STORE",'無印良品','GU','EDWIN','BIG JOHN','REGAL','HARUTA','VAN','コムサデモード','TAKEO KIKUCHI','McGREGOR','Right-on','mont-bell','DESCENTE','MIZUNO','ASICS','Onitsuka Tiger']);

  const LOCAL_NAT = {'中国':/李寧|ANTA|HLA|Metersbonwe|Bosideng/,'台湾':/Giordano|Hang Ten|NET|Baleno/,'タイ':/GQ \(Thai\)|Baleno/,'ベトナム':/Viettien/,'フィリピン':/Bench|Penshoppe/,'インドネシア':/Erigo/,'韓国':/FILA/};

  const JP_EXPANSION = {'UNIQLO':2005,'H&M':2007,'ZARA':1998};

  function resolvePartBrand(part, itemName, outfitType, persona, vibe, eraYear, sockCare){
    const y = Number(eraYear)||2026;
    const pk = FV_PART_KEY[part];
    const typeTags = ({'きれいめカジュアル':'k','ジャケットスタイル':'k','セットアップカジュアル':'k','社会人カジュアル':'kc','大学生カジュアル':'c','私服通学風':'c','ストリート系':'s','古着系':'f','スポーツ練習着':'p','ワークマン系機能カジュアル':'wc','アメカジ':'cf','ゴープコア':'cp','ジャケパン':'k','ビジネスカジュアル':'k','オフィスカジュアル':'kc','白シャツ×黒パン':'k','きれいめ私服出勤':'k','ワークウェアスタイル':'wc','シティボーイ':'kc','ノームコア':'k','Y2K':'s','テックウェア':'sc','オールブラック・ミニマル':'k','フレンチカジュアル':'k','ブリティッシュトラッド':'k','サーフ系':'c','裏原系':'s','お兄系':'k','渋谷系':'fk','きれいめストリート':'sk','ワンマイルウェア':'c','和カジュアル':'fc','ジャージスタイル':'p','チームウェアスタイル':'sp','スタッフポロスタイル':'c','エプロンスタイル':'c','作務衣スタイル':'f','バーテンダースタイル':'k'})[outfitType] || 'c';
    const nm = String(itemName||'');
    const isSneaker = /(スニーカー|シューズ|スリッポン)/.test(nm), isLeather = /(ローファー|革靴|チップ|モンク|モカシン|ブーツ)/.test(nm), isDenim = /デニム|ジーンズ/.test(nm), isSandal = /サンダル/.test(nm);
    const inc = Number((String(persona&&persona.incomeText||'').match(/約(\d+)万円/)||[])[1])||0;
    const rich = inc>=700 || /1000万|1500万/.test(String(persona&&persona.assetText||''));
    const shoesCare = persona && /靴だけは絶対に妥協しない/.test(String(persona.senseText||''));
    let cands = [];
    for(const rec of BRAND_DB){
      const [name, parts, tags, tier] = rec;
      if(!parts.includes(pk)) continue;
      if(![...typeTags].some(t=>tags.includes(t))) continue;
      let w = BRAND_POP_W(rec, y);
      if(w<=0) continue;
      // 部位アイテム適合
      if(part==='shoes'){
        if(isSneaker && !/spc|s|p/.test(tags) && !['NIKE','adidas','New Balance','PUMA','ASICS','MIZUNO','CONVERSE','VANS','無地ノーブランド','ワークマン'].includes(name)) w*=0.15;
        if(isLeather && !['REGAL','HARUTA','クラークス','Dr.Martens','無地ノーブランド'].includes(name)) w*=0.1;
        if(isSandal && !['NIKE','adidas','無地ノーブランド','mont-bell'].includes(name)) w*=0.2;
        if(/雪駄/.test(nm)){ w *= (name==='雲駄') ? 8 : (name==='無地ノーブランド') ? 3 : 0.05; }
      }
      if(part==='bottom' && isDenim){ w *= /Levi|EDWIN|BIG JOHN|Lee|Wrangler/.test(name) ? 2.5 : 0.6; }
      // tier×persona
      if(tier==='h') w *= rich ? 3.0 : 0.35;
      // 高収入でも量販は普通に混ざる（ブランド×ユニクロのMIXが現実的）
      if(part==='shoes' && shoesCare && (tier==='h'||/REGAL|Dr\.Martens|クラークス|New Balance/.test(name))) w *= 2.5;
      // 靴下こだわり
      if(part==='socks'){
        if(sockCare==='care') w *= /Tabio|靴下屋/.test(name) ? 3.5 : 0.8;
      }
      if(part==='shoes' && name==='無地ノーブランド') w *= 0.12;
      if(persona && !FV_SUIT_TYPES.includes(outfitType)){
        if(part==='shoes'){ if(persona.favShoeBrand && name===persona.favShoeBrand) w *= 8; }
        else if(part!=='socks' && persona.favBrand && name===persona.favBrand) w *= 8;
      }
      if(part==='socks'){
        if(sockCare==='mute') w *= /無地ノーブランド|しまむら|UNIQLO/.test(name) ? 3 : 0.25;
      }
      // ワークマンは現場職・機能センス・専用形式のみ（一般ファッションでは選ばれない）
      if(name==='ワークマン'){
        const wOk = outfitType==='ワークマン系機能カジュアル' || (persona && (/ワークマンで全部|機能性最優先/.test(String(persona.senseText||'')) || /現場|職人|整備|工場|大工|鳶|建設|農|漁|車夫|警備|運送|ドライバー/.test(String(persona.role||''))));
        w *= wOk ? 1.5 : 0.03;
      }
      // 国籍×地域可用性
      const nat = persona && persona.nat, resJP = persona && /日本|東京|大阪|首都圏/.test(String(persona.res||''));
      if(nat && nat!=='日本' && !resJP){
        if(JP_DOMESTIC.has(name)) continue;
        if(JP_EXPANSION[name] && y < JP_EXPANSION[name]) continue;
        const lre = LOCAL_NAT[nat]; if(lre && lre.test(name)) w *= 2.5;
      } else {
        if(LOCAL_NAT['中国'] && /李寧|ANTA|HLA|Metersbonwe|Bosideng|Giordano|Hang Ten|^NET$|Baleno|GQ \(Thai\)|Viettien|Bench|Penshoppe|Erigo/.test(name)) w *= 0.05;
      }
      // vibe禁止
      const ban = VIBE_BRAND_BAN[vibe];
      if(ban && ban.test(name)) continue;
      cands.push([name, w]);
    }
    if(!cands.length) return '無地ノーブランド';
    return weighted(cands);
  }

  const summerOnlyRe = /サンダル|タンクトップ|ショートパンツ|ハーフパンツ|リネン|甚平|クールビズ|雪駄/;

  const winterOnlyRe = /ダウン|ドカジャン|ムートン|ボア|フリースジャケット|ダッフル|ピーコート|チェスター|ムスタン|中綿|コーデュロイ|ウール|ニット帽/;

  function seasonItemOk(name, season){
    const nm=String(name||'');
    if(season==='冬' && summerOnlyRe.test(nm)) return false;
    if(season==='夏' && winterOnlyRe.test(nm)) return false;
    return true;
  }

  function formalityOf(name){
    const nm=String(name||'');
    if(/タンクトップ|ショートパンツ|ハーフパンツ|サンダル|ジャージ|ジョガー|練習着|スポサン|甚平|ミュール/.test(nm)) return 1;
    if(/Tシャツ|スウェット|パーカー|フーディ|マウンテンパーカー|アノラック|ナイロン/.test(nm)) return 2;
    if(/スーツ|スラックス|革靴|ローファー|チップ|モンク|テーラード|チェスター|ステンカラー|セットアップ|ワイシャツ|ドレスシャツ|トレンチ/.test(nm)) return 4;
    if(/シャツ|チノ|ポロ|カーディガン|ニット|セーター|ブルゾン|コーチ|デッキ|クラークス|レザースニーカー|ローゲージ/.test(nm)) return 3;
    if(/デニム|スニーカー|カットソー|ネル|ラガー|カーゴ|ワイド/.test(nm)) return 2;
    return 2.5;
  }

  function enforceOutfitCoherence(res, outfitType, eraYear, season, tagRe){
    if(FV_SUIT_TYPES.includes(outfitType)) return res;
    const y=Number(eraYear)||2026;
    // 季節違反の差し替え（最大3回）
    for(const part of ['top','bottom','shoes']){
      for(let i=0;i<3 && !seasonItemOk(res[part], season); i++){
        const pool = part==='top'?FVOCAB.top:part==='bottom'?FVOCAB.bottom:FVOCAB.shoes;
        const alt = pickEraItem(pool, y, tagRe);
        if(alt && seasonItemOk(alt, season)) res[part]=alt;
      }
    }
    if(res.jacket && res.jacket!=='指定なし' && !seasonItemOk(res.jacket, season)){
      res.jacket = season==='夏' ? '指定なし' : (pickEraItem(FVOCAB.outer, y, season==='冬'?/W/:/L/) || res.jacket);
    }
    // フォーマル度の断層（差>2）を靴→ボトムス→トップスの順に再抽選で解消
    const gapOk = () => { const fT=formalityOf(res.top), fB=formalityOf(res.bottom), fS=formalityOf(res.shoes); return Math.abs(fS-fB)<=2 && Math.abs(fS-fT)<=2 && Math.abs(fT-fB)<=2; };
    for(let i=0;i<3 && !gapOk(); i++){ const alt=pickEraItem(FVOCAB.shoes, y, tagRe); if(alt && seasonItemOk(alt, season)) res.shoes=alt; }
    for(let i=0;i<3 && !gapOk(); i++){ const alt=pickEraItem(FVOCAB.bottom, y, tagRe); if(alt && seasonItemOk(alt, season)) res.bottom=alt; }
    for(let i=0;i<3 && !gapOk(); i++){ const alt=pickEraItem(FVOCAB.top, y, tagRe); if(alt && seasonItemOk(alt, season)) res.top=alt; }
    // 靴×靴下
    const sn=String(res.shoes||'');
    if(/サンダル/.test(sn)){ res.sockType = weighted([['スニーカーソックス',3],['インビジブルソックス',2],['素足履き',2]]); res.sockUse = res.sockUse||'新品に近い'; }
    else if(/ブーツ/.test(sn) && /インビジブル|スニーカーソックス/.test(String(res.sockType||''))) res.sockType='クルー丈ソックス';
    else if(/(革靴|ローファー|チップ|モンク)/.test(sn) && /スニーカーソックス|インビジブル/.test(String(res.sockType||'')) && rand()<0.7) res.sockType='ビジネスソックス';
    return res;
  }

  function sockCareOf(persona){
    const s=String(persona&&persona.senseText||'');
    if(/靴下|アイロン|毛玉|靴だけは|几帳面|クローゼットは色順/.test(s)) return 'care';
    if(/量販店で3着|サイズ表記だけ|穴が開くまで|色違いを5枚|興味なし/.test(s)) return 'mute';
    return 'normal';
  }

  function assignPartBrands(res, outfitType, profile, eraYear, vibe, persona){
    if(res && res.lockParts){ return res; } // V4.6.1: 新ワークスタイルは固定セット（部位ブランド上書きなし）
    if(FV_SUIT_TYPES.includes(outfitType)){
      // スーツ＝上下同一ブランド（セットアップ）
      const suitBrand = res.outfitBrand || pick(profile.formal);
      res.outfitBrand = suitBrand;
      res.topBrand = pick(profile.formal); // シャツは別解決
      res.bottomBrand = suitBrand;
      res.shoesBrand = resolvePartBrand('shoes', res.shoes, 'きれいめカジュアル', persona, vibe, eraYear, 'normal');
      res.outerBrand = res.coat ? suitBrand : '';
      return res;
    }
    const pinnedMass = persona && (/量販店で3着|色違いを5枚|サイズ表記だけ|穴が開くまで/.test(String(persona.senseText||'')) || /ほぼゼロ|一桁万円|返済/.test(String(persona.assetText||'')) || /借金/.test(String(persona.gambleText||'')));
    const sockCare = sockCareOf(persona);
    if(pinnedMass){
      const mass = eraBrandList(BRAND_TIER_MASS, eraYear, '無地ノーブランド');
      res.outfitBrand = '';
      res.topBrand = pick(mass); res.bottomBrand = pick(mass);
      res.shoesBrand = pick(eraBrandList(['無地ノーブランド','UNIQLO','しまむら'], eraYear, '無地ノーブランド'));
      res.outerBrand = (res.jacket && res.jacket !== '指定なし' && res.jacket !== 'なし') ? pick(mass) : '';
      res.sockBrand = pick(['無地ノーブランド','しまむら']);
      res.sockCare = 'mute';
      return res;
    }
    res.outfitBrand = ''; // 形式行からブランドを撤去（部位別解決に一本化）
    res.topBrand = resolvePartBrand('top', res.top, outfitType, persona, vibe, eraYear, sockCare);
    res.bottomBrand = resolvePartBrand('bottom', res.bottom, outfitType, persona, vibe, eraYear, sockCare);
    // セット買い15%（上下同ブランドが自然なブランドのみ）
    if(rand()<0.15){ const rec=BRAND_DB.find(r=>r[0]===res.topBrand); if(rec && rec[1].includes('b')) res.bottomBrand = res.topBrand; }
    res.shoesBrand = resolvePartBrand('shoes', res.shoes, outfitType, persona, vibe, eraYear, sockCare);
    res.outerBrand = (res.jacket && res.jacket !== '指定なし' && res.jacket !== 'なし') ? resolvePartBrand('outer', res.jacket, outfitType, persona, vibe, eraYear, sockCare) : '';
    if(res.sockBrand !== undefined || true){
      res.sockBrand = resolvePartBrand('socks', res.sockType, outfitType, persona, vibe, eraYear, sockCare);
      if(sockCare==='care'){ res.sockUse = weighted([['新品に近い',3],['自然な使用感',4],['清潔だが生活感あり',3],['少し履き込まれている',1]]); }
      if(sockCare==='mute'){ res.sockBrand = pick(['無地ノーブランド','しまむら']); }
    }
    res.sockCare = sockCare;
    return res;
  }

  const FV_COLORS = [['白',5],['黒',5],['グレー',4],['チャコール',2],['ネイビー',4],['ベージュ',3],['カーキ',2.5],['ブラウン',2],['オリーブ',2],['ボルドー',1.2],['ライトブルー',2],['生成り',1.5],['ダークグリーン',1.5],['マスタード',0.8]];

  const FV_COLORS_ERA = [['くすみブルー',2019,2026,1.8],['くすみピンク',2019,2026,0.8],['ネオンイエロー差し色',1988,1997,0.6],['ペールトーン',2016,2026,1.2]];

  function chooseItemColor(itemName, eraYear, persona){
    const nm = String(itemName||'');
    if(!nm || nm==='指定なし' || /白|黒|紺|グレー|ベージュ|カーキ|迷彩|柄|チェック|ボーダー|デニム|色/.test(nm)) return '';
    const y = Number(eraYear)||2026;
    if(persona && /黒しか着ない|モノトーン/.test(String(persona.senseText||''))) return weighted([['黒',6],['グレー',2],['白',2]]);
    if(persona && persona.scheme){
      const base = String(persona.baseColor||'');
      if(/ワントーン/.test(persona.scheme)){
        const fam = {'黒':[['黒',6],['チャコール',2],['グレー',2]],'ネイビー':[['ネイビー',6],['グレー',1.5],['チャコール',1]],'グレー':[['グレー',6],['チャコール',2],['白',1.5]],'白ベース':[['白',6],['生成り',2],['ベージュ',1.5]],'ベージュ・アースカラー':[['ベージュ',5],['カーキ',2],['ブラウン',2]],'カーキ':[['カーキ',6],['オリーブ',2],['ベージュ',1.5]],'ブラウン':[['ブラウン',5],['ベージュ',2],['カーキ',1.5]]}[base];
        if(fam) return weighted(fam);
      }
      if(/差し色/.test(persona.scheme) && rand()<0.6){
        const solid = {'白ベース':'白','ベージュ・アースカラー':'ベージュ'}[base] || base;
        if(solid && FV_COLORS.some(x=>x[0]===solid)) return solid;
      }
    }
    let list = FV_COLORS.slice();
    for(const [c0,f,t,w] of FV_COLORS_ERA) if(y>=f && y<=t) list.push([c0,w]);
    return rand()<0.75 ? weighted(list) : '';
  }

  function chooseShoeColor(shoeName, eraYear, persona){
    const nm=String(shoeName||''); const y=Number(eraYear)||2026;
    if(!nm || /白|黒|赤茶|色/.test(nm)) return '';
    if(persona && /黒しか着ない|オールブラック/.test(String(persona.senseText||''))) return '黒';
    if(/(革靴|ローファー|チップ|モンク|モカシン)/.test(nm)) return weighted([['黒',5],['ダークブラウン',3],['バーガンディ',1]]);
    if(/ブーツ/.test(nm)) return weighted([['黒',3],['赤茶',3],['ダークブラウン',2]]);
    if(/雪駄/.test(nm)) return weighted([['黒鼻緒',3],['紺鼻緒',2],['生成り',1]]);
    if(/サンダル/.test(nm)) return weighted([['黒',4],['ベージュ',2],['グレー',1.5]]);
    if(/(スニーカー|シューズ|スリッポン)/.test(nm)){
      const l=[['白',4],['黒',4],['グレー',2.5],['ネイビー',2],['赤の差し色',0.8],['グリーンの差し色',0.6]];
      if(y>=2018) l.push(['白の厚底ダッド系',1.2]);
      if(y>=1996 && y<=2004) l.push(['シルバーのハイテク系',1.2]);
      return weighted(l);
    }
    return rand()<0.5 ? weighted([['黒',3],['白',2],['グレー',2]]) : '';
  }

  function assignPartColors(res, outfitType, eraYear, season, persona){
    if(res && res.lockParts){ res.shoesColor = res.shoesColor || ''; return res; } // V4.6.1: 色は品目文に内包
    if(FV_SUIT_TYPES.includes(outfitType)){ res.shoesColor = chooseShoeColor(res.shoes, eraYear, persona); return res; }
    res.shoesColor = chooseShoeColor(res.shoes, eraYear, persona);
    res.topColor = chooseItemColor(res.top, eraYear, persona);
    res.bottomColor = chooseItemColor(res.bottom, eraYear, persona);
    res.outerColor = (res.jacket && res.jacket!=='指定なし') ? chooseItemColor(res.jacket, eraYear, persona) : '';
    return res;
  }

  const ACC_NO_PIERCE = ['公務員','銀行員','自衛官','警察官','教員','消防士','裁判官','検察官'];

  const ACC_HI_PIERCE = ['美容師','アパレル店員','古着屋店主','バンドマン','ホスト','ミュージシャン','ダンサー','ネイリスト'];

  const ACC_WORK_OFF = ['看護師','医師','調理師','料理人','パン職人','寿司職人','工場勤務','整備士','歯科医師','薬剤師','介護士'];

  function generateAccessories(c, holiday){
    const y = Number(c.eraYear)||2026, age = Number(c.age)||25;
    const role = String(c.role||''), vibe = String(c.vibe||'');
    const type = holiday ? (c.holidayOutfitType||'') : (c.outfitType||'');
    const isSuit = FV_SUIT_TYPES.includes(type);
    const list = [];
    // 時計
    if(age>=25 && rand()<0.55){
      const inc = Number((String(c.incomeText||'').match(/約(\d+)万円/)||[])[1])||0;
      if(inc>=700 && rand()<0.5) list.push('機械式の高級腕時計');
      else if(y>=2016 && /IT|エンジニア|Web|プログラ/.test(role) && rand()<0.6) list.push('スマートウォッチ');
      else if(/現場|職人|整備|工場|大工|鳶|農|漁|建設|自衛官|消防/.test(role)) list.push('タフネス系デジタル腕時計');
      else if(/営業|銀行|商社|コンサル|公務員/.test(role)||isSuit) list.push('ビジネス腕時計');
      else list.push(pick(['シンプルな腕時計','革ベルトの腕時計']));
    }
    // ネックレス（スーツ平日は除外）
    if(!(isSuit && !holiday)){
      if(['ストリート系','ホスト系','ギャル男系','やりらふぃー系','ヤンキー系'].includes(vibe) && rand()<0.45) list.push(pick(['シルバーチェーンネックレス','喜平ネックレス']));
      else if(vibe==='韓国風' && rand()<0.35) list.push('華奢なシルバーネックレス');
      else if(rand()<0.08) list.push('シンプルなネックレス');
    }
    // ピアス（1995年以降）
    if(y>=1995 && !ACC_NO_PIERCE.some(r=>role.includes(r))){
      const p = ACC_HI_PIERCE.some(r=>role.includes(r)) ? 0.5 : (['ストリート系','ギャル男系','ホスト系','バンドマン系','やりらふぃー系'].includes(vibe)?0.35:0.08);
      if(rand()<p) list.push(pick(['片耳のシルバーピアス','両耳の小ぶりなピアス']));
    }
    // 夏小物
    if(c.season==='夏' && holiday){
      const sporty = (c.sportsHistory||[]).length>0;
      if(sporty && age<=25 && rand()<0.3) list.push('ミサンガ');
      else if(/サンダル|ショートパンツ/.test((c.holidayShoes||'')+(c.holidayBottom||'')) && rand()<0.18) list.push('アンクレット');
    }
    return list;
  }

  function accWorkNote(c){ return ACC_WORK_OFF.some(r=>String(c.role||'').includes(r)) ? '（勤務中は外す）' : ''; }

  function syncMarriageRing(c){
    if(!c) return;
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const strip = a => (a||[]).filter(x=>!/結婚指輪/.test(x));
    c.accessories = strip(c.accessories); c.holidayAccessories = strip(c.holidayAccessories);
    if(married && rand()<0.92){ (c.accessories=c.accessories||[]).push('左薬指に結婚指輪'); (c.holidayAccessories=c.holidayAccessories||[]).push('左薬指に結婚指輪'); }
  }

  function accText(c, holiday, english){
    const l = (holiday?c.holidayAccessories:c.accessories)||[];
    const note = !holiday ? accWorkNote(c) : '';
    if(english) return ` Accessories: ${l.length?l.join(', '):'none'}${note?' (removed while on duty)':''}.`;
    return `アクセサリーは${l.length?l.join('・'):'なし'}${note}。`;
  }

  function applyCoordToCharacter(c, holiday){
    const persona = { senseText: c.fashionSenseText, incomeText: c.incomeText, assetText: c.assetText, gambleText: c.gambleText, role: c.role, nat: c.nationality, res: c.residenceText, favBrand: c.favBrandText, favShoeBrand: c.favShoeBrandText, baseColor: c.baseColorText, scheme: c.colorSchemeText, sockCycle: c.sockCycleText, sockDrawer: c.sockDrawerText, sockPair: c.sockPairText, sizeFeel: c.sizeFeelText };
    const co = generateCoordinatedOutfit(holiday?(c.holidayOutfitType||c.outfitType):c.outfitType, c.age, false, c.nationality, c.vibe, c.eraYear, c.season, c.mbti, persona);
    if(holiday){
      c.holidayOutfitBrand=co.outfitBrand; c.holidayJacket=co.jacket; c.holidayTop=co.top; c.holidayBottom=co.bottom; c.holidayShoes=co.shoes;
      c.holidaySockBrand=co.sockBrand; c.holidaySockType=co.sockType; c.holidaySockColor=co.sockColor; c.holidaySockUse=co.sockUse;
      c.holidayTopBrand=co.topBrand||''; c.holidayBottomBrand=co.bottomBrand||''; c.holidayShoesBrand=co.shoesBrand||''; c.holidayOuterBrand=co.outerBrand||'';
      c.holidayEraFashionNote=co.eraNote||''; c.holidayStyleNote=co.styleNote||c.holidayStyleNote||'';
      c.holidayTopColor=co.topColor||''; c.holidayBottomColor=co.bottomColor||''; c.holidayOuterColor=co.outerColor||''; c.holidayShoesColor=co.shoesColor||'';
    } else {
      c.outfitBrand=co.outfitBrand; c.jacket=co.jacket; c.top=co.top; c.bottom=co.bottom; c.shoes=co.shoes;
      c.sockBrand=co.sockBrand; c.sockType=co.sockType; c.sockShape=co.sockShape; c.sockMaterial=co.sockMaterial; c.sockColor=co.sockColor; c.sockUse=co.sockUse;
      c.topBrand=co.topBrand||''; c.bottomBrand=co.bottomBrand||''; c.shoesBrand=co.shoesBrand||''; c.outerBrand=co.outerBrand||'';
      c.shoesColor=co.shoesColor||''; c.topColor=co.topColor||''; c.bottomColor=co.bottomColor||''; c.outerColor=co.outerColor||''; c.tie=co.tie||''; c.coat=co.coat||''; c.suitSilhouette=co.silhouette||''; c.eraFashionNote=co.eraNote||''; c.styleNote=co.styleNote||c.styleNote||'';
    }
  }

  function generateCoordinatedOutfit(outfitType, age, rareMode, nationality='', vibe='ランダム', eraYear='2026', season='', mbti='', persona=null){
    const baseFormalBrands = ['AOKI','ORIHICA','SUIT SELECT','THE SUIT COMPANY','P.S.FA','UNITED ARROWS','SHIPS','nano・universe','KONAKA','五大陸','UNITED TOKYO'];
    const baseCasualBrands = ['UNIQLO','GU','無印良品','BEAMS','UNITED ARROWS','SHIPS','GLOBAL WORK','nano・universe','URBAN RESEARCH','JOURNAL STANDARD','ZARA','H&M','Calvin Klein','POLO RALPH LAUREN','TOMMY HILFIGER','LACOSTE','Champion','THE NORTH FACE','WEGO','niko and...','coen',"FREAK'S STORE",'green label relaxing','RAGEBLUE','HARE',"Lui's",'SENSE OF PLACE','BEAUTY&YOUTH','UNITED TOKYO','COMOLI','AURALEE','mont-bell','Patagonia','GRAMICCI','EDWIN',"Levi's",'BIG JOHN'];
    const baseSportsBrands = ['NIKE','adidas','MIZUNO','ASICS','PUMA','New Balance','UNDER ARMOUR','Champion','DESCENTE','le coq sportif'];
    const schoolBlazerBrands = ['KANKO','TOMBOW','EAST BOY','OLIVE des OLIVE School','学生服メーカー指定なし'];
    const schoolGakuranBrands = ['KANKO','TOMBOW','学生服メーカー指定なし'];
    const profile = {
      formal:[...baseFormalBrands], casual:[...baseCasualBrands], sports:[...baseSportsBrands], street:['NIKE','adidas','Calvin Klein','TOMMY HILFIGER','ZARA','H&M','BEAMS','GU','NEIGHBORHOOD','WTAPS','visvim','nonnative','Supreme','X-LARGE','FR2','HUMAN MADE','Carhartt WIP','WEGO','STUDIOUS','kolor','sacai','N.HOOLYWOOD','White Mountaineering'],
      preppy:['BEAMS','UNITED ARROWS','SHIPS','POLO RALPH LAUREN','LACOSTE','UNIQLO','BEAUTY&YOUTH','green label relaxing'], socksBusiness:['Tabio','靴下屋','Fukuske','POLO RALPH LAUREN','Calvin Klein','無地ノーブランド'], socksCasual:['UNIQLO','無印良品','Tabio','靴下屋','POLO RALPH LAUREN','Calvin Klein','無地ノーブランド']
    };
    if(nationality==='日本'){
      profile.formal = ['AOKI','ORIHICA','SUIT SELECT','P.S.FA','UNITED ARROWS','SHIPS','nano・universe','KONAKA','五大陸','UNITED TOKYO'];
      profile.casual = ['UNIQLO','GU','無印良品','BEAMS','URBAN RESEARCH','JOURNAL STANDARD','GLOBAL WORK','nano・universe','SHIPS','WEGO','niko and...','coen',"FREAK'S STORE",'green label relaxing','RAGEBLUE','HARE',"Lui's",'SENSE OF PLACE','BEAUTY&YOUTH','UNITED TOKYO','COMOLI','AURALEE','mont-bell','GRAMICCI','EDWIN',"Levi's",'BIG JOHN'];
      profile.street = ['NIKE','adidas','GU','BEAMS','Calvin Klein','TOMMY HILFIGER','NEIGHBORHOOD','WTAPS','visvim','nonnative','Supreme','X-LARGE','FR2','HUMAN MADE','Carhartt WIP','WEGO','STUDIOUS','sacai','N.HOOLYWOOD'];
    } else if(nationality==='韓国'){
      profile.formal = ['MUSINSA STANDARD','8seconds','SPAO','ANDERSSON BELL','ZARA','UNIQLO'];
      profile.casual = ['MUSINSA STANDARD','8seconds','SPAO','TOPTEN','Covernat','ZARA','H&M','Calvin Klein','TOMMY HILFIGER'];
      profile.street = ['MUSINSA STANDARD','thisisneverthat','Covernat','ADER error','Calvin Klein','adidas','NIKE','ZARA'];
      profile.preppy = ['8seconds','SPAO','Calvin Klein','LACOSTE','ZARA'];
    } else if(nationality==='中国' || nationality==='台湾'){
      profile.formal = ['UNIQLO','MUJI','ZARA','GXG','SELECTED','HLA'];
      profile.casual = ['UNIQLO','MUJI','ZARA','H&M','Calvin Klein','TOMMY HILFIGER','HLA','Semir','Bosideng'];
      profile.street = ['adidas','NIKE','ZARA','H&M','Calvin Klein','李寧','ANTA'];
    } else if(nationality==='ロシア'){
      const soviet = Number(eraYear) <= 1991;
      profile.formal = soviet ? ['既製の実用衣料'] : ["O'STIN",'Gloria Jeans','ZARA','H&M'];
      profile.casual = soviet ? ['既製の実用衣料'] : ["O'STIN",'Gloria Jeans','Sela','ZARA','H&M','adidas'];
      profile.street = soviet ? ['既製の実用衣料'] : ['adidas','NIKE',"O'STIN",'Gloria Jeans'];
    } else if(nationality==='アメリカ'){
      profile.formal = ['POLO RALPH LAUREN','Calvin Klein','TOM FORD','BROOKS BROTHERS','ZARA','H&M'];
      profile.casual = ['Gap','Old Navy','Carhartt','L.L.Bean','POLO RALPH LAUREN','Calvin Klein','TOMMY HILFIGER','LACOSTE','THE NORTH FACE'];
      profile.street = ['NIKE','adidas','Carhartt','Dickies','Calvin Klein','Champion','THE NORTH FACE'];
      profile.preppy = ['POLO RALPH LAUREN','LACOSTE','BROOKS BROTHERS','L.L.Bean','TOMMY HILFIGER'];
    } else if(nationality==='イギリス'){
      profile.formal = ['Marks & Spencer','Next','TOM FORD','ZARA','H&M'];
      profile.casual = ['Marks & Spencer','Next','Barbour','Fred Perry','Ben Sherman','LACOSTE','H&M'];
      profile.street = ['Fred Perry','Ben Sherman','adidas','NIKE','Champion'];
      profile.preppy = ['Fred Perry','Barbour','Marks & Spencer','LACOSTE'];
    } else if(nationality==='フランス'){
      profile.formal = ['A.P.C.','agnès b.','ZARA','H&M','Calvin Klein'];
      profile.casual = ['A.P.C.','agnès b.','SAINT JAMES','LACOSTE','ZARA','H&M'];
      profile.street = ['A.P.C.','NIKE','adidas','LACOSTE'];
      profile.preppy = ['SAINT JAMES','LACOSTE','agnès b.'];
    } else if(nationality==='ドイツ'){
      profile.formal = ['Hugo Boss','s.Oliver','ZARA','H&M'];
      profile.casual = ['s.Oliver','Jack Wolfskin','Hugo Boss','ZARA','H&M','adidas'];
      profile.street = ['adidas','PUMA','Jack Wolfskin','NIKE'];
    } else if(nationality==='イタリア'){
      profile.formal = ['Hugo Boss','Diesel','ZARA','Benetton'];
      profile.casual = ['Diesel','Benetton','Fila','Stone Island','ZARA','H&M'];
      profile.street = ['Diesel','Stone Island','Fila','NIKE','adidas'];
    } else if(nationality==='スペイン' || nationality==='アルゼンチン'){
      profile.formal = ['Massimo Dutti','ZARA','Mango','H&M'];
      profile.casual = ['ZARA','Massimo Dutti','Pull&Bear','Mango','Desigual','H&M'];
      profile.street = ['Pull&Bear','ZARA','NIKE','adidas'];
    } else if(['ブラジル','メキシコ'].includes(nationality)){
      profile.casual = nationality==='ブラジル' ? ['Hering','Osklen','Havaianas','NIKE','adidas','ZARA','H&M'] : ['NIKE','adidas','PUMA','ZARA','H&M','Calvin Klein','TOMMY HILFIGER'];
      profile.sports = ['NIKE','adidas','PUMA','New Balance','UNDER ARMOUR'];
      profile.street = ['NIKE','adidas','PUMA','Calvin Klein','ZARA'];
    } else if(['タイ','ベトナム'].includes(nationality)){
      profile.casual = ['UNIQLO','MUJI','ZARA','H&M','Calvin Klein','TOMMY HILFIGER'];
      profile.street = ['NIKE','adidas','ZARA','H&M','Calvin Klein'];
    }
    if(vibe==='韓国風'){ profile.casual = ['MUSINSA STANDARD','8seconds','SPAO','Calvin Klein','ZARA','ANDERSSON BELL']; profile.preppy = ['8seconds','SPAO','Calvin Klein','LACOSTE']; }
    if(vibe==='やりらふぃー系' || vibe==='ストリート系'){ profile.street = ['NIKE','adidas','Calvin Klein','TOMMY HILFIGER','GU','ZARA','H&M']; }
    if(vibe==='真面目系' || vibe==='大人っぽい系'){ profile.formal = [...new Set(profile.formal.concat(['AOKI','ORIHICA','SUIT SELECT','BROOKS BROTHERS']))]; }
    const eraY = Number(eraYear) || 2026;
    if(!nationality || nationality==='日本'){
      if(eraY < 1990){
        profile.preppy = [...new Set(profile.preppy.concat(['VAN','JUN','MEN\'S BIGI','TAKEO KIKUCHI']))];
        profile.casual = [...new Set(profile.casual.concat(['VAN','JUN','MEN\'S BIGI','COMME des GARÇONS HOMME']))];
        profile.formal = [...new Set(profile.formal.concat(['D\'URBAN','洋服の青山','はるやま']))];
      } else if(eraY < 2005){
        profile.street = [...new Set(profile.street.concat(['A BATHING APE','UNDERCOVER','Stüssy']))];
        profile.casual = [...new Set(profile.casual.concat(['GAP','TAKEO KIKUCHI']))];
      } else if(eraY < 2015){
        profile.casual = [...new Set(profile.casual.concat(['GAP']))];
        profile.street = [...new Set(profile.street.concat(['Stüssy']))];
      }
    }
    Object.keys(profile).forEach(k=>{ profile[k] = eraBrandList(profile[k], eraYear, '無地ノーブランド'); });
    const blazerBrandsEra = eraBrandList(schoolBlazerBrands, eraYear, '学生服メーカー指定なし');
    const gakuranBrandsEra = eraBrandList(schoolGakuranBrands, eraYear, '学生服メーカー指定なし');
    const res = { outfitBrand:'無地ノーブランド', jacket:'指定なし', top:'白シャツ', bottom:'黒スラックス', shoes:'黒革靴', sockBrand:'Tabio', sockType:'ビジネスソックス', sockShape:'クルー丈', sockMaterial:'綿＋ナイロン', sockColor:'黒', sockUse:'新品に近い' };

    // ===== V4.6.1 B2: 新ワークスタイル7種（エプロン/ジャージ/スタッフポロ/作務衣/バーテンダー/チームウェア/ワークウェア） =====
    const roleForStyle = String((persona && persona.role) || '');
    if(outfitType==='エプロンスタイル'){
      res.lockParts = true; res.outfitBrand = pick(['UNIQLO','無印良品','GLOBAL WORK','無地ノーブランド']);
      const apron = /保育士/.test(roleForStyle) ? weighted([['淡いブルーの胸当てエプロン（キャラクター柄なし）',3],['淡いグリーンの胸当てエプロン',2]])
                  : /花屋/.test(roleForStyle) ? weighted([['防水のダークグリーンのギャルソンエプロン',4],['デニム地の胸当てエプロン',2]])
                  : '無地の胸当てエプロン';
      res.top = weighted([['ポロシャツ',4],['無地Tシャツ',3],['長袖カットソー',2]]) + '＋' + apron;
      res.bottom = weighted([['チノパン',4],['ストレッチパンツ',2],['デニム',2]]);
      res.shoes = weighted([['白スニーカー',3],['黒スニーカー',3],['スリッポン',2]]);
      if(season==='冬') res.jacket = 'フリースジャケット（エプロンの下に着用）'; else res.jacket = '指定なし';
      res.sockBrand = pick(profile.socksCasual); res.sockType='無地のクルー丈ソックス'; res.sockShape='標準的な中厚'; res.sockMaterial='綿混'; res.sockColor=weighted([['白',3],['黒',3],['グレー',2]]);
    } else if(outfitType==='ジャージスタイル'){
      res.lockParts = true; res.outfitBrand = pick(profile.sports || ['NIKE','adidas','MIZUNO','ASICS']);
      if(season==='夏'){ res.top = weighted([['ドライメッシュTシャツ',5],['ドライポロシャツ',2]]); res.bottom = weighted([['ハーフパンツ（ジャージ地）',4],['ジャージパンツ',2]]); }
      else { res.top = weighted([['セットアップジャージの上（ハーフジップ）',4],['ドライTシャツ＋ジャージの上',3]]); res.bottom = weighted([['ジャージパンツ（サイドライン入り）',4],['ジョガーパンツ',2]]); }
      res.shoes = weighted([['トレーニングシューズ',5],['ランニングシューズ',2]]);
      res.jacket = season==='冬' ? '中綿入りのベンチコート' : '指定なし';
      res.sockBrand = pick(['NIKE','adidas','MIZUNO','ASICS','無地ノーブランド']); res.sockType='白のスポーツソックス'; res.sockShape='先丸・スポーツ形状'; res.sockMaterial='吸汗速乾の機能繊維混（つま先・かかと補強）'; res.sockColor='白';
    } else if(outfitType==='スタッフポロスタイル'){
      res.lockParts = true; res.outfitBrand = pick(['UNIQLO','無地ノーブランド','GLOBAL WORK']);
      res.top = weighted([['無地ポロシャツ（胸にワンポイント刺繍・実在ロゴは避ける）',5],['ドライポロシャツ',2]]);
      res.bottom = weighted([['ストレッチパンツ',3],['チノパン',3]]);
      res.shoes = weighted([['黒スニーカー',4],['白スニーカー',2]]);
      res.jacket = season==='冬' ? 'フリースブルゾン' : '指定なし';
      res.sockBrand = pick(profile.socksCasual); res.sockType='無地のクルー丈ソックス'; res.sockShape='標準的な中厚'; res.sockMaterial='綿混'; res.sockColor='黒';
    } else if(outfitType==='作務衣スタイル'){
      res.lockParts = true; res.outfitBrand = pick(['無印良品','和装専門店の既製品','無地ノーブランド']);
      const smCol = weighted([['紺',4],['墨黒',3],['生成り',2]]);
      res.top = `${smCol}の作務衣の上衣（綿）` + (season==='冬' ? '（中に長袖Tシャツ）' : '');
      res.bottom = `${smCol}の作務衣のパンツ`;
      res.shoes = weighted([['雪駄',3],['サンダル',2],['足袋型シューズ',1]]);
      res.jacket = season==='冬' ? '綿入れ半纏' : '指定なし';
      res.sockBrand = '無地ノーブランド'; res.sockType = weighted([['足袋型ソックス',3],['無地のクルー丈ソックス',2]]); res.sockShape = res.sockType==='足袋型ソックス' ? '親指だけが分かれた2本指構造' : '標準的な中厚'; res.sockMaterial='綿混'; res.sockColor='白';
    } else if(outfitType==='バーテンダースタイル'){
      res.lockParts = true; res.outfitBrand = pick(profile.formal);
      res.top = '白の長袖シャツ＋黒のベスト';
      res.tie = weighted([['黒の蝶タイ',4],['黒のナロータイ',3],['ノータイ（第一ボタンまで留める）',1.5]]);
      res.bottom = '黒スラックス＋黒のギャルソンエプロン（腰巻き）';
      res.shoes = '黒革靴（磨き上げたプレーントゥ）';
      res.jacket = '指定なし';
      res.sockBrand = pick(profile.socksBusiness); res.sockType='ビジネスソックス'; res.sockShape='薄手ビジネス形状'; res.sockMaterial='綿＋ナイロン'; res.sockColor='黒';
    } else if(outfitType==='チームウェアスタイル'){
      res.lockParts = true; res.outfitBrand = pick(['NIKE','adidas','PUMA','無地ノーブランド']);
      res.top = weighted([['チームパーカー（架空チーム「ASHIKUSA FALCONS」のロゴ。実在チームのロゴは再現しない）',4],['チームユニフォームシャツ（架空チーム「ASHIKUSA FALCONS」。実在チームのロゴは再現しない）',2]]);
      res.bottom = weighted([['ジョガーパンツ',4],['黒のスキニーパンツ',2]]);
      res.shoes = weighted([['ハイテクスニーカー',4],['白スニーカー',2]]);
      res.jacket = season==='冬' ? 'コーチジャケット' : '指定なし';
      res.sockBrand = pick(['NIKE','adidas','無地ノーブランド']); res.sockType='白のスポーツソックス'; res.sockShape='先丸・スポーツ形状'; res.sockMaterial='綿混'; res.sockColor='白';
    } else if(outfitType==='ワークウェアスタイル'){
      res.lockParts = true; res.outfitBrand = pick(['ワークマン','Dickies','BURTLE','寅壱','無地ノーブランド']);
      if(season==='夏'){ res.top = weighted([['半袖の作業シャツ',4],['ドライポロシャツ',2],['半袖ツナギ（上を腰に巻く着方も可）',1]]); }
      else { res.top = weighted([['長袖の作業シャツ',4],['作業用ジャケット＋Tシャツ',2]]); }
      res.bottom = weighted([['カーゴワークパンツ',4],['ストレッチ作業パンツ',3]]);
      res.shoes = weighted([['安全スニーカー（先芯入り）',4],['編み上げワークブーツ',2]]);
      res.jacket = season==='冬' ? '防寒ワークブルゾン' : '指定なし';
      res.sockBrand = pick(['ワークマン','無地ノーブランド','ユニクロ']); res.sockType='先丸の厚手パイルソックス（クルー丈）'; res.sockShape='先丸・厚手パイル編み'; res.sockMaterial='綿混パイル'; res.sockColor=weighted([['黒',3],['グレー',3],['白',1]]);
    } else if(['紺スーツ','黒スーツ','グレースーツ'].includes(outfitType)){
      res.outfitBrand = pick(profile.formal);
      res.jacket = 'テーラードジャケット';
      res.top = weighted([['白シャツ',5],['サックスブルーシャツ',2],['ネクタイ付きシャツ',3]]);
      res.bottom = outfitType==='黒スーツ'?'黒スラックス':outfitType==='グレースーツ'?'グレースラックス':'紺スラックス';
      res.shoes = weighted([['黒革靴',5],['茶革靴',2],['ローファー',2]]);
      res.sockBrand = pick(profile.socksBusiness);
      res.sockType = weighted([['ビジネスソックス',6],['柄ありビジネスソックス', rareMode?3:1]]);
      res.sockShape = '薄手ビジネス形状';
      res.sockMaterial = weighted([['綿＋ナイロン',4],['薄手ナイロン混',3],['綿混',2]]);
      res.sockColor = res.sockType.includes('柄') ? weighted([['ネイビー地ストライプ',4],['黒地ドット',2],['アーガイル柄',2]]) : weighted([['黒',5],['紺',4],['チャコール',3],['グレー',2],['ブラウン',1]]);
    } else if(outfitType==='ジャケットスタイル'){
      res.outfitBrand = pick(vibe==='韓国風'?profile.preppy:profile.casual);
      res.jacket = weighted([['テーラードジャケット',4],['カーディガン',2],['ステンカラーコート',1]]);
      res.top = vibe==='韓国風' ? weighted([['白シャツ',3],['ニット',3],['ポロシャツ',2],['無地Tシャツ',2]]) : weighted([['白シャツ',4],['サックスブルーシャツ',2],['ポロシャツ',2],['ニット',2]]);
      res.bottom = weighted([['黒スラックス',3],['紺スラックス',3],['グレースラックス',2],['チノパン',2]]);
      res.shoes = weighted([['ローファー',4],['黒革靴',3],['茶革靴',2],['白スニーカー',1]]);
      res.sockBrand = pick(profile.socksBusiness);
      res.sockType = weighted([['ビジネスソックス',4],['柄ありビジネスソックス',2],['クルー丈ソックス',2]]);
      res.sockShape = res.sockType.includes('ビジネス') ? '薄手ビジネス形状' : 'クルー丈';
      res.sockMaterial = res.sockType.includes('ビジネス') ? '綿＋ナイロン' : '綿混';
      res.sockColor = res.sockType.includes('柄') ? weighted([['アーガイル柄',3],['ネイビー地ストライプ',3],['黒地ドット',2]]) : weighted([['黒',4],['紺',4],['チャコール',3],['グレー',2]]);
    } else if(outfitType==='社会人カジュアル'){
      res.outfitBrand = pick(vibe==='真面目系'||vibe==='大人っぽい系'?profile.preppy:profile.casual);
      res.jacket = weighted([['指定なし',3],['テーラードジャケット',1],['カーディガン',2],['パーカー',2],['ステンカラーコート',1]]);
      res.top = vibe==='韓国風' ? weighted([['無地Tシャツ',2],['ニット',3],['白シャツ',3],['ポロシャツ',2]]) : weighted([['無地Tシャツ',3],['ロングスリーブTシャツ',2],['ポロシャツ',3],['ニット',2],['白シャツ',2],['スウェット',2]]);
      res.bottom = weighted([['チノパン',3],['黒スラックス',2],['紺スラックス',2],['デニム',2],['ワイドパンツ',1]]);
      res.shoes = weighted([['白スニーカー',3],['黒スニーカー',3],['ローファー',2],['茶革靴',1],['キャンバススニーカー',2]]);
      res.sockBrand = pick(profile.socksCasual);
      res.sockType = res.shoes.includes('スニーカー')||res.shoes.includes('キャンバス') ? weighted([['くるぶしソックス',4],['インビジブルソックス',3],['クルー丈ソックス',2],['ワンポイントソックス',2]]) : weighted([['ビジネスソックス',2],['クルー丈ソックス',3],['柄ありビジネスソックス',1]]);
      res.sockShape = res.sockType==='インビジブルソックス' ? 'インビジブル丈' : res.sockType==='くるぶしソックス' ? 'くるぶし丈' : 'クルー丈';
      res.sockMaterial = weighted([['綿混',3],['綿＋ナイロン',2],['リブ編みコットン',2],['薄手ナイロン混',1]]);
      res.sockColor = res.sockType.includes('柄') ? weighted([['アーガイル柄',2],['ネイビー地ストライプ',2],['黒地ドット',1]]) : weighted([['白',3],['黒',3],['紺',2],['グレー',2],['チャコール',1]]);
    } else if(outfitType==='大学生カジュアル' || outfitType==='私服通学風'){
      res.outfitBrand = pick(vibe==='韓国風'?profile.casual:(vibe==='やりらふぃー系'||vibe==='ストリート系'||vibe==='陽キャ大学生系'?profile.street:profile.casual));
      res.jacket = vibe==='韓国風' ? weighted([['指定なし',3],['カーディガン',2],['デニムジャケット',1],['パーカー',2]]) : weighted([['指定なし',3],['パーカー',3],['カーディガン',2],['MA-1',1],['デニムジャケット',1],['ナイロンジャケット',1]]);
      res.top = vibe==='韓国風' ? weighted([['無地Tシャツ',3],['ニット',3],['ロングスリーブTシャツ',2],['オーバーサイズTシャツ',2]]) : weighted([['無地Tシャツ',4],['オーバーサイズTシャツ',3],['ロングスリーブTシャツ',2],['スウェット',3],['パーカー',2],['ポロシャツ',1]]);
      res.bottom = vibe==='やりらふぃー系' ? weighted([['ワイドパンツ',3],['カーゴパンツ',3],['デニム',2],['黒ショートパンツ',2]]) : weighted([['デニム',4],['ストレートデニム',3],['チノパン',3],['カーゴパンツ',2],['ワイドパンツ',2],['黒ショートパンツ',1]]);
      res.shoes = vibe==='韓国風' ? weighted([['白スニーカー',4],['黒スニーカー',3],['キャンバススニーカー',2]]) : weighted([['白スニーカー',4],['黒スニーカー',3],['キャンバススニーカー',3],['ローファー',1],['サンダル', rareMode?2:1]]);
      res.sockBrand = pick(eraBrandList(['UNIQLO','無印良品','Tabio','靴下屋','NIKE','adidas','Champion','PUMA','New Balance','Calvin Klein','無地ノーブランド'], eraYear));
      res.sockType = res.shoes==='サンダル' ? weighted([['インビジブルソックス',4],['くるぶしソックス',2],['クルー丈ソックス',1]]) : weighted([['くるぶしソックス',4],['クルー丈ソックス',3],['ワンポイントソックス',2],['ライン入りソックス',2],['ロゴ入りソックス',1],['インビジブルソックス',2]]);
      res.sockShape = res.sockType==='インビジブルソックス' ? 'インビジブル丈' : res.sockType==='くるぶしソックス' ? 'くるぶし丈' : 'クルー丈';
      res.sockMaterial = weighted([['綿混',4],['リブ編みコットン',2],['綿＋ナイロン',2],['パイル編み',1]]);
      res.sockColor = res.sockType.includes('ライン') ? 'ライン入り白' : res.sockType.includes('ロゴ') || res.sockType.includes('ワンポイント') ? weighted([['白',3],['黒',3],['グレー',2]]) : weighted([['白',3],['黒',3],['グレー',3],['紺',2],['チャコール',1]]);
    } else if(outfitType==='スポーツ練習着'){
      res.outfitBrand = pick(profile.sports);
      res.jacket = weighted([['スポーツジャケット',3],['指定なし',2],['ナイロンジャケット',2],['パーカー',1]]);
      res.top = weighted([['スポーツシャツ',5],['ゲームシャツ',2],['無地Tシャツ',1]]);
      res.bottom = weighted([['ジャージパンツ',4],['ナイロンパンツ',3],['黒ショートパンツ',2],['ハーフパンツ',2]]);
      res.shoes = weighted([['ランニングシューズ',4],['白スニーカー',1],['黒スニーカー',1],['サッカースパイク', age<28?2:1],['バスケットシューズ', age<28?2:1]]);
      res.sockBrand = pick(profile.sports);
      res.sockType = weighted([['スポーツソックス',5],['クルー丈ソックス',3],['ライン入りソックス',2],['ロゴ入りソックス',2]]);
      res.sockShape = weighted([['クルー丈',4],['厚手スポーツ形状',4],['ミドル丈',2]]);
      res.sockMaterial = weighted([['吸汗速乾素材',5],['パイル編み',3],['綿＋ナイロン',2]]);
      res.sockColor = weighted([['白',4],['黒',3],['ライン入り白',3],['グレー',1]]);
    } else if(outfitType==='学生服（ブレザー）' || outfitType==='制服風コーデ'){
      res.outfitBrand = pick(blazerBrandsEra);
      res.jacket = '学生ブレザー';
      res.top = weighted([['ブレザー用シャツ',4],['制服用ワイシャツ',4],['ネクタイ付きシャツ',3]]);
      res.bottom = 'ブレザー用スラックス';
      res.shoes = weighted([['ローファー',5],['黒革靴',2]]);
      res.sockBrand = pick(eraBrandList(['Tabio','靴下屋','Fukuske','POLO RALPH LAUREN','無地ノーブランド'], eraYear));
      res.sockType = weighted([['ビジネスソックス',4],['柄ありビジネスソックス',1],['クルー丈ソックス',2]]);
      res.sockShape = weighted([['クルー丈',3],['薄手ビジネス形状',4]]);
      res.sockMaterial = weighted([['綿＋ナイロン',4],['綿混',3]]);
      res.sockColor = res.sockType.includes('柄') ? weighted([['ネイビー地ストライプ',3],['アーガイル柄',2]]) : weighted([['紺',4],['黒',3],['チャコール',2],['グレー',1]]);
    } else if(outfitType==='学生服（学ラン）'){
      res.outfitBrand = pick(gakuranBrandsEra);
      res.jacket = '学ラン上着';
      res.top = '制服用ワイシャツ';
      res.bottom = '学ラン用ズボン';
      res.shoes = weighted([['黒革靴',4],['ローファー',3]]);
      res.sockBrand = pick(eraBrandList(['Tabio','靴下屋','Fukuske','無地ノーブランド'], eraYear));
      res.sockType = weighted([['ビジネスソックス',5],['クルー丈ソックス',2],['柄ありビジネスソックス', rareMode?2:1]]);
      res.sockShape = weighted([['クルー丈',3],['薄手ビジネス形状',4]]);
      res.sockMaterial = weighted([['綿＋ナイロン',4],['綿混',3]]);
      res.sockColor = res.sockType.includes('柄') ? weighted([['黒地ドット',2],['ネイビー地ストライプ',2]]) : weighted([['黒',4],['紺',3],['チャコール',2]]);
    } else if(outfitType==='ストリート系'){
      res.outfitBrand = pick(profile.street);
      res.jacket = weighted([['指定なし',2],['MA-1',2],['スタジャン',2],['パーカー',3],['デニムジャケット',1]]);
      res.top = vibe==='やりらふぃー系' ? weighted([['オーバーサイズTシャツ',4],['パーカー',3],['ゲームシャツ',2],['スウェット',2]]) : weighted([['オーバーサイズTシャツ',4],['無地Tシャツ',3],['スウェット',3],['ゲームシャツ',2],['パーカー',2]]);
      res.bottom = weighted([['ワイドパンツ',3],['カーゴパンツ',3],['デニム',2],['黒ショートパンツ',1]]);
      res.shoes = weighted([['白スニーカー',4],['黒スニーカー',4],['キャンバススニーカー',3],['ブーツ',1]]);
      res.sockBrand = pick(eraBrandList(['NIKE','adidas','Champion','PUMA','New Balance','UNIQLO','Calvin Klein','無地ノーブランド'], eraYear));
      res.sockType = weighted([['クルー丈ソックス',4],['ライン入りソックス',3],['ロゴ入りソックス',2],['ワンポイントソックス',2]]);
      res.sockShape = weighted([['クルー丈',5],['ミドル丈',2]]);
      res.sockMaterial = weighted([['綿混',3],['パイル編み',2],['リブ編みコットン',2]]);
      res.sockColor = res.sockType.includes('ライン') ? 'ライン入り白' : weighted([['白',4],['黒',4],['グレー',2]]);
    } else if(outfitType==='きれいめカジュアル'){
      res.outfitBrand = pick(profile.preppy || profile.casual);
      res.jacket = weighted([['指定なし',3],['テーラードジャケット',3],['カーディガン',2],['ノーカラージャケット',1]]);
      res.top = weighted([['白シャツ',3],['ニット',3],['バンドカラーシャツ',2],['無地カットソー',2],['ポロシャツ',1]]);
      res.bottom = weighted([['黒スラックス',3],['ワイドスラックス',2],['テーパードパンツ',3],['白パンツ（マリン）',1],['チノパン',2]]);
      res.shoes = weighted([['ローファー',4],['白レザースニーカー（スタンスミス風）',3],['サイドゴアブーツ',2],['茶革靴',1]]);
      res.sockBrand = pick(profile.socksBusiness || ['Tabio','靴下屋','無地ノーブランド']);
      res.sockType = weighted([['クルー丈ソックス',3],['ビジネスソックス',3],['インビジブルソックス',2]]);
      res.sockShape = res.sockType==='インビジブルソックス' ? 'インビジブル丈' : 'クルー丈';
      res.sockMaterial = weighted([['綿混',3],['綿＋ナイロン',3],['リブ編みコットン',2]]);
      res.sockColor = weighted([['黒',4],['白',3],['グレー',2],['ベージュ',1]]);
    } else if(outfitType==='ワークマン系機能カジュアル'){
      res.outfitBrand = pick(eraBrandList(['ワークマン','mont-bell','無地ノーブランド'], eraYear, '無地ノーブランド'));
      res.jacket = weighted([['指定なし',2],['アウトドアシェルジャケット',3],['フリースジャケット',2],['中綿ジャケット',2]]);
      res.top = weighted([['ドライメッシュTシャツ',3],['吸汗速乾ポロ',2],['無地Tシャツ',3],['スウェット',2]]);
      res.bottom = weighted([['クライミングパンツ',3],['カーゴジョガー',2],['ストレッチスリムチノ',3],['ジョガーパンツ',2]]);
      res.shoes = weighted([['トレイルランニングシューズ',3],['メッシュスニーカー',3],['黒スニーカー',2]]);
      res.sockBrand = pick(eraBrandList(['ワークマン','MIZUNO','無地ノーブランド'], eraYear, '無地ノーブランド'));
      res.sockType = weighted([['クルー丈ソックス',4],['厚手のパイルソックス',2],['ライン入りソックス',1]]);
      res.sockShape = 'クルー丈'; res.sockMaterial = weighted([['綿＋ナイロン',3],['吸汗速乾素材',3]]);
      res.sockColor = weighted([['黒',4],['グレー',3],['白',2]]);
    } else if(outfitType==='セットアップカジュアル'){
      res.outfitBrand = pick(eraBrandList(['UNIQLO','GU','UNITED TOKYO','STUDIOUS','無印良品'], eraYear, '無地ノーブランド'));
      res.jacket = weighted([['セットアップの上だけ羽織り',4],['テーラードジャケット',2],['指定なし',1]]);
      res.top = weighted([['無地カットソー',4],['白無地Tシャツ（ノームコア）',2],['バンドカラーシャツ',2]]);
      res.bottom = weighted([['ワイドスラックス',3],['テーパードパンツ',3],['スラックス風イージー',2]]);
      res.shoes = weighted([['白レザースニーカー（スタンスミス風）',3],['ローファー',2],['黒スニーカー',2]]);
      res.sockBrand = pick(['Tabio','靴下屋','無地ノーブランド']);
      res.sockType = weighted([['クルー丈ソックス',3],['インビジブルソックス',2],['ビジネスソックス',1]]);
      res.sockShape = 'クルー丈'; res.sockMaterial = '綿混';
      res.sockColor = weighted([['黒',4],['白',2],['グレー',2]]);
    } else if(outfitType==='アメカジ'){
      res.outfitBrand = pick(eraBrandList(["Levi's",'Champion','EDWIN','無地ノーブランド'], eraYear, '無地ノーブランド'));
      res.jacket = weighted([['デニムジャケット',3],['スウィングトップ',2],['指定なし',3]]);
      res.top = weighted([['アメカジ無地ポケT',3],['カレッジロゴスウェット',3],['チェックのネルシャツ',2],['ラガーシャツ',1]]);
      res.bottom = weighted([['ストレートデニム',4],['チノパン',3],['ペインターパンツ',1.5]]);
      res.shoes = weighted([['キャンバススニーカー',3],['ワークブーツ（赤茶）',2],['白のキャンバススニーカー',2]]);
      res.sockBrand = pick(eraBrandList(['Champion','無地ノーブランド','UNIQLO'], eraYear));
      res.sockType = weighted([['クルー丈ソックス',4],['ライン入りソックス',2]]);
      res.sockShape = 'クルー丈'; res.sockMaterial = 'リブ編みコットン';
      res.sockColor = weighted([['白',4],['生成り',2],['グレー',2]]);
    } else if(outfitType==='ゴープコア'){
      res.outfitBrand = pick(eraBrandList(['mont-bell','THE NORTH FACE','無地ノーブランド'], eraYear, '無地ノーブランド'));
      res.jacket = weighted([['ナイロンアノラック（ゴープコア）',3],['アウトドアシェルジャケット',3],['指定なし',1.5]]);
      res.top = weighted([['テック系プルオーバー',3],['グラフィックビッグT',2],['無地ヘビーウェイトTシャツ',2]]);
      res.bottom = weighted([['カーゴジョガー',3],['ナイロントラックパンツ',2],['バルーンパンツ',2],['クライミングパンツ',2]]);
      res.shoes = weighted([['トレイルランニングシューズ',4],['ダッドスニーカー',2],['スポーツサンダル',1]]);
      res.sockBrand = pick(eraBrandList(['NIKE','無地ノーブランド'], eraYear, '無地ノーブランド'));
      res.sockType = weighted([['クルー丈ソックス',3],['ライン入りソックス',2],['厚手のパイルソックス',2]]);
      res.sockShape = 'クルー丈'; res.sockMaterial = '綿＋ナイロン';
      res.sockColor = weighted([['黒',3],['白',3],['グレー',2]]);
    } else if(outfitType==='古着系'){
      res.outfitBrand = pick(eraBrandList(['古着（ブランド不詳）','WEGO',"FREAK'S STORE",'無地ノーブランド'], eraYear, '古着（ブランド不詳）'));
      res.jacket = weighted([['指定なし',3],['デニムジャケット',2],['コーデュロイジャケット',2],['スウィングトップ',1],['ミリタリーM-65',1]]);
      res.top = weighted([['バンドTシャツ',3],['チェックのネルシャツ',3],['カレッジロゴスウェット',2],['アメカジ無地ポケT',2],['ダンガリーシャツ',1]]);
      res.bottom = weighted([['ダメージリペアの古着リーバイス風',3],['太畝コーデュロイ（古着）',2],['ミリタリーチノ（M-41風）',2],['ストレートデニム',2]]);
      res.shoes = weighted([['キャンバススニーカー',3],['ワークブーツ（赤茶）',2],['レトロランニングシューズ',2],['コインローファー（HARUTA風）',1]]);
      res.sockBrand = pick(eraBrandList(['無地ノーブランド','UNIQLO','Tabio','Champion'], eraYear));
      res.sockType = weighted([['クルー丈ソックス',4],['ライン入りソックス',2],['ワンポイントソックス',2]]);
      res.sockShape = 'クルー丈';
      res.sockMaterial = weighted([['綿混',4],['リブ編みコットン',3]]);
      res.sockColor = weighted([['白',3],['生成り',2],['黒',2],['グレー',2]]);
      res.sockUse = '味の出た使用感';
    }

    res.sockUse = weighted([['新品に近い',1],['自然な使用感',4],['少し履き込まれている',4],['毛羽立ちが少しある',2],['かかとがやや薄くなっている', FV_SUIT_TYPES.includes(outfitType)?2.5:1],['スポーツ後の自然な使用感', outfitType==='スポーツ練習着'?4:1],['清潔だが生活感あり',3]].filter(x=>x[1]>0));
    if(persona){
      if(/穴が開くまで/.test(String(persona.sockCycle||''))) res.sockUse = weighted([['少し履き込まれている',4],['毛羽立ちが少しある',3],['かかとがやや薄くなっている',3],['清潔だが生活感あり',2]]);
      else if(/頻繁|半年ごと/.test(String(persona.sockCycle||''))) res.sockUse = weighted([['新品に近い',2],['自然な使用感',5],['清潔だが生活感あり',3]]);
      if(!FV_SUIT_TYPES.includes(outfitType)){
        if(/見せない派/.test(String(persona.sockPair||'')) && !/ブーツ/.test(String(res.shoes||''))) res.sockType = weighted([['くるぶしソックス',4],['インビジブルソックス',3],[res.sockType||'クルー丈ソックス',3]]);
        if(/柄物/.test(String(persona.sockDrawer||'')) && rand()<0.5) res.sockType = pick(['柄ありビジネスソックス','ワンポイントソックス','ライン入りソックス']);
      }
    }
    applyEraFashionLayer(res, outfitType, eraYear, {age, season, vibe, mute: persona && /量販店で3着|色違いを5枚|サイズ表記だけ|穴が開くまで/.test(String(persona.senseText||''))});
    enforceOutfitCoherence(res, outfitType, eraYear, season, (typeof FASHION_CASUAL_TAGS!=='undefined'?FASHION_CASUAL_TAGS[outfitType]:null)||null);
    assignPartBrands(res, outfitType, profile, eraYear, vibe, persona);
    assignPartColors(res, outfitType, eraYear, season, persona);
    res.styleNote = rand() < 0.5 ? mbtiStyleNote(mbti) : '';
    return res;
  }

  function mbtiProfile(code){
    const groups = {
      guardian:['ISTJ','ISFJ','ESTJ','ESFJ'], analyst:['INTJ','INTP','ENTJ','ENTP'], social:['ESTP','ESFP','ENFP','ENFJ'], creative:['ISFP','INFP','ISTP','INFJ']
    };
    if(groups.guardian.includes(code)) return {vibes:[['真面目系',4],['清楚系',3],['大人っぽい系',3],['きれいめ系',2],['紳士系',2]], roles:[['若手社会人',4],['事務職風',3],['営業職風',3],['研究職風',2]], outfits:[['紺スーツ',4],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2]]};
    if(groups.analyst.includes(code)) return {vibes:[['クール系',4],['ミステリアス系',3],['サブカル系',2],['真面目系',2],['モード系',2]], roles:[['研究職風',4],['IT系会社員風',4],['クリエイター風',2],['フリーランス風',2]], outfits:[['黒スーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2],['ストリート系',1],['大学生カジュアル',1]]};
    if(groups.social.includes(code)) return {vibes:[['やりらふぃー系',3],['陽キャ大学生系',3],['スポーツ系',3],['爽やか系',2],['ワイルド系',2],['ギャル男系',1],['アウトドア系',1]], roles:[['販売員風',3],['モデル風',3],['インストラクター風',3],['スポーツ経験者',3],['俳優風',2]], outfits:[['ストリート系',4],['スポーツ練習着',3],['大学生カジュアル',3],['私服通学風',2]]};
    return {vibes:[['中性系',3],['塩顔系',3],['サブカル系',3],['古着系',2],['カジュアル系',2],['バンドマン系',2],['レトロ系',2]], roles:[['クリエイター風',4],['フリーランス風',3],['大学生風の成人男性',3],['モデル風',2],['販売員風',1]], outfits:[['大学生カジュアル',3],['社会人カジュアル',3],['ジャケットスタイル',2],['ストリート系',2],['私服通学風',2]]};
  }

  const VIBE_AGE_MAX = {'陽キャ大学生系':26,'やりらふぃー系':30,'ギャル男系':35,'韓国風':40,'中性系':40,'ホスト系':45,'ヤンキー系':45,'ストリート系':50,'バンドマン系':60};

  function chooseVibeByMbti(mbti, age){
    let entries = mbtiProfile(mbti).vibes.map(([v,w])=>[v,w]);
    if(age !== undefined){
      entries = entries.filter(([v])=>!(VIBE_AGE_MAX[v] && age > VIBE_AGE_MAX[v]));
      if(age >= 55){ [['おじさん系',2],['紳士系',2],['大人っぽい系',2],['レトロ系',2],['地味系',1]].forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); }); }
      if(!entries.length) entries = [['大人っぽい系',1],['普通系',1]];
    }
    return weighted(entries);
  }

  function chooseOutfitByMbti(age, rareMode, vibe, mbti){
    const profile = mbtiProfile(mbti);
    const candidate = weighted(profile.outfits);
    if(candidate && pools.outfitTypes.includes(candidate)) return candidate;
    return chooseOutfit(age, rareMode, vibe);
  }

  const OCCUPATIONS = [
    ['大学生','student',0,0,18,24],['大学1年生','student',0,0,18,19],['高校卒業直後（進路準備中）','student',1950,0,18,19],['浪人生（予備校生）','student',1950,0,18,21],['大学院生','student',0,0,22,29],['専門学校生','student',0,0,18,23],['就活中の大学生','student',0,0,20,24],
    ['人力車の車夫','service',1992,0,18,45],['営業職','office',0,0,22,65],['経理・事務職','office',0,0,20,65],['企画職','office',0,0,23,65],['公務員','office',0,0,22,64],['銀行員','office',0,0,22,60],['商社勤務','office',0,0,22,65],['コンサルタント','office',1985,0,24,70],['不動産営業','office',0,0,22,70],
    ['ITエンジニア','it',1995,0,20,65],['Webデザイナー','it',2000,0,20,65],['ゲーム開発者','it',1985,0,20,65],['動画クリエイター','it',2012,0,18,70],['アプリ開発者','it',2010,0,20,65],
    ['看護師','medical',0,0,21,68],['理学療法士','medical',1990,0,22,68],['薬剤師','medical',0,0,24,70],['研修医','medical',0,0,24,32],['介護士','medical',1990,0,18,68],
    ['高校教師','edu',0,0,23,65],['塾講師','edu',0,0,20,75],['保育士','edu',0,0,20,65],['大学研究員','edu',0,0,24,75],['体育教師','edu',0,0,23,60],
    ['アパレル店員','service',0,0,18,55],['カフェ店員','service',0,0,18,65],['美容師','service',0,0,19,70],['バーテンダー','service',0,0,20,70],['ホテルスタッフ','service',0,0,19,68],['飲食店店長','service',0,0,28,70],['書店員','service',0,0,18,75],['コンビニ店長','service',1980,0,25,70],
    ['自動車整備士','trade',0,0,18,68],['電気工事士','trade',0,0,18,68],['大工','trade',0,0,18,72],['建築士','trade',0,0,24,75],['工場勤務','trade',0,0,18,65],['配送ドライバー','trade',0,0,20,68],['農家','trade',0,0,18,80],['漁師','trade',0,0,18,75],
    ['グラフィックデザイナー','creative',1975,0,20,70],['カメラマン','creative',0,0,20,75],['ミュージシャン','creative',0,0,18,75],['編集者','creative',0,0,22,70],['イラストレーター','creative',0,0,18,75],['映像ディレクター','creative',1985,0,24,72],
    ['消防士','uniform',0,0,18,59],['警察官','uniform',0,0,18,59],['自衛官','uniform',0,0,18,54],['救急隊員','uniform',0,0,20,59],['防衛大学校学生','uniform',1953,0,18,24],['ジムトレーナー','uniform',1995,0,18,60],['スポーツインストラクター','uniform',1990,0,18,62],['モデル','uniform',0,0,18,55],['俳優','uniform',0,0,18,80],['プロスポーツ選手','uniform',0,0,18,42],
    ['喫茶店マスター','showa',0,0,30,80],['新聞記者','showa',0,0,22,65],['鉄道職員','showa',0,0,18,60],
    ['お笑い芸人','enta',0,0,18,75],['声優','enta',1980,0,18,75],['YouTuber','enta',2008,0,18,60],['プロゲーマー','enta',2010,0,18,40],
    ['書道家','creative',0,0,20,80],['パティシエ','service',1990,0,18,70],['寿司職人','service',0,0,18,80],['ラーメン店店主','service',0,0,25,75],['僧侶','other',0,0,20,80],['古着屋店主','service',1985,0,24,70],
    ['悠々自適（定年後）','retired',0,0,62,80],
    ['アナウンサー','office',1953,0,22,60],['弁護士','office',0,0,25,75],['公認会計士','office',0,0,24,70],
    ['小学校教員','edu',0,0,23,65],['中学校教員','edu',0,0,23,65],['図書館司書','edu',0,0,22,68],['自動車教習所教官','edu',0,0,25,65],
    ['ライフガード','uniform',0,0,18,45],['プール監視員（バイト）','uniform',0,0,18,25],['警備員','uniform',0,0,18,75],['電車運転士','uniform',0,0,21,60],['パイロット','uniform',1955,0,26,64],
    ['医師','medical',0,0,26,75],['歯科医師','medical',0,0,26,75],
    ['タクシー運転手','trade',1950,0,25,78],['バス運転手','trade',0,0,24,70],['郵便配達員','trade',0,0,18,65],['引越しスタッフ','trade',0,0,18,45],
    ['スーパー店員','service',0,0,18,70],['家電量販店店員','service',1975,0,18,60],['花屋店員','service',0,0,18,65],['シェフ（洋食）','service',0,0,20,75],['理容師','service',0,0,19,75],['銭湯・サウナ店スタッフ','service',0,0,18,70]
  ];

  const OCC_CAT = {}; OCCUPATIONS.forEach(([n,c])=>OCC_CAT[n]=c);

  const OCC_STAT_W = { office:2.3, it:1.6, service:1.5, retail:1.4, industrial:1.5, medical:1.2, edu:1.0, transport:1.1, safety:0.7, creative:0.45, media:0.4, entertain:0.12, sports:0.15, showa:0.8, student:1.0, pro:0.5, niche:0.12 };

  const OCC_MBTI_CAT = {
    guardian:{enta:1, office:3, medical:2, edu:2, trade:2, uniform:2, showa:2, service:1, it:1, creative:1, student:1},
    analyst:{enta:1, it:3, edu:2, creative:2, office:2, medical:1, trade:1, uniform:1, service:1, showa:1, student:1},
    social:{enta:3, uniform:3, service:3, trade:2, student:2, office:1, edu:2, medical:1, it:1, creative:1, showa:1},
    creative:{enta:2, creative:3, service:2, it:2, student:1, office:1, edu:1, medical:1, trade:1, uniform:1, showa:1}
  };

  const ATHLETIC_OCC = ['消防士','警察官','自衛官','プロスポーツ選手','体育教師','ジムトレーナー','スポーツインストラクター','漁師','大工'];

  const SUIT_TYPES = ['紺スーツ','黒スーツ','グレースーツ'];

  const SCHOOL_TYPES = ['学生服（学ラン）','学生服（ブレザー）','制服風コーデ'];

  function occOutfitBlocklist(occ){
    if(!occ) return [];
    const cat = OCC_CAT[occ];
    let block = SCHOOL_TYPES.slice();
    if(cat==='student'){ block = SCHOOL_TYPES.concat(occ==='就活中の大学生' ? [] : SUIT_TYPES); }
    else if(['消防士','警察官','自衛官'].includes(occ)) block = block.concat(SUIT_TYPES);
    else if(['大工','自動車整備士','電気工事士','農家','漁師','工場勤務','配送ドライバー'].includes(occ)) block = block.concat(SUIT_TYPES);
    else if(['バーテンダー','ホテルスタッフ'].includes(occ)) block = block.concat(['スポーツ練習着']);
    else if(occ==='プロゲーマー' || occ==='YouTuber' || occ==='古着屋店主' || occ==='悠々自適（定年後）') block = block.concat(SUIT_TYPES);
    return block;
  }

  const UNIFORM_WORKWEAR = {
    '消防士':['消防署の活動服（紺の作業服スタイル）','a firefighter station duty uniform (navy work-wear style)','紺の活動服上衣','紺の活動服パンツ','編み上げの作業ブーツ'],
    '警察官':['警察官の勤務制服風（濃紺）','a police-style duty uniform (dark navy)','濃紺の制服シャツ','濃紺の制服スラックス','黒の革靴'],
    '自衛官':['迷彩柄の作業服風制服','a camouflage work-uniform style','迷彩の作業服上衣','迷彩の作業服パンツ','ミリタリーブーツ'],
    '看護師':['医療用スクラブ','medical scrubs','スクラブトップス','スクラブパンツ','白のナースシューズ'],
    '研修医':['白衣＋スクラブ','a white coat over scrubs','白衣＋スクラブ','スクラブパンツ','白のスニーカー'],
    '薬剤師':['白衣スタイル','a pharmacist white coat','白衣＋シャツ','スラックス','黒の革靴'],
    '理学療法士':['ケーシー白衣（医療ユニフォーム）','a medical tunic uniform','ケーシー白衣','白の医療用パンツ','白のスニーカー'],
    '介護士':['介護スタッフのポロシャツユニフォーム','a caregiver polo uniform','ユニフォームポロシャツ','動きやすいチノパン','白のスニーカー'],
    'ホテルスタッフ':['ホテルの制服（ベスト＋ネクタイ）','a hotel staff uniform with vest and tie','白シャツ＋ベスト＋ネクタイ','黒スラックス','黒の革靴'],
    'カフェ店員':['シャツ＋カフェエプロン','a shirt with a cafe apron','シャツ＋ロングエプロン','黒パンツ','黒のプレーントゥ'],
    'コンビニ店長':['コンビニの店員ユニフォーム','a convenience store staff uniform','店舗ユニフォームシャツ','黒パンツ','黒のスニーカー'],
    '自動車整備士':['つなぎの作業服','mechanic coveralls','つなぎ（上）','つなぎ（下）','安全靴'],
    '電気工事士':['電気工事の作業服','an electrician work uniform','作業服上衣','作業服パンツ','安全靴'],
    '大工':['大工の作業着','carpenter work clothes','作業シャツ','ニッカポッカ風の作業ズボン','足袋風の作業靴'],
    '工場勤務':['工場の作業服','a factory work uniform','作業服上衣','作業服パンツ','安全靴'],
    '配送ドライバー':['配送業の制服','a delivery company uniform','制服ポロシャツ','制服パンツ','黒のスニーカー'],
    '農家':['農作業着','farm work clothes','作業シャツ','作業ズボン','長靴'],
    '漁師':['漁師の作業着（防水前掛け）','fisherman work gear with a waterproof apron','作業ジャンパー','防水パンツ','長靴'],
    'パティシエ':['白のコックコート','a white chef coat','コックコート','コックパンツ','厨房用シューズ'],
    '寿司職人':['白衣＋和帽子の板前スタイル','a sushi chef white uniform with a traditional hat','板前白衣','白の調理パンツ','厨房用サンダルではなく作業靴'],
    'ラーメン店店主':['作務衣風の調理着＋タオル鉢巻','a samue-style cooking outfit with a towel headband','作務衣風上衣','作務衣風パンツ','厨房用の作業靴'],
    '国鉄職員':['国鉄の駅員制服風','a national-railway station staff uniform style','制服上衣＋制帽','制服スラックス','黒の革靴'],
    'ライフガード':['ライフガードの監視ユニフォーム（赤×黄）','a lifeguard patrol uniform (red and yellow)','GUARDと書かれた赤のタンクトップ（実在団体ロゴなし）','赤のサーフパンツ','ビーチサンダルまたは素足＋ホイッスルを首から下げる'],
    'プール監視員（バイト）':['プール監視員のスタッフウェア','a pool-attendant staff outfit','スタッフTシャツ（STAFF表記・実在ロゴなし）','スイムハーフパンツ','プールサンダル＋ホイッスル'],
    '警備員':['警備会社の制服風（グレー系）','a security-guard uniform style (gray tones)','グレーの制服シャツ＋肩章','濃紺の制服スラックス','黒の革靴＋白手袋を携行'],
    '電車運転士':['鉄道乗務員の制服風（濃紺）','a railway train-driver uniform style (dark navy)','濃紺の制服上衣＋ネクタイ','濃紺の制服スラックス','黒の革靴'],
    'パイロット':['エアラインパイロットの制服風','an airline-pilot uniform style','白の制服シャツ＋黒ネクタイ＋袖に金線の入った濃紺ジャケット（実在会社ロゴなし）','濃紺の制服スラックス','黒の革靴'],
    '医師':['白衣＋スクラブの医師スタイル','a doctor style with a white coat over scrubs','白衣＋スクラブ','スクラブパンツ','白のスニーカー・聴診器を首に掛ける'],
    '歯科医師':['歯科用スクラブスタイル','dental scrubs','半袖スクラブトップス','スクラブパンツ','白のクリニックシューズ'],
    'タクシー運転手':['タクシー乗務員の制服風','a taxi-driver uniform style','白の制服シャツ＋ネクタイ','黒の制服スラックス','黒の革靴＋白手袋'],
    'バス運転手':['バス乗務員の制服風','a bus-driver uniform style','水色の制服シャツ','濃紺の制服スラックス','黒の革靴'],
    '郵便配達員':['配達員の制服風（実在事業者ロゴなし）','a mail-carrier uniform style (no real logos)','配達用ポロシャツ','配達用パンツ','黒のスニーカー'],
    '引越しスタッフ':['引越し会社のスタッフウェア','a moving-company staff outfit','スタッフポロシャツ（実在会社ロゴなし）','動きやすい作業パンツ','滑りにくいスニーカー＋腰にタオル'],
    'スーパー店員':['スーパーの店員ユニフォーム＋エプロン','a supermarket staff uniform with an apron','店舗ポロシャツ＋エプロン','黒パンツ','黒のスニーカー'],
    '家電量販店店員':['量販店の店員ユニフォーム','an electronics-store staff uniform','店舗カラーのユニフォームシャツ（実在店ロゴなし）','黒スラックス','黒のスニーカー'],
    'シェフ（洋食）':['白のコックコート＋ソムリエエプロン','a white chef coat with a bistro apron','白のコックコート','黒のソムリエエプロン＋コックパンツ','厨房用シューズ'],
    '理容師':['理容師のバーバースタイル','a barber work style','黒のバーバーエプロン＋白シャツ','黒パンツ','黒の革靴'],
  };

  const UNIFORM_VARIANTS = {
    '人力車の車夫': [
      ['観光人力車の車夫装束（法被・股引・地下足袋）','a tourist rickshaw puller outfit (happi coat, momohiki leggings and jika-tabi split-toe shoes)','屋号入りの法被','黒の股引','紺の地下足袋',5,'','ねじり鉢巻きまたは笠'],
      ['夏の車夫スタイル（半袖法被・脚絆）','a summer rickshaw puller outfit (short-sleeve happi and leg wraps)','半袖の法被','短めの股引','地下足袋',3,'','手ぬぐい鉢巻き']
    ],
    '消防士': [
      ['消防署の活動服（紺の作業服スタイル）','the navy station duty uniform of the Ashikusa Fire Department — a navy stand-collar shirt-jacket duty top with a zip-and-button front, two flap chest pockets (pen slot on the left pocket), a silver rank bar on the left chest, a yellow fabric name tape on the right chest, a navy duty belt with a silver square buckle, and the back marked in yellow with the Japanese characters "足草消防" above "ASHIKUSA FIRE DEPT." (render both lines exactly, crisp and unbroken); no shoulder emblems or shoulder boards','紺の活動服上衣（立ち襟気味のシャツジャケット型、前面はファスナー＋ボタン留め、両胸にフラップ付きポケットで左胸ポケットにペン差し、左胸に銀色の階級章バー、右胸に黄色の布製ネーム、背中に黄色の文字で「足草消防」と「ASHIKUSA FIRE DEPT.」を2段表記、腰に紺の制式ベルト（銀色の角型バックル）。肩の紋章・肩章はなし。文字は正確に表記し崩さない）','紺の活動服パンツ','黒革の編み上げ半長靴（前面レースアップ＋サイドファスナー、履き口にクッション入りのベルクロベルト、かかと側にオレンジの反射材、丸みのある先芯入りつま先、滑りにくいラバーソール）',5,'','紺のアポロキャップ型活動帽（正面に金色の英字刺繍「ASHIKUSA FIRE DEPT.」と金色の帽章のみ。漢字の刺繍は入れない）'],
      ['救助服（オレンジのレスキュー隊服）','the orange rescue-squad duty uniform of the Ashikusa Fire Department — a stand-collar orange duty top with two vertical-zip chest pockets, a fabric name tape on the left chest, a round English-only shoulder patch reading "ASHIKUSA RESCUE" on the left sleeve, tone-on-tone reinforcement patches at the elbows, a wide orange two-pin-buckle belt, and the back marked with the Japanese characters "足草消防" above "ASHIKUSA FIRE DEPT." (render both lines exactly, crisp and unbroken)','オレンジの救助服上衣（立ち襟、胸に縦ファスナーポケット×2、左胸に布製ネーム、左肩に円形の英字ワッペン「ASHIKUSA RESCUE」のみで漢字なし、肘に同色の補強パッチ、腰にオレンジの2ピンバックル幅広ベルト、背中に「足草消防」と「ASHIKUSA FIRE DEPT.」を2段表記。文字は正確に表記し崩さない）','オレンジの救助服パンツ（膝に同色の補強パッチ、裾は絞って半長靴にブーツイン）','黒革の編み上げ半長靴（前面レースアップ＋サイドファスナー、履き口にクッション入りのベルクロベルト、かかと側にオレンジの反射材、丸みのある先芯入りつま先、滑りにくいラバーソール）',3,'','白の救助ヘルメット（黒のあご紐付き。ゴーグルを上に上げて装着した状態も可。文字なし）'],
      ['訓練軽装（紺Tシャツ＋救助ズボン）','fire-department training gear — a navy quick-dry T-shirt with a small white circular logo on the left chest reading "119" over "ASHIKUSA FIRE DEPT." (English and numerals only), orange rescue duty pants with an orange two-pin-buckle belt, hems gathered at the ankle','紺の速乾Tシャツ（左胸に白の円形ロゴ「119」と英字「ASHIKUSA FIRE DEPT.」のみ。漢字なし。文字は正確に表記し崩さない）','オレンジの救助服パンツ（裾は足首で絞る）','トレーニングシューズ（赤や青などの色つきランニングシューズ可）',1.2,'summer',''],
      ['防火衣（訓練場面向けの耐火装備スタイル）','protective fire gear of the Ashikusa Fire Department in a training-style setting — a beige turnout coat with silver reflective bands on the chest, sleeves, and hem, and the back marked in silver reflective lettering with the Japanese characters "足草消防" above "ASHIKUSA FIRE DEPT." (render both lines exactly, crisp and unbroken)','ベージュの防火衣上衣（胸・袖・裾に銀色の反射帯、背中に銀色反射材の文字で「足草消防」と「ASHIKUSA FIRE DEPT.」を2段表記。文字は正確に表記し崩さない）','防火衣のズボン（銀色反射帯付き）','防火用ブーツ',1,'','防火用ヘルメット（銀色・文字なし）']
    ],
    '警察官': [
      ['夏制服・装備ベストあり（水色シャツ×濃紺ベスト）','the summer duty uniform of the Ashikusa Prefectural Police — a light-blue police uniform shirt with a dark-navy yoke on the top of the shoulders and upper back only (the sleeves are plain light blue with no dark cuff trim), shoulder-strap loops, two buttoned-flap chest pockets, and a silver identification badge on the left chest (no lettered patches on the shirt), worn under a dark-navy multi-pocket equipment vest with a two-line fabric patch on the left chest reading the Japanese characters "足草県警察" above "POLICE" (render both lines exactly, crisp and unbroken) and a radio holder on the shoulder, with dark-navy uniform slacks','薄青（水色）の制服シャツ（濃紺のヨークは肩の上面と背面上部のみで、袖は水色一色（袖口に濃紺の縁取りや切替を入れない）、肩章ループ、両胸にボタン留めフラップ付きポケット、左胸に銀色の識別章。文字入りのワッペンは付けない）の上に濃紺の装備ベスト（多ポケット・前面ファスナー、左胸に「足草県警察」と「POLICE」の2段布章、肩に無線機ホルダー。文字は正確に表記し崩さない）を着用','濃紺の制服スラックス','黒の制式短靴',4,'summer','濃紺の制帽（黒つば・黒あご紐・金色の帽章風エンブレムのみ。文字は入れない）'],
      ['夏制服・装備ベストなし（水色シャツ）','the summer duty uniform of the Ashikusa Prefectural Police without the equipment vest — a light-blue police uniform shirt with a dark-navy yoke on the top of the shoulders and upper back only (the sleeves are plain light blue with no dark cuff trim), shoulder-strap loops, two buttoned-flap chest pockets, and a silver identification badge on the left chest (no lettered patches on the shirt), with a black duty belt and dark-navy uniform slacks','薄青（水色）の制服シャツ（濃紺のヨークは肩の上面と背面上部のみで、袖は水色一色（袖口に濃紺の縁取りや切替を入れない）、肩章ループ、両胸にボタン留めフラップ付きポケット、左胸に銀色の識別章。文字入りのワッペンは付けない）＋黒のベルト','濃紺の制服スラックス','黒の制式短靴',2,'summer','濃紺の制帽（黒つば・黒あご紐・金色の帽章風エンブレムのみ。文字は入れない）'],
      ['冬制服・装備ベストあり（濃紺ジャケット×濃紺ベスト）','the winter duty uniform of the Ashikusa Prefectural Police — a dark-navy winter police uniform jacket with gold buttons on a single-breasted front, shoulder straps, and a silver identification badge on the left chest, worn over a light-blue shirt with a navy tie, worn under a dark-navy multi-pocket equipment vest with a two-line fabric patch on the left chest reading the Japanese characters "足草県警察" above "POLICE" (render both lines exactly, crisp and unbroken) and a radio holder on the shoulder, with dark-navy uniform slacks','濃紺の冬制服ジャケット（シングルの前合わせに金色ボタン、肩章、左胸に銀色の識別章）＋内側に薄青の制服シャツと紺のネクタイの上に濃紺の装備ベスト（多ポケット・前面ファスナー、左胸に「足草県警察」と「POLICE」の2段布章、肩に無線機ホルダー。文字は正確に表記し崩さない）を着用','濃紺の制服スラックス','黒の革靴',4,'winter','濃紺の制帽（黒つば・黒あご紐・金色の帽章風エンブレムのみ。文字は入れない）'],
      ['冬制服・装備ベストなし（濃紺ジャケット＋ネクタイ）','the winter duty uniform of the Ashikusa Prefectural Police without the equipment vest — a dark-navy winter police uniform jacket with gold buttons on a single-breasted front, shoulder straps, and a silver identification badge on the left chest, worn over a light-blue shirt with a navy tie, with dark-navy uniform slacks','濃紺の冬制服ジャケット（シングルの前合わせに金色ボタン、肩章、左胸に銀色の識別章）＋内側に薄青の制服シャツと紺のネクタイ','濃紺の制服スラックス','黒の革靴',2,'winter','濃紺の制帽（黒つば・黒あご紐・金色の帽章風エンブレムのみ。文字は入れない）'],
      ['警察官の活動服風（出動服スタイル）','the field-duty uniform of the Ashikusa Prefectural Police — a navy duty top with a silver identification badge on the left chest and the back marked with the Japanese characters "足草県警察" above "POLICE" (render both lines exactly, crisp and unbroken), with navy duty pants','紺の活動服上衣（左胸に銀色の識別章、背中に「足草県警察」と「POLICE」を2段表記。文字は正確に表記し崩さない）','紺の活動服パンツ','編み上げブーツ',2,'','紺のキャップ型活動帽（正面に金色の英字「POLICE」のみ。漢字の刺繍は入れない）'],
      ['交通機動隊風の乗車服（白ヘルメット着用）','a traffic-motorcycle-unit rider uniform (white riding helmet worn)','乗車服の上衣','乗車用パンツ','ライディングブーツ',1,'','白のライディングヘルメット'],
      ['機動隊警備服・夏（シャツ×装備ベスト）','the summer security-duty uniform of the Ashikusa Prefectural Police riot unit — a light-blue uniform shirt (short sleeves, or long sleeves rolled up, with a dark-navy yoke on the top of the shoulders and upper back only (the sleeves are plain light blue with no dark cuff trim)) under a navy multi-pocket equipment vest with a front zipper, the back of the vest marked in white two-line lettering "足草県警察" over "POLICE" (render exactly), navy slacks bloused into black lace-up half boots with two buckle straps','薄青の制服シャツ（半袖、または長袖の袖まくり。濃紺のヨークは肩の上面と背面上部のみで、袖は水色一色（袖口に濃紺の縁取りや切替を入れない））の上に紺の装備ベスト（前面ファスナー・多ポケット、背中に白文字2段で「足草県警察」と「POLICE」を表記。文字は正確に表記し崩さない）を着用','紺のスラックス（裾は半長靴にブーツイン）','黒革の編み上げ半長靴（甲に2本のバックルストラップ付き）',1,'summer','濃紺の制帽（黒つば・黒あご紐・金色の帽章風エンブレムのみ。文字は入れない）※紺のアポロキャップ型活動帽（金色の英字「POLICE」のみ）でも可'],
      ['機動隊警備服・冬（防寒ブルゾン）','the winter security-duty uniform of the Ashikusa Prefectural Police riot unit — a navy cold-weather blouson with a fleece-lined collar, a gold-button flap-and-zip front, flap chest pockets, an English-only shield-shaped patch on the left shoulder, and the back marked in white two-line lettering "足草県警察" over "POLICE" (render exactly), worn over a white shirt and navy tie, with black gloves and navy slacks bloused into two-buckle half boots','紺の防寒ブルゾン（襟にボアライナー、前面は金ボタン留めフラップ＋ファスナー、胸フラップポケット、左肩に盾形の英字ワッペンのみで漢字なし、背中に白文字2段で「足草県警察」と「POLICE」を表記。文字は正確に表記し崩さない）＋内側に白シャツと紺のネクタイ、黒手袋','紺のスラックス（裾は半長靴にブーツイン）','黒革の編み上げ半長靴（甲に2本のバックルストラップ付き）',1,'winter','濃紺の制帽（黒つば・黒あご紐・金色の帽章風エンブレムのみ。文字は入れない）※紺のアポロキャップ型活動帽（金色の英字「POLICE」のみ）でも可'],
      ['機動隊警備服・春秋（警備ジャケット）','the spring-autumn security-duty uniform of the Ashikusa Prefectural Police riot unit — a navy open-collar guard jacket with a single row of gold buttons, four flap pockets on the chest and waist, shoulder straps, an English-only shield-shaped patch on the left shoulder, worn over a light shirt and navy tie with white gloves, a radio clipped to the chest, and navy slacks bloused into two-buckle half boots','紺の警備ジャケット（開襟・金ボタン単列、胸と腰に4つのフラップポケット、肩章、左肩に盾形の英字ワッペンのみで漢字なし）＋白または薄青のシャツと紺のネクタイ、白手袋、胸に無線機','紺のスラックス（裾は半長靴にブーツイン）','黒革の編み上げ半長靴（甲に2本のバックルストラップ付き）',1,'','濃紺の制帽（黒つば・黒あご紐・金色の帽章風エンブレムのみ。文字は入れない）※紺のアポロキャップ型活動帽（金色の英字「POLICE」のみ）でも可']
    ],
    '自衛官': [
      ['緑系迷彩の作業服＋半長靴＋識別帽','the instantly recognizable green camouflage fatigues of a Japan self-defense force member with half boots and a field cap','制服上衣','制服パンツ','制式の靴',4,'','制帽'],
      ['陸上自衛隊風の迷彩作業服','a JGSDF-style camouflage work uniform','迷彩の作業服上衣','迷彩の作業服パンツ','ミリタリーブーツ',5,'','迷彩柄のキャップ型作業帽'],
      ['陸自の常装制服風（紫紺）','a JGSDF-style dress uniform (dark purplish navy)','常装制服の上衣','常装制服のスラックス','黒の革靴',2,'','紫紺色の制帽（金色の帽章風エンブレム）'],
      ['海自の夏制服風（白）','a JMSDF-style white summer uniform','白の制服上衣','白の制服スラックス','黒の革靴',1,'summer','白の制帽（黒つば・金色の帽章風エンブレム）'],
      ['空自の制服風（青）','a JASDF-style blue uniform','青の制服上衣','青の制服スラックス','黒の革靴',1,'','濃い青系の制帽（金色の帽章風エンブレム）']
    ],
    '救急隊員': [
      ['救急隊の活動服（白シャツ＋紺パンツ）','the ambulance-crew duty uniform of the Ashikusa Fire Department — a white duty shirt with a silver rank bar on the left chest only (no lettered patches on the shirt) and navy duty pants','白の活動シャツ（左胸に銀色の階級章バーのみで、文字入りのワッペンは付けない。肩の紋章なし）','紺の活動パンツ','白系の活動シューズ',1,'','紺のアポロキャップ型活動帽（正面に金色の英字刺繍「ASHIKUSA FIRE DEPT.」のみ。漢字の刺繍は入れない）']
    ],
    '防衛大学校学生': [
      ['防衛大学校の常装冬服風（花紺色の詰襟型短ジャケット）','an NDA-style winter dress uniform — a very dark navy (near-black) waist-length stand-collar short jacket with a concealed zip front and no visible buttons, a single black braid line down the center front, black braid trim on the hem, lower sides, and lower sleeves, a thin white collar liner showing inside the stand collar and cuffs, gold collar-badge-style emblems on both collar tips, small gold star-shaped ornaments above the sleeve braid, and no front pockets','花紺色（黒に近い濃紺）の詰襟型短ジャケット（腰丈・立襟、前面はボタンの見えないファスナー留めの比翼仕立てで前中央に黒の飾線が縦に1本、裾まわり・両脇下部・袖下部にも黒の飾線、襟と袖口の内側から白いカラーが細く覗く、両襟に金色の襟章風エンブレム、袖の飾線の上に小さな金色の星形飾り、前面ポケットなし）','濃紺の制服スラックス','黒のプレーントゥ外羽根の短靴（履き込んだ使用感はあるが、つま先だけ鏡面のように磨き上げてある）',3,'winter','花紺色の制帽（黒つば・黒の帽体バンド・顎ひも・金色の帽章風エンブレム）'],
      ['防衛大学校の第1種夏服風（白の詰襟上下）','an NDA-style Type-1 white summer uniform — a white waist-length stand-collar short jacket, hook-fastened at the throat, with a concealed button-free all-white front, gold collar-badge-style emblems on both collar tips, small gold buttons at the cuffs, no front pockets, worn with white trousers','白の詰襟型短ジャケット（腰丈・立襟、襟元はホック留め、前面はボタンの見えない比翼仕立てで装飾のない白一色、両襟に金色の襟章風エンブレム、袖口に小さな金色ボタン、前面ポケットなし）','白の制服ズボン','黒のプレーントゥ外羽根の短靴（履き込んだ使用感はあるが、つま先だけ鏡面のように磨き上げてある）',2,'summer','白覆いの制帽（黒つば・黒の帽体バンド・金色の帽章風エンブレム）'],
      ['防衛大学校の第3種夏服風（白の半袖開襟シャツ）','an NDA-style Type-3 summer uniform — a white short-sleeve open-collar shirt with an open collar and no tie, white front buttons, two white-buttoned flap chest pockets and shoulder straps, tucked into white trousers with a silver-buckled white belt','白の半袖開襟シャツ（開いた襟元・ノーネクタイ、前面に白ボタン、両胸に白ボタン留めのフラップ付きポケット、肩章、裾はズボンにタックイン）','白の制服ズボン（銀色バックルの白ベルト）','黒のプレーントゥ外羽根の短靴（履き込んだ使用感はあるが、つま先だけ鏡面のように磨き上げてある）',2,'summer','白覆いの制帽（黒つば・金色の帽章風エンブレム）'],
      ['防衛大学校の校内服装（水色シャツ＋ネクタイ）','an NDA-style on-campus uniform — a light-blue long-sleeve shirt with a pointed collar, buttoned front placket, two buttoned-flap chest pockets, shoulder straps, and buttoned cuffs, worn with a plain navy necktie held by a tie bar, tucked into dark blue trousers with a black belt','水色の長袖制服シャツ（尖った通常襟、前立てにボタン、両胸にボタン留めフラップ付きポケット、肩章、袖口はボタン留め、裾はスラックスにタックイン）＋紺の無地ネクタイ（タイピンで留める）','青紺色の制服スラックス（黒ベルト）','黒のプレーントゥ外羽根の短靴（履き込んだ使用感はあるが、つま先だけ鏡面のように磨き上げてある）',3,'','青紺色のキャップ型略帽（帽章風エンブレム）','ブルーのMA-1型ジャンパー（オレンジ色の裏地、リブ編みの襟・袖口・裾、ファスナー留め）'],
      ['防衛大学校の作業服装（65式作業服と同型・OD色）','an NDA work uniform of the same pattern as the Type-65 fatigues (olive-drab / moss-green cotton work clothes with chest pockets)','モスグリーン（OD色）の綿作業服上衣（胸ポケット付き）','モスグリーン（OD色）の作業服パンツ','黒のベルクロ（面ファスナー）留めトレーニングシューズ型の作業靴',2,'','OD色のキャップ型作業帽']
    ]
,
    '看護師': [
      ['ネイビーのスクラブ＋ナースシューズ','navy medical scrubs of the fictional Ashikusa General Hospital — a short-sleeve V-neck scrub top with a staff ID card clipped to the chest, navy scrub pants and white lightweight nurse shoes; do not reproduce any real hospital logo','ネイビーの半袖Vネックスクラブトップス（ポリエステル混、胸に「足草総合病院」の院内IDカード）','ネイビーのスクラブパンツ','白の軽量ナースシューズ（スニーカー型）',4,'era>=1990'],
      ['ネイビーのスクラブ＋医療用サンダル','navy scrubs of Ashikusa General Hospital worn with white heel-strap medical sandals over white socks','ネイビーの半袖Vネックスクラブトップス（胸に「足草総合病院」の院内IDカード）','ネイビーのスクラブパンツ','白の医療用サンダル（かかとバンド付き・白ソックス着用）',3,'era>=1990'],
      ['ワインレッドのスクラブ','wine-red scrubs (ward color) of Ashikusa General Hospital with white nurse shoes','ワインレッドの半袖Vネックスクラブトップス（胸に院内IDカード）','ワインレッドのスクラブパンツ','白の軽量ナースシューズ（スニーカー型）',2,'era>=1990'],
      ['白のケーシー型白衣','a white case-style（stand-collar, side-button）medical tunic with white slacks and heel-strap medical sandals over white socks','白のケーシー型上衣（立ち襟・肩口ボタン）','白のスラックス','白の医療用サンダル（かかとバンド付き・白ソックス着用）',2,'']
    ],
    '研修医': [
      ['スクラブ＋聴診器＋医療用サンダル','navy scrubs of Ashikusa General Hospital with a stethoscope around the neck, a resident ID card, and white heel-strap medical sandals over white socks','ネイビーの半袖スクラブトップス（首に聴診器、胸に「足草総合病院」の研修医IDカード）','ネイビーのスクラブパンツ','白の医療用サンダル（かかとバンド付き・白ソックス着用）',5,'era>=1990'],
      ['スクラブ＋白の半袖ケーシー','navy scrubs layered under a white short-sleeve case-style tunic, with white sneakers','スクラブの上に白の半袖ケーシー型上衣（胸に院内IDカード）','ネイビーのスクラブパンツ','白のスニーカー',2,'']
    ],
    '医師': [
      ['白の長袖ドクターコート＋院内サンダル','a doctor of Ashikusa General Hospital — a long white doctor coat over a shirt and slacks, hospital sandals worn indoors with socks','白の長袖ドクターコート（胸に「足草総合病院」の名札）、中はシャツ（ノータイ可）','グレーのスラックス','白の医療用サンダル（かかとバンド付き・ソックス着用）',4,''],
      ['白の長袖ドクターコート＋革靴','a long white doctor coat over a shirt and slacks with leather shoes (outpatient / meeting day)','白の長袖ドクターコート（胸に名札）、中はシャツ','チャコールのスラックス','黒の革靴',2,''],
      ['スクラブ単体（手術部門）','surgical-department scrubs of Ashikusa General Hospital (no cap) with medical sandals','ネイビーの半袖スクラブトップス（胸に院内IDカード）','ネイビーのスクラブパンツ','白の医療用サンダル（かかとバンド付き・白ソックス着用）',3,'era>=1990'],
      ['白ケーシー＋黒スラックス（外来）','a white case-style tunic with black slacks and medical sandals','白のケーシー型上衣（立ち襟・肩口ボタン、胸に名札）','黒のスラックス','白の医療用サンダル（かかとバンド付き・白ソックス着用）',2,'']
    ],
    '歯科医師': [
      ['白のケーシー＋医療用サンダル','a dentist of the fictional Ashikusa Dental Clinic — a white-to-pale-blue case-style tunic, white pants, and white heel-strap medical sandals over white socks','白〜サックスのケーシー型上衣（立ち襟・肩口ボタン、胸に「足草歯科クリニック」の名札）','白のパンツ','白の医療用サンダル（かかとバンド付き・白ソックス着用）',5,''],
      ['ミントグリーンのスクラブ','mint-green scrubs of Ashikusa Dental Clinic with medical sandals','ミントグリーンの半袖スクラブトップス（胸に名札）','ミントグリーンのスクラブパンツ','白の医療用サンダル（かかとバンド付き・白ソックス着用）',3,'era>=1995']
    ],
    '薬剤師': [
      ['ハーフ丈白衣＋医療用サンダル','a pharmacist of the fictional Ashikusa Pharmacy — a half-length white lab coat over a shirt and chinos, with heel-strap medical sandals over socks','白のハーフ丈薬局衣（胸に「足草薬局」の名札）、中はシャツ','ベージュのチノパン','白の医療用サンダル（かかとバンド付き・ソックス着用）',3,''],
      ['ハーフ丈白衣＋白スニーカー','a half-length white pharmacy coat over a shirt and chinos with white sneakers','白のハーフ丈薬局衣（胸に名札）、中はシャツ','ネイビーのチノパン','白のスニーカー',2,''],
      ['ポロ＋店舗エプロン（ドラッグストア）','a drugstore-style staff polo with a store apron and sneakers','スタッフポロシャツ（無地・胸に名札）＋店舗の胸当てエプロン','黒のチノパン','黒のスニーカー',2,'era>=2000']
    ],
    '理学療法士': [
      ['白×ネイビーのケーシー＋トレーニングシューズ','a physical therapist of the fictional Ashikusa Rehabilitation Hospital — a white-and-navy case-style tunic with jersey pants and indoor training shoes (no sandals, for patient-transfer safety)','白×ネイビーのケーシー型上衣（胸に「足草リハビリテーション病院」の名札）','ネイビーのジャージパンツ','白の室内用トレーニングシューズ',5,''],
      ['スタッフポロ＋ストレッチパンツ','a staff polo with stretch pants and sneakers','スタッフポロシャツ（ネイビー・胸に名札）','黒のストレッチパンツ','黒のスニーカー',3,'']
    ],
    '介護士': [
      ['施設ポロ＋チノ','a caregiver of the fictional Ashikusa Care Home — a pale staff polo with the facility name embroidered on the chest, chinos and non-slip sneakers','淡いブルーの施設ポロシャツ（胸に「足草ケアホーム」の刺繍名札）','ベージュのチノパン','滑りにくい白のスニーカー',5,''],
      ['ジャージ上下','a facility jersey set for active care work','施設ジャージの上（ハーフジップ・胸に名札）','ジャージパンツ','滑りにくいスニーカー',2,'']
    ],
    'パイロット': [
      ['白の半袖パイロットシャツ','an airline pilot of the fictional Ashikusa Airlines — a white short-sleeve pilot shirt with black-and-gold four-stripe epaulettes, a black tie, black slacks and black leather shoes; do not reproduce any real airline logo','白の半袖パイロットシャツ（黒×金4本線の肩章、黒ネクタイ、胸に「ASHIKUSA AIRLINES」のウイング章風バッジ）','黒の制服スラックス','黒の革靴',5,'','パイロット制帽（黒つば・金の帽章風エンブレム）'],
      ['黒のダブルジャケット制服','the full uniform with a black double-breasted jacket bearing four gold sleeve stripes over the pilot shirt, with the pilot cap','白のパイロットシャツの上に黒のダブルジャケット（袖に金4本線、胸にウイング章風バッジ）、黒ネクタイ','黒の制服スラックス','黒の革靴',3,'','パイロット制帽（黒つば・金の帽章風エンブレム）']
    ],
    '電車運転士': [
      ['濃紺の鉄道制服（通年）','a train driver of the fictional Ashikusa Railway — a dark-navy single-breasted railway uniform with a necktie, white gloves and a peaked cap; do not reproduce any real railway logo','濃紺のシングル制服ジャケット（金ボタン、胸に「足草鉄道」の徽章風バッジ）、中は白シャツ＋ネイビーのネクタイ、白手袋','濃紺の制服スラックス','黒の革靴',5,'','濃紺の制帽（黒つば・金の帽章風エンブレム）'],
      ['夏制服（半袖シャツ）','the summer uniform — a light-gray short-sleeve uniform shirt with a name badge, worn with the peaked cap and white gloves','薄いグレーの半袖制服シャツ（胸に名札と徽章風バッジ）、白手袋','濃紺の制服スラックス','黒の革靴',3,'summer','濃紺の制帽（黒つば・金の帽章風エンブレム）']
    ],
    '鉄道職員': [
      ['昭和の国鉄型制服','a Showa-era national-railway style station uniform of the fictional Ashikusa National Railway — a dark-navy tunic with gold buttons, a duty armband and a peaked cap','濃紺の国鉄型制服上衣（金ボタン、腕に業務腕章、胸に「足草国鉄」の徽章風バッジ）','濃紺の制服スラックス','黒の革靴',5,'era<=1987','濃紺の制帽（黒つば・金の帽章風エンブレム）'],
      ['旧型の詰襟寄り制服','an older stand-collar style national-railway uniform with a peaked cap','詰襟に近い濃紺の旧型制服上衣（金ボタン）','濃紺の制服スラックス','黒の革靴',2,'era<=1987','濃紺の制帽（黒つば・金の帽章風エンブレム）'],
      ['現代の鉄道制服','a modern station staff uniform of the fictional Ashikusa Railway — a dark-navy single-breasted jacket with a necktie and a peaked cap; do not reproduce any real railway logo','濃紺のシングル制服ジャケット（胸に「足草鉄道」の徽章風バッジ）、中は白シャツ＋ネイビーのネクタイ','濃紺の制服スラックス','黒の革靴',5,'era>=1988','濃紺の制帽（黒つば・銀の帽章風エンブレム）'],
      ['現代の夏制服（半袖シャツ）','the modern summer uniform — a pale-blue short-sleeve uniform shirt with a name badge and the peaked cap','淡いブルーの半袖制服シャツ（胸に名札と徽章風バッジ）','濃紺の制服スラックス','黒の革靴',3,'summer+era>=1988','濃紺の制帽（黒つば・銀の帽章風エンブレム）']
    ],
    'バス運転手': [
      ['水色シャツの運転士制服','a bus driver of the fictional Ashikusa Kotsu — a light-blue uniform shirt with navy slacks, white gloves and a peaked cap; do not reproduce any real bus company logo','水色の制服シャツ（胸に「足草交通」の名札）、白手袋','ネイビーの制服スラックス','黒の革靴',5,'','ネイビーの制帽（黒つば・銀の帽章風エンブレム)'],
      ['冬制服（ベスト付き）','the winter uniform with a navy vest and necktie over the uniform shirt','水色の制服シャツの上にネイビーのベスト＋ネクタイ、白手袋','ネイビーの制服スラックス','黒の革靴',2,'winter','ネイビーの制帽（黒つば・銀の帽章風エンブレム)']
    ],
    'タクシー運転手': [
      ['白シャツ＋ネクタイの乗務服','a taxi driver of the fictional Ashikusa Taxi — a white dress shirt with a necktie, black slacks and white gloves; no real company badges','白の長袖シャツ（ネイビーのネクタイ、胸に「足草タクシー」の乗務員証）、白手袋','黒のスラックス','黒の革靴',5,''],
      ['紺の制服ジャケット','a navy uniform jacket over the shirt and tie, with white gloves','白シャツ＋ネクタイの上に紺の制服ジャケット（胸に乗務員証）、白手袋','黒のスラックス','黒の革靴',2,'winter']
    ],
    '郵便配達員': [
      ['夏の配達服（ポロ型）','a mail carrier of the fictional Ashikusa Post — a pale-blue polo-type delivery shirt with navy pants and a delivery helmet; do not reproduce any real postal logo','淡いブルーのポロ型配達シャツ（胸に「足草郵便」のワッペン風マーク）','ネイビーの配達パンツ','黒のスニーカー',4,'summer','白の配達用ヘルメット（あご紐付き）'],
      ['冬の配達ブルゾン','the winter delivery blouson in navy with the fictional Ashikusa Post mark, worn with the delivery helmet','ネイビーの配達ブルゾン（胸に「足草郵便」のワッペン風マーク）','ネイビーの配達パンツ','黒のスニーカー',4,'winter','白の配達用ヘルメット（あご紐付き）']
    ],
    '警備員': [
      ['施設警備の紺制服','a security guard of the fictional Ashikusa Security — a dark-navy guard uniform with shoulder emblems, a necktie and a peaked cap; do not reproduce any real security company logo','濃紺の警備制服上衣（肩に「足草警備保障」のワッペン風エンブレム、ネクタイ）','濃紺の制服スラックス','黒の革靴',5,'','濃紺の制帽（銀の帽章風エンブレム）'],
      ['交通誘導の作業服＋反射ベスト','a traffic-control guard outfit — a work uniform with a high-visibility reflective vest and a white helmet','グレーの作業服上衣の上に蛍光イエローの反射ベスト（「足草警備保障」の文字）','グレーの作業服パンツ','黒の安全スニーカー',3,'','白のヘルメット（あご紐付き）']
    ],
    'ライフガード': [
      ['赤のラッシュガード','a lifeguard of the fictional Ashikusa Beach Patrol — a red rash guard with GUARD lettering, surf shorts, a whistle on a lanyard and a red cap; barefoot in beach sandals','赤の半袖ラッシュガード（胸と背に白で「GUARD」、首からホイッスル）','赤×白のサーフパンツ','ビーチサンダル（素足）',5,'','赤のキャップ（白で「GUARD」）'],
      ['赤タンクトップ','a red guard tank top with board shorts, whistle and cap','赤のタンクトップ（「GUARD」ロゴ、首からホイッスル）','赤のハーフパンツ','ビーチサンダル（素足）',3,'summer','赤のキャップ（白で「GUARD」）']
    ],
    'プール監視員（バイト）': [
      ['監視員のスタッフTシャツ','a pool lifeguard staff tee with STAFF on the back, half pants, a whistle and a cap; sports sandals barefoot','スタッフTシャツ（背中に「STAFF」、首からホイッスル）','ネイビーのハーフパンツ','スポーツサンダル（素足）',5,'','白のキャップ（「足草市民プール STAFF」)']
    ],
    '寿司職人': [
      ['白の調理白衣＋和帽子','a sushi chef in a white chef tunic with a traditional low chef hat and a navy apron, white kitchen sandals over white socks','白の調理白衣（詰め袖・清潔なプレス）＋紺の前掛け','白の調理ズボン','白のキッチンサンダル（白ソックス着用）',5,'','白の和帽子（船形）'],
      ['紺の作務衣＋前掛け','a navy samue work jacket with an apron and setta sandals','紺の作務衣上衣＋生成りの前掛け','紺の作務衣パンツ','雪駄（白ソックス）',3,'']
    ],
    'パティシエ': [
      ['白のコックコート＋トック','a pâtissier in a white double-breasted chef coat with a tall toque and a black apron, white kitchen shoes','白のコックコート（比翼ダブルボタン）＋黒のロングエプロン','黒のコックパンツ','白のキッチンシューズ',5,'','白のトック帽（高め）'],
      ['シャツ＋胸当てエプロン','a café-patisserie style shirt with a bib apron','白のバンドカラーシャツ＋ブラウンの胸当てエプロン','黒のチノパン','黒のスニーカー',2,'']
    ],
    'ラーメン店店主': [
      ['黒T＋作務衣風上衣＋タオル鉢巻','a ramen shop owner in a black tee under a samue-style jacket with an apron and a towel headband, black kitchen sandals','黒Tシャツの上に黒の作務衣風上衣＋黒の前掛け','黒の作務衣パンツ','黒のキッチンサンダル（黒ソックス）',5,'','白タオルの鉢巻き'],
      ['白の調理衣＋前掛け','a white cook jacket with an apron','白の調理衣＋紺の前掛け','黒の調理ズボン','黒のキッチンシューズ',3,'']
    ],
    'シェフ（洋食）': [
      ['白のコックコート','a western-cuisine chef in a classic white double-breasted chef coat with salt-and-pepper checked pants and a chef hat','白のコックコート（比翼ダブルボタン・左胸に刺繍名）','ソルト＆ペッパー柄（千鳥格子）のコックパンツ','黒のキッチンシューズ',5,'','白のコック帽'],
      ['黒のコックコート（ビストロ）','a modern bistro-style black chef coat with a long apron','黒のコックコート＋黒のロングエプロン','黒のコックパンツ','黒のキッチンシューズ',2,'era>=2005']
    ],
    'ホテルスタッフ': [
      ['フロント制服','a front-desk staff of the fictional Ashikusa Grand Hotel — a black jacket with a vest and necktie and a gold name plate; do not reproduce any real hotel logo','黒のジャケット＋黒のベスト＋シルバーグレーのネクタイ（胸に「足草グランドホテル」の金色ネームプレート）','黒のスラックス','黒の革靴',5,''],
      ['ベルスタッフ風の丸襟ジャケット','a bell-staff style round-collar jacket with gold buttons','丸襟のネイビージャケット（金ボタン、胸にネームプレート）','ネイビーのスラックス','黒の革靴',2,'','ベルボーイキャップ（ネイビー・金パイピング）']
    ],
    'コンビニ店長': [
      ['店舗ユニフォームベスト','a convenience store manager of the fictional Ashikusa Mart — a striped store uniform vest over a shirt with a name badge; do not reproduce any real chain logo','白シャツの上にブルー系ストライプの店舗ユニフォームベスト（胸に「足草マート・店長」の名札）','黒のチノパン','黒のスニーカー',5,'']
    ],
    'スーパー店員': [
      ['店舗エプロン＋ポロ','a supermarket staff of the fictional Ashikusa Store — a green bib apron over a polo shirt with a name badge','ポロシャツの上にグリーンの胸当てエプロン（胸に「足草ストア」の名札）','黒のチノパン','黒のスニーカー',5,''],
      ['鮮魚・青果部門の前掛け＋長靴','a fresh-food section outfit with a waterproof apron, arm covers and boots','ポロシャツの上に防水の白い前掛け＋腕カバー（胸に名札）','黒のチノパン','白の長靴',2,'']
    ],
    '家電量販店店員': [
      ['店舗ポロ＋名札','an electronics store staff of the fictional Ashikusa Denki — a store polo with a lanyard name card and slacks; do not reproduce any real chain logo','店舗カラー（ブルー）のポロシャツ（首から「足草電機」の名札ストラップ）','黒のスラックス','黒の革靴',5,'era>=2000'],
      ['シャツ＋店舗ベスト','a dress shirt with a store vest and lanyard name card','白シャツの上にブルーの店舗ベスト（首から名札ストラップ）','黒のスラックス','黒の革靴',3,'']
    ]
  };

  function chooseUniformVariant(role, season, eraYear){
    const list = UNIFORM_VARIANTS[role];
    if(!list) return null;
    const ey = Number(eraYear) || 2026;
    const entries = list.map(v=>{
      let w = v[5] || 1;
      // V4.6.1: フラグは'+'区切りで複合可（summer/winter/era<=YYYY/era>=YYYY）
      for(const f of String(v[6]||'').split('+').filter(Boolean)){
        if(f === 'summer') w = season === '夏' ? w * 4 : (season === '冬' ? Math.max(0.2, w * 0.2) : w);
        else if(f === 'winter') w = season === '冬' ? w * 3 : (season === '夏' ? Math.max(0.3, w * 0.3) : w);
        else { const m = f.match(/^era(<=|>=)(\d+)$/); if(m){ const yy = +m[2]; if(m[1]==='<=' && ey > yy) w = 0; if(m[1]==='>=' && ey < yy) w = 0; } }
      }
      if(/装備ベストあり/.test(String(v[0])) && ey < 2005) w = 0;
      return [v, w];
    }).filter(e => e[1] > 0);
    return weighted(entries);
  }

  function occupationOutfitWeights(occ){
    const cat = OCC_CAT[occ];
    const special = {
      '銀行員':[['紺スーツ',4],['グレースーツ',3]], '公務員':[['グレースーツ',3],['紺スーツ',2],['社会人カジュアル',1]],
      'ミュージシャン':[['ストリート系',3],['大学生カジュアル',2]], 'アパレル店員':[['ストリート系',2],['ジャケットスタイル',2],['大学生カジュアル',2]],
      'ジムトレーナー':[['スポーツ練習着',3],['大学生カジュアル',2]], 'スポーツインストラクター':[['スポーツ練習着',3],['大学生カジュアル',2]], 'プロスポーツ選手':[['スポーツ練習着',3],['社会人カジュアル',1]],
      'バーテンダー':[['黒スーツ',3],['ジャケットスタイル',2]], 'ホテルスタッフ':[['紺スーツ',2],['ジャケットスタイル',2]], '喫茶店マスター':[['ジャケットスタイル',3],['社会人カジュアル',2]],
      'お笑い芸人':[['大学生カジュアル',2],['ジャケットスタイル',2],['ストリート系',1]], 'YouTuber':[['ストリート系',3],['大学生カジュアル',2]], 'プロゲーマー':[['大学生カジュアル',3],['ストリート系',2],['スポーツ練習着',1]], '声優':[['社会人カジュアル',2],['大学生カジュアル',2]],
      '書道家':[['ジャケットスタイル',2],['社会人カジュアル',2]], 'パティシエ':[['社会人カジュアル',3],['大学生カジュアル',1]], '寿司職人':[['社会人カジュアル',3],['大学生カジュアル',1]], 'ラーメン店店主':[['社会人カジュアル',3],['大学生カジュアル',1]], '僧侶':[['社会人カジュアル',3],['ジャケットスタイル',1]], '古着屋店主':[['ストリート系',3],['大学生カジュアル',2]], '悠々自適（定年後）':[['社会人カジュアル',3],['ジャケットスタイル',1],['大学生カジュアル',1]]
    };
    if(special[occ]) return special[occ];
    const byCat = {
      student:[['大学生カジュアル',3],['私服通学風',2],['ストリート系',1]],
      office:[['紺スーツ',3],['グレースーツ',2],['ジャケットスタイル',2],['社会人カジュアル',1]],
      it:[['社会人カジュアル',3],['大学生カジュアル',2],['ジャケットスタイル',1]],
      medical:[['社会人カジュアル',3],['私服通学風',1],['ジャケットスタイル',1]],
      edu:[['ジャケットスタイル',3],['社会人カジュアル',2],['グレースーツ',1]],
      service:[['社会人カジュアル',2],['大学生カジュアル',2],['ジャケットスタイル',1]],
      trade:[['社会人カジュアル',3],['大学生カジュアル',2],['スポーツ練習着',1]],
      creative:[['社会人カジュアル',2],['ストリート系',2],['ジャケットスタイル',2]],
      uniform:[['社会人カジュアル',2],['スポーツ練習着',2],['大学生カジュアル',1]],
      showa:[['グレースーツ',2],['ジャケットスタイル',2],['社会人カジュアル',2]]
    };
    return byCat[cat] || [];
  }

  function occupationBodyWeights(occ){
    const HARD_ATHLETIC = ['消防士','警察官','自衛官','救急隊員','防衛大学校学生','プロスポーツ選手'];
    if(occ==='プロスポーツ選手') return {weights:[['引き締まったスポーツ体型',3],['ラグビー選手体型',2],['バスケットボール選手体型',2],['水泳選手体型',2],['陸上短距離選手体型',2],['サッカー選手体型',2],['筋肉質',2]], exclude:['やせ型','ぽっちゃり','腹だけぽっちゃり']};
    if(HARD_ATHLETIC.includes(occ)) return {weights:[['がっしり体型',4],['引き締まったスポーツ体型',4],['筋肉質',2],['柔道家体型',1],['ラグビー選手体型',2]], exclude:['やせ型','華奢な体型','ぽっちゃり','腹だけぽっちゃり']};
    if(ATHLETIC_OCC.includes(occ)) return {weights:[['がっしり体型',3],['引き締まったスポーツ体型',4],['筋肉質',2],['細マッチョ',2],['水泳選手体型',1]], exclude:['ぽっちゃり','腹だけぽっちゃり']};
    if(occ==='モデル') return {weights:[['高身長モデル体型',4],['細身',3]], exclude:['ぽっちゃり','腹だけぽっちゃり','がっしり体型']};
    if(['飲食店店長','喫茶店マスター'].includes(occ)) return {weights:[['腹だけぽっちゃり',1],['ビール腹',1],['標準体型',1]], exclude:null};
    const cat = OCC_CAT[occ];
    const byCat = {
      trade:{weights:[['がっしり体型',2],['標準体型',1]], exclude:null},
      office:{weights:[['スーツ映え体型',1],['標準体型',1]], exclude:null},
      it:{weights:[['細身',1],['やせ型',1]], exclude:null},
      medical:{weights:[['標準体型',1],['細身',1]], exclude:null},
      edu:{weights:[['細身',1],['標準体型',1]], exclude:null},
      service:{weights:[['細身',1],['標準体型',1]], exclude:null},
      creative:{weights:[['細身',1],['やせ型',1]], exclude:null},
      student:{weights:[['細身',1],['標準体型',1]], exclude:null},
      showa:{weights:[['標準体型',1],['がっしり体型',1]], exclude:null},
      uniform:{weights:[['引き締まったスポーツ体型',1],['標準体型',1]], exclude:null}
    };
    return byCat[cat] || null;
  }

  const SPORTS = ['野球','サッカー','バスケットボール','バレーボール','ラグビー','柔道','剣道','陸上短距離','陸上長距離','水泳','テニス','卓球','ボクシング','ゴルフ','自転車ロード','体操'];

  const SPORT_BODY = {
    'ラグビー':[['ラグビー選手体型',6],['がっしり体型',2]], '水泳':[['水泳選手体型',6]], '柔道':[['柔道家体型',6],['がっしり体型',2]],
    'バスケットボール':[['バスケットボール選手体型',6],['高身長モデル体型',2]], 'サッカー':[['サッカー選手体型',6]],
    '陸上短距離':[['陸上短距離選手体型',6]], '陸上長距離':[['陸上長距離選手体型',6],['細身',3]],
    '体操':[['細マッチョ',5],['痩せマッチョ',2]], 'ボクシング':[['細マッチョ',4],['引き締まったスポーツ体型',3]],
    '野球':[['がっしり体型',3],['引き締まったスポーツ体型',3]], 'バレーボール':[['高身長モデル体型',4],['引き締まったスポーツ体型',3]],
    '卓球':[['引き締まったスポーツ体型',4],['細身',3]], 'テニス':[['引き締まったスポーツ体型',4],['細マッチョ',2]],
    'ソフトテニス':[['引き締まったスポーツ体型',3],['細身',3]], 'バドミントン':[['引き締まったスポーツ体型',4],['細身',2]],
    '剣道':[['引き締まったスポーツ体型',3],['細マッチョ',3]], '空手':[['細マッチョ',4],['引き締まったスポーツ体型',3]],
    '相撲':[['がっしり体型',4],['柔道家体型',4],['ぽっちゃり',2]], 'ハンドボール':[['引き締まったスポーツ体型',4],['がっしり体型',2]],
    'レスリング':[['柔道家体型',4],['細マッチョ',3],['がっしり体型',2]], 'スキー':[['引き締まったスポーツ体型',3],['がっしり体型',2]],
    'スケート':[['引き締まったスポーツ体型',3],['細マッチョ',2]], '自転車競技':[['細マッチョ',3],['引き締まったスポーツ体型',3]],
    'ボート':[['がっしり体型',4],['逆三角形体型',3]], 'アメリカンフットボール':[['ラグビー選手体型',5],['がっしり体型',3]],
    'ダンス':[['細マッチョ',4],['痩せマッチョ',3]], 'クライミング':[['クライマー体型',5],['細マッチョ',3]],
    'ゴルフ':[['標準体型',3],['引き締まったスポーツ体型',2]]
  };

  function chooseSport(role, eraYear){
    const y = Number(eraYear) || 2026;
    if(role === 'プロスポーツ選手'){
      return weighted([['野球',5],['サッカー', y >= 1993 ? 5 : 2],['バスケットボール',3],['バレーボール',2],['ラグビー',2],['柔道',2],['剣道',1],['陸上短距離',2],['陸上長距離',2],['水泳',2],['テニス',2],['卓球',1],['ボクシング',2],['ゴルフ',2],['自転車ロード',1],['体操',1]]);
    }
    if(['体育教師','ジムトレーナー','スポーツインストラクター'].includes(role) && rand() < 0.6){
      return pick(SPORTS);
    }
    return 'なし';
  }

  function roleWithSport(c, english=false){
    const hasSport = c.sportName && c.sportName !== 'なし';
    if(english){
      const r = (typeof valueTranslations!=='undefined' && valueTranslations[c.role]) || c.role;
      return hasSport ? `${r} (${(typeof valueTranslations!=='undefined' && valueTranslations[c.sportName]) || c.sportName})` : r;
    }
    return hasSport ? `${c.role}（${c.sportName}）` : (c.role || '');
  }

  const VIBE_OCC = {
    'ギャル男系':{good:['アパレル店員','美容師','古着屋店主','YouTuber'], bad:['銀行員','公務員','僧侶','高校教師','自衛官','研修医','経理・事務職','警察官','消防士','救急隊員','防衛大学校学生']},
    'ヤンキー系':{good:['大工','自動車整備士','配送ドライバー','漁師','電気工事士'], bad:['銀行員','公務員','高校教師','塾講師','僧侶','薬剤師','研修医','看護師']},
    'ホスト系':{good:['バーテンダー','美容師','アパレル店員'], bad:['消防士','警察官','自衛官','僧侶','農家','漁師']},
    '清楚系':{good:['ホテルスタッフ','薬剤師','書店員','経理・事務職','看護師'], bad:['漁師','工場勤務','ラーメン店店主','大工']},
    '紳士系':{good:['ホテルスタッフ','銀行員','商社勤務','コンサルタント','バーテンダー'], bad:['大工','自動車整備士','電気工事士','工場勤務','配送ドライバー','農家','漁師']},
    'オタク系':{good:['ITエンジニア','アプリ開発者','ゲーム開発者','書店員','プロゲーマー','声優'], bad:['モデル','アパレル店員']},
    'おじさん系':{good:['喫茶店マスター','ラーメン店店主','農家','新聞記者','鉄道職員','国鉄職員','寿司職人'], bad:['モデル']},
    'メガネ知的系':{good:['大学研究員','編集者','塾講師','薬剤師','建築士'], bad:[]},
    'ワイルド系':{good:['大工','漁師','自衛官','消防士'], bad:['経理・事務職']},
    'きれいめ系':{good:['アパレル店員','美容師','ホテルスタッフ'], bad:['漁師','工場勤務']},
    'ストリート系':{good:['古着屋店主','YouTuber','ミュージシャン'], bad:['銀行員','公務員','ホテルスタッフ']},
    'バンドマン系':{good:['ミュージシャン','古着屋店主','バーテンダー'], bad:['銀行員','公務員','自衛官']},
    '陽キャ大学生系':{good:['大学生','大学1年生','高校卒業直後（進路準備中）','浪人生（予備校生）','バイト? none'], bad:[]},
    '清潔系ダミー':{good:[], bad:[]}
  };

  function chooseRoleByMbti(age, vibe, mbti, eraYear='2026', gapMode=false){
    const y = Number(eraYear) || 2026;
    const g = {guardian:['ISTJ','ISFJ','ESTJ','ESFJ'], analyst:['INTJ','INTP','ENTJ','ENTP'], social:['ESTP','ESFP','ENFP','ENFJ']};
    const grp = g.guardian.includes(mbti) ? 'guardian' : g.analyst.includes(mbti) ? 'analyst' : g.social.includes(mbti) ? 'social' : 'creative';
    const catW = OCC_MBTI_CAT[grp];
    let entries = OCCUPATIONS.filter(([n,c,since,until,aMin,aMax])=>{
      if(since && y < since) return false;
      if(until && y > until) return false;
      if(aMin && age < aMin) return false;
      if(aMax && age > aMax) return false;
      if(c==='student' && age > 24 && n!=='大学院生') return false;
      return true;
    }).map(([n,c])=>{
      let w = (catW[c] || 1) * (OCC_STAT_W[c] !== undefined ? OCC_STAT_W[c] : 0.6);
      if(n==='人力車の車夫') w *= 0.25; // ニッチ職ロングテール
      if(age <= 22 && c==='student') w += 4;
      if(age > 24 && c==='student') w = Math.max(1, w-1);
      if(y < 1990 && c==='showa') w += 2;
      if(vibe==='スポーツ系' && ATHLETIC_OCC.includes(n)) w += 2;
      if(vibe==='バンドマン系' && n==='ミュージシャン') w += 4;
      if(vibe==='紳士系' && (c==='office' || n==='ホテルスタッフ' || n==='バーテンダー')) w += 2;
      if(vibe==='オタク系' && (c==='it' || n==='書店員' || n==='ゲーム開発者')) w += 2;
      if(vibe==='メガネ知的系' && (c==='edu' || n==='編集者' || n==='大学研究員' || n==='大学院生')) w += 2;
      if((vibe==='ブサイク系' || vibe==='普通系') && n==='お笑い芸人') w += 3;
      if(vibe==='オタク系' && (n==='プロゲーマー' || n==='声優')) w += 2;
      if(vibe==='古着系' && n==='古着屋店主') w += 3;
      if(age >= 60 && ['寿司職人','書道家','僧侶','農家','漁師','喫茶店マスター','大工','俳優','塾講師','ラーメン店店主'].includes(n)) w += 2;
      if(age >= 62 && n==='悠々自適（定年後）') w += 3;
      if(!gapMode && VIBE_OCC[vibe]){
        if(VIBE_OCC[vibe].good.includes(n)) w = w * 3 + 3;
        if(VIBE_OCC[vibe].bad.includes(n)) w = w * 0.3;
      }
      return [n, w];
    });
    return weighted(entries) || '営業職';
  }

  const ETHNIC_HAIR_WEIGHTS = {
    '日本人':[['黒',6],['黒に近いダークブラウン',1]],
    '中国系':[['黒',6],['黒に近いダークブラウン',1]],
    '東アジア系':[['黒',6],['ブルーブラック',1]],
    '中央アジア系':[['黒',5],['黒に近いダークブラウン',2]],
    'ミックス':[['黒',4],['黒に近いダークブラウン',2],['自然な茶髪',1]],
    'スラブ系':[['ダークブロンド',6],['自然な茶髪',5],['ナチュラルブロンド',4],['黒に近いダークブラウン',3],['黒',1]],
    '北欧系':[['ナチュラルブロンド',7],['ダークブロンド',5],['自然な茶髪',3]],
    '南欧系':[['黒に近いダークブラウン',4],['黒',3],['チョコレートブラウン',2]],
    '韓国系':[['黒',6],['ブルーブラック',1]],
    '東南アジア系':[['黒',6],['黒に近いダークブラウン',1]],
    '南アジア系':[['黒',7]],
    '黒人系':[['黒',8]],
    '中東系':[['黒',7]],
    'ラテン系':[['黒に近いダークブラウン',5],['黒',3]],
    '白人系':[['自然な茶髪',4],['アッシュブラウン',3],['グレージュ',2],['黒',1]],
    'ミックス系':[['黒',4],['黒に近いダークブラウン',2],['自然な茶髪',1]]
  };

  const STRICT_HAIR_OCC = ['銀行員','公務員','警察官','消防士','自衛官','救急隊員','防衛大学校学生','ホテルスタッフ','商社勤務','研修医','看護師','高校教師','僧侶','新聞記者','鉄道職員','国鉄職員','経理・事務職'];

  const FREE_HAIR_OCC = ['美容師','アパレル店員','ミュージシャン','YouTuber','お笑い芸人','古着屋店主','モデル','俳優','バーテンダー','プロゲーマー','動画クリエイター'];

  function occupationHairWeights(occ){
    if(STRICT_HAIR_OCC.includes(occ)) return [['黒',4],['黒に近いダークブラウン',1]];
    if(FREE_HAIR_OCC.includes(occ)) return [['明るめブラウン',3],['アッシュブラウン',3],['グレージュ',2],['自然な茶髪',2],['ハイトーンアッシュ',1]];
    return null;
  }

  function occupationFaceWeights(occ){
    const special = {
      'お笑い芸人':[['ブサイク系',2],['普通顔',2],['やんちゃ系',1]],
      'モデル':[['高身長モデル系',3],['清潔感のある若手俳優風',1]],
      '俳優':[['清潔感のある若手俳優風',2],['日本の若手俳優風',2]],
      'バーテンダー':[['ミステリアス系',1],['クール系',1],['落ち着いた大人系',1]],
      '僧侶':[['落ち着いた大人系',2],['真面目系',1]]
    };
    if(special[occ]) return special[occ];
    const cat = OCC_CAT[occ];
    const byCat = {
      office:[['スーツ映え社会人系',2],['真面目系',1],['爽やか知的アナウンサー系',1]],
      uniform:[['体育会系スポーツ男子',2],['ワイルド系',1]],
      edu:[['真面目系',1],['落ち着いた大人系',1]],
      medical:[['真面目系',1],['清潔感のある若手俳優風',1]],
      it:[['普通顔',1],['真面目系',1]],
      creative:[['サブカル系',1],['塩顔系',1]],
      enta:[['やんちゃ系',1],['普通顔',1]],
      trade:[['ワイルド系',1],['普通顔',1]],
      service:[['親しみやすい大学生系',1],['普通顔',1]],
      showa:[['昭和顔（濃い顔立ち）',2],['落ち着いた大人系',1]]
    };
    return byCat[cat] || null;
  }

  const SPORT_STAGES = ['幼稚園','小学校','中学校','高校','大学','社会人'];

  function maxStageForAge(age){ if(age>=23) return 5; if(age>=19) return 4; if(age>=16) return 3; if(age>=13) return 2; if(age>=7) return 1; return 0; }

  function chooseSkin(role, season, sportName, hist, ethnicSkin){
    const TAN = {'ほんのり日焼けした肌':1,'少し日焼けした肌':2,'小麦色に日焼けした肌':3,'しっかり日焼けした肌':4,'屋外仕事のこんがり日焼け肌':5};
    const baseSkin = ethnicSkin || '健康的な肌質';
    const outdoorJob = /農家|漁師|大工|とび職|庭師|造園|土木|建設|林業|警備員|郵便配達|引越|自衛官|プロスポーツ選手|スポーツインストラクター|ライフセーバー|海の家/.test(String(role||''));
    const outdoorSport = /野球|サッカー|ラグビー|テニス|ソフトテニス|陸上|自転車|ゴルフ|アメリカンフットボール|ボート|スキー/.test(String(sportName||'')) || (hist||[]).some(x=>x.strength>0 && /野球|サッカー|ラグビー|テニス|陸上|自転車|ゴルフ/.test(x.name));
    const summer = season === '夏';
    const winter = season === '冬';
    const pale = /色白|透明感/.test(baseSkin);
    if(/褐色/.test(baseSkin)){
      if((outdoorJob || (summer && outdoorSport)) && rand() < 0.35) return baseSkin === '深い褐色の肌' ? '日差しでいっそう深まった深い褐色の肌' : '日差しでいっそう深まった褐色の肌';
      return baseSkin;
    }
    // 人種既定の肌を基準（w=10）に、日焼け5段階を環境で上乗せする
    const entries = [[baseSkin, 10]];
    for(const [v,t] of Object.entries(TAN)){
      let w = [1.6, 1.1, 0.5, 0.2, 0.1][t-1];
      if(outdoorJob) w += t * 1.6;
      if(outdoorSport) w += Math.min(t, 3) * 1.1;
      if(summer) w *= (t >= 3 ? 1.8 : 1.4);
      if(winter) w *= (t >= 4 ? 0.4 : t >= 3 ? 0.6 : 0.85);
      if(pale) w *= 0.4;
      entries.push([v, w]);
    }
    return weighted(entries);
  }

  const SPORT_EXP_WEIGHTS = [['野球',22],['サッカー',17],['バスケットボール',9],['水泳',6.5],['ソフトテニス',3.6],['テニス',3.4],['卓球',4.5],['バドミントン',4],['陸上（短距離）',3],['陸上（長距離）',2.5],['剣道',2],['柔道',1.8],['バレーボール',3],['ラグビー',1.2],['ハンドボール',1],['空手',0.8],['体操',0.8],['ボクシング',0.5],['スキー',0.5],['ダンス',0.5],['アメリカンフットボール',0.4],['自転車競技',0.4],['レスリング',0.3],['スケート',0.3],['ボート',0.3],['クライミング',0.3],['相撲',0.15]];

  function sportExpPick(age, exclude){
    const a = Number(age)||25;
    let list = SPORT_EXP_WEIGHTS.map(x=>x.slice());
    const adj=(name,f)=>{ const it=list.find(x=>x[0]===name); if(it) it[1]*=f; };
    if(a<=35){ adj('サッカー',1.5); adj('野球',0.85); adj('バドミントン',1.25); adj('バスケットボール',1.15); }
    if(a>=45){ adj('野球',1.3); adj('剣道',1.8); adj('柔道',1.8); adj('サッカー',0.6); adj('ソフトテニス',1.3); adj('卓球',1.2); }
    if(exclude && exclude.length) list = list.filter(x=>!exclude.includes(x[0]));
    return weighted(list.map(x=>[x[0], x[1]]));
  }

  function generateSportsHistory(age, role, sportName, influenceMode){
    const maxSt = maxStageForAge(Number(age)||25);
    const infl = influenceMode === '影響なし' ? 0 : influenceMode === '控えめ' ? 0.5 : influenceMode === '強め' ? 1.5 : 1;
    const mkStrength = (from,to)=>{
      const stages = to - from + 1;
      const gap = maxSt - to;
      const decay = gap<=0 ? 1 : gap===1 ? 0.7 : gap===2 ? 0.5 : 0.35;
      const personal = 0.5 + rand()*0.7;
      if(infl === 0) return 0;
      if(rand() < 0.15) return 0;
      return Math.round(stages * decay * personal * infl * 100)/100;
    };
    const hist = [];
    if(role === 'プロスポーツ選手' && sportName && sportName !== 'なし'){
      const from = rand() < 0.6 ? 1 : 2;
      hist.push({name: sportName, from, to: maxSt, strength: Math.max(1.5, (maxSt-from+1) * (0.7+rand()*0.5))});
      if(rand() < 0.25){
        let nm; let g=0; do{ nm = sportExpPick(age, [sportName]); g++; }while(nm===sportName && g<10);
        const f2 = rnd(0,2,1); const t2 = rnd(f2, Math.min(2, maxSt), 1);
        hist.push({name:nm, from:f2, to:t2, strength: mkStrength(f2,t2)*0.5});
      }
      return hist;
    }
    const r = rand();
    const count = r < 0.211 ? 0 : r < 0.80 ? 1 : 2; // 経験なし≒21.1%（経験率78.9%）
    const used = [];
    const LESSON_SPORTS = /水泳|体操|柔道|空手/; // 幼少〜小学校の習い事は部活と並行可
    for(let i=0;i<count;i++){
      const nm = sportExpPick(age, used);
      used.push(nm);
      let from, to;
      if(i === 0){
        if(nm === '水泳' && rand() < 0.6){ from = 0; to = Math.min(rnd(0,1,1), maxSt); }
        else { from = rnd(0, Math.min(3, maxSt), 1); to = rnd(from, maxSt, 1); }
      } else {
        const p = hist[0];
        if(LESSON_SPORTS.test(nm) && p.from <= 1 && maxSt >= 0 && rand() < 0.6){
          // 習い事として幼少〜小学校のみ並行
          from = 0; to = Math.min(1, maxSt);
          if(to > p.to) to = Math.min(to, p.to); // 期間感の暴れ防止
        } else {
          // 部活年代は1競技：前後の空き区間へ（乗り換え型）
          const canBefore = p.from >= 1;
          const canAfter = p.to < maxSt;
          if(canBefore && (!canAfter || rand() < 0.6)){ from = rnd(0, p.from - 1, 1); to = rnd(from, p.from - 1, 1); }
          else if(canAfter){ from = rnd(p.to + 1, maxSt, 1); to = rnd(from, maxSt, 1); }
          else { continue; } // 空き区間なし→2競技目は生成しない
        }
      }
      hist.push({name:nm, from, to, strength: mkStrength(from,to)});
    }
    hist.sort((a,b)=> (b.to-b.from) - (a.to-a.from));
    if(hist.length===2) hist[1].strength = Math.round(hist[1].strength * 0.5 * 100)/100;
    return hist;
  }

  const SPORT_MUSCLE = {
    '野球':['前腕と体幹の回旋筋、粘りのある下半身','forearms, rotational core, and a grounded lower body','体幹まわり'],
    'サッカー':['大腿とふくらはぎ、切り返しに強い下半身','thighs and calves built for quick cuts','脚まわり'],
    'バスケットボール':['ふくらはぎと跳躍系の脚力、アキレス腱まわりの引き締まり','calves and jump-trained legs with taut ankles','脚まわり'],
    'バレーボール':['ふくらはぎと跳躍系の脚力、肩まわりのしなやかさ','jump-trained calves and supple shoulders','脚と肩まわり'],
    '卓球':['前腕と踏み込む脚の俊敏な締まり','quick forearms and springy legs','前腕'],
    'テニス':['利き腕の前腕が反対側よりやや太く、フットワークの脚','a dominant forearm slightly thicker than the other, with footwork-trained legs','前腕'],
    'ソフトテニス':['利き腕の前腕とフットワークの脚','a stronger dominant forearm and agile legs','前腕'],
    'バドミントン':['利き腕の前腕と俊敏なふくらはぎ','a stronger dominant forearm and quick calves','前腕'],
    '陸上（短距離）':['ハムストリング・臀部・ふくらはぎの瞬発系の張り','sprint-built hamstrings, glutes, and calves','腿裏とふくらはぎ'],
    '陸上（長距離）':['全身が絞れて脚は細く締まり、ふくらはぎに持久系の筋','a lean frame with slim, endurance-trained calves','引き締まった脚'],
    '水泳':['広背筋と肩まわりが発達した逆三角形のシルエット','swimmer lats and shoulders forming a V-taper','肩まわり'],
    '柔道':['僧帽筋・首まわり・前腕・体幹の厚み','thick traps, neck, forearms, and core from grappling','上背と首まわり'],
    '剣道':['前腕・体幹・踏み込む脚の無駄のない締まり','lean forearms, core, and lunging legs','前腕と体幹'],
    '空手':['前腕・体幹・踏み込む脚の締まり','tight forearms, core, and driving legs','体幹'],
    '相撲':['首まわり・体幹・下半身の圧倒的な厚み','a massive neck, core, and lower body','体幹と下半身'],
    'ラグビー':['首・肩・大腿の全体的な厚み、当たり負けしない幹の太さ','a thick neck, shoulders, and thighs built for contact','首と肩まわり'],
    'ハンドボール':['肩まわりと跳躍系の脚、投げ込む腕','throwing shoulders and jump-trained legs','肩まわり'],
    '体操':['上半身全体の密度の高い筋肉と肩・上腕のライン','densely muscled upper body with defined shoulders and arms','上半身'],
    'ボクシング':['前腕・肩・体幹の絞れた締まり','lean, punched-in forearms, shoulders, and core','肩と前腕'],
    'レスリング':['首・僧帽筋・前腕・体幹の組み技の厚み','a grappler neck, traps, forearms, and core','首と上背'],
    'スキー':['大腿と体幹の粘り強い筋力','enduring thighs and core','大腿'],
    'スケート':['大腿と臀部の滑走系の発達','skating-built thighs and glutes','大腿'],
    '自転車競技':['大腿四頭筋の顕著な発達、上半身は比較的細身のまま','notably developed quads with a relatively slim upper body','大腿'],
    'ボート':['背中全体と脚の押す力、厚い体幹','a rowing back, driving legs, and a thick core','背中'],
    'アメリカンフットボール':['首・肩・大腿の全体的な厚み','a thick neck, shoulders, and thighs','首と肩まわり'],
    'ダンス':['体幹とふくらはぎのしなやかな筋、姿勢の良さ','a supple core and calves with excellent posture','体幹'],
    'クライミング':['前腕と背中の引く筋肉、指の付け根の厚み','climbing forearms, pulling back muscles, and thick finger bases','前腕と背中']
  };

  const SPORT_SKELETON = {
    '水泳':['肩甲帯と鎖骨まわりが横に広く発達した骨格','a skeleton with a broadened shoulder girdle and clavicles'],
    '柔道':['首から肩にかけての骨格が太く、手足の骨もがっしりした造り','a thick neck-to-shoulder frame with sturdy limb bones'],
    'レスリング':['首と肩甲帯の詰まった太い骨格','a compact, thick neck and shoulder-girdle frame'],
    '相撲':['全身の骨格そのものが大きくどっしりした造り','a large, heavyset skeletal frame overall'],
    'ラグビー':['鎖骨・肩幅・肋郭の広いぶ厚い骨格','a broad, deep frame through the clavicles, shoulders and ribcage'],
    'アメリカンフットボール':['肩幅と肋郭の広い頑丈な骨格','a wide-shouldered, robust frame'],
    '陸上（短距離）':['骨盤まわりと大腿骨のしっかりした下半身骨格','a strong pelvic and femoral lower-body structure'],
    'バスケットボール':['手足が長く、手の骨格も大きめの造り','long limbs with largish hand structure'],
    'バレーボール':['腕が長く肩甲帯の可動の大きい骨格','long arms with a mobile shoulder girdle'],
    '体操':['肩と上腕の関節まわりが発達した密度の高い骨格','a dense frame with developed shoulder and upper-arm joints'],
    'ボート':['肋郭が深く背中の広い骨格','a deep ribcage and broad-backed frame'],
    '自転車競技':['骨盤と大腿骨のしっかりした下半身骨格','a solid pelvis-and-femur lower structure']
  };

  function muscleLine(c, english=false, brief=false){
    const hist = (c.sportsHistory || []).filter(x=>x.strength > 0 && SPORT_MUSCLE[x.name]);
    if(!hist.length) return '';
    const bt = String(c.bodyType || '');
    const chubby = /ぽっちゃり|ビール腹|腹だけ/.test(bt);
    const frail = /やせ型|華奢/.test(bt);
    const main = hist[0];
    const mm = SPORT_MUSCLE[main.name];
    let tier = (c.role === 'プロスポーツ選手' && main.name === c.sportName) || main.strength >= 2 ? 2 : main.strength >= 0.8 ? 1 : 0;
    if(frail && tier === 2) tier = 1;
    if(brief){
      if(tier < 2 || chubby) return '';
      return english ? ` Even through his clothes, the build of his ${mm[3] || mm[1]} reads clearly.` : `服の上からも${mm[2]}の厚みが分かる。`;
    }
    const tl = String(c.trainingLevel || '');
    const guardJa = /ボディビル級|パワー系|フィジーク級/.test(tl) ? '筋肉の発達は設定した体型・体重の範囲内で描き、体型そのものは変えない。' : '筋肉の発達は設定した体型・体重の範囲内のメリハリとして描き、体型そのものは変えない。ボディビル的な誇張や血管の強調はしない。';
    const guardEn = ' Depict this development only as definition within his set body type and weight — never altering the body type itself, and never bodybuilder-style exaggeration or vein emphasis.';
    let core, coreEn;
    if(chubby){
      core = `今の体型の下に、${main.name}経験で鍛えた${mm[2]}の名残が感じられる`;
      coreEn = `beneath his current build, traces of ${mm[2]} training from his ${main.name} days remain`;
    } else if(tier === 2){
      core = `${mm[0]}がしっかり発達している`;
      coreEn = `${mm[1]} are well developed`;
      const longCareer = (main.to - main.from + 1) >= 4 || (c.role === 'プロスポーツ選手' && main.name === c.sportName);
      if(longCareer){
        const sk = SPORT_SKELETON[main.name];
        core += sk ? `。長い競技歴により筋肉だけでなく骨格にも競技の跡が出ており、${sk[0]}になっている` : `。長い競技歴により、筋肉のつき方そのものが${main.name}特有の形に仕上がっている`;
        coreEn += sk ? `. His long career shows even in his bone structure: ${sk[1]}` : `. His long career has shaped his musculature into a distinctly ${main.name}-specific form`;
      }
    } else if(tier === 1){
      core = `${mm[0]}にほどよい発達がある`;
      coreEn = `${mm[1]} show moderate development`;
    } else {
      core = `学生時代の${main.name}で鍛えた${mm[2]}の名残がうっすら残る`;
      coreEn = `a faint trace of ${mm[2]} from his school-days ${main.name} remains`;
    }
    const sub = hist[1];
    let subJa = '', subEn = '';
    if(sub && sub.strength >= 0.8 && SPORT_MUSCLE[sub.name] && !chubby){
      subJa = `加えて、${sub.name}由来の${SPORT_MUSCLE[sub.name][2]}の発達も見て取れる。`;
      subEn = ` In addition, ${sub.name}-derived development of the ${SPORT_MUSCLE[sub.name][2]} is visible.`;
    }
    if(english) return ` Muscle development: ${coreEn}.${subEn}${guardEn}`;
    return `発達部位：${core}。${subJa}${guardJa}`;
  }

  const TRAINING_LEVELS = [
    ['なし', 38], ['昔は鍛えていた（今は中断）', 6], ['自宅で軽く（自重・腕立て腹筋）', 12],
    ['週1〜2のジム習慣（健康維持）', 14], ['しっかり鍛えている（中級）', 10], ['細マッチョ仕上げ（絞り重視）', 8],
    ['機能系（クロスフィット・自重上級）', 4], ['フィジーク級（大会レベルの絞りと逆三角形）', 3],
    ['パワー系（厚み重視の剛力体型）', 3], ['ボディビル級（過剰な筋肥大）', 2]
  ];

  const TRAINING_DESC = {
    '昔は鍛えていた（今は中断）':['かつて鍛えた名残の厚みが胸と肩に残っている','traces of past training remain as thickness in his chest and shoulders'],
    '自宅で軽く（自重・腕立て腹筋）':['腹まわりが締まっている程度の、軽い運動習慣がうかがえる体','a lightly kept body — a trim waist that hints at simple home workouts'],
    '週1〜2のジム習慣（健康維持）':['全体に引き締まり、胸と腕にジム習慣らしい軽い張りがある','an overall toned body with light gym-built firmness in the chest and arms'],
    'しっかり鍛えている（中級）':['胸・肩・腕の筋肉が明確に発達し、日常着の上からも体つきが分かる','clearly developed chest, shoulders and arms, readable even through everyday clothes'],
    '細マッチョ仕上げ（絞り重視）':['体脂肪が少なく腹筋のラインが見える、厚みより輪郭の美しさを重視した絞れた体','a lean, defined physique with visible ab lines — sculpted outline over sheer mass'],
    '機能系（クロスフィット・自重上級）':['肩・背中・体幹が満遍なく発達した、見せ筋ではなく動ける体の質感','functionally developed shoulders, back and core — a body built to move, not to pose'],
    'フィジーク級（大会レベルの絞りと逆三角形）':['肩から広がる逆三角形と腹筋のセパレーションが見える、大会レベルに仕上がった体。ただし日常の生活場面として描き、ステージポーズ・オイル肌・タンニング・過剰なパンプ表現はしない','a competition-level physique — a V-taper from the shoulders with visible ab separation. Depict him in everyday life: no stage posing, oiled skin, tanning, or exaggerated pump'],
    'パワー系（厚み重視の剛力体型）':['胸板・僧帽筋・大腿が分厚く、腹は絞れていない、持ち上げるための剛力の体','a powerlifter build — thick chest, traps and thighs with an unshredded midsection: a body made for lifting'],
    'ボディビル級（過剰な筋肥大）':['全身の筋肉が服のシルエットを変えるほど肥大し、腕は袖を張らせ、首から肩が盛り上がっている。血管の浮きや筋腹の丸みも自然な範囲で描いてよい','bodybuilder-level hypertrophy — muscles that reshape his clothing silhouette, sleeves stretched by his arms, neck-to-shoulder mass. Natural vascularity and full muscle bellies are welcome']
  };

  function chooseTrainingLevel(c){
    if(/体の細さ|痩せている/.test(String(c&&c.complexText||'')) && rand()<0.5) return pick(HIGH_TRAIN); // 見返し筋トレ⚡
    const y = Number(c.eraYear) || 2026;
    const age = Number(c.age) || 30;
    const role = String(c.role || '');
    const list = TRAINING_LEVELS.map(([n,w])=>{
      let weight = w;
      if(n === 'ボディビル級（過剰な筋肥大）' && y < 1990) weight = 0;
      if(n === 'フィジーク級（大会レベルの絞りと逆三角形）' && y < 2010) weight = 0;
      if(n === '機能系（クロスフィット・自重上級）' && y < 2005) weight = 0;
      if(/ジム習慣|細マッチョ仕上げ/.test(n) && y < 1985) weight *= 0.2;
      if(age >= 65 && /フィジーク級|ボディビル級|パワー系/.test(n)) weight *= 0.2;
      if(['ジムトレーナー','スポーツインストラクター','プロスポーツ選手','消防士','自衛官','警察官','救急隊員'].includes(role) && /しっかり|細マッチョ仕上げ|機能系|フィジーク級/.test(n)) weight *= 2.5;
      if(role === 'モデル' && /ボディビル級|パワー系/.test(n)) weight = 0;
      if(sportsInfluence(c, /ラグビー|アメリカンフットボール|相撲/) >= 1 && n === 'パワー系（厚み重視の剛力体型）') weight *= 2;
      if(sportsInfluence(c, /体操|クライミング/) >= 1 && n === '機能系（クロスフィット・自重上級）') weight *= 2;
      if(sportsInfluence(c, /水泳/) >= 1 && n === 'フィジーク級（大会レベルの絞りと逆三角形）') weight *= 1.5;
      return [n, weight];
    }).filter(([,w])=>w > 0);
    return weighted(list);
  }

  const TRAINING_BODY = {
    'しっかり鍛えている（中級）':[['筋肉質',3],['引き締まったスポーツ体型',3]],
    '細マッチョ仕上げ（絞り重視）':[['細マッチョ',5],['痩せマッチョ',3]],
    '機能系（クロスフィット・自重上級）':[['細マッチョ',3],['引き締まったスポーツ体型',3],['逆三角形体型',2]],
    'フィジーク級（大会レベルの絞りと逆三角形）':[['逆三角形体型',5],['細マッチョ',3]],
    'パワー系（厚み重視の剛力体型）':[['がっしり体型',5],['骨太体型',2],['柔道家体型',2]],
    'ボディビル級（過剰な筋肥大）':[['筋肉質',5],['逆三角形体型',3],['がっしり体型',2]]
  };

  const TRAINING_EXCL = {
    'フィジーク級（大会レベルの絞りと逆三角形）':['やせ型','華奢な体型','ぽっちゃり','腹だけぽっちゃり','ビール腹'],
    'ボディビル級（過剰な筋肥大）':['やせ型','華奢な体型','細身','ぽっちゃり','腹だけぽっちゃり','ビール腹'],
    'パワー系（厚み重視の剛力体型）':['やせ型','華奢な体型','細身'],
    'しっかり鍛えている（中級）':['ぽっちゃり','腹だけぽっちゃり'],
    '細マッチョ仕上げ（絞り重視）':['ぽっちゃり','腹だけぽっちゃり','ビール腹']
  };

  function trainingWeightAdj(level){
    if(level === 'ボディビル級（過剰な筋肥大）') return 4.5;
    if(level === 'パワー系（厚み重視の剛力体型）') return 5.5;
    if(level === 'フィジーク級（大会レベルの絞りと逆三角形）') return 1.5;
    if(level === 'しっかり鍛えている（中級）') return 1;
    return 0;
  }

  const BODY_ASYMS = [['なし',60],['右肩がごくわずかに下がっている',6],['左肩がごくわずかに下がっている',6],['軽いなで肩',7],['利き腕側の肩がわずかに前に出る',5],['骨盤がごくわずかに傾き、重心が片脚寄り',5],['首がわずかに利き手側へ傾く癖',4]];

  const POSTURES = [['自然な立ち姿',52],['背筋の伸びた立ち姿',12],['やや猫背気味',10],['軽く胸を張った立ち姿',8],['リラックスして重心を片脚に預けた立ち方',9],['肩の力が抜けた立ち姿',9]];

  const BODY_ASYM_EN = {'右肩がごくわずかに下がっている':'his right shoulder sits a touch lower','左肩がごくわずかに下がっている':'his left shoulder sits a touch lower','軽いなで肩':'gently sloped shoulders','利き腕側の肩がわずかに前に出る':'his dominant-side shoulder rolls slightly forward','骨盤がごくわずかに傾き、重心が片脚寄り':'a barely-tilted pelvis with weight favoring one leg','首がわずかに利き手側へ傾く癖':'a habit of tilting his head slightly toward his dominant side'};

  const POSTURE_EN = {'自然な立ち姿':'a natural stance','背筋の伸びた立ち姿':'an upright, straight-backed stance','やや猫背気味':'slightly rounded, hunched posture','軽く胸を張った立ち姿':'a lightly chest-out stance','リラックスして重心を片脚に預けた立ち方':'a relaxed stance with weight on one leg','肩の力が抜けた立ち姿':'a loose-shouldered, easy stance'};

  function bodyRealismLine(c, english=false){
    const parts = [];
    if(c.posture && c.posture !== '自然な立ち姿') parts.push(english ? POSTURE_EN[c.posture] : c.posture);
    if(c.bodyAsym && c.bodyAsym !== 'なし') parts.push(english ? BODY_ASYM_EN[c.bodyAsym] : c.bodyAsym);
    if(!parts.length) return '';
    return english ? ` Body realism: ${parts.join('; ')} — keep it subtle and anatomically natural, never a deformity.` : `体の実在感：${parts.join('、')}。ごく控えめに、解剖学的に自然な範囲で描き、変形や誇張にはしない。`;
  }

  function hairDetailLine(c, english=false){
    const parts = [];
    if(c.hairVolume && c.hairVolume !== '標準的な毛量') parts.push(english ? (c.hairVolume==='毛量多め'?'thick, dense hair volume':'thin hair volume') : `毛量は${c.hairVolume}`);
    if(c.bangs && c.bangs !== '指定なし') parts.push(english ? `bangs: ${valueTranslations[c.bangs] || c.bangs}` : `前髪は${c.bangs}`);
    if(c.hairFinish && c.hairFinish !== '指定なし') parts.push(english ? `styling: ${valueTranslations[c.hairFinish] || c.hairFinish}` : `整髪は${c.hairFinish}`);
    if(!parts.length) return '';
    return english ? ` ${parts.join('; ')}.` : `${parts.join('、')}。`;
  }

  function trainingLine(c, english=false){
    const lv = c.trainingLevel || 'なし';
    const d = TRAINING_DESC[lv];
    if(!d) return '';
    const guard = lv === 'ボディビル級（過剰な筋肥大）'
      ? (english ? ' Keep the hypertrophy within what real professional bodybuilders achieve — no balloon-like AI distortion, no broken joints, and keep his head-to-body ratio intact.' : '筋肥大は実在のプロビルダーの範囲にとどめ、AI的な風船状の変形・関節の破綻をさせず、頭身比は維持する。')
      : (/フィジーク級|パワー系/.test(lv)
        ? (english ? ' No competition-stage staging.' : '大会ステージ的な演出はしない。')
        : '');
    return english ? ` Training habit (${lv}): ${d[1]}.${guard}` : `筋トレ習慣「${lv}」：${d[0]}。${guard}`;
  }

  function sportsHistoryLine(c, english=false){
    const h = (c && c.sportsHistory) || [];
    if(!h.length) return english ? ' Sports background: none (non-athletic school years).' : '経験競技：なし（文化系・帰宅部）。'
    const mark = st => st===0 ? '・体格影響なし' : st>=2 ? '・影響しっかり' : st>=0.8 ? '・影響ほどよく' : '・影響名残';
    const txt = h.map(x=>`${x.name}（${SPORT_STAGES[x.from]}${x.from===x.to?'':'〜'+SPORT_STAGES[x.to]}${mark(x.strength)}）`).join('／');
    return english ? ` Sports background: ${txt}.` : `経験競技：${txt}。`;
  }

  function sportsInfluence(c, regex){
    return ((c && c.sportsHistory) || []).reduce((a,x)=> a + (regex.test(x.name) ? (x.strength||0) : 0), 0);
  }

  function bioLine(c, english=false){
    const age = c.age;
    const role = displayValue('role', c.role) || c.role;
    const hist = ((c && c.sportsHistory) || []);
    const active = hist.filter(x=>x.strength > 0);
    if(c.role === 'プロスポーツ選手' && c.sportName && c.sportName !== 'なし'){
      return english ? `A ${age}-year-old who has devoted himself to ${c.sportName} all the way to the professional stage.` : `${c.sportName}ひと筋でプロの舞台に立つ${age}歳。`;
    }
    if(active.length){
      const m = active[0];
      const span = m.from === m.to ? `${SPORT_STAGES[m.from]}時代に` : `${SPORT_STAGES[m.from]}から${SPORT_STAGES[m.to]}まで`;
      const spanEn = m.from === m.to ? `in ${SPORT_STAGES[m.from]}` : `from ${SPORT_STAGES[m.from]} through ${SPORT_STAGES[m.to]}`;
      const second = active[1] ? `（${active[1].name}も経験）` : '';
      const secondEn = active[1] ? ` (with some ${active[1].name})` : '';
      return english ? `A ${age}-year-old ${role} who threw himself into ${m.name} ${spanEn}${secondEn}.` : `${span}${m.name}に打ち込んだ${second}、${role}の${age}歳。`;
    }
    if(hist.length){
      return english ? `A ${age}-year-old ${role}; his ${hist[0].name} days left little mark on his build.` : `${hist[0].name}の経験はあるが体つきには出ていない、${role}の${age}歳。`;
    }
    return english ? `A ${age}-year-old ${role} who spent his school years outside the sports clubs.` : `運動部とは縁のない学生時代を過ごした、${role}の${age}歳。`;
  }

  const SPORT_MEM = {
    '野球':{sc:['夏の球場の匂い','朝5時のグラウンドの白線','雨で流れた決勝の日','ロジンの白い粉'],ro:['エースで4番','ブルペンで一番声を出す係','スコアブック係の補欠','背番号のない最後の夏','代打の切り札','守備固め専門','声だけ甲子園レベル']},
    'サッカー':{sc:['雨の土のグラウンド','ナイター練習の帰り道','すり減ったスパイクの底'],ro:['背番号10','ゴールを守り続けたキーパー','ベンチから誰より声を出す係','PK戦で外した夜','壁パスの職人','走行距離だけはエース級']},
    'バスケットボール':{sc:['体育館のシューズの音','朝練のシュート1000本','夕暮れの公園のリング'],ro:['スタメンの司令塔','ベンチ外から声を枯らした控え','リバウンドだけは負けなかった男','スリーポイント専門','ディフェンスの要']},
    'バレーボール':{sc:['体育館のワックスの匂い','夏合宿のレシーブ練習'],ro:['エーススパイカー','守備専門のリベロ','声出しとモップがけの一年']},
    '卓球':{sc:['卓球場の蛍光灯','ラバーを貼り替える夜'],ro:['カットマン','前陣速攻のエース','ダブルス専門']},
    'テニス':{sc:['オムニコートの砂','炎天下の球拾い'],ro:['シングルスのエース','ダブルス巧者','壁打ちから始めた初心者上がり']},
    'ソフトテニス':{sc:['放課後のコートの西日','ガットを張り替える部室'],ro:['前衛のポーチ職人','後衛の粘り屋']},
    'バドミントン':{sc:['シャトルの羽音','風のない体育館'],ro:['スマッシュ自慢のエース','ダブルスの堅守担当']},
    '陸上（短距離）':{sc:['スターティングブロックの感触','タータンの照り返し'],ro:['リレーのアンカー','0.1秒を削り続けた男']},
    '陸上（長距離）':{sc:['夜明けのロード','冬の駅伝コース'],ro:['駅伝の山登り区間','ペースメーカー役の縁の下']},
    '水泳':{sc:['朝6時のプールの塩素の匂い','ゴーグルの跡がとれない夏','冬の温水プールの湯気'],ro:['自由形のエース','リレーのアンカー','息継ぎから教わった初心者上がり','飛び込みだけ褒められた','タイムより フォームの美しさで語られた']},
    '柔道':{sc:['冬の道場の畳の冷たさ','擦り切れた道着の襟','帯を締め直す一呼吸'],ro:['団体戦の大将','受け身だけ褒められた白帯時代','先鋒で流れを作る役','寝技専門の職人','組んだ瞬間に強さが分かると言われた']},
    '剣道':{sc:['面の中の自分の呼吸音','早朝の素振り'],ro:['大将','小手が得意な先鋒','声だけは道場一']},
    '空手':{sc:['裸足の道場の床','帯の色が変わった日'],ro:['組手のエース','型を極めた求道者']},
    '相撲':{sc:['土俵の砂の感触','朝稽古のぶつかり合い'],ro:['大将格','食べるのも稽古だと教わった日々']},
    'ラグビー':{sc:['泥まみれのジャージ','スクラムの土の匂い'],ro:['フォワードの最前列','俊足のウイング','声でチームを動かすスクラムハーフ']},
    'ハンドボール':{sc:['松やにの匂い','狭い体育館の攻防'],ro:['エースの左腕','キーパーで顔面も止めた男']},
    '体操':{sc:['炭酸マグネシウムの白い手','鉄棒のマメ'],ro:['床のエース','補助から始めた努力型']},
    'ボクシング':{sc:['ミットの乾いた音','減量最終日の水の味'],ro:['アウトボクサー','打たれ強さだけは天下一品']},
    'レスリング':{sc:['マットの消毒の匂い','耳が擦れる組み合い'],ro:['タックルの鬼','粘りのグラウンド職人']},
    'スキー':{sc:['朝一番の圧雪の音','ナイターの照明'],ro:['アルペンの直滑降屋','基礎から積み上げた技術屋']},
    'スケート':{sc:['リンクの冷気','エッジを研ぐ夜'],ro:['スピード勝負の短距離屋','転んだ数なら誰にも負けない']},
    '自転車競技':{sc:['夜明けの峠道','ロードのタイヤの音'],ro:['ヒルクライム職人','平地の牽引役']},
    'ボート':{sc:['夜明けの川面','オールのマメ'],ro:['エイトの漕手','コックスとして声で漕いだ男']},
    'アメリカンフットボール':{sc:['防具を締める音','芝のグラウンドの熱'],ro:['ラインの最前線','俊足のランナー']},
    'ダンス':{sc:['スタジオの鏡と汗','文化祭のステージ照明'],ro:['センターを張った男','振り付け係の裏方']},
    'クライミング':{sc:['チョークの白い粉','指先の皮がむける週末'],ro:['スラブの職人','パワー系の豪腕']},
    'ゴルフ':{sc:['朝露の打ちっぱなし','グリーンの読み合い'],ro:['ドライバー自慢','小技で稼ぐ職人']}
  };

  const CULT_MEM = {
    '吹奏楽':['コンクール前日の音楽室の残響','リードを削り続けた放課後','金賞の瞬間の静寂'],
    '軽音':['文化祭の3分間のために半年かけた','部室のアンプの匂い','初ライブの手の震え'],
    '美術':['絵の具で汚れた制服の袖','締切前の美術室の夜'],
    '図書室':['昼休みの図書室の指定席','貸出カードの常連'],
    'ゲーム':['閉店までいたゲームセンター','対戦台の向こうの知らない強敵'],
    'バイト':['放課後のレジ打ちの達人','週5でシフトに入った高校時代'],
    '生徒会':['文化祭を仕切った生徒会の裏方','朝の挨拶運動の常連'],
    '帰宅部':['チャイムと同時に校門を出た帰宅部のエース','寄り道だけは誰より詳しい'],
    '鉄道':['時刻表を読み物にしていた','始発で行く撮影地'],
    '釣り':['夜明けの堤防','クーラーボックスと自転車の日々'],
    '将棋':['詰将棋を解きながら登校した','大会の対局時計の音'],
    'パソコン':['部室のパソコンを組み直した','深夜のキーボードの音']
  };

  const MBTI_INTRO = {
    INTJ:['5年後の話を一番真顔でする','計画表がないと旅行できない'], INTP:['気づくと辞書を読んでいる','「なぜ」が口癖の'],
    ENTJ:['飲み会の幹事を気づけば任されている','決断が早すぎて驚かれる'], ENTP:['会議で一番「逆に」と言う','思いつきで動いて成功させる'],
    INFJ:['相談されがちな','人の変化に一番先に気づく'], INFP:['雨の日が嫌いじゃない','ノートの端に詩を書いていた'],
    ENFJ:['後輩の誕生日を全部覚えている','送別会で一番泣く'], ENFP:['初対面の店員と友達になって帰ってくる','思い立ったら夜行バスに乗る'],
    ISTJ:['頼んだことを忘れられたことがない','同じ定食を10年頼み続ける'], ISFJ:['差し入れのセンスに定評がある','席替えでも荷物が一番きれい'],
    ESTJ:['集合時間の10分前にいる','段取りで生きている'], ESFJ:['ご近所さんに一番挨拶される','困っている人を放っておけない'],
    ISTP:['説明書を読まずに直せる','無口だが手が動く'], ISFP:['気に入った服を色違いで買う','写真フォルダが空ばかり'],
    ESTP:['とりあえずやってみる側の','じゃんけんが強い'], ESFP:['カラオケの一曲目を任される','その場を明るくして帰る']
  };

  const OCC_HOOK = {
    '消防士':['仮眠中でも靴下だけは履いている','非番の日も駅の階段を2段で上る'],
    '救急隊員':['当直明けのコンビニコーヒーがいちばんうまいと言う','サイレンの音で目が覚める体になった'],
    '警察官':['非番でも交差点で周囲を見てしまう','落とし物を届けた回数なら負けない'],
    '自衛官':['アイロンのかけ方だけは誰にも負けない','5分で食事を終える癖が抜けない'],
    '防衛大学校学生':['朝6時の坂道ダッシュで一日が始まる','ベッドの角は毎朝直角'],
    '寿司職人':['休日も指先だけは乾かさない','シャリの温度を手が覚えている'],
    'ラーメン店店主':['寸胴の湯気で夜が明ける','スープの味見だけで腹が膨れる'],
    'パティシエ':['オーブンの前が一番落ち着くと言う','砂糖の計量は目分量でも外さない'],
    '美容師':['他人の襟足が気になって仕方ない','ハサミだけは誰にも触らせない'],
    'バーテンダー':['氷を丸く削る夜','終電後の街をいちばん知っている'],
    '喫茶店マスター':['サイフォンの音で時間が分かる','常連の「いつもの」を50通り覚えている'],
    '農家':['天気予報を3つ見比べて寝る','朝露の匂いで目が覚める'],
    '漁師':['海を見れば明日の風が分かる','日焼けの境目が年輪になっている'],
    '大工':['ミリ単位のズレが気になって眠れない','手の豆が名刺代わり'],
    'ITエンジニア':['キーボードは持ち込み派','障害対応の夜に強い'],
    '看護師':['夜勤明けの朝日をいちばん浴びている','歩くのが速いと言われ続けている'],
    'モデル':['姿勢だけで職業を当てられる','撮影前日は塩分と戦う'],
    'YouTuber':['日常の全部がネタに見える','サムネイルの表情だけ3割増し']
  };

  const OCC_CAT_HOOK = {
    office:['月曜の朝礼で一番声が出る','エクセルのショートカットで生きている'],
    it:['納期前だけ早起きになる','椅子にはこだわる派'],
    medical:['白衣のポケットが四次元','人の顔色を見るのが仕事'],
    edu:['チョークの持ち方に年季がある','生徒の名前を1週間で覚える'],
    service:['閉店後の店がいちばん好き','いらっしゃいませの声で目が覚める'],
    trade:['道具箱の中だけは几帳面','軍手の消費量が半端ではない'],
    creative:['締切の3日前から本気を出す','メモ帳がアイデアで埋まっている'],
    uniform:['制服より私服が難しいと言う','姿勢の良さで職業がバレる'],
    showa:['固定電話の番号を諳んじられる','新聞は紙で読む派'],
    student:['単位の計算だけは得意','学食の裏メニューに詳しい'],
    retired:['朝の公園のラジオ体操の常連','孫の話になると止まらない']
  };

  const ERA_HOOK = {
    1946:['配給の列に並んだ記憶を持つ','ラジオが家の真ん中にあった'],
    1970:['長嶋の引退をラジオで聴いた','歌謡曲を口ずさむ'],
    1980:['レコードをすり切れるまで聴いた','喫茶店のナポリタンで育った'],
    1990:['ポケベルの返事を待った夜がある','レンタルビデオの延滞王'],
    2000:['ガラケーの着メロを自作した','CDをMDに録音した世代'],
    2010:['ガラケーからスマホへの移行を覚えている','動画は倍速で見ない派'],
    2020:['配信で試合を追う','サブスクの解約を忘れがち'],
    2030:['AIとの付き合い方を心得ている','紙の本をあえて選ぶ']
  };

  const BRIDGE_HOOK = {
    '柔道uniform':'受け身は現場でこそ役に立つと知った','水泳uniform':'息の長さには自信がある',
    'ラグビーuniform':'当たり負けしない体は職場でも頼られる','野球trade':'肩の強さは現場で重宝されている',
    '柔道medical':'畳で覚えた体の使い方が患者を支える','ダンスservice':'立ち姿の美しさは踊りで身につけた',
    '陸上（長距離）office':'営業の外回りは駅伝で鍛えた脚で','ボクシングservice':'減量で覚えた自制心で生きている',
    '剣道edu':'道場の礼法をそのまま教室に持ち込んだ','水泳student':'朝練で身につけた早起きだけが残った'
  };

  const TRAIN_HOOK = {
    '細マッチョ仕上げ（絞り重視）':['鏡の前の腹筋チェックが日課','揚げ物は週1と決めている'],
    '機能系（クロスフィット・自重上級）':['公園の鉄棒が遊具に見えない','エレベーターを使わない主義'],
    'フィジーク級（大会レベルの絞りと逆三角形）':['大会前だけ米を測って食べる','肩幅でドアを測る癖がある'],
    'パワー系（厚み重視の剛力体型）':['引っ越しのたびに友人から連絡が来る','握手で驚かれるのが日常'],
    'ボディビル級（過剰な筋肥大）':['袖のあるTシャツ選びに時間がかかる','鶏むね肉の調理法なら本が書ける'],
    'しっかり鍛えている（中級）':['ジムの常連に名前を覚えられている','プロテインの味にうるさい'],
    '昔は鍛えていた（今は中断）':['ジムの会員証だけは財布にある','ベンチのマックス値だけは覚えている']
  };

  function sportYears(x){ const Y=[2,6,3,3,4,5]; let t=0; for(let i=x.from;i<=x.to;i++) t+=Y[i]||3; return t; }

  const ROLE_ALIAS = {'銀行員':'銀行マン','ITエンジニア':'キーボードの人','人力車の車夫':'人力車乗り','公務員':'役所の人','営業職':'営業マン','経理・事務職':'経理マン','美容師':'ハサミ使い','大工':'現場の男','看護師':'夜勤明けの白衣','消防士':'火消し','警察官':'制服の人','タクシー運転手':'夜の運転手','コンサルタント':'横文字の人','商社勤務':'商社マン','高校教師':'先生','バーテンダー':'カウンターの人','カフェ店員':'エプロンの人','農家':'土の人','漁師':'海の男'};

  function roleAlias(role){ return ROLE_ALIAS[String(role||'')] || String(role||'').replace(/（.+）/,'') || '男'; }

  function salienceTop(c, n){
    const M = c.innerMeta || {};
    const E = [];
    const add=(sc,hook)=>{ if(hook) E.push([sc,hook]); };
    const t=(s)=>String(s||'');
    // ⚡★バッジ最優先
    const badgeHooks={complex:(t(c.complexText).split('（')[0].slice(0,14)+'を気にしている'),expcount:t(c.expCountText).split('（')[1]?.replace('）',''),fuzoku:'夜の店の常連歴',fashionsense:t(c.fashionSenseText).split('（')[0],asset:t(c.assetText).slice(0,16),marital:t(c.maritalText).split('（')[0]};
    for(const k in M){ if(M[k]==='gap') add(10, badgeHooks[k]||null); else if(M[k]==='rare') add(8, badgeHooks[k]||null); }
    if(/三桁|伝説/.test(t(c.expCountText))) add(9,'経験人数は聞くだけ野暮');
    if(/童貞|まだ経験がない/.test(t(c.complexText)+t(c.expCountText))) add(8,'清いままの現在地');
    if(/死別/.test(t(c.maritalText))) add(8,'妻との記憶を胸に');
    if(/再婚/.test(t(c.maritalText))) add(6,'二度目の結婚生活');
    if(/妻だけ|妻ひと筋/.test(t(c.expCountText)+t(c.loveCountText))) add(6,'妻ひと筋');
    if(/男性/.test(t(c.loveTarget))&&!/女性/.test(t(c.loveTarget))) add(6,'好きになるのは男性');
    if(/推し|二次元/.test(t(c.loveTarget))) add(5,'推しがすべて');
    const sp=(c.sportsHistory||[]).filter(x=>x.strength>=1.5)[0];
    if(sp) add(5,`${sp.name}に捧げた青春`);
    if(/上京の日/.test(t(c.memoryText))) add(4,'上京組');
    if((typeof HIGH_TRAIN!=='undefined')&&HIGH_TRAIN.includes(c.trainingLevel)) add(4,'鍛え抜いた体');
    if(/黒しか着ない/.test(t(c.fashionSenseText))) add(5,'黒しか着ない');
    if(/ワークマンで全部/.test(t(c.fashionSenseText))) add(5,'ワークマンで完結する男');
    if(/ジム服がそのまま/.test(t(c.fashionSenseText))) add(4,'私服もジム服');
    if(/暗号資産/.test(t(c.assetText))) add(4,'暗号資産で一喜一憂');
    if(/投資用ワンルーム/.test(t(c.assetText))) add(5,'ワンルームオーナー');
    if(/ほぼゼロ|一桁万円/.test(t(c.assetText))) add(5,'残高は一桁万円');
    if(/石橋を叩いて/.test(t(c.principleText))) add(3,'石橋を叩く男');
    if(/行きつけ/.test(t(c.fuzokuText))) add(6,'夜の行きつけ持ち');
    if(/金髪|白髪|シルバー|ブリーチ/.test(t(c.hairColor))) add(3,`${t(c.hairColor)}頭`);
    if(/糸のように細くなり/.test(t(c.smileEyes))) add(3,'笑うと目が消える');
    if(/くしゃ笑い|弟系童顔|パピー/.test(t(c.facePreset))) add(3,'童顔');
    if(/への字気味/.test(t(c.mouthCorner))) add(2,'笑うと化ける');
    add(1, (typeof faceFeatOf==='function'? null : null));
    if(/几帳面|完璧/.test(t(c.principleText))) add(2,'几帳面が服を着た');
    if(/コーヒー|サウナ|ラーメン|カメラ|釣り/.test(t(c.hobbyText))) add(2, t(c.hobbyText).replace(/（.+/,'')+'が趣味');
    if(/毎日飲む|強い/.test(t(c.drinkText))) add(2,'酒に強い');
    if(/下戸|飲めない/.test(t(c.drinkText))) add(2,'下戸');
    if(/方言/.test(t(c.speechText))) add(2,'ふるさとの言葉が抜けない');
    if(/猫舌|早食い/.test(t(c.foodLikeText)+t(c.foodHateText))) add(1.5,'食べ方に癖');
    if(/夜型|朝型/.test(t(c.healthText))) add(1.5, /夜型/.test(t(c.healthText))?'夜型':'朝型');
    E.sort((a,b)=>b[0]-a[0]);
    const seen=new Set(); const out=[];
    for(const [s,h] of E){ if(!seen.has(h)){ seen.add(h); out.push(h); if(out.length>=n) break; } }
    return out;
  }

  function buildBioHook2(c){
    const top = salienceTop(c, 2);
    const ra = roleAlias(c.role);
    if(top.length>=2) return pick([`${top[0]}、${top[1]}の${ra}`, `${top[1]}。${top[0]}の${ra}`, `${top[0]}——そして${top[1]}の${ra}`]);
    if(top.length===1) return pick([`${top[0]}の${ra}`, `${top[0]}、${c.age}歳の${ra}`]);
    return buildBioHook(c);
  }

  function buildBioLine2(c){
    const t5 = salienceTop(c, 5).slice(2);
    if(!t5.length) return null;
    const a=t5[0], b=t5[1], d=t5[2];
    let s = `${a}。`;
    if(b) s += `${b}で、`;
    if(d) s += `${d}な一面も。`;
    else if(b) s = `${a}。${b}な一面もある。`;
    return s;
  }

  function buildPersonSummary(c){
    const t5 = salienceTop(c, 5);
    const ra = roleAlias(c.role);
    if(!t5.length) return '';
    const a=t5[0]||'', b=t5[1]||'', d=t5[2]||'', e=t5[3]||'', f=t5[4]||'';
    let s = `${c.age}歳、${ra}。${a}`;
    if(b) s += `。${b}`;
    if(d) s += `、${d}`;
    if(e) s += `。${e}`;
    if(f) s += `——${f}`;
    return s + '。';
  }

  function buildBioHook(c){
    const age = c.age;
    const roleJa = c.role || '';
    const active = ((c.sportsHistory)||[]).filter(x=>x.strength>0);
    const zero = ((c.sportsHistory)||[]).filter(x=>x.strength===0);
    const cands = [];
    const add = (txt, sc)=>{ if(txt) cands.push([txt, sc]); };
    const y = Number(c.eraYear)||2026;
    // ギャップ・影響ゼロ
    if(zero.length && SPORT_MEM[zero[0].name]) add(`言わなければ絶対に伝わらないが、${zero[0].name}経験者である。${roleJa}、${age}歳。`, 9);
    if(c.holidayPersona) add(`平日は${roleJa}、休日は${c.vibe}。切り替えの早さが取り柄の${age}歳。`, 8);
    // 橋渡し
    const cat = (typeof OCC_CAT!=='undefined') ? OCC_CAT[roleJa] : '';
    if(active.length){
      const br = BRIDGE_HOOK[active[0].name + cat];
      if(br) add(`${br}。${active[0].name}あがりの${roleJa}、${age}歳。`, 7);
    }
    // 競技: 役どころ・情景・数字
    if(active.length && SPORT_MEM[active[0].name]){
      const m = SPORT_MEM[active[0].name]; const sp = active[0];
      add(`${pick(m.ro)}。それが${SPORT_STAGES[sp.to]}までの青春だった。いまは${roleJa}。`, 6);
      add(`いまも${pick(m.sc)}を思い出す、${roleJa}の${age}歳。`, 5);
      add(`${sp.name}歴${sportYears(sp)}年。いまは${roleJa}として生きる${age}歳。`, 5);
      if(sp.strength >= 2) add(`体つきを見れば、聞かなくても${sp.name}をやっていたと分かる。`, 6);
    }
    // 筋トレ
    const th = TRAIN_HOOK[c.trainingLevel];
    if(th) add(`${pick(th)}、${roleJa}の${age}歳。`, /フィジーク|ボディビル|パワー系/.test(c.trainingLevel||'') ? 7 : 5);
    // 職業
    const oh = OCC_HOOK[roleJa];
    if(oh) add(`${pick(oh)}、${age}歳の${roleJa}。`, 5);
    else if(OCC_CAT_HOOK[cat]) add(`${pick(OCC_CAT_HOOK[cat])}、${age}歳の${roleJa}。`, 4);
    // 文化系（履歴なしのみ）
    if(!((c.sportsHistory)||[]).length && (!c.nationality || c.nationality === '日本')){
      const ck = pick(Object.keys(CULT_MEM));
      add(`${pick(CULT_MEM[ck])}。そんな学生時代を過ごした${roleJa}、${age}歳。`, 5);
    }
    // MBTI他己紹介
    if(MBTI_INTRO[c.mbti]) add(`${pick(MBTI_INTRO[c.mbti])}${age}歳。職業は${roleJa}。`, 4);
    const isJP = !c.nationality || c.nationality === '日本';
    const eraKeys = isJP ? Object.keys(ERA_HOOK).map(Number).sort((a,b)=>a-b) : [];
    if(eraKeys.length){ let ek = eraKeys[0]; for(const k of eraKeys){ if(y >= k) ek = k; } add(`${pick(ERA_HOOK[ek])}${age}歳の${roleJa}。`, 3); }
    // 未来・現在進行の一言
    if(active.length) add(`${active[0].name}は辞めた。でも体は覚えている。${roleJa}、${age}歳。`, 4.5);
    if(TRAIN_HOOK[c.trainingLevel] || active.length) add(`${age}歳。まだ体は裏切らない。職業は${roleJa}。`, 3.5);
    add(`${roleJa}${age}年生の${age}歳、という冗談が好きな男。`, 2 + (age<=30?1:0));
    if(c.glasses && c.glasses !== 'なし') add(`眼鏡を外すと誰か分からないと言われる${roleJa}、${age}歳。`, 4);
    // 内面・背景フック（結果画面のみ・プロンプト非反映）
    if(c.myBoomText) add(`最近のマイブームは${c.myBoomText}。${roleJa}、${age}歳。`, 6);
    if(c.hobbyText) add(`休日はもっぱら${String(c.hobbyText).replace(/（.*?）/,'')}。${age}歳の${roleJa}。`, 5.5);
    if(c.birthplaceText && (!c.nationality || c.nationality==='日本')){
      const pref = String(c.birthplaceText).split('：')[0];
      add(`${pref}生まれ。${age}歳の${roleJa}。`, 4.5);
      const dia = (typeof innerDialectOf==='function') ? innerDialectOf(c) : null;
      if(dia) add(`ふとした時に${dia[0]}が出る、${pref}育ちの${roleJa}。`, 5.5);
    }
    if(c.foodLikeText && !/特になし/.test(c.foodLikeText)) add(`${String(c.foodLikeText).replace(/（.*?）/,'')}のためなら行列に並ぶ${age}歳。職業は${roleJa}。`, 4);
    if(c.familyText && /長男|長女|次男|次女|三男|三女/.test(c.familyText) && /既婚|再婚/.test(String(c.maritalText||''))) add(`家では${(String(c.familyText).match(/長男|長女|次男|次女|三男|三女/)||[''])[0]}のパパ、外では${roleJa}。${age}歳。`, 5.5);
    if(c.nicknameText && /「(.+?)」/.test(c.nicknameText)) add(`仲間内では${(String(c.nicknameText).match(/「(.+?)」/)||['',''])[1]}と呼ばれる${roleJa}、${age}歳。`, 4.5);
    if(c.innerDream && !/特に大きな夢/.test(c.innerDream)) add(`ささやかな夢は「${c.innerDream}」。${age}歳の${roleJa}。`, 3.5);
    if(c.memoryText) add(`いまでも${String(c.memoryText).replace(/こと$/,'')}を思い出す。${roleJa}、${age}歳。`, 3.5);
    // 正統派フォールバック
    add(bioLine(c, false), 3.5);
    return weighted(cands.map(([t,sc])=>[t, Math.pow(sc, 1.5)]));
  }

  function isEastAsianLike(nationality, ethnicity){
    return /日本|韓国|中国|台湾|東アジア|アジア/.test(String(nationality||'') + String(ethnicity||''));
  }

  function chooseEyebrow(vibe){
    const sharp = ['クール系','ミステリアス系','紳士系','オラオラ系'].includes(vibe) ? 1.5 : 1;
    const soft = ['犬系男子','癒し系','清楚系','塩顔系'].includes(vibe) ? 1.5 : 1;
    return weighted([
      ['太めの直線眉', 3*sharp], ['太めのアーチ眉', 2],
      ['標準的な直線眉', 4*sharp], ['標準的なゆるいアーチ眉', 5],
      ['やや細めの直線眉', 2], ['やや細めのアーチ眉', 2*soft],
      ['眉尻の下がった優しい眉', 2.5*soft], ['への字型の眉', 1.2],
      ['眉山のはっきりした眉', 2*sharp], ['短めで力強い眉', 1.5*sharp]
    ]);
  }

  function chooseEyeBalance(vibe){
    // V4.6.2: 黒目の位置・白目の見え方（三白眼系はクール/ミステリアス等で出やすく）
    const cool = ['クール系','ミステリアス系','ヤンキー系','ホスト系','モード系'].includes(vibe) ? 3 : 1;
    const cute = ['犬系男子','清楚系','陽キャ大学生系'].includes(vibe) ? 2.5 : 1;
    return weighted([
      ['標準的な黒目の位置', 62],
      ['黒目が大きめで白目が控えめ', 9 * cute],
      ['やや三白眼気味（黒目が上寄りで下に白目がのぞく）', 7 * cool],
      ['三白眼（黒目が小さめで左右と下に白目が見える）', 3.5 * cool],
      ['上三白眼気味（黒目が下寄りで上に白目がのぞく）', 1.8 * cool]
    ]);
  }

  function chooseEyelid(nationality, ethnicity){
    const ea = isEastAsianLike(nationality, ethnicity);
    return weighted([
      ['一重', ea?3:0.8], ['奥二重', ea?4:1.5], ['末広二重', ea?4:2.5],
      ['平行二重', ea?2:5], ['左右で異なるまぶた（片方だけ二重）', 0.8]
    ]);
  }

  function chooseEyeShape(){
    return weighted([['標準的な目の形',5],['切れ長の目',3],['アーモンド形の目',3],['丸みのある目',2.5],['たれ目気味の目',2],['つり目気味の目',2],['細めの目',1.5]]);
  }

  function chooseEyelash(){
    return weighted([['短めで控えめなまつ毛',3],['標準的な長さのまつ毛',6],['やや長めのまつ毛',2.5],['長めで濃いまつ毛',1.2],['細くまばらなまつ毛',1.5]]);
  }

  function chooseFaceSpacing(vibe){
    const inward = ['クール系','ミステリアス系'].includes(vibe) ? 1.3 : 1;
    const outward = ['犬系男子','清楚系','癒し系'].includes(vibe) ? 1.3 : 1;
    return weighted([[pools.faceSpacings[0], 2*inward],[pools.faceSpacings[1], 4*inward],[pools.faceSpacings[2], 6],[pools.faceSpacings[3], 4*outward],[pools.faceSpacings[4], 2*outward],[pools.faceSpacings[5], 0.8*inward],[pools.faceSpacings[6], 0.8*outward]]);
  }

  function chooseSkinDetail(age, vibe, role, gapMode, exclude, secondary){
    let entries = [['なし（クリアな肌）', secondary ? 26 : 16],['頬にそばかす',2],['鼻まわりに薄いそばかす',2],['額に小さなニキビ',1],['頬にニキビ跡（薄い凹凸）',2],['口元のほくろ',2],['目元の泣きぼくろ',2],['首筋のほくろ',1],['頬の小さなほくろ',2],['うっすら青ひげ（剃り跡）',1],['日焼けによる肌ムラ',1],['えくぼ',1.5],['左頬の薄い傷跡',0.5],['眉尻の剃り込み跡',0.5],['目の下のうっすらしたクマ',1.2],['頬の自然な赤み',1],['額の皮脂感（自然なテカリ）',0.8],['頬の毛穴感（自然な質感）',0.8],['腕まくり日焼けの跡',0.3],['ゴーグル跡の日焼けムラ',0.2],['眉間のしわ',0],['目尻の笑いじわ',0],['ほうれい線',0],['頬の薄いシミ',0],['首のしわ',0]];
    const adj = (v,d) => { const f = entries.find(x=>x[0]===v); if(f) f[1] = Math.max(0.2, f[1]+d); };
    if(!gapMode){
      if(age <= 24){ adj('額に小さなニキビ',2); adj('頬にそばかす',1); adj('額の皮脂感（自然なテカリ）',0.7); }
      if(age >= 30){ adj('額に小さなニキビ',-0.8); }
      if(age >= 40){ adj('うっすら青ひげ（剃り跡）',1); adj('日焼けによる肌ムラ',1); adj('頬にそばかす',-1); adj('眉間のしわ',1.5); adj('目尻の笑いじわ',2); }
      if(age >= 45){ adj('ほうれい線',2); }
      if(age >= 50){ adj('頬の薄いシミ',1.5); }
      if(age >= 60){ adj('首のしわ',1.5); adj('眉間のしわ',1.5); adj('目尻の笑いじわ',1.5); adj('ほうれい線',1.5); adj('頬の薄いシミ',1); adj('なし（クリアな肌）', secondary ? -10 : -6); }
      if(['清楚系','韓国風','ホスト系','きれいめ系','中性系'].includes(vibe)){ adj('なし（クリアな肌）', secondary ? 20 : 14); ['額に小さなニキビ','頬にニキビ跡（薄い凹凸）','うっすら青ひげ（剃り跡）','日焼けによる肌ムラ','頬にそばかす','額の皮脂感（自然なテカリ）','頬の毛穴感（自然な質感）'].forEach(v=>{ const f = entries.find(x=>x[0]===v); if(f) f[1] = f[1]*0.3; }); }
      if(['ブサイク系','おじさん系','ヤンキー系'].includes(vibe)){ adj('頬にニキビ跡（薄い凹凸）',2); adj('うっすら青ひげ（剃り跡）',2); adj('なし（クリアな肌）',-3); }
      if(vibe === 'ヤンキー系') adj('眉尻の剃り込み跡',2);
      if(['ITエンジニア','アプリ開発者','ゲーム開発者','研修医','看護師','救急隊員'].includes(role)) adj('目の下のうっすらしたクマ',1.5);
      if(['アウトドア系','スポーツ系'].includes(vibe) || ['農家','漁師','大工','自動車整備士','電気工事士','工場勤務','配送ドライバー','体育教師','プロスポーツ選手','消防士','自衛官','救急隊員','防衛大学校学生'].includes(role)){ adj('日焼けによる肌ムラ',2); adj('腕まくり日焼けの跡',1.5); }
      if(['プロスポーツ選手','体育教師','ジムトレーナー','スポーツインストラクター'].includes(role) || vibe === 'スポーツ系') adj('ゴーグル跡の日焼けムラ',0.8);
    }
    if(exclude && exclude.length) entries = entries.filter(([v]) => v === 'なし（クリアな肌）' || !exclude.includes(v));
    entries = entries.filter(([,w]) => w > 0);
    return weighted(entries);
  }

  function skinDetailLine(c, english=false){
    const parts = [];
    [c.skinDetail, c.skinDetail2].forEach(v=>{
      if(!v || v === 'なし（クリアな肌）') return;
      String(v).split('＋').forEach(p=>{ if(p && !parts.includes(p)) parts.push(p); });
    });
    if(!parts.length) return '';
    if(english) return ` Skin details: ${parts.map(v=>(typeof valueTranslations!=='undefined' && valueTranslations[v]) || v).join(' and ')} — render them subtly as natural skin texture, never exaggerated and never as grime that undermines his appeal.`;
    return `肌には${parts.join('と')}があり、過度に強調せず自然な質感として描く。キャラクター性を損なう汚れ表現にはしない。`;
  }

  function chooseFacialHair(age, vibe){
    let entries = [['なし',24],['ごく薄い青ひげ',4],['自然な青ひげ',3],['短い無精ひげ',3],['整えた短いひげ',2],['口ひげ',1],['あごひげ',1],['口ひげ＋あごひげ',1],['ワイルドめのひげ',1]];
    if(age >= 35) entries = entries.map(([v,w])=> v==='なし' ? [v, w-8] : ['整えた短いひげ','口ひげ','あごひげ'].includes(v) ? [v, w+2] : [v,w]);
    if(vibe==='おじさん系') entries = entries.map(([v,w])=> v==='なし' ? [v, Math.max(6, w-10)] : [v, w+1]);
    if(vibe==='ワイルド系' || vibe==='ヤンキー系' || vibe==='アウトドア系') entries = entries.map(([v,w])=> ['短い無精ひげ','ワイルドめのひげ'].includes(v) ? [v, w+2] : [v,w]);
    if(['清楚系','真面目系','きれいめ系','韓国風','中性系','ホスト系'].includes(vibe)) entries = entries.map(([v,w])=> v==='なし' ? [v, w+10] : [v, Math.max(1, w-1)]);
    return weighted(entries);
  }

  function chooseGlasses(eraYear, vibe, occupation, age){
    const y = Number(eraYear) || 2026;
    let entries = [['なし',48],['黒縁メガネ',1],['細フレームメガネ',1],['メタルフレームメガネ',1],['丸メガネ',1],['ハーフリムメガネ',1],['縁なしメガネ',1],['金縁メガネ',1]];
    const boost = (name, w) => { const f = entries.find(e=>e[0]===name); if(f) f[1]+=w; };
    if(y < 1990){ boost('金縁メガネ',3); boost('メタルフレームメガネ',2); }
    else if(y < 2005){ boost('細フレームメガネ',3); boost('縁なしメガネ',2); boost('メタルフレームメガネ',1); }
    else { boost('黒縁メガネ',3); boost('丸メガネ',1); boost('ハーフリムメガネ',1); }
    if(vibe==='メガネ知的系'){ entries = entries.map(([v,w])=> v==='なし' ? [v,2] : [v, w+2]); }
    else if(vibe==='オタク系'){ entries = entries.map(([v,w])=> v==='なし' ? [v,14] : [v,w]); boost('黒縁メガネ',4); }
    else if(vibe==='地味系' || vibe==='真面目系'){ entries = entries.map(([v,w])=> v==='なし' ? [v,26] : [v,w]); }
    if(['大学研究員','編集者','大学院生','塾講師','高校教師','薬剤師','建築士','ITエンジニア'].includes(occupation)){ entries = entries.map(([v,w])=> v==='なし' ? [v, Math.max(10, w-14)] : [v, w+1]); }
    if(age !== undefined && age >= 60){ entries = entries.map(([v,w])=> v==='なし' ? [v, Math.round(w*0.55)] : [v, w+1]); }
    return weighted(entries);
  }

  const BRAND_SINCE = {
    'TOMORROWLAND':1978,'EDIFICE':1994,'nano・universe':1999,'AURALEE':2015,'COMOLI':2011,'Paul Smith':1985,'RALPH LAUREN':1978,'LACOSTE':1964,'BROOKS BROTHERS':1979,
    'ワークマン':2018,'Carhartt':1994,'Dickies':1992,'THE NORTH FACE':1978,'DESCENTE':1961,'STÜSSY':1991,'XLARGE':1992,'Champion':1980,
    'UNIQLO':1984,'GU':2006,'無印良品':1980,'MUJI':1980,'ZARA':1998,'H&M':2008,
    'BEAMS':1976,'UNITED ARROWS':1989,'SHIPS':1977,'GLOBAL WORK':1994,'nano・universe':1999,'URBAN RESEARCH':1989,'JOURNAL STANDARD':1997,
    'Calvin Klein':1980,'POLO RALPH LAUREN':1972,'TOMMY HILFIGER':1985,'AOKI':1958,'ORIHICA':2000,'SUIT SELECT':1999,'THE SUIT COMPANY':2000,'P.S.FA':1994,
    'EAST BOY':1989,'OLIVE des OLIVE School':1999,'NIKE':1972,'UNDER ARMOUR':1996,'THE NORTH FACE':1968,
    'EMPORIO ARMANI':1981,'TOM FORD':2006,'BODY WILD':1993,'DIESEL':1978,'Tabio':2000,'靴下屋':1982,'Paul Smith':1984,
    'WEGO':1994,'niko and...':2007,'coen':2008,"FREAK'S STORE":1986,'green label relaxing':1999,'RAGEBLUE':1997,'HARE':2001,"Lui's":2008,'STUDIOUS':2008,'SENSE OF PLACE':2016,'BEAUTY&YOUTH':2006,'UNITED TOKYO':2015,
    'NEIGHBORHOOD':1994,'WTAPS':1996,'visvim':2000,'nonnative':1999,'Supreme':1998,'X-LARGE':1991,'FR2':2016,'HUMAN MADE':2019,'Carhartt WIP':1997,
    'COMOLI':2011,'AURALEE':2015,'kolor':2004,'sacai':1999,'N.HOOLYWOOD':2000,'White Mountaineering':2006,
    'mont-bell':1975,'Patagonia':1988,'GRAMICCI':1995,'EDWIN':1961,"Levi's":1971,'BIG JOHN':1968,'KONAKA':1973,'五大陸':1992,'DESCENTE':1961,'le coq sportif':1980,
    'MUSINSA STANDARD':2017,'TOPTEN':2012,'Covernat':2008,'ADER error':2014,
    '李寧':1990,'ANTA':1994,'Bosideng':1976,'HLA':2002,'Semir':1996,
    "O'STIN":2003,'Gloria Jeans':1988,'Sela':1991,
    'Gap':1969,'Old Navy':1994,'Carhartt':1889,'Dickies':1922,'L.L.Bean':1912,
    'Marks & Spencer':1884,'Next':1982,'Fred Perry':1952,'Barbour':1894,'Ben Sherman':1963,
    'A.P.C.':1987,'agnès b.':1975,'SAINT JAMES':1889,
    'Hugo Boss':1924,'Jack Wolfskin':1981,'s.Oliver':1969,
    'Diesel':1978,'Benetton':1965,'Stone Island':1982,'Fila':1911,
    'Massimo Dutti':1985,'Pull&Bear':1991,'Mango':1984,'Desigual':1984,
    'Havaianas':1962,'Osklen':1989,'Hering':1880,'8seconds':2012,'SPAO':2009,'ANDERSSON BELL':2014,'thisisneverthat':2010,'GXG':2007,'SELECTED':1997,
    'VAN':1954,'JUN':1958,'D\'URBAN':1970,'TAKEO KIKUCHI':1984,'MEN\'S BIGI':1975,'COMME des GARÇONS HOMME':1978,'A BATHING APE':1993,'UNDERCOVER':1990,'Stüssy':1991,'GAP':1995,'洋服の青山':1964,'はるやま':1955
  };

  function brandAvailableInEra(brand, year){
    const since = BRAND_SINCE[brand];
    return since === undefined ? true : Number(year) >= since;
  }

  function eraBrandList(arr, year, fallback='無地ノーブランド'){
    const f = (arr||[]).filter(b=>brandAvailableInEra(b, year));
    return f.length ? f : [fallback];
  }

  function warekiOf(y){
    y = Number(y) || 2026;
    const n = (era, base) => { const k = y - base; return `${era}${k === 1 ? '元' : k}年`; };
    if(y >= 2019) return n('令和', 2018);
    if(y >= 1989) return n('平成', 1988);
    if(y >= 1926) return n('昭和', 1925);
    if(y >= 1912) return n('大正', 1911);
    return n('明治', 1867);
  }

  function eraLabel(y, english=false){
    y = Number(y) || 2026;
    return english ? `${y}` : `${y}年（${warekiOf(y)}）`;
  }

  function eraPhotoStyle(y){
    y = Number(y) || 2026;
    if(y < 1930) return ['モノクロの乾板写真風（粒子と滲みのあるクラシックな質感）','a monochrome glass-plate photograph look with heavy grain and soft blur'];
    if(y < 1955) return ['モノクロフィルム写真風','a monochrome film photograph look'];
    if(y < 1975) return ['初期カラーフィルム風（少し退色した色味）','an early color film look with slightly faded tones'];
    if(y < 1990) return ['フィルム写真らしい濃いめの発色','a rich film-photo color look'];
    if(y < 2003) return ['コンパクトフィルムカメラ風の写り','a compact film camera look'];
    if(y < 2013) return ['初期デジタルカメラ風の写り','an early digital camera look'];
    return ['現代のスマホ・ミラーレス風のクリアな写り','a clean modern smartphone/mirrorless look'];
  }

  function scriptOf(nat){
    const m = {'ロシア':'キリル文字','モンゴル':'キリル文字','韓国':'ハングル','中国':'漢字（簡体字）','台湾':'漢字（繁体字）','タイ':'タイ文字','インド':'デーヴァナーガリー文字など現地文字'};
    return m[nat] || '現地語のラテン文字';
  }

  function countryLine(c, english=false){
    const nat = c && c.nationality;
    if(!nat || nat === '日本') return '';
    const natEn = (typeof valueTranslations!=='undefined' && valueTranslations[nat]) || nat;
    if(english) return `The setting is ${natEn}: match the streets, signage (in the local script), vehicles, and passers-by to that country in the same era. `;
    return `舞台は${nat}。街並み・看板の文字（${scriptOf(nat)}）・車両・行き交う人々の装いも${nat}の同年代に合わせる。`;
  }

  function seasonLine(c, english=false){
    const sn = c && c.season;
    if(!sn) return '';
    const M = {
      '春':['季節は春。軽めの羽織りものや柔らかい光、桜や新緑など、春らしい装いと街の様子にする。','It is spring: light layers, soft light, and spring scenery such as cherry blossoms or fresh greenery. '],
      '夏':['季節は夏。半袖や薄手の服、強い日差し、青々とした街路樹など、夏らしい装いと街の様子にする。','It is summer: short sleeves or light fabrics, strong sunlight, and lush summer streets. '],
      '秋':['季節は秋。重ね着や暖色の光、紅葉など、秋らしい装いと街の様子にする。','It is autumn: layered outfits, warm-toned light, and autumn foliage. '],
      '冬':['季節は冬。コートやニットの防寒、冷たく澄んだ空気、冬枯れや雪の気配など、冬らしい装いと街の様子にする。','It is winter: coats and knitwear, crisp cold air, and hints of bare trees or snow. ']
    };
    const m = M[sn];
    if(!m) return '';
    const adj = english ? 'The outfit may be naturally adapted to the season (sleeve length, adding or removing outerwear) while keeping the specified coordination as the base. ' : '（服装は指定コーデを基準に、袖丈やアウターの有無を季節に合わせて自然に調整してよい）';
    return english ? `${m[1]}${adj}` : `${m[0]}${adj}`;
  }

  function eraContextLine(c, english=false){
    const y = c.eraYear || '2026';
    const p = eraPhotoStyle(y);
    if(english) return `Era setting: around ${y}. Match streets, signage, props, vehicles, and garment textures to this period, exclude anything that did not exist yet. ${countryLine(c, true)}${seasonLine(c, true)}Render the image as ${p[1]}.\n`;
    return `時代設定：${eraLabel(y)}頃。街並み・看板・小物・車両・服の質感をこの年代に合わせ、その時代に存在しない物は描かない。${countryLine(c, false)}${seasonLine(c, false)}画の質感は${p[0]}にする。\n`;
  }

  function avgHeight(nationality, eraYear){
    const y = Number(eraYear) || 2026;
    if(!nationality || nationality === '日本'){
      if(y < 1920) return 157; if(y < 1940) return 160; if(y < 1955) return 162;
      if(y < 1970) return 166; if(y < 1985) return 168; if(y < 2000) return 170;
      return 171;
    }
    const MODERN = {'韓国':174,'中国':172,'台湾':172,'タイ':169,'ベトナム':167,'フィリピン':167,'インドネシア':167,'マレーシア':168,'インド':167,'アメリカ':177,'カナダ':177,'イギリス':177,'フランス':176,'スペイン':176,'ドイツ':180,'イタリア':175,'オーストラリア':178,'ブラジル':175,'メキシコ':170,'ロシア':176,'スウェーデン':180,'ポーランド':178,'トルコ':174,'モンゴル':170,'ナイジェリア':170,'アルゼンチン':174};
    const m = MODERN[nationality] || 172;
    const decay = y >= 2000 ? 0 : Math.min(8, Math.round((2000 - y) * 0.07));
    return m - decay;
  }

  function pickHeightAround(avg){
    const off = weighted([[0,6],[1,5],[-1,5],[2,4],[-2,4],[3,3],[-3,3],[4,2],[-4,2],[5,1.5],[-5,1.5],[7,1],[-7,1],[10,0.5],[-10,0.5],[12,0.25],[-12,0.25]]);
    return Math.max(155, Math.min(196, Math.round(avg + Number(off))));
  }

  function footFromHeight(height, ethnicity){
    const bonus = ['白人系','黒人系','スラブ系','北欧系','南欧系'].includes(ethnicity) ? 0.5 : 0;
    const fl = Number(weighted([[0,5],[0.5,4],[-0.5,4],[1,2],[-1,2],[1.5,1],[-1.5,1]]));
    const sizeUp = Number(weighted([[0.5,6],[1.0,4]]));
    let f = (Number(height) || 171) * 0.149 + bonus + fl + sizeUp;
    f = Math.round(f * 2) / 2;
    f = Math.max(25.5, Math.min(31.0, f));
    return `${f.toFixed(1).replace('.0','')}cm`;
  }

  function eraProfile(year){
    const y = Number(year) || 2026;
    if(y < 1946) return {
      labelJa: y < 1912 ? '明治末期' : (y < 1927 ? '大正時代' : '昭和戦前・戦中期'), labelEn: 'prewar-era Japan',
      faces:[['昭和顔（濃い顔立ち）',4],['彫りの深い縄文系',3],['真面目系',3],['落ち着いた大人系',2],['普通顔',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風','塩顔系','平成アイドル風'],
      hairStyles:[['坊主',4],['七三分け',4],['オールバック',3],['短髪',2]],
      hairColors:[['黒',8]],
      excludeHairColors:['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','アッシュブラウン','オレンジブラウン','明るめブラウン','自然な茶髪','マロンブラウン','カーキブラウン','赤みブラウン','チョコレートブラウン','ダークチェリーブラウン','ダークアッシュ','ネイビーブラック'],
      outfits: y >= 1940 ? [['国民服風',5],['着物と羽織',2],['開襟シャツスタイル',1]] : [['書生風スタイル（着物＋袴＋学帽）',3],['着物と羽織',4],['三つ揃いスーツ',2],['開襟シャツスタイル',1]],
      bodyTypes:[['やせ型',4],['細身',4],['標準体型',3]]
    };
    if(y < 1970) return {
      labelJa:'戦後・高度成長期', labelEn:'postwar Japan',
      faces:[['昭和顔（濃い顔立ち）',4],['真面目系',3],['落ち着いた大人系',3],['普通顔',3],['ソース顔',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風','塩顔系','平成アイドル風'],
      hairStyles:[['七三分け',4],['坊主',3],['オールバック',3],['短髪',3]],
      hairColors:[['黒',8]],
      excludeHairColors:['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','アッシュブラウン','オレンジブラウン','明るめブラウン','マロンブラウン','カーキブラウン','赤みブラウン','ダークチェリーブラウン'],
      outfits:[['開襟シャツスタイル',3],['三つ揃いスーツ',2],['グレースーツ',2],['社会人カジュアル',1],['着物と羽織',1]],
      bodyTypes:[['やせ型',3],['細身',3],['標準体型',3]]
    };
    if(y < 1980) return {
      labelJa:'1970年代', labelEn:'the 1970s',
      faces:[['落ち着いた大人系',3],['ワイルド系',3],['普通顔',3],['真面目系',2],['昭和顔（濃い顔立ち）',4],['ソース顔',3],['彫りの深い縄文系',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風','塩顔系','平成アイドル風'],
      hairStyles:[['センターパート',4],['ロング寄りミディアム',4],['ウルフミディアム',3],['マッシュ',2],['ニュアンスパーマ',2]],
      excludeHair:['韓国風センターパート','マンバン','ツイストパーマ','波巻きパーマ','スパイラルパーマ','ソフトツーブロック'],
      hairColors:[['黒',6],['黒に近いダークブラウン',1]],
      excludeHairColors:['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','アッシュブラウン','オレンジブラウン'],
      bodyTypes:[['細身',4],['やせ型',3],['標準体型',3]]
    };
    if(y < 1990) return {
      labelJa:'1980年代', labelEn:'the 1980s',
      faces:[['落ち着いた大人系',3],['普通顔',3],['爽やか知的アナウンサー系',2],['ワイルド系',2],['真面目系',2],['昭和顔（濃い顔立ち）',3],['ソース顔',3],['彫りの深い縄文系',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風','塩顔系','平成アイドル風'],
      hairStyles:[['サイドパート',4],['短髪',3],['マッシュ',2],['ロング寄りミディアム',2],['アップバング',2]],
      excludeHair:['韓国風センターパート','マンバン','ツイストパーマ','波巻きパーマ','スパイラルパーマ'],
      hairColors:[['黒',6],['黒に近いダークブラウン',1]],
      excludeHairColors:['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','アッシュブラウン','オレンジブラウン'],
      bodyTypes:[['標準体型',4],['細身',3],['スーツ映え体型',2]]
    };
    if(y < 2000) return {
      labelJa:'1990年代', labelEn:'the 1990s',
      faces:[['日本の若手俳優風',4],['普通顔',3],['親しみやすい大学生系',2],['ワイルド系',2],['平成アイドル風',3],['しょうゆ顔',2],['ソース顔',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風'],
      hairStyles:[['センターパート',5],['ロング寄りミディアム',3],['短髪',3],['マッシュ',2],['ウルフミディアム',2]],
      excludeHair:['韓国風センターパート','マンバン','ツイストパーマ','波巻きパーマ'],
      hairColors:[['黒',4],['自然な茶髪',3],['明るめブラウン',2],['金髪（ブリーチ）',1],['プリン気味の伸びた茶髪',1],['メッシュ入りブラック',1]],
      excludeHairColors:['ブルージュ','ラベンダーグレージュ','オリーブアッシュ','インナーカラー（アッシュ）','ミルクティーベージュ','シルバーアッシュ'],
      bodyTypes:[['細身',4],['標準体型',3],['やせ型',2]]
    };
    if(y < 2010) return {
      labelJa:'2000年代', labelEn:'the 2000s',
      faces:[['清潔感のある若手俳優風',3],['日本の若手俳優風',3],['普通顔',3],['ワイルド系',2],['しょうゆ顔',3],['平成アイドル風',2]],
      excludeFaces:['やりらふぃー系','犬系男子風','韓国アイドル風'],
      hairStyles:[['ウルフミディアム',5],['短髪',3],['スパイラルパーマ',2],['アップバング',2]],
      excludeHair:['マンバン','韓国風センターパート','波巻きパーマ'],
      hairColors:[['明るめブラウン',3],['自然な茶髪',3],['黒',3],['金髪（ブリーチ）',2],['ハイトーンアッシュ',2],['メッシュ入りブラック',2],['プリン気味の伸びた茶髪',1]],
      excludeHairColors:['ブルージュ','ラベンダーグレージュ','オリーブアッシュ'],
      bodyTypes:[['細身',3],['標準体型',3],['引き締まったスポーツ体型',2]]
    };
    if(y < 2020) return {
      labelJa:'2010年代', labelEn:'the 2010s',
      faces:[['塩顔系',3],['清潔感のある若手俳優風',3],['普通顔',3],['韓国アイドル風',2],['犬系男子風',2],['しょうゆ顔',2],['あっさり弥生系',2],['たれ目系',1]],
      excludeFaces:[],
      hairStyles:[['ソフトツーブロック',5],['アップバング',4],['短髪',3],['ビジネス短髪',2],['マッシュ',2]],
      excludeHair:[],
      hairColors:[['黒',3],['アッシュブラウン',2],['ブルーブラック',2],['自然な茶髪',2],['ダークアッシュ',2],['ミルクティーベージュ',1]],
      bodyTypes:[['引き締まったスポーツ体型',3],['細身',3],['標準体型',3],['筋肉質',2],['細マッチョ',2]]
    };
    return {
      labelJa:'2020年代', labelEn:'the 2020s',
      faces:[['韓国アイドル風',3],['中性系',3],['塩顔系',3],['やりらふぃー系',2],['犬系男子風',2],['普通顔',2],['あっさり弥生系',2],['たれ目系',2],['つり目系',1]],
      excludeFaces:[],
      hairStyles:[['マッシュ',4],['センターパート',4],['韓国風センターパート',4],['ニュアンスパーマ',3],['ツイストパーマ',3],['波巻きパーマ',2],['マンバン',1]],
      excludeHair:[],
      hairColors:[['黒',3],['ブルーブラック',2],['アッシュブラウン',2],['グレージュ',1],['ブルージュ',2],['オリーブアッシュ',2],['ラベンダーグレージュ',1],['シルバーアッシュ',1],['ミルクティーベージュ',1]],
      bodyTypes:[['痩せマッチョ',3],['引き締まったスポーツ体型',3],['細身',3],['標準体型',3],['細マッチョ',2]]
    };
  }

  function eraAdjustEntries(entries, era, boostsKey, excludeKey, mult=1){
    let e = entries.map(([v,w])=>[v,w]);
    const excludes = era[excludeKey] || [];
    const filtered = e.filter(([v])=>!excludes.includes(v));
    if(filtered.length) e = filtered;
    (era[boostsKey]||[]).forEach(([v,w])=>{
      const boosted = Math.round(w * mult);
      const f = e.find(x=>x[0]===v);
      if(f) f[1]+=boosted; else e.push([v,boosted]);
    });
    return e;
  }

  const SMILE_EYES=['笑うと目が糸のように細くなり三日月形に消える','笑うと目尻が下がって垂れ目になる','笑っても目の形はあまり変わらない（口で笑うタイプ）','笑うと目尻に若い笑い皺が寄る','笑うと片目だけ強く細くなる','笑うと下まぶたが持ち上がる涙袋笑い','笑うと目を見開いて輝かせる','笑うと細まりつつ目に光をたたえる'];

  const SMILE_STYLES=['上の歯をしっかり見せる満面のくしゃ笑い','八重歯がのぞく笑い','口角だけ上げる控えめな笑み','歯を見せない照れ笑い','笑うと鼻に軽くしわが寄る','声が出そうな大口の笑い','口角が左右非対称に上がるニヒルな笑み','はにかんで口元を手で隠しがちな笑い','ふっと息が漏れるような笑い方','にっと横に大きく広がる笑い'];

  const CHEEK_SMILES=['笑うと頬がリンゴのように高く盛り上がる','笑うと頬に縦の笑いジワが入る','笑ってもシャープな頬のまま','笑うと頬とえくぼが連動してへこむ','頬全体が柔らかく持ち上がる'];

  const MOUTH_CORNERS=['地顔でも口角が上がり気味（常に機嫌よく見える）','口角は水平でニュートラル','への字気味（笑うと印象が激変する）','片側だけわずかに上がる'];

  function chooseSmileTraits(c){
    const fp=String(c.facePreset||''), vibe=String(c.vibe||'');
    const cute=/童顔|パピー|くしゃ笑い|たれ目|犬系|親しみ|大学生/.test(fp)||['韓国風','スポーツ系','元気系','爽やか系'].includes(vibe);
    const cool=/クール|ミステリアス|塩顔|しょうゆ|モデル/.test(fp)||['クール系','ミステリアス系','紳士系'].includes(vibe);
    const W=(arr,f)=>weighted(arr.map(v=>[v,f(v)]));
    return {
      smileEyes: W(SMILE_EYES,v=>/糸のよう|垂れ目になる|涙袋笑い/.test(v)?(cute?5:cool?0.6:2):/変わらない|見開いて/.test(v)?(cool?4:1):2),
      smileStyle: W(SMILE_STYLES,v=>/くしゃ笑い|大口|八重歯|横に大きく/.test(v)?(cute?5:cool?0.5:2):/控えめ|照れ笑い|ニヒル|息が漏れる/.test(v)?(cool?4:1.5):2),
      cheekSmile: W(CHEEK_SMILES,v=>{ const hollow=/こけ|薄くシャープ|影になる/.test(String(c.cheek||'')); if(/リンゴ|柔らかく持ち上がる/.test(v)) return hollow?0.4:(cute?5:1.5); if(/シャープ/.test(v)) return hollow?4:(cool?4:1); return 2; }),
      mouthCorner: W(MOUTH_CORNERS,v=>/上がり気味/.test(v)?(cute?4:2):/への字/.test(v)?(cool?2.5:1):2)
    };
  }

  function smileLine(c, english=false){
    if(!c.smileEyes) return '';
    if(english) return ` Smile traits: ${c.smileEyes}; ${c.smileStyle}; ${c.cheekSmile}; ${c.mouthCorner}.`;
    return `笑い方の特徴：${c.smileEyes}。${c.smileStyle}。${c.cheekSmile}。${c.mouthCorner}。`;
  }

  function bmiLine(c, english){
    const h=Number(c.height)||170, w=parseInt(c.weight)||62, bmi=w/Math.pow(h/100,2);
    if(bmi<19.5) return english?` He is visibly thin at ${h}cm and ${w}kg — slender arms and legs, low muscle mass; this thin impression takes priority over any athletic wording.`:`（${h}cm・${w}kgの見るからに痩せた体つき。腕も脚も細く、この体重感を体型表現より優先する）`;
    if(bmi>=26) return english?` His ${w}kg reads as a solidly built, thick frame for ${h}cm.`:`（${h}cmに対して${w}kgのどっしりした厚みのある体つき）`;
    return '';
  }

  function facePresetPhrase(c, english=false, lead=true){
    if(!c || c.facePresetOut === '含めない') return '';
    if(english) return `Overall face impression: ${c.facePreset} (but for eyes, nose, mouth and other details, the part-level specs below take priority). `;
    return `顔立ちの全体印象は${c.facePreset}（ただし目・鼻・口など細部は後述のパーツ指定を優先する）。`;
  }

  function eraStyleNote(c, english=false){
    const y = Number(c.eraYear) || 2026;
    const era = eraProfile(y);
    if(english) return `Match the hairstyle, physique presentation, fashion, accessories, and surroundings to the look and feel of around ${y} (${era.labelEn}), and avoid brands, hairstyles, or items that did not exist in that era.`;
    return `髪型・体型の見せ方・ファッション・小物・街並みは${eraLabel(y)}頃（${era.labelJa}）の時代感に合わせ、その時代に存在しないブランド・髪型・アイテムの表現は避ける。`;
  }

  function generateEraUnderwear(eraYear){
    const y = Number(eraYear) || 2026;
    let entries;
    if(y < 1980) entries = [['白ブリーフ',6],['カラーブリーフ',1]];
    else if(y < 1990) entries = [['白ブリーフ',4],['トランクス',2],['カラーブリーフ',1]];
    else if(y < 2000) entries = [['トランクス',5],['白ブリーフ',2],['ボクサーパンツ',1]];
    else if(y < 2010) entries = [['ボクサーパンツ',3],['トランクス',3],['白ブリーフ',1]];
    else if(y < 2020) entries = [['ボクサーパンツ',5],['トランクス',1]];
    else entries = [['ボクサーパンツ',6],['白ブリーフ',1]];
    const type = weighted(entries);
    let color;
    if(type === '白ブリーフ') color = '白';
    else if(type === 'カラーブリーフ') color = pick(['ライトブルー','グレー','ネイビー']);
    else if(type === 'トランクス') color = pick(['チェック柄','ストライプ柄','無地ネイビー','無地グレー','小紋柄']);
    else color = pick(pools.boxerColors);
    return {type, color};
  }

  const UNDERWEAR_COLOR_EN = {'白':'white','ライトブルー':'light blue','グレー':'gray','ネイビー':'navy','チェック柄':'plaid','ストライプ柄':'striped','無地ネイビー':'plain navy','無地グレー':'plain gray','小紋柄':'subtly patterned','ライトグレー':'light gray','黒':'black','チャコール':'charcoal','ダークグレー':'dark gray'};

  function underwearDesc(c, english=false){
    const mode = c?.mainWearMode || 'ボクサーパンツのみ';
    const brandJa = c?.boxerBrand && c.boxerBrand !== '指定しない' ? `${c.boxerBrand}の` : '';
    const brandEn = c?.boxerBrand && c.boxerBrand !== '指定しない' ? `${valueTranslations[c.boxerBrand] || c.boxerBrand} ` : '';
    if(mode === '時代に合った下着の種類' && c?.underwearType){
      const t = c.underwearType, col = c.underwearColor || '';
      if(english){
        const colEn = UNDERWEAR_COLOR_EN[col] || col;
        const tEn = {'白ブリーフ':'classic white briefs','カラーブリーフ':`${colEn} classic briefs`,'トランクス':`${colEn} loose trunks-style boxer shorts`,'ボクサーパンツ':`${colEn} boxer briefs`}[t] || `${colEn} ${t}`;
        return `${brandEn}${tEn}`;
      }
      const tJa = {'白ブリーフ':'白ブリーフ','カラーブリーフ':`${col}のカラーブリーフ`,'トランクス':`${col}のトランクス`,'ボクサーパンツ':`${col}のボクサーパンツ`}[t] || `${col}の${t}`;
      return `${brandJa}${tJa}`;
    }
    const bwt = c?.baseWearType || 'ボクサーパンツ';
    const bwtEn = {'ボクサーパンツ':'boxer briefs','ショートショーツ':'athletic short shorts','スポーツスパッツ':'sports compression spats'}[bwt] || 'boxer briefs';
    if(english) return `${brandEn}${UNDERWEAR_COLOR_EN[c?.boxerColor] || c?.boxerColor} ${bwtEn}`;
    return `${brandJa}${c?.boxerColor}の${bwt}`;
  }

  function bodyTypeDesc(v, english=false){
    if(v==='腹だけぽっちゃり') return english
      ? 'belly-only chubby — his face, arms, legs, and chest stay average and NOT chubby; only the stomach area is softly rounded. Do NOT make the whole body chubby'
      : '腹だけぽっちゃり（顔・腕・脚・胸まわりは標準的なままで、お腹まわりだけ柔らかく丸みがある。全身をぽっちゃりさせない）';
    if(v==='ビール腹') return english
      ? 'beer belly — only a firm, forward-protruding belly; his face, arms, legs, and chest stay average. Do NOT make the whole body fat'
      : 'ビール腹（張りのあるお腹だけが前に出ている。顔・腕・脚・胸まわりは標準的なままで、全身は太らせない）';
    return v;
  }

  const FOOT_SCENES = [
    ['玄関で靴を脱ぐ場面','stand','玄関のたたき'],['座敷・和室でくつろぐ','floor','畳'],['自室でくつろぐ','floor','フローリング'],['リビングのソファー周り','chair','カーペット'],['オフィスの椅子まわり（休憩中）','chair','オフィスの床'],['更衣室・ロッカールーム','chair','更衣室の床'],['スリッパに履き替える場面','stand','フローリング'],['ベッドの上でくつろぐ','bed',''],['縁側で休む','floor','縁側の木板'],['小上がりの飲食店','floor','畳'],['畳の休憩室（職場の仮眠室）','floor','畳'],['こたつのある部屋','floor','カーペットとこたつ布団'],['足湯上がりに靴下を履き直した後','chair','ベンチのある床'],['新幹線の座席（靴を脱いでくつろぐ）','chair','車内の床']
  ];

  const FOOT_FABRICS = [
    ['軽い使用感',[1,3],'数回の洗濯を経た柔らかな風合いで、ごくわずかな毛玉がある'],
    ['日常使いの使用感',[3,4],'生地が少しくたびれ、かかととつま先の色がうっすら薄れている'],
    ['しっかり履き込んだ状態',[2,2],'毛玉と生地の伸びがあり、かかと部分の生地が薄くなり始めている'],
    ['履き古した状態',[0.7,0.7],'かかとと親指部分の生地が薄く透け気味で、履き口のゴムがゆるみ、全体に色あせている'],
    ['長時間履いた後の状態',[4,1.5],'一日履いた後の自然なしわが寄り、足裏にうっすらした踏み跡とくすみがある']
  ];

  const FOOT_OCC_SCENES = {
    '自衛官':[
      ['駐屯地の営内居室（白いパイプの2段ベッドが整然と並ぶ明るい大部屋）','chair','明るいリノリウムの床',['きっちり角を揃えて畳んだ布団と毛布','水色のプラスチック収納ボックス','窓際の共用机と椅子','ベッド下につま先を揃えて並べた半長靴','磨き途中の半長靴と靴磨きセット'],true],
      ['営内の2段ベッドの下段に腰掛けて休む','bed','',['ベッド下の貴重品引き出し','きっちり畳んだ毛布','ロッカーに掛けた迷彩服'],true],
      ['隊舎の乾燥室・靴磨きスペース','floor','リノリウムの床',['並んだ半長靴と靴墨','手入れ用の布'],false]
    ],
    '防衛大学校学生':[
      ['防衛大学校の学生舎居室（クリーム色の金属パイプ2段ベッドと縞柄マットレス、きっちり畳まれた寝具が並ぶ8人部屋）','bed','木目調のタイルカーペット',['角を揃えて畳んだ毛布と布団','ベッド下のプラスチック収納ボックス','ベッドに隣接したクリーム色のロッカー','2段ベッドの白いはしご','大きな窓から差し込む光'],true],
      ['学生舎の自習室（壁沿いに机と吊り棚が並び、白いパーティションで区切られた部屋）','chair','ベージュのタイルカーペット',['本棚に並んだ教科書と専門書','緑のデスクマットと卓上スタンド','青い事務椅子','壁掛け時計'],false],
      ['学生舎の長い廊下で短靴を磨く（白い壁に窓が続く、グレーの石目調の床の直線廊下）','floor','グレーの石目調の床',['靴磨きセット','新聞紙の上に並べた短靴','壁のフックと掲示物','廊下のデジタル時計'],false]
    ],
    '警察官':[
      ['警察の独身寮の自室','floor','フローリング',['ハンガーに掛けた制服','小さなテレビ','湯のみとお茶'],true],
      ['交番の休憩スペース','chair','事務室の床',['書類とボールペン','支給のお茶'],false]
    ],
    '消防士':[
      ['消防署の仮眠室（青いパーティションで仕切られた個別のベッド区画）','bed','',['天井レールから吊られた薄緑のカーテン','白いシーツのパイプベッド','壁掛け時計','壁に掛けた活動服'],true],
      ['消防署の食堂・休憩室','chair','リノリウムの床',['大きなやかんと湯のみ','当番表'],false]
    ],
    '救急隊員':[
      ['消防署の仮眠室（青いパーティションで仕切られた個別のベッド区画）','bed','',['天井レールから吊られた薄緑のカーテン','白いシーツのパイプベッド','壁掛け時計','壁に掛けた活動服'],true]
    ]
  };

  const FOOT_SCENE_MIGRATION = {
    '駐屯地の営内居室（ベッドとスチールロッカーが整然と並ぶ部屋）':'駐屯地の営内居室（白いパイプの2段ベッドが整然と並ぶ明るい大部屋）',
    '営内のベッドに腰掛けて休む':'営内の2段ベッドの下段に腰掛けて休む',
    '防衛大学校の学生舎居室（ベッドとロッカーが並ぶ8人部屋）':'防衛大学校の学生舎居室（クリーム色の金属パイプ2段ベッドと縞柄マットレス、きっちり畳まれた寝具が並ぶ8人部屋）',
    '学生舎の自習室（壁沿いに机と本棚が並ぶパーティション区切りの部屋）':'学生舎の自習室（壁沿いに机と吊り棚が並び、白いパーティションで区切られた部屋）',
    '学生舎の廊下で短靴を磨く':'学生舎の長い廊下で短靴を磨く（白い壁に窓が続く、グレーの石目調の床の直線廊下）',
    '消防署の仮眠室':'消防署の仮眠室（青いパーティションで仕切られた個別のベッド区画）'
  };

  const FOOT_OCC_CAT_SCENES = {
    office:[['オフィスのリフレッシュスペース','chair','カーペット',['コーヒーカップ','観葉植物'],false]],
    it:[['オフィスの仮眠スペース','bed','',['ノートPC','ワイヤレスイヤホン'],true]],
    student:[['大学のサークル部室','floor','古いカーペット',['マンガ雑誌','部室のポット'],true]]
  };

  function footOccScenes(role){
    if(!role) return [];
    let rows = (FOOT_OCC_SCENES[role] || []).slice();
    if(!rows.length && typeof OCC_CAT !== 'undefined' && FOOT_OCC_CAT_SCENES[OCC_CAT[role]]) rows = FOOT_OCC_CAT_SCENES[OCC_CAT[role]].slice();
    return rows;
  }

  function footCfg(c){ const base={scene:'ランダム',posture:'ランダム',shoeState:'ランダム',wear:'ランダム',fabric:'ランダム',sockState:'ランダム',angle:'ランダム',prop:'ランダム'}; const out = Object.assign(base, (c && c.footScene) || {}); if(FOOT_SCENE_MIGRATION[out.scene]) out.scene = FOOT_SCENE_MIGRATION[out.scene]; return out; }

  function refSheetKind(outputType){
    if(!outputType) return null;
    if(outputType.includes('表情AU')) return 'facs';
    if(outputType.includes('服装基準カード（職業服装）')) return 'wearcardWork';
    if(outputType.includes('服装基準カード（私服）')) return 'wearcardCasual';
    if(outputType.includes('比較リファレンスシート')) return 'compare';
    if(outputType.includes('表情差分リファレンスシート')) return 'expressions';
    if(outputType.includes('フル設定資料シート')) return 'full';
    if(outputType.includes('段階着装リファレンスシート')) return 'stages';
    if(outputType.includes('ブループリントシート')) return 'blueprint';
    if(outputType.includes('服装リファレンスシート')) return 'outfitref';
    if(outputType.includes('人物ポスター')) return 'poster';
    if(outputType.includes('街で見かけたイケメンシート：職業編')) return 'machiWork';
    if(outputType.includes('街で見かけたイケメンシート：オフ編')) return 'machiOff';
    if(outputType.includes('偶然足元強調場面シート')) return 'feet';
    if(outputType.includes('参考画像作成シート')) return 'handoff';
    if(outputType.includes('人物特集雑誌ページ')) return 'magazine';
    if(outputType.includes('キャラクタープロフィールシート')) return 'profilesheet';
    return null;
  }

  function outfitSummaryLine(c, english=false){
    if(english) return c.workUniform ? `Work outfit for the outfit panels: ${c.workUniformEn} — top: ${c.top}${uniformJacketPhrase(c, true)}, bottom: ${c.bottom}${uniformHatPhrase(c, true)}, socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}), shoes (only where allowed): ${c.shoes}. Do not reproduce real organizations' insignia or logos.` : `Suggested outfit for the outfit panels: ${c.outfitBrand?`${c.outfitBrand} `:''}${c.outfitType} — outerwear: ${c.jacket}, top: ${c.top}, bottom: ${c.bottom}, socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}), shoes (only where allowed): ${c.shoes}.`;
    return c.workUniform ? `服装パネルの内容：${c.workUniform}。トップスは${c.top}${uniformJacketPhrase(c, false)}、ボトムスは${c.bottom}${uniformHatPhrase(c, false)}、靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}）、靴（許可されたパネルのみ）は${c.shoes}。実在組織の記章・ロゴは正確に再現しない。` : `提案服装パネルの内容：${c.outfitBrand?`${c.outfitBrand}の`:''}${c.outfitType}。上着は${c.jacket}、トップスは${c.top}、ボトムスは${c.bottom}、靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}）、靴（許可されたパネルのみ）は${c.shoes}。`;
  }

  const POSTER_FOOT = {
    '僧侶':['寺内や和室の場面なら素足や足袋・雪駄が自然。屋外なら雪駄や作業用の履物を選ぶ','in a temple or tatami setting, bare feet or tabi/setta sandals are natural; outdoors, setta or work footwear'],
    '書道家':['和室で揮毫する構図なら素足または足袋が自然','bare feet or tabi are natural if he is writing in a tatami room'],
    '寿司職人':['カウンター内の板前姿なら白衣に雪駄や厨房履きが自然','setta sandals or kitchen footwear suit his whites behind the counter'],
    '漁師':['船上や浜の場面では長靴のほか、素足やサンダルが自然な場合もある','on a boat or beach, bare feet or sandals can be as natural as rubber boots'],
    '農家':['田畑では長靴が基本だが、田植えの場面なら素足も自然','rubber boots are standard in the fields, but bare feet are natural in a rice-planting scene'],
    '体育教師':['体育館の場面では室内シューズ、道場なら素足が自然','indoor shoes in a gym, or bare feet in a dojo setting'],
    'ジムトレーナー':['トレーニングシューズが基本だが、ストレッチエリアなら素足も可','training shoes as standard, bare feet acceptable in a stretch area']
  };

  function posterFootNote(c, english=false){
    const sp = POSTER_FOOT[c.role];
    if(english) return `Footwear should be whatever is most natural for his occupation and the chosen scene${sp ? ` — for him: ${sp[1]}` : ''}. If shoes would look unnatural (tatami rooms, dojos, beaches, etc.), consider bare feet, tabi, setta/geta sandals, or other footwear instead of defaulting to shoes and socks. `;
    return `足元は職業と場面に最も自然な状態を選ぶ${sp ? `（この人物の場合：${sp[0]}）` : ''}。靴が不自然な場面（和室・道場・砂浜など）では、靴と靴下に固定せず、素足・足袋・雪駄・下駄・サンダルなども検討する。`;
  }

  function bmiOf(c){ const h = ((c.heightRaw || parseInt(c.height, 10) || 171)) / 100; const w = parseFloat(c.weight) || 65; return w / (h * h); }

  function headCount(c){
    const h = c.heightRaw || parseInt(c.height, 10) || 171;
    let v = 7.0 + (h - 171) * 0.07;
    const bt = String(c.bodyType || '');
    let adj = 0;
    if(/高身長モデル|脚が長い/.test(bt)) adj = 0.2;
    else if(/細身|やせ型|華奢|スーツ映え/.test(bt)) adj = 0.1;
    else if(/筋肉質|がっしり|骨太|ラグビー|柔道家/.test(bt)) adj = -0.1;
    else if(/ぽっちゃり|ビール腹|腹だけ/.test(bt)) adj = -0.1;
    const bmi = bmiOf(c);
    let badj = 0;
    if(bmi < 18.5) badj = 0.1; else if(bmi >= 27) badj = -0.1; else if(bmi >= 25) badj = -0.05;
    v += Math.abs(adj) >= Math.abs(badj) ? adj : badj;
    return Math.max(6.4, Math.min(8.3, Math.round(v * 10) / 10));
  }

  function teethColorNote(co, english=false){
    if(String(co).includes('差し歯')) return english ? ' (a prosthetic tooth from a past treatment such as a school-days injury — keep it healthy-looking and clean, never decayed or unsanitary)' : '（学生時代の外傷治療など由来はさまざま。健康的で清潔感のある範囲にとどめ、劣化・不衛生には見せない）';
    if(String(co).includes('縞状')) return english ? ' (a congenital tonal trait — depict it as a natural individual feature, never as looking unhealthy)' : '（幼少期由来の生まれつきの色調。病的に見せず自然な個性として描く）';
    return '';
  }

  function teethLine(c, english=false){
    const al = c.teethAlign || 'ほぼ整った歯列';
    const co = c.teethColor || '自然な白さの歯';
    if(english) return `Teeth: ${displayValue('teethAlign', al)}, ${displayValue('teethColor', co)}${teethColorNote(co, true)}. Show the teeth only as far as naturally visible when he smiles — do NOT keep his teeth constantly bared.`;
    return `歯並びは${al}、色は${co}${teethColorNote(co, false)}。`;
  }

  function frameOf(c){
    if(!c._frame){ c._frame = {shoulderWidth:c.shoulderWidth,waistPos:c.waistPos,legLength:c.legLength,armLength:c.armLength,frame:c.frame,neckLength:c.neckLength,neckImpression:c.neckImpression,limbSize:c.limbSize}; }
    return {shoulderWidth:c.shoulderWidth||'普通', waistPos:c.waistPos||'標準', legLength:c.legLength||'標準', armLength:c.armLength||'標準', frame:c.frame||'標準', neckLength:c.neckLength||'標準', neckImpression:c.neckImpression||'標準的な首', limbSize:c.limbSize||'標準'};
  }

  function frameSentence(c, english=false){
    const f = frameOf(c);
    if(english){
      const en = {'狭め':'narrow','普通':'average','広め':'broad','非常に広い':'very broad','低め':'low','標準':'average','高め':'high','やや長い':'slightly long','長い':'long','非常に長い':'very long','コンパクト':'compact','大柄':'large-built','大型':'very large-built','短め':'short','やや長い ':'slightly long','小さめ':'smallish','大きめ':'largish'};
      return ` Shoulders: ${en[f.shoulderWidth]||f.shoulderWidth}. Waist position: ${en[f.waistPos]||f.waistPos}, legs: ${en[f.legLength]||f.legLength}, arms: ${en[f.armLength]||f.armLength}. Build frame: ${en[f.frame]||f.frame}; neck: ${en[f.neckLength]||f.neckLength} in length${f.neckImpression&&f.neckImpression!=='標準的な首'?` with ${({'すっきりした首すじ':'a clean, slender neckline','がっしりした首':'a thick, sturdy build'})[f.neckImpression]||''}`:''}; hands and feet: ${en[f.limbSize]||f.limbSize}.`;
    }
    return `肩幅は${f.shoulderWidth}、腰の位置は${f.waistPos}で脚の長さは${f.legLength}。腕は${f.armLength}、骨格は${f.frame}、首は${f.neckLength}${f.neckImpression&&f.neckImpression!=='標準的な首'?`で${f.neckImpression}`:''}、手足のサイズ感は${f.limbSize}。`;
  }

  function physiqueSpec(c, english=false, forCard=false){
    const h = c.heightRaw || parseInt(c.height, 10) || 171;
    const hc = headCount(c);
    const bt = String(c.bodyType || '');
    let core, coreEn;
    if(h >= 185){ core = `頭部は小さめ・肩の位置は高く・腰高で脚は長めに描き、圧倒的な長身（${h}cm）と分かる比率にする`; coreEn = `draw the head small, shoulders high, waist high, and legs long so he clearly reads as strikingly tall (${h}cm)`; }
    else if(h >= 180){ core = `頭部はやや小さめ・肩の位置は高く・腰高で脚は長めに描き、明確に長身（${h}cm）と分かる比率にする`; coreEn = `draw the head slightly small, shoulders high, waist high, and legs long so he clearly reads as tall (${h}cm)`; }
    else if(h >= 175){ core = `肩の位置をやや高く、脚を長めに描き、平均より背が高い（${h}cm）と分かる比率にする`; coreEn = `place the shoulders slightly high and draw the legs long so he reads as taller than average (${h}cm)`; }
    else if(h >= 165){ core = `自然で標準的な比率（${h}cm）。頭部を大きく描きすぎない`; coreEn = `natural, standard proportions (${h}cm); do not draw the head too large`; }
    else { core = `小柄（${h}cm）だが頭身は保ち、子どもに見えない大人の比率で描く`; coreEn = `small in stature (${h}cm) but keep adult proportions so he never looks like a child`; }
    let extra = '', extraEn = '';
    if(/筋肉質|がっしり|骨太|ラグビー|柔道家|肩幅広め/.test(bt)){ extra = '肩幅は広く首は太めだが、頭身と縦の比率は維持する。'; extraEn = ' Broad shoulders and a thick neck, but keep the head-to-body ratio and vertical proportions intact.'; }
    else if(/ぽっちゃり|ビール腹|腹だけ/.test(bt)){ extra = '横幅が増しても縦の比率は縮めない。'; extraEn = ' Extra width must not shorten the vertical proportions.'; }
    else if(/高身長モデル|脚が長い/.test(bt)){ extra = '脚をさらに長めに強調する。'; extraEn = ' Emphasize the legs even longer.'; }
    const panel = forCard ? (english ? ' In the full-body panels, keep this head-to-body ratio exact and never enlarge the head.' : '全身パネルでは頭身比を正確に維持し、頭部を大きく描きすぎない。') : '';
    const guard = english ? ' Do not write any of these numbers or ratios as text anywhere inside the image outside the designated info panel.' : '（これらの数値は情報欄以外に、画像内へ文字として描き込まない）。';
    if(english) return `Physique guide: about ${hc} heads tall — ${coreEn}.${frameSentence(c, true)}${extraEn}${panel}${guard}`;
    return `体格の目安：約${hc}頭身。${core}。${frameSentence(c, false)}${extra}${panel}${guard}`;
  }

  const FOOT_WIDTHS = [
    ['E（やや細め）','すっきりした細めの足幅。甲は薄めで、足の輪郭が直線的','a slim foot width with a low instep and straight outline'],
    ['2E（標準）','標準的な足幅。甲の厚みも平均的で自然なバランス','a standard foot width with average instep thickness'],
    ['3E（幅広）','幅広の足。母趾球・小趾球の張りがはっきりし、甲にしっかりした厚み','a wide foot with pronounced ball of the foot and a thick instep'],
    ['4E（幅広・甲高）','かなり幅広で甲高。足全体にどっしりした量感があり、指の付け根が横に広がる','a very wide, high-instep foot with a solid, weighty volume']
  ];

  function calcFootWidth(c){
    const bt = String(c.bodyType || '');
    const bmi = bmiOf(c);
    let lvl = 1;
    if(/細身|やせ型|華奢/.test(bt) || bmi < 19) lvl = 0;
    if(/筋肉質|がっしり|骨太|肩幅広め|バスケットボール|ラグビー|柔道家/.test(bt) || (bmi >= 24 && bmi < 27)) lvl = 2;
    if(/ぽっちゃり|ビール腹/.test(bt) || bmi >= 27) lvl = 3;
    const sp = String(c.sportName || '');
    if(/ラグビー|柔道|相撲/.test(sp) || ['自衛官','消防士'].includes(c.role)) lvl += 1;
    if(/長距離/.test(sp)) lvl -= 1;
    lvl = Math.max(0, Math.min(3, lvl));
    return FOOT_WIDTHS[lvl][0];
  }

  function footWidthDesc(c, english=false){
    const name = c.footWidth || calcFootWidth(c);
    const row = FOOT_WIDTHS.find(x=>x[0]===name) || FOOT_WIDTHS[1];
    return english ? `foot width ${row[0]}: ${row[2]}` : `ワイズ${row[0]}：${row[1]}`;
  }

  const FOOT_FEATURES = [
    ['特徴なし・整った足', 10, 0, ''],
    ['軽度の外反母趾', 2, 35, '親指の付け根がわずかに内側へ張り出しているが、痛々しくならない自然な範囲'],
    ['軽度の内反小趾', 1.5, 30, '小指が内側へ軽く傾いている'],
    ['扁平足気味', 2, 0, '土踏まずが浅い'],
    ['ハイアーチ気味', 1.5, 0, '土踏まずが高く甲が立っている'],
    ['浮き指気味', 1, 0, '立ったとき指先が床から軽く浮きやすい'],
    ['足指の間が開きやすい', 1, 0, '指離れのよい健康的な足'],
    ['かかとが小さめ', 1, 0, 'かかとの丸みがコンパクト'],
    ['くるぶしがくっきりした足', 1.5, 0, 'くるぶしの骨格が立体的に浮き出ている'],
    ['指の関節がしっかりした節のある足', 1.5, 0, '指の関節の骨感がはっきりした男性的な足'],
    ['長時間の立ち仕事の跡', 1.5, 0, '母趾球にうっすらした硬さがある、立ち仕事らしい生活感のある足'],
    ['アキレス腱がくっきり浮き出た引き締まった足首', 1, 0, 'アキレス腱の輪郭がくっきり浮き出て、足首が引き締まっている'],
    ['足首が太くしっかりした跳躍系の足', 0.8, 0, '足首まわりが太く安定感があり、跳躍競技らしい力強さがある'],
    ['母趾球が発達して張り出した足', 0.8, 0, '母趾球が発達して内側にしっかり張り出している'],
    ['指が長くしなやかな足', 1, 0, '足指が長くしなやかに伸びている'],
    ['すねから続く腱の筋が浮いた競技者の足首', 0.8, 0, 'すねから足首にかけて腱の筋がうっすら浮いた競技者らしい足'],
    ['引き締まった細めの足首（ブーツ生活の足）', 0.5, 0, 'ブーツや半長靴での生活を思わせる、引き締まった細めの足首'],
    ['前足部が扇形にしっかり広がった足', 0.8, 0, '指の付け根から前足部が扇形にしっかり広がっている'],
    ['第2趾が特に長い足', 1.2, 0, '第2趾（人差し指）が親指より目立って長い'],
    ['指の長さがほぼ揃った端正な前足部', 1.2, 0, '足指の長さがほぼ揃った端正な前足部'],
    ['かかとが大きくしっかりした足', 1, 0, 'かかとが大きくどっしりと安定している'],
    ['甲が丸く盛り上がった肉厚の甲', 1, 0, '甲が丸く盛り上がり、肉厚で量感がある'],
    ['甲が薄く腱のラインがうっすら見える足', 1, 0, '甲が薄く、伸ばした指の腱のラインがうっすら見える'],
    ['小指が小さく丸い足', 1, 0, '小指が小さく丸みを帯びている'],
    ['親指がまっすぐで力強い足', 1.2, 0, '親指がまっすぐ伸びて力強い印象がある']
  ];

  const SOLE_TYPES = [
    ['すっきり細長型', 4, '輪郭が直線的で細長く、かかとは小さめ。足裏はなめらかでしわが少ない', 'a slim, elongated sole with a straight outline, small heel, and smooth skin'],
    ['幅広肉厚型', 3, '全体に幅広で肉厚。かかとが大きく丸く、足裏に柔らかな量感がある', 'a wide, thick sole with a large round heel and soft volume'],
    ['内側カーブ型', 2.5, '内側の土踏まず側のくびれが強く、母趾球の張り出しがはっきりした輪郭', 'a sole with a strong inner-arch curve and a pronounced ball of the foot'],
    ['親指主導型', 2.5, '親指が大きく存在感があり、土踏まずの陰影が深い', 'a sole led by a large, prominent big toe with a deeply shaded arch'],
    ['しわ深型', 2, '足裏全体に細かいしわが多く寄り、幅広でスクエアな輪郭', 'a wide, squarish sole covered in fine creases'],
    ['均整なめらか型', 4, '輪郭・パッド・かかとのバランスが取れた、なめらかで標準的な足裏', 'a smooth, well-balanced standard sole'],
    ['パッド発達型', 2.5, '母趾球・小趾球のパッドが発達して盛り上がり、土踏まずに筋張ったアーチ線が走る', 'developed pads at the ball and outer edge, with taut arch lines across the instep'],
    ['ハイアーチ型', 2, '土踏まずが深く、前足部パッドとかかとの接地面がはっきり分かれ、中央がくびれる', 'a high-arched sole where forefoot pad and heel are clearly separated by a deep waist'],
    ['細身指長型', 2.5, '細身で指が長く、かかとも細め。しわは浅く上品な印象', 'a slender sole with long toes, a narrow heel, and shallow refined creasing'],
    ['コンパクト丸型', 2.5, '全体に丸みがあり、ふっくらしたパッドと丸いかかとのコンパクトな足裏', 'a compact, rounded sole with plump pads and a round heel'],
    ['指間開き型', 2, '足指の間に隙間があり指離れがよく、甲側から続く腱の線がうっすら見える', 'a sole with naturally spread toes and faint tendon lines continuing from the instep'],
    ['武骨大判型', 2, '大きくどっしりした足裏で、後半部にしわが多く、働く足らしい武骨な質感', 'a large, sturdy sole with heavy creasing toward the heel — a hardworking foot']
  ];

  const SOLE_WRINKLES = [
    ['しわ少なめ', 'しわは少なく、なめらかな質感', 'few creases; smooth texture'],
    ['標準的なしわ', '土踏まずと指の付け根に自然な浅いしわ', 'natural shallow creases at the arch and toe bases'],
    ['しわ多め', '土踏まずと指の付け根に細かいしわがはっきり寄る', 'fine creases gather clearly at the arch and toe bases']
  ];

  const TOE_LINES = [
    ['まっすぐ前を向いたそろった並び', 5, '各指がまっすぐ前を向き、自然に整列している', 'toes point straight ahead in a natural, even row'],
    ['指先が密着した並び', 3, '指同士がぴったり寄り添い、すき間なく並ぶ', 'toes rest snugly together with no gaps'],
    ['親指側へゆるやかに流れる並び', 2.5, '第2〜5趾が親指方向へゆるやかに傾く', 'the lesser toes lean gently toward the big toe'],
    ['小指側へ開き気味の並び', 2, '指全体が外側へ広がるように傾く', 'the toes lean slightly outward toward the little-toe side'],
    ['扇状に均等に開いた並び', 2.5, '指が扇のように均等な角度で開く', 'the toes spread evenly like a fan'],
    ['親指と第2趾の間にすき間がある並び', 2, '親指だけ少し独立し、間にはっきりしたすき間がある', 'a clear gap sits between the big toe and second toe'],
    ['全指の間に軽いすき間のある離れのよい並び', 2, 'どの指の間にも空気の通るすき間がある', 'light, airy gaps between every toe'],
    ['小指が内側へ丸まり気味の並び', 2, '小指が軽く内へ丸まり、爪が外を向く', 'the little toe curls slightly inward with its nail facing outward'],
    ['第2趾が少し前へ出て目立つ並び', 2, '第2趾が一歩前に出て存在感がある', 'the second toe steps slightly forward and stands out'],
    ['指の付け根ラインが強くカーブした並び', 1.5, '指の付け根の並びが弧を描き、指先の高さに段差がつく', 'the toe-base line curves strongly, stepping the toe tips at different heights']
  ];

  const TOE_CURLS = [
    ['指先がわずかに上へ反った自然な状態', 4, 'toe tips lifted in a slight natural upward curl'],
    ['指がフラットに伸びた状態', 4, 'toes extended flat and relaxed'],
    ['指を軽く曲げたリラックスした状態', 3, 'toes loosely bent in a relaxed way']
  ];

  function soleDetailLine(c, english=false){
    const st = SOLE_TYPES.find(x=>x[0]===c.soleType) || SOLE_TYPES[5];
    const wr = SOLE_WRINKLES.find(x=>x[0]===c.soleWrinkle) || SOLE_WRINKLES[1];
    const tl = TOE_LINES.find(x=>x[0]===c.toeLine) || TOE_LINES[0];
    const tc = TOE_CURLS.find(x=>x[0]===c.toeCurl) || TOE_CURLS[1];
    if(promptOpt(c).compact){
      if(english) return ` Sole detail: ${st[3]}. Toe alignment: ${tl[3]}. Creasing: ${wr[2]}. Natural range of motion only.`;
      return `足裏の詳細（${st[0]}）：${st[2]}。指の並びは「${tl[0]}」。しわは「${wr[0]}」。可動域は自然な範囲のみ。`;
    }
    if(english) return ` Sole detail: ${st[3]}. Toe alignment: ${tl[3]}, with ${tc[2]}. Creasing: ${wr[2]}. Keep toe lean, gaps, and curl within the natural range of motion — no broken joints or unnatural crossing.`;
    return `足裏の詳細（${st[0]}）：${st[2]}。指の並びは「${tl[0]}」：${tl[2]}。「${tc[0]}」で描く。しわは「${wr[0]}」：${wr[1]}。指の傾き・すき間・丸まりは自然な可動域の範囲にとどめ、関節の破綻や不自然な交差にはしない。`;
  }

  function footFeatureLine(c, english=false, detailed=false){
    const name = c.footFeature || '特徴なし・整った足';
    if(name === '特徴なし・整った足') return '';
    const row = FOOT_FEATURES.find(x=>x[0]===name);
    const detail = row ? row[3] : '';
    if(english) return detailed ? ` Foot trait: ${name} — ${detail} (depict subtly and anatomically correctly, never exaggerated into deformity).` : ` Foot trait: ${name} (only to the extent naturally visible).`;
    return detailed ? `足の特徴：${name}（${detail}。誇張して変形させず、解剖学的に正確な範囲で控えめに描く）。` : `足の特徴：${name}（自然に分かる範囲で）。`;
  }

  const FACE_EXTRA_DEFAULTS = {jawChin:'標準的な顎先', jawAngle:'ほどよく張ったエラ', ear:'標準的な耳', forehead:'標準的な広さの額', hairline:'直線的な生え際', cheek:'標準的な頬', dimple:'えくぼなし', mole:'ほくろなし', eyeBags:'クマなし', adamsApple:'標準的なのどぼとけ', lipTone:'標準的な血色の唇', browRidge:'彫りは標準的'};

  function eyeAreaLine(c, english=false){
    const eb = c.eyebrow || '標準的なゆるいアーチ眉', ed = c.eyebrowDensity || '標準的な濃さの眉';
    const el = c.eyelid || '末広二重', esh = c.eyeShape || '標準的な目の形', ei = c.eyes || '親しみやすい目元', ela = c.eyelash || '標準的な長さのまつ毛';
    if(english) return `Eyebrows: ${displayValue('eyebrow', eb)} (${displayValue('eyebrowDensity', ed)}).${c.eyebrowGroom&&c.eyebrowGroom!=='自然なまま'?` ${({'整えた形':'Neatly groomed brows.','きっちりライン取り':'Sharply lined brows.','剃り込み跡あり':'Brows with small shaved notches.'})[c.eyebrowGroom]||''}`:''}${c.eyebrowGap&&c.eyebrowGap!=='標準的な眉間'?` ${c.eyebrowGap==='眉間は近め'?'Close-set brows.':'Wide-set brows.'}`:''} Eyelid: ${displayValue('eyelid', el)}. Eye shape: ${displayValue('eyeShape', esh)}.${c.eyeBalance&&c.eyeBalance!=='標準的な黒目の位置'?` Iris & sclera: ${displayValue('eyeBalance', c.eyeBalance)} — keep it subtle and anatomically natural.`:''} Eye impression: ${displayValue('eyes', ei)}. Eyelashes: ${displayValue('eyelash', ela)} — never make him look like he is wearing makeup or mascara.`;
    return `眉は${eb}で、${ed}。${c.eyebrowGroom&&c.eyebrowGroom!=='自然なまま'?`眉の手入れは${c.eyebrowGroom}。`:''}${c.eyebrowGap&&c.eyebrowGap!=='標準的な眉間'?`${c.eyebrowGap}。`:''}まぶたは${el}、目の形は${esh}${c.eyeBalance&&c.eyeBalance!=='標準的な黒目の位置'?`、${c.eyeBalance}（誇張せず自然な範囲で）`:''}、目の印象は${ei}。まつ毛は${ela}（化粧をしているようには見せない）。`;
  }

  function faceExtraLine(c, english=false){
    const LIMIT = promptOpt(c).detail === 'light' ? 3 : (promptOpt(c).compact ? 6 : 99);
    const parts = [];
    const add = (key, jaFmt, enFmt)=>{
      const v = c[key];
      if(!v || v === FACE_EXTRA_DEFAULTS[key]) return;
      parts.push(english ? enFmt(displayValue(key, v)) : jaFmt(v));
    };
    add('jawChin', v=>`顎先は${v}`, v=>`Chin: ${v}`);
    add('jawAngle', v=>`${v}`, v=>`Jaw: ${v}`);
    add('browRidge', v=>`${v}`, v=>`Brow: ${v}`);
    add('forehead', v=>`${v}`, v=>`Forehead: ${v}`);
    add('hairline', v=>`${v}`, v=>`Hairline: ${v}`);
    add('cheek', v=>`${v}`, v=>`Cheeks: ${v}`);
    add('ear', v=>`耳は${v}`, v=>`Ears: ${v}`);
    add('dimple', v=>`${v}`, v=>`Dimples: ${v}`);
    add('mole', v=>`${v}がある`, v=>`Mole: ${v}`);
    add('eyeBags', v=>`${v}`, v=>`Under-eye: ${v}`);
    add('adamsApple', v=>`${v}`, v=>`Throat: ${v}`);
    add('lipTone', v=>`${v}`, v=>`Lip tone: ${v}`);
    if(!parts.length) return '';
    if(parts.length > LIMIT) parts.length = LIMIT;
    return english ? ` ${parts.join('. ')}.` : `${parts.join('、')}。`;
  }

  function promptOpt(c){
    const mode = c?.promptDetail || '自動（生成先に合わせる）';
    // V4.6.4 T5: 自動＝標準（要点圧縮）を既定に（承認③）。ライトを新設
    const detail = mode === 'フル記述' ? 'full' : mode === 'ライト（最小）' ? 'light' : 'std';
    const compact = detail !== 'full';
    const antiAI = /Nanobanana/i.test(String(c?.promptTarget || '')) && !/イラスト|アニメ|漫画|設定画/.test(String(c?.quality || '実写風'));
    return { compact, antiAI, detail };
  }

  function realismSpec(c, english=false){
    const q = String(c.quality || '実写風');
    const illust = /イラスト|アニメ|漫画|設定画/.test(q);
    if(illust){
      return english
        ? ' Avoid an over-idealized "AI-beauty" face: do not make the face perfectly symmetrical (reflect his set facial asymmetry), and keep the features individually distinct rather than averaged.'
        : '過度に整った“AI美形”にはせず、顔を完全な左右対称にしない（設定した左右差を反映する）。パーツを平均化せず、この人物固有の個性を保つ。左右差は個性として描き、変形や破綻にはしない。';
    }
    const anti = promptOpt(c).antiAI
      ? (english
        ? ' Anti-AI-look: avoid uniform studio lighting and HDR glow; use natural light with uneven falloff and asymmetric soft shadows, faint sensor noise, and a slightly off-center candid framing. Do not airbrush the skin; keep a neutral, slightly desaturated color grade like an unedited photo.'
        : 'AI感の抑制：均一なスタジオ照明やHDR的な発光感を避け、自然光のムラ・左右非対称の柔らかい影・かすかなノイズ感を含める。構図はわずかにオフセンターのスナップ写真的なフレーミングにする。肌はエアブラシ調に均さず、色調は無加工写真のような彩度控えめのニュートラルにする。')
      : '';
    return anti + (english
      ? ' Render the face with biological realism, like a photograph of a real person: skin with visible pores, tiny irregularities, and natural tonal variation — never porcelain-smooth. Do not make the face perfectly symmetrical (reflect his set facial asymmetry). Keep eye highlights and teeth within natural limits. Avoid the over-idealized "AI-beauty" look — glossy uniform skin, unnaturally large eyes, or averaged, homogeneous features.'
      : '顔は実在の人物の写真のような生物学的リアリズムで描く。肌には毛穴・ごく小さな凹凸・自然な色ムラがあり、陶器のように均一に滑らかにしない。顔は完全な左右対称にせず（設定した左右差を反映）、目のハイライトや歯の描写も自然な範囲にとどめる。いわゆる“AI美形”的な、過度に整った顔立ち・グロスがかった均一な肌・不自然に大きな目・平均化された均質な顔を避ける。左右差は個性として描き、変形や破綻にはしない。');
  }

  function heightContrastCue(c, english=false){
    const h = c.heightRaw || parseInt(c.height, 10) || 171;
    const avg = c.avgHeightBase || 171;
    const d = h - avg;
    if(d >= 12) return english ? ' Compared with door frames and passers-by, he stands about half a head taller — clearly a tall man for this time and place.' : '周囲の通行人やドア枠と比べて頭半分ほど高く見える、その時代・土地では明確な長身として描く。';
    if(d >= 6) return english ? ' He reads slightly taller than the people around him.' : '周囲よりやや背が高いと分かる対比で描く。';
    if(d <= -6) return english ? ' He reads slightly smaller than the people around him, while keeping adult proportions.' : '周囲よりやや小柄に見える対比で描く（大人の比率は維持）。';
    return '';
  }

  function uniformJacketPhrase(c, english=false){
    if(!c || !c.workUniform || !c.jacket || c.jacket === 'なし') return '';
    return english ? ` (with ${c.jacket} worn over it)` : `（上に${c.jacket}を羽織る）`;
  }

  function uniformHatPhrase(c, english=false){
    if(!c || !c.workUniform || !c.headwear || c.headwearOn === false) return '';
    return english ? `, headwear: ${c.headwear} (worn on the head)` : `、帽子は${c.headwear}を着用`;
  }

  const NAT_ADJ = {'日本':'Japanese','アメリカ':'American','中国':'Chinese','台湾':'Taiwanese','韓国':'Korean','タイ':'Thai','ベトナム':'Vietnamese','フィリピン':'Filipino','インドネシア':'Indonesian','イギリス':'British','フランス':'French','ブラジル':'Brazilian','メキシコ':'Mexican'};

  const NAT_CITY = {'タイ':['バンコク','チェンマイ'],'中国':['上海','成都','広州'],'台湾':['台北','高雄'],'韓国':['ソウル','釜山'],'ベトナム':['ホーチミン','ハノイ'],'フィリピン':['マニラ','セブ'],'アメリカ':['ロサンゼルス近郊','テキサスの町'],'イギリス':['ロンドン郊外','マンチェスター'],'フランス':['パリ郊外','リヨン'],'ブラジル':['サンパウロ','リオ近郊'],'インドネシア':['ジャカルタ','バンドン']};

  function natInnerFix(c){
    const nat=String(c.nationality||'日本'); if(nat==='日本') return;
    const resJP=/日本|東京|大阪|首都圏/.test(String(c.residenceText||''));
    const city=(NAT_CITY[nat]&&pick(NAT_CITY[nat]))||'母国の都市部';
    if(c.birthplaceText && /東京|大阪|北海道|沖縄|県|府/.test(c.birthplaceText)) c.birthplaceText = `${city}の出身`;
    if(!resJP && c.residenceText && /区|市|県|商店街|銭湯/.test(c.residenceText)) c.residenceText = `${city}で一人暮らし`;
    if(c.assetText){ c.assetText = String(c.assetText).replace(/NISA投信/,'積立投資').replace(/財形貯蓄/,'定期預金'); }
    if(c.memoryText){ c.memoryText = String(c.memoryText).replace(/上京の日、駅の人の多さに立ち尽くしたこと/, '故郷を出て首都に着いた日、駅の人の多さに立ち尽くしたこと').replace(/初任給で親にウイスキーを買って渡した日/,'初任給で家族に贈り物をした日'); }
    if(!resJP && c.hobbyText && /銭湯|サウナ/.test(c.hobbyText)) c.hobbyText = '街歩きと屋台めぐり';
  }

  function natUniformFix(c, s, english){
    if(!s) return s;
    const nat=String(c.nationality||'日本'), resJP=/日本|東京|大阪|首都圏/.test(String(c.residenceText||''));
    if(nat==='日本'||resJP) return s;
    const adj=NAT_ADJ[nat]||'local';
    return english ? String(s).replace(/Japanese/g, adj) : String(s).replace(/日本の/g, `${nat}の`).replace(/^/, `${nat}の標準的な様式で。`);
  }

  function workOutfitSpec(c, english=false){
    if(c.workUniform){
      if(english) return `Work outfit contents: ${natUniformFix(c, c.workUniformEn, true)} — top: ${c.top}${uniformJacketPhrase(c, true)}, bottom: ${c.bottom}, shoes: ${c.shoes}${uniformHatPhrase(c, true)}, socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}, ${c.sockUse}).${sockRenderNote(c,true)}${accText(c,false,true)} Do not reproduce real organizations' insignia or logos. `;
      return `職業服装の内容：${c.workUniform}。トップスは${c.top}${uniformJacketPhrase(c, false)}、ボトムスは${c.bottom}、靴は${c.shoes}${uniformHatPhrase(c, false)}、靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}、${c.sockUse}）。${sockRenderNote(c,false)}${accText(c,false,false)}実在組織の記章・ロゴは正確に再現しない。`;
    }
    if(english) return `Work outfit contents: ${c.outfitBrand?`${c.outfitBrand} `:''}${c.outfitType} — outerwear: ${c.outerColor&&c.jacket&&c.jacket!=='なし'?`${c.outerColor} `:''}${c.jacket}, top: ${c.topBrand?`${c.topBrand} `:''}${c.topColor?`${c.topColor} `:''}${c.top}, bottom: ${c.bottomBrand?`${c.bottomBrand} `:''}${c.bottomColor?`${c.bottomColor} `:''}${c.bottom}, shoes: ${c.shoesBrand?`${c.shoesBrand} `:''}${c.shoes}, socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}, ${c.sockUse}).${sockRenderNote(c,true)}${c.tie?` Tie: ${c.tie}.`:''}${c.coat?` Coat: ${c.coat}.`:''}${c.suitSilhouette?` Suit silhouette: ${c.suitSilhouette}.${c.slacksFitText?` Slacks fit "${c.slacksFitText}", hem finish "${c.hemFinishText}", length "${suitHemOf(c)}".`:''}`:''}${c.workFitNote?` ${c.workFitNote}.`:''}${accText(c,false,true)} `;
    return `職業服装の内容：${c.outfitBrand?`${c.outfitBrand}の`:''}${c.outfitType}。上着は${c.outerColor&&c.jacket&&c.jacket!=='なし'?`${c.outerColor}の`:''}${c.jacket}、トップスは${c.topBrand?`${c.topBrand}の`:''}${c.topColor?`${c.topColor}の`:''}${c.top}、ボトムスは${c.bottomBrand?`${c.bottomBrand}の`:''}${c.bottomColor?`${c.bottomColor}の`:''}${c.bottom}、靴は${c.shoesBrand?`${c.shoesBrand}の`:''}${c.shoesColor?`${c.shoesColor}の`:''}${c.shoes}、靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}、${c.sockUse}）。${sockRenderNote(c,false)}${c.tie?`ネクタイは${c.tie}。`:''}${c.coat?`コートは${c.outerBrand?`${c.outerBrand}の`:''}${c.coat}。`:''}${c.suitSilhouette?`スーツのシルエットは「${c.suitSilhouette}」。`:''}${c.slacksFitText?`スラックスは${c.slacksFitText}で、裾は${c.hemFinishText||'シングル（プレーン）仕上げ'}、丈は${suitHemOf(c)}。`:''}${c.workFitNote?`${c.workFitNote}。`:''}${accText(c,false,false)}`;
  }

  function innerCasualNotes(c, english=false){
    const notes = [c.holidayGapSuit ? (english?'He wears a suit even on his day off — to him, this IS casual':'休日なのにスーツ。本人は私服のつもり') : '', c.holidayStyleNote || c.styleNote, c.muscleFashionNote, c.senseFashionNote].filter(Boolean);
    const senseLn = c.fashionSenseText ? (english ? ` His styling policy: "${c.fashionSenseText}".` : `本人のコーデ基準：「${c.fashionSenseText}」。`) : '';
    if(!notes.length) return senseLn;
    return (english ? ` Styling notes: ${notes.join('; ')}.` : `着こなしメモ：${notes.join('。')}。`) + senseLn;
  }

  function casualOutfitSpec(c, english=false){
    if(english) return `Casual outfit contents: ${c.holidayOutfitBrand || c.outfitBrand} ${c.holidayOutfitType || c.outfitType} — outerwear: ${c.holidayJacket || 'none'}, top: ${c.holidayTopBrand?`${c.holidayTopBrand} `:''}${c.holidayTopColor?`${c.holidayTopColor} `:''}${c.holidayTop || c.top}, bottom: ${c.holidayBottomBrand?`${c.holidayBottomBrand} `:''}${c.holidayBottomColor?`${c.holidayBottomColor} `:''}${c.holidayBottom || c.bottom}, shoes: ${c.holidayShoesBrand?`${c.holidayShoesBrand} `:''}${c.holidayShoes || c.shoes}, socks: ${c.holidaySockBrand || c.sockBrand} ${c.holidaySockType || c.sockType} (${c.holidaySockColor || c.sockColor}).${c.holidayEraFashionNote?` Overall: ${c.holidayEraFashionNote}.`:''}${accText(c,true,true)}${innerCasualNotes(c, true)} `;
    return `私服コーデの内容：${c.holidayOutfitBrand || c.outfitBrand}の${c.holidayOutfitType || c.outfitType}。上着は${c.holidayJacket && c.holidayJacket!=='指定なし' && c.holidayOuterBrand ? `${c.holidayOuterBrand}の` : ''}${c.holidayJacket || 'なし'}、トップスは${c.holidayTopBrand?`${c.holidayTopBrand}の`:''}${c.holidayTopColor?`${c.holidayTopColor}の`:''}${c.holidayTop || c.top}、ボトムスは${c.holidayBottomBrand?`${c.holidayBottomBrand}の`:''}${c.holidayBottomColor?`${c.holidayBottomColor}の`:''}${c.holidayBottom || c.bottom}、靴は${c.holidayShoesBrand?`${c.holidayShoesBrand}の`:''}${c.holidayShoesColor?`${c.holidayShoesColor}の`:''}${c.holidayShoes || c.shoes}、靴下は${c.holidaySockBrand || c.sockBrand}の${c.holidaySockType || c.sockType}（${c.holidaySockColor || c.sockColor}）。${c.holidayEraFashionNote?`全体は${c.holidayEraFashionNote}。`:''}${accText(c,true,false)}${innerCasualNotes(c)}`;
  }

  function occupationBackdrop(occ, english=false){
    const sp = {
      '消防士': ['非番の消防署近くの街並み','a street near the fire station on his day off'],
      '警察官': ['非番の交番前の通り','a street near a police box on his day off'],
      '自衛官': ['駐屯地近くの落ち着いた街並み','a calm street near the base'],
      '農家': ['畑と直売所のある田園風景','farmland with a produce stand'],
      '漁師': ['朝の漁港','a fishing port in the morning'],
      '美容師': ['おしゃれなサロンの前','the front of a stylish hair salon'],
      'バーテンダー': ['夜のバーの入口','the entrance of a bar at night'],
      '喫茶店マスター': ['昭和の面影が残る喫茶店の前','the front of a retro coffee shop'],
      '僧侶': ['寺の門前','the gate of a temple'],
      '悠々自適（定年後）': ['朝の公園','a park in the morning'],
      '救急隊員': ['救急ステーションの近く','near an ambulance station'],
      '防衛大学校学生': ['学校近くの坂道の街並み','a hillside street near the academy'],
      'お笑い芸人': ['劇場の前','the front of a comedy theater'],
      'YouTuber': ['撮影機材のある街角','a city corner with filming gear'],
      '寿司職人': ['のれんの掛かった寿司店の前','the front of a sushi restaurant with a noren curtain'],
      'ラーメン店店主': ['湯気の上がるラーメン店の前','the front of a steaming ramen shop']
    };
    if(sp[occ]) return english ? sp[occ][1] : sp[occ][0];
    const cat = OCC_CAT[occ];
    const byCat = {
      office:['夕方のオフィス街','an office district in the evening'], it:['モダンなオフィスビルの前','the front of a modern office building'],
      medical:['病院近くの街並み','a street near a hospital'], edu:['学校近くの通り','a street near a school'],
      service:['店舗が並ぶ通り','a street lined with shops'], trade:['作業場や工房の前','the front of a workshop'],
      creative:['スタジオや制作現場の近く','near a studio or production site'], uniform:['スポーツ施設の前','the front of a sports facility'],
      enta:['スタジオや劇場の近く','near a studio or theater'], showa:['昭和の街並み','a Showa-era streetscape'],
      student:['大学キャンパス','a university campus'], retired:['朝の公園','a park in the morning']
    };
    const b = byCat[cat] || ['自然な街並み','a natural streetscape'];
    return english ? b[1] : b[0];
  }

  function magazineStyleByEra(eraYear, english=false){
    const y = Number(eraYear) || 2026;
    if(y < 1935) return english ? 'a prewar photo-album page layout (monochrome plates, classical vertical typesetting)' : '戦前の写真帖風レイアウト（モノクロ図版と伝統的な縦組み）';
    if(y < 1960) return english ? 'a postwar monochrome graph-magazine layout' : '戦後の白黒グラフ誌風レイアウト';
    if(y < 1980) return english ? 'a Showa-era weekly magazine gravure layout (vertical text, grainy photos, retro typefaces)' : '昭和の週刊誌グラビア風レイアウト（縦組み・粒子感のある写真・レトロな書体）';
    if(y < 1990) return english ? 'an 80s city-magazine layout with bright colors and hand-drawn accents' : '80年代シティ系雑誌風レイアウト（明るい配色と手書き風あしらい）';
    if(y < 2000) return english ? 'a 90s street-fashion magazine layout with lively cutout collages' : '90年代ストリートファッション誌風レイアウト（にぎやかな切り抜きコラージュ）';
    if(y < 2010) return english ? 'a 2000s men\'s fashion magazine layout with big headlines and feature tabs' : '2000年代メンズファッション誌風レイアウト（大きな見出しと特集タブ）';
    if(y < 2020) return english ? 'a minimal 2010s lifestyle magazine layout' : '2010年代のミニマルなライフスタイル誌風レイアウト';
    return english ? 'a clean modern web-magazine style layout' : '現代のWebマガジン風のクリーンなレイアウト';
  }

  function magazineQA(c, english=false){
    const g = {guardian:['ISTJ','ISFJ','ESTJ','ESFJ'], analyst:['INTJ','INTP','ENTJ','ENTP'], social:['ESTP','ESFP','ENFP','ENFJ']};
    const grp = g.guardian.includes(c.mbti) ? 'guardian' : g.analyst.includes(c.mbti) ? 'analyst' : g.social.includes(c.mbti) ? 'social' : 'creative';
    const hobbyMap = {'スポーツ系':['ジム通いやフットサル','the gym and futsal'],'古着系':['古着屋巡り','vintage shopping'],'オタク系':['アニメやゲーム','anime and games'],'アウトドア系':['キャンプや登山','camping and hiking'],'バンドマン系':['バンド活動や機材集め','band practice and gear'],'レトロ系':['純喫茶巡り','retro coffee shops'],'メガネ知的系':['読書や美術館','reading and museums'],'おじさん系':['銭湯や晩酌','public baths and evening drinks'],'ギャル男系':['サウナや流行の遊び','saunas and trendy hangouts'],'ホスト系':['筋トレや美容','working out and skincare'],'サブカル系':['ミニシアターやレコード','indie cinemas and records'],'清楚系':['カフェでの読書','reading at cafes'],'ヤンキー系':['バイクいじり','tinkering with motorbikes'],'普通系':['散歩や動画鑑賞','walks and watching videos']};
    const hobbyDef = {guardian:['料理や散歩','cooking and walks'], analyst:['読書や考え事','reading and thinking'], social:['友人との食事','eating out with friends'], creative:['音楽や写真','music and photography']};
    const hobby = hobbyMap[c.vibe] || hobbyDef[grp];
    if(english) return `Pick 2-3 questions such as "How do you spend your days off?", "What are you into lately?", and "What's your type?". Do NOT use pre-written answers — write the answers on the spot, in his own natural voice, based on this persona: personality ${mbtiDescription(c.mbti, true)}, vibe ${displayValue('vibe', c.vibe) || c.vibe}, hobby tendencies around ${hobby[1]}${c.sportName && c.sportName !== 'なし' ? `, and his sport is ${(typeof valueTranslations!=='undefined' && valueTranslations[c.sportName]) || c.sportName}` : ''}. Match the wording to his age (${c.age}) and to how people spoke around ${c.eraYear || '2026'}.`;
    return `質問は「休日の過ごし方」「最近のマイブーム」「好きなタイプ」などから2〜3問選ぶ。回答の例文はここには書かないので、生成時に本人の人物像に沿った自然な口調でその場で書き起こすこと。人物像ヒント：性格は${mbtiDescription(c.mbti, false)}、雰囲気は${c.vibe}、趣味の傾向は${hobby[0]}あたり${c.sportName && c.sportName !== 'なし' ? `、競技は${c.sportName}` : ''}。言葉選びは${c.age}歳という年齢と、${eraLabel(c.eraYear)}頃の話し言葉に合わせる`;
  }

  function profileShortText(c, english=false){
    const per = mbtiDescription(c.mbti, english);
    const hol = c.holidayOutfitType || '';
    if(english) return `A ${c.age}-year-old ${displayValue('role', c.role) || 'man'} with a ${String(per).toLowerCase()} air; on days off he goes for a ${displayValue('outfitType', hol) || 'relaxed'} style.`;
    return `${per}雰囲気の${c.age}歳・${c.role}。休日は${hol ? hol + 'の装い' : '気楽な私服'}で過ごす。`;
  }

  function catchphrase(c, english=false){
    const occ = (c.role==='プロスポーツ選手' && c.sportName && c.sportName!=='なし') ? `${c.sportName}選手` : (c.role || '');
    const occEn = (c.role==='プロスポーツ選手' && c.sportName && c.sportName!=='なし')
      ? `${(typeof valueTranslations!=='undefined' && valueTranslations[c.sportName]) || c.sportName} player`
      : (displayValue('role', c.role) || c.role);
    const enJoin = (adjRaw) => { const adj = String(adjRaw||'').toLowerCase().trim(); const noun = String(occEn).toLowerCase(); const p = adj ? `${adj} ${noun}` : noun; return `${/^[aeiou]/.test(p) ? 'An' : 'A'} ${p}`; };
    const bright = ['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','明るめブラウン','オレンジブラウン','シルバーアッシュ'].includes(c.hairColor);
    const blackish = ['黒','ブルーブラック','ネイビーブラック','黒に近いダークブラウン'].includes(c.hairColor);
    const gray = ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor);
    const strict = STRICT_HAIR_OCC.includes(c.role), free = FREE_HAIR_OCC.includes(c.role);
    if(c.holidayPersona) return english ? `${enJoin('')} on weekdays, ${String(displayValue('vibe', c.vibe) || c.vibe).toLowerCase()} on days off` : `平日は${occ}、休日は${c.vibe}`;
    if(c.age >= 60 && ['ギャル男系','やりらふぃー系','ヤンキー系','ストリート系','バンドマン系','韓国風','ホスト系'].includes(c.vibe)) return english ? `Forever ${String(displayValue('vibe', c.vibe) || c.vibe).toLowerCase()} — ${String(occEn).toLowerCase()}` : `いくつになっても${c.vibe}の${occ}`;
    if(c.age <= 30 && ['飲食店店長','ラーメン店店主','コンビニ店長','寿司職人','喫茶店マスター'].includes(c.role)) return english ? enJoin('young') : `若き${occ}`;
    if(strict && bright) return english ? `${enJoin('')} with unexpectedly bright hair` : `明るい髪の${occ}`;
    if(free && blackish) return english ? `${enJoin('')} who keeps his hair black` : `黒髪のままの${occ}`;
    if(gray && c.age < 50) return english ? enJoin('gray-haired-too-soon') : `若白髪の${occ}`;
    // 特徴候補を収集し、ランダムに1つ選ぶ
    const feats = [];
    const hairFeat = {'金髪（ブリーチ）':['金髪の','bleached-blond'],'ブリーチベージュ':['ブリーチヘアの','bleach-haired'],'ハイトーンアッシュ':['ハイトーンの','high-tone-haired'],'シルバーアッシュ':['シルバーヘアの','silver-haired'],'メッシュ入りブラック':['メッシュヘアの','highlight-streaked'],'インナーカラー（アッシュ）':['インナーカラーの','inner-colored'],'プリン気味の伸びた茶髪':['プリン頭の','grown-out-dyed'],'オレンジブラウン':['オレンジヘアの','orange-haired'],'白髪まじり':['白髪まじりの','graying'],'ロマンスグレー':['ロマンスグレーの','silver-gray'],'ごま塩頭':['ごま塩頭の','salt-and-pepper'],'ほぼ白髪':['白髪の','white-haired']};
    if(hairFeat[c.hairColor]) feats.push(hairFeat[c.hairColor]);
    const faceFeat = {'ワイルド系':['ワイルド顔の','wild-faced'],'ブサイク系':['愛嬌のある顔の','charmingly homely'],'ホスト系':['ホスト顔の','host-club-faced'],'おじさん系':['おじさん顔の','middle-aged-faced'],'昭和顔（濃い顔立ち）':['昭和顔の','Showa-faced'],'塩顔系':['塩顔の','subtle-featured'],'韓国アイドル風':['アイドル顔の','idol-faced'],'高身長モデル系':['モデル顔の','model-faced'],'やんちゃ系':['やんちゃ顔の','mischievous-faced'],'ソース顔':['ソース顔の','bold-featured'],'しょうゆ顔':['しょうゆ顔の','refined-featured'],'ミステリアス系':['ミステリアスな','mysterious'],'クール系':['クールな','cool-looking'],'彫りの深い縄文系':['彫りの深い','deep-featured'],'たれ目系':['たれ目の','droopy-eyed'],'つり目系':['つり目の','sharp-eyed'],'弟系童顔（笑顔が武器）':['童顔の','baby-faced'],'垂れ目パピー系':['垂れ目の','puppy-eyed'],'愛嬌くしゃ笑い顔':['くしゃ笑いの','crinkle-smiling']};
    if(faceFeat[c.facePreset]) feats.push(faceFeat[c.facePreset]);
    const bodyFeat = {'ビール腹':['ビール腹の','beer-bellied'],'ラグビー選手体型':['ラグビー体型の','rugby-built'],'華奢な体型':['華奢な','delicately built'],'細マッチョ':['細マッチョの','lean-muscled'],'ぽっちゃり':['ぽっちゃり','chubby'],'筋肉質':['筋肉質な','muscular'],'高身長モデル体型':['高身長','tall'],'隠れ筋肉質':['脱いだらすごい','secretly muscular'],'腹だけぽっちゃり':['お腹だけゆるい','belly-soft'],'柔道家体型':['柔道家体型の','judo-built'],'骨太体型':['骨太な','big-boned']};
    if(bodyFeat[c.bodyType]) feats.push(bodyFeat[c.bodyType]);
    const h = parseInt(c.height);
    const hb = c.avgHeightBase || 171;
    if(h >= hb + 10) feats.push(['長身の','extra-tall']);
    else if(h && h <= hb - 8) feats.push(['小柄な','compact']);
    if(c.glasses && c.glasses !== 'なし') feats.push([`${c.glasses}の`, 'bespectacled']);
    if(c.facialHair && c.facialHair !== 'なし') feats.push([c.facialHair.includes('無精') ? '無精ひげの' : 'ひげの', c.facialHair.includes('無精') ? 'stubbled' : 'bearded']);
    if(c.skinDetail && c.skinDetail !== 'なし（クリアな肌）'){
      if(String(c.skinDetail).includes('泣きぼくろ')) feats.push(['泣きぼくろの','teardrop-moled']);
      else if(String(c.skinDetail).includes('そばかす')) feats.push(['そばかすの','freckled']);
      else if(String(c.skinDetail).includes('ほくろ')) feats.push(['ほくろの','moled']);
    }
    if(feats.length){
      const f = pick(feats);
      return english ? enJoin(f[1]) : `${f[0]}${occ}`;
    }
    if(c.age >= 60) return english ? `${enJoin('seasoned')}, still going strong` : `まだまだ現役の${occ}`;
    return english ? enJoin(displayValue('vibe', c.vibe) || c.vibe) : `${c.vibe}の${occ}`;
  }

  function refSheetInstruction(c, english=false){
    const wk0 = refSheetKind(c.outputType);
    if(wk0 === 'facs'){
      const laugh = String(c.smileText || c.laughText || '');
      if(english){
        return `Create a FACIAL ACTION UNIT REFERENCE SHEET: a 3x4 grid of 12 front-facing head panels of the exact same person, identical hair, lighting, and camera angle in every panel — only the facial expression changes. Panels with small labels (AU numbers in Latin letters): 1 Neutral / 2 Brow raise (AU1+2) / 3 Brow lower (AU4) / 4 Eyes widened (AU5) / 5 Eyes narrowed (AU6+7) / 6 Nose wrinkle (AU9) / 7 Soft smile (AU12) / 8 Open smile showing teeth (AU12+25${laugh?`, reflecting his signature laugh: "${laugh}"`:''}) / 9 Lip corner down (AU15) / 10 Lips pressed (AU24) / 11 Lips pucker (AU18) / 12 Chin raise (AU17). Photorealistic, non-exaggerated, natural muscle movement only; keep every panel the same person with identical facial structure.`;
      }
      return `表情AUリファレンスシートとして、同一人物の顔正面を3×4グリッドの12パネルで並べる。全パネルで髪・照明・カメラ角度・顔立ちを完全に同一とし、変えるのは表情のみ。各パネルに小さなラベル（AU番号は英数字）を付ける：①中立（無表情）／②眉上げ（AU1+2）／③眉寄せ（AU4）／④目の見開き（AU5）／⑤目を細める（AU6+7）／⑥鼻のしわ（AU9）／⑦口角上げ・微笑（AU12）／⑧歯を見せる笑い（AU12+25${laugh?`。本人の笑い方の特徴「${laugh}」を反映`:''}）／⑨口角下げ（AU15）／⑩唇を結ぶ（AU24）／⑪唇をすぼめる（AU18）／⑫あごの緊張（AU17）。誇張のない自然な筋肉の動きの範囲で、実写風に描く。ラベルの文字は崩さない。`;
    }
    if(wk0 === 'wearcardWork' || wk0 === 'wearcardCasual'){
      const isWork = wk0 === 'wearcardWork';
      const specJa = isWork ? workOutfitSpec(c, false) : casualOutfitSpec(c, false);
      const specEn = isWork ? workOutfitSpec(c, true) : casualOutfitSpec(c, true);
      if(english){
        return `Create a WEAR-REFERENCE CARD (${isWork?'work outfit':'casual outfit'}): organize on one sheet the clothed full body (front, side, and BACK views), the face (front and side), a foot-level close-up of his socked feet with shoes removed (front), and a sole close-up where he sits fully clothed and shows both soles toward the camera. Outfit: ${specEn} Do not thrust the feet toward the camera; render the pose with the compressed perspective of an 85mm telephoto lens, keeping the vertical length of one sole about equal to (at most 1.1x) the vertical length of the head — never unnaturally huge feet. Both legs extend straight forward; never raise one knee or one leg. Every view is the same person in the same outfit. Info panel: name "${c.name}", height ${c.height}, weight ${c.weight}, foot size ${c.footSize} only, with clean unbroken text.`;
      }
      return `服装基準カード（${isWork?'職業服装':'私服'}）として、提案服装を着た全身の前面・側面・背面、顔の正面・側面、靴を脱いだ靴下姿の足元アップ（正面）、着衣のまま座って両足の裏をこちらへ見せた足裏アップを1枚に整理して表示する。服装：${specJa}靴下の足元アップでは${sockNoteFull(c, false)}足裏アップは足を無理にカメラへ突き出さず、望遠レンズ（85mm相当）風の遠近圧縮の効いた自然な比率で描き、足裏1つの縦の長さは頭部の縦の長さとほぼ同じ〜1.1倍程度に収める。各ビューは同一人物・同一服装として一致させる。【情報欄】氏名「${c.name}」／身長${c.height}・体重${c.weight}／足サイズ${c.footSize}のみを読みやすい文字組で記載し、文字は崩さない。`;
    }
    const kind = refSheetKind(c.outputType);
    if(!kind) return null;
    const mustJa = '必須パネルとして、全身の正面、全身の側面、足元詳細（足の正面と足裏）を必ず含める。';
    const mustEn = 'As mandatory panels, always include the full-body front view, the full-body side view, and a foot detail section (foot front view and sole view).';
    const sameJa = '各パネルにラベルを付け、全パネル同一人物として顔立ち・体型・身長感を完全に一致させる。非性的で、体型・服装確認用の資料として健全に描く。';
    const sameEn = 'Label every panel, keep every panel clearly the same person with identical face, body proportions, and height impression, and keep the sheet non-sexual as a neutral body/outfit reference.';
    if(kind==='compare'){
      if(english) return `Create a landscape comparison reference sheet. Left panel: him wearing only his underwear. Right panel: him wearing his full suggested outfit but WITHOUT shoes, wearing only the suggested socks so his feet are visible. Both panels show the full-body front view in the same pose and same scale. ${mustEn} The foot detail section shows only the bare foot front view and sole view, with no dedicated sock-detail panel. ${outfitSummaryLine(c, true)} ${sameEn}`;
      return `横長の比較リファレンスシートとして構成する。左パネルは下着のみの姿、右パネルは提案服装を着ているが靴は履いていない姿（提案靴下のみ着用で足元が見える）。両パネルとも同一ポーズ・同一スケールの全身の正面で描く。${mustJa}足元詳細は素足の足の正面と足裏を配置する（靴下の詳細パネルは入れない）。${outfitSummaryLine(c, false)}${sameJa}`;
    }
    if(kind==='expressions'){
      if(english) return `Create an expression variation reference sheet. Upper section: ${mustEn} Lower section: a 2×3 grid of six face close-up expressions — neutral, soft smile, big smile, surprised, slightly troubled, and a cool sideways glance. Keep the hairstyle identical in every expression panel. ${sameEn}`;
      return `表情差分リファレンスシートとして構成する。上段：${mustJa}下段：顔アップの表情差分6種（真顔／微笑み／笑顔／驚き／少し困った顔／クールな流し目）を2×3のグリッドで並べる。全表情コマで髪型を完全に一致させる。${sameJa}`;
    }
    if(kind==='full'){
      if(english) return `Create a full character reference sheet. Include: full-body front, side, AND back views; face front and side views; four expression variations (neutral, soft smile, big smile, cool); and a foot detail section with the foot front view and sole view (no dedicated sock-detail panel). ${mustEn} ${sameEn}`;
      return `フル設定資料シートとして構成する。全身の正面・側面・後ろ姿、顔の正面と側面、表情差分4種（真顔／微笑み／笑顔／クールな表情）、足元詳細（足の正面・足裏）を1枚に整理して配置する。靴下の詳細パネルは入れない。${mustJa}${sameJa}`;
    }
    if(kind==='machiWork'){
      if(english) return `Create a "spotted in town: at work" sheet — a candid street-documentary style collage of 3-4 snapshot panels showing him actually working in his work outfit${c.workUniformEn ? ` (${c.workUniformEn})` : ''}. At least one panel shows his FULL BODY; mix in shots of his hands at work and his expression. He is unaware of the camera, but the tone must be wholesome street documentary — never voyeuristic. Background: ${occupationBackdrop(c.role, true)}. ${outfitSummaryLine(c, true)} Add subtle panel labels, keep every panel the same person, non-sexual.`;
      return `「街で見かけたイケメンシート：職業編」として構成する。${c.role}が職業服装${c.workUniform ? `（${c.workUniform}）` : ''}で実際に働いている自然な瞬間を、スナップ写真風に3〜4コマ並べた1枚シートにする。少なくとも1コマは全身が写るカットにし、働く手元や表情のカットを織り交ぜる。撮られていることに気づいていない自然な雰囲気だが、盗撮的ないやらしさは一切なく、街角ドキュメンタリー風の健全なトーンにする。背景は${occupationBackdrop(c.role, false)}。${outfitSummaryLine(c, false)}各コマにさりげないラベルを付け、全コマ同一人物として非性的に描く。`;
    }
    if(kind==='machiOff'){
      const offJa = `私服の内容：${c.holidayOutfitBrand || c.outfitBrand}の${c.holidayOutfitType || c.outfitType}、トップスは${c.holidayTop || c.top}、ボトムスは${c.holidayBottom || c.bottom}、靴は${c.holidayShoes || c.shoes}。`;
      const offEn = `Casual outfit: ${c.holidayOutfitBrand || c.outfitBrand} ${c.holidayOutfitType || c.outfitType}, top ${c.holidayTop || c.top}, bottom ${c.holidayBottom || c.bottom}, shoes ${c.holidayShoes || c.shoes}.`;
      if(english) return `Create a "spotted in town: off duty" sheet — 3-4 candid snapshot panels of him spending his day off in his casual outfit, in scenes that fit his vibe (a cafe, a stroll, browsing shops, etc.). At least one panel shows his FULL BODY. He looks relaxed and unaware of the camera, in a wholesome street-snap tone — never voyeuristic. ${offEn} Add subtle panel labels, keep every panel the same person, non-sexual.`;
      return `「街で見かけたイケメンシート：オフ編」として構成する。私服姿でオフの時間を過ごす自然な瞬間を、スナップ写真風に3〜4コマ並べた1枚シートにする。場面は本人の雰囲気に合うもの（カフェ・散歩・買い物・公園など）。少なくとも1コマは全身が写るカットにする。力の抜けたリラックスした表情で、盗撮的ないやらしさは一切ない健全な街角スナップのトーンにする。${offJa}各コマにさりげないラベルを付け、全コマ同一人物として非性的に描く。`;
    }
    if(kind==='feet'){
      const fc = footCfg(c);
      const fsrow = FOOT_SCENES.find(x=>x[0]===fc.scene) || footOccScenes(c && c.role).find(x=>x[0]===fc.scene);
      const frow = FOOT_FABRICS.find(x=>x[0]===fc.fabric);
      const barefootish = fc.sockState !== 'ランダム' && fc.sockState !== '靴下を履いたまま';
      const footSpecJa = `${footWidthDesc(c, false)}。${footFeatureLine(c, false, barefootish)}${barefootish ? soleDetailLine(c, false) : ''}`;
      const footSpecEn = ` ${footWidthDesc(c, true)}.${footFeatureLine(c, true, barefootish)}${barefootish ? soleDetailLine(c, true) : ''}`;
      if(english){
        const sceneEn = fc.scene==='ランダム'
          ? `Choose ONE scene in which removing his shoes arises NATURALLY from his occupation or the flow of his day — tatami rooms, raised seating, entryways, break spaces, or a Shinkansen seat are only examples; feel free to invent any fitting situation${c.sceneIdea ? ` (usable scene idea for reference: "${c.sceneIdea}")` : ''}.`
          : `Scene: ${fc.scene}${fsrow && fsrow[2] ? ` (floor: ${fsrow[2]})` : ''}.`;
        const postureEn = fc.posture==='ランダム' ? '' : ` Posture: ${fc.posture}.`;
        const shoeEn = fc.shoeState==='ランダム'
          ? ` His removed shoes (${c.shoes}) appear tucked at the edge of the frame ONLY if that is natural for the scene — otherwise leave them out of frame.`
          : ` Shoe state: ${fc.shoeState}（靴：${c.shoes}）.`;
        const wearEn = fc.wear==='私服' ? casualOutfitSpec(c, true) : workOutfitSpec(c, true).replace(/shoes: [^,]+, /, '');
        const fabricEn = fc.fabric==='ランダム'
          ? ' The sock fabric must NOT look brand-new: depict a natural state somewhere between everyday wear and well worn-in, fitting the situation.'
          : ` Sock fabric condition: ${frow ? frow[2] : fc.fabric}.`;
        const sockEn = fc.sockState==='ランダム' || fc.sockState==='靴下を履いたまま'
          ? ` The composition should naturally draw the eye to his sock-clad feet (${c.sockBrand} ${c.sockType}, ${c.sockColor})`
          : ` Sock state: ${fc.sockState} (socks: ${c.sockBrand} ${c.sockType}, ${c.sockColor}); the composition should naturally draw the eye to his feet`;
        const angleEn = fc.angle==='ランダム' ? '' : ` Camera: ${fc.angle} — even from a low angle, do NOT turn this into an exaggerated close-up; keep enough distance that he is identifiable.`;
        const propEn = fc.prop==='ランダム' ? ' One or two small props fitting the scene may be added near his feet.' : (fc.prop==='なし' ? '' : ` Place near his feet: ${fc.prop}.`);
        return `Create a "chance foot-focus scene sheet". ${sceneEn}${postureEn} ${wearEn}${fabricEn}${sockEn} — e.g. just after slipping off his shoes, sitting casually, or resting — without unnatural enlargement and without pointedly turning his soles toward the viewer; keep his feet naturally noticeable within the scene. His upper body or full figure stays naturally in frame so he is clearly identifiable.${shoeEn}${angleEn}${propEn}${footSpecEn} Keep any dirt or wear within a natural range (faint sole marks and dulling only; no excessive soiling or unsanitary depiction). Render the feet with accurate, realistic human anatomy${barefootish ? ', including bare feet with correct toe counts and joints' : ''}. Avoid: deformed feet, wrong toe counts or broken joints, more than his own two feet, duplicated soles or extra pairs of feet, unnatural bending angles, exaggerated close-ups of soles or toes, and any sexual staging. Keep it a relaxed, wholesome slice of everyday life.`;
      }
      const sceneJa = fc.scene==='ランダム'
        ? `職業や1日の流れの中で靴を脱ぐ必然性が自然に生まれる場面を1つ選んで描く。和室・座敷・小上がり・玄関・休憩スペース・新幹線の座席などはあくまで例であり、これらに限定せず人物の職業や生活から自由に発想してよい${c.sceneIdea ? `（参考にできる場面アイデア：「${c.sceneIdea}」）` : ''}。`
        : `場面は「${fc.scene}」${fsrow && fsrow[2] ? `（床は${fsrow[2]}）` : ''}。`;
      const postureJa = fc.posture==='ランダム' ? '' : `座り方・姿勢は「${fc.posture}」。`;
      const shoeJa = fc.shoeState==='ランダム'
        ? `脱いだ靴（${c.shoes}）は、場面として自然な場合のみ画面の隅に収め、構図に入れる必然性がなければ画面に入れない。`
        : `靴の状態は「${fc.shoeState}」（靴：${c.shoes}）。`;
      const wearJa = fc.wear==='私服' ? `私服でくつろいだ状態で描く。${casualOutfitSpec(c, false)}` : `職業服装のまま靴だけを脱いだ状態を基本とする。${workOutfitSpec(c, false)}`;
      const fabricJa = fc.fabric==='ランダム'
        ? `靴下の生地は新品には見せず、日常の使用感〜履き込んだ状態の間で場面に合った自然な状態を精細に描く。`
        : `靴下の生地の状態：${frow ? frow[2] : fc.fabric}。`;
      const sockJa = fc.sockState==='ランダム' || fc.sockState==='靴下を履いたまま'
        ? `提案靴下（${c.sockBrand}の${c.sockType}、${c.sockColor}）を履いた足元へ、構図の中で自然に視線が導かれるようにする`
        : `靴下の着脱状態は「${fc.sockState}」（靴下：${c.sockBrand}の${c.sockType}、${c.sockColor}）。足元へ構図の中で自然に視線が導かれるようにする`;
      const angleJa = fc.angle==='ランダム' ? '' : `カメラは「${fc.angle}」から。低アングルでも過度な接写にはせず、誰なのか分かる距離感を保つ。`;
      const propJa = fc.prop==='ランダム' ? `場面に合う小物を1〜2点、足元の近くに添えてもよい。` : (fc.prop==='なし' ? '' : `足元の近くに「${fc.prop}」を添える。`);
      return `「偶然足元強調場面シート」として構成する。${sceneJa}${postureJa}${wearJa}${fabricJa}${sockJa}（玄関で靴を脱いだ直後・座敷で足を崩した瞬間・縁側でくつろぐ姿など）。足元を不自然に拡大したり、足裏をことさらこちらへ向けたりせず、画面内で自然に目立つ程度にとどめる。上半身または全身も自然に画面に収め、誰なのか分かるようにする。${shoeJa}${angleJa}${propJa}${footSpecJa}汚れは踏み跡やうっすらしたくすみ程度の自然な範囲にとどめ、過度な汚損や不衛生な表現はしない。足元は写実的で正確な人体構造を維持する${barefootish ? '（素足の場合も指の本数・関節を正確に描く）' : ''}。避けること：足の変形、指の本数や関節の崩れ、本人の両足2本以外の足の生成、足裏の重複や複数人分の足裏、不自然な曲がり方、足裏・足指の過度な接写、性的な演出。自然でリラックスした健全な生活描写にとどめる。`;
    }
    if(kind==='profilesheet'){
      if(!c.bloodType) generateInnerProfile(c);
      if(!c.measurementA && typeof ensureProfileMeasurements==='function') ensureProfileMeasurements(c);
      const wear = (current && current.profileSheetWear) || '職業服装';
      const wearSpecJa = wear==='私服' ? casualOutfitSpec(c, false) : workOutfitSpec(c, false);
      const wearSpecEn = wear==='私服' ? casualOutfitSpec(c, true) : workOutfitSpec(c, true);
      const A = Number(c.measurementA).toFixed(1), B = Number(c.measurementB).toFixed(1);
      const CL = (typeof profileMeasurementCLabel==='function') ? profileMeasurementCLabel(c.measurementC, english) : c.measurementC;
      const S = innerCatShow;
      const catLines = [];
      if(S.basic) catLines.push(`【基本】生年月日：${c.birthdateText}／出身地：${String(c.birthplaceText||'').replace('：','')}／血液型：${c.bloodType}／一人称：${c.pronoun}／口調：${c.speechText}／あだ名：${c.nicknameText}`);
      if(S.life) catLines.push(`【暮らし・家族】${c.maritalText}・恋人：${c.loverText}／家族構成：${c.familyText}／${c.livingText}・住居：${c.residenceText}／出自：${c.originText}／学歴：${c.educationText}／収入：${c.incomeText}／資産：${c.assetText}`);
      if(S.daily) catLines.push(`【日常・嗜好】健康：${c.healthText}／趣味：${c.hobbyText}／マイブーム：${c.myBoomText}／好物：${c.foodLikeText}・苦手：${c.foodHateText}`);
      if(S.mind) catLines.push(`【内面】行動原理：${c.principleText}／夢：${c.innerDream}／本音の欲望：${c.innerDesire}／弱点：${c.weaknessMind}・${c.weaknessBody}／才能：${c.innerTalent}／コンプレックス：${c.complexText}／許せないこと：${c.unforgivableText}／好きな言葉：${c.favoriteWordText||'—'}／コーデ基準：${c.fashionSenseText}`);
      if(S.mind) catLines.push(`【ファッション】重視：${c.fashionValueText||'—'}／好きなブランド：服は${c.favBrandText||'—'}・靴は${c.favShoeBrandText||'—'}／サイズ感：${c.sizeFeelText||'—'}／丈感：${c.hemPrefText||'—'}／スラックス：${c.slacksFitText||'—'}・${c.hemFinishText||'—'}／基調色：${c.baseColorText||'—'}（${c.colorSchemeText||'—'}）／靴下：買い替えは${c.sockCycleText||'—'}・内訳は${c.sockDrawerText||'—'}・連続着用は${c.sockWearText||'—'}・ニオイは${c.sockSmellText||'—'}・悩みは${c.sockTroubleText||'—'}・合わせ方は${c.sockPairText||'—'}`);
      if(S.past) catLines.push(`【過去・人間関係】${c.pastUpbringing}／${c.pastTrauma}／思い出：${c.memoryText}／親友：${String(c.friendText||'').replace(/〔.*?〕/,'')}／恋愛対象：${c.loveTarget}／恋愛経験：${c.loveCountText}`);
      if(S.adult) catLines.push(`【オトナの事情（小さく・婉曲表現で）】飲酒：${c.drinkText}／喫煙：${c.smokeText}／ギャンブル歴：${c.gambleText}／風俗経験：${c.fuzokuText}／初めての体験：${c.firstExpText}／経験人数：${c.expCountText}／週頻度：相手あり ${c.weekFreqText}・セルフ ${c.selfFreqText}`);
      const linesJa = catLines.join('。 ');
      if(english){
        const blocks = [
          `(1) his one-line bio "${bioLine(c, true)}" under a small headline`,
          `(2) a basic profile block (name ${nameKana(c)}, age ${c.age}, occupation ${displayValue('role', c.role)}, height ${c.height}, weight ${c.weight}, foot ${c.footSize}, MBTI ${mbtiDisplay(c)})`
        ];
        if(catLines.length) blocks.push(`(3) an "Inner / Background" block in smaller type listing (values are Japanese, keep them verbatim and readable): ${linesJa}`);
        blocks.push(`(${catLines.length?4:3}) a "PROFILE ONLY A / B / C" box: A ${A}cm / B ${B}cm / C ${CL} — print the values only, never explain their meaning`);
        return `Create a single 16:9 "character profile sheet". LEFT: one full-body standing shot in his ${wear==='私服'?'casual outfit':'work outfit'} with shoes (${wearSpecEn}). RIGHT: a clean info area with — ${blocks.join('; ')}. Keep all text clean and unbroken.${catLines.length&&S.adult?' Soften the "grown-up matters" lines with tasteful euphemism or partial masking.':''} Render as a wholesome, non-sexual character reference sheet in the visual quality "${enQuality(c.quality)}".`;
      }
      const blocks = [
        `①小見出しの下にひとこと背景「${c.bioText || bioLine(c, false)}」`,
        `②基本プロフィール欄（名前：${nameKana(c)}／${c.age}歳／${c.role}／身長${c.height}・体重${c.weight}・足${c.footSize}／MBTI：${mbtiDisplay(c)}）`
      ];
      if(catLines.length) blocks.push(`③「内面・背景」欄を小さめの文字で整理して記載する：${linesJa}`);
      blocks.push(`${catLines.length?'④':'③'}「PROFILE ONLY A / B / C」欄（A：${A}cm／B：${B}cm／C：${CL}。数値・表記のみ記載し、意味の説明は一切書かない）`);
      return `「キャラクタープロフィールシート」として16:9の1枚に構成する。左側：${wear==='私服'?'私服':'職業服装'}のフルコーデでの全身立ち姿を1枚（靴あり。${wearSpecJa}）。右側：情報エリアを整然と組む。${blocks.join('。')}。誌面の日本語はすべて文字化けさせず読みやすく。${catLines.length&&S.adult?'「オトナの事情」の行は伏せ字や婉曲で品よく小さく。':''}全体は健全で非性的な人物設定資料として、画風・質感「${c.quality}」で描く。`;
    }
    if(kind==='magazine'){
      if(english) return `Create a "character feature magazine page" — a fictional magazine spread featuring ${nameKana(c)} (${c.age}, ${displayValue('role', c.role)}), designed in ${magazineStyleByEra(c.eraYear, true)}. Layout: one main photo (casual outfit — ${casualOutfitSpec(c, true).replace('Casual outfit contents: ','')}), a smaller sub-cut (work outfit — ${workOutfitSpec(c, true).replace('Work outfit contents: ','')}), a big headline using the catchphrase "${catchphrase(c, true)}", a profile box (name, age, occupation, height ${c.height}), and a mini interview section: ${magazineQA(c, true)} ${c.season ? `Give the page a seasonal ${String(displayValue('season', c.season) || c.season).toLowerCase()} -issue feel. ` : ''}${innerMagazineBlock(c, true)}All page text must be clean and readable. Use a FICTIONAL magazine identity${c.nationality && c.nationality !== '日本' ? ` published in ${(typeof valueTranslations!=='undefined' && valueTranslations[c.nationality]) || c.nationality}` : ''} — no real magazine names or logos.`;
      return `「人物特集雑誌ページ」として構成する。${nameKana(c)}（${c.age}歳・${c.role}）を特集する${c.nationality && c.nationality !== '日本' ? `${c.nationality}で発行されている` : ''}架空の雑誌の誌面で、レイアウトは${eraLabel(c.eraYear)}頃の${magazineStyleByEra(c.eraYear, false)}にする。構成：メイン写真（私服コーデ。${casualOutfitSpec(c, false)}）、小さめのサブカット（職業服装。${workOutfitSpec(c, false)}）、キャッチフレーズ「${catchphrase(c, false)}」を使った大見出し、プロフィール欄（名前・年齢・職業・身長${c.height}）、ミニインタビュー欄：${magazineQA(c, false)}。${c.season ? `${c.season}の特集号として、誌面全体に季節感も添える。` : ''}${innerMagazineBlock(c, false)}誌面の日本語はすべて読みやすく、文字化けさせない。実在の雑誌名・ロゴは使わず、架空の雑誌としてデザインする。`;
    }
    if(kind==='outfitref'){
      if(english) return `Create an outfit reference sheet with an occupation-themed backdrop. The hero content is his full WORK outfit (shoes included). Panels: (1) full-body FRONT view in the complete work outfit with shoes, (2) full-body SIDE view, (3) an upper-body close-up showing fabric and layering details, (4) a shoe detail (side view and sole), and (5) a foot detail with the BARE foot front view and sole view (shoes and socks removed), and (6) a SOCK detail panel showing the foot wearing the suggested socks from the FRONT and from the SOLE side, rendering the sock condition (${c.sockUse}) accurately.${sockWearVisual(c,true)}${sockNoteFull(c,true)} Background: ${occupationBackdrop(c.role, true)}, conveying the atmosphere of his occupation. ${outfitSummaryLine(c, true)} Label every panel, keep every panel clearly the same person, and keep the sheet non-sexual.`;
      return `服装リファレンスシートとして、職業に合わせた背景で構成する。主役は靴まで含めた職業服装のフルコーデ。パネル構成：①フルコーデの全身の正面（靴あり）、②全身の側面、③素材や重ね着が分かる上半身のディテールアップ、④靴の詳細（側面とソール）、⑤足元詳細（靴と靴下を脱いだ素足の正面と足裏）、⑥靴下詳細（提案靴下を履いた足の正面と足裏。靴下の使用感「${c.sockUse}」を正確に描く。${sockWearVisual(c,false)}${sockNoteFull(c,false)}）。背景は${occupationBackdrop(c.role, false)}とし、職業の空気感が伝わるようにする。${outfitSummaryLine(c, false)}各パネルにラベルを付け、全パネル同一人物として顔立ち・体型・身長感を完全に一致させ、非性的に描く。`;
    }
    if(kind==='poster'){
      if(english) return `Create a single character poster (magazine-cover / movie-poster style) that instantly communicates who he is and what he does. He wears his full work outfit and is placed large in the composition. ${workOutfitSpec(c, true)}${posterFootNote(c, true)}With the background (${occupationBackdrop(c.role, true)}), props, and lighting expressing his occupation and persona. Style the poster's typography, colors, and print texture like advertising from around ${c.eraYear || '2026'}. Place the catchphrase "${catchphrase(c, true)}" as a large, stylish title, and his name "${nameKana(c)}" as a smaller readable credit. At the bottom, add a small readable profile box: name, age ${c.age}, occupation ${roleWithSport(c, true)}, height ${c.height}, and a one-line profile "${profileShortText(c, true)}". Keep all text unbroken. The poster must be tasteful and non-sexual.`;
      return `人物ポスターとして構成する。雑誌の表紙や映画ポスターのように、職業と人物像がひと目で伝わる1枚。人物は職業服装のフルコーデで大きく配置する。${workOutfitSpec(c, false)}${posterFootNote(c, false)}背景（${occupationBackdrop(c.role, false)}）・小物・光で職業感と人柄を演出する。ポスターのデザイン様式（書体・配色・印刷質感）も${eraLabel(c.eraYear)}頃の印刷物・広告風にする。タイトルとしてキャッチフレーズ「${catchphrase(c, false)}」を大きくスタイリッシュに、名前「${nameKana(c)}」を小さめの読みやすい文字で添える。さらに下部に小さめのプロフィール欄（名前・${c.age}歳・職業「${roleWithSport(c, false)}」・身長${c.height}・一行プロフィール「${profileShortText(c, false)}」）を読みやすく配置する。文字は崩さない。品があり非性的なポスターにする。`;
    }
    if(kind==='blueprint'){
      const info = english
        ? `Info panel fields (clean blueprint typography): Name "${c.name}", Height ${c.height}, Weight ${c.weight}, Foot size ${c.footSize}, Occupation ${displayValue('role', c.role)}, MBTI ${c.mbti}, and a one-line profile: "${profileShortText(c, true)}".`
        : `情報欄（設計図らしい読みやすい文字組で記載）：氏名「${nameKana(c)}」、身長${c.height}、体重${c.weight}、足のサイズ${c.footSize}、職業「${c.role}」、MBTI「${c.mbti}」、プロフィール短文「${profileShortText(c, false)}」。`;
      if(english) return `Create a "chance-encounter character blueprint sheet" in a technical-drawing style: blueprint-blue background with a subtle grid, thin white frame lines, dimension-line accents, and clear panel labels. Required panels: (1) full-body FRONT view and (2) full-body SIDE view wearing only his underwear; (3) full-body front view wearing his work outfit WITHOUT shoes (suggested socks visible); (4) face FRONT view and (5) face SIDE view; (6) foot detail with the foot front view and sole view. ${info} ${outfitSummaryLine(c, true)} Label every panel, keep every panel clearly the same person, and keep the sheet non-sexual as a neutral character reference document.`;
      return `「偶然人物ブループリントシート」として、設計図（青図）風に構成する。ブループリントブルーの背景にうっすらとした方眼、細い白のフレーム線、寸法線風の飾り、明確なパネルラベルを付ける。必須パネル：①下着のみの全身の正面、②下着のみの全身の側面、③職業服装を着た全身の正面（靴は履かず、提案靴下が見える状態）、④顔の正面、⑤顔の側面、⑥足元詳細（足の正面と足裏）。${info}${outfitSummaryLine(c, false)}各パネルにラベルを付け、全パネル同一人物として顔立ち・体型・身長感を完全に一致させ、非性的なキャラクター設定資料として健全に描く。`;
    }
    // stages
    if(english) return `Create a step-by-step dressing reference sheet. Arrange four stages left to right as full-body front views: (1) underwear only, (2) underwear + suggested socks + top, (3) full outfit WITHOUT shoes (socks visible), (4) the completed outfit including shoes. ${mustEn} The full-body side view is drawn in the underwear-only state, and the foot detail section shows the foot front view and sole view. All stages are the same person in the same pose and scale so the body-to-outfit correspondence is clear. ${outfitSummaryLine(c, true)} ${sameEn}`;
    return `段階着装リファレンスシートとして構成する。左から順に①下着のみ、②下着＋提案靴下＋トップス、③フルコーディネート（靴なし・靴下が見える）、④靴まで含めた完成コーデ、の4段階を全身の正面で並べる。${mustJa}全身の側面は下着のみの状態で描き、足元詳細は足の正面と足裏を配置する。全段階同一人物・同一ポーズ・同一スケールで、体型と服装の対応が分かるようにする。${outfitSummaryLine(c, false)}${sameJa}`;
  }

  function underwearShapeGuide(c, english=false){
    if(promptOpt(c).compact) return '';
    const mode = c?.mainWearMode || 'ボクサーパンツのみ';
    const t = mode==='時代に合った下着の種類' ? (c?.underwearType || 'ボクサーパンツ') : 'ボクサーパンツ';
    if(t==='トランクス'){
      if(english) return 'IMPORTANT underwear shape: depict the underwear strictly as woven trunks (classic boxer shorts) in a trim, well-fitted size — a clean, neat silhouette with no baggy or oversized look. The waistband and hips fit naturally, the fabric is non-stretch woven cloth with side seams and an elastic waistband, and the leg openings sit close along the thighs while the fabric still hangs slightly free instead of clinging to the skin. Do NOT render them as tight knit boxer briefs, compression shorts, or briefs, and do NOT make them baggy oversized boxers.';
      return '【下着の形状指定・重要】下着は必ずトランクス（布帛のボクサーショーツ）として描く。サイズはジャストサイズで、だぶつきやオーバーサイズ感のない、すっきりと整ったシルエットにする。ウエストと腰回りは自然にフィットさせ、生地は伸縮しない織り生地（布帛）で、サイドの縫い目とゴムウエストを描く。裾口は太ももに沿う位置にありつつ、生地が肌に張り付かず軽く浮く程度にする。ニット生地で肌に密着するボクサーパンツ、ボクサーブリーフ、コンプレッションショーツ、ブリーフとして描いてはいけない。だぶだぶのオーバーサイズトランクスにもしない。';
    }
    if(t==='白ブリーフ' || t==='カラーブリーフ'){
      if(english) return 'IMPORTANT underwear shape: depict the underwear strictly as classic briefs — a Y-front style with NO leg coverage, cut high at the thigh joint so the entire thigh is bare, with an elastic waistband and leg openings that follow the crease of the legs. Do NOT render them as boxer briefs or trunks that cover any part of the thighs.';
      return '【下着の形状指定・重要】下着は必ずブリーフとして描く。裾がなく脚の付け根で切り替わる形で、太もも部分には一切布がかからない。ゴムウエストで、脚口は脚の付け根のラインに沿う。太ももを覆うボクサーパンツやトランクスとして描いてはいけない。';
    }
    if(english) return 'Underwear: standard men\'s knit boxer briefs of an ordinary above-knee length, exactly like an everyday clothing-catalog product — completely standard specifications, never rendered as loose trunks.';
    return '下着は一般的な男性用ボクサーパンツ（ニット素材・膝上丈の標準的な形状）とする。衣料品カタログに載っている通常の商品と同じ、ごく標準的な仕様で描き、トランクスのような太くゆとりのあるシルエットにはしない。';
  }

  function underwearAvoid(c, english=false){
    const mode = c?.mainWearMode || 'ボクサーパンツのみ';
    if(mode!=='時代に合った下着の種類' || !c?.underwearType || c.underwearType==='ボクサーパンツ') return '';
    if(english) return ' changing the underwear type (e.g., turning trunks or briefs into tight boxer briefs), rendering the trunks skin-tight like knit underwear, rendering the trunks baggy and oversized,';
    return '下着の種類の変更（トランクスやブリーフをボクサーパンツ化する等）、トランクスをニット密着シルエットで描くこと、トランクスをだぶだぶのオーバーサイズで描くこと、';
  }

  function generateBodyHair(age, ethnicity, vibe, mbti, eraYear='2026'){
    const eraY = Number(eraYear) || 2026;
    let overallEntries = [['ほぼなし',1],['薄め',3],['自然',5],['やや濃い',2],['部位差あり',2],['手入れされている',2]];
    if(age<=21) overallEntries = [['ほぼなし',3],['薄め',5],['自然',4],['やや濃い',1]];
    else if(age>=29) overallEntries = [['自然',4],['部位差あり',3],['やや濃い',3],['手入れされている',3],['濃い',1]];
    if(['日本人','韓国系','中国系','東アジア系'].includes(ethnicity)) overallEntries = [['ほぼなし',3],['薄め',5],['自然',4],['手入れされている',1]];
    if(ethnicity==='東南アジア系') overallEntries = [['薄め',2],['自然',5],['部位差あり',3],['やや濃い',1]];
    if(['南アジア系','中東系','ラテン系'].includes(ethnicity)) overallEntries = [['自然',4],['やや濃い',4],['濃い',2],['部位差あり',3]];
    if(ethnicity==='白人系') overallEntries = [['薄め',2],['自然',4],['やや濃い',3],['部位差あり',2],['濃い',1]];
    if(ethnicity==='黒人系') overallEntries = [['自然',4],['やや濃い',3],['部位差あり',2],['手入れされている',2]];
    if(['爽やか系','中性系','塩顔系','清楚系'].includes(vibe)) overallEntries = [['ほぼなし',4],['薄め',5],['自然',3],['手入れされている',2]];
    if(vibe==='ワイルド系') overallEntries = [['やや濃い',4],['濃い',3],['部位差あり',3],['ワイルド寄り',2],['自然',2]];
    if(vibe==='スポーツ系') overallEntries = [['スポーツ系で自然',4],['自然',4],['部位差あり',2],['手入れされている',2]];
    if(vibe==='やりらふぃー系') overallEntries = [['薄め',4],['自然',4],['手入れされている',3],['部位差あり',1]];
    if(['ISTJ','ISFJ','ESTJ','ESFJ'].includes(mbti)) overallEntries.push(['手入れされている',3]);
    if(eraY < 1995){
      overallEntries = overallEntries.filter(([v])=>v!=='手入れされている');
      overallEntries.push(['自然',3],['やや濃い',1]);
      if(!overallEntries.length) overallEntries = [['自然',5],['やや濃い',2]];
    } else if(eraY < 2010){
      overallEntries = overallEntries.map(([v,w])=> v==='手入れされている' ? [v, Math.max(1, w-1)] : [v,w]);
    } else {
      overallEntries.push(['手入れされている',2]);
    }
    const overall = weighted(overallEntries);
    function level(area){
      let e = [['なし',1],['ごく薄い',2],['薄め',4],['自然',5],['やや濃い',2],['手入れ済み',2]];
      if(eraY < 1995) e = e.filter(([v])=>v!=='手入れ済み' && v!=='部分的に残している');
      else if(eraY < 2010) e = e.map(([v,w])=> v==='手入れ済み' ? [v, Math.max(1, w-1)] : [v,w]);
      if(['ほぼなし'].includes(overall)) e = [['なし',5],['ごく薄い',4],['薄め',1]];
      if(['薄め','手入れされている'].includes(overall)) e = [['ごく薄い',2],['薄め',5],['自然',3],['手入れ済み',3]];
      if(['やや濃い','部位差あり','スポーツ系で自然'].includes(overall)) e = [['薄め',1],['自然',4],['やや濃い',3],['手入れ済み',2]];
      if(['濃い','ワイルド寄り'].includes(overall)) e = [['自然',2],['やや濃い',4],['濃い',3],['部分的に残している',2]];
      if(['胸毛','腹毛','背中'].includes(area) && ['日本人','韓国系','中国系','東アジア系'].includes(ethnicity)) e = [['なし',3],['ごく薄い',4],['薄め',3],['自然',1]];
      if(area==='胸毛' && ethnicity==='日本人') e = [['なし',7],['ごく薄い',3],['薄め',2],['自然',1]];
      if(['すね毛','腕毛'].includes(area) && vibe==='スポーツ系') e.push(['自然',4]);
      return weighted(e);
    }
    return {
      bodyHairOverall: overall,
      chestHair: level('胸毛'), abdominalHair: level('腹毛'), lowerAbdomenHair: level('へそ下'), armHair: level('腕毛'), shinHair: level('すね毛'), thighHair: level('もも毛'), armpitHair: level('脇毛'), handFingerHair: level('手の甲・指毛'), footToeHair: level('足の甲・指毛'), backHair: level('背中')
    };
  }

  let FRIEND_CTX = null;

  function innerRoleCat(role){
    const r = String(role||'');
    if(/学生|浪人|進路準備/.test(r)) return 'student';
    if(/悠々自適/.test(r)) return 'retired';
    if(/医師|歯科|看護|薬剤|理学療法|研修医|介護/.test(r)) return 'medical';
    if(/デザイナー|カメラ|ミュージシャン|編集|イラスト|映像|声優|俳優|モデル|書道|YouTuber|ゲーマー|クリエイター|アナウンサー|お笑い|記者/.test(r)) return 'creative';
    if(/大工|整備|電気工事|工場|配送|農家|漁師|建築士|引越し|警備|運転|運転士|パイロット|郵便|職人|寿司|ラーメン|パティシエ|シェフ|理容/.test(r)) return 'trade';
    if(/アパレル|カフェ|バーテン|ホテル|店員|店長|マスター|銭湯|花屋|司書|保育士|美容師|教習所/.test(r)) return 'service';
    if(/公務員|消防|警察|自衛|教師|教員|教官|国鉄|防衛/.test(r)) return 'public';
    if(/スポーツ|トレーナー|インストラクター|体育|ライフガード|プール監視/.test(r)) return 'sports';
    return 'office';
  }

  function innerAgeBand(age){ const a=Number(age)||25; return a<26?'y':a<46?'m':a<65?'s':'o'; }

  const INNER_DREAMS = {
    y: [['安定した会社に勤め続けること',8],['一人暮らしを軌道に乗せること',7],['貯金100万円',7],['彼女を作ること',6],['車を買うこと（中古でいい）',6],['筋肉をつけてモテること',5],['資格を取ること（簿記・TOEIC）',5],['留学すること',3],['友達と旅行に行くこと',5],['バイクで日本一周',2],['配信で有名になること',2],['全国大会に出ること',2],['起業すること',2],['海外バックパック旅行',2],['推し活を全力で続けること',3],['奨学金を完済すること',4],['実家を出ること',4],['フェス皆勤',2],['ゲームの大会で勝つこと',2],['彼女と長続きさせること',4]],
    m: [['マイホームを建てること',9],['昇進すること',8],['年収を上げること（+100万）',8],['結婚すること',7],['貯金1000万円',6],['転職を成功させること',6],['子どもとの時間を増やすこと',6],['親孝行すること',5],['独立して店を持つこと',3],['副業を軌道に乗せること',4],['資格を取ること（宅建・中小企業診断士）',4],['フルマラソン完走',3],['富士山に登ること',3],['田舎に移住すること',2],['キャンピングカーを買うこと',2],['英語を話せるようになること',4],['楽器を始めること',3],['腹筋を割ること',4],['住宅ローンを繰り上げ返済すること',4],['家族で海外旅行',4],['単身赴任を終えて家に戻ること',2],['ゴルフでスコア90を切ること',3]],
    s: [['子どもを無事に独立させること',8],['定年まで勤め上げること',8],['退職金で夫婦旅行',6],['健康診断で引っかからないこと',7],['住宅ローン完済',6],['趣味を持つこと',5],['蕎麦打ちを極めること',2],['地域の役に立つこと',3],['同窓会で恥ずかしくない自分でいること',4],['孫の顔を見ること',4],['山小屋を持つこと',1.5],['釣り三昧の老後の準備',3],['妻ともう一度旅行すること',4],['店を長男に継がせること',2]],
    o: [['孫の成長を見守ること',9],['夫婦で温泉巡り',7],['家庭菜園を続けること',6],['健康で長生きすること',9],['自分史を書くこと',2],['囲碁・将棋仲間と過ごすこと',4],['お迎えが来るまで人に迷惑をかけないこと',5],['戦友・旧友に会いに行くこと',3],['盆栽を極めること',2]],
    common: [['特に大きな夢はない（現状維持がいちばん）',7],['宝くじを当てること',3],['世界一周',1.5],['痩せること',4],['よく眠ること',3]]
  };

  const INNER_DREAM_CAT = { student:[['内定を取ること',9],['単位を落とさず卒業すること',6],['奨学金を借りずに済ませること',3]], creative:[['自分の作品で食べていくこと',6],['賞を取ること',4],['個展・単独ライブを開くこと',3]], sports:[['大会で結果を出すこと',6],['指導者として独立すること',3]], medical:[['専門資格を極めること',5],['開業すること',3]], trade:[['一人前と呼ばれること',6],['自分の店・工房を持つこと',4]], retired:[['悠々自適を貫くこと',8]] };

  const INNER_DESIRES = [
    ['楽して稼ぎたい',7],['誰にも縛られず生きたい',6],['もっとちやほやされたい',5],['有名になりたい',4],['働かずに暮らしたい',6],['すべてリセットして知らない土地で暮らしたい',4],['見返してやりたい相手がいる',4],['一番になりたい',4],['誰かに全部決めてほしい',3],['思い切り甘やかされたい',4],['本音を言える相手が欲しい',5],['嫌いなやつ全員に謝らせたい',2],['責任のない立場に戻りたい',4],['大金を一度でいいから持ってみたい',5],['朝まで誰にも起こされず眠りたい',5],['誰かに必要とされたい',5],['過去の自分をやり直したい',4],
    ['不倫願望が正直ある',1.2,'d'],['浮気願望を抑えている',1.5,'d'],['割り切った大人の関係を求めている',1.5,'d'],['年の離れた相手に強く惹かれる',1.5,'d'],['人妻・既婚者につい目がいってしまう',1,'d'],['風俗通いがやめられない',1,'d'],['ギャンブルで一発当てたい',2,'d'],['借金をチャラにしたい',1.2,'d'],['他人の不幸を聞くと少し安心してしまう',1.5,'d'],['嫌いな上司の失脚を密かに願っている',2,'d'],['元恋人のSNSを監視するのがやめられない',1.5,'d'],['承認欲求が抑えられずSNSで盛ってしまう',2,'d'],['課金がやめられない',2.5,'d'],['酒に逃げたい夜がある',3,'d'],['復讐したい相手が忘れられない',1,'d'],['兄弟より上に立ちたい',1.5,'d'],['親の遺産を少し当てにしている',1.2,'d'],['友人の恋人に惹かれてしまったことがある',1,'d'],['誰かを支配してみたい',0.8,'d'],['ダメだと分かっていて夜遊びが増えている',1.5,'d'],['仕事を全部投げ出して失踪したい',1.5,'d'],['SNSの裏アカで毒を吐いている',1.5,'d'],['宝石や時計など分不相応な買い物への衝動がある',1.5,'d'],['「自分だけは特別」だと思いたい',2,'d']
  ];

  const INNER_WEAK_MIND = [
    ['優柔不断',7],['見栄っ張り',6],['断れない性格',7],['三日坊主',7],['朝に極端に弱い',6],['締切に弱い',5],['嘘がすぐ顔に出る',5],['打たれ弱い',5],['根に持つタイプ',4],['沸点が低い',3],['女性の前だと挙動不審',4],['心配性で眠れなくなる',4],['優先順位がつけられない',4],['話が長い',4],['自分語りが止まらない',3],['説教くさくなる',3],['マウントを取りがち',2.5],['貧乏ゆすりが出る',3],['緊張すると早口になる',4],['褒められると調子に乗る',5],['LINEの返信を溜める',5],['土壇場で日和る',4],['人の名前が覚えられない',4],['察してほしがる',3],['謝るのが下手',4],['負けを認められない',3],
    ['酒癖が悪い',2.5,'d'],['酒が入ると説教モードになる',2,'d'],['ギャンブルにのめり込みやすい',1.5,'d'],['浪費癖',2.5,'d'],['虚言癖の気がある',1,'d'],['嫉妬深い',2,'d'],['束縛しがち',2,'d'],['面倒になると音信不通になる',2,'d'],['借りたものを返し忘れる',2.5,'d'],['逃げ癖',2.5,'d'],['時間にルーズ',3,'d'],['二日酔いのまま出勤しがち',2,'d'],['気に入らない相手を露骨に無視してしまう',1.5,'d'],['調子のいいことを言って忘れる',2.5,'d']
  ];

  const INNER_WEAK_BODY = [
    ['腰痛持ち',6],['猫背',6],['花粉症',7],['慢性鼻炎',5],['胃が弱い',5],['酒に弱い（下戸）',4],['乗り物酔いしやすい',4],['汗っかき',5],['冷え性',3],['低血圧',4],['偏頭痛持ち',3],['虫歯になりやすい',4],['古傷の膝が弱い',3],['肩こりがひどい',6],['体力がない',4],['すぐ日焼けで真っ赤になる',3],['アルコールで顔が真っ赤になる',4],['寝相が悪い',4],['いびきがひどい',3],['金縛りにあいやすい',2],['蕁麻疹が出やすい',2],['逆流性食道炎気味',3],['寝つきが悪い',4],['視力が悪い',5],['雨の日に古傷が痛む',2],
    ['痔と静かに闘っている',2,'d'],['水虫と長期戦をしている',1.5,'d'],['加齢臭を気にしている',2,'d'],['足の臭いに自信がない',2,'d'],['お腹を下しやすい（通勤が怖い）',3,'d'],['健康診断の数値から目を逸らしている',3,'d']
  ];

  const INNER_TALENTS = [
    ['絶対音感がある',1],['味覚が異常に鋭い',1.5],['方向感覚が抜群',2.5],['一度会った人の顔を忘れない',2],['暗算が速い',2],['字が異常にうまい',2],['モノマネが妙に似ている',2.5],['早口言葉を噛まない',1.5],['利きコンビニおにぎりができる',1.5],['どこでも3秒で眠れる',3],['動体視力が良い',2],['一度食べた料理を再現できる',1.5],['機械の故障箇所を音で当てられる',1],['犬に異常に好かれる',2.5],['赤ちゃんを泣き止ませられる',2],['値切りがうまい',2],['嘘を見抜くのが得意',1.5],['円周率を100桁言える',1],['けん玉が上手い',1.5],['ルービックキューブが速い',1.5],['口笛が異常にうまい',2],['絵が描ける',2.5],['即興で詩が作れる',1],['麻雀が強い',2],['ポーカーフェイスが完璧',1.5],['危機察知能力が高い',2],['逃げ足だけは速い',2],['場を白けさせない話術',2.5],['宴会芸のレパートリーが多い',2],['声がとにかく通る',2],['どんな鍵も一発で開け…られそうな器用さ',1],['気配を消すのがうまい',1.5],['写真写りが常に良い',2],['雨男/晴れ男の的中率が高い',1.5],['パンの袋を音を立てずに開けられる',1.5],['自販機の当たりを引きがち',1],['テトリスが異常に強い',1.5],['聞き上手',3],['地図が読める',2.5],['料理の盛り付けセンスがある',2],['筋トレのフォームが完璧',1.5],['カラオケの採点で95点を切らない',1.5],['プレゼンだけは天才的',1.5],['謝罪文を書かせたら右に出る者がいない',1],['競馬の予想がなぜか当たる',1,'d'],['パチンコの台選びの嗅覚',0.8,'d'],['サボっているのがバレない',1.2,'d'],['説得力のある言い訳が即興で作れる',1.2,'d']
  ];

  const INNER_UPBRINGINGS = [
    ['平凡で穏やかな家庭で育つ',12],['厳格な父親のもとで育つ',5],['放任主義の家庭で育つ',5],['過干渉の母に育てられる',3.5],['転校を繰り返した少年時代',3],['部活漬けの学生時代',6],['帰宅部で目立たない学生時代',6],['生徒会長をやらされたことがある',2],['初恋の相手に手ひどく振られた',4],['ゲームばかりの少年時代',5],['本ばかり読んでいた少年時代',4],['祖父母の家で夏を過ごす少年時代',5],['鍵っ子だった',4],['兄の背中を追いかけて育つ',3.5],['妹弟の面倒を見て育つ',3.5],
    ['いじめられた時期がある',2,'r'],['いじめる側にいた時期がある（今も悔いている）',1,'d'],['不登校の時期がある',1.5,'r'],['荒れていた時期がある（元ヤン）',1.5,'d'],['親の借金で進学を諦めかけた',1,'r'],['大切な人を早くに亡くした',1.5,'r'],['大病で長期入院を経験',1.2,'r'],['交通事故で入院したことがある',1.5],['親の離婚を経験',2.5],['夜逃げ同然の引っ越しを経験',0.8,'d'],['家業の倒産を経験',1,'r'],['学級崩壊のクラスで過ごした',1.5],['児童養護施設で育った時期がある',0.6,'r'],['海外で育った帰国子女',1,'r'],['山村留学を経験',0.6,'r']
  ];

  const INNER_TRAUMAS = [
    ['深い水（溺れかけた経験）',3],['犬（噛まれた経験）',3],['高所',4],['閉所',3],['雷',2],['注射',3],['人前で話すこと',4],['大人数の飲み会',3],['電話の着信音',2],['異性に容姿を笑われた記憶',2.5,'d'],['舞台で頭が真っ白になった記憶',2.5],['告白を公開処刑された記憶',2,'d'],['交通事故の瞬間のフラッシュバック',1.5,'r'],['火事の記憶',1,'r'],['大地震の揺れ',2],['借金取りの電話の記憶',0.8,'d'],['父親の怒鳴り声',1,'r'],['親友に裏切られた記憶',1.5,'d'],['軍隊式の部活合宿',2],['成人式で恥をかいた記憶',1.5],['結婚式のスピーチで滑った記憶',1.5],['SNSで晒された記憶',1,'d'],['職場で吊るし上げられた記憶',1.2,'d'],['満員電車で倒れた記憶',1.5]
  ];

  const INNER_PRONOUNS_BASE = [['俺',13],['オレ',5.5],['おれ',3.5],['僕',4.5],['ボク',1],['ぼく',0.7],['私',2.2],['わたくし',0.3,'r'],['自分',2.5],['わし',0.3],['うち',0.4,'r'],['名前呼び',0.2,'r'],['場面で使い分ける（俺⇄僕⇄私）',2],['一人称がまだ確立していない',0.8]];

  const INNER_LOVE_BASE = [['女性',86],['男性',3.5,'r'],['男女どちらも',2.5,'r'],['まだ揺らいでいて分からない',2,'r'],['恋愛にあまり興味がない',3,'r'],['二次元にしか本気になれない',1,'r'],['恋愛よりも推しがすべて',0.7,'r']];

  const INNER_ORIGINS = [
    ['ごく普通のサラリーマン家庭の長男',9],['ごく普通のサラリーマン家庭の次男',8],['共働き家庭の一人っ子',7],['公務員家庭で育つ',5],['教師の家庭で育つ',3.5],['三兄弟の末っ子',4],['四人姉弟の長男（姉3人）',1.5],['農家の長男',3],['漁師町の生まれ',2],['商店街の実家（酒屋）',1.5],['商店街の実家（食堂）',1.5],['町工場の家の生まれ',2],['老舗和菓子屋の息子',0.8,'r'],['開業医の家系',0.7,'r'],['寺の息子',0.8,'r'],['神社の家系',0.6,'r'],['転勤族の家庭で育つ',3.5],['社宅育ち',3],['団地育ち',4],['母子家庭で育つ',3],['父子家庭で育つ',1.5],['祖父母に育てられた',1.5],['再婚家庭で育つ',1.5],['大家族（5人兄弟）の三男',1],['裕福な家庭の生まれ',1.2,'r'],['資産家の家系（本人は普通に勤めている）',0.6,'r'],['元経営者の家（会社は畳んだ）',1],['温泉旅館の息子',0.6,'r'],['離島の生まれ',0.8,'r'],['山間の集落の生まれ',1],['海外駐在帰りの家庭',1,'r'],['移民二世の家庭',0.8,'r'],['政治家の遠い親戚筋（本人は無関係）',0.4,'r'],['生活保護世帯で育った',0.5,'d'],['借金を抱えた家庭で育った',0.8,'d'],['芸能一家の端くれ',0.3,'r']
  ];

  const INNER_COMPLEX_GENERIC = [
    ['声が高いこと',3],['声が低すぎて聞き返されること',2],['滑舌の悪さ',3.5],['方言が抜けないこと',3],['音痴なこと',3.5],['泳げないこと',3],['球技が壊滅的なこと',3],['字が下手なこと',4],['笑い方が独特なこと',2.5],['汗っかきなこと',3],['手が小さいこと',1.5],['指が短いこと',1.5],['太りやすい体質',3.5],['筋肉がつきにくいこと',2.5],['胸板が薄いこと',2.5],['若白髪',2],['天然パーマ',2.5],['癖毛',3],['緊張するとすぐ赤面すること',3],['手汗',2],['名前が古風すぎること',0.7],['名前がキラキラ気味なこと',0.8],['兄と比べられて育ったこと',2],['学生時代のあだ名',2.5],['涙もろすぎること',2],['歯ぎしり',1.5],['箸の持ち方',2],['絵心のなさ',2.5],['写真写りの悪さ',3],
    ['女性経験の少なさ',2,'d'],['実は童貞であること',0.8,'d'],['下の毛の濃さ',0.8,'d'],['包茎気味であること',0.5,'d'],['体臭への不安',2,'d'],['足の臭い',2,'d'],['ワキの汗染み',2,'d'],['いびきを指摘されたこと',2,'d'],['収入の低さ',2.5,'d'],['貯金のなさ',3,'d'],['職場で年下に敬語を使われないこと',1.5,'d']
  ];

  const INNER_BLOOD_DIST = {
    '日本':[38,31,22,9],'韓国':[34,28,27,11],'中国':[28,41,24,7],'台湾':[26,44,24,6],'ロシア':[36,33,23,8],'アメリカ':[40,45,11,4],'カナダ':[42,46,9,3],'イギリス':[42,47,8,3],'フランス':[45,43,9,3],'ドイツ':[43,41,11,5],'イタリア':[41,46,10,3],'スペイン':[44,46,8,2],'スウェーデン':[44,38,12,6],'ポーランド':[38,33,20,9],'トルコ':[44,33,16,7],'ブラジル':[41,47,9,3],'メキシコ':[31,61,6,2],'アルゼンチン':[40,49,8,3],'タイ':[21,38,34,7],'ベトナム':[21,42,31,6],'フィリピン':[25,45,25,5],'インドネシア':[25,41,27,7],'マレーシア':[24,39,30,7],'インド':[22,37,33,8],'モンゴル':[22,36,33,9],'ナイジェリア':[23,52,21,4],'オーストラリア':[38,49,10,3]
  }; // [A,O,B,AB]

  const INNER_RHNEG = (nat)=>/日本|韓国|中国|台湾|タイ|ベトナム|フィリピン|インドネシア|マレーシア|モンゴル/.test(nat)?0.005:/インド/.test(nat)?0.05:/トルコ/.test(nat)?0.1:/ナイジェリア/.test(nat)?0.04:/ブラジル|メキシコ|アルゼンチン/.test(nat)?0.08:0.15;

  function innerWeighted(list, extra){
    const cand = (extra ? list.concat(extra) : list).map(x=>[x, Math.max(0.01, x[1])]);
    const v = weighted(cand.map(([x,w])=>[x,w]));
    return v; // returns [text, w, badge?]
  }

  function innerBadgeOf(item, wSum, list){
    if(!item) return null;
    if(item[2]==='r') return 'rare';
    if(item[2]==='d') return rand()<.6 ? 'rare' : null; // ダーティ系は目立たせる
    const total = list.reduce((s,x)=>s+x[1],0);
    return (item[1]/total) < 0.02 ? 'rare' : null;
  }

  function chooseInnerDream(c){
    const band = innerAgeBand(c.age), cat = innerRoleCat(c.role);
    const list = (INNER_DREAMS[band]||[]).concat(INNER_DREAMS.common).concat(INNER_DREAM_CAT[cat]||[]);
    const it = innerWeighted(list);
    return [it[0], innerBadgeOf(it, 0, list)];
  }

  function chooseInnerDesire(c, dream){
    let list = INNER_DESIRES;
    for(let tries=0;tries<4;tries++){
      const it = innerWeighted(list);
      const t = it[0];
      if(dream && t.slice(0,4) === String(dream).slice(0,4)) continue;
      const gap = it[2]==='d' && rand()<.35;
      return [t, gap ? 'gap' : innerBadgeOf(it, 0, list)];
    }
    return ['本音を言える相手が欲しい', null];
  }

  function chooseInnerWeakness(c){
    const age = Number(c.age)||25;
    let mind = INNER_WEAK_MIND.slice(), body = INNER_WEAK_BODY.slice();
    if(age<20) mind = mind.filter(x=>!/酒|二日酔い/.test(x[0]));
    if(age<20) body = body.filter(x=>!/酒|アルコール|加齢臭/.test(x[0]));
    if(age>=45){ body = body.concat([['老眼が始まった',5],['尿酸値が気になる',4,'d'],['階段で膝が笑う',3]]); }
    if(/細身/.test(String(c.bodyType||''))) body = body.concat([['体力がない',6]]);
    if(/ぽっちゃり|がっちり/.test(String(c.bodyType||''))) body = body.concat([['膝に負担がかかりやすい',4]]);
    const m = innerWeighted(mind), b = innerWeighted(body);
    const badge = (m[2]==='d'||b[2]==='d') && rand()<.5 ? 'rare' : null;
    return [m[0], b[0], badge];
  }

  function chooseInnerTalent(c){
    const noneW = 55;
    let list = INNER_TALENTS.slice();
    const sports = (c.sportsHistory||[]).some(x=>x.strength>0);
    if(sports) list = list.concat([['球技全般をすぐ人並み以上にこなす',3],['反射神経が良い',3]]);
    if(/ミュージシャン|声優|アナウンサー/.test(String(c.role||''))) list = list.concat([['耳コピができる',4]]);
    const total = list.reduce((s,x)=>s+x[1],0);
    if(rand() < noneW/(noneW+total)) return ['特になし（それが逆に強み…かもしれない）', null];
    const it = innerWeighted(list);
    return [it[0], it[2]==='d' ? 'rare' : innerBadgeOf(it, 0, list)];
  }

  function chooseInnerPast(c){
    let ups = INNER_UPBRINGINGS.filter(x=>innerPastAllowed(c, x[0]));
    if(!ups.length) ups = [['平凡で穏やかな家庭で育つ',1]];
    const up = innerWeighted(ups);
    const r = rand();
    let trauma = 'トラウマ：なし', tBadge = null;
    let trs = INNER_TRAUMAS.filter(x=>!(/父親の怒鳴り声/.test(x[0]) && /母子家庭|祖父母に育てられた/.test(String(c.originText||''))));
    if(r >= 0.9){ const t = innerWeighted(trs); trauma = 'はっきりしたトラウマ：' + t[0]; tBadge = 'rare'; }
    else if(r >= 0.65){ const t = innerWeighted(trs); trauma = '少し引きずっている：' + t[0]; tBadge = (t[2]==='r'||t[2]==='d') ? 'rare' : null; }
    const badge = up[2] ? 'rare' : tBadge;
    return [up[0], trauma, badge];
  }

  function chooseInnerPronoun(c){
    const age = Number(c.age)||25;
    let list = INNER_PRONOUNS_BASE.map(x=>x.slice());
    const boost = (label, f)=>{ const it=list.find(x=>x[0]===label); if(it) it[1]*=f; };
    if(/公務員|銀行|医師|弁護士|アナウンサー|会計士|教師|教員|商社|コンサル/.test(String(c.role||''))){ boost('私',2.5); boost('僕',1.4); }
    if(/^I/.test(String(c.mbti||''))) boost('僕',1.5);
    if(/知的|上品|清潔感/.test(String(c.vibe||''))){ boost('僕',1.6); boost('私',1.3); }
    if(/ワイルド|スポーティ|ストリート/.test(String(c.vibe||''))){ boost('俺',1.6); boost('オレ',1.5); }
    if(age>=68) boost('わし',12);
    if(age<=22){ boost('一人称がまだ確立していない',2.5); boost('自分',1.4); }
    if(/自衛|警察|消防|体育|スポーツ/.test(String(c.role||''))) boost('自分',3);
    const it = innerWeighted(list);
    return [it[0], innerBadgeOf(it, 0, list)];
  }

  const INNER_INCOME_TABLE = [
    [/医師|歯科医師/, 900, 1800],[/弁護士/, 700, 1500],[/パイロット/, 1000, 1700],[/公認会計士/, 650, 1200],[/コンサルタント/, 550, 1100],[/商社/, 550, 1200],[/銀行員/, 480, 900],[/研修医/, 400, 550],[/薬剤師/, 480, 650],[/看護師/, 400, 580],[/理学療法士/, 350, 480],[/介護士/, 280, 380],[/ITエンジニア|アプリ開発|ゲーム開発/, 450, 850],[/公務員|消防士|警察官|自衛官|教師|教員|教官|司書|国鉄/, 380, 680],[/プロスポーツ選手/, 400, 5000],[/モデル|俳優|ミュージシャン|お笑い芸人|声優/, 150, 900],[/YouTuber|プロゲーマー|動画クリエイター/, 120, 1500],[/デザイナー|カメラマン|編集者|イラストレーター|映像/, 320, 650],[/アナウンサー/, 550, 1100],[/新聞記者/, 500, 850],[/建築士/, 450, 750],[/大工|電気工事士|自動車整備士/, 350, 600],[/工場勤務|配送|引越し|警備員|郵便/, 300, 480],[/タクシー|バス運転手|電車運転士/, 350, 600],[/農家|漁師/, 250, 700],[/店長|マスター|店主/, 350, 700],[/アパレル|カフェ|コンビニ|スーパー|家電量販|花屋|書店員|ホテル|バーテンダー|銭湯/, 250, 400],[/美容師|理容師/, 280, 480],[/保育士/, 300, 400],[/塾講師/, 320, 550],[/大学研究員/, 400, 700],[/ジムトレーナー|インストラクター|ライフガード/, 280, 480],[/シェフ|パティシエ|寿司職人|ラーメン/, 300, 600],[/僧侶/, 300, 600],[/書道家|古着屋/, 200, 500],[/営業|経理|事務|企画|不動産/, 380, 650]
  ];

  function chooseInnerIncome(c){
    if(/人力車の車夫/.test(String(c.role||''))){ const v=rnd(280,450,10); return [`年収は約${v}万円（歩合中心・観光シーズンで変動）`, null]; }
    const role = String(c.role||''), age = Number(c.age)||25, cat = innerRoleCat(role);
    if(cat==='student'){
      const it = innerWeighted([['収入なし（仕送り＋バイト月3万円）',5],['バイト代 月5万円',5],['バイト代 月8万円（掛け持ち）',3],['収入なし（勉強に専念）',3],['配信の投げ銭 月1万円',0.7,'r'],['treasureNFT…ではなく堅実に月4万円',0.1,'r']]);
      return [it[0], it[2] ? 'rare' : null];
    }
    if(cat==='retired'){
      const it = innerWeighted([['年金 月18万円',6],['年金 月22万円＋家賃収入少々',2],['年金＋退職金の取り崩し',4],['年金 月15万円（つつましく）',3],['配当と年金で悠々自適',0.8,'r']]);
      return [it[0], it[2] ? 'rare' : null];
    }
    let lo=330, hi=560;
    for(const [re,a,b] of INNER_INCOME_TABLE){ if(re.test(role)){ lo=a; hi=b; break; } }
    const mult = age<23?0.62:age<28?0.78:age<34?0.92:age<45?1.06:age<55?1.18:age<65?1.08:0.7;
    lo=Math.round(lo*mult); hi=Math.round(hi*mult);
    let v = lo + (hi-lo)*Math.pow(rand(), 1.25);
    if(rand()<0.04) v = hi*(1.2+rand()*.8); // 上振れレア
    if(rand()<0.03) v = lo*0.75; // 下振れレア
    v = Math.max(150, Math.round(v/10)*10);
    const badge = (v>=1000 || v>=hi*1.15 || v<=lo*0.8) ? 'rare' : null;
    return ['年収 約'+v+'万円', badge];
  }

  function chooseInnerEducation(c){
    const role = String(c.role||''), age = Number(c.age)||25, era = Number(c.eraYear)||2026, cat = innerRoleCat(role);
    const F = (v,b)=>[v, b||null];
    if(/防衛大学校/.test(role)) return F('防衛大学校在学中');
    if(/大学院生/.test(role)) return F('大学院在学中（修士課程）');
    if(/大学1年生/.test(role)) return F('大学1年在学中');
    if(/就活中の大学生/.test(role)) return F('大学4年在学中（就活中）');
    if(/大学生/.test(role)) return F('大学在学中（'+rnd(2,3,1)+'年）');
    if(/専門学校生/.test(role)) return F('専門学校在学中');
    if(/浪人生/.test(role)) return F('高卒（浪人中・志望校一本）');
    if(/高校卒業直後/.test(role)) return F('高卒（進路準備中）');
    if(/医師|研修医/.test(role)) return F('大卒（医学部）');
    if(/歯科医師/.test(role)) return F('大卒（歯学部）');
    if(/薬剤師/.test(role)) return F('大卒（薬学部6年制）');
    if(/弁護士/.test(role)) return F('大卒（法学部）＋法科大学院修了');
    if(/公認会計士/.test(role)) return F(pick(['大卒（商学部）','大卒（経済学部）'])) ;
    if(/看護師/.test(role)) return F(pick(['看護専門学校卒','大卒（看護学部）']));
    if(/理学療法士/.test(role)) return F(pick(['専門卒（リハビリ学科）','大卒（理学療法学科）']));
    if(/建築士/.test(role)) return F(pick(['大卒（建築学科）','工業高校卒＋実務で二級から']));
    if(/大学研究員/.test(role)) return F('大学院卒（博士課程）', 'rare');
    if(/パイロット/.test(role)) return F(pick(['大卒＋自社養成パイロット','航空大学校卒']), 'rare');
    if(/教師|教員/.test(role)) return F(pick(['大卒（教育学部）','大卒（教職課程履修）']));
    if(/体育教師/.test(role)) return F('大卒（体育大）');
    let list;
    const oldEra = era <= 1980;
    if(cat==='trade' || cat==='service'){
      list = [['高卒（就職組）',8],['工業高校卒',cat==='trade'?6:1],['商業高校卒',3],['専門学校卒',6],['大卒（私立文系）',3],['高卒（家業の手伝いから）',2],['大学中退',1,'r'],['高校中退から叩き上げ',0.8,'d'],['夜間高校卒（働きながら）',0.7,'r']];
    } else if(oldEra){
      list = [['高卒',9],['中卒（集団就職）',4,'r'],['旧制中学卒',2],['大卒（当時のエリート）',2,'r'],['商業高校卒',3],['工業高校卒',3]];
    } else {
      list = [['大卒（私立文系）',8],['大卒（地方国立大）',6],['大卒（私立理系）',5],['大卒（有名私大）',3],['高卒（就職組）',5],['専門学校卒',4],['大学院卒（修士）',1.5,'r'],['大卒（東大）',0.3,'r'],['大卒（京大）',0.3,'r'],['海外大卒',0.4,'r'],['大学中退',1,'r'],['通信制大学卒（働きながら）',0.7,'r'],['夜間大学卒',0.5,'r'],['大卒（1年留年して5年で卒業）',1.5],['高専卒',1]];
    }
    if(/銀行員|商社勤務|コンサルタント|企画職/.test(role)){
      list = list.filter(x=>!/高卒|高専卒|専門学校卒|中退|夜間高校/.test(x[0]));
      if(/コンサルタント|商社勤務/.test(role)) list = list.map(x=>/有名私大|東大|京大|海外大|大学院/.test(x[0])?[x[0],x[1]*4,x[2]]:x);
    }
    if(age<23) list = list.filter(x=>!/留年して5年|大学院卒/.test(x[0]));
    if(age<21) list = list.filter(x=>!/大卒|大学院|海外大/.test(x[0]));
    if(!list.length) list = [['高卒',1]];
    const it = innerWeighted(list);
    return [it[0], (it[2]==='d'||it[2]==='r') ? 'rare' : null];
  }

  function chooseInnerOrigin(c){
    let list = INNER_ORIGINS.slice();
    if(/医師|歯科/.test(String(c.role||''))) list = list.map(x=>x[0]==='開業医の家系'?[x[0],x[1]*6,x[2]]:x);
    if(/農家/.test(String(c.role||''))) list = list.map(x=>x[0]==='農家の長男'?[x[0],x[1]*8]:x);
    if(/漁師/.test(String(c.role||''))) list = list.map(x=>x[0]==='漁師町の生まれ'?[x[0],x[1]*8]:x);
    if(/僧侶/.test(String(c.role||''))) list = list.map(x=>x[0]==='寺の息子'?[x[0],x[1]*20,'r']:x);
    const it = innerWeighted(list);
    let badge = (it[2]==='d'||it[2]==='r') ? 'rare' : null;
    const inc = String(c.incomeText||'');
    const m = inc.match(/約(\d+)万円/);
    if(m && Number(m[1])>=900 && /生活保護|借金|施設|母子家庭|夜逃げ/.test(it[0])) badge = 'gap';
    return [it[0], badge];
  }

  function chooseInnerComplexBase(c){
    let list = INNER_COMPLEX_GENERIC.slice();
    const h = Number(c.heightRaw || parseInt(c.height,10)) || 172;
    const age = Number(c.age)||25;
    if(h<=167) list.push(['身長が低いこと',9]);
    if(h>=189) list.push(['身長が高すぎて目立つこと',5]);
    if(/ぽっちゃり/.test(String(c.bodyType||''))) list.push(['体型のこと',8]);
    if(/細身/.test(String(c.bodyType||''))) list.push(['ガリガリ体型なこと',6]);
    if(/一重/.test(String(c.eyelid||''))) list.push(['一重の目つきが悪く見られがちなこと',6]);
    if(/後退/.test(String(c.hairline||''))) list.push(['生え際の後退',8,'d']);
    if(/ニキビ/.test(String(c.skinDetail||''))) list.push(['肌荒れ・ニキビ跡',6]);
    if(/老け/.test(String(c.ageAppearance||''))) list.push(['実年齢より老けて見られること',6]);
    if(/童顔|若く/.test(String(c.ageAppearance||''))) list.push(['童顔で貫禄がないこと',5]);
    if(/濃いめ|かなり濃い/.test(String(c.bodyHairOverall||''))) list.push(['毛深いこと',6,'d']);
    if(/薄め|ほぼ無毛/.test(String(c.bodyHairOverall||''))) list.push(['体毛が薄すぎること',3]);
    if(/高卒|中卒/.test(String(c.educationText||'')) && innerRoleCat(c.role)==='office') list.push(['職場で学歴の話になると黙ること',5,'d']);
    const fs = parseFloat(c.footSize); if(fs && fs>=29) list.push(['足がデカくて靴がないこと',4]);
    if(age<=29) {} else { list = list.filter(x=>!/童貞/.test(x[0])); }
    const total = list.reduce((s,x)=>s+x[1],0);
    if(rand() < 14/(14+total)) return ['特になし（あるとすれば無頓着なこと）', null];
    const it = innerWeighted(list);
    return [it[0], it[2]==='d' && rand()<.6 ? 'rare' : innerBadgeOf(it, 0, list)];
  }

  function chooseInnerBlood(c){
    const dist = INNER_BLOOD_DIST[String(c.nationality||'日本')] || INNER_BLOOD_DIST['日本'];
    const type = weighted([['A型',dist[0]],['O型',dist[1]],['B型',dist[2]],['AB型',dist[3]]]);
    const rhn = rand() < INNER_RHNEG(String(c.nationality||'日本'));
    const v = rhn ? type+'（Rh−）' : type;
    const share = type==='A型'?dist[0]:type==='O型'?dist[1]:type==='B型'?dist[2]:dist[3];
    return [v, rhn ? 'rare' : (share<=10 ? 'rare' : null)];
  }

  function chooseInnerLove(c){
    const base = innerWeighted(INNER_LOVE_BASE);
    let v = base[0], badge = base[2] ? 'rare' : null;
    const noteFor = (b)=>{
      if(b==='女性') return INNER_LOVE_NOTE_ANY.concat(INNER_LOVE_NOTE_F);
      if(b==='男性') return INNER_LOVE_NOTE_ANY.concat(INNER_LOVE_NOTE_M);
      if(b==='男女どちらも') return rand()<.5 ? INNER_LOVE_NOTE_BI : INNER_LOVE_NOTE_BI.concat(INNER_LOVE_NOTE_ANY, INNER_LOVE_NOTE_F, INNER_LOVE_NOTE_M);
      return null;
    };
    const pool = noteFor(base[0]);
    if(pool && rand()<.78){
      const n = innerWeighted(pool);
      v = base[0]+'（'+n[0]+'）';
      if(!badge && n[2]==='d' && rand()<.45) badge = /既婚者/.test(n[0]) ? 'gap' : 'rare';
    }
    return [v, badge];
  }

  function generateInnerProfile(c, keys){
    const all = !keys;
    if(!c.innerMeta) c.innerMeta = {};
    const M = c.innerMeta;
    const set = all ? null : innerExpandKeys(keys);
    const has = k => all || set.has(k);
    if(has('income')){ const r = chooseInnerIncome(c); c.incomeText = r[0]; M.income = r[1]; }
    if(has('education')){ const r = chooseInnerEducation(c); c.educationText = r[0]; M.education = r[1]; }
    if(has('origin')){ const r = chooseInnerOrigin(c); c.originText = r[0]; M.origin = r[1]; applyOriginRoots(c); }
    if(has('marital')){ const r = chooseInnerMarital(c); c.maritalText = r[0]; M.marital = r[1]; }
    if(has('marital') && typeof syncMarriageRing==='function') syncMarriageRing(c);
    if(has('living')){ const r = chooseInnerLiving(c); c.livingText = r[0]; M.living = r[1]; }
    if(has('birthplace')){ const r = chooseInnerBirthplace(c); c.birthplaceText = r[0]; M.birthplace = r[1]; }
    if(has('family')){ const r = chooseInnerFamily(c); c.familyText = r[0]; M.family = M.family==='gap'||r[1]==='gap' ? 'gap' : r[1]; }
    if(has('residence')){ const r = chooseInnerResidence(c); c.residenceText = r[0]; M.residence = r[1]; }
    if(has('birthdate')){ const r = chooseInnerBirthdate(c); c.birthdateText = r[0]; M.birthdate = r[1]; }
    if(has('pronoun')){ const r = chooseInnerPronoun(c); c.pronoun = r[0]; M.pronoun = r[1]; }
    if(has('principle')){ const r = chooseInnerPrinciple(c); c.principleText = r[0]; M.principle = r[1]; }
    if(has('dream')){ const r = chooseInnerDream(c); c.innerDream = r[0]; M.dream = r[1]; }
    if(has('desire')){ const r = chooseInnerDesire(c, c.innerDream); c.innerDesire = r[0]; M.desire = r[1]; }
    if(has('weakness')){ const r = chooseInnerWeakness(c); c.weaknessMind = r[0]; c.weaknessBody = r[1]; M.weakness = r[2]; }
    if(has('health')){ const r = chooseInnerHealth(c); c.healthText = r[0]; M.health = r[1]; }
    if(has('talent')){ const r = chooseInnerTalent(c); c.innerTalent = r[0]; M.talent = r[1]; }
    if(has('past')){ const r = chooseInnerPast(c); c.pastUpbringing = r[0]; c.pastTrauma = r[1]; M.past = r[2]; }
    if(has('unforgivable')){ const r = chooseInnerUnforgivable(c); c.unforgivableText = r[0]; M.unforgivable = r[1]; }
    if(has('gamble')){ const r = chooseInnerGamble(c); c.gambleText = r[0]; M.gamble = r[1]; }
    if(has('asset')){ const r = chooseInnerAsset(c); c.assetText = r[0]; M.asset = r[1]; }
    if(has('hobby')){ const r = chooseInnerHobby(c); c.hobbyText = r[0]; M.hobby = r[1]; }
    if(has('myboom')){ const r = chooseInnerMyBoom(c, c.hobbyText); c.myBoomText = r[0]; M.myboom = r[1]; }
    if(has('foods')){ const r = chooseInnerFoods(c); c.foodLikeText = r[0]; c.foodHateText = r[1]; M.foods = r[2]; }
    if(has('nickname')){ const r = chooseInnerNickname(c); c.nicknameText = r[0]; M.nickname = r[1]; }
    if(has('complex')){ const r = chooseInnerComplex(c); c.complexText = r[0]; M.complex = r[1]; }
    if(has('speech')){ const r = chooseInnerSpeech(c); c.speechText = r[0]; M.speech = r[1]; }
    if(has('memory')){ const r = chooseInnerMemory(c); c.memoryText = r[0]; M.memory = r[1]; }
    if(has('blood')){ const r = chooseInnerBlood(c); c.bloodType = r[0]; M.blood = r[1]; }
    if(has('love')){ const r = chooseInnerLove(c); c.loveTarget = r[0]; M.love = r[1]; }
    if(has('lover')){ const r = chooseInnerLover(c); c.loverText = r[0]; M.lover = r[1]; }
    if(has('fuzoku')){ const r = chooseInnerFuzoku(c); c.fuzokuText = r[0]; M.fuzoku = r[1]; }
    if(has('firstexp')){ const r = chooseInnerFirstExp(c); c.firstExpText = r[0]; M.firstexp = r[1]; }
    if(has('lovecount')){ const r = chooseInnerLoveCount(c); c.loveCountText = r[0]; M.lovecount = r[1]; }
    if(has('weekfreq')){ const r = chooseInnerWeekFreq(c); c.weekFreqText = r[0]; M.weekfreq = r[1]; }
    if(has('selffreq')){ const r = chooseInnerSelfFreq(c); c.selfFreqText = r[0]; M.selffreq = r[1]; }
    if(has('expcount')){ const r = chooseInnerExpCount(c); c.expCountText = r[0]; M.expcount = r[1]; }
    if(has('lovetype')){ const r = chooseInnerLoveType(c); c.loveTypeText = r[0]; M.lovetype = r[1]; }
    if(has('complex') || has('lovetype') || true){ if(!c.favoriteWordText){ const r = chooseInnerFavoriteWord(c); c.favoriteWordText = r[0]; } }
    if(has('fashionsense')){ const r = chooseInnerFashionSense(c); c.fashionSenseText = r[0]; M.fashionsense = r[1]; applyFashionSenseFx(c); chooseFashionProfile(c); }

    if(has('drink')){ const r = chooseInnerDrink(c); c.drinkText = r[0]; M.drink = r[1]; }
    if(has('smoke')){ const r = chooseInnerSmoke(c); c.smokeText = r[0]; M.smoke = r[1]; }
    if(has('friend')){ const r = chooseInnerFriend(c); c.friendText = r[0]; M.friend = r[1]; }
    if(all && typeof buildBioHook2 === 'function'){ c.catchText = buildBioHook2(c); c.bioText = buildBioLine2(c) || null; }
    if(all && typeof buildPersonSummary === 'function'){ c.summaryText = buildPersonSummary(c); }
    return c;
  }

  function innerBadgeHtml(c, key){
    const b = c.innerMeta && c.innerMeta[key];
    if(b==='rare') return ' <span class="inner-badge ib-rare">★レア</span>';
    if(b==='gap') return ' <span class="inner-badge ib-gap">⚡ギャップ</span>';
    return '';
  }

  function buildInnerSection(c, L){
    const en = uiLang==='en';
    const V = (val, key)=>`${val||'—'}${innerBadgeHtml(c, key)}`;
    const friendVal = V(c.friendText,'friend') + (c.friendOf ? '' : ` <button class="pf-btn" data-make-friend title="${en?'Create this friend for real':'この友人を実際に作成（表示された関係・名前を反映）'}">👥 ${en?'Create this friend':'この友人を作成'}</button>`);
    const CAT_ROWS = {
      basic: [
        [en?'Birth Date':'生年月日', V(c.birthdateText,'birthdate'), 'birthdateText','icv-basic'],
        [en?'Hometown':'出身地', V(c.birthplaceText,'birthplace'), 'birthplaceText','icv-basic'],
        [en?'Blood Type':'血液型', V(c.bloodType,'blood'), 'bloodType','icv-basic'],
        [en?'Pronoun':'一人称', V(c.pronoun,'pronoun'), 'pronoun','icv-basic'],
        [en?'Speech Style':'口調・話し方', V(c.speechText,'speech'), 'speechText','icv-basic'],
        [en?'Nickname':'ニックネーム', V(c.nicknameText,'nickname'), 'nicknameText','icv-basic']
      ],
      life: [
        [en?'Marital Status':'結婚', V(c.maritalText,'marital'), 'maritalText','icv-life'],
        [en?'Partner':'恋人の有無', V(c.loverText,'lover'), 'loverText','icv-life'],
        [en?'Family':'家族構成', V(c.familyText,'family') + (c.siblingOf?'':` <button class="pf-btn" data-make-sibling="兄" title="${en?'Create his older brother':'この人物の兄を作成（顔立てを引き継ぐ）'}">👨‍👦 ${en?'Brother+':'兄を作成'}</button> <button class="pf-btn" data-make-sibling="弟" title="${en?'Create his younger brother':'この人物の弟を作成（顔立てを引き継ぐ）'}">👦 ${en?'Brother-':'弟を作成'}</button>`), 'familyText','icv-life'],
        [en?'Living Situation':'生活状況', V(c.livingText,'living'), 'livingText','icv-life'],
        [en?'Residence':'住居', V(c.residenceText,'residence'), 'residenceText','icv-life'],
        [en?'Family Roots':'出自', V(c.originText,'origin'), 'originText','icv-life'],
        [en?'Education':'学歴', V(c.educationText,'education'), 'educationText','icv-life'],
        [en?'Income':'収入', V(c.incomeText,'income'), 'incomeText','icv-life'],
        [en?'Assets':'資産', V(c.assetText,'asset'), 'assetText','icv-life']
      ],
      daily: [
        [en?'Health':'健康状態', V(c.healthText,'health'), 'healthText','icv-daily'],
        [en?'Hobby':'趣味', V(c.hobbyText,'hobby'), 'hobbyText','icv-daily'],
        [en?'Current Obsession':'マイブーム', V(c.myBoomText,'myboom'), 'myBoomText','icv-daily'],
        [en?'Favorite Food':'好きな食べ物', V(c.foodLikeText,'foods'), 'foodLikeText','icv-daily'],
        [en?'Disliked Food':'嫌いな食べ物', V(c.foodHateText,'foods'), 'foodHateText','icv-daily']
      ],
      mind: [
        [en?'Guiding Principle':'行動原理', V(c.principleText,'principle'), 'principleText','icv-mind'],
        [en?'Fashion Policy':'コーデ基準', V(c.fashionSenseText,'fashionsense'), 'fashionSenseText','icv-mind'],
        [en?'Public Dream':'表向きの夢', V(c.innerDream,'dream'), 'innerDream','icv-mind'],
        [en?'Hidden Desire':'欲望（本音）', V(c.innerDesire,'desire'), 'innerDesire','icv-mind'],
        [en?'Weakness (Mind / Body)':'弱点（性格 / 身体）', V(`${c.weaknessMind||'—'}／${c.weaknessBody||'—'}`,'weakness'), 'weaknessMind,weaknessBody','icv-mind'],
        [en?'Talent':'秀でた才能', V(c.innerTalent,'talent'), 'innerTalent','icv-mind'],
        [en?'Complex':'コンプレックス', V(c.complexText,'complex'), 'complexText','icv-mind'],
        [en?'Unforgivable':'許せないこと', V(c.unforgivableText,'unforgivable'), 'unforgivableText','icv-mind'],
        [en?'Favorite Words':'好きな言葉', V(c.favoriteWordText,'favoriteword'), 'favoriteWordText','icv-mind']
      ],
      fashion: [
        [en?'Fashion Priority':'重視する価値観', V(c.fashionValueText,'fashionvalue'), 'fashionValueText','icv-fashion'],
        [en?'Favorite Brand (Clothes)':'好きなブランド（服）', V(c.favBrandText,'favbrand'), 'favBrandText','icv-fashion'],
        [en?'Favorite Brand (Shoes)':'好きなブランド（靴）', V(c.favShoeBrandText,'favshoebrand'), 'favShoeBrandText','icv-fashion'],
        [en?'Fit Preference':'サイズ感', V(c.sizeFeelText,'sizefeel'), 'sizeFeelText','icv-fashion'],
        [en?'Trouser Hem Preference':'ボトムスの丈感', V(c.hemPrefText,'hempref'), 'hemPrefText','icv-fashion'],
        [en?'Slacks Fit / Hem Finish':'スラックス（フィット・裾）', V(`${c.slacksFitText||'—'}・${c.hemFinishText||'—'}`,'slacksfit'), 'slacksFitText,hemFinishText','icv-fashion'],
        [en?'Base Color / Scheme':'基調色・配色', V(`${c.baseColorText||'—'}（${c.colorSchemeText||'—'}）`,'basecolor'), 'baseColorText,colorSchemeText','icv-fashion'],
        [en?'Sock Drawer':'靴下の内訳', V(c.sockDrawerText,'sockdrawer'), 'sockDrawerText','icv-fashion'],
        [en?'Sock Replacement':'靴下の買い替え', V(c.sockCycleText,'sockcycle'), 'sockCycleText','icv-fashion'],
        [en?'Sock Rotation':'靴下の連続着用', V(c.sockWearText,'sockwear'), 'sockWearText','icv-fashion'],
        [en?'Sock Smell':'靴下のニオイ', V(c.sockSmellText,'socksmell'), 'sockSmellText','icv-fashion'],
        [en?'Sock Trouble':'靴下の悩み', V(c.sockTroubleText,'socktrouble'), 'sockTroubleText','icv-fashion'],
        [en?'Sock Pairing':'服との合わせ方', V(c.sockPairText,'sockpair'), 'sockPairText','icv-fashion']
      ],
      past: [
        [en?'Past / Trauma':'過去（生い立ち / トラウマ）', V(`${c.pastUpbringing||'—'}<br>${c.pastTrauma||'トラウマ：なし'}`,'past'), 'pastUpbringing,pastTrauma','icv-past'],
        [en?'Treasured Memory':'思い出の出来事', V(c.memoryText,'memory'), 'memoryText','icv-past'],
        [en?'Close Friend':'仲の良い友人', friendVal, 'friendText','icv-past'],
        [en?'Romantic Interest':'恋愛対象', V(c.loveTarget,'love'), 'loveTarget','icv-past'],
        [en?'Type He Falls For':'好きなタイプ', V(c.loveTypeText,'lovetype'), 'loveTypeText','icv-past'],
        [en?'Past Relationships':'恋愛経験人数', V(c.loveCountText,'lovecount'), 'loveCountText','icv-past']
      ],
      adult: [
        [en?'Drinking':'飲酒', V(c.drinkText,'drink'), 'drinkText','icv-adult'],
        [en?'Smoking':'喫煙', V(c.smokeText,'smoke'), 'smokeText','icv-adult'],
        [en?'Gambling History':'ギャンブル歴', V(c.gambleText,'gamble'), 'gambleText','icv-adult'],
        [en?'Adult-Venue Experience':'風俗経験', V(c.fuzokuText,'fuzoku'), 'fuzokuText','icv-adult'],
        [en?'First Experience':'初めての体験', V(c.firstExpText,'firstexp'), 'firstExpText','icv-adult'],
        [en?'Partner Count':'経験人数', V(c.expCountText,'expcount'), 'expCountText','icv-adult'],
        [en?'Weekly Pace (Partner)':'週頻度（相手あり）', V(c.weekFreqText,'weekfreq'), 'weekFreqText','icv-adult'],
        [en?'Weekly Pace (Solo)':'週頻度（セルフ）', V(c.selfFreqText,'selffreq'), 'selfFreqText','icv-adult']
      ]
    };
    const allOn = INNER_CATS.every(([k])=>innerCatShow[k]);
    const ctrl = `<div class="inner-ctrl">`
      + `<button class="pf-btn inner-allbtn" data-icat-all="${allOn?'0':'1'}">${allOn ? (en?'Hide all':'すべて隠す') : (en?'Show all':'すべて表示')}</button>`
      + INNER_CATS.map(([k,ja,enT,cls])=>`<button class="icat-chip ${cls}${innerCatShow[k]?' on':''}" data-icat="${k}">${en?enT:ja}</button>`).join('')
      + `</div>`;
    const rows = [['__HEAD__', ctrl]];
    let shown = 0;
    for(const [k,ja,enT,cls] of INNER_CATS){
      if(!innerCatShow[k]) continue;
      shown++;
      rows.push(['__HEAD__', `<div class="inner-cat ${cls}">${en?enT:ja}</div>`]);
      rows.push(...CAT_ROWS[k]);
    }
    if(!shown) rows.push(['__HEAD__', `<p class="notice" style="margin:8px 0 2px">${en?'Nothing is shown yet. Tap the category chips above to reveal items — only the shown categories are reflected in the magazine-page / profile-sheet prompts.':'まだ何も表示されていません。上のカテゴリボタンを押すと項目が表示されます。表示したカテゴリだけが雑誌ページ／プロフィールシートの指示文に反映されます。'}</p>`]);
    return ['inner', en ? 'Inner / Background (only shown categories go into magazine & profile-sheet prompts)' : '内面・背景（表示中のカテゴリのみ雑誌ページ／プロフィールシートに反映）', rows];
  }

  const INNER_HOBBY_GENERIC = [['サウナ通い',4],['筋トレ',5],['ランニング',4],['フットサル',2.5],['ゴルフ練習場通い',2.5],['釣り',3],['キャンプ',3],['登山',2.5],['ロードバイク',2],['自炊・料理',4],['ラーメン食べ歩き',3.5],['カレー屋巡り',2],['コーヒー（豆から淹れる）',2.5],['クラフトビール巡り',2],['日本酒の飲み比べ',2],['映画鑑賞',5],['ミニシアター通い',1.5],['読書',4],['マンガ',4],['ゲーム（FPS）',3],['ゲーム（RPG）',3],['レトロゲーム収集',1.5],['ボードゲーム会',1.5],['麻雀',2],['将棋アプリ',2],['カメラ・写真',3],['フィルムカメラ',1.5],['プラモデル',2],['ガンプラ',2],['鉄道（乗り鉄）',1.5],['御朱印集め',1.5],['城巡り',1.5],['美術館巡り',2],['水族館巡り',1.5],['観葉植物',2.5],['熱帯魚・アクアリウム',1.5],['メダカ飼育',1.2],['DIY',2.5],['車いじり',2],['バイクツーリング',2],['スニーカー収集',2],['古着屋巡り',2],['レコード収集',1.5],['ギター',2.5],['カラオケ',3],['ダーツ',1.5],['ビリヤード',1.2],['ボルダリング',1.5],['サーフィン',1.2],['スノボ（冬季）',2],['野球観戦',3],['サッカー観戦',2.5],['温泉巡り',3],['銭湯巡り',2.5],['食べ歩きブログ巡回',2],['ポイ活',1.5],['競馬（趣味の範囲）',1.5,'d'],['盆栽',1,'r'],['蕎麦打ち',0.8,'r'],['献血（趣味と言い張る）',0.8,'r']];

  const INNER_HOBBY_BY_VIBE = {'スポーツ系':[['フットサル',6],['ジム通い',6],['ランニング',5]],'古着系':[['古着屋巡り',8],['レコード収集',3]],'オタク系':[['アニメ鑑賞',7],['ゲーム（RPG）',6],['フィギュア収集',3]],'アウトドア系':[['キャンプ',8],['登山',6],['釣り',4]],'バンドマン系':[['ギター',8],['ライブ通い',5],['機材集め',4]],'レトロ系':[['純喫茶巡り',7],['フィルムカメラ',4]],'メガネ知的系':[['読書',7],['美術館巡り',4]],'おじさん系':[['銭湯巡り',6],['晩酌の肴づくり',5],['競馬（趣味の範囲）',2,'d']],'ギャル男系':[['サウナ通い',6],['クラブ・音楽イベント',4]],'ホスト系':[['筋トレ',6],['美容・スキンケア研究',5]],'サブカル系':[['ミニシアター通い',6],['レコード収集',4],['ZINE集め',2]],'清楚系':[['カフェで読書',6],['植物の世話',3]],'ヤンキー系':[['バイクいじり',7],['地元の草野球',3]],'韓国風':[['カフェ巡り',5],['ファッション研究',4]]};

  const INNER_MYBOOM_MODERN = [['朝サウナ',4],['白湯を飲むこと',3],['オートミールアレンジ',2],['二郎系ラーメン開拓',3],['韓国ドラマ一気見',2.5],['ショート動画の沼',3],['推し配信者の切り抜き巡回',2],['プロテインの味比べ',3],['コンビニ新作スイーツ評論',3.5],['スマートウォッチの睡眠スコア',2.5],['キャンプ飯動画',2.5],['サブスクの解約整理',2],['歩数計チャレンジ',2],['冷凍餃子の焼き方研究',3],['電気圧力鍋',2],['ふるさと納税の返礼品研究',2.5],['ノーカフェイン生活（3日目）',2],['AIに献立を決めてもらうこと',1.5],['マイボトル持参',2.5],['昼休みの散歩',3]];

  const INNER_MYBOOM_COMMON = [['ストレッチ',3.5],['蒙古タンメン的な激辛麺',2.5],['卵かけご飯の醤油研究',3],['納豆のトッピング研究',2.5],['缶コーヒーの飲み比べ',2.5],['靴磨き',2],['クロスワード',1.5],['青春時代の曲を聴き直すこと',3.5],['妻・彼女の真似をした健康法',2],['寝る前の白黒映画',1.2,'r'],['ぬか漬け',1.5],['ベランダ菜園のミニトマト',2.5],['ラジオの深夜放送',2],['手帳・文房具',2],['スクワット',3],['近所の野良猫の観察',2.5],['指のストレッチ',1.5],['出汁を取ること',1.5]];

  const INNER_MYBOOM_RETRO = [['ビックリマンシール集め',3],['ファミコンの攻略',3],['深夜ラジオのハガキ職人',2],['喫茶店のナポリタン巡り',3],['レンタルビデオ屋の新作チェック',3],['プロ野球ニュースの録画',2.5],['ラジカセでのエアチェック',2.5],['プラモ屋通い',2.5]];

  const INNER_FOOD_LIKE = [['唐揚げ',7],['餃子',6],['家系ラーメン',4],['味噌ラーメン',4],['豚骨ラーメン',4],['寿司（サーモン）',4],['寿司（中トロ）',3],['焼肉（ハラミ）',5],['焼肉（タン塩）',4],['カレーライス',6],['ハンバーグ',5],['オムライス',4],['親子丼',4],['カツ丼',4.5],['天ぷらそば',3],['讃岐うどん',3.5],['牛丼',5],['麻婆豆腐',4],['チャーハン',5],['ナポリタン',3.5],['生姜焼き',5],['卵かけご飯',4],['明太子',3],['刺身の盛り合わせ',3.5],['焼き鳥（皮）',3],['焼き鳥（ねぎま）',3.5],['もつ煮',3],['おでん（大根）',3],['キムチ鍋',3.5],['もつ鍋',3],['ピザ',3.5],['ステーキ',4],['回転寿司ぜんぶ',3.5],['実家の味噌汁',3.5],['白米そのもの',3.5],['プリン',2.5],['チョコミント',1.5],['大福',2],['シュークリーム',2.5],['メロンパン',2.5],['コンビニのホットスナック',3.5],['駅そば',2.5],['カツカレー',4],['エビフライ',3.5],['ぶり大根',2],['サバの味噌煮',3],['ローストビーフ',2.5],['ペペロンチーノ',2.5],['タコライス',1.5],['ジンギスカン',1.5]];

  const INNER_FOOD_HATE = [['パクチー',5],['セロリ',4.5],['春菊',3],['ゴーヤ',3.5],['レバー',4],['牡蠣',3.5],['うに',2.5],['納豆',3],['くさや',2],['ブルーチーズ',3],['酢の物',2.5],['らっきょう',3],['梅干し',2.5],['グリンピース',3],['ミニトマト',2.5],['生玉ねぎ',3],['椎茸',3.5],['なす',2.5],['ピーマン',2.5],['激辛料理',3],['甘すぎるスイーツ',2.5],['生クリーム',2.5],['あんこ',2],['ホルモン',2.5],['生もの全般',2],['マヨネーズ',2],['ドリアン',2],['八角の香り',2.5],['山菜の苦み',2],['酢豚のパイナップル',4],['パンに入ったレーズン',3.5],['わさび',2.5],['からし',2],['セロリ以上にパセリ',1.5],['グミ',1.5],['貝類全般',2],['スイカ',1.5],['メロン',1.2],['牛乳',2],['特になし（好き嫌いゼロ）',5]];

  const INNER_HEALTH_BASE = [['至って健康（風邪もめったに引かない）',7],['おおむね良好',9],['おおむね良好（肩こりだけが友達）',5],['健康だが健診の数値がじわじわ来ている',4],['健康優良（献血の常連）',1.5,'r'],['丈夫だけが取り柄',4],['季節の変わり目に弱い',3],['良好（ただし花粉の季節を除く）',4]];

  const INNER_HEALTH_MID = [['血圧がやや高め',4],['尿酸値に警告が出ている',3,'d'],['γ-GTPと戦っている',2.5,'d'],['腰と長い付き合い',4],['老眼が始まった',3],['五十肩の気配',2],['健診の再検査を先延ばし中',3,'d'],['禁煙に成功して3年目',2],['禁煙に挑戦中（3回目）',2,'d']];

  const INNER_LIVING_SINGLE = [['一人暮らし（賃貸アパート）',9],['一人暮らし（賃貸マンション）',6],['実家暮らし',7],['会社の独身寮',2],['社宅住まい',1.5],['友人とルームシェア',1.5],['祖父母の家に同居（家賃代わりに手伝い）',0.8,'r'],['住み込み（職場の上）',0.6,'r']];

  const INNER_LIVING_MARRIED = [['家族と賃貸マンション',6],['家族と持ち家（ローン返済中）',6],['家族と持ち家（実家を建て替え）',2],['単身赴任中（家族は地元）',1.2,'d'],['妻の実家の近くに新居',1.5],['二世帯住宅（親と同居）',1.5]];

  const INNER_FRIEND_MEET = [['幼なじみ',5],['小学校からの腐れ縁',4],['中学の部活仲間',4],['高校の同級生',6],['高校の部活仲間',5],['大学のサークル仲間',4],['大学の同期',3.5],['専門学校の同期',2],['職場の同期',5],['前の職場の同期',3],['バイト先で知り合った',3],['行きつけの店の常連仲間',2.5],['サウナで知り合った',1.5],['草野球チームの仲間',2],['ネトゲのフレンド（オフ会で意気投合）',1.5],['ジム仲間',2],['隣の席だっただけの縁',2.5]];

  const INNER_FRIEND_FREQ = [['月イチで飲む',5],['週末によく遊ぶ',3],['年2回の旅行が恒例',2],['ほぼ毎日どうでもいい連絡をし合う',3],['連絡は稀だが会えば一瞬で戻る',4],['サシ飲みできる唯一の相手',3],['家族ぐるみの付き合い',2],['月イチのフットサル仲間',2]];

  const INNER_LOVER_NONE = [['なし（出会いがない）',6],['なし（仕事が恋人）',3],['なし（半年前に破局）',2.5],['なし（絶賛片思い中）',2.5],['なし（マッチングアプリと格闘中）',2.5],['なし（気楽で気に入っている）',3],['なし（友達どまりの人はいる）',2.5]];

  const INNER_LOVER_YES = [['恋人あり（付き合って3ヶ月）',3],['恋人あり（付き合って1年）',4],['恋人あり（付き合って2年・倦怠期）',2],['恋人あり（学生時代から）',2.5],['恋人あり（遠距離）',1.5],['恋人あり（同棲中）',2.5],['恋人あり（最近ケンカ中）',1.5]];

  const INNER_MEMORY_BASE = [['修学旅行の夜の告白大会',4],['文化祭の打ち上げ',4],['卒業式で第二ボタンを聞かれなかったこと',2.5],['初めての一人旅',3.5],['免許合宿での出会いと別れ',3],['成人式の同窓会',3.5],['初任給で親に鰻をおごった日',4],['上京の日の新幹線の窓',3],['富士山頂のご来光',2],['夜行バスで見た朝焼け',2.5],['地元の花火大会',4],['祖父母の家の夏休み',4],['台風の日の停電で家族で食べたカップ麺',3],['猫を拾った雨の日',2],['初めて売上目標を達成した日',3],['深夜のファミレスで語り明かした夜',4],['文化祭のバンドでの1曲',2.5],['満員の甲子園アルプス席',1.5],['卒業旅行の朝帰り',3]];

  const INNER_JP_PREFS = [
    ['北海道',['札幌市','函館市','帯広市'],4,'north,sea'],['青森県',['青森市','八戸市','弘前市'],1,'tohoku,sea'],['岩手県',['盛岡市','一関市'],1,'tohoku'],['宮城県',['仙台市','石巻市'],2,'tohoku,sea'],['秋田県',['秋田市','横手市'],0.8,'tohoku'],['山形県',['山形市','鶴岡市'],0.8,'tohoku'],['福島県',['郡山市','いわき市','会津若松市'],1.4,'tohoku'],
    ['茨城県',['水戸市','つくば市','日立市'],2,'kanto'],['栃木県',['宇都宮市','小山市'],1.6,'kanto'],['群馬県',['高崎市','前橋市','草津町'],1.5,'kanto,onsen'],['埼玉県',['さいたま市','川越市','所沢市'],5,'kanto,metro'],['千葉県',['千葉市','船橋市','柏市'],4.5,'kanto,metro,sea'],['東京都',['世田谷区','練馬区','八王子市','足立区'],8,'kanto,metro'],['神奈川県',['横浜市','川崎市','藤沢市'],6.5,'kanto,metro,sea'],
    ['新潟県',['新潟市','長岡市'],1.6,'sea,snow'],['富山県',['富山市','高岡市'],0.8,'sea'],['石川県',['金沢市','小松市'],1,'sea'],['福井県',['福井市','敦賀市'],0.6,'sea'],['山梨県',['甲府市','富士吉田市'],0.7,'mountain'],['長野県',['長野市','松本市','木曽町'],1.6,'mountain'],['岐阜県',['岐阜市','高山市'],1.4,'nagoya,mountain'],['静岡県',['静岡市','浜松市','沼津市'],2.6,'sea'],['愛知県',['名古屋市','豊田市','岡崎市'],5,'nagoya,metro'],['三重県',['四日市市','津市','鳥羽市'],1.2,'sea'],
    ['滋賀県',['大津市','草津市'],1,'kansai'],['京都府',['京都市','宇治市'],2,'kansai'],['大阪府',['大阪市','堺市','東大阪市','枚方市'],6,'kansai,metro'],['兵庫県',['神戸市','姫路市','尼崎市','豊岡市'],4,'kansai,sea,onsen'],['奈良県',['奈良市','橿原市'],1,'kansai'],['和歌山県',['和歌山市','田辺市'],0.7,'kansai,sea'],
    ['鳥取県',['鳥取市','米子市'],0.4,'sea'],['島根県',['松江市','出雲市'],0.5,'sea'],['岡山県',['岡山市','倉敷市'],1.4,''],['広島県',['広島市','福山市','呉市'],2,'hiroshima,sea'],['山口県',['下関市','山口市'],1,'sea'],
    ['徳島県',['徳島市','鳴門市'],0.6,'sea'],['香川県',['高松市','丸亀市'],0.8,'sea'],['愛媛県',['松山市','今治市'],1,'sea'],['高知県',['高知市','四万十市'],0.6,'tosa,sea'],
    ['福岡県',['福岡市','北九州市','久留米市'],3.6,'hakata,metro'],['佐賀県',['佐賀市','唐津市'],0.6,'kyushu,sea'],['長崎県',['長崎市','佐世保市','五島市'],1,'kyushu,sea,island'],['熊本県',['熊本市','八代市'],1.2,'kyushu'],['大分県',['大分市','別府市'],0.9,'kyushu,onsen'],['宮崎県',['宮崎市','都城市'],0.8,'kyushu,sea'],['鹿児島県',['鹿児島市','霧島市','奄美市'],1.2,'kyushu,island,onsen'],['沖縄県',['那覇市','沖縄市','石垣市'],1.1,'okinawa,island,sea']
  ];

  const INNER_NATION_CITIES = {'韓国':['ソウル','釜山','大邱'],'中国':['上海','北京','広州','成都'],'台湾':['台北','高雄','台中'],'ロシア':['モスクワ','サンクトペテルブルク'],'アメリカ':['ロサンゼルス','ニューヨーク','シアトル','オースティン'],'カナダ':['トロント','バンクーバー'],'イギリス':['ロンドン','マンチェスター'],'フランス':['パリ','リヨン','マルセイユ'],'ドイツ':['ベルリン','ミュンヘン','ハンブルク'],'イタリア':['ローマ','ミラノ','ナポリ'],'スペイン':['マドリード','バルセロナ','セビリア'],'スウェーデン':['ストックホルム','ヨーテボリ'],'ポーランド':['ワルシャワ','クラクフ'],'トルコ':['イスタンブール','アンカラ'],'ブラジル':['サンパウロ','リオデジャネイロ'],'メキシコ':['メキシコシティ','グアダラハラ'],'アルゼンチン':['ブエノスアイレス','コルドバ'],'タイ':['バンコク','チェンマイ'],'ベトナム':['ホーチミン','ハノイ','ダナン'],'フィリピン':['マニラ','セブ'],'インドネシア':['ジャカルタ','バンドン'],'マレーシア':['クアラルンプール','ペナン'],'インド':['ムンバイ','デリー','バンガロール'],'モンゴル':['ウランバートル'],'ナイジェリア':['ラゴス','アブジャ'],'オーストラリア':['シドニー','メルボルン','ブリスベン']};

  const INNER_DIALECTS = {kansai:['関西弁',['砕けると関西弁が全開になる','イントネーションだけ関西が残る','ツッコミの時だけ関西弁']],hakata:['博多弁',['砕けると「〜っちゃん」が出る','博多弁のイントネーションが抜けない']],hiroshima:['広島弁',['熱が入ると「じゃけえ」が出る']],nagoya:['名古屋弁',['たまに「〜だがや」が漏れて笑われる','名古屋のイントネーションが残る']],tohoku:['東北訛り',['標準語だが酔うと訛りが顔を出す','イントネーションにほんのり東北が残る']],okinawa:['うちなーぐち',['のんびりした沖縄イントネーション','たまに「だからよ〜」が出る']],tosa:['土佐弁',['熱くなると「〜ぜよ」風味になる']],kyushu:['九州訛り',['語尾に「〜たい」「〜けん」が混ざる']],north:['北海道弁',['寒い日は「なまら」と言いがち']]};

  const INNER_SPEECH_REGISTER = {polite:[['基本は丁寧な敬語',6],['物腰やわらかな敬語ベース',4],['折り目正しい話し方',3],['敬語だが冗談は言う',4],['クッション言葉が多い丁寧口調',3],['講師のように順序立てて話す',2.5],['一人称以外は完全な標準語敬語',2.5]],mid:[['敬語とタメ口を相手で使い分ける',6],['丁寧だが親しくなると砕ける',5],['基本フラットで落ち着いた口調',5],['低めのトーンで淡々と話す',4],['質問で会話をつなぐタイプ',3],['相手の言葉をよく引用して返す',2.5],['砕けた敬語（〜っすね）',4]],rough:[['フランクなタメ口多め',6],['歯に衣着せぬ物言い',3],['ノリと勢いで話すタイプ',4],['声が大きめで豪快',3],['べらんめえ気味の江戸っ子口調',1.5],['体育会系のハキハキ口調',4],['先輩風だが面倒見のいい口調',3],['ぶっきらぼうだが言葉は選ぶ',3]]};

  const INNER_SPEECH_VOICE = [['声が低くて通る',3],['声がやや高め',2.5],['ややハスキー',2],['張りのある声',2.5],['声量控えめ',2.5],['早口',3],['ゆっくり話す',3],['抑揚が豊か',2.5],['ほぼ一本調子',2],['笑い声が大きい',2.5],['ささやくような小声になる瞬間がある',1.5],['電話向きのクリアな発声',2]];

  const INNER_SPEECH_HABITS = [['「要するに」が口癖',3],['「なるほどですね」構文',3],['例え話が多い',3.5],['擬音が多い（ガッと行ってバッと）',3],['相槌のバリエーションが豊富',3],['話す前に少し間を取る',3.5],['早口になりがち',3.5],['語尾がやや伸びる',2.5],['よく笑いながら話す',4],['声が通るので内緒話が下手',2.5],['ぼそっと面白いことを言う',3],['数字を交えて話しがち',2],['「逆に」を多用',3],['褒め上手',2.5],['話にオチを付けたがる',3],['敬語が丁寧すぎて営業と間違われる',2],['電話だと声が1トーン上がる',3],['考えながら顎を触る',2.5],['語尾に「〜かな」を付けがち',3],['「それな」で同意しがち',2.5],['固有名詞をど忘れして「アレ」で通す',3],['聞き返す時に片耳を向ける',2],['沈黙が気まずくてつい喋る',3],['オチの前に自分で笑ってしまう',3],['ことわざを微妙に間違える',2],['数字の記憶だけ異様に正確',2],['敬称を略さない（フルネーム＋さん）',2],['擬人化して物に話しかける',1.5],['英単語がルー語気味に混ざる',1.5],['決めゼリフの前に咳払い',2],['相手の名前を会話に織り込む',2.5],['締めの「はい」が口癖',2.5]];

  function innerParseKanaName(c){
    const raw = nameKana(c) || String(c.name||'');
    const parts = raw.split(/[\s\u3000・]+/).filter(Boolean);
    if(parts.length>=2) return {fam:parts[0], giv:parts[1]};
    return {fam:parts[0]||'', giv:parts[0]||''};
  }

  function chooseInnerHobby(c){
    const list = INNER_HOBBY_GENERIC.concat(INNER_HOBBY_BY_VIBE[c.vibe]||[]);
    const age = Number(c.age)||25; let l = list.slice();
    if(age>=60) l = l.concat([['盆栽',2],['グラウンドゴルフ',1.5],['川柳',1]]);
    const it = innerWeighted(l);
    return [it[0], it[2]==='d'&&rand()<.5 ? 'rare' : (it[2]==='r'?'rare':null)];
  }

  function chooseInnerMyBoom(c, hobby){
    const y = Number(c.eraYear)||2026;
    let l = INNER_MYBOOM_COMMON.slice();
    if(y>=2015) l = l.concat(INNER_MYBOOM_MODERN);
    if(y<1995) l = l.concat(INNER_MYBOOM_RETRO);
    for(let i=0;i<4;i++){
      const it = innerWeighted(l);
      if(hobby && (it[0].slice(0,3)===String(hobby).slice(0,3))) continue;
      return [it[0], it[2]==='r' ? 'rare' : null];
    }
    return ['ストレッチ', null];
  }

  function chooseInnerFoods(c){
    const like = innerWeighted(INNER_FOOD_LIKE);
    for(let i=0;i<5;i++){
      const hate = innerWeighted(INNER_FOOD_HATE);
      const key = s=>String(s).replace(/（.*?）/g,'').slice(0,3);
      if(key(hate[0])!==key(like[0])) return [like[0], hate[0], null];
    }
    return [like[0], '特になし（好き嫌いゼロ）', null];
  }

  function chooseInnerHealth(c){
    const age = Number(c.age)||25;
    let l = INNER_HEALTH_BASE.slice();
    if(age>=42) l = l.concat(INNER_HEALTH_MID);
    const it = innerWeighted(l);
    let v = it[0];
    const wb = String(c.weaknessBody||'');
    if(/腰痛/.test(wb) && !/腰/.test(v) && rand()<.6) v = 'おおむね良好（ただし腰に爆弾）';
    else if(/胃が弱い/.test(wb) && rand()<.5) v = 'おおむね良好（胃だけは正直）';
    else if(/花粉症/.test(wb) && /花粉/.test(v)===false && rand()<.4) v = '良好（ただし花粉の季節を除く）';
    return [v, it[2]==='d'&&rand()<.5 ? 'rare' : (it[2]==='r'?'rare':null)];
  }

  function chooseInnerMarital(c){
    const age = Number(c.age)||25;
    let list;
    if(age<20) list=[['独身（未婚）',1]];
    else if(age<23) list=[['独身（未婚）',97],['既婚',1.2,'g'],['婚約中',1,'r']];
    else if(age<28) list=[['独身（未婚）',84],['既婚',12],['婚約中',2.5],['離婚歴あり（独身）',1.2,'r']];
    else if(age<33) list=[['独身（未婚）',58],['既婚',34],['婚約中',3],['離婚歴あり（独身）',4],['再婚',1,'r']];
    else if(age<40) list=[['独身（未婚）',41],['既婚',48],['離婚歴あり（独身）',7],['再婚',3],['婚約中',1]];
    else if(age<50) list=[['独身（未婚）',25],['既婚',57],['離婚歴あり（独身）',10],['再婚',6],['婚約中',0.5,'r']];
    else if(age<65) list=[['独身（未婚）',15],['既婚',64],['離婚歴あり（独身）',11],['再婚',8],['死別（独身）',2,'r']];
    else list=[['独身（未婚）',6],['既婚',68],['離婚歴あり（独身）',9],['再婚',8],['死別（独身）',9,'r']];
    const it = innerWeighted(list);
    return [it[0], it[2]==='g' ? 'gap' : (it[2]==='r' ? 'rare' : null)];
  }

  function innerIsMarried(c){ return /既婚|再婚/.test(String(c.maritalText||'')); }

  function chooseInnerLiving(c){
    const age = Number(c.age)||25, cat = innerRoleCat(c.role);
    if(innerIsMarried(c)){ const it = innerWeighted(INNER_LIVING_MARRIED); return [it[0], it[2]==='d' ? 'gap' : (it[2]||null)]; }
    let l = INNER_LIVING_SINGLE.map(x=>x.slice());
    if(cat==='student'){ l = l.map(x=>/実家/.test(x[0])?[x[0],x[1]*1.4]:x).concat([['学生寮',3],['大学近くの学生向けアパートで一人暮らし',6]]); }
    if(age>=38) l = l.map(x=>/実家暮らし/.test(x[0])?[x[0],x[1]*0.55]:x);
    if(/寮/.test(String(c.role||'')) || /自衛官/.test(String(c.role||''))) l = l.concat([['駐屯地の営内班（隊舎住まい）',8]]);
    const it = innerWeighted(l);
    const badge = (age>=40 && /実家暮らし/.test(it[0])) ? 'rare' : (it[2]==='r' ? 'rare' : null);
    return [it[0], badge];
  }

  function chooseInnerFamily(c){
    const age = Number(c.age)||25, org = String(c.originText||''), liv = String(c.livingText||'');
    if(innerIsMarried(c)){
      const wife = '妻';
      const maxKid = Math.max(0, age-23);
      let kids = [];
      if(age>=27 && rand()<(age<32?0.45:age<45?0.75:0.85)){
        const n = weighted([[1, age<34?5:4],[2, age<32?2:5],[3,1.2]]);
        let ages=[]; for(let i=0;i<n;i++){ ages.push(rnd(0, Math.min(maxKid, age>=50? age-24 : 14),1)); }
        ages.sort((a,b)=>b-a);
        const lab=['長','次','三'];
        kids = ages.map((a,i)=>`${lab[i]||''}${rand()<.5?'男':'女'}（${age>=55&&a>=25?'独立':a+'歳'}）`);
      }
      if(age>=58 && kids.length===0 && rand()<.7) return [`${wife}と二人暮らし（子どもは独立）`, null];
      if(/二世帯/.test(liv)) return [`${wife}${kids.length?'・'+kids.join('・'):''}・両親と同居`, null];
      if(/単身赴任/.test(liv)) return [`${wife}${kids.length?'・'+kids.join('・'):''}（家族は地元、本人だけ赴任先）`, 'gap'];
      return [wife + (kids.length? '・'+kids.join('・') : 'と二人暮らし（子なし）'), null];
    }
    // 独身：出自から兄弟構成を復元
    let members;
    if(/一人っ子/.test(org)) members='父・母';
    else if(/次男/.test(org)) members='父・母・兄';
    else if(/三男|末っ子/.test(org)) members='父・母・兄・姉';
    else if(/長男（姉3人）/.test(org)) members='父・母・姉3人';
    else if(/5人兄弟/.test(org)) members='父・母・兄2人・弟・妹';
    else if(/母子家庭/.test(org)) members='母' + (rand()<.5?'・妹':'');
    else if(/父子家庭/.test(org)) members='父' + (rand()<.5?'・弟':'');
    else if(/祖父母に育てられた/.test(org)) members='祖父・祖母';
    else if(/長男/.test(org)) members='父・母' + pick(['・妹','・弟','・弟・妹','']);
    else members='父・母' + pick(['・兄','・姉','・妹','・弟','','']);
    if(/一人暮らし|寮|社宅|シェア|住み込み|営内/.test(liv)) return [`（同居なし）実家に${members}`, null];
    if(/祖父母の家/.test(liv)) return ['祖父・祖母と同居（実家に'+members.replace(/祖父・祖母/,'父・母')+'）', null];
    return [members + 'と同居', null];
  }

  function chooseInnerBirthplace(c){
    const nat = String(c.nationality||'日本');
    if(nat!=='日本' && INNER_NATION_CITIES[nat]){
      return [nat+'・'+pick(INNER_NATION_CITIES[nat])+'出身', null];
    }
    const org = String(c.originText||'');
    let cand = INNER_JP_PREFS.map(x=>x.slice());
    const wantTag = /漁師町/.test(org)?'sea':/離島/.test(org)?'island':/山間/.test(org)?'mountain':/温泉旅館/.test(org)?'onsen':null;
    const rural = /農家|漁師町|山間|離島|温泉旅館/.test(org);
    const urban = /団地育ち|社宅育ち|商店街/.test(org);
    if(rural) cand = cand.filter(x=>!x[3].includes('metro'));
    if(wantTag) cand = cand.map(x=>x[3].includes(wantTag)?[x[0],x[1],x[2]*8,x[3]]:x);
    if(rural) cand = cand.map(x=>[x[0],x[1],x[2]*(x[3].includes('sea')||x[3].includes('mountain')||wantTag?1:1.5),x[3]]);
    if(urban) cand = cand.map(x=>x[3].includes('metro')?[x[0],x[1],x[2]*2.6,x[3]]:x);
    const row = weighted(cand.map(x=>[x, x[2]]));
    let city;
    if(wantTag==='island') { const f=row[1].filter(m=>/石垣|五島|奄美/.test(m)); city = pick(f.length?f:row[1]); }
    else if(wantTag==='onsen') { const f=row[1].filter(m=>/別府|草津|豊岡|霧島/.test(m)); city = pick(f.length?f:row[1]); }
    else if(rural) { const f=row[1].filter(m=>!/市$/.test(m)||!/札幌|仙台|さいたま|横浜|川崎|名古屋|大阪|神戸|京都|福岡/.test(m)); city = pick(f.length?f:row[1]); }
    else city = pick(row[1]);
    c._bpTags = row[3]; c._bpPref = row[0];
    let v = row[0]+'：'+city;
    if(/転勤族/.test(org)) v += '（出生地。育ちは転勤で各地）';
    if(/海外駐在帰り/.test(org)) v += '（幼少期の数年は海外）';
    const rare = row[2]<=0.7 ? 'rare' : null;
    return [v, rare];
  }

  function innerWareki(y){
    if(y>=2019) return '令和'+(y-2018===1?'元':y-2018)+'年';
    if(y>=1989) return '平成'+(y-1988===1?'元':y-1988)+'年';
    if(y>=1926) return '昭和'+(y-1925===1?'元':y-1925)+'年';
    if(y>=1912) return '大正'+(y-1911===1?'元':y-1911)+'年';
    return '明治'+(y-1867)+'年';
  }

  function innerZodiac(m,d){
    const z=[[1,20,'やぎ座'],[2,19,'みずがめ座'],[3,21,'うお座'],[4,20,'おひつじ座'],[5,21,'おうし座'],[6,22,'ふたご座'],[7,23,'かに座'],[8,23,'しし座'],[9,23,'おとめ座'],[10,24,'てんびん座'],[11,23,'さそり座'],[12,22,'いて座'],[12,32,'やぎ座']];
    for(const [mm,dd,name] of z){ if(m<mm || (m===mm && d<dd)) return name; }
    return 'やぎ座';
  }

  function chooseInnerBirthdate(c){
    const refY = Number(c.eraYear)||2026, age = Number(c.age)||25;
    const by = refY - age;
    const m = rnd(1,12,1);
    const dim = [31, (by%4===0&&(by%100!==0||by%400===0))?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
    const d = rnd(1,dim,1);
    const eto = ['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'][by%12];
    const isJP = !c.nationality || c.nationality==='日本';
    const v = isJP ? `${by}年${m}月${d}日（${innerWareki(by)}・${innerZodiac(m,d)}・${eto}年）` : `${by}年${m}月${d}日（${innerZodiac(m,d)}）`;
    return [v, null];
  }

  function chooseInnerNickname(c){
    const {fam, giv} = innerParseKanaName(c);
    const age = Number(c.age)||25;
    const cands = [['特になし（下の名前か苗字で呼ばれる）',6]];
    if(giv){ cands.push([`「${giv}」（呼び捨て）`,5]); if(age<=32) cands.push([`「${giv}くん」`,3]); if(giv.length<=3) cands.push([`「${giv}っち」`,1.5]); if(giv.length>=2) cands.push([`「${giv.slice(0,2)}ちゃん」`,1.5]); }
    if(fam && fam.length>=2){ cands.push([`「${fam.slice(0,2)}」（苗字の頭）`,3]); cands.push([`「${fam.slice(0,2)}ちゃん」`,2]); }
    if(fam && fam.length>=3) cands.push([`「${fam.slice(0,2)}さん」（後輩から）`,2]);
    if(c.glasses && c.glasses!=='なし') cands.push([`「メガネ」（そのまますぎる）`,1.2,'r']);
    if(/がっちり|筋肉/.test(String(c.bodyType||''))) cands.push([`「ゴリさん」（部活時代の名残）`,1,'r']);
    if(innerRoleCat(c.role)==='student') cands.push([`「先輩」（後輩からはこれで固定）`,1.5]);
    cands.push([`「ハカセ」（何でも知ってるから）`,0.5,'r'],[`「社長」（なぜかそう呼ばれる）`,0.4,'r'],[`「マスター」（行きつけの店で）`,0.5,'r']);
    const clean = cands.filter(x=>x[1]>0);
    const it = innerWeighted(clean);
    return [it[0], it[2]==='r' ? 'rare' : null];
  }

  function innerDialectOf(c){
    const tags = String(c._bpTags||'');
    for(const key of ['kansai','hakata','hiroshima','nagoya','tohoku','okinawa','tosa','kyushu','north']){
      if(tags.includes(key)) return INNER_DIALECTS[key];
    }
    return null;
  }

  function chooseInnerSpeech(c){
    const pr = String(c.pronoun||'');
    const reg = /私|わたくし/.test(pr) ? 'polite' : /俺|オレ|おれ/.test(pr) ? (rand()<.35?'mid':'rough') : /自分/.test(pr) ? (rand()<.6?'polite':'mid') : 'mid';
    const base = innerWeighted(INNER_SPEECH_REGISTER[reg]);
    const habit = innerWeighted(INNER_SPEECH_HABITS);
    const dia = innerDialectOf(c);
    const natJP = !c.nationality || c.nationality==='日本';
    let parts = [base[0], habit[0]];
    let badge = null;
    if(rand()<.45){ const vc = innerWeighted(INNER_SPEECH_VOICE); parts.splice(1, 0, vc[0]); }
    if(rand()<.25){ let h2; for(let i=0;i<5;i++){ h2 = innerWeighted(INNER_SPEECH_HABITS); if(h2[0]!==habit[0]) break; } if(h2 && h2[0]!==habit[0]) parts.push(h2[0]); }
    if(natJP && dia && rand()<.65){ parts.splice(1, 0, pick(dia[1])); }
    else if(!natJP && rand()<.6){ parts.splice(1, 0, pick(['日本語は流暢だが助詞がたまに揺れる','日本語と母語がふとした瞬間に混ざる','敬語を丁寧に使いすぎる外国語話者の癖'])); badge=null; }
    if(/方言/.test(String(c.complexText||'')) && natJP){
      const d2 = dia || INNER_DIALECTS.kansai;
      parts = [base[0], `気を抜くと${d2[0]}が出る（本人は気にしている）`, habit[0]];
    }
    return [parts.join('。'), badge];
  }

  function chooseInnerMemory(c){
    const age = Number(c.age)||25;
    let l = INNER_MEMORY_BASE.map(x=>x.slice());
    const sp = ((c.sportsHistory)||[]).filter(x=>x.strength>0);
    if(sp.length) l.push([`${sp[0].name}の最後の大会（負けた悔しさまで含めて）`,6]);
    if(innerIsMarried(c)) l.push(['結婚式で友人代表が号泣したこと',4],['プロポーズの夜（緊張で声が裏返った）',3.5]);
    if(/長男|長女|次男|次女|三男|三女/.test(String(c.familyText||''))) l.push(['子どもが初めて歩いた日',5]);
    if(/死別/.test(String(c.maritalText||''))) l.push(['妻と最後に行った旅行',5,'r']);
    if(/いじめられた|不登校/.test(String(c.pastUpbringing||''))) l.push(['はじめて味方になってくれた友人の一言',4,'r']);
    // ④ 人物像・背景・時代からの合成思い出
    const yM = Number(c.eraYear)||2026, ageM = Number(c.age)||25;
    if(!/東京/.test(String(c.birthplaceText||'')) && /東京|首都圏/.test(String(c.residenceText||'')) && ageM>=20) l.push(['上京の日、駅の人の多さに立ち尽くしたこと',4]);
    if(ageM>=23 && innerRoleCat(c.role)!=='student'){
      l.push([yM<1995?'初任給で親にウイスキーを買って渡した日':'初任給で親を食事に連れて行った日',3.5]);
      l.push(['新人時代、初めて一人で任された仕事で盛大に失敗した日',3]);
    }
    if(/車夫/.test(String(c.role||''))) l.push(['初めてお客を乗せて走り切った日の足の震え',4]);
    if(yM-ageM+17>=1978 && yM-ageM+17<=1999) l.push(['夜通し並んで買ったCDを擦り切れるほど聴いた冬',2.5]);
    if(yM-ageM+15>=2000 && yM-ageM+15<=2012) l.push(['ガラケーの充電が切れるまでメールし続けた夜',2.5]);
    if(yM-ageM+15>=2013) l.push(['放課後にみんなで撮った動画が今も残っていること',2.5]);
    if(/荒れていた/.test(String(c.pastUpbringing||''))) l.push(['恩師に胸ぐらを掴まれて泣いた日',3,'r']);
    if(age<24) l = l.filter(x=>!/初任給|売上目標/.test(x[0]));
    if(age>=60) l.push(['初めて自分の給料で買ったテレビ',4],['万博に連れて行ってもらった日',3]);
    const it = innerWeighted(l);
    return [it[0], it[2]==='r' ? 'rare' : null];
  }

  function chooseInnerLover(c){
    const mar = String(c.maritalText||''), lt = String(c.loveTarget||'');
    if(/既婚|再婚/.test(mar)){
      if(rand()<0.006) return ['既婚（だが最近、よくない予感のする連絡先が増えた）', 'gap'];
      return ['配偶者（妻）', null];
    }
    if(/婚約中/.test(mar)) return ['婚約者あり（式場を検討中）', null];
    if(/死別/.test(mar)) return ['なし（妻の仏壇に毎朝手を合わせる）', 'rare'];
    if(/興味がない/.test(lt)) return ['なし（そもそも求めていない）', null];
    if(/二次元/.test(lt)) return ['なし（心の恋人は画面の中）', null];
    if(/推し/.test(lt)) return ['なし（推し活が恋愛の代わり）', null];
    const age = Number(c.age)||25;
    const pYes = age<23?0.3:age<30?0.38:age<40?0.33:0.25;
    if(/離婚歴/.test(mar) && rand()<0.5) return [pick(['なし（しばらく懲りている）','なし（もう籍は入れないと決めている）','恋人あり（再婚は考え中）']), null];
    if(rand()<pYes){ const it = innerWeighted(INNER_LOVER_YES); return [it[0], null]; }
    const it = innerWeighted(INNER_LOVER_NONE);
    return [it[0], null];
  }

  function chooseInnerResidence(c){
    const liv = String(c.livingText||''), nat = String(c.nationality||'日本');
    const bp = String(c.birthplaceText||'').split('：')[0].replace(/・.*$/,'').replace(/（.*$/,'');
    const inc = (String(c.incomeText||'').match(/約(\d+)万円/)||[])[1];
    const rich = inc && Number(inc)>=800;
    if(/実家/.test(liv) && !/建て替え/.test(liv)) return [`実家（${bp||'出身地'}）`, null];
    if(/学生寮/.test(liv)) return ['大学の学生寮（相部屋）', null];
    if(/営内/.test(liv)) return ['駐屯地の隊舎（外出は許可制）', null];
    if(/寮|社宅|住み込み/.test(liv)) return [pick(['職場まで徒歩圏の寮・社宅','会社敷地内（通勤0分）','職場の裏（通勤30秒）']), null];
    if(/単身赴任/.test(liv)) return [pick(['赴任先のワンルーム（家具は最小限）','赴任先の1K（週末に帰省）']), null];
    if(nat!=='日本' && rand()<.5) return [pick(['母国の実家近くのアパート','母国の都市部のフラット']), null];
    if(innerIsMarried(c)){
      if(/二世帯/.test(liv)) return ['二世帯住宅（親と同居・持ち家）', null];
      if(/妻の実家の近く/.test(liv)) return ['妻の地元の住宅街（賃貸戸建て）', null];
      if(/持ち家/.test(liv)) return [pick([`郊外の分譲${rand()<.5?'マンション':'戸建て'}（ローン返済中）`, '駅徒歩15分の3LDK（ローン返済中）', `${bp?bp+'にUターンして持ち家':'郊外の建売住宅'}`]), null];
      return [pick(['郊外の2LDK（賃貸）','駅近の賃貸マンション2LDK','社宅型の賃貸（会社補助あり）']), null];
    }
    const metro = rand()<.6;
    if(metro) return [pick(['都市部・駅徒歩12分の1K','都市部・築古だが広めの1DK','職場まで自転車15分のアパート','家賃を抑えた各駅停車の駅近く',`${rich?'都心の1LDK（少し背伸び）':'都市部のワンルーム'}`]), rich?'rare':null];
    return [pick([`地元（${bp||'出身地'}）の市内アパート（地元勤務）`, '地方都市の1LDK（家賃に余裕）', '海の見える町のアパート']), null];
  }

  function chooseInnerFriend(c){
    if(c.friendOf && c.friendOf.name){
      return [`${nameKana(c.friendOf.name)}（${c.friendOf.relation||'友人'}・実体化済み）`, null];
    }
    const meet = innerWeighted(INNER_FRIEND_MEET);
    const fq = innerWeighted(INNER_FRIEND_FREQ);
    const age = Number(c.age)||25;
    const delta = /幼なじみ|腐れ縁|同級生|部活仲間|サークル/.test(meet[0]) ? rnd(-1,1,1) : /同期/.test(meet[0]) ? rnd(-2,2,1) : rnd(-4,5,1);
    const fAge = Math.max(18, Math.min(80, age + delta));
    const full = (typeof nameByNationality==='function') ? nameByNationality(c.nationality||'日本', c.eraYear||'2026', fAge) : '友人';
    const kanji = String(full).replace(/（.*$/,'').trim();
    if(c) c._friendSeed = {name: full, meet: meet[0], freq: fq[0], age: fAge};
    return [`${meet[0]}・${kanji}（${fq[0]}）`, null];
  }

  const INNER_DEPS = {
    origin:['birthplace','family'],
    marital:['living','family','residence','lover','memory'],
    living:['family','residence'],
    birthplace:['speech','residence'],
    pronoun:['speech'],
    weakness:['health'],
    past:['memory'],
    love:['lover'],
    income:['residence'],
    hobby:['myboom'],
    complex:['speech']
  };

  function innerExpandKeys(keys){
    const out = new Set(keys);
    let grew = true;
    while(grew){
      grew = false;
      for(const k of Array.from(out)){
        for(const d of (INNER_DEPS[k]||[])){ if(!out.has(d)){ out.add(d); grew = true; } }
      }
    }
    return out;
  }

  const INNER_CATS = [['basic','🪪 基本データ','🪪 Basic Data','icat-basic'],['life','🏠 暮らし・家族','🏠 Life & Family','icat-life'],['daily','☕ 日常・嗜好','☕ Daily & Tastes','icat-daily'],['mind','💭 内面','💭 Inner Self','icat-mind'],['past','🕰 過去・人間関係','🕰 Past & People','icat-past'],['adult','🌙 オトナの事情','🌙 Grown-up','icat-adult'],['fashion','👔 ファッション','👔 Fashion','icat-fashion']];

  let innerCatShow = {basic:false, life:false, daily:false, mind:false, past:false, adult:false, fashion:false};

  function innerAnyShown(){ return Object.values(innerCatShow).some(Boolean); }

  function innerMagazineBlock(c, english=false){
    if(!c.bloodType) generateInnerProfile(c);
    if(!innerAnyShown()) return '';
    const S = innerCatShow;
    const bp = String(c.birthplaceText||'').replace('：','');
    if(english){
      const parts = [];
      if(S.basic || S.life){
        const profBits = [];
        if(S.basic){ profBits.push(`birth date ${c.birthdateText||''}`, `blood type ${c.bloodType||''}`, `hometown ${bp}`); }
        if(S.life){ profBits.push(`family ${c.familyText||''} (${c.maritalText||''})`, `living: ${c.livingText||''} / ${c.residenceText||''}`, `education ${c.educationText||''}`, `savings note ${c.assetText||''}`); }
        parts.push(` Extend the profile box with: ${profBits.join(', ')}.`);
      }
      if(S.daily || S.mind){
        const pd = [];
        if(S.daily){ pd.push(`hobby ${c.hobbyText||''}`, `current obsession ${c.myBoomText||''}`, `favorite food ${c.foodLikeText||''}`, `disliked food ${c.foodHateText||''}`, `health ${c.healthText||''}`); }
        if(S.mind){ pd.push(`motto-level dream "${c.innerDream||''}"`, `special talent ${c.innerTalent||''}`); }
        parts.push(` Add a "personal data" sidebar: ${pd.join('; ')}.`);
      }
      if(S.basic || S.past || S.life){
        const iv = [];
        if(S.basic){ iv.push(`first-person pronoun ${c.pronoun||''}`, `speech style ${c.speechText||''}`, `nickname ${c.nicknameText||''}`); }
        if(S.past){ iv.push(`treasured memory ${c.memoryText||''}`, `romantic interest ${c.loveTarget||''}`, `relationship history ${c.loveCountText||''}`); }
        if(S.life){ iv.push(`partner status ${c.loverText||''}`); }
        parts.push(` In the interview, answer in HIS voice using: ${iv.join(', ')}.`);
      }
      if(S.past) parts.push(` Add a tiny "friend's comment" box quoting his close friend (${c.friendText||''}) in one warm line.`);
      if(S.mind || S.past || S.adult){
        const col = [];
        if(S.mind){ col.push(`guiding principle (${c.principleText||''})`, `pet peeve (${c.unforgivableText||''})`, `weakness (${c.weaknessMind||''} / ${c.weaknessBody||''})`, `complex (${c.complexText||''})`); }
        if(S.past){ col.push(`upbringing (${c.pastUpbringing||''})`); }
        const sub = [];
        if(c.summaryText) sub.unshift(`[Profile] ${c.summaryText}`);
        if(S.mind) sub.push(`his hidden desire (${c.innerDesire||''})`);
        if(S.adult) sub.push(`adult-venue history (${c.fuzokuText||'none'}), first experience (${c.firstExpText||''}), weekly pace with partner (${c.weekFreqText||''}), solo pace (${c.selfFreqText||''}), drinking (${c.drinkText||''}), smoking (${c.smokeText||''}) and gambling history (${c.gambleText||'none'})`);
        if(S.past && c.pastTrauma && c.pastTrauma!=='トラウマ：なし') sub.push(`past (${c.pastTrauma})`);
        parts.push(` Add a small self-deprecating column touching lightly on ${col.join(', ')}${sub.length ? ` and — only as subtle subtext, never explicit — ${sub.join(', ')}` : ''}.`);
      }
      parts.push(' Keep everything tasteful, humane and non-sexual; soften anything raw into magazine-safe wording.');
      return parts.join('');
    }
    const parts = [];
    if(S.basic || S.life){
      const profBits = [];
      if(S.basic){ profBits.push(`生年月日${c.birthdateText||''}`, `血液型${c.bloodType||''}`, `出身地${bp}`); }
      if(S.life){ profBits.push(`家族構成「${c.familyText||''}」（${c.maritalText||''}）`, `現在の暮らし「${c.livingText||''}・${c.residenceText||''}」`, `学歴「${c.educationText||''}」`, `ふところ事情「${c.assetText||''}」`); }
      parts.push(`プロフィール欄は次で拡張する：${profBits.join('／')}。`);
    }
    if(S.daily || S.mind){
      const pd = [];
      if(S.daily){ pd.push(`趣味「${c.hobbyText||''}」`, `マイブーム「${c.myBoomText||''}」`, `好物「${c.foodLikeText||''}」`, `苦手「${c.foodHateText||''}」`, `健康状態「${c.healthText||''}」`); }
      if(S.mind){ pd.push(`将来の夢「${c.innerDream||''}」`, `秀でた特技「${c.innerTalent||''}」`, `コーデ基準「${c.fashionSenseText||''}」`); }
      parts.push(`パーソナルデータ欄も設ける：${pd.join('、')}。`);
    }
    if(S.basic || S.past || S.life){
      const iv = [];
      if(S.basic){ iv.push(`一人称は「${c.pronoun||''}」、口調は「${c.speechText||''}」、あだ名は${c.nicknameText||''}`); }
      if(S.past){ iv.push(`話題には思い出「${c.memoryText||''}」、恋愛観（恋愛対象：${c.loveTarget||''}／恋愛遍歴：${c.loveCountText||''}${S.life ? `／現在：${c.loverText||''}` : ''}）を織り込む`); }
      else if(S.life){ iv.push(`話題には現在の恋愛事情（${c.loverText||''}）を軽く織り込む`); }
      parts.push(`インタビューの回答は本人の声で書く：${iv.join('。')}。`);
    }
    if(S.past) parts.push(`小さな「友人からのひとこと」欄を作り、仲の良い友人（${(c.friendText||'').replace(/〔.*?〕/,'')}）からの温かい一言を載せる。`);
    if(S.mind || S.past || S.adult){
      const col = [];
      if(S.mind){ col.push(`行動原理「${c.principleText||''}」と許せないこと「${c.unforgivableText||''}」`, `弱点（${c.weaknessMind||''}／${c.weaknessBody||''}）やコンプレックス（${c.complexText||''}）`); }
      if(S.past){ col.push(`生い立ち（${c.pastUpbringing||''}）`); }
      const sub = [];
      if(S.mind) sub.push(`本音の欲望（${c.innerDesire||''}）`);
      if(c.summaryText) sub.unshift(`【人物】${c.summaryText}`);
      if(S.adult) sub.push(`夜の顔（飲酒：${c.drinkText||''}／喫煙：${c.smokeText||''}／ギャンブル歴：${c.gambleText||'なし'}／風俗経験：${c.fuzokuText||'なし'}／初めての体験：${c.firstExpText||''}／経験人数：${c.expCountText||''}／週頻度：相手あり ${c.weekFreqText||''}・セルフ ${c.selfFreqText||''}）`);
      if(S.past && c.pastTrauma && c.pastTrauma!=='トラウマ：なし') sub.push(`過去（${c.pastTrauma}）`);
      parts.push(`自虐まじりの小コラムでは${col.join('、')}に軽く触れ${sub.length ? `、${sub.join('や')}は誌面に直接書かず行間の匂わせ程度にとどめる` : 'る'}。`);
    }
    parts.push('生々しい項目は雑誌的に品よく言い換え、人柄が愛おしく伝わる誌面にする。');
    return parts.join('');
  }

  const INNER_PRINCIPLES = [
    ['迷ったら楽しい方を選ぶ',5],['家族がいちばん',5],['借りは必ず返す',5],['筋は通す',4],['約束は守る（守れない約束はしない）',5],['金より信用',4],['寝れば大体なんとかなる',4],['まず飯を食ってから考える',4],['逃げるが勝ちも立派な戦略',3],['見て見ぬふりはしない',3.5],['先に謝ったほうが強い',3],['体が資本',4.5],['頼まれたら基本断らない',4],['自分の機嫌は自分で取る',4],['石橋を叩いて渡る',3.5],['勢いで生きる',3.5],['負けたままでは終わらない',3.5],['人の悪口は言わない',4],['とりあえずやってみる',4.5],['何事も三年は続ける',3],['嫌なことほど朝イチで片付ける',3.5],['疑って外すより信じて騙される方を選ぶ',2.5],['誰も見ていなくても手は抜かない',3.5],['金は天下の回りもの',3],['敵を作らないのが最強の護身',3],['困っている人がいたら声をかける',3.5],['他人と比べない（比べても勝てないから）',3],['迷惑をかけたら倍にして返す',2.5],['沈黙は金、でも挨拶は大声',2.5],['行けたら行くは行かない',3],
    ['面倒事からは全力で逃げる',2,'d'],['勝てる勝負しかしない',2,'d'],['バレない範囲のズルは人間味',1.2,'d'],['義理より実利',1.5,'d'],['謝るより先に言い訳を考えてしまう',1.5,'d']
  ];

  const INNER_UNFORGIVABLES = [
    ['食べ物を粗末にすること',6],['弱い者いじめ',6],['列への横入り',5],['傘泥棒',4],['連絡なしのドタキャン',5],['店員への横柄な態度',5.5],['歩きタバコ',4.5],['裏切り',4],['陰口',4],['子どもと動物を泣かせること',4.5],['人の努力を嘲笑うこと',4.5],['冷蔵庫のプリンを無断で食べること',3.5],['ゲームの順番の割り込み',3],['金の貸し借りを曖昧にすること',4],['挨拶を無視されること',4],['サービス残業の強要',3.5],['マウンティング',3.5],['デマを流すこと',3.5],['土足で人の心に踏み込むこと',3],['約束の時間に平気で遅れること',4],['乾杯前に飲み始めること',2],['映画のネタバレ',3.5],['電車で降りる人を待たずに乗り込むこと',4],['トイレットペーパーの芯を替えないこと',3],['人の話を最後まで聞かないこと',3.5],['「言わなくても分かるだろ」という態度',3],['努力を「才能」の一言で片付けられること',2.5],['食事中のスマホ（相手がいる時）',3],['エレベーターの「閉」連打で挟まれかけたこと',2],['自分の非を部下のせいにする上司',3.5]
  ];

  function chooseInnerFuzoku(c){
    const age = Number(c.age)||25;
    if(age<20) return ['なし', null];
    if(/童貞/.test(String(c.complexText||''))) return [pick(['なし（機会がない）','なし（勇気が出ない）','誘われて断った']), null];
    const lt = String(c.loveTarget||'');
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    let list;
    if(/男性$|^男性/.test(lt.split('（')[0]) ) list = [['なし（対象外）',8],['なし',3],['ノーコメント',1,'d']];
    else if(/興味がない/.test(lt)) list = [['なし（興味がない）',8],['誘われて断った',2],['付き合いで1回だけ',1,'d']];
    else list = [['なし（機会がない）',22],['なし（興味がない）',18],['なし（お金がもったいない）',8],['誘われて断った',8],['付き合いで1回だけ',12,'d'],['若い頃に数回',8,'d'],['たまに行く',4,'d'],['行きつけがある',1.5,'d'],['卒業した（昔は通った）',4,'d'],['ノーコメント（察してほしい）',3,'d']];
    if(age<24) list = list.filter(x=>!/若い頃|卒業した/.test(x[0]));
    const it = innerWeighted(list);
    let badge = null;
    if(it[2]==='d'){ badge = married && /たまに行く|行きつけ/.test(it[0]) ? 'gap' : (rand()<.5 ? 'rare' : null); }
    return [it[0], badge];
  }

  function chooseInnerGamble(c){
    const age = Number(c.age)||25, y = Number(c.eraYear)||2026;
    if(age<20){
      const it = innerWeighted([['なし（興味なし）',8],['なし（年齢的にまだ）',4],['友人の家の麻雀くらい',1.5]]);
      return [it[0], null];
    }
    let list = [['なし（興味なし）',20],['宝くじを年末だけ',10],['競馬をレジャー程度',6],['パチンコ経験あり（今はしない）',6],['学生時代に雀荘へ通った',3],['パチスロに熱かった時期がある',3,'d'],['現役でパチンコ通い',2,'d'],['競艇・競輪もたしなむ',1.5,'d'],['株・FXで手痛い授業料を払った',2,'d'],['借金を作って足を洗った',0.8,'d'],['麻雀は打てるが賭けない主義',3]];
    if(y>=2013) list.push(['ソシャゲのガチャが実質ギャンブルだと気づいている',4,'d']);
    const wm = String(c.weaknessMind||''), ds = String(c.innerDesire||'');
    if(/ギャンブル/.test(wm) || /ギャンブルで一発/.test(ds)){
      list = list.map(x=>/現役|熱かった|競艇|借金/.test(x[0])?[x[0],x[1]*5,x[2]]:(/なし/.test(x[0])?[x[0],x[1]*0.15]:x));
    }
    const it = innerWeighted(list);
    return [it[0], it[2]==='d' ? (/借金/.test(it[0])?'rare':(rand()<.5?'rare':null)) : null];
  }

  function chooseInnerFirstExp(c){
    const age = Number(c.age)||25;
    if(/童貞/.test(String(c.complexText||''))) return ['まだない（タイミングを逃し続けたと本人談）', 'rare'];
    if(age<20) return [/興味がない/.test(String(c.loveTarget||'')) ? 'まだない（興味もない）' : pick(['まだない','秘密（大人になってから話すやつ）']), null];
    let list = [['二十歳前後',7],['大学時代',6],['社会人1年目',4],['20代半ば',4],['20代後半',2.5],['成人してすぐ',3],['ノーコメント（言わぬが花）',3,'d'],['忘れたことにしている',1.5,'d']];
    if(age>=27) list.push(['30代（遅咲き）',age>=32?2:0.8]);
    if(/女性経験の少なさ/.test(String(c.complexText||''))) list = list.map(x=>/20代後半|30代|成人してすぐ/.test(x[0])?[x[0],x[1]*3,x[2]]:(/二十歳前後|大学時代/.test(x[0])?[x[0],x[1]*0.3,x[2]]:x));
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    if(/興味がない/.test(String(c.loveTarget||''))) list = married ? [['ノーコメント（家庭の事情）',5],['二十歳前後',2]] : [['まだない（興味もない）',6],['ノーコメント',2]];
    else if(!married){ const still = age>=25 ? [['まだない',age>=30?1.2:2,'r']] : [['まだない',4]]; list = list.concat(still); }
    const it = innerWeighted(list);
    let badge = it[2]==='r' ? 'rare' : (it[2]==='d'&&rand()<.5 ? 'rare' : null);
    let v = it[0];
    if(!/まだない|ノーコメント|忘れた/.test(v)){
      const lt2 = String(c.loveTarget||'');
      let partners = ['当時の恋人','同い年の恋人','年上の人','お互い初めて同士'];
      if(/^女性|どちらも/.test(lt2)) partners = partners.concat(['当時の彼女','初カノ','バイト先で出会った年上の彼女']);
      if(/^男性/.test(lt2)) partners = ['当時の恋人','年上の人','学生時代からの恋人','お互い初めて同士'];
      if(/社会人|20代半ば|20代後半|30代/.test(v)){
        partners.push('職場で出会った人','合コンで知り合った人');
        if((Number(c.eraYear)||2026)>=2016) partners.push('マッチングアプリで出会った人');
      }
      if(married && /二十歳前後|大学時代|社会人1年目|成人してすぐ/.test(v) && rand()<0.35) partners = ['のちに妻になる人'];
      let places = ['相手の部屋','自分の部屋','旅行先の宿'];
      if(/大学時代/.test(v)) places = ['相手の下宿','自分のワンルーム','ゼミ旅行先の宿'];
      if(/二十歳前後|成人してすぐ/.test(v)) places.push('実家（家族の留守中）');
      if(/社会人|20代|30代/.test(v)) places.push('ホテル');
      let place = pick(places);
      if(rand()<0.05){ place = pick(['車の中','漫画喫茶の個室']); if(!badge) badge='rare'; }
      v = `${v}（相手は${pick(partners)}・場所は${place}）`;
    }
    return [v, badge];
  }

  function chooseInnerWeekFreq(c){
    const age = Number(c.age)||25;
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const hasLover = /^恋人あり|婚約者あり/.test(String(c.loverText||''));
    const noInterest = /興味がない/.test(String(c.loveTarget||''));
    let list;
    if(married) list = [['夫婦円満ペース（月数回）',5],['週1をキープ',3],['最近はご無沙汰気味',4,'d'],['レス気味だが仲は良い',2.5,'d'],['記念日限定',2],['聞くな（察してほしい）',2,'d'],['アプリを覗くだけ覗いている',0.5,'g'],['気の置けない友人がいる（察してほしい）',0.3,'g']];
    else if(hasLover) list = [['週1〜2（会える日次第）',5],['週末集中型',4],['遠距離につき月イチ',1.5],['まだそういう関係ではない',1.5],['ノーコメント',2,'d']];
    else if(noInterest) list = [['なし（そもそも求めていない）',8],['なし',3]];
    else list = [['なし（相手がいない）',7],['ゼロ更新中（記録継続）',3,'d'],['たまに（アプリで会う人と）',1.5,'d'],['気の置けない友人がいる（察してほしい）',1,'d'],['ご縁があれば（現在は素振りのみ）',2]];
    if(age>=55) list = list.map(x=>/週1〜2|週末集中/.test(x[0])?[x[0],x[1]*0.4,x[2]]:x).concat(married?[['もう数えていない（安らか）',3]]:[]);
    const it = innerWeighted(list);
    return [it[0], it[2]==='g' ? 'gap' : (it[2]==='d'&&rand()<.4 ? 'rare' : null)];
  }

  function chooseInnerSelfFreq(c){
    const age = Number(c.age)||25;
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const hasLover = /^恋人あり|婚約者あり/.test(String(c.loverText||''));
    const noInterest = /興味がない/.test(String(c.loveTarget||''));
    let list = [['週2〜3（本人談）',5,'d'],['週1',4],['ほぼ毎日（若さ）',age<=27?3:0.6,'d'],['月数回（省エネ）',3],['賢者モード長期継続中',2],['ノーカウント主義',2,'d']];
    if(married) list = [['週1（内緒）',4,'d'],['月数回（こっそり）',4],['ほぼ卒業した',3],['ノーカウント主義',2,'d'],['風呂掃除当番の日だけ…いや何でもない',1,'d']];
    else if(hasLover) list = [['会えない週の補完程度',5],['週1',3],['月数回',3],['恋人に誓って控えめ',2],['ノーコメント',1.5,'d']];
    if(noInterest) list = [['ほぼなし（性欲も控えめ）',5],['月数回（健康維持）',3],['ノーカウント主義',1.5,'d']];
    if(age>=55) list = list.map(x=>/ほぼ毎日|週2〜3/.test(x[0])?[x[0],x[1]*0.25,x[2]]:x).concat([['もう数えていない（安らか）',3]]);
    const it = innerWeighted(list);
    let v = it[0];
    let badge = it[2]==='d'&&rand()<.35 ? 'rare' : null;
    // タイミングと場所（住居・職業と整合）
    if(!/ほぼ卒業|ほぼなし|賢者モード|もう数えていない/.test(v)){
      const liv = String(c.livingText||''), res = String(c.residenceText||''), role = String(c.role||'');
      const y = Number(c.eraYear)||2026;
      const tanshin = /単身赴任/.test(liv);
      const dorm = /相部屋|営内|隊舎/.test(liv+res);
      const sumikomi = /住み込み/.test(liv);
      const jikka = /実家暮らし|祖父母の家/.test(liv);
      const cohab = married && !tanshin;
      const share = /ルームシェア/.test(liv);
      let timings = [['寝る前',5],['風呂上がり',3],['休日の昼下がり',2.5],['深夜',3]];
      let places;
      if(dorm) { places = [['風呂の個室（相部屋ゆえ）',4],['消灯後の布団の中（無音の攻防）',3],['トイレの個室',2.5]]; timings = [['消灯後',5],['皆が出払った隙',3],['外泊時にまとめて',2]]; }
      else if(sumikomi) { places = [['店の上の自室（音量に細心の注意）',5],['風呂場',3]]; }
      else if(jikka) { places = [['深夜の自室（音に気を使う）',5],['風呂場',3.5],['家族の外出中の自室',3]]; timings = [['深夜、家族が寝静まってから',5],['家に誰もいない隙に',3.5],['風呂のついでに',3]]; }
      else if(cohab) { places = [['風呂場',4],['書斎（家族に内緒）',2.5],['トイレ（安住の地）',3],['自室（妻の外出中）',3]]; timings = [['妻の外出中',4],['深夜、家族が寝静まってから',4],['早朝、誰よりも早く起きて',1.5]]; }
      else if(share) { places = [['自室（鍵を確認してから）',5],['風呂場',3]]; }
      else { places = [['自室（誰にも気兼ねなく）',5],['ベッドでだらだらと',3.5],['風呂場',2.5]]; }
      if(/看護師|警備員|消防士|自衛官|工場|夜勤/.test(role)) timings.push(['夜勤明けの朝',4]);
      if(/トラック|長距離/.test(role)) timings.push(['長距離明け',4]);
      if(/営業|商社|コンサルタント/.test(role) && !dorm) { places.push(['出張先のビジネスホテル',2]); timings.push(['出張の夜',2]); }
      if(y>=2020 && /IT|エンジニア|Web|デザイナー|企画/.test(role) && !dorm && !jikka){ timings.push(['テレワークの昼休み（背徳）',0.8,'d']); }
      const t = innerWeighted(timings), p = innerWeighted(places);
      if(t[2]==='d' && !badge) badge = 'rare';
      v = `${v}（タイミング：${t[0]}／場所：${p[0]}）`;
    }
    return [v, badge];
  }

  function chooseInnerLoveCount(c){
    const age = Number(c.age)||25;
    const lt = String(c.loveTarget||''), fe = String(c.firstExpText||'');
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    if(/童貞/.test(String(c.complexText||''))) return [pick(['0人','1人（手をつないで終わった清い交際）']), null];
    if(/興味がない/.test(lt) && !married) return ['0人（そもそも求めていない）', null];
    if(/二次元|推し/.test(lt)) return [married ? '1人（妻ひと筋。推しは推し）' : pick(['0人（三次元は対象外）','1人（昔いた。それで悟った）']), null];
    if(/まだない/.test(fe) && !married){
      const v = pick(['0人','1人（手をつないで終わった清い交際）']);
      return [v, age>=32 && v==='0人' ? 'rare' : null];
    }
    let list;
    if(age<20) list = [['0人',3],['1人',4],['2人',2.5],['3人（早熟）',1,'r']];
    else if(age<25) list = [['1人',4],['2人',4],['3人',3],['片手で足りる',2.5],['0人',2],['5〜6人',1,'d']];
    else if(age<35) list = [['1人',2.5],['2人',3],['3人',3.5],['片手で足りる',4],['5〜6人',2.5],['10人前後',1,'d'],['0人',0.8,'r']];
    else list = [['2人',2.5],['3人',3],['片手で足りる',4],['5〜6人',3],['10人前後',1.5,'d'],['二桁（途中で数えるのをやめた）',0.8,'d'],['1人',2],['0人',0.4,'r']];
    if(/女性経験の少なさ/.test(String(c.complexText||''))) list = list.filter(x=>!/片手|5〜6|10人|二桁/.test(x[0]));
    const playful = ['ホスト系','ギャル男系','やりらふぃー系','韓国風','ストリート系'].includes(String(c.vibe||''));
    if(playful) list = list.map(x=>/10人|二桁|5〜6/.test(x[0])?[x[0],x[1]*3,x[2]]:(/^0人|^1人/.test(x[0])?[x[0],x[1]*0.35,x[2]]:x));
    if(/^E/.test(String(c.mbti||''))) list = list.map(x=>/片手|5〜6|10人/.test(x[0])?[x[0],x[1]*1.4,x[2]]:x);
    if(/一途/.test(lt)) list = list.map(x=>/10人|二桁/.test(x[0])?[x[0],x[1]*0.25,x[2]]:(/^1人|^2人/.test(x[0])?[x[0],x[1]*1.8,x[2]]:x));
    if(/惚れっぽい/.test(lt)) list = list.map(x=>/片手|5〜6|10人/.test(x[0])?[x[0],x[1]*1.6,x[2]]:x);
    if(married) list = list.filter(x=>x[0]!=='0人');
    for(let i=0;i<6;i++){
      const it = innerWeighted(list);
      if(married && it[0]==='0人') continue;
      let badge = null;
      if(it[2]==='r') badge = 'rare';
      else if(playful && /^(0人|1人)$/.test(it[0])) badge = 'gap';
      else if(it[2]==='d' && rand()<.5) badge = 'rare';
      let v = it[0];
      if(married && v==='1人') v = '1人（妻ひと筋）';
      return [v, badge];
    }
    return [married?'1人（妻ひと筋）':'1人', null];
  }

  function chooseInnerAsset(c){
    const age = Number(c.age)||25, y = Number(c.eraYear)||2026;
    const cat = innerRoleCat(c.role);
    const gam = String(c.gambleText||''), ds = String(c.innerDesire||'');
    if(cat==='student' || age<=21){
      if(/借金を作って/.test(gam)) return ['バイト代が返済にほぼ消えている', 'rare'];
      if(y>=2017 && rand()<0.06) return [`バイト貯金${rnd(5,30,1)}万円＋暗号資産に少額（値動きで一喜一憂）`, null];
      return [`バイト貯金${rnd(3,45,1)}万円`, null];
    }
    if(/借金を作って/.test(gam)) return [pick(['借金を完済したばかり（貯金はこれから）','返済がもう少しだけ残っている']), 'rare'];
    const inc = Number((String(c.incomeText||'').match(/約(\d+)万円/)||[])[1]) || 350;
    const years = Math.max(1, age-22);
    const spender = /分不相応な買い物|ギャンブルで一発|散財/.test(ds) || /現役でパチンコ|パチスロに熱かった/.test(gam);
    const saver = /コツコツ|堅実|石橋/.test(String(c.principleText||'')) || /J$/.test(String(c.mbti||'')) && rand()<0.5;
    // 統計準拠の中央値近似：年間貯蓄率×勤続年数（右に長い裾）
    let rate = spender ? 0.02+rand()*0.05 : saver ? 0.10+rand()*0.14 : 0.04+rand()*0.10;
    let total = Math.round(inc * rate * years * (0.6+rand()*0.9));
    if(rand()<0.03 && age<=29){ total += rnd(500,1500,50); }
    if(spender && rand()<0.5) return [pick(['貯金はほぼゼロ（今が楽しければいい）','口座残高は常に一桁万円']), 'rare'];
    total = Math.max(1, Math.min(total, inc*years));
    // 資産クラス構成（時代ゲート）
    const parts = [];
    let rest = total;
    const use = (name, ratio) => { const v = Math.max(1, Math.round(total*ratio)); if(v>rest) return; parts.push(`${name}${v}万円`); rest -= v; };
    const wantsInvest = !spender && (saver || inc>=500 || rand()<0.35);
    if(y>=2014 && wantsInvest && age>=23 && rand()<0.55) use('NISA投信', 0.2+rand()*0.25);
    if(y>=1998 && wantsInvest && inc>=450 && rand()<0.3) use('個別株', 0.15+rand()*0.2);
    if(y>=2017 && age<=38 && rand()<(spender?0.25:0.12)) use('暗号資産', 0.05+rand()*0.15);
    if(y<2000 && saver && cat!=='student' && rand()<0.4) use('財形貯蓄', 0.3+rand()*0.2);
    let text;
    if(parts.length){ parts.unshift(`預金${rest}万円`); text = `約${total}万円（${parts.join('＋')}）`; }
    else text = `約${total}万円（ほぼ預金）`;
    // 投資マンション（高収入×30歳以上）
    if(inc>=700 && age>=30 && y>=1988 && rand()<0.12) return [`約${total}万円＋投資用ワンルーム1戸（ローン返済中）`, 'rare'];
    let badge = null;
    if(total >= 1000 && age<=32) badge = 'rare';
    if(saver) text += pick(['・コツコツ積立派','・先取り貯金派','']);
    if(spender) text += '・あればあるだけ使う';
    return [text, badge];
  }

  const LOVETYPE_F = ['年上のお姉さん系','黒髪の清楚系','笑顔がかわいい人','よく食べる元気な人','小柄で守りたくなる人','背が高くてかっこいい系の女性','ショートカットの似合う人','おっとりした癒し系','仕事のできるキャリア系','同い年の友達感覚でいられる人','聞き上手で落ち着く人','ふとした瞬間に色っぽい人'];

  const LOVETYPE_M = ['年上の頼れる兄貴肌','物静かな知的系','よく笑う年下','がっしりした体格の人','手のきれいな人','声の低い落ち着いた人','一緒にいて楽な同年代','面倒見のいい先輩タイプ','無邪気に甘えてくる人','筋の通った職人気質の人'];

  const LOVETYPE_B = ['性別より雰囲気で好きになる。柔らかい話し方の人','一緒に黙っていられる人','笑いのツボが同じ人','食の好みが合う人','距離感を大事にしてくれる人','背中を預けられる人'];

  const LOVETYPE_TRAIT = ['しっかり者で頼れる','ちょっと天然で放っておけない','聞き上手で居心地がいい','自分を叱ってくれる','努力家で刺激をくれる','マイペースで穏やか','よく笑ってくれる','食べ方がきれい','時間にルーズじゃない','自分の趣味を面白がってくれる'];

  function chooseInnerLoveType(c){
    const lt = String(c.loveTarget||'');
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const vibe = String(c.vibe||'');
    if(/興味がない/.test(lt)) return [pick(['タイプという概念が薄い（強いて言えば、静かに隣にいられる人）','特にない。恋愛の優先度が低い','考えたことがない、と本人は言う']), null];
    if(/推し|二次元/.test(lt)) return [pick(['結局、推しに似た雰囲気の人ばかり目で追ってしまう','三次元に興味が向かない（推しが最強）','推しの声に似た声の人に弱い']), null];
    let look;
    if(/男性/.test(lt) && !/女性/.test(lt)) look = pick(LOVETYPE_M);
    else if(/どちら/.test(lt)) look = pick(LOVETYPE_B);
    else look = pick(LOVETYPE_F);
    const trait = pick(LOVETYPE_TRAIT);
    let badge = null;
    let text = `${look}。${trait}タイプに弱い`;
    if(['ホスト系','ギャル男系','やりらふぃー系'].includes(vibe) && /清楚|地味|物静か|おっとり/.test(look)) badge='gap';
    if(married && rand()<0.4) text += '（妻がまさにこのタイプ）';
    return [text, badge];
  }

  function chooseInnerExpCount(c){
    const age = Number(c.age)||25;
    const lt = String(c.loveTarget||''), fe = String(c.firstExpText||''), fz = String(c.fuzokuText||'');
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const vibe = String(c.vibe||'');
    if(/童貞/.test(String(c.complexText||''))) return ['0人（まだ経験がない）', null];
    if(/まだない/.test(fe)) return [/興味がない/.test(lt) ? '0人（求めてもいない）' : '0人（まだ経験がない）', null];
    if(/興味がない/.test(lt) && !married) return ['0人（求めていない）', null];
    const lcText = String(c.loveCountText||'');
    let loveN;
    const dm = lcText.match(/^(\d+)人/);
    if(dm) loveN = Number(dm[1]);
    else if(/片手で足りる/.test(lcText)) loveN = rnd(4,5);
    else if(/5〜6人/.test(lcText)) loveN = rnd(5,6);
    else if(/10人前後/.test(lcText)) loveN = rnd(8,12);
    else if(/二桁/.test(lcText)) loveN = rnd(10,25);
    else loveN = rnd(1,3);
    const faithful = /一途/.test(lt) || /石橋を叩いて/.test(String(c.principleText||''));
    const playful = ['ホスト系','ギャル男系','やりらふぃー系'].includes(vibe) || /惚れっぽい/.test(lt);
    let n, comment = '', badge = null;
    if(loveN>=3 && !married && rand()<0.03){
      n = rnd(0,1); comment = '交際は多いが最後までは慎重派'; badge='gap';
    } else if(married && (faithful || /妻ひと筋/.test(lcText) || rand()<0.35)){
      n = Math.max(1, loveN); comment = n===1 ? '妻だけ' : '独身時代を含めて。結婚してからは妻ひと筋';
    } else if(faithful){
      n = loveN; comment = '付き合った人としか経験がない';
    } else if(playful){
      n = Math.round(loveN * (1.5 + rand()*1.8)) + rnd(0,3); comment = 'ワンナイト含む・本人調べ';
    } else {
      n = loveN + (rand()<0.35 ? rnd(1,2) : 0);
      comment = n===loveN ? '全員ちゃんと交際した相手' : '数え方には諸説ある';
    }
    if(/付き合いで1回だけ/.test(fz)){ n += 1; comment = 'うち1人はお店の人'; }
    else if(/若い頃に数回|卒業した/.test(fz)){ n += rnd(2,4); comment = 'プロを含めた概算'; }
    else if(/たまに行く|行きつけ/.test(fz)){ n += rnd(6,25); comment = 'プロ含む。もはや概算'; badge = badge||'rare'; }
    const cap = Math.max(1, (age-17)) * 7;
    n = Math.min(n, cap);
    if((vibe==='ホスト系' || /ホスト/.test(String(c.role||''))) && age>=23){
      if(rand()<0.10){ n = Math.min(rnd(30,90), cap); comment = '接客業時代の武勇伝込み'; badge='rare'; }
      if(rand()<0.03){ n = rnd(100,300); comment = 'ホスト界隈の伝説（本人談・盛りあり）'; badge='rare'; }
    } else if(playful && age>=25 && rand()<0.04){ n = Math.min(rnd(20,45), cap); comment = '20代を全力で遊んだ結果'; badge='rare'; }
    if(loveN===0 && n>0){ comment = '交際経験はなし。その場限りで済ませてきた'; badge='gap'; }
    if(married && n>=15 && !badge) badge='gap';
    if(!comment){
      comment = n===0?'まだ経験がない': n===1?'最初で最後になるかもしれない一人': n<=4?'手堅い人数': n<=9?'片手では収まらなくなった': n<=29?'途中から数え方が雑': n<=99?'もう思い出せない顔もある':'三桁。本人は真顔';
    }
    return [`${n}人（${comment}）`, badge];
  }

  function chooseInnerDrink(c){
    const age = Number(c.age)||25;
    if(age<20) return ['飲まない（20歳になったら考える）', null];
    let list = [['飲まない（下戸）',4],['飲まない（あえて）',2],['付き合い程度',7],['週末だけ',5],['晩酌が日課（ビール1本）',5],['晩酌が日課（ハイボール派）',3],['ザル（記憶は残るタイプ）',2,'d'],['ザル（記憶が飛ぶタイプ）',1,'d'],['休肝日を週2で死守',3],['禁酒中（今週から）',1.5,'d'],['家では飲まない主義',2.5],['クラフトビール沼',1.5],['日本酒をゆっくり派',2]];
    const h = String(c.healthText||'');
    if(/γ-GTP/.test(h)) list = list.map(x=>/晩酌|ザル/.test(x[0])?[x[0],x[1]*4,x[2]]:(/飲まない/.test(x[0])?[x[0],x[1]*0.2]:x));
    if(/健康優良|献血/.test(h)) list = list.map(x=>/ザル/.test(x[0])?[x[0],x[1]*0.4,x[2]]:x);
    if(/(お酒|酒)に弱い/.test(String(c.weaknessBody||''))) list = [['飲まない（下戸）',8],['付き合いで一杯だけ（すぐ赤くなる)',6],['ノンアル愛好家',3]];
    const it = innerWeighted(list);
    return [it[0], it[2]==='d'&&rand()<.5 ? 'rare' : null];
  }

  function chooseInnerSmoke(c){
    const age = Number(c.age)||25, y = Number(c.eraYear)||2026;
    if(age<20) return ['吸わない', null];
    const h = String(c.healthText||'');
    if(/禁煙に成功/.test(h)) return ['元喫煙者（禁煙成功・今は匂いに敏感）', null];
    if(/禁煙に挑戦中/.test(h)) return ['減煙中（1日数本まで来た）', 'rare'];
    let list = [['吸わない',17],['吸わない（匂いも苦手）',4],['元喫煙者（禁煙5年目）',3],['加熱式タバコ',3],['紙巻き1日数本',2,'d'],['紙巻き1日一箱',1,'d'],['たまにもらいタバコ',1.5,'d'],['飲んだ時だけ吸う',2,'d'],['葉巻をごくたまに（気取り）',0.4,'r']];
    if(y<1995){ list = list.map(x=>/紙巻き/.test(x[0])?[x[0],x[1]*8,x[2]]:(/^吸わない/.test(x[0])?[x[0],x[1]*0.35]:x)); }
    else if(y<2010){ list = list.map(x=>/紙巻き|もらい/.test(x[0])?[x[0],x[1]*2.5,x[2]]:x); }
    if(age>=50 && y>=2010) list = list.map(x=>/元喫煙者/.test(x[0])?[x[0],x[1]*2.5]:x);
    const it = innerWeighted(list);
    return [it[0], it[2]==='d'&&rand()<.4 ? 'rare' : (it[2]==='r'?'rare':null)];
  }

  const INNER_FASHION_SENSE = [
    ['清潔感がすべて（色は3色まで）',5],['無難第一（紺・白・グレーしか買わない）',4],['靴から決める派',3],['サイズ感命（試着は必ずする）',3],['全身同じ店で済ませる（効率）',3,'same'],['季節の初めにまとめ買い',3],['機能性最優先（ポケット数で選ぶ）',3],['迷ったら定番を10年着る',3,'ten'],['古着一筋（新品はほぼ買わない）',2,'furugi'],['雑誌やSNSの着こなしを研究',2.5],['店員に全身見立ててもらう',2],['色はモノトーン縛り',2.5],['柄物は靴下だけで遊ぶ',2],['アイロンがけが趣味の延長',1.5],['細身シルエット以外は着ない',2],['ゆるシルエット以外は着ない',2],
    ['妻が選んでいる（本人はノータッチ）',2.2,'wife'],['彼女が選んでいる（言いなり）',1.8,'gf'],['母親が買ってくる服をそのまま着る',1,'mom'],
    ['服に興味なし（量販店で3着まとめ買い）',2.2,'mute'],['同じ服の色違いを5枚持っている',1.8,'mute'],['サイズ表記だけ見て試着せず買う',1.5,'mute'],['穴が開くまで買い替えない',1.3,'mute'],
    ['1点だけ明らかに背伸びしたブランド物を持つ',1,'stretch'],['実は服にだけ金をかける（食費を削って）',0.8,'d'],
    ['ジム服がそのまま私服化している',1.2,'gym'],['ワークマンで全部済むと気づいてしまった',1.2,'workman'],['スーツ以外の服をほぼ持っていない',0.6,'suitonly'],
    ['セール品しか買わない主義',1.5,'sale'],['ハイブランド1点主義（あとは無難）',0.8,'stretch'],['アイロンと毛玉取りが習慣',1.2,'iron'],
    ['憧れの先輩の着こなしを丸ごと真似ている',1,'senpai'],['推しと同じ服を探して買う',0.8,'oshi'],['彼女に選んでもらうのが毎回楽しみ',1,'gf2'],
    ['フリマアプリで売る前提で買う',1,'furima'],['体型が変わって服が合わない（買い替えは渋る）',0.8,'fitchange'],['黒しか着ない',1.2,'black'],
    ['流行は先取りしないと気が済まない',1,'forward'],['靴だけは絶対に妥協しない',1.2],['試着室のカーテンを開けるのが苦手（通販派）',1],['サイズ違いで2枚買う慎重派',0.8]
  ];

  function chooseInnerFashionSense(c){
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const hasLover = /^恋人あり|婚約者あり/.test(String(c.loverText||''));
    const jikka = /実家暮らし/.test(String(c.livingText||''));
    let l = INNER_FASHION_SENSE.map(x=>x.slice());
    l = l.filter(x=>!(x[2]==='wife' && !married)).filter(x=>!(x[2]==='gf' && (!hasLover || married))).filter(x=>!(x[2]==='mom' && !jikka));
    const allSame = c.holidayTopBrand && c.holidayTopBrand===c.holidayBottomBrand && c.holidayBottomBrand===c.holidayShoesBrand;
    if(allSame) l = l.map(x=>x[2]==='same'?[x[0],x[1]*4,x[2]]:x);
    if(String(c.vibe||'')==='古着系' || String(c.holidayOutfitType||'')==='古着系') l = l.map(x=>x[2]==='furugi'?[x[0],x[1]*6,x[2]]:x);
    if(/石橋を叩いて/.test(String(c.principleText||''))) l = l.map(x=>x[2]==='ten'?[x[0],x[1]*4,x[2]]:x);
    if(/分不相応な買い物/.test(String(c.innerDesire||''))) l = l.map(x=>x[2]==='stretch'?[x[0],x[1]*5,x[2]]:x);
    const highTr = (typeof HIGH_TRAIN!=='undefined') && HIGH_TRAIN.includes(c.trainingLevel);
    const genba = /現場|職人|整備|工場|大工|鳶|建設|農|漁/.test(String(c.role||''));
    const suitJob = /営業|銀行|商社|コンサル|公務員|会社員/.test(String(c.role||''));
    const poorish = /ほぼゼロ|一桁万円|返済/.test(String(c.assetText||''));
    const age2 = Number(c.age)||25;
    l = l.filter(x=>!(x[2]==='gym' && !highTr)).filter(x=>!(x[2]==='workman' && !genba))
         .filter(x=>!(x[2]==='suitonly' && !(suitJob && /J$/.test(String(c.mbti||''))))).filter(x=>!(x[2]==='senpai' && !(age2<=24 && /^E/.test(String(c.mbti||'')))))
         .filter(x=>!(x[2]==='oshi' && !/推し|二次元/.test(String(c.loveTarget||'')))).filter(x=>!(x[2]==='gf2' && !hasLover))
         .filter(x=>!(x[2]==='furima' && Number(c.eraYear||2026)<2015)).filter(x=>!(x[2]==='fitchange' && !(age2>=30 && /ぽっちゃり|腹/.test(String(c.bodyType||'')))))
         .filter(x=>!(x[2]==='black' && !['クール系','ミステリアス系','モード系'].includes(String(c.vibe||''))))
         .filter(x=>!(x[2]==='forward' && !(age2<=27 && ['韓国風','ストリート系','サブカル系'].includes(String(c.vibe||'')))));
    if(poorish) l = l.map(x=>x[2]==='sale'?[x[0],x[1]*4,x[2]]:x);
    if(/几帳面|完璧/.test(String(c.principleText||'')) || /J$/.test(String(c.mbti||''))) l = l.map(x=>x[2]==='iron'?[x[0],x[1]*2.5,x[2]]:x);
    const it = innerWeighted(l);
    let badge = null;
    if(it[2]==='mute') badge = rand()<.4 ? 'rare' : null;
    if(it[2]==='stretch') badge = 'gap';
    if(it[2]==='suitonly') badge = 'gap';
    if(it[2]==='d') badge = 'rare';
    return [it[0], badge];
  }

  function applySenseTypeFx(c){
    if(!c) return;
    const s = String(c.fashionSenseText||'');
    if(/ジム服がそのまま私服化/.test(s)) c.holidayOutfitType = 'スポーツ練習着';
    else if(/黒しか着ない/.test(s) && rand()<0.6) c.holidayOutfitType = 'オールブラック・ミニマル';
    else if(/流行は先取り/.test(s) && Number(c.eraYear||2026)>=2016 && rand()<0.5) c.holidayOutfitType = pick(['テックウェア','きれいめストリート','Y2K'].filter(t=>typeInEra(t,Number(c.eraYear)||2026)));
    else if(/ワークマンで全部済む/.test(s)) c.holidayOutfitType = 'ワークマン系機能カジュアル';
    else if(/スーツ以外の服をほぼ持っていない/.test(s)){ c.holidayGapSuit = true; c.holidayOutfitType = c.outfitType && /スーツ/.test(c.outfitType) ? c.outfitType : '紺スーツ'; }
  }

  const FASHION_VALUES = [['清潔感・他者からの見られ方',5],['動きやすさ・機能性',4],['無難さ・浮かないこと',4],['コスパ',3.5],['トレンド',2],['自己表現・個性',2],['質の良さ・長持ち',2.5],['着心地',3]];

  const FASHION_BASE_COLORS = [['黒',4],['ネイビー',4],['グレー',3.5],['白ベース',2.5],['ベージュ・アースカラー',2],['カーキ',1.5],['ブラウン',1.2]];

  const FASHION_SCHEMES = [['ベーシック＋差し色',4],['ワントーン・同系色でまとめる',3],['色数多め・ミックス',1.5]];

  const SOCK_CYCLES = [['穴が開くまで履く',2],['よれたら替える（年1回まとめて）',4],['半年ごとに数足ずつ入れ替え',3],['季節の変わり目にまとめ買い',2.5],['気づいたときに1足ずつ',3],['頻繁に新調する（消耗品と割り切り）',1.2]];

  const SOCK_DRAWERS = [['黒・紺のビジネスソックス中心',5],['白スポーツソックス多め',3],['黒ビジネスと白スポーツが半々',3.5],['グレー系で統一',2],['柄物がじわじわ増殖中',1.5],['同じ靴下を色違いで揃えている',2],['もらい物と景品が混ざったカオス',1.5],
    ['同一品番の黒で完全統一（迷わない主義）',2],['黒ビジネスの中に柄物が数足だけ潜んでいる',1.8],['厚手のワークソックスがぎっしり',1.2],['白の医療用ソックスで統一',0.6],['5本指ソックスが幅を利かせている',0.8],['スポーツブランドのロゴソックスばかり',1.5],['お気に入りブランドの靴下を少しずつ集めている',1.2],['ペアで几帳面に畳まれて色順に並ぶ',1.5],['左右バラバラ・似た色で乗り切る日もある',1.5],['学生時代の部活ソックスがまだ現役',1],['くたびれた白と新品の白が混在',1.5],['夏用メッシュと冬用パイルで衣替え管理',1],['ハイソックスと足袋型が混ざる個性派',0.5],['ライン入りスポーツソックスがずらり',1],['靴下は消耗品と割り切り3足パックのみ',2],['インビジブル中心で長物はわずか',1.2],['紺一色（会社規定に合わせた名残）',1],['家用のもこもこソックスが冬だけ増える',0.8],['アウトドア用の厚手メリノが数足',0.8],['白黒グレーの無彩色だけで構成',1.8],['もらったブランド靴下を大事に温存',0.8],['穴あき予備軍を捨てられずにいる',1.2]];

  const SOCK_TROUBLES = [['かかとがすぐ薄くなる',4],['ずり落ちてくるのが地味にストレス',3],['毛玉ができやすい',3],['洗濯で片方が行方不明になる',3.5],['ゴムが伸びがち',2.5],['サイズが微妙に合わない',1.5],['特になし',3]];

  const SOCK_PAIRS = [['パンツと同系色でつなげる',4],['靴と色を合わせる',2.5],['見せない派（くるぶし・インビジブル）',2.5],['白ソックスで抜け感を出す',1.5],['柄物を差し色にする',1.2],['深く考えていない',4]];

  const FAVORITE_WORDS = [
    ['一期一会','kind'],['継続は力なり','effort'],['七転八起','hot'],['初心忘るべからず','wise'],['日々是好日','calm'],['明鏡止水','calm'],['質実剛健','effort'],['雲外蒼天','hot'],['急がば回れ','wise'],['なんとかなる','free'],
['有言実行','hot'],['不言実行','calm'],['温故知新','wise'],['切磋琢磨','effort'],['一意専心','effort'],['勇往邁進','hot'],['泰然自若','calm'],['臥薪嘗胆','effort'],['粉骨砕身','hot'],['気宇壮大','hot'],
['誠心誠意','kind'],['和顔愛語','kind'],['隠忍自重','calm'],['大器晩成','wise'],['不撓不屈','hot'],['百折不撓','hot'],['独立独歩','free'],['自由闊達','free'],['天真爛漫','free'],['威風堂々','hot'],
['謹厳実直','calm'],['公明正大','wise'],['清廉潔白','calm'],['一心不乱','effort'],['全力投球','hot'],['真剣勝負','hot'],['意気軒昂','hot'],['心機一転','free'],['捲土重来','hot'],['再起一番','hot'],
['一石二鳥','wise'],['先手必勝','hot'],['因果応報','wise'],['自業自得','wise'],['正々堂々','hot'],['冷静沈着','calm'],['沈思黙考','calm'],['熟慮断行','wise'],['即断即決','hot'],['一日一善','kind'],
['報恩謝徳','kind'],['感謝感激','kind'],['笑門来福','kind'],['家内安全','kind'],['無病息災','calm'],['一病息災','wise'],['晴耕雨読','calm'],['悠々自適','free'],['花鳥風月','calm'],['行雲流水','free'],
['虚心坦懐','calm'],['無我夢中','hot'],['疾風迅雷','hot'],['電光石火','hot'],['獅子奮迅','hot'],['猪突猛進','hot'],['勇猛果敢','hot'],['豪放磊落','free'],['談論風発','free'],['博学多才','wise'],
['文武両道','effort'],['眉目秀麗','free'],['純真無垢','kind'],['素直一番','kind'],['謙虚謙遜','calm'],['実る稲穂','wise'],['塞翁が馬','wise'],['雨降って地固まる','wise'],['石の上にも三年','effort'],['千里の道も一歩から','effort'],
['ちりも積もれば山となる','effort'],['継続こそ最大の才能','effort'],['努力は裏切らない','effort'],['習うより慣れよ','wise'],['好きこそものの上手なれ','free'],['芸は身を助ける','wise'],['七転び八起き','hot'],['失敗は成功のもと','wise'],['案ずるより産むが易し','free'],['思い立ったが吉日','hot'],
['善は急げ','hot'],['鉄は熱いうちに打て','hot'],['明日は明日の風が吹く','free'],['なるようになる','free'],['ケセラセラ','free'],['笑う門には福来る','kind'],['情けは人のためならず','kind'],['袖振り合うも多生の縁','kind'],['縁の下の力持ち','kind'],['実るほど頭を垂れる稲穂かな','wise'],
['能ある鷹は爪を隠す','calm'],['沈黙は金','calm'],['言わぬが花','calm'],['備えあれば憂いなし','wise'],['転ばぬ先の杖','wise'],['念には念を入れよ','calm'],['急いては事を仕損じる','calm'],['短気は損気','calm'],['腹八分目に医者いらず','wise'],['早起きは三文の徳','effort'],
['時は金なり','effort'],['一寸の光陰軽んずべからず','effort'],['今日できることを明日に延ばすな','effort'],['明日死ぬかのように生きよ','hot'],['一日一生','wise'],['今を生きる','now'],['今日がいちばん若い日','now'],['人生一度きり','now'],['後悔しない生き方','now'],['やらぬ後悔よりやる後悔','hot'],
['迷ったら進め','hot'],['迷ったらやめる','calm'],['直感を信じる','free'],['自分に嘘をつかない','wise'],['約束は守る','calm'],['嘘をつかない','calm'],['逃げない','hot'],['折れない心','hot'],['負けてたまるか','hot'],['勝つまでやる','hot'],
['あきらめたらそこで終わり','hot'],['限界は自分が決める','hot'],['壁は超えるためにある','hot'],['ピンチはチャンス','hot'],['チャンスは準備した者に来る','wise'],['運も実力のうち','free'],['人事を尽くして天命を待つ','wise'],['果報は寝て待て','free'],['待てば海路の日和あり','calm'],['雲の上はいつも晴れ','free'],
['止まない雨はない','kind'],['夜明け前が一番暗い','wise'],['冬来たりなば春遠からじ','wise'],['どんな夜にも朝は来る','kind'],['上を向いて歩こう','kind'],['前向きが正義','free'],['笑顔は最強','kind'],['元気があれば何でもできる','hot'],['健康第一','calm'],['体が資本','calm'],
['よく食べよく寝る','free'],['腹が減っては戦はできぬ','free'],['食は命','free'],['一汁一菜','calm'],['もったいない精神','calm'],['足るを知る','calm'],['シンプルイズベスト','calm'],['引き算の美学','calm'],['余白を大切に','calm'],['丁寧な暮らし','calm'],
['一つずつ片づける','effort'],['凡事徹底','effort'],['当たり前を丁寧に','effort'],['基本に忠実','effort'],['準備が九割','wise'],['段取り八分','wise'],['神は細部に宿る','wise'],['形から入る','free'],['道具を大切に','calm'],['靴を磨く者は道を誤らない','wise'],
['挨拶は心の扉','kind'],['ありがとうは魔法の言葉','kind'],['おかげさま','kind'],['お互いさま','kind'],['来る者拒まず去る者追わず','free'],['人は鏡','wise'],['類は友を呼ぶ','free'],['持つべきものは友','kind'],['一人はみんなのために','kind'],['和を以て貴しとなす','kind'],
['義を見てせざるは勇なきなり','hot'],['背中で語る','calm'],['男は黙って行動','calm'],['有終の美','effort'],['終わりよければすべてよし','free'],['旅の恥はかき捨て','free'],['郷に入っては郷に従え','wise'],['百聞は一見に如かず','wise'],['百見は一体験に如かず','hot'],['論より証拠','wise'],
['習慣が人をつくる','effort'],['姿勢が人生をつくる','effort'],['言葉が現実をつくる','wise'],['夢は逃げない','hot'],['夢に日付を','hot'],['志高く','hot'],['青雲之志','hot'],['大志を抱け','hot'],['道は開ける','kind'],['歩けば道になる','hot'],
['我が道を行く','free'],['オンリーワンでいい','free'],['比べない生き方','calm'],['マイペースが最強','free'],['急がず休まず','effort'],['ゆっくり急げ','wise'],['焦らず腐らず驕らず','calm'],['謙虚に貪欲に','effort'],['学びに終わりなし','wise'],['生涯現役','hot']
  ];

  function chooseInnerFavoriteWord(c){
    const vibe = String(c.vibe||''); const mbti = String(c.mbti||'');
    const hotV = /やりらふぃー|元気|ギャル男|陽キャ|スポーツ|体育会/.test(vibe) || /^E/.test(mbti);
    const calmV = /クール|ミステリアス|紳士|塩顔|文学/.test(vibe) || /^I..J$/.test(mbti);
    const wiseV = /INT|研究|理系|文学/.test(vibe + mbti);
    const freeV = /P$/.test(mbti);
    const list = FAVORITE_WORDS.map(([wd, tag])=>{
      let w = 1;
      if(hotV && tag==='hot') w*=2.5;
      if(calmV && (tag==='calm'||tag==='wise')) w*=2.5;
      if(wiseV && tag==='wise') w*=2;
      if(freeV && tag==='free') w*=2;
      if(tag==='kind') w*=1.2;
      return [wd, w];
    });
    return [weighted(list), null];
  }

  function sockWearVisual(c, english=false){
    const smellTxt = String(c.sockSmellText||''); const wearTxt = String(c.sockWearText||''); const cyc = String(c.sockCycleText||'');
    let lv = 0;
    if(/蒸れ|こもった|外回りのあと/.test(smellTxt) || /2日は履く|2日目|替えないことがある/.test(wearTxt) || /穴が開くまで/.test(cyc)) lv = 1;
    if(/納豆|チーズ|指摘された|ブーツを脱いだ瞬間/.test(smellTxt) || /1週間履くこともある/.test(wearTxt)) lv = 2;
    const tr = String(c.sockTroubleText||'');
    const trJa = [/かかとがすぐ薄く/.test(tr)?'かかとの生地がやや薄く透け気味。':'', /毛玉/.test(tr)?'ところどころに小さな毛玉。':'', /ずり落ち/.test(tr)?'片方が少しずり下がった自然なよれ。':'', /ゴムが伸び/.test(tr)?'履き口のゴムがゆるくたるんでいる。':''].join('');
    const trEn = [/かかとがすぐ薄く/.test(tr)?' The heel fabric looks slightly thin and worn.':'', /毛玉/.test(tr)?' A few small fabric pills here and there.':'', /ずり落ち/.test(tr)?' One sock has slipped down a little, naturally slouched.':'', /ゴムが伸び/.test(tr)?' The cuff elastic looks loose and relaxed.':''].join('');
    if(english){
      if(lv===2) return ` The socks show a heavily lived-in state: the sole side and toe fabric are clearly darker with dampness, the whole sock slightly misshapen and slouched, with his just-removed shoes placed beside him at an angle that shows the insoles.${trEn} No cartoonish steam or exaggeration — keep it photorealistic daily life.`;
      if(lv===1) return ` The socks show a full day of natural wear: light slouching at the cuff and faintly darker fabric on the sole side, with his just-removed shoes sitting right next to him.${trEn} No cartoonish steam or exaggeration.`;
      return trEn ? `${trEn} Keep it a clean, naturally worn state.` : '';
    }
    if(lv===2) return `靴下は着用感強めの状態で描く：足裏側とつま先の生地が湿り気で明確に色濃く、全体に軽い型崩れとよれ。中敷きが見える角度で脱ぎ置かれた靴をすぐ横に。${trJa}漫画的な湯気や誇張表現は使わない。`;
    if(lv===1) return `靴下は一日履いたあとの自然な使用感で描く：履き口に軽いよれ、足裏側の生地がわずかに色濃い。脱いだばかりの靴をすぐ横に置く。${trJa}漫画的な湯気や誇張表現は使わない。`;
    return trJa ? `${trJa}全体としては清潔に一日履いた自然な状態。` : '';
  }

    function chooseFashionProfile(c){
    if(!c) return;
    const st = String(c.fashionSenseText||''); const y = Number(c.eraYear)||2026; const age = Number(c.age)||25;
    let vals = FASHION_VALUES.map(([v,w])=>{ let ww=w;
      if(/清潔感/.test(st)&&/清潔感/.test(v)) ww*=4;
      if(/無難/.test(st)&&/無難/.test(v)) ww*=4;
      if(/機能性|ワークマン|ジム服/.test(st)&&/機能性/.test(v)) ww*=4;
      if(/流行|雑誌やSNS/.test(st)&&/トレンド/.test(v)) ww*=5;
      if(/セール品|量販店/.test(st)&&/コスパ/.test(v)) ww*=4;
      if(/古着|ハイブランド|背伸び/.test(st)&&/自己表現/.test(v)) ww*=3;
      if(/定番を10年/.test(st)&&/質の良さ/.test(v)) ww*=4;
      if(age>=45&&/トレンド/.test(v)) ww*=0.4;
      return [v,ww]; });
    c.fashionValueText = weighted(vals);
    let sz = [['ジャストサイズ',5],['やや余裕のあるサイズ感',3],['タイトめ',1.5]];
    if(y>=2016) sz.push(['オーバーサイズ', /ゆるシルエット/.test(st)?8:3]);
    if(/細身シルエット/.test(st)) sz = [['タイトめ',6],['ジャストサイズ',4]];
    if(/サイズ感命/.test(st)) sz = sz.map(([v,w])=>[v, v==='ジャストサイズ'?w*3:w]);
    c.sizeFeelText = weighted(sz);
    if(/黒しか着ない/.test(st)){ c.baseColorText='黒'; c.colorSchemeText='ワントーン・同系色でまとめる'; }
    else if(/モノトーン/.test(st)){ c.baseColorText=weighted([['黒',5],['グレー',3],['白ベース',2]]); c.colorSchemeText='ワントーン・同系色でまとめる'; }
    else {
      c.baseColorText = weighted(FASHION_BASE_COLORS);
      let sch = FASHION_SCHEMES.map(([v,w])=>[v, (/色は3色まで|無難第一/.test(st)&&/ワントーン|ベーシック/.test(v))?w*2:((/柄物|流行/.test(st)&&/色数多め/.test(v))?w*3:w)]);
      c.colorSchemeText = weighted(sch);
    }
    const incNum = Number((String(c.incomeText||'').match(/約(\d+)万円/)||[])[1]||0);
    let brands = [['UNIQLO',5],['無印良品',3],['NIKE',2.5],['adidas',2],['BEAMS',1.5],['UNITED ARROWS',1.5],['SHIPS',1.2],['GLOBAL WORK',1.5],['THE NORTH FACE',1.5],['New Balance',1.5],['しまむら',1],['Champion',1],['Paul Smith',0.8],['ZARA',1],['GU',2]];
    brands = brands.filter(([n])=>!(n==='GU'&&y<2006)&&!(n==='ZARA'&&y<1998)&&!(n==='UNIQLO'&&y<1994)&&!(n==='GLOBAL WORK'&&y<1994));
    if(incNum>=800) brands = brands.map(([n,w])=>[n, /Paul Smith|UNITED ARROWS|BEAMS|SHIPS/.test(n)?w*3:w]);
    if(/量販店|セール品/.test(st)) brands = brands.map(([n,w])=>[n, /UNIQLO|GU|しまむら/.test(n)?w*3:w*0.5]);
    c.favBrandText = /古着一筋/.test(st) ? '古着（ブランドは問わない）' : weighted(brands);
    let cyc = SOCK_CYCLES.slice();
    if(/穴が開くまで/.test(st)) cyc = [['穴が開くまで履く',10]];
    else if(/靴下|アイロンと毛玉取り|几帳面/.test(st)) cyc = cyc.map(([v,w])=>[v, /半年ごと|頻繁/.test(v)?w*3:w]);
    c.sockCycleText = weighted(cyc);
    c.sockDrawerText = (()=>{
      const role3 = String(c.role||''); const mb = String(c.mbti||'');
      const suit3 = /会計士|銀行|弁護士|公務員|コンサル|営業|商社|不動産|保険|アナウンサー/.test(role3);
      const site3 = /消防|警察|自衛|大工|電気工事|整備|工場|配送|引越|農|漁|警備/.test(role3);
      const med3 = /看護師|医師|研修医|歯科|薬剤師|理学療法士/.test(role3);
      const stu3 = /大学|学生|浪人|専門学校|高校卒業/.test(role3);
      const spo3 = /トレーナー|インストラクター|スポーツ選手|体育/.test(role3);
      const tidy3 = /几帳面|アイロン|清潔感/.test(st) || /J$/.test(mb);
      const lazy3 = /P$/.test(mb);
      return weighted(SOCK_DRAWERS.map(([v,w])=>{ let ww=w;
        if(/柄物は靴下だけで遊ぶ/.test(st)&&/柄物/.test(v)) ww*=6;
        if(suit3 && /ビジネス|紺一色|同一品番の黒/.test(v)) ww*=3;
        if(site3 && /ワークソックス|厚手/.test(v)) ww*=5;
        if(med3 && /医療用|白の医療/.test(v)) ww*=8;
        if(stu3 && /白スポーツ|部活|くたびれた白|3足パック/.test(v)) ww*=3;
        if(spo3 && /スポーツブランド|ライン入り/.test(v)) ww*=4;
        if(tidy3 && /几帳面|色順|完全統一|衣替え/.test(v)) ww*=3;
        if(tidy3 && /バラバラ|カオス|穴あき/.test(v)) ww*=0.2;
        if(lazy3 && /バラバラ|カオス|穴あき|捨てられず/.test(v)) ww*=2.5;
        if(/お気に入りブランド|もらったブランド/.test(v) && c.favBrandText && c.favBrandText!=='—') ww*=2;
        return [v, ww];
      }));
    })();
    c.sockTroubleText = weighted(SOCK_TROUBLES);
    c.sockPairText = weighted(SOCK_PAIRS.map(([v,w])=>[v, (/柄物は靴下だけで遊ぶ/.test(st)&&/柄物/.test(v))?w*6:w]));
    // 好きなブランド（靴）
    let shoeBr = [['NIKE',4],['adidas',3],['New Balance',3],['CONVERSE',2],['VANS',1.5],['ASICS',1.5],['PUMA',1.2],['Onitsuka Tiger',0.8],['REGAL',1.2],['Dr.Martens',0.8],['HOKA',0.8],['On',0.6]];
    shoeBr = shoeBr.filter(([n])=>!(n==='HOKA'&&y<2018)&&!(n==='On'&&y<2019)&&!(n==='New Balance'&&y<1985));
    if(incNum>=800) shoeBr = shoeBr.map(([n,w])=>[n, /REGAL|Dr\.Martens|New Balance/.test(n)?w*2.5:w]);
    if(/靴から決める派|靴だけは絶対に妥協しない/.test(st)) shoeBr = shoeBr.map(([n,w])=>[n, /REGAL|Dr\.Martens|New Balance|Onitsuka/.test(n)?w*2:w]);
    c.favShoeBrandText = weighted(shoeBr);
    // 靴下の連続着用（日本では毎日交換が大多数）
    let wearL = [['毎日洗濯した靴下に替える',10],['帰宅したらすぐ脱いで洗濯カゴへ（毎日交換）',2],['在宅の日は替えないことがある',1.5],['うっかり2日目に突入する日がある',1.2,'d'],['2日は履く',1,'d'],['1週間履くこともある',0.25,'d'],['ジム用と普段用を厳密に分けている',0.8]];
    if(/几帳面|アイロンと毛玉取り|清潔感/.test(st)) wearL = wearL.map(([v,w,b])=>[v, /毎日/.test(v)?w*2:w*0.4, b]);
    if(/穴が開くまで|量販店で3着/.test(st)) wearL = wearL.map(([v,w,b])=>[v, /2日目|替えないことがある/.test(v)?w*2.5:w, b]);
    const wr = weighted(wearL.map(x=>[x, x[1]]));
    c.sockWearText = wr[0];
    // 靴下のニオイ（強度×傾向。職業の実態・性格・他の靴下項目から補正）
    const wearTxt = String(c.sockWearText||'');
    const role2 = String(c.role||'');
    const deskSuit = /会計士|銀行|弁護士|公務員|アナウンサー|コンサル/.test(role2);
    const walkSuit = /営業|商社|不動産|保険/.test(role2);
    const bootsJob = /消防士|警察官|自衛官|救急隊員|大工|電気工事士|自動車整備士|工場勤務|配送ドライバー|防衛大学校/.test(role2);
    const standJob = /寿司職人|ラーメン店|パティシエ|バーテンダー|ホテル|看護師|研修医|美容師/.test(role2);
    const sportJob = /サッカー|野球|バスケ|アスリート|スポーツ|インストラクター/.test(role2) || /部活|体育会/.test(String(c.sportsHistory||''));
    const tidyMind = /几帳面|清潔感|アイロン/.test(st) || /J$/.test(String(c.mbti||''));
    let smell = [
      ['ほぼ無臭（こまめにケア）',2],
      ['ほんのり洗剤の香りが残る程度',1.5],
      ['脱いだ直後にかすかな汗のニオイ（うっすら酸っぱい系）',5],
      ['夕方になると靴の中が蒸れがち（こもった酸味系）',3],
      ['革靴の日は少しこもったニオイ（蒸れた革×汗の系統）',2],
      ['外回りのあとはかなりくる（ツンとした酸っぱい系）',1],
      ['運動後はしっかり汗のニオイ（酸味強めの系統）',1.5],
      ['ブーツを脱いだ瞬間に広がる（蒸れ濃縮系）',0.8],
      ['納豆みたいなニオイと自覚している',0.5],
      ['チーズっぽいと言われたことがある',0.3],
      ['本人は無自覚だが家族に指摘されたことがある',0.8]
    ];
    smell = smell.map(([v,w])=>{
      if(/2日は履く|2日目|替えないことがある/.test(wearTxt)){ if(/蒸れ|こもった|指摘された|納豆|チーズ|ツンと/.test(v)) w*=2.5; if(/ほぼ無臭|洗剤の香り/.test(v)) w*=0.3; }
      if(/1週間履くこともある/.test(wearTxt)){ if(/納豆|チーズ|指摘された|ブーツを脱いだ瞬間/.test(v)) w*=8; if(/ほぼ無臭|洗剤の香り|かすかな汗/.test(v)) w*=0.05; }
      if(/毎日/.test(wearTxt) && /指摘された|納豆|チーズ/.test(v)) w*=0.4;
      if(tidyMind){ if(/ほぼ無臭|洗剤の香り/.test(v)) w*=3.5; if(/指摘された|納豆|チーズ/.test(v)) w*=0.25; }
      if(deskSuit && /革靴の日/.test(v)) w*=2.5;
      if(walkSuit){ if(/外回りのあと|革靴の日/.test(v)) w*=4; if(/ほぼ無臭/.test(v)) w*=0.4; }
      if(bootsJob){ if(/ブーツを脱いだ瞬間|蒸れ|こもった/.test(v)) w*=3.5; if(/ほぼ無臭|洗剤の香り/.test(v)) w*=0.35; }
      if(standJob && /蒸れ|こもった/.test(v)) w*=2;
      if(sportJob && /運動後/.test(v)) w*=4;
      if(/穴が開くまで/.test(String(c.sockCycleText||'')) && /蒸れ|指摘された|納豆/.test(v)) w*=2;
      return [v,w];
    });
    c.sockSmellText = weighted(smell);
    // スラックスフィット→ボトムス丈感→裾仕上げ（整合制約つき）
    let fitL = [['標準テーパード',4],['タイトめテーパード', y>=2012?2.5:0.8],['ストレート',3],['ワイドタック', (y<=1999||y>=2019)?2.5:1]];
    if(/タイトめ/.test(String(c.sizeFeelText||'')) || /細身シルエット/.test(st)) fitL = fitL.map(([v,w])=>[v, /タイトめ/.test(v)?w*3:w]);
    if(/オーバーサイズ/.test(String(c.sizeFeelText||''))) fitL = fitL.map(([v,w])=>[v, /ワイド|ストレート/.test(v)?w*2:(/タイトめ/.test(v)?w*0.3:w)]);
    if(age>=50) fitL = fitL.map(([v,w])=>[v, /ストレート|ワイド/.test(v)?w*1.8:w]);
    c.slacksFitText = weighted(fitL);
    let hemL;
    if(/タイトめ/.test(c.slacksFitText)) hemL = [['ノークッション（くるぶしで止まるジャスト丈）',4],['アンクル丈（くるぶしが見える九分丈）', y>=2012?3:0.5]];
    else if(/ワイドタック/.test(c.slacksFitText)) hemL = [['ワンクッション（裾が靴にゆったりたまるクラシック丈）',4],['ハーフクッション（裾が靴に軽く触れる標準丈）',3]];
    else hemL = [['ハーフクッション（裾が靴に軽く触れる標準丈）',4],['ワンクッション（裾が靴にゆったりたまるクラシック丈）',2.5],['ノークッション（くるぶしで止まるジャスト丈）',2],['アンクル丈（くるぶしが見える九分丈）', y>=2012?1.5:0.3],['クロップド（すねが少し見える短め丈）', y>=2012?1:0.2]];
    if(/流行|雑誌やSNS/.test(st) && y>=2012) hemL = hemL.map(([v,w])=>[v, /アンクル|クロップド|ノークッション/.test(v)?w*2:w]);
    c.hemPrefText = weighted(hemL);
    let finL = [['シングル（プレーン）仕上げ',6],['ダブル（4cm幅）仕上げ', (y<=1999||y>=2018)?4:2.5]];
    if(/タイトめ/.test(c.slacksFitText)) finL = finL.map(([v,w])=>[v, /ダブル/.test(v)?w*0.4:w]);
    if(/古着|定番を10年/.test(st)) finL = finL.map(([v,w])=>[v, /ダブル/.test(v)?w*1.8:w]);
    c.hemFinishText = weighted(finL);
  }

  function suitHemOf(c){
    const h = String(c.hemPrefText||'');
    if(/アンクル|クロップド/.test(h)) return 'ノークッション（くるぶしで止まるジャスト丈）';
    return h || 'ハーフクッション（裾が靴に軽く触れる標準丈）';
  }

  function sockLengthClass(t){ t = String(t||''); if(/インビジブル/.test(t)) return 'inv'; if(/くるぶし|アンクル|スニーカー丈/.test(t)) return 'ankle'; return 'crew'; }

  function hemClassOf(c){
    const b = String(c.bottom||'');
    if(/ハーフパンツ|ショートパンツ|短パン/.test(b)) return 'shorts';
    const h = String(c.hemPrefText||'') + b;
    if(/クロップド|アンクル丈|九分/.test(h)) return 'crop';
    if(/ノークッション/.test(h)) return 'no';
    if(/ワンクッション/.test(h)) return 'one';
    return 'half';
  }

  function sockSlackLevel(c){
    if(/靴下|アイロンと毛玉取り|几帳面/.test(String(c.fashionSenseText||''))) return 'up';
    if(/ずり落ち/.test(String(c.sockTroubleText||'')) || /1週間履くこともある|2日は履く/.test(String(c.sockWearText||'')) || /納豆|チーズ|ブーツを脱いだ瞬間/.test(String(c.sockSmellText||''))) return 'strong';
    return 'normal';
  }

  function sockToeClass(c){
    const m = String(c.sockMaterial||'') + String(c.sockShape||'') + String(c.sockType||'');
    if(/ナイロン|シルク|薄手/.test(m)) return 'thin';
    if(/パイル|ウール|厚手/.test(m)) return 'thick';
    return 'std';
  }

  function sockNoteFull(c, english=false){
    const five = /5本指|五本指/.test(String(c.sockType||'') + String(c.sockShape||''));
    const sc = sockLengthClass(c.sockType);
    const slack = sockSlackLevel(c);
    const toe = sockToeClass(c);
    if(english){
      let body;
      if(sc==='crew'){
        const slackEn = slack==='up' ? 'pulled up neatly to the cuff with no slack'
          : slack==='strong' ? 'clearly slipped down with several soft folds gathered at the ankle (still never loose-sock style bunching)'
          : 'the cuff slipped down 2-3cm with one or two soft folds resting at the ankle — this is slack, not a shorter sock; never replace with ankle socks and never bunch it loose-sock style';
        body = `Mid-calf crew socks worn through a full day, ${slackEn}.`;
      } else if(sc==='ankle') body = 'Ankle-length socks ending just above the ankle bone.';
      else body = 'Invisible no-show socks hidden inside the shoes.';
      const tabiE = /足袋型/.test(String(c.sockType||'') + String(c.sockShape||''));
      const toeEn = tabiE ? ' Render them as tabi-style split-toe socks: only the big toe is separated, in a clean two-pocket construction (never five-toe).' : five ? ' Render them as true five-toe socks, each toe separately wrapped as the sock is constructed.' : toe==='thin'
        ? ' The thin fabric follows the foot closely: the big-toe outline and the gentle rise at the toe joints show faintly, but the fabric stays one continuous surface with no individual toe grooves.'
        : toe==='thick'
        ? ' The thick fabric barely registers the toes — one rounded silhouette with a little spare fabric at the tip.'
        : ' The fabric covers the toes as one rounded silhouette: the big toe swells gently and the toe area undulates softly, but individual toes never press through.';
      return ` ${body}${toeEn} Any brand logo or point mark sits small on the ribbed cuff or on the outer side above the ankle bone only — never on the top front, toes, soles, or heel; stripe patterns run as horizontal lines along the cuff rib. Keep the wear natural and laundered-clean, never exaggerated${five?'':'; never five-toe socks'}.`;
    }
    let body;
    if(sc==='crew'){
      const slackJa = slack==='up' ? '履き口までまっすぐ引き上げられ、たるみのない状態'
        : slack==='strong' ? '履き口がはっきりずり下がり、足首に生地が数段寄った状態（それでもルーズソックスのようには溜めない）'
        : '履き口が2〜3cmずり下がり、足首に生地が1〜2段軽く寄った自然な状態（丈が短いのではなくたるみであり、アンクルソックスに置き換えず、ルーズソックス状にも溜めない）';
      body = `ふくらはぎ中ほどまでのクルー丈の靴下を一日履き、${slackJa}。`;
    } else if(sc==='ankle') body = 'くるぶしの少し上までのアンクル丈。';
    else body = '履き口が靴に隠れる浅履きのインビジブル丈。';
    const tabi = /足袋型/.test(String(c.sockType||'') + String(c.sockShape||''));
    const toeJa = tabi ? '足袋型ソックスとして、親指だけが分かれた2本指構造を正確に描く（5本指にはしない）。' : five ? '5本指ソックスとして、各指が分かれた形を靴下の構造どおり正確に描く。' : toe==='thin'
      ? '薄手の生地が足先にぴったり沿い、親指の輪郭と指の付け根のゆるやかな起伏がうっすら分かる。ただし指一本一本の分かれ目までは浮き出させず、生地は一枚の連続した面として描く。'
      : toe==='thick'
      ? '厚みのある生地で指の形はほとんど拾わず、丸いシルエットと先端の生地の余りだけで足先を表現する。'
      : 'つま先は生地が足先をひとつの面として覆い、親指の膨らみと足先のなだらかな起伏で指の存在感を残しつつ、分かれ目は浮き出させない。';
    return `${body}${toeJa}ブランドのロゴ・ワンポイントは履き口のリブ部分または外くるぶし上の側面にのみ小さく配置し、甲の正面・つま先・足裏・かかとには置かない。ライン柄は履き口のリブに沿った横線として描く。汚れや生地の傷みは誇張せず${five?'':'、5本指ソックスにしない'}。`;
  }

  const LE_TYPES = {
    fullFront:'全身：前面', fullSide:'全身：側面', fullBack:'全身：背面',
    faceFront:'顔：正面', faceSide:'顔：側面', faceQuarter:'顔：斜め（45度）', faceTeeth:'顔：正面（歯が見える）',
    expSmile:'表情：微笑（歯なし）', expSerious:'表情：真剣', expShy:'表情：照れ笑い', expSurprise:'表情：驚き',
    footFront:'足：正面', footSide:'足：側面', soleSit:'座って足裏を見せる', soleSockSit:'靴下足裏（座り）', soleZoom:'足裏：全体拡大',
    sockFeet:'靴下姿の足元アップ', free:'自由ラベル', info:'情報欄'
  };

  let leWearMode = 'ボクサーパンツのみ';

  let leInfoItems = ['氏名','年代','生年','身長・体重','足サイズ・ワイズ'];

  let lePanels = [], leSel = -1, leDrag = null, leSelSet = [];
  function layoutRefFormat(c, english){ return ''; }

  function policeGearText(c, english=false){
    if(String(c?.role||'') !== '警察官' || !c.workUniform) return '';
    const pref = String(c.policeGearPref || '標準装備');
    const idNo = String(c.policeIdNo || 'AP-306');
    if(english){
      let t = ` A silver oval identification badge on the left chest (an arched alphanumeric ID "${idNo}" on top, a gold emblem in the center, thin gold bars on both sides — a fictional design distinct from any real police insignia; render the characters exactly).`;
      if(pref === '標準装備') t += ' A black duty belt at the waist carrying a holstered sidearm (kept holstered at all times, never drawn), a baton, a handcuff case, and a radio holder, with a receiver mic clipped at the shoulder.';
      else if(pref === '帯革のみ') t += ' A black duty belt at the waist with minimal pouches.';
      return t;
    }
    let t = `。左胸に銀色の楕円形の識別章（上部にアーチ状の英数字「${idNo}」、中央に金色の紋章風エンブレム、左右に金の細いバー。実在の警察章とは異なる架空デザイン。文字は正確に描く）`;
    if(pref === '標準装備') t += '。腰に黒の帯革（けん銃を収めたホルスター・警棒・手錠ケース・無線機ホルダーを装着。けん銃はホルスターに収めたまま、抜いたり構えたりしない）、肩に受令機マイク';
    else if(pref === '帯革のみ') t += '。腰に黒の帯革（装備ポーチは最小限）';
    return t;
  }

  function sockRenderNote(c, english=false){
    const sc = sockLengthClass(c.sockType);
    const hc = hemClassOf(c);
    if(english){
      const nm = sc==='crew' ? 'crew length' : sc==='ankle' ? 'ankle length' : 'no-show length';
      let vis = '';
      if(sc==='crew' && hc==='crop') vis = ', a little shin showing between hem and cuff is natural';
      else if(sc==='crew' && hc==='no') vis = ', a sliver of skin peeking when seated is natural';
      else if(sc!=='crew') vis = ', visible ankle here is intended';
      const five2 = /5本指|五本指/.test(String(c.sockType||''));
      return ` Socks: ${nm}${vis}; ${five2?'true five-toe socks':'never five-toe socks'}.`;
    }
    const nm = sc==='crew' ? 'クルー丈' : sc==='ankle' ? 'アンクル丈' : 'インビジブル丈';
    let vis = '';
    if(sc==='crew' && hc==='crop') vis = '。裾との間にすねが少し見えるのは自然';
    else if(sc==='crew' && hc==='no') vis = '。座って素肌がわずかにのぞく程度は自然';
    else if(sc!=='crew' && hc!=='shorts') vis = '。すねやくるぶしが見えるのは意図どおり';
    const five2 = /5本指|五本指/.test(String(c.sockType||''));
    if(/なし（素足/.test(String(c.sockType||''))) return '足元は素足で履く。';
    if(/足袋型/.test(String(c.sockType||''))) return `靴下は足袋型ソックス（親指だけ分かれた2本指）${vis}。`;
    return `靴下は${nm}${vis}（${five2?'5本指ソックス':'5本指にしない'}）。`;
  }

  const ORIGIN_ROOTS = [['中国',26],['韓国',14],['ベトナム',18],['フィリピン',11],['ブラジル',7],['ネパール',6],['インドネシア',3],['ミャンマー',3],['タイ',2],['ペルー',2]];

  function applyOriginRoots(c){
    if(!c) return;
    c.originRootsNote = c.originRootsNote || '';
    if(!/移民二世/.test(String(c.originText||'')) || /両親は/.test(String(c.originText||''))) return;
    const r = weighted(ORIGIN_ROOTS);
    c.originText = `移民二世の家庭（両親は${r}出身）`;
    const east = /中国|韓国|台湾/.test(r);
    c.originRootsNote = east ? '' : ({'ベトナム':'東南アジア系','フィリピン':'東南アジア系','タイ':'東南アジア系','インドネシア':'東南アジア系','ミャンマー':'東南アジア系','ブラジル':'南米系','ペルー':'南米系','ネパール':'南アジア系'}[r]||'');
  }

  function originFaceLine(c, english=false){
    if(!c || !c.originRootsNote) return '';
    if(english){
      const en = {'東南アジア系':'Southeast Asian','南米系':'South American','南アジア系':'South Asian'}[c.originRootsNote]||'';
      return ` His parents immigrated to Japan before he was born; raised entirely in Japan, his eyes and skin tone carry a subtle ${en} cast — a faint, understated heritage impression within an otherwise natural Japanese look.`;
    }
    return `両親が海外出身の移民二世で、目元や肌の色にほんのり${c.originRootsNote}の面影がある（日本育ちの自然な範囲で、ごく控えめに描く）。`;
  }

  function applyFashionSenseFx(c){
    if(!c) return;
    const s = String(c.fashionSenseText||'');
    c.senseFashionNote = '';
    if(/量販店で3着|色違いを5枚|サイズ表記だけ|穴が開くまで/.test(s)){
      const cheap = pick(eraBrandList(['無地ノーブランド','UNIQLO','しまむら','GU'], Number(c.eraYear)||2026, '無地ノーブランド'));
      c.holidayOutfitBrand = cheap; c.holidayTopBrand = cheap; c.holidayBottomBrand = cheap; c.holidayShoesBrand = '';
      if(c.holidayOuterBrand) c.holidayOuterBrand = cheap;
      c.holidaySockUse = '着古してよれ気味';
      c.senseFashionNote = rand()<0.12 ? '上下の色が少しケンカしている' : 'サイズ感が微妙に合っていない、飾り気のない着こなし';
      if(/ケンカ/.test(c.senseFashionNote) && c.innerMeta) c.innerMeta.fashionsense = 'gap';
    } else if(/妻が選んで|彼女が選んで/.test(s)){
      c.senseFashionNote = '隅々まで手入れされた小綺麗な着こなし（選んだのは本人ではない）';
    } else if(/背伸びしたブランド/.test(s)){
      c.senseFashionNote = 'コーデの中で1点だけ明らかに高級なアイテムが浮いている';
    } else if(/定番を10年/.test(s)){
      c.senseFashionNote = '長く着込んだ定番品ならではの馴染んだ風合い';
    } else if(/古着一筋/.test(s)){
      c.senseFashionNote = '年代物の風合いを活かした古着ミックス';
    }
    if(!c.senseFashionNote && c.sizeFeelText && c.sizeFeelText!=='ジャストサイズ') c.senseFashionNote = `全体を${c.sizeFeelText}で着こなしている`;
    // 内面リンク：体型コンプ→オーバーサイズ隠し
    if(/ぽっちゃり|ビール腹|腹だけ/.test(String(c.bodyType||'')) && /体型|腹/.test(String(c.complexText||'')) && !c.senseFashionNote){
      c.senseFashionNote = 'オーバーサイズで体型をぼかしがちな着こなし';
    }
  }

  const INNER_LOVE_NOTE_ANY = [['年上に惹かれがち',5],['年下が好み',4],['同い年が落ち着く',4],['面食い',4],['性格重視',5],['声フェチ',2.5],['惚れっぽい',4],['冷めやすい',3],['一途',5],['依存しがち',2,'d'],['束縛強め',1.5,'d'],['尽くしすぎて重いと言われる',2,'d'],['ダメな相手ばかり好きになる',2,'d'],['押しに弱い',3],['高嶺の花ばかり狙って玉砕する',2],['笑いのツボが合う人に弱い',4],['ギャップに弱い',4],['メガネに弱い',2],['褒められるとすぐ好きになる',3],['連絡はマメな方',3],['連絡不精で振られがち',2.5,'d'],['理想が高いと言われる',2.5],['同じ趣味の人がいい',3.5],['年の差は気にしない',2.5],['食べっぷりのいい人に弱い',3],['敬語が可愛い人に弱い',2.5],['方言に弱い',2.5],['既婚者に惹かれてしまう悪癖',0.6,'d'],['元恋人を引きずっている',2,'d'],['匂いに弱い',1.5,'d'],['手フェチ',1.5,'d']];

  const INNER_LOVE_NOTE_F = [['ショートカットに弱い',2.5],['ポニーテールに弱い',2],['浴衣に弱い',1.5],['母性に弱い',2,'d'],['うなじに弱い',1.5,'d'],['姉御肌に弱い',2.5],['小柄な人に惹かれる',2],['背の高い人に惹かれる',2],['黒髪ロングが原点',2],['笑顔に弱い',3.5],['料理上手に弱い',3],['泣きぼくろに弱い',1.5]];

  const INNER_LOVE_NOTE_M = [['筋肉質な人に弱い',2.5],['低い声に弱い',2.5],['スーツ姿に弱い',2.5],['ヒゲが似合う人に弱い',2],['年上の包容力に弱い',2.5],['塩対応に弱い',1.5],['ジャージ姿に弱い',1.5],['手の骨っぽさに弱い',1.5,'d'],['体格差に弱い',2],['職人気質な人に惹かれる',2],['寡黙な人に惹かれる',2.5],['笑い上戸に弱い',2]];

  const INNER_LOVE_NOTE_BI = [['性別より人柄',5],['どちらかといえば女性寄り',3],['どちらかといえば男性寄り',2.5],['惹かれる相手に性別は関係ない',3.5],['その時々で揺れる',2],['好きになった人が性別',3]];

  function innerPastAllowed(c, txt){
    const org = String(c.originText||''), fam = String(c.familyText||'');
    if(/厳格な父親/.test(txt) && /母子家庭|祖父母に育てられた/.test(org)) return false;
    if(/過干渉の母/.test(txt) && /父子家庭|祖父母に育てられた/.test(org)) return false;
    if(/兄の背中/.test(txt) && !/次男|三男|末っ子|兄/.test(org+fam)) return false;
    if(/妹弟の面倒/.test(txt) && !/長男|妹|弟/.test(org+fam)) return false;
    if(/親の離婚を経験/.test(txt) && /父・母/.test(fam) && !/実家に父・母/.test(fam) && rand()<.7) return false;
    if(/家業の倒産/.test(txt) && !/経営者|商店|工場|店/.test(org) && rand()<.5) return false;
    if(/家の手伝い（店番・農作業）/.test(txt) && !/農家|漁師|商店|店|工場|旅館/.test(org)) return false;
    return true;
  }

  function chooseInnerComplex(c){
    for(let i=0;i<5;i++){
      const r = chooseInnerComplexBase(c);
      if(/兄と比べられて/.test(r[0]) && !/次男|三男|末っ子|兄/.test(String(c.originText||'')+String(c.familyText||''))) continue;
      if(/方言/.test(r[0]) && !(typeof innerDialectOf==='function' && innerDialectOf(c))) continue;
      if(/筋肉がつきにくい|胸板が薄い/.test(r[0]) && /マッチョ|筋肉質|がっしり/.test(String(c.bodyType||''))) continue;
      if(/太りやすい体質/.test(r[0]) && /細マッチョ|マッチョ/.test(String(c.bodyType||''))) continue;
      if(/下の毛の濃さ/.test(r[0]) && /薄め|ほぼ無毛/.test(String(c.bodyHairOverall||''))) continue;
      if(/天然パーマ|癖毛/.test(r[0]) && !/くせ毛|うねり/.test(String(c.hairTexture||''))) continue;
      if(/若白髪/.test(r[0]) && !/白髪|ごま塩/.test(String(c.hairColor||''))) continue;
      if(/手が小さい|指が短い/.test(r[0]) && /大きめ/.test(String(c.handFootSize||''))) continue;
      if(/収入の低さ|貯金のなさ/.test(r[0]) && Number((String(c.incomeText||'').match(/約(\d+)万円/)||[])[1]||0) >= 800) continue;
      if(/童貞|女性経験の少なさ/.test(r[0]) && /既婚|妻/.test(String(c.maritalText||''))) continue;
      const by2 = (Number(c.eraYear)||2026) - (Number(c.age)||25);
      if(/名前がキラキラ/.test(r[0])){ if(by2 < 1996) continue; const gn = String(c.name||'').split(' ')[1] || ''; if(!/[煌琉碧空星翔斗煉瑠彪凰羽夢騎絆漣澪灯雫乃愛來胡桜嵐雅]|レオ|ノア|ルカ|リト|ライ/.test(gn)) continue; }
      if(/名前が古風/.test(r[0])){ const gn2 = String(c.name||'').split(' ')[1] || ''; if(!/[蔵造助衛門之進吉蔵松竹梅寅辰巳午一郎太郎兵]|[衛蔵造助門]$/.test(gn2) && !/太郎$|之介$|之助$|兵衛$/.test(gn2)) continue;
        if(c.nationality && c.nationality!=='日本') continue;
        const nm = String(c.name||'').match(/^(\S+)[\s\u3000]+(\S+)（([^）]+)）$/);
        if(!nm) continue;
        const INNER_RETRO_GIVEN = [['茂','シゲル'],['勇','イサム'],['清','キヨシ'],['進','ススム'],['昇','ノボル'],['稔','ミノル'],['勝','マサル'],['守','マモル'],['武','タケシ'],['正','タダシ'],['博','ヒロシ'],['隆','タカシ'],['修','オサム'],['豊','ユタカ'],['巌','イワオ']];
        const kanaSep = nm[3].includes('・') ? '・' : ' ';
        const kanaToks = nm[3].split(/[・\s\u3000]+/).filter(Boolean);
        const famKana = kanaToks[0] || '';
        const alreadyRetro = INNER_RETRO_GIVEN.some(([kj])=>nm[2]===kj);
        if(by2 > 1978 && !alreadyRetro){
          const [kj, kk] = pick(INNER_RETRO_GIVEN);
          c.name = `${nm[1]} ${kj}（${famKana}${kanaSep}${kk}）`;
          const nr = chooseInnerNickname(c);
          c.nicknameText = nr[0];
          if(c.innerMeta) c.innerMeta.nickname = nr[1];
          return [`名前が古風すぎること（祖父と同じ「${kj}」）`, 'rare'];
        }
        return [r[0], by2 > 1978 ? 'rare' : r[1]];
      }
      return r;
    }
    return ['特になし（あるとすれば無頓着なこと）', null];
  }

  function chooseInnerPrinciple(c){
    let l = INNER_PRINCIPLES.map(x=>x.slice());
    const mb = String(c.mbti||'');
    const boost=(re,f)=>{ l=l.map(x=>re.test(x[0])?[x[0],x[1]*f,x[2]]:x); };
    if(/J$/.test(mb)) boost(/約束|石橋|三年|朝イチ|手は抜かない/,1.8);
    if(/P$/.test(mb)) boost(/勢い|とりあえず|楽しい方|逃げる/,1.8);
    if(/^..T/.test(mb)) boost(/実利|勝てる勝負|比べない|護身/,1.5);
    if(/^..F/.test(mb)) boost(/家族|悪口|声をかける|信じて/,1.6);
    const it = innerWeighted(l);
    return [it[0], it[2]==='d' && rand()<.5 ? 'rare' : null];
  }

  function chooseInnerUnforgivable(c){
    let l = INNER_UNFORGIVABLES.map(x=>x.slice());
    if(/いじめられた/.test(String(c.pastUpbringing||''))) l=l.map(x=>/弱い者いじめ|努力を嘲笑う/.test(x[0])?[x[0],x[1]*4]:x);
    if(/借金/.test(String(c.pastUpbringing||'')+String(c.gambleText||''))) l=l.map(x=>/金の貸し借り/.test(x[0])?[x[0],x[1]*3]:x);
    if(/接客|店員|カフェ|アパレル|コンビニ/.test(String(c.role||''))) l=l.map(x=>/店員への横柄/.test(x[0])?[x[0],x[1]*3]:x);
    const it = innerWeighted(l);
    return [it[0], null];
  }

  const HIGH_TRAIN = ['しっかり鍛えている（中級）','細マッチョ仕上げ（絞り重視）','機能系（クロスフィット・自重上級）','フィジーク級（大会レベルの絞りと逆三角形）','パワー系（厚み重視の剛力体型）','ボディビル級（過剰な筋肥大）'];

  function applyMuscleFashion(c){
    if(!c) return;
    const high = HIGH_TRAIN.includes(c.trainingLevel);
    const heavy = /フィジーク|パワー系|ボディビル/.test(String(c.trainingLevel||''));
    c.muscleFashionNote = '';
    c.workFitNote = c.workFitNote && !/既製スーツ|鍛えた体/.test(c.workFitNote) ? c.workFitNote : '';
    if(!high) return;
    c.muscleFashionNote = heavy ? pick(['胸と肩で生地がしっかり張るサイズ感','二の腕が袖を押し上げ、上からでも体つきが分かる']) : pick(['胸まわりに程よく張りの出るサイズ感','太ももに合わせて選んだテーパードの穿きこなし']);
    if(['紺スーツ','黒スーツ','グレースーツ'].includes(c.outfitType) && heavy) c.workFitNote = '既製スーツの肩がやや窮屈そうな、上着の上からでも分かる鍛えた体';
    if(c.season==='夏' && high && ['大学生カジュアル','ストリート系','私服通学風','古着系'].includes(c.holidayOutfitType) && rand()<0.3){
      c.holidayTop = heavy ? 'タンクトップ' : 'ボディラインの出るピタT';
    }
  }

  function generateCharacter(partialMode='full', groupCtx=null){
    const fixed = groupCtx ? {} : getFixed();
    if(FRIEND_CTX){ if(FRIEND_CTX.age) fixed.age = FRIEND_CTX.age; if(FRIEND_CTX.nationality) fixed.nationality = FRIEND_CTX.nationality; if(FRIEND_CTX.season) fixed.season = FRIEND_CTX.season; }
    const initial = getInitial();
    const rareMode = partialMode === 'rare';
    const base = current && partialMode !== 'full' && partialMode !== 'rare' ? {...current} : {};
    // 手順2b: 層2は顔立ちを決めない。CFG.face(即席が決めた顔立ち)を流し込む。
    // 削除ではなく注入。偶然側は facePreset や hairStyle を服装・雰囲気・レア判定の
    // 重みに使うので、消すと人物の筋が通らなくなる。
    // pickFace / pickHair は、渡されなかったときだけ動く保険になる。
    Object.assign(base, CFG.face || {});
    // 人物像の手直し。画面で選び直した値をここから流す。
    // base.X は99キーで見られているので、たいていの項目がこれで固定できる
    Object.assign(base, CFG.person || {});
    if(CFG.strictFace){
      const miss = ['facePreset','faceLine','eyelid','eyeShape','nose','lips','skin',
        'hairStyle','hairColor','glasses','facialHair'].filter(k => base[k] == null);
      if(miss.length) throw new Error('層2に顔立ちが渡されていない: ' + miss.join(', '));
    }
    let age = Number(fixed.age || base.age || (groupCtx ? Math.min(45, Math.max(18, Number(groupCtx.ageCenter) + rnd(-3,3,1))) : chooseAge(initial.ageMin || 20, initial.ageMax || 32)));
    const nationality = fixed.nationality || initial.nationality || base.nationality || (groupCtx && rand()<0.8 ? groupCtx.nationality : pick(pools.nationalities));
    const ethnicity = fixed.ethnicity || initial.ethnicity || base.ethnicity || defaultEthnicityForNationality(nationality);
    const mbti = fixed.mbti || base.mbti || (groupCtx ? weighted(groupCtx.mbtiWeights) : pick(pools.mbtis));
    const vibe = fixed.vibe || (initial.vibe && initial.vibe !== 'ランダム' ? initial.vibe : (base.vibe || (groupCtx && rand()<0.6 ? groupCtx.vibe : chooseVibeByMbti(mbti, age))));
    const eraYear = (FRIEND_CTX && FRIEND_CTX.eraYear) || initial.eraYear || '2026';
    const era = eraProfile(eraYear);
    const season = fixed.season || base.season || ((initial.season && initial.season !== 'ランダム') ? initial.season : pick(['春','夏','秋','冬']));
    const profile = vibeProfile(vibe, age);
    const gapMode = rand() < 0.15;
    let role = FRIEND_CTX ? (FRIEND_CTX.role || chooseRoleByMbti(age, vibe, mbti, eraYear, gapMode)) : (base.role || (initial.occupation && initial.occupation !== 'ランダム' ? initial.occupation : chooseRoleByMbti(age, vibe, mbti, eraYear, gapMode)));
    if(nationality && nationality!=='日本' && /国鉄職員|鉄道職員|自衛官|人力車の車夫|僧侶|寿司職人/.test(role)) role = pick(['営業職','ITエンジニア','カフェ店員','工場勤務','大学生']);
    const holidayPersona = !!(VIBE_OCC[vibe] && VIBE_OCC[vibe].bad.includes(role));
    const occRowForAge = OCCUPATIONS.find(o=>o[0]===role);
    if(occRowForAge && !base.age){
      const aLo = occRowForAge[4] || 18, aHi = occRowForAge[5] || 80;
      if(age < aLo || age > aHi) age = FRIEND_CTX ? Math.min(aHi, Math.max(aLo, age)) : rnd(aLo, aHi, 1);
    }
    const sportName = fixed.sportName || base.sportName || chooseSport(role, eraYear);
    const sportsHistoryArr = base.sportsHistory || generateSportsHistory(age, role, sportName, initial.sportsBodyInfluence);
    const trainingLevel = fixed.trainingLevel || base.trainingLevel || ((initial.trainingMode && initial.trainingMode !== 'ランダム') ? initial.trainingMode : chooseTrainingLevel({eraYear, age, role, sportsHistory: sportsHistoryArr}));
    const heightAvgBase = avgHeight(nationality, eraYear);
    const occHeightShift = (role === 'モデル' ? 7 : 0) + (sportName === 'バスケットボール' ? 8 : sportName === 'バレーボール' ? 7 : 0);
    const sportsHeightShift = role === 'プロスポーツ選手' ? 0 : (h => { let sh=0; for(const x of h){ if(!x.strength) continue; if(/バスケットボール|バレーボール/.test(x.name)) sh += Math.min(3, x.strength); if(/体操/.test(x.name)) sh -= Math.min(2, x.strength); } return Math.round(sh); })(sportsHistoryArr);
    const heightBaseShift = initial.heightBase === '高めベース（+6cm）' ? 6 : initial.heightBase === '長身多めベース（+10cm）' ? 10 : 0;
    const height = Number(base.heightRaw || pickHeightAround(heightAvgBase + heightBaseShift + occHeightShift + ({'北欧系':3,'白人系':2,'スラブ系':2,'黒人系':2,'東南アジア系':-2,'南アジア系':-1}[ethnicity]||0) + sportsHeightShift - (age >= 70 ? 1 : 0)));
    const sd1 = fixed.skinDetail || (base.skinDetail ? String(base.skinDetail).split('＋')[0] : null) || chooseSkinDetail(age, vibe, role, gapMode);
    const sd2 = fixed.skinDetail2 || base.skinDetail2 || (base.skinDetail && String(base.skinDetail).includes('＋') ? String(base.skinDetail).split('＋')[1] : null) || (sd1 === 'なし（クリアな肌）' ? 'なし（クリアな肌）' : chooseSkinDetail(age, vibe, role, gapMode, [sd1], true));
    const occInfluence = initial.occInfluence || '服装・場面・体型に反映';
    const occFull = occInfluence === '服装・場面・体型に反映';
    const occupationMode = holidayPersona ? '休日' : (occFull ? (rand() < 0.65 ? '勤務帰り' : '休日') : '');
    const occOutfitW = occFull ? occupationOutfitWeights(role) : null;
    const occBodyW = occFull ? occupationBodyWeights(role) : null;
    const occFaceW = (occFull && !gapMode) ? occupationFaceWeights(role) : null;
    const occHairW = (occFull && !gapMode) ? occupationHairWeights(role) : null;
    const identityVibe = ['ブサイク系','ホスト系','おじさん系','ヤンキー系','ギャル男系','韓国風'].includes(vibe);
    const userVibeFlag = !!(fixed.vibe || (initial.vibe && initial.vibe !== 'ランダム'));
    const eraMult = userVibeFlag ? 1 : 2;
    const eraBodyMult = userVibeFlag ? 1 : 1.5;
    const bodyType = fixed.bodyType || base.bodyType || (()=>{
      let entries = profile ? profile.bodyTypes.map(([v,w])=>[v,w]) : pools.bodyTypes.map(v=>[v,1]);
      if(!profile){ const hb = chooseBody(height, rareMode); const f = entries.find(x=>x[0]===hb); if(f) f[1]+=3; }
      if(['消防士','警察官','自衛官','救急隊員','防衛大学校学生'].includes(role)){
        // 採用時の体力試験と日常訓練があるため、やせ型はほぼ存在しない
        entries = entries.map(([v,w])=>{
          if(/ガリガリ|華奢|線が細い|痩せ型|やせ型|見るからに痩せた/.test(v)) return [v, 0]; // 制服職は完全排除
          if(v === '細身') return [v, w * 0.2]; // 制服職の細身は「引き締まった」側で表現
          if(/マッチョ|筋肉質/.test(v)) return [v, w * 2];
          if(/がっしり/.test(v)) return [v, w * 1.5];
          return [v, w];
        });
      }
      if(occBodyW){
        (occBodyW.weights||[]).forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
        if(occBodyW.exclude){ occBodyW.exclude.forEach(v=>{ const f = entries.find(x=>x[0]===v); if(f) f[1] = 0.5; else entries.push([v, 0.5]); }); }
      }
      if(sportName && sportName !== 'なし' && SPORT_BODY[sportName]){
        SPORT_BODY[sportName].forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
      }
      if(role !== 'プロスポーツ選手'){
        sportsHistoryArr.forEach(x=>{
          if(!x.strength) return;
          const m = SPORT_BODY[x.name];
          if(m) m.forEach(([v,w])=>{ const add = w * Math.min(1, x.strength/3); const f = entries.find(e=>e[0]===v); if(f) f[1]+=add; else entries.push([v, add]); });
        });
      }
      if(TRAINING_BODY[trainingLevel]){
        TRAINING_BODY[trainingLevel].forEach(([v,w])=>{ const f = entries.find(e=>e[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
      }
      if(TRAINING_EXCL[trainingLevel]){
        const kept = entries.filter(([v])=>!TRAINING_EXCL[trainingLevel].includes(v));
        if(kept.length) entries = kept;
      }
      if(age >= 65){
        const MUSCLE = ['筋肉質','がっしり体型','引き締まったスポーツ体型','ラグビー選手体型','細マッチョ','痩せマッチョ'];
        if(!occBodyW) entries = entries.map(([v,w])=>MUSCLE.includes(v) ? [v, Math.max(0.5, w*0.5)] : [v,w]);
        [['標準体型',2],['やせ型',1],['腹だけぽっちゃり',2],['ビール腹',1]].forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
      }
      let finalEntries = eraAdjustEntries(entries, era, 'bodyTypes', null, eraBodyMult);
      if(TRAINING_EXCL[trainingLevel]){
        const kept = finalEntries.filter(([v])=>!TRAINING_EXCL[trainingLevel].includes(v));
        if(kept.length) finalEntries = kept;
      }
      return weighted(finalEntries);
    })();
    const weight = calcWeight(height, bodyType) + Math.round(trainingWeightAdj(trainingLevel) * Math.pow(height/100, 2));
    const ageAppearance = base.ageAppearance || ageAppearanceByAge(age);
    const ethnicFace = faceByEthnicity(ethnicity);
    const pickFace = () => {
      let entries = eraAdjustEntries(profile ? profile.facePresets.map(([v,w])=>[v,w]) : pools.facePresets.map(v=>[v, v==='普通顔'?5:2]), era, 'faces', 'excludeFaces', eraMult);
      if(occFaceW && !identityVibe){ occFaceW.forEach(([v,w])=>{ const ww = w*2; const f = entries.find(x=>x[0]===v); if(f) f[1]+=ww; else entries.push([v,ww]); }); }
      if(gapMode && !identityVibe){ pools.facePresets.forEach(v=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=1; else entries.push([v,1]); }); }
      if(age >= 55){ entries = entries.filter(([v])=>!['やりらふぃー系','韓国アイドル風','平成アイドル風','親しみやすい大学生系'].includes(v)); [['おじさん系',4],['落ち着いた大人系',4],['昭和顔（濃い顔立ち）',2]].forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); }); }
      return weighted(entries);
    };
    let rawFacePreset = fixed.facePreset || base.facePreset || pickFace();
    if(groupCtx?.avoidFaces?.length && !fixed.facePreset && !base.facePreset){
      for(let i=0;i<3 && groupCtx.avoidFaces.includes(rawFacePreset);i++) rawFacePreset = pickFace();
    }
    let facePreset = (CFG.face && CFG.face.facePreset) ? rawFacePreset
      : chooseFaceAgeCompatible(rawFacePreset, ageAppearance, vibe, age);  // 決定H: 顔は画像が正。年齢で選び直さない
    {
      const NG = [
        [/クール系|ミステリアス系|紳士|文学/, /やりらふぃー系|ギャル男/],
        [/やりらふぃー|ギャル男|陽キャ/, /文学|紳士/]
      ];
      let guard = 0;
      while(guard++ < 5 && NG.some(([v2,f2]) => v2.test(String(vibe||'')) && f2.test(String(facePreset||'')))){
        facePreset = chooseFaceAgeCompatible(pickFace(), ageAppearance, vibe, age);
      }
    }
    const pickOutfitType = (useOcc) => {
      let entries = [];
      const add = (v,w) => { if(!pools.outfitTypes.includes(v)) return; const f = entries.find(e=>e[0]===v); if(f) f[1]+=w; else entries.push([v,w]); };
      if(profile) profile.outfits.forEach(([v,w])=>add(v, useOcc ? w : w*2));
      mbtiProfile(mbti).outfits.forEach(([v,w])=>add(v, useOcc ? w : w*2));
      if(useOcc && occOutfitW) occOutfitW.forEach(([v,w])=>add(v, w*3));
      if(useOcc){
        const block = occOutfitBlocklist(role);
        const filtered = entries.filter(([v])=>!block.includes(v));
        if(filtered.length) entries = filtered;
        else return (occOutfitW && occOutfitW[0] && occOutfitW[0][0]) || '社会人カジュアル';
      }
      const ep = eraProfile(eraYear);
      (ep.outfits || []).forEach(([v,w])=>add(v, w*2));
      if(Number(eraYear) < 1946){
        const allow = (ep.outfits || []).map(([v])=>v);
        const kept = entries.filter(([v])=>allow.includes(v));
        entries = kept.length ? kept : (ep.outfits || []).map(([v,w])=>[v,w]);
      }
      if(!entries.length) return chooseOutfitByMbti(age, rareMode, vibe, mbti);
      return weighted(entries);
    };
    let outfitType = fixed.outfitType || base.outfitType || ((OCC_WORK_STYLES(role, Number(eraYear)||2026) ? true : rand()<0.75) && roleWorkType(role, Number(eraYear)||2026, mbti)) || pickOutfitType(true); // V4.6.1: 職業別表がある職業は常に表から抽選
    if(occFull && (UNIFORM_WORKWEAR[role] || UNIFORM_VARIANTS[role]) && !fixed.outfitType && !base.outfitType) outfitType = '職業制服';
    let holidayOutfitType = base.holidayOutfitType || pickOutfitType(false);
    if(holidayOutfitType === outfitType){ const retry = pickOutfitType(false); if(retry !== outfitType) holidayOutfitType = retry; }
    if(!base.holidayOutfitType && rand()<0.35){
      const y2=Number(eraYear)||2026;
      const cand = CASUAL_NEW.filter(t=>typeInEra(t,y2));
      const wts = cand.map(t=>{
        let w=1;
        if(t==='Y2K'||t==='裏原系'||t==='きれいめストリート') w=['ストリート系','韓国風','やりらふぃー系','ギャル男系'].includes(vibe)?3:0.5;
        if(t==='お兄系') w=['ホスト系','ギャル男系','お兄系'].includes(vibe)?3:0.3;
        if(t==='オールブラック・ミニマル') w=['クール系','ミステリアス系','モード系'].includes(vibe)?3:0.5;
        if(t==='シティボーイ'||t==='フレンチカジュアル'||t==='ノームコア') w=['塩顔系','清楚系','きれいめ系','サブカル系'].includes(vibe)?2.5:1;
        if(t==='ブリティッシュトラッド') w=['紳士系','メガネ知的系'].includes(vibe)?3:0.4;
        if(t==='サーフ系') w=['アウトドア系','ワイルド系','スポーツ系'].includes(vibe)?2.5:0.6;
        if(t==='和カジュアル') w=0.35;
        if(t==='テックウェア') w=['ストリート系','オタク系','サブカル系'].includes(vibe)?2:0.6;
        if(age>=38 && /Y2K|裏原|お兄|渋谷/.test(t)) w*=0.15;
        return [t,w];
      });
      if(wts.length) holidayOutfitType = weighted(wts);
    }
    let holidayGapSuit = base.holidayGapSuit || false;
    if(!base.holidayOutfitType){
      const HOLIDAY_BAN = ['紺スーツ','黒スーツ','グレースーツ','三つ揃いスーツ','学生服（学ラン）','学生服（ブレザー）'];
      if(HOLIDAY_BAN.includes(holidayOutfitType)){
        if(/スーツ/.test(holidayOutfitType) && rand() < 0.03){ holidayGapSuit = true; }
        else holidayOutfitType = rand() < 0.6 ? 'きれいめカジュアル' : 'ジャケットスタイル';
      }
    }
    const STYLE_SINCE = {'スキンフェード':2016,'ローフェード':2016,'フェード×ツイストスパイラル':2019,'バーバースタイル（七三フェード）':2015,'クロップスタイル':2018,'マッシュウルフ':2020,'ソフトモヒカン':2003,'アシメショート':2008};
    const OCC_HAIRSTYLE = (()=>{
      const M = {};
      const set = (list, boost, damp) => list.forEach(o=>{ M[o] = {boost, damp}; });
      set(['美容師','アパレル店員','古着屋店主','モデル'], [['スキンフェード',4],['フェード×ツイストスパイラル',4],['センターパート',3],['韓国風センターパート',3],['マッシュウルフ',2]], null);
      set(['銀行員','公務員','営業職','商社勤務','ホテルスタッフ','経理・事務職','コンサルタント','不動産営業'], [['ビジネス短髪',6],['ソフトツーブロック',4],['ローフェード',3],['短髪',3],['サイドパート',2]], ['波巻きパーマ','スパイラルパーマ','ツイストパーマ','マンバン','フェード×ツイストスパイラル','マッシュウルフ']);
      set(['自衛官','防衛大学校学生'], [['坊主',5],['短髪',5]], null);
      M['自衛官'].only = M['防衛大学校学生'].only = ['坊主','短髪','ビジネス短髪','ソフトツーブロック','アップバング'];
      set(['消防士','警察官','救急隊員'], [['短髪',4],['ソフトモヒカン',2],['アップバング',1]], ['波巻きパーマ','スパイラルパーマ','マンバン','ロング寄りミディアム','マッシュウルフ','フェード×ツイストスパイラル']);
      set(['大工','自動車整備士','電気工事士','工場勤務','漁師','農家','配送ドライバー'], [['ソフトモヒカン',2],['短髪',3],['アップバング',1]], null);
      set(['ITエンジニア','Webデザイナー','ゲーム開発者','アプリ開発者','イラストレーター','編集者'], [['マッシュ',3],['センターパート',2]], null);
      set(['バーテンダー','喫茶店マスター'], [['バーバースタイル（七三フェード）',2],['七三分け',2],['サイドパート',2]], null);
      return M;
    })();
    const pickHair = () => {
      let entries = eraAdjustEntries(profile ? profile.hairStyles.map(([v,w])=>[v,w]) : pools.hairStyles.map(v=>[v,1]), era, 'hairStyles', 'excludeHair');
      const y = Number(eraYear) || 2026;
      [['スキンフェード',2],['ローフェード',1.5],['バーバースタイル（七三フェード）',1],['クロップスタイル',1],['フェード×ツイストスパイラル',1.5],['マッシュウルフ',1.5],['ソフトモヒカン',1],['アシメショート',1]].forEach(([v,w])=>{
        if(y >= (STYLE_SINCE[v] || 0)){ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); }
      });
      const oh = (!gapMode && role) ? OCC_HAIRSTYLE[role] : null;
      if(oh){
        (oh.boost||[]).forEach(([v,w])=>{ if(STYLE_SINCE[v] && y < STYLE_SINCE[v]) return; const f = entries.find(x=>x[0]===v); if(f) f[1]+=w*2; else entries.push([v,w*2]); });
        if(oh.damp) entries = entries.map(([v,w])=>oh.damp.includes(v) ? [v, Math.max(0.1, w*0.2)] : [v,w]);
        if(oh.only){ const kept = entries.filter(([v])=>oh.only.includes(v)); if(kept.length) entries = kept; }
      }
      return weighted(entries);
    };
    let hairStyle = base.hairStyle || pickHair();
    if(groupCtx?.avoidHair?.length && !base.hairStyle){
      for(let i=0;i<3 && groupCtx.avoidHair.includes(hairStyle);i++) hairStyle = pickHair();
    }
    const hairColor = base.hairColor || (()=>{
      let entries = eraAdjustEntries(profile ? profile.hairColors.map(([v,w])=>[v,w]) : pools.hairColors.map(v=>[v,1]), era, 'hairColors', 'excludeHairColors');
      const merge = (arr) => arr && arr.forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
      const ew = (ETHNIC_HAIR_WEIGHTS[ethnicity] || ETHNIC_HAIR_WEIGHTS['日本人']).map(([v,w])=>[v, identityVibe ? Math.max(1, Math.round(w/2)) : w]);
      merge(ew);
      const ASIAN_FOR_OCC = ['日本人','韓国系','中国系','東アジア系','東南アジア系','中央アジア系','ミックス'];
      if(!(STRICT_HAIR_OCC.includes(role) && !ASIAN_FOR_OCC.includes(ethnicity))) merge(occHairW);
      if(ethnicity === '白人系' || ethnicity === '北欧系'){ const BF = ['黒','ブルーブラック','ネイビーブラック','黒に近いダークブラウン']; entries = entries.map(([v,w])=>BF.includes(v) ? [v, Math.max(0.4, w*0.3)] : [v,w]); }
      if(ethnicity === 'スラブ系'){ const BF = ['黒','ブルーブラック','ネイビーブラック']; entries = entries.map(([v,w])=>BF.includes(v) ? [v, Math.max(0.4, w*0.35)] : [v,w]); }
      const ASIAN_ETH = ['日本人','韓国系','中国系','東アジア系','東南アジア系','中央アジア系','ミックス'];
      const DYE_COLORS = ['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','オレンジブラウン'];
      const eraExAll = era.excludeHairColors || [];
      const eraExHair = ASIAN_ETH.includes(ethnicity) ? eraExAll : eraExAll.filter(v=>DYE_COLORS.includes(v));
      if(eraExHair.length){ const kept = entries.filter(([v])=>!eraExHair.includes(v)); if(kept.length) entries = kept; }
      const GRAY = ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'];
      if(age < 40){ entries = entries.filter(([v])=>!GRAY.includes(v)); }
      else if(age < 50){ entries = entries.filter(([v])=>v!=='ごま塩頭' && v!=='ほぼ白髪'); merge([['白髪まじり',2]]); }
      else if(age < 60){ entries = entries.filter(([v])=>v!=='ほぼ白髪'); merge([['白髪まじり',3],['ロマンスグレー',3],['ごま塩頭',1]]); }
      else if(age < 70){ merge([['ロマンスグレー',4],['ごま塩頭',4],['白髪まじり',3],['ほぼ白髪',1]]); entries = entries.map(([v,w])=>GRAY.includes(v)?[v,w]:[v,Math.max(0.5, w*0.45)]); }
      else { merge([['ごま塩頭',8],['ほぼ白髪',8],['ロマンスグレー',5],['白髪まじり',2]]); entries = entries.map(([v,w])=>GRAY.includes(v)?[v,w]:[v,Math.max(0.25, w*0.15)]); }
      return weighted(entries);
    })();
    const bodyHair = generateBodyHair(age, ethnicity, vibe, mbti, eraYear);
    const coord = generateCoordinatedOutfit(outfitType, age, rareMode, nationality, vibe, eraYear, season, mbti);
    const hCoord = generateCoordinatedOutfit(holidayOutfitType, age, rareMode, nationality, vibe, eraYear, season, mbti);
    const uniform = occFull ? (chooseUniformVariant(role, season, eraYear) || UNIFORM_WORKWEAR[role]) : null;
    if(uniform && !fixed.outfitType && !base.outfitType){
      coord.outfitBrand = '支給品・制服';
      coord.jacket = (uniform[8] && season === '冬') ? uniform[8] : 'なし';
      coord.top = uniform[2];
      coord.bottom = uniform[3];
      coord.shoes = uniform[4];
      coord.headwear = uniform[7] || '';
      if(['消防士','救急隊員'].includes(role)){
        const FIRE_SHOES = {'編み上げ半長靴':'黒革の編み上げ半長靴（前面レースアップ＋サイドファスナー、履き口にクッション入りのベルクロベルト、かかと側にオレンジの反射材、丸みのある先芯入りつま先、滑りにくいラバーソール）','制式短靴（紳士靴型）':'黒の制式短靴（紳士靴型：甲にストラップと小さな金色の飾り金具のあるローファー風、通気性のあるヒール付きラバーソール）','制式短靴（スリッポン型）':'黒の制式短靴（スリッポン型：飾りのないプレーンな甲、かかとに反射材の付いた引き手ループ、厚めの滑りにくいラバーソール）'};
        const FIRE_HATS = {'紺アポロキャップ':'紺のアポロキャップ型活動帽（正面に金色の英字刺繍「ASHIKUSA FIRE DEPT.」と金色の帽章のみ。漢字の刺繍は入れない）','銀色の防火ヘルメット':'銀色の防火ヘルメット（文字なし）','白の救助ヘルメット':'白の救助ヘルメット（黒のあご紐付き。ゴーグルを上に上げて装着した状態も可。文字なし）'};
        const sp = String(initial.fireShoePref || (base && base.fireShoePref) || '自動');
        const hp = String(initial.fireHatPref || (base && base.fireHatPref) || '自動');
        if(FIRE_SHOES[sp] && !/訓練軽装/.test(String(uniform[0]))) coord.shoes = FIRE_SHOES[sp];
        if(FIRE_HATS[hp] && !/訓練軽装/.test(String(uniform[0]))) coord.headwear = FIRE_HATS[hp];
      }
      if(['消防士','警察官','自衛官','救急隊員','防衛大学校学生'].includes(role) && !/訓練軽装/.test(String(uniform[0]))){
        // 職務時の靴下：官品支給／自前の機能性ソックス（実態準拠）
        if(role === '警察官'){
          if(rand() < 0.4){
            const five = rand() < 0.5; // 自前層は5本指と厚手パイルが人気を二分
            coord.sockBrand = '自前の機能性ソックス';
            coord.sockType = five ? '5本指の機能ソックス（クルー丈）' : '先丸の厚手パイルソックス（クルー丈）';
            coord.sockShape = five ? '5本指形状' : '先丸・厚手パイル編み';
            coord.sockMaterial = '吸汗速乾の機能繊維混（つま先・かかと補強）';
          } else {
            coord.sockBrand = '官品支給';
            coord.sockType = '無地のクルー丈ソックス';
            coord.sockShape = '標準的な薄手〜中厚（厚手パイルではない）';
            coord.sockMaterial = 'コストを抑えた綿ポリエステル混';
          }
          coord.sockColor = pick(['黒','黒','紺']);
        } else if(role === '防衛大学校学生'){
          const r2 = rand();
          if(r2 < 0.4){ coord.sockBrand='官品支給'; coord.sockType='無地のクルー丈ソックス'; coord.sockShape='標準的な薄手〜中厚（厚手パイルではない）'; coord.sockMaterial='コストを抑えた綿ポリエステル混'; }
          else if(r2 < 0.6){ coord.sockBrand='私物'; coord.sockType='リブ編みのクルー丈ソックス'; coord.sockShape='リブ編み'; coord.sockMaterial='綿混'; }
          else if(r2 < 0.8){ coord.sockBrand='私物'; coord.sockType='パイルソックス（クルー丈）'; coord.sockShape='先丸・パイル編み'; coord.sockMaterial='綿混パイル'; }
          else if(r2 < 0.9){ coord.sockBrand='私物'; coord.sockType='アンクルソックス'; coord.sockShape='先丸・くるぶし上まで'; coord.sockMaterial='綿混'; }
          else { coord.sockBrand='自前の機能性ソックス'; coord.sockType='行軍用の5本指ソックス（ハイソックス丈）'; coord.sockShape='5本指形状・超肉厚'; coord.sockMaterial='抗菌防臭・吸汗速乾（つま先・かかと補強）'; }
          coord.sockColor = pick(['黒','黒','紺']);
        } else if(role === '自衛官'){
          const own = rand() < 0.6;
          if(own){
            const five = rand() < 0.4;
            coord.sockBrand = '自前の機能性ソックス';
            coord.sockType = five ? '行軍用の5本指ソックス（ハイソックス丈）' : '先丸の厚手パイルソックス（クルー〜ハイソックス丈）';
            coord.sockShape = five ? '5本指形状・超肉厚' : '先丸・厚手パイル編み';
            coord.sockMaterial = '抗菌防臭・吸汗速乾（つま先・かかと補強、半長靴の履き口に擦れない長め丈）';
          } else {
            coord.sockBrand = '官品支給';
            coord.sockType = '無地のクルー丈ソックス';
            coord.sockShape = '標準的な中厚';
            coord.sockMaterial = 'コストを抑えた綿ポリエステル混';
          }
          coord.sockColor = rand() < 0.3 ? 'OD（オリーブ）' : '黒';
        } else {
          // 消防士・救急隊員：規定が緩く自由度が高い
          const src = rand();
          coord.sockBrand = src < 0.5 ? '自前の機能性ソックス' : src < 0.8 ? 'ワークショップの軍足系（3足組）' : '官品支給';
          const tp = rand();
          if(tp < 0.5){ coord.sockType = '先丸の厚手パイルソックス（クルー丈）'; coord.sockShape = '先丸・厚手パイル編み（出動時に即座に履ける）'; }
          else if(tp < 0.75){ coord.sockType = 'アンクルソックス'; coord.sockShape = '先丸・くるぶし上まで'; }
          else if(tp < 0.9){ coord.sockType = '無地のクルー丈ソックス'; coord.sockShape = '標準的な中厚'; }
          else { coord.sockType = '5本指の機能ソックス（クルー丈）'; coord.sockShape = '5本指形状'; }
          coord.sockMaterial = season === '夏' ? '吸汗速乾の通気性素材' : season === '冬' ? '保温性のある厚手素材' : '吸汗速乾の機能繊維混';
          coord.sockColor = pick(['黒','黒','紺','白','グレー']);
        }
      }
    }
    const PREWAR_COORD = {
      '書生風スタイル（着物＋袴＋学帽）':{jacket:'なし', top:'絣の着物', bottom:'袴', shoes:'下駄'},
      '着物と羽織':{jacket:'羽織', top:'無地の着物', bottom:'着物の裾', shoes:'草履'},
      '国民服風':{jacket:'なし', top:'国民服の上衣', bottom:'国民服のズボン', shoes:'編上げ靴'}
    };
    const applyPrewar = (co, type) => {
      const p = PREWAR_COORD[type];
      if(!p) return;
      co.outfitBrand = '仕立て・既製品'; co.jacket = p.jacket; co.top = p.top; co.bottom = p.bottom; co.shoes = p.shoes;
      co.sockBrand = '仕立て'; co.sockType = '足袋'; co.sockShape = '足袋型'; co.sockMaterial = '綿'; co.sockColor = '白';
    };
    applyPrewar(coord, outfitType);
    applyPrewar(hCoord, holidayOutfitType);
    if(Number(eraYear) < 1950){
      if(!PREWAR_COORD[outfitType] && !uniform) coord.outfitBrand = '仕立て・既製品';
      if(!PREWAR_COORD[holidayOutfitType]) hCoord.outfitBrand = '仕立て・既製品';
    }
    // 雲駄の事実修正：革靴ではなく雪駄型サンダル。靴下は素足か足袋型のみ
    const fixUnda = co => {
      if(!co) return;
      const isUnda = /雲駄/.test(String(co.shoesBrand||'')) || /雲駄/.test(String(co.shoes||''));
      if(!isUnda) return;
      const model = rand() < 0.5
        ? '雲駄の雪駄型サンダル「LEATHER SUMI」（黒革の天板に黒スエードの太い鼻緒、エアクッション入りの黒ソール）'
        : '雲駄の雪駄型サンダル「TOUGH BLACK」（畳調の織り天板に黒の太い鼻緒、白のミッドソールと黒のアウトソール）';
      co.shoes = model; co.shoesBrand = '雲駄';
      if(rand() < 0.5){
        co.sockBrand = '靴下屋'; co.sockType = '足袋型ソックス'; co.sockShape = '親指だけが分かれた2本指構造';
        co.sockMaterial = '綿混'; co.sockColor = pick(['黒','白','生成り']);
      } else {
        co.sockBrand = 'なし'; co.sockType = 'なし（素足で履く）'; co.sockShape = '—'; co.sockMaterial = '—'; co.sockColor = '—';
      }
    };
    fixUnda(coord); fixUnda(hCoord);
    const eraUw = (initial.mainWearMode === '時代に合った下着の種類') ? generateEraUnderwear(eraYear) : null;
    const c = {
      id: uniqId(),
      name: base.name || nameByNationality(nationality, eraYear, age),
      age, eraYear, nationality, ethnicity, vibe, mbti, role,
      heightRaw: height,
      height: `${height}cm`, weight: `${weight}kg`, bodyType,
      footSize: base.footSize || footFromHeight(height, ethnicity),
      measurementA: base.measurementA ?? drawProfileMeasurement('A'),
      measurementB: base.measurementB ?? null, // Aから導出（ensureProfileMeasurementsで B = A×1.57＋0〜1）
      measurementC: base.measurementC || drawProfileMeasurement('C'),
      footShape: base.footShape || pick(pools.footShapes),
      facePreset,
      ageAppearance,
      faceLine: base.faceLine || (()=>{ let v = pick(pools.faceLines); if(groupCtx?.avoidFaceLines?.length){ for(let i=0;i<3 && groupCtx.avoidFaceLines.includes(v);i++) v = pick(pools.faceLines); } return v; })(),
      eyes: base.eyes || (()=>{ let v = ethnicFace.eyes || pick(pools.eyes); if(groupCtx?.avoidEyes?.length){ for(let i=0;i<3 && groupCtx.avoidEyes.includes(v);i++) v = pick(pools.eyes); } return v; })(), tearBags: base.tearBags || fixed.tearBags || pick(pools.tearBags), eyebrow: base.eyebrow || fixed.eyebrow || chooseEyebrow(vibe), eyebrowGroom: base.eyebrowGroom || weighted([['自然なまま',5],['整えた形',3],['きっちりライン取り',1],['剃り込み跡あり',0.5]]), eyebrowGap: base.eyebrowGap || weighted([['眉間は近め',1.5],['標準的な眉間',5],['眉間は離れ気味',1.5]]), eyelid: base.eyelid || fixed.eyelid || chooseEyelid(nationality, ethnicity), eyeShape: base.eyeShape || fixed.eyeShape || chooseEyeShape(), eyeBalance: base.eyeBalance || fixed.eyeBalance || chooseEyeBalance(vibe), eyelash: base.eyelash || fixed.eyelash || chooseEyelash(), nose: base.nose || (()=>{ const v = pick(pools.nose); const pref = {'白人系':'高い鼻筋の通った鼻','北欧系':'高い鼻筋の通った鼻','スラブ系':'高い鼻筋の通った鼻','黒人系':'小鼻のしっかりした存在感のある鼻','中東系':'高い鼻筋の通った鼻'}[ethnicity]; return (pref && pools.nose.includes(pref) && rand()<0.4) ? pref : v; })(), mouth: base.mouth || (()=>{ const cheer=['やりらふぃー系','元気系','ギャル男系','陽キャ大学生系','スポーツ系','爽やか系'].includes(vibe); const cool=['クール系','ミステリアス系','紳士系'].includes(vibe); return weighted(pools.mouth.map(m=>[m, /笑顔|笑い/.test(m)?(cheer?8:cool?0.8:3):/真顔|無表情/.test(m)?(cheer?0.3:cool?5:2):2])); })(), lips: base.lips || fixed.lips || weighted([[pools.lips[0],2],[pools.lips[1],3],[pools.lips[2],6],[pools.lips[3],3],[pools.lips[4],2],[pools.lips[5],2.5],[pools.lips[6],2],[pools.lips[7],2]]), mouthPos: base.mouthPos || fixed.mouthPos || weighted([[pools.mouthPos[0],6],[pools.mouthPos[1],2.5],[pools.mouthPos[2],2.5],[pools.mouthPos[3],2],[pools.mouthPos[4],2],[pools.mouthPos[5],1.5]]), faceSpacing: base.faceSpacing || fixed.faceSpacing || chooseFaceSpacing(vibe), faceRatio: base.faceRatio || fixed.faceRatio || weighted([[pools.faceRatios[0],6],[pools.faceRatios[1],3],[pools.faceRatios[2],2.5],[pools.faceRatios[3],2],[pools.faceRatios[4],2],[pools.faceRatios[5],2],[pools.faceRatios[6],1.5],[pools.faceRatios[7],1.5]]), faceAsym: base.faceAsym || fixed.faceAsym || weighted([[pools.faceAsyms[0],3],[pools.faceAsyms[1],6],[pools.faceAsyms[2],5],[pools.faceAsyms[3],2],[pools.faceAsyms[4],2],[pools.faceAsyms[5],2],[pools.faceAsyms[6],1],[pools.faceAsyms[7],1],[pools.faceAsyms[8],1]]), skin: base.skin || chooseSkin(role, season, sportName, sportsHistoryArr, ethnicFace.skin), skinDetail: sd1, skinDetail2: sd2, facialHair: base.facialHair || chooseFacialHair(age, vibe),
      hairStyle, hairColor,
      bodyHairOverall: base.bodyHairOverall || bodyHair.bodyHairOverall,
      chestHair: base.chestHair || bodyHair.chestHair,
      abdominalHair: base.abdominalHair || bodyHair.abdominalHair,
      lowerAbdomenHair: base.lowerAbdomenHair || bodyHair.lowerAbdomenHair,
      armHair: base.armHair || bodyHair.armHair,
      shinHair: base.shinHair || bodyHair.shinHair,
      thighHair: base.thighHair || bodyHair.thighHair,
      armpitHair: base.armpitHair || bodyHair.armpitHair,
      handFingerHair: base.handFingerHair || bodyHair.handFingerHair,
      footToeHair: base.footToeHair || bodyHair.footToeHair,
      backHair: base.backHair || bodyHair.backHair,
      outfitType, outfitBrand: base.outfitBrand || coord.outfitBrand, jacket: base.jacket || coord.jacket, top: base.top || coord.top, bottom: base.bottom || coord.bottom,
      boxerBrand: base.boxerBrand || pick(eraBrandList(pools.boxerBrands, eraYear, '指定しない')), boxerColor: base.boxerColor || pick(pools.boxerColors), baseWearType: base.baseWearType || fixed.baseWearType || weighted([['ボクサーパンツ',6],['ショートショーツ',2],['スポーツスパッツ',2]]), bangs: base.bangs || weighted(pools.bangs.map((v,i)=>[v, i===0?8:1.2])), hairFinish: base.hairFinish || weighted(pools.hairFinishes.map((v,i)=>[v, i===0?7:1.2])), hairVolume: base.hairVolume || weighted(pools.hairVolumes.map((v,i)=>[v, i===0?7:1.5])), bodyAsym: base.bodyAsym || weighted(BODY_ASYMS), posture: base.posture || (()=>{ let e = POSTURES.map(x=>x.slice()); if(age >= 55) e = e.map(([v,w])=>[v, v==='やや猫背気味'? w*2.2 : v==='背筋の伸びた立ち姿'? w*0.7 : w]); return weighted(e); })(),
      glasses: base.glasses || chooseGlasses(eraYear, vibe, role, age),
      holidayOutfitType, holidayGapSuit, holidayOutfitBrand: hCoord.outfitBrand, holidayJacket: hCoord.jacket, holidayTop: hCoord.top, holidayBottom: hCoord.bottom, holidayShoes: hCoord.shoes, holidaySockBrand: hCoord.sockBrand, holidaySockType: hCoord.sockType, holidaySockColor: hCoord.sockColor, holidaySockUse: hCoord.sockUse,
      accessories: base.accessories || generateAccessories({eraYear, age, role, vibe, incomeText: base.incomeText, season, outfitType, sportsHistory: sportsHistoryArr}, false),
      holidayAccessories: base.holidayAccessories || generateAccessories({eraYear, age, role, vibe, incomeText: base.incomeText, season, holidayOutfitType, sportsHistory: sportsHistoryArr, holidayShoes: hCoord.shoes, holidayBottom: hCoord.bottom}, true),
      facePresetOut: base.facePresetOut || (initial.facePresetOut || '含める'),
      snapMode: base.snapMode || (initial.snapMode || '通常（スタジオ演出）'),
      mjMode: base.mjMode || (initial.mjMode || 'OFF'),
      smileEyes: base.smileEyes || null, smileStyle: base.smileStyle || null, cheekSmile: base.cheekSmile || null, mouthCorner: base.mouthCorner || null,
      topBrand: coord.topBrand||'', bottomBrand: coord.bottomBrand||'', shoesBrand: coord.shoesBrand||'', outerBrand: coord.outerBrand||'', tie: coord.tie||'', coat: coord.coat||'', suitSilhouette: coord.silhouette||'', eraFashionNote: coord.eraNote||'', styleNote: coord.styleNote||'',
      holidayTopBrand: hCoord.topBrand||'', holidayBottomBrand: hCoord.bottomBrand||'', holidayShoesBrand: hCoord.shoesBrand||'', holidayOuterBrand: hCoord.outerBrand||'', holidayEraFashionNote: hCoord.eraNote||'', holidayStyleNote: hCoord.styleNote||'',
      occupationMode, occInfluence, holidayPersona, sportName, sportsHistory: sportsHistoryArr, trainingLevel, season, avgHeightBase: heightAvgBase, workUniform: (uniform && !fixed.outfitType && !base.outfitType) ? uniform[0] : '', workUniformEn: (uniform && !fixed.outfitType && !base.outfitType) ? uniform[1] : '', headwear: (uniform && !fixed.outfitType && !base.outfitType) ? (uniform[7] || '') : '', headwearOn: base.headwearOn !== undefined ? base.headwearOn : true, derivedMode: initial.derivedMode || '参照画像前提（簡潔版）', ikemenIndexMode: initial.ikemenIndexMode || '表示しない', bodyHairMode: initial.bodyHairMode || '詳細指定', catchphraseMode: initial.catchphraseMode || '結果画面のみ表示',
      mainWearMode: initial.mainWearMode || 'ボクサーパンツのみ', underwearType: base.underwearType || (eraUw ? eraUw.type : ''), underwearColor: base.underwearColor || (eraUw ? eraUw.color : ''),
      shoes: base.shoes || coord.shoes, sockBrand: base.sockBrand || coord.sockBrand, sockType: base.sockType || coord.sockType, sockShape: base.sockShape || coord.sockShape, sockMaterial: base.sockMaterial || coord.sockMaterial, sockColor: base.sockColor || coord.sockColor, sockUse: base.sockUse || coord.sockUse,
      personality: mbtiDescription(mbti, false),
      background: initial.background, lighting: initial.lighting, quality: initial.quality, outputType: initial.outputType, count: initial.count,
      promptLanguage: initial.promptLanguage || '日本語', promptTarget: normalizePromptTarget(initial.promptTarget) || 'ChatGPT', footDetailMode: initial.footDetailMode || '詳細', fireShoePref: base.fireShoePref || initial.fireShoePref || '自動', fireHatPref: base.fireHatPref || initial.fireHatPref || '自動', policeGearPref: base.policeGearPref || initial.policeGearPref || '標準装備', policeIdNo: base.policeIdNo || ('AP-' + rnd(100, 899, 1)), derivedDetail: base.derivedDetail || initial.derivedDetail || '簡潔（参照画像前提）', captionMode: initial.captionMode || '表記する', bioCaptionMode: base.bioCaptionMode || initial.bioCaptionMode || '入れない', promptDetail: initial.promptDetail || '自動（生成先に合わせる）', captionFields: initial.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true},
      cardStyle: initial.cardStyle || 'スタンダード', cardRarity: initial.cardRarity || 'おすすめ自動', cardTheme: initial.cardTheme || 'ネイビー', cardLayout: initial.cardLayout || '縦長カード', cardWearMode: initial.cardWearMode || 'ボクサーパンツのみ', cardEffect: initial.cardEffect || 'なし', cardFields: initial.cardFields || {name:true,age:true,era:true,height:true,weight:true,footSize:true,role:true,mbti:true,rarity:true},
      sceneIdea: buildEncounterScene({role, outfitType, vibe, nationality, ethnicity, mbti, eraYear, season, occInfluence, occupationMode}),
      createdAt: new Date().toISOString()
    };
    if(partialMode==='face' && current){ Object.assign(c, current, {id:uniqId(), nationality:c.nationality, ethnicity:c.ethnicity, vibe:c.vibe, name:nameByNationality(c.nationality, c.eraYear, c.age), role:c.role, mbti:c.mbti, personality:mbtiDescription(c.mbti,false), facePreset:c.facePreset, ageAppearance:c.ageAppearance, faceLine:c.faceLine, eyes:c.eyes, tearBags:c.tearBags, nose:c.nose, mouth:c.mouth, lips:c.lips, mouthPos:c.mouthPos, faceSpacing:c.faceSpacing, faceRatio:c.faceRatio, faceAsym:c.faceAsym, skin:c.skin, facialHair:c.facialHair, hairStyle:c.hairStyle, hairColor:c.hairColor, sceneIdea:buildEncounterScene({role:c.role, outfitType:current.outfitType, vibe:c.vibe, nationality:c.nationality, ethnicity:c.ethnicity, mbti:c.mbti, eraYear:c.eraYear, season:c.season, occInfluence:c.occInfluence, occupationMode:c.occupationMode}), createdAt:new Date().toISOString()}); }
    if(!c.smileEyes) Object.assign(c, chooseSmileTraits(c));
    { const hN=parseInt(c.height)||170, wN=parseInt(c.weight)||62;
      const band = /ぽっちゃり|ビール腹|恰幅/.test(String(c.bodyType||''))?[26,31]:/がっしり|骨太|ラグビー|柔道/.test(String(c.bodyType||''))?[24,28]:/細身|やせ|華奢|長距離/.test(String(c.bodyType||''))?[18,21]:[20,24.5];
      const bmi=wN/Math.pow(hN/100,2);
      if(bmi<band[0]||bmi>band[1]){ const nb=band[0]+rand()*(band[1]-band[0]); c.weight=Math.round(nb*Math.pow(hN/100,2))+'kg'; }
    }
    if(partialMode==='full' && !base.bloodType){
      generateInnerProfile(c);
      natInnerFix(c);
      applySenseTypeFx(c);
      if(!c.workUniform) applyCoordToCharacter(c, false);
      applyCoordToCharacter(c, true);
      if(typeof applyFashionSenseFx==='function') applyFashionSenseFx(c);
    }
    applyMuscleFashion(c);
    if(partialMode==='outfit' && current){ Object.assign(c, current, {id:uniqId(), nationality:c.nationality, ethnicity:c.ethnicity, vibe:c.vibe, name:nameByNationality(c.nationality, c.eraYear, c.age), role:c.role, mbti:c.mbti, personality:mbtiDescription(c.mbti,false), outfitType:c.outfitType,outfitBrand:c.outfitBrand,jacket:c.jacket,top:c.top,bottom:c.bottom,holidayOutfitType:c.holidayOutfitType,holidayOutfitBrand:c.holidayOutfitBrand,holidayJacket:c.holidayJacket,holidayTop:c.holidayTop,holidayBottom:c.holidayBottom,holidayShoes:c.holidayShoes,holidaySockBrand:c.holidaySockBrand,holidaySockType:c.holidaySockType,holidaySockColor:c.holidaySockColor,holidaySockUse:c.holidaySockUse,boxerBrand:c.boxerBrand,boxerColor:c.boxerColor,mainWearMode:c.mainWearMode,underwearType:c.underwearType,underwearColor:c.underwearColor,shoes:c.shoes,sockBrand:c.sockBrand,sockType:c.sockType,sockShape:c.sockShape,sockMaterial:c.sockMaterial,sockColor:c.sockColor,sockUse:c.sockUse,sceneIdea:buildEncounterScene({role:c.role, outfitType:c.outfitType, vibe:c.vibe, nationality:c.nationality, ethnicity:c.ethnicity, mbti:c.mbti, eraYear:c.eraYear, season:c.season, occInfluence:c.occInfluence, occupationMode:c.occupationMode}), createdAt:new Date().toISOString()}); }
    if(!groupCtx) Object.keys(locks).forEach(k=>{ if(locks[k] && current && current[k]!==undefined) c[k]=current[k]; });
    c.personality = mbtiDescription(c.mbti, false);
    c.bioText = base.bioText || null;
    if(!c.cardRarity || c.cardRarity==='おすすめ自動' || c.cardRarity==='なし') c.cardRarity = suggestCardRarity(c);
    c.cardEffect = cardEffectByRarity(c.cardRarity);
    return c;
  }

  function isRefMode(c){ return (c?.derivedMode || '参照画像前提（簡潔版）') !== '単体で完結（フル記述）'; }

  function refPrefix(c, english=false){
    if(!isRefMode(c)) return '';
    if(english) return `[REFERENCE IMAGE PROVIDED — IMPORTANT] Generate the EXACT same person as in the attached base reference card. His face, body proportions, height impression, hairstyle, hair color, skin, and foot shape must follow the reference image above all; if any text conflicts with the image, follow the image. Never turn him into a different person or average out his features. In any panel that shows underwear, keep the underwear type and shape exactly as in the reference image.\n[HOW TO USE THE REFERENCE] Learn ONLY the person's features (face, body, hair, skin, foot shape) from the reference image, then REDRAW him from scratch to fit this prompt's scene, lighting, and camera angle. Never produce a cut-and-paste composite look: his skin texture, lighting direction, cast shadows, color grading, and grain must fully match the environment, with no floating outlines or conflicting light sources — the result must read as one naturally captured image. Pose, expression, and gaze may be newly directed for the scene (keep his features intact).${['消防士','警察官','自衛官','救急隊員','防衛大学校学生'].includes(c.role) ? '\n[UNIFORM CONSISTENCY] When he appears in uniform, keep the uniform design (chest insignia, back lettering, cap, reflective tape, and presence of an equipment vest) exactly identical to the first attached uniform image.' : ''}\n\n`;
    return `【参照画像あり・重要】添付した基準リファレンスカードの人物と完全に同一人物として生成する。顔立ち・体型・身長感・髪型・髪色・肌・足の形は参照画像を最優先とし、テキストと食い違う場合は参照画像に従う。別人化・特徴の平均化をしない。下着姿を含むパネルでは、下着の種類と形状も参照画像のとおり正確に維持する。\n【参照画像の使い方】参照画像からは人物の特徴（顔立ち・体型・髪・肌・足の形）だけを学び取り、この指示文の場面・光・画角に合わせて人物を一から描き直すこと。参照画像の切り抜きを貼り付けたような合成写真には絶対にしない。肌の質感・光の当たり方・影の落ち方・色味・ノイズ感を背景と完全に一致させ、輪郭の浮きや光源の矛盾のない、1枚として自然に撮影・描画された画像に仕上げる。ポーズ・表情・視線は場面に合わせて新しく付け直してよい（人物の特徴は維持する）。${['消防士','警察官','自衛官','救急隊員','防衛大学校学生'].includes(c.role) ? '\n【制服の同一性】制服・活動服の姿を描く場合、制服のデザイン（胸章・背中の文字・帽子・反射帯・装備ベストの有無）は、添付した制服姿の画像1枚目と完全に同一に保つ。' : ''}\n\n`;
  }

  function personSummary(c, english=false){
    if(english) return `Subject summary: ${c.name}, ${c.age} years old, ${c.height} / ${c.weight}, occupation: ${roleWithSport(c, true)}. All other physical details follow the attached base reference card.\n`;
    return `人物要約：${c.name}、${c.age}歳、身長${c.height}・体重${c.weight}、職業は${roleWithSport(c, false)}。その他の顔立ち・体型・髪などの詳細は添付の基準リファレンスカードに従う。\n`;
  }

  function usageNote(english=false){
    return english ? '\n* Use this prompt WITH the image generated from the base reference card attached.' : '\n※このプロンプトは、基準リファレンスカードで生成した画像を添付した状態で使用してください。';
  }

  function buildCardInstructionOnly(c, english=false){
    const rarity = c.cardRarity && c.cardRarity !== 'おすすめ自動' ? c.cardRarity : 'SR';
    if(english) return `Present him as ONE original trading-card-style image, without copying any existing official card design. Put the logo text "GuzenIkemenMakerCARD" clearly on the card as an original brand logo. Card style: ${displayValue('cardStyle', c.cardStyle)}. Rarity label: ${rarity} (${cardEffectByRarity(c.cardRarity || 'R')}). Color theme: ${displayValue('cardTheme', c.cardTheme)}. Layout: ${displayValue('cardLayout', c.cardLayout)}. ${cardWearDescription(c, true)} Add a small readable info panel (name, height, MBTI). Style the card's frame, typography, and print texture like printed goods from around ${c.eraYear || '2026'}. Keep the card tasteful and non-sexual.`;
    return `オリジナルトレーディングカード風の1枚として構成する。実在カードや公式カードの模倣ではなく、独自の架空カードとして仕上げる。カード内に「GuzenIkemenMakerCARD」のロゴ文字をオリジナルブランドロゴとしてはっきり入れる。カードスタイルは${c.cardStyle}、レアリティ表示は${rarity}（${cardEffectByRarity(c.cardRarity || 'R')}）、配色テーマは${c.cardTheme}、レイアウトは${c.cardLayout}。${cardWearDescription(c, false)}小さな情報欄（名前・身長・MBTI）を付ける。カードのデザイン様式（枠・書体・印刷質感）も${eraLabel(c.eraYear)}頃の印刷物風にする。品があり非性的なカードにする。`;
  }

  let derivedType = null;
  function currentDerivedType(){ return CFG.derivedType || 'トレーディングカード'; }

  function buildHandoffSheet(c, english=false){
    const fw = c.footWidth || calcFootWidth(c);
    if(english){
      return `[OUTPUT FORMAT] Create one 16:9 "handoff reference sheet". Panels: full body front / full body side / face front / face side / face front with teeth visible (an "eee" expression, mouth stretched wide sideways to show the upper and lower rows of teeth, dental-reference style — in every other panel teeth appear only as naturally visible when smiling) / bare feet front view / soles (shown by the person himself sitting and presenting his own feet toward the viewer — never as detached, disembodied soles) / an enlarged full-sole view (the same feet as the person panels, detailed enough that the skin ridges of the soles, creases, and arch contours are readable, always oriented toes-up, as a matter-of-fact non-sexual reference enlargement). Every panel must show exactly the same person.${soleDetailLine(c, true)}
[INFO PANEL] (clean readable typography; list ONLY these items) Name "${nameKana(c)}" / Photo year: ${c.eraYear || '2026'} / Born: ${(Number(c.eraYear)||2026)-(Number(c.age)||25)} (age ${c.age}) / Height ${c.height}, Weight ${c.weight} / Body type "${displayValue('bodyType', c.bodyType)}" / Physique guide "about ${headCount(c)} heads tall" / Foot size ${c.footSize} / Foot width "${fw}". Keep all text crisp and unbroken.
[PERSON] Photo year: ${c.eraYear || '2026'} CE. ${eraStyleNote(c, true)} ${c.age} years old, ${c.nationality}, ${c.ethnicity}. ${facePresetPhrase(c, true)} ${eyeAreaLine(c, true)} Nose: ${c.nose}. Base expression: ${c.mouth}.${smileLine(c,true)}${faceExtraLine(c, true)} Facial symmetry: ${displayValue('faceAsym', c.faceAsym || 'ほぼ対称（ごく自然な左右差）')}.${realismSpec(c, true)} ${teethLine(c, true)} Hair: ${c.hairColor} ${c.hairStyle}. Facial hair: ${c.facialHair}.
[PHYSIQUE] ${physiqueSpec(c, true, true)} Hip shape: ${displayValue('hipShape', c.hipShape || '標準的な丸みの臀部')} (a neutral body-reference note; never emphasized or staged).${muscleLine(c, true)}${trainingLine(c, true)}${bodyRealismLine(c, true)}
[FEET] Foot shape: ${c.footShape}; ${footWidthDesc(c, true)}.${footFeatureLine(c, true, true)} In the barefoot panels, render toes with correct counts and joints; show exactly one pair of soles belonging to him only.
[OUTFIT IN SHEET] Underwear (${underwearDesc(c, true)}) only, as a neutral body-reference presentation in the flat, matter-of-fact tone of clothing-catalog product photos — no sexual staging, emphasis, or posing. No outerwear, tops, bottoms, shoes, or socks.
[PURPOSE] This sheet is used to hand the character over to another chat or session as a reference image.
[PROHIBITED] Making him look underage, sexual poses, excessive body emphasis, emphasis on genitals or the hips, excessive sole/toe close-ups outside the dedicated enlargement panel, unnatural AI-looking skin, changing him into a different person, broken text, extra feet or duplicated soles.
${promptTargetGuide(c, true)}`;
    }
    return `【出力形式】16:9の「参考画像作成シート（引継ぎ用）」を1枚作成する。パネル構成：全身前面／全身側面／顔正面／顔側面／顔正面（歯が見える：「イー」と口を横に広げて上下の歯列を見せる、歯科の資料撮影風の即物的な表情。このパネル以外では歯は笑ったときに自然に見える範囲のみ）／裸足の正面／足裏（人物が座って自分の足裏をこちらへ見せる姿として描き、足裏だけが切り離されて描写された状態にしない）／足裏の全体拡大（人物パネルと同一の足。足裏の指紋＝皮膚の隆線やしわ、土踏まずの起伏が分かる精細さ。常につま先が上・かかとが下の向き。資料用の即物的で非性的な拡大）。全パネルを完全に同一人物として一致させる。${soleDetailLine(c, false)}
【情報欄】（読みやすい文字組で、次の項目のみ記載）氏名「${nameKana(c)}」／撮影年代：${eraLabel(c.eraYear)}／生年：${eraLabel((Number(c.eraYear)||2026)-(Number(c.age)||25))}（${c.age}歳）／身長${c.height}・体重${c.weight}／体型「${c.bodyType}」／体格の目安「約${headCount(c)}頭身」／足サイズ${c.footSize}／ワイズ「${fw}」${c.bioCaptionMode==='情報欄に入れる' ? `／ひとこと：「${c.bioText || bioLine(c, false)}」` : ''}。文字は崩さない。
【人物】撮影年代：${eraLabel(c.eraYear)}。${countryLine(c, false)}${eraStyleNote(c, false)}${c.age}歳、${c.nationality}、${c.ethnicity}。${sportsHistoryLine(c, false)}${facePresetPhrase(c)}${eyeAreaLine(c, false)}鼻は${c.nose}、基本表情は${c.mouth}。${smileLine(c,false)}${faceExtraLine(c, false)}左右差は${c.faceAsym || 'ほぼ対称（ごく自然な左右差）'}。${realismSpec(c, false)}${teethLine(c, false)}髪は${c.hairColor}の${c.hairStyle}。ひげは${c.facialHair}。
【体格】${physiqueSpec(c, false, true)}臀部は${c.hipShape || '標準的な丸みの臀部'}${(promptOpt(c).detail)==='full'?'（体型確認のための中立的な記載であり、強調や演出はしない）':'（中立的な記載・強調しない）'}。${muscleLine(c, false)}${trainingLine(c, false)}${bodyRealismLine(c, false)}
【足】足の形は${c.footShape}。${footWidthDesc(c, false)}。${footFeatureLine(c, false, true)}裸足パネルでは指の本数・関節を正確に描き、足裏は本人の1人分のみとする。
【服装】基準服装は${underwearDesc(c, false)}のみ。体型確認のための中立的な資料表現であり、衣料品カタログの商品写真と同じ即物的なトーンで描く。性的な演出・強調・ポーズは一切しない。上着・トップス・ボトムス・靴・靴下は描写しない。
【用途】このシートは、別チャット・別セッションへ人物を引き継ぐための参照画像として使う。
【禁止事項】未成年に見える表現、性的なポーズ、過度な身体強調、局部や臀部の強調、資料用拡大パネル以外での足裏・足指の過度な接写、AIっぽい肌、別人化、文字崩れ、本人以外の足や足裏の重複。
${promptTargetGuide(c, false)}`;
  }

  function buildDerivedPrompt(c, english=false){
    const dt = currentDerivedType();
    if(refSheetKind(dt) === 'handoff') return buildHandoffSheet(c, english);
    if(!isRefMode(c)){
      if(dt === 'トレーディングカード') return buildTradingCardPrompt(c);
      if(refSheetKind(dt) === 'profilesheet') return buildPrompt(Object.assign({}, c, {outputType: dt})) + '\n' + (refSheetInstruction(Object.assign({}, c, {outputType: dt}), english) || '');
      return buildPrompt(Object.assign({}, c, {outputType: dt}));
    }
    const c2 = Object.assign({}, c, {outputType: dt});
    let core;
    if(dt === 'トレーディングカード') core = buildCardInstructionOnly(c, english);
    else core = refSheetInstruction(c2, english) || (english ? `Create the output as: ${displayValue('outputType', dt) || dt}.` : `${dt}として構成する。`);
    const avoid = english
      ? 'Avoid: changing him into a different person, averaging his features, altering his body type or face from the reference image, broken text, or any sexual expression.'
      : '避けること：別人化、特徴の平均化、参照画像と異なる体型・顔立ちへの変更、文字崩れ、性的表現。';
    return `${refPrefix(c, english)}${personSummary(c, english)}${eraContextLine(c, english)}\n${core}\n${avoid}\n${promptTargetGuide(c, english)}${usageNote(english)}`;
  }

  function isEnglish(c){ return (c?.promptLanguage || '日本語') === 'English'; }

  function enOutputType(v){
    if(!v) return 'a character image';
    const map = {
      '前面・側面を1枚にまとめた設定画像':'a reference sheet showing the front and side full-body views in one image',
      '前面・側面・背面を1枚にまとめた設定画像':'a reference sheet showing the front, side, and back full-body views in one image',
      '16:9のリファレンスカードとして、全身の前面・側面、顔の正面・側面・斜め45度、顔正面（歯が見える）、足の正面と側面と足裏（人物が座って自分の足裏をこちらへ見せる構図とし、足裏だけが切り離されて描写された状態にしない）を1枚に整理して表示する。':'a 16:9 reference card that organizes the full-body front and side views, face front and side views, a face-front-with-teeth-visible view, foot front view, foot side view, sole view, and sock details into one clean layout',
      'SNSプロフィール風画像':'an SNS profile-style image',
      '就活写真風画像':'a job-hunting photo-style image',
      'スポーツ選手紹介風画像':'an athlete-introduction-style image',
      'トレーディングカード風画像':'a trading-card-style image',
      'トレーディングカード風リファレンスカード':'a trading-card-style reference card',
      'レアカード風トレーディングカード画像':'a rare trading-card-style image',
      'シンプルな設定カード風画像':'a simple character card-style image'
    };
    return map[v] || v;
  }

  function enCount(v){
    const map = {'1枚':'1 image','2パターン別々の画像':'2 separate variations','3パターン別々の画像':'3 separate variations','4パターン別々の画像':'4 separate variations','5パターン別々の画像':'5 separate variations','10パターン別々の画像':'10 separate variations'};
    return map[v] || v;
  }

  function enQuality(v){
    const map = {'実写風':'photorealistic','高精細':'high-detail','スマホスナップ風':'smartphone snapshot style','イラスト風':'illustration style','アニメ風イラスト':'anime-style illustration','キャラクター設定画風':'character reference sheet style'};
    return map[v] || v;
  }

  const RARE_RULES = [
    ['高身長183cm+', 20, c=>c.heightRaw>=183],
    ['大足29cm+', 20, c=>parseFloat(c.footSize)>=29],
    ['特大足30cm+', 25, c=>parseFloat(c.footSize)>=30],
    ['規格外の足31cm+', 30, c=>parseFloat(c.footSize)>=31],
    ['個性体型', 15, c=>String(c.bodyType).includes('高身長')||String(c.bodyType).includes('腹だけ')||String(c.bodyType).includes('ぽっちゃり')],
    ['レア靴下', 12, c=>String(c.sockType).includes('柄')||String(c.sockType).includes('インビジブル')],
    ['学生服スタイル', 10, c=>String(c.outfitType).includes('学生服')],
    ['普通顔×180cm+', 12, c=>c.facePreset==='普通顔' && c.heightRaw>=180],
    ['10枚出力', 10, c=>String(c.count).includes('10')],
    ['戦前の時代設定', 15, c=>Number(c.eraYear)<1946],
    ['外国籍', 8, c=>c.nationality && c.nationality!=='日本'],
    ['ギャップ枠', 12, c=>!!c.gapMode],
    ['休日ペルソナ', 10, c=>!!c.holidayPersona],
    ['レアな肌の特徴', 8, c=>['左頬の薄い傷跡','眉尻の剃り込み跡','ゴーグル跡の日焼けムラ','腕まくり日焼けの跡'].some(v=>v===c.skinDetail||v===c.skinDetail2)],
    ['明色髪', 8, c=>['金髪','シルバー','アッシュグレー','プラチナ'].some(v=>String(c.hairColor).includes(v))],
    ['高身長178cm+', 8, c=>c.heightRaw>=178 && c.heightRaw<183],
    ['スタイル抜群（7.6頭身+）', 10, c=>parseFloat(headCount(c))>=7.6 && parseFloat(headCount(c))<7.9],
    ['8頭身級（7.9頭身+）', 18, c=>parseFloat(headCount(c))>=7.9],
    ['平行二重×アーモンド', 10, c=>c.eyelid==='平行二重' && c.eyeShape==='アーモンド形の目'],
    ['左右対称に近い顔', 8, c=>c.faceAsym==='左右対称に近い整った顔'],
    ['彫りの深い顔立ち', 6, c=>String(c.browRidge).includes('深い')],
    ['整った歯列', 5, c=>c.teethAlign==='整った歯列' || c.teethAlign==='矯正後のきれいな歯列'],
    ['えくぼ', 6, c=>c.dimple && c.dimple!=='えくぼなし'],
    ['泣きぼくろ', 5, c=>String(c.mole).includes('泣きぼくろ') || ['目元の泣きぼくろ'].some(v=>v===c.skinDetail||v===c.skinDetail2)],
    ['引き締まり体型', 5, c=>/細マッチョ|痩せマッチョ|水泳選手|逆三角形|クライマー/.test(String(c.bodyType))],
    ['長いまつ毛', 4, c=>String(c.eyelash).includes('長め')],
    ['ふっくら涙袋', 4, c=>['ふっくら','ややはっきり'].includes(String(c.tearBags))],
    ['珍しい職業', 8, c=>['僧侶','書道家','防衛大学校学生','鉄道職員','国鉄職員','パイロット','アナウンサー','ライフガード','電車運転士','プロスポーツ選手','漁師'].includes(c.role)],
    ['珍しいMBTI', 6, c=>['INFJ','INTJ','ENTJ'].includes(c.mbti)],
    ['脚長スタイル', 6, c=>['長い','非常に長い'].includes(String(c.legLength))],
    ['特徴的な髪型', 5, c=>/マンバン|スキンフェード|アフロ|ツイスト|スパイラル|ウルフ|アシメ/.test(String(c.hairStyle))]
  ];

  function rarityBreakdown(c){
    if(!c) return [];
    const out = [];
    for(const [label, pt, test] of RARE_RULES){ try{ if(test(c)) out.push([label, pt]); }catch(e){} }
    return out;
  }

  const IKEMEN_DELTAS = {
    faceAsym: {'左右対称に近い整った顔':8,'ほぼ対称（ごく自然な左右差）':0,'わずかな左右差がある自然な顔':-1,'眉の高さに少し左右差がある顔':-3,'口角の上がり方に少し左右差がある顔':-3,'目の大きさにわずかな左右差がある顔':-3,'左右で目の開き方が少し違う顔':-4,'笑うと片側の口角が先に上がる顔':-3,'鼻筋がごくわずかに湾曲した顔':-5},
    faceSpacing: {'標準的な配置':4,'やや求心寄りの配置':0,'やや遠心寄りの配置':0,'求心顔（目鼻口が中心に寄った配置）':-3,'遠心顔（パーツが外側に離れた配置）':-3,'はっきり求心的な配置（自然範囲の上限）':-6,'はっきり遠心的な配置（自然範囲の上限）':-6},
    faceRatio: {'標準的なバランスの比率':4,'目が大きめで存在感のある比率':3,'全体に小づくりな比率':0,'全体に大ぶりでくっきりした比率':0,'口が大きめではっきりした比率':-1,'口が小さめの比率':-1,'目が小さめ・切れ長寄りの比率':-2,'鼻の存在感が強い比率':-3},
    faceLine: {'卵型のフェイスライン':5,'シャープなフェイスライン':4,'逆三角形に近いフェイスライン':3,'面長のフェイスライン':1,'自然なフェイスライン':0,'柔らかいフェイスライン':0,'しっかりしたフェイスライン':-1,'やや角ばったフェイスライン':-2,'丸顔寄りのフェイスライン':-2,'ベース型のフェイスライン':-3,'ホームベース型のフェイスライン':-3},
    eyebrow: {'眉山のはっきりした眉':4,'太めの直線眉':3,'短めで力強い眉':2,'太めのアーチ眉':1,'標準的な直線眉':0,'標準的なゆるいアーチ眉':0,'眉尻の下がった優しい眉':0,'やや細めの直線眉':-1,'やや細めのアーチ眉':-1,'への字型の眉':-3},
    eyelid: {'平行二重':5,'末広二重':3,'奥二重':0,'一重':-2,'左右で異なるまぶた（片方だけ二重）':-4},
    eyeShape: {'アーモンド形の目':5,'切れ長の目':4,'丸みのある目':1,'標準的な目の形':0,'たれ目気味の目':-1,'つり目気味の目':-1,'細めの目':-3},
    eyelash: {'長めで濃いまつ毛':3,'やや長めのまつ毛':2,'標準的な長さのまつ毛':0,'短めで控えめなまつ毛':-1,'細くまばらなまつ毛':-3},
    nose: {'通った鼻筋':4,'高めの鼻筋':3,'すっきりした鼻筋':3,'鼻筋の細い鼻':2,'自然な鼻筋':0,'しっかりした鼻':0,'控えめで自然な鼻':-1,'鼻先の丸い鼻':-2,'わし鼻気味の鼻':-2,'小鼻の張った鼻':-3,'高さ控えめで平たい鼻':-3,'団子鼻気味の鼻':-4},
    jawChin: {'しっかりした顎先':3,'軽く割れた顎先':2,'尖り気味の顎先':1,'標準的な顎先':0,'丸みのある顎先':-1},
    jawAngle: {'エラは目立たない':1,'ほどよく張ったエラ':0,'はっきり張ったエラ':-2},
    teethAlign: {'整った歯列':5,'矯正後のきれいな歯列':4,'ほぼ整った歯列':0,'八重歯が少し覗く歯列':0,'前歯2本がやや大きめの歯列':-1,'矯正中（目立ちにくい矯正装置）':-2,'前歯がわずかに重なる歯列':-3,'下の前歯に軽い重なりがある歯列':-3,'すきっ歯気味の歯列':-4,'前歯がわずかに前傾した歯列':-4},
    cheek: {'頬骨が高めの頬':3,'標準的な頬':0,'ややこけた頬':-2,'ふっくらした頬':-2},
    browRidge: {'彫りが深い眉まわり':3,'彫りは標準的':0,'ややフラットな眉まわり':-2},
    hairline: {'富士額の生え際':1,'直線的な生え際':0,'ゆるいM字の生え際':-2,'やや後退気味の生え際':-5},
    eyeBags: {'クマなし':0,'うっすらとした目の下のクマ':-2},
    lipTone: {'血色のよい唇':1,'標準的な血色の唇':0,'やや乾燥気味の唇':-2}
  };

  const IKEMEN_AXIS_LABELS = {faceAsym:'左右差', faceSpacing:'パーツ配置', faceRatio:'目鼻口比率', faceLine:'輪郭', eyebrow:'眉', eyelid:'まぶた', eyeShape:'目の形', eyelash:'まつ毛', nose:'鼻', jawChin:'顎先', jawAngle:'エラ', teethAlign:'歯並び', cheek:'頬', browRidge:'彫り', hairline:'生え際', eyeBags:'クマ', lipTone:'唇の血色'};

  function ikemenBreakdown(c){
    if(!c) return [];
    const out = [];
    for(const key in IKEMEN_DELTAS){
      const d = IKEMEN_DELTAS[key][c[key]];
      if(d) out.push([IKEMEN_AXIS_LABELS[key], d]);
    }
    const hc = headCount(c);
    const hd = hc >= 7.8 ? 8 : hc >= 7.6 ? 6 : hc >= 7.3 ? 3 : hc >= 7.0 ? 0 : hc >= 6.8 ? -3 : -6;
    if(hd) out.push(['頭身', hd]);
    const sd = (c.skinDetail || 'なし（クリアな肌）') === 'なし（クリアな肌）' ? 3 : -2;
    if(sd) out.push(['肌', sd]);
    out.sort((a,b)=>b[1]-a[1]);
    return out;
  }

  function scoreRarity(c){
    if(!c) return [0,'NORMAL','idle'];
    const meta=c.innerMeta||{}; const badges=Object.values(meta).filter(Boolean).length;
    const s = rarityBreakdown(c).reduce((a,[,p])=>a+p,0) + badges*7 + (typeof salienceTop==='function'?salienceTop(c,5).length*2:0);
    if(s>=66) return [s,'LEGEND','legend']; if(s>=48) return [s,'SUPER RARE','super']; if(s>=30) return [s,'RARE','rare']; return [s,'NORMAL','normal'];
  }

  function buildTradingCardPrompt(c){
    if(!c) return '';
    const english = isEnglish(c);
    const cardInst = buildCardInstruction(c, english);
    const wear = cardWearDescription(c, english);
    const pose = cardPoseGuide(c, english);
    const body = buildBodyHairSummary(c, english);
    const caption = buildCaptionInstruction({...c, captionMode:'表記する'}, english);
    const target = promptTargetGuide(c, english);
    const rarity = c.cardRarity && c.cardRarity!=='おすすめ自動' ? c.cardRarity : suggestCardRarity(c);
    const effect = cardEffectByRarity(rarity);
    if(english){
      return `Create a separate trading-card-style variation prompt for the adult male character "${c.name}".

Era setting: ${c.eraYear || '2026'} CE. ${eraStyleNote(c, true)} Keep the character consistent with the main profile. He is ${c.age} years old, ${c.nationality}, ${c.ethnicity}. Occupation: ${c.role}. Vibe: ${c.vibe}. His personality and demeanor feel ${mbtiDescription(c.mbti,true)}. ${c.holidayPersona ? `On weekdays he works earnestly as a ${displayValue('role', c.role)}, but on days off his whole vibe transforms into a ${displayValue('vibe', c.vibe)} style — depict him here in his day-off persona.` : ''} ${facePresetPhrase(c, true)}${realismSpec(c, true)} Body type: ${bodyTypeDesc(c.bodyType, true)}${bmiLine(c,true)}. Height: ${c.height}. Weight: ${c.weight}. ${physiqueSpec(c, true)}${heightContrastCue(c, true)}${muscleLine(c, true, true)} Foot size: ${c.footSize}. Facial hair: ${c.facialHair}${c.facialHair!=='なし' && ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor) ? ' (with graying facial hair)' : ''}. ${c.glasses && c.glasses!=='なし' ? `He wears ${displayValue('glasses', c.glasses)}. ` : ''}Hair: ${c.hairColor} ${c.hairStyle}. ${body}

${wear}
${pose}

${cardInst}
Use rarity ${rarity} and decorative effect ${displayValue('cardEffect',effect)}. Make the character pose catchy and memorable based on his profile, not a plain standing pose. The card should look visually polished like a premium collectible character card, with clear hierarchy, readable profile panels, strong border design, and the original logo "GuzenIkemenMakerCARD". Do not imitate a real card franchise or use copyrighted card layouts.

${caption}
${target}`;
    }
    return `成人男性キャラクター「${c.name}」のトレーディングカード風差分プロンプトを作成する。

時代設定は${eraLabel(c.eraYear)}頃。${countryLine(c, false)}${seasonLine(c, false)}${eraStyleNote(c, false)}同一人物として、メインプロフィールの顔立ち・体型・身長感・髪型を維持する。${c.age}歳、${c.nationality}、${c.ethnicity}。職業は${roleWithSport(c, false)}、雰囲気は${c.vibe}。性格・立ち居振る舞いの雰囲気は${mbtiDescription(c.mbti,false)}。${c.holidayPersona ? `平日は${c.role}として堅実に働いているが、休日は${c.vibe}の雰囲気に一変するタイプであり、この画像は休日の姿として描く。` : ''}${facePresetPhrase(c)}体型は${bodyTypeDesc(c.bodyType, false)}${bmiLine(c,false)}。身長${c.height}、体重${c.weight}、足のサイズ${c.footSize}。${physiqueSpec(c, false)}ひげは${c.facialHair}${c.facialHair!=='なし' && ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor) ? '（白髪まじりのひげ）' : ''}。${c.glasses && c.glasses!=='なし' ? `眼鏡は${c.glasses}をかけている。` : ''}髪は${c.hairColor}の${c.hairStyle}。${body}

${wear}
${pose}

${cardInst}
レアリティは${rarity}、装飾効果は${effect}。カード内のキャラクターは、ただの直立ではなく、プロフィールに基づいたキャッチーで記憶に残るポーズにする。カードのデザインは人気トレーディングカードのように見栄えを高め、階層感のある情報パネル、読みやすいプロフィール欄、強いカード枠、オリジナルロゴ「GuzenIkemenMakerCARD」を入れる。実在カードシリーズや公式カードのデザインは模倣しない。

${caption}
${target}`;
  }

  function buildPrompt(c, baseMode=false){
    if(baseMode) c = Object.assign({}, c, {outputType:'16:9の基準リファレンスカード'});
    if(!c) return '';
    const refJa = refSheetInstruction(c, false);
    const refEn = refSheetInstruction(c, true);
    const sheetKind = refSheetKind(c.outputType);
    const outputJa = refJa ? refJa : (c.outputType.includes('16:9') ? '16:9の基準リファレンスカードとして、全身の前面・側面、顔の正面・側面・斜め45度、顔正面（歯が見える）、足の正面と側面と足裏を1枚に整理して表示する。足裏は、人物が座って自分の足裏をこちらへ見せる姿として描き、足裏だけが切り離されて描写された状態にしない。足を無理にカメラへ突き出さず、望遠レンズ（85mm相当）で撮影したような遠近圧縮の効いた自然な比率で描く。足裏1つの縦の長さは頭部の縦の長さとほぼ同じ〜1.1倍程度に収め、それ以上大きくしない。座りポーズは両脚をまっすぐ前に伸ばし、片膝を立てたり片脚を上げたりしない。体に対して不自然に巨大な足にしない。あわせて、同じ足裏の全体拡大パネルを併載する（左右両足の裏を並べて描く（片足だけにしない）。人物パネルと同一の足であり、足裏の指紋＝皮膚の隆線やしわ、土踏まずの起伏が分かる精細さで描く。常につま先が上・かかとが下の向きで表示し、資料用の即物的で非性的な拡大とする）。顔正面（歯が見える）パネルは、「イー」と口を横に広げて上下の歯列を見せる、歯科の資料撮影風の即物的な表情にする。笑顔にしない。口角は上げず、唇を左右いっぱいまで水平に引いて、上下の歯列全体と歯ぐきの際まで見えるようにする（このパネル以外では、歯は笑ったときに自然に見える範囲でのみ描写する）。靴下の詳細パネルは入れない。各ビューは同一人物として顔立ち、体型、身長感を一致させる。このカードは以後の派生画像すべての基準（参照画像）として使う。' : `${c.outputType}。`);
    const outputEn = refEn ? refEn : (c.outputType.includes('16:9') ? 'Create a 16:9 BASE reference card that organizes the full-body front and side views, face front and side views, a face-front-with-teeth-visible view (an "eee" expression with the mouth stretched wide sideways to show the upper and lower rows of teeth, in the matter-of-fact tone of dental reference photography — in every other panel, teeth appear only as naturally visible when smiling), foot front view, foot side view, and sole view into one clean layout, without any dedicated sock-detail panel. The soles must be shown by the person himself sitting and presenting his own feet toward the viewer — never as detached, disembodied soles. Also include an enlarged full-sole panel of the same feet: identical to the feet in the person panels, detailed enough that the skin ridges of the soles (footprint lines), creases, and arch contours are readable, always oriented toes-up and heels-down, as a matter-of-fact, non-sexual reference enlargement. Keep every view clearly the same person. This card will be used as the reference image for all derived outputs.' : `Create ${enOutputType(c.outputType)}.`);
    const allowsOutfitPanels = sheetKind==='compare' || sheetKind==='stages' || sheetKind==='blueprint';
    const fullOutfitSheet = ['outfitref','poster','machiWork','machiOff','feet','magazine'].includes(sheetKind);
    const sheetWearJa = sheetKind==='machiOff' ? '私服（休日）の提案コーデを靴まで含めて正確に着用させ、下着姿は描かない。'
      : sheetKind==='feet' ? '職業服装を着用したまま靴だけを脱いだ状態で、提案靴下を履いている。下着姿は描かない。'
      : sheetKind==='magazine' ? '誌面のメイン写真では私服（休日）コーデを靴まで含めて着用し、小さめのサブカットとして職業服装の姿も1枚載せる。下着姿は描かない。'
      : 'この画像では職業服装のフルコーデを靴まで含めて正確に着用させ、下着姿は描かない。';
    const sheetWearEn = sheetKind==='machiOff' ? 'He wears his full casual (day-off) outfit accurately, shoes included — do NOT depict him in underwear.'
      : sheetKind==='feet' ? 'He keeps his work outfit on but has removed only his shoes, wearing the suggested socks — do NOT depict him in underwear.'
      : sheetKind==='magazine' ? 'In the main photo he wears his full casual outfit with shoes, plus one smaller sub-cut in his work outfit — do NOT depict him in underwear.'
      : 'In this image he wears his full work outfit accurately, shoes included — do NOT depict him in underwear.';
    const capJa = buildCaptionInstruction(c, false);
    const capEn = buildCaptionInstruction(c, true);
    const targetJa = promptTargetGuide(c, false);
    const targetEn = promptTargetGuide(c, true);
    const bodyJa = buildBodyHairSummary(c,false);
    const bodyEn = buildBodyHairSummary(c,true);
    if(isEnglish(c)){
      return `Create a non-sexual full-body image of the adult male character "${c.name}".

[BASICS & ERA] Photo year: ${c.eraYear || '2026'} CE. Born: ${(Number(c.eraYear)||2026)-(Number(c.age)||25)} (currently ${c.age}). ${fullOutfitSheet ? eraStyleNote(c, true) + ' ' : ''}He is ${c.age} years old, ${c.nationality}, ${c.ethnicity}. His occupation is ${c.role}. His overall vibe is ${c.vibe}. His personality and demeanor feel ${mbtiDescription(c.mbti,true)}. ${c.holidayPersona ? `On weekdays he works earnestly as a ${displayValue('role', c.role)}, but on days off his whole vibe transforms into a ${displayValue('vibe', c.vibe)} style — depict him here in his day-off persona.` : ''}${sportsHistoryLine(c, true)}
[FACE] ${facePresetPhrase(c, true)}And his age appearance is ${c.ageAppearance}. His face line is ${c.faceLine}. ${eyeAreaLine(c, true)} Tear bags: ${c.tearBags}. Nose: ${c.nose}. Base expression: ${c.mouth}.${smileLine(c,true)} Lips: ${displayValue('lips', c.lips || '標準的な厚さの唇')}. Mouth placement: ${displayValue('mouthPos', c.mouthPos || '標準的な位置・大きさの口')}. Feature spacing: ${displayValue('faceSpacing', c.faceSpacing || '標準的な配置')}. Feature proportions: ${displayValue('faceRatio', c.faceRatio || '標準的なバランスの比率')}. Facial symmetry: ${displayValue('faceAsym', c.faceAsym || 'ほぼ対称（ごく自然な左右差）')}.${realismSpec(c, true)} ${teethLine(c, true)}${faceExtraLine(c, true)} Skin: ${valueTranslations[c.skin] || c.skin}.${skinDetailLine(c, true)} Facial hair: ${c.facialHair}${c.facialHair!=='なし' ? ` (${displayValue('facialHairGroom', c.facialHairGroom || '自然に整えている')})` : ''}${c.facialHair!=='なし' && ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor) ? ' (with graying facial hair)' : ''}. ${c.glasses && c.glasses!=='なし' ? `He wears ${displayValue('glasses', c.glasses)}. ` : ''}Hair: ${c.hairColor} ${c.hairStyle}, ${displayValue('hairTexture', c.hairTexture || '直毛')}.${hairDetailLine(c, true)}${originFaceLine(c,true)}
[BODY HAIR] ${bodyEn}

[PHYSIQUE & FEET] Height ${c.height}, weight ${c.weight}, body type ${bodyTypeDesc(c.bodyType, true)}${bmiLine(c,true)}. ${physiqueSpec(c, true, true)} Hip shape: ${displayValue('hipShape', c.hipShape || '標準的な丸みの臀部')} (a neutral body-reference note; never emphasized or staged).${muscleLine(c, true)}${trainingLine(c, true)}${bodyRealismLine(c, true)} Foot size ${c.footSize}, foot shape ${c.footShape}; ${footWidthDesc(c, true)}.${footFeatureLine(c, true, true)}${soleDetailLine(c, true)} Use a natural standing pose that makes the balance of height, weight, and foot size easy to understand.

[OUTFIT IN CARD] ${fullOutfitSheet ? sheetWearEn : `The main clothing is only ${underwearDesc(c, true)}. ${underwearShapeGuide(c, true)} Underwear panels are neutral reference material for body proportions — depict them in the same matter-of-fact tone as clothing product photos, with zero sexualized staging, emphasis, or posing.`} ${fullOutfitSheet ? '' : allowsOutfitPanels ? 'In the underwear-only panels, do not depict outerwear, tops, bottoms, shoes, or socks. In the outfit panels, dress him accurately in the specified suggested outfit, but never add shoes outside the panels where they are explicitly allowed.' : `He wears only the specified underwear; depict no other clothing or footwear of any kind (outerwear, tops, bottoms, shoes, socks, etc.).`} Keep the underwear depiction non-sexual and suitable for neutral body reference purposes.

[OUTPUT FORMAT] ${layoutRefFormat(c, true) || outputEn}
[INFO PANEL] Inside the card, in clean readable typography, list ONLY: Name "${nameKana(c)}" / Photo year: ${c.eraYear || '2026'} / Born: ${(Number(c.eraYear)||2026)-(Number(c.age)||25)} (age ${c.age}) / Height ${c.height}, Weight ${c.weight} / Foot size ${c.footSize} / Foot width "${c.footWidth || calcFootWidth(c)}". Keep all text crisp and unbroken.
${c.catchphraseMode==='画像内にも表示する' ? `Place the catchphrase "${catchphrase(c, true)}" in readable, title-logo-style text at the bottom or corner of the image, without breaking the characters.\n` : ''}Create ${enCount(c.count)}. Background: ${(valueTranslations[c.background]||c.background)}. Lighting: ${String(valueTranslations[c.lighting]||c.lighting||'').replace(/[。.]$/,'')}. Visual quality/style: ${enQuality(c.quality)}.

${capEn}
${targetEn}

[PROHIBITED] Avoid: making him look underage, sexual poses, excessive body emphasis, emphasis on the genitals or hips (excessive sole/toe close-ups are avoided everywhere except the dedicated reference enlargement panel),${underwearAvoid(c, true)} excessive close-ups of soles or toes, unnatural AI-looking skin, changing him into a different person, broken text, or ${fullOutfitSheet ? 'changing him into any outfit other than the specified one' : allowsOutfitPanels ? 'clothing or shoes appearing outside their designated panels' : 'mixing in any clothing or footwear other than the underwear'}.`;
    }
    return `${c.__refPrefix || ''}成人男性キャラクター「${c.name}」の非性的な全身画像を作成する。

【人物基本・時代】撮影年代：${eraLabel(c.eraYear)}。生年：${eraLabel((Number(c.eraYear)||2026)-(Number(c.age)||25))}（現在${c.age}歳）。${countryLine(c, false)}${fullOutfitSheet ? seasonLine(c, false) : ''}${fullOutfitSheet ? eraStyleNote(c, false) : ''}${c.age}歳、${c.nationality}、${c.ethnicity}。職業は${roleWithSport(c, false)}。雰囲気は${c.vibe}。性格・立ち居振る舞いの雰囲気は${mbtiDescription(c.mbti,false)}。${c.holidayPersona ? `平日は${c.role}として堅実に働いているが、休日は${c.vibe}の雰囲気に一変するタイプであり、この画像は休日の姿として描く。` : ''}${sportsHistoryLine(c, false)}
【顔】${c.__faceBlock || ''}${c.__faceAging || ''}${realismSpec(c, false)}${teethLine(c, false)}${faceExtraLine(c, false)}${hairDetailLine(c, false)}${originFaceLine(c,false)}
【体毛】${(promptOpt(c).detail)==='light' ? `体毛は全体として${c.bodyHairOverall||'自然'}。非性的で、成人男性の自然な身体特徴として扱う。` : bodyJa}

【体格・足】身長${c.height}、体重${c.weight}、体型は${bodyTypeDesc(c.bodyType, false)}${bmiLine(c,false)}。${physiqueSpec(c, false, true)}臀部は${c.hipShape || '標準的な丸みの臀部'}${(promptOpt(c).detail)==='full'?'（体型確認のための中立的な記載であり、強調や演出はしない）':'（中立的な記載・強調しない）'}。${muscleLine(c, false)}${trainingLine(c, false)}${bodyRealismLine(c, false)}足のサイズは${c.footSize}、足の形は${c.footShape}。${footWidthDesc(c, false)}。${footFeatureLine(c, false, true)}${soleDetailLine(c, false)}${(promptOpt(c).detail)==='full' ? `全身パネルでは、足の大きさを身長${c.height}に対して足のサイズ${c.footSize}相当の自然な比率で描く（小さすぎ・大きすぎにしない）。身長、体重、足サイズのバランスが自然に分かる直立姿勢にする。` : `全身パネルでは身長${c.height}と足サイズ${c.footSize}の比率が自然に分かる直立姿勢で描く。`}

【服装（カード内）】${fullOutfitSheet ? sheetWearJa : `基準服装は${underwearDesc(c, false)}のみ。${underwearShapeGuide(c, false)}下着姿のパネルは体型確認のための中立的な資料表現であり、衣料品の商品写真・体型資料と同じ即物的なトーンで描く。性的な演出・強調・ポーズは一切しない。`}${fullOutfitSheet ? '' : allowsOutfitPanels ? '下着のみのパネルでは上着・トップス・ボトムス・靴・靴下を描かない。提案服装のパネルでは指定された提案服装を正確に着用させるが、靴は指示で許可されたパネル以外では履かせない。' : `身につけているのは指定の下着のみで、それ以外の衣類・履物（上着・トップス・ボトムス・靴・靴下など）は一切描かない。`}下着表現は非性的で、体型確認用の自然な見せ方にする。

【出力形式】${layoutRefFormat(c, false) || outputJa}
【情報欄】カード内に読みやすい文字組で次のみ記載する：氏名「${nameKana(c)}」／撮影年代：${eraLabel(c.eraYear)}／生年：${eraLabel((Number(c.eraYear)||2026)-(Number(c.age)||25))}（${c.age}歳）／身長${c.height}・体重${c.weight}／足サイズ${c.footSize}／ワイズ「${c.footWidth || calcFootWidth(c)}」${c.bioCaptionMode==='情報欄に入れる' ? `／ひとこと：「${c.bioText || bioLine(c, false)}」` : ''}。文字は崩さない。
${c.catchphraseMode==='画像内にも表示する' ? `画像内の下部または隅に、キャッチフレーズ「${catchphrase(c, false)}」をタイトルロゴ風の読みやすい日本語文字で入れる。文字は崩さない。\n` : ''}【画質・出力】${c.count}を作成する。背景は${c.background}。光は${String(c.lighting||'').replace(/。$/,'')}。画質・質感は${c.quality}。

${capJa}
${targetJa}

【禁止事項】未成年に見える表現、性的なポーズ、過度な身体強調、局部や臀部の強調、${underwearAvoid(c, false)}資料用拡大パネル以外での足裏・足指の過度な接写、AIっぽい肌、別人化、文字崩れ、${fullOutfitSheet ? '指定コーデ以外の服装への勝手な変更。' : allowsOutfitPanels ? '指定パネル以外への服装・靴の混入。' : '下着以外の衣類・履物の混入。'}`;
  }

  function sockEditContext(c){
    const SOCK_BRANDS = ['Fukuske','靴下屋','Tabio','無印良品','ユニクロ','しまむら','ワークマン','GU','NIKE','adidas','Champion','ROTOTO','CHICSTOCKS','無地ノーブランド','官品支給','自前の機能性ソックス','ワークショップの軍足系（3足組）','私物'];
    try{ const yS=Number(c.eraYear)||2026; BRAND_DB.filter(r=>/k/.test(String(r[1]))&&yS>=r[4]&&yS<=r[6]).forEach(r=>{ if(!SOCK_BRANDS.includes(r[0])) SOCK_BRANDS.push(r[0]); }); }catch(e){}
    const sockReason = (work) => {
      const dutyR2 = ['消防士','警察官','自衛官','救急隊員','防衛大学校学生'].includes(String(c.role||''));
      const suitish2 = /会計士|銀行|弁護士|公務員|コンサル|営業|商社|不動産|保険|アナウンサー/.test(String(c.role||''));
      if(work && dutyR2) return uiLang==='en'?'duty issue':'職務支給・訓練対応';
      if(work && suitish2) return uiLang==='en'?'suits the office job':'スーツ職向け';
      if(/靴下/.test(String(c.fashionSenseText||'')+String(c.sockPairText||''))) return uiLang==='en'?'sock preference':'靴下へのこだわり';
      return uiLang==='en'?'fits the person':'人物・コーデに合う';
    };
    const SOCK_TYPES = {'ビジネスソックス':'薄手ビジネス形状','無地のクルー丈ソックス':'標準的な中厚','リブ編みのクルー丈ソックス':'リブ編み','柄物のクルーソックス':'標準的な中厚','白のスポーツソックス':'先丸・スポーツ形状','先丸の厚手パイルソックス（クルー丈）':'先丸・厚手パイル編み','5本指の機能ソックス（クルー丈）':'5本指形状','行軍用の5本指ソックス（ハイソックス丈）':'5本指形状・超肉厚','アンクルソックス':'先丸・くるぶし上まで','インビジブルソックス':'浅履き形状','足袋型ソックス':'親指だけが分かれた2本指構造'};
    const SOCK_COLORS = ['黒','紺','白','グレー','チャコール','ベージュ','柄（差し色）','OD（オリーブ）'];
    const SOCK_MATS = ['綿混','綿ポリエステル混','ナイロン混（薄手）','綿混パイル','ウール混（厚手）','吸汗速乾の機能繊維混（つま先・かかと補強）','コストを抑えた綿ポリエステル混'];
    const SOCK_USES = ['新品に近い','洗濯が行き届いた使用感','清潔だが生活感あり','少し履き込まれている','かかとがやや薄くなっている','毛羽立ちが少しある'];
    const suitish = /会計士|銀行|弁護士|公務員|コンサル|営業|商社|不動産|保険|アナウンサー/.test(String(c.role||''));
    const dutyR = ['消防士','警察官','自衛官','救急隊員','防衛大学校学生'].includes(String(c.role||''));
    const st2 = String(c.fashionSenseText||'') + String(c.sockPairText||'');
    const recFor = (kind, work) => {
      if(kind==='brand'){ if(work && dutyR) return ['官品支給','自前の機能性ソックス']; if(work && suitish) return ['Fukuske','靴下屋']; return /靴下|柄物/.test(st2) ? ['Tabio','靴下屋'] : ['ユニクロ','無印良品']; }
      if(kind==='type'){ if(work && dutyR) return String(c.role)==='警察官' ? ['先丸の厚手パイルソックス（クルー丈）','5本指の機能ソックス（クルー丈）'] : ['先丸の厚手パイルソックス（クルー丈）','無地のクルー丈ソックス']; if(work && suitish) return ['ビジネスソックス']; if(/見せない派/.test(st2)) return ['アンクルソックス','インビジブルソックス']; if(/柄物/.test(st2)) return ['柄物のクルーソックス']; return ['無地のクルー丈ソックス','リブ編みのクルー丈ソックス']; }
      if(kind==='color'){ if(work && (dutyR||suitish)) return ['黒','紺']; return /柄物/.test(st2) ? ['柄（差し色）','白'] : ['黒','白','グレー']; }
      if(kind==='mat'){ if(work && dutyR) return ['吸汗速乾の機能繊維混（つま先・かかと補強）','コストを抑えた綿ポリエステル混']; if(work && suitish) return ['綿混','ナイロン混（薄手）']; return ['綿混']; }
      if(kind==='use'){ if(/靴下|アイロン/.test(st2)) return ['洗濯が行き届いた使用感','新品に近い']; return ['清潔だが生活感あり','洗濯が行き届いた使用感']; }
      return [];
    };
    window.SOCK_TYPE_SHAPE_MAP = SOCK_TYPES;
    return {SOCK_BRANDS, SOCK_TYPES, SOCK_COLORS, SOCK_MATS, SOCK_USES, recFor, sockReason};
  }

    function buildUniformEditRows(c, L){
    const rows = [];
    const hasUniform = !!(c.workUniform && UNIFORM_VARIANTS[c.role]);
    const variants = hasUniform ? UNIFORM_VARIANTS[c.role] : [];
    if(variants.length > 1){
      const opts = variants.map(v=>`<option value="${String(v[0]).replace(/"/g,'&quot;')}"${v[0]===c.workUniform?' selected':''}>${displayValue('workUniform', v[0]) || v[0]}</option>`).join('');
      rows.push([L.uniformKind, `<select data-uniform-edit style="max-width:100%;background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:4px 6px;font-size:12px">${opts}</select>`]);
    } else {
      rows.push([L.uniformKind, displayValue('workUniform', c.workUniform) || c.workUniform]);
    }
    {
      const ctx = sockEditContext(c);
      const {SOCK_BRANDS, SOCK_TYPES, SOCK_COLORS, SOCK_MATS, SOCK_USES, recFor} = ctx;
      const grpSel = (attr, list, cur, rec, reason) => {
        if(cur && !list.includes(cur)) list = [cur].concat(list); // 現在値がリスト外でも保持
        const rs = rec.filter(v=>list.includes(v));
        const others = list.filter(v=>!rs.includes(v));
        const op = v => `<option value="${v}"${v===cur?' selected':''}>${v}</option>`;
        const recLab = `★推奨${reason?`（${reason}）`:''}`;
        return `<select ${attr} style="max-width:130px;background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:3px 4px;font-size:11px"><optgroup label="${recLab}">${rs.map(op).join('')}</optgroup><optgroup label="${uiLang==='en'?'All':'その他すべて'}">${others.map(op).join('')}</optgroup></select>`;
      };
      // V4.6.0 A4: 通常行と同じ「値テキスト＋✎🎲」表記。✎で5セレクトを行内展開、🎲は5項目一括抽選
      const mkRow = (label, pfx, work) => {
        const g = k => work ? c[k] : (c['holidayS'+k.slice(1)] || c[k]);
        const scope = work ? 'w' : 'h';
        const txt = [g('sockBrand'), g('sockType'), g('sockColor'), g('sockMaterial')].filter(Boolean).join('・') + (g('sockUse')?`／${g('sockUse')}`:'');
        const rsn = ctx.sockReason ? ctx.sockReason(work) : '';
        const eds =
          grpSel(`data-sockedit="${pfx}brand"`, SOCK_BRANDS, g('sockBrand'), recFor('brand', work), rsn) + ' ' +
          grpSel(`data-sockedit="${pfx}type"`, Object.keys(SOCK_TYPES), g('sockType'), recFor('type', work), rsn) + ' ' +
          grpSel(`data-sockedit="${pfx}color"`, SOCK_COLORS, g('sockColor'), recFor('color', work), rsn) + ' ' +
          grpSel(`data-sockedit="${pfx}mat"`, SOCK_MATS, g('sockMaterial'), recFor('mat', work), rsn) + ' ' +
          grpSel(`data-sockedit="${pfx}use"`, SOCK_USES, g('sockUse'), recFor('use', work), rsn);
        rows.push([label,
          `<span class="sock-tx">${(typeof window!=='undefined'&&window.__gimSwatches)?window.__gimSwatches(txt):''}${txt||'—'}</span><span class="sock-ed hidden" style="display:inline-flex;flex-wrap:wrap;gap:3px;margin-left:4px">${eds}</span>` +
          `<span class="pf-actions"><button class="pf-btn" data-sock-open="${scope}" title="${uiLang==='en'?'Edit':'選択修正'}">\u270e</button><button class="pf-btn" data-sock-dice="${scope}" title="${uiLang==='en'?'Reroll all 5':'5項目一括抽選'}">\ud83c\udfb2</button></span>`]);
      };
      mkRow(uiLang==='en'?'Socks (work)':'提案靴下（職場）', 'w:', true);
      mkRow(uiLang==='en'?'Socks (casual)':'私服の靴下', 'h:', false);
    }
    if(hasUniform && ['消防士','警察官','自衛官','救急隊員','防衛大学校学生'].includes(String(c.role||''))){
      const DUTY_SOCK_EDIT = window.DUTY_SOCK_EDIT_MAP || (window.DUTY_SOCK_EDIT_MAP = {
        '官品支給・無地クルー': ['官品支給','無地のクルー丈ソックス','標準的な薄手〜中厚（厚手パイルではない）','コストを抑えた綿ポリエステル混'],
        '先丸・厚手パイル（クルー丈）': ['自前の機能性ソックス','先丸の厚手パイルソックス（クルー丈）','先丸・厚手パイル編み','吸汗速乾の機能繊維混（つま先・かかと補強）'],
        '5本指の機能ソックス（クルー丈）': ['自前の機能性ソックス','5本指の機能ソックス（クルー丈）','5本指形状','吸汗速乾の機能繊維混（つま先・かかと補強）'],
        '行軍用5本指（ハイソックス丈）': ['自前の機能性ソックス','行軍用の5本指ソックス（ハイソックス丈）','5本指形状・超肉厚','抗菌防臭・吸汗速乾（つま先・かかと補強）'],
        'アンクルソックス': ['私物','アンクルソックス','先丸・くるぶし上まで','綿混'],
        'リブ編みクルー': ['私物','リブ編みのクルー丈ソックス','リブ編み','綿混'],
        '軍足系厚手パイル（3足組）': ['ワークショップの軍足系（3足組）','先丸の厚手パイルソックス（クルー丈）','先丸・厚手パイル編み','綿混パイル']
      });
      const cur = Object.keys(DUTY_SOCK_EDIT).find(k=>DUTY_SOCK_EDIT[k][1]===c.sockType) || '';
      const sOpts = Object.keys(DUTY_SOCK_EDIT).map(k=>`<option value="${k}"${k===cur?' selected':''}>${k}</option>`).join('');
      const cOpts = ['黒','紺','白','グレー','OD（オリーブ）'].map(k=>`<option value="${k}"${k===c.sockColor?' selected':''}>${k}</option>`).join('');
      rows.push([uiLang==='en'?'Duty socks':'職務靴下', `<select data-dutysock-edit style="max-width:60%;background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:4px 6px;font-size:12px">${sOpts}</select> <select data-dutysockcolor-edit style="background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:4px 6px;font-size:12px">${cOpts}</select>`]);
    }
    if(hasUniform && c.headwear){
      const onLabel = uiLang==='en' ? 'Wear the cap' : '着帽する';
      const offLabel = uiLang==='en' ? 'No cap' : '着帽しない';
      rows.push([L.headwearRow, `<select data-headwear-edit style="background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:4px 6px;font-size:12px"><option value="on"${c.headwearOn!==false?' selected':''}>${onLabel}</option><option value="off"${c.headwearOn===false?' selected':''}>${offLabel}</option></select> <span class="notice" style="display:inline">${c.headwear}</span>`]);
    }
    return rows;
  }

  function buildFullProfileText(c){
    const L=[]; const p=(s)=>{ if(s) L.push(s); };
    const h=Number(c.height)||0, w=parseInt(c.weight)||0, bmi=h?Math.round(w/Math.pow(h/100,2)*10)/10:'';
    p(`■ ${c.name}（${c.age}歳・${c.nationality||'日本'}・${c.role||''}）`);
    p(`基本：身長${c.height}／体重${c.weight}（BMI${bmi}）／足のサイズ${c.footSize||'-'}${c.footShape?'・'+c.footShape:''}／体型 ${c.bodyType||''}`);
    p(`計測：A ${c.measurementA}cm／B ${c.measurementB}cm（A比 ${c.measurementA?Math.round(c.measurementB/c.measurementA*100):'-'}%）／C ${c.measurementC}cm`);
    p(`キャッチ：――${c.catchText||''}`);
    if(c.summaryText) p(`人物：${c.summaryText}`);
    p('―――― 内面・背景 ――――');
    p(`MBTI：${c.mbti||''}（${c.personality||''}）`);
    p(`行動原理：${c.principleText||''}／許せないこと：${c.unforgivableText||''}`);
    p(`コンプレックス：${c.complexText||''}`);
    p(`恋愛：対象 ${c.loveTarget||''}／タイプ ${c.loveTypeText||''}／${c.maritalText||''}／経験 ${c.expCountText||''}`);
    p(`収入・資産：${c.incomeText||''}／${c.assetText||''}`);
    p(`思い出：${c.memoryText||''}`);
    p(`コーデ基準：${c.fashionSenseText||''}`);
    if(c.fashionValueText) p(`【ファッション】重視：${c.fashionValueText||'—'}／好きなブランド：服は${c.favBrandText||'—'}・靴は${c.favShoeBrandText||'—'}／サイズ感：${c.sizeFeelText||'—'}／丈感：${c.hemPrefText||'—'}／スラックス：${c.slacksFitText||'—'}・${c.hemFinishText||'—'}／基調色：${c.baseColorText||'—'}（${c.colorSchemeText||'—'}）／靴下：買い替えは${c.sockCycleText||'—'}・内訳は${c.sockDrawerText||'—'}・連続着用は${c.sockWearText||'—'}・ニオイは${c.sockSmellText||'—'}・悩みは${c.sockTroubleText||'—'}・合わせ方は${c.sockPairText||'—'}`);
    p('―――― 提案服装 ――――');
    if(typeof workOutfitSpec==='function') p(`【職業】${workOutfitSpec(c,false)}`);
    if(typeof casualOutfitSpec==='function') p(`【私服】${casualOutfitSpec(c,false)}`);
    return L.join('\n');
  }
export { generateCharacter, buildPrompt, buildDerivedPrompt, pools,
  rarityBreakdown, scoreRarity, buildFullProfileText,
  ensureProfileMeasurements, generateInnerProfile, buildInnerSection,
  buildUniformEditRows, displayValue, buildBodyHairSummary, underwearDesc, T };
