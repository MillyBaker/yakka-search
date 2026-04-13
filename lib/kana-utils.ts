// 全角カタカナ → 半角カタカナ の対応表（濁点・半濁点なし）
const ZENKAKU_TO_HANKAKU: Record<string, string> = {
  ア: "ｱ", イ: "ｲ", ウ: "ｳ", エ: "ｴ", オ: "ｵ",
  カ: "ｶ", キ: "ｷ", ク: "ｸ", ケ: "ｹ", コ: "ｺ",
  サ: "ｻ", シ: "ｼ", ス: "ｽ", セ: "ｾ", ソ: "ｿ",
  タ: "ﾀ", チ: "ﾁ", ツ: "ﾂ", テ: "ﾃ", ト: "ﾄ",
  ナ: "ﾅ", ニ: "ﾆ", ヌ: "ﾇ", ネ: "ﾈ", ノ: "ﾉ",
  ハ: "ﾊ", ヒ: "ﾋ", フ: "ﾌ", ヘ: "ﾍ", ホ: "ﾎ",
  マ: "ﾏ", ミ: "ﾐ", ム: "ﾑ", メ: "ﾒ", モ: "ﾓ",
  ヤ: "ﾔ", ユ: "ﾕ", ヨ: "ﾖ",
  ラ: "ﾗ", リ: "ﾘ", ル: "ﾙ", レ: "ﾚ", ロ: "ﾛ",
  ワ: "ﾜ", ヲ: "ｦ", ン: "ﾝ",
  ァ: "ｧ", ィ: "ｨ", ゥ: "ｩ", ェ: "ｪ", ォ: "ｫ",
  ッ: "ｯ", ャ: "ｬ", ュ: "ｭ", ョ: "ｮ",
  ヴ: "ｳﾞ",
  ー: "ｰ", "　": " ",
};

// 濁点がつく全角カタカナ → 半角カタカナ（濁点 ﾞ を別文字として付加）
const DAKUTEN: Record<string, string> = {
  ガ: "ｶ", ギ: "ｷ", グ: "ｸ", ゲ: "ｹ", ゴ: "ｺ",
  ザ: "ｻ", ジ: "ｼ", ズ: "ｽ", ゼ: "ｾ", ゾ: "ｿ",
  ダ: "ﾀ", ヂ: "ﾁ", ヅ: "ﾂ", デ: "ﾃ", ド: "ﾄ",
  バ: "ﾊ", ビ: "ﾋ", ブ: "ﾌ", ベ: "ﾍ", ボ: "ﾎ",
};

// 半濁点がつく全角カタカナ
const HANDAKUTEN: Record<string, string> = {
  パ: "ﾊ", ピ: "ﾋ", プ: "ﾌ", ペ: "ﾍ", ポ: "ﾎ",
};

// ひらがな → 全角カタカナ（Unicode上の差分は 0x60）
function hiraganaToKatakana(char: string): string {
  const code = char.charCodeAt(0);
  // ぁ(0x3041) ～ ん(0x3093)、ゔ(0x3094)
  if (code >= 0x3041 && code <= 0x3096) {
    return String.fromCharCode(code + 0x60);
  }
  return char;
}

export function toHalfWidthKana(input: string): string {
  let result = "";
  for (const char of input) {
    // ひらがな → 全角カタカナに変換してから処理
    const kata = hiraganaToKatakana(char);

    if (DAKUTEN[kata]) {
      result += DAKUTEN[kata] + "ﾞ";
    } else if (HANDAKUTEN[kata]) {
      result += HANDAKUTEN[kata] + "ﾟ";
    } else if (ZENKAKU_TO_HANKAKU[kata]) {
      result += ZENKAKU_TO_HANKAKU[kata];
    } else {
      // 半角カタカナ・漢字・英数字などはそのまま
      result += char;
    }
  }
  return result;
}
