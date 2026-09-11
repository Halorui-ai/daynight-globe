import countries from "i18n-iso-countries";
import zh from "i18n-iso-countries/langs/zh.json";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(zh);
countries.registerLocale(en);

const NAME_OVERRIDES: Record<string, string> = {
  "W. Sahara": "西撒哈拉",
  "Dem. Rep. Congo": "刚果（金）",
  Congo: "刚果（布）",
  "Dominican Rep.": "多米尼加",
  "Falkland Is.": "福克兰群岛",
  "Fr. S. Antarctic Lands": "法属南部领地",
  "Central African Rep.": "中非",
  "Eq. Guinea": "赤道几内亚",
  eSwatini: "斯威士兰",
  "Solomon Is.": "所罗门群岛",
  "N. Cyprus": "北塞浦路斯",
  "Bosnia and Herz.": "波黑",
  Macedonia: "北马其顿",
  "S. Sudan": "南苏丹",
  Somaliland: "索马里兰",
  Kosovo: "科索沃",
  "United States of America": "美国",
  "Timor-Leste": "东帝汶",
  "Côte d'Ivoire": "科特迪瓦",
  Palestine: "巴勒斯坦",
  Taiwan: "台湾",
  "North Korea": "朝鲜",
  "South Korea": "韩国",
  "Czechia": "捷克",
  "United Kingdom": "英国",
  Russia: "俄罗斯",
  Antarctica: "南极洲",
};

const SHORT_EN: Record<string, string> = {
  "United States of America": "United States",
  "Dem. Rep. Congo": "DR Congo",
  "Dominican Rep.": "Dominican Republic",
  "Central African Rep.": "Central African Republic",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Fr. S. Antarctic Lands": "French Southern Lands",
  "Eq. Guinea": "Equatorial Guinea",
  "Falkland Is.": "Falkland Islands",
  "Solomon Is.": "Solomon Islands",
  "N. Cyprus": "Northern Cyprus",
  "S. Sudan": "South Sudan",
  Macedonia: "North Macedonia",
};

export function numericToAlpha2(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const trimmed = String(Number.parseInt(id, 10));
  return countries.numericToAlpha2(trimmed.padStart(3, "0")) ?? countries.numericToAlpha2(trimmed);
}

export function countryNameZh(id: string | undefined, nameEn: string): string {
  if (NAME_OVERRIDES[nameEn]) return NAME_OVERRIDES[nameEn];
  const a2 = numericToAlpha2(id);
  if (a2) {
    const zhName = countries.getName(a2, "zh");
    if (zhName) return zhName;
  }
  return nameEn;
}

export function countryNameEn(nameEn: string): string {
  return SHORT_EN[nameEn] ?? nameEn;
}

export function countryAlpha2(id: string | undefined, nameEn: string): string {
  const a2 = numericToAlpha2(id);
  if (a2) return a2;
  if (nameEn === "Kosovo") return "XK";
  if (nameEn === "Somaliland") return "XS";
  if (nameEn === "N. Cyprus") return "XN";
  return "XX";
}
