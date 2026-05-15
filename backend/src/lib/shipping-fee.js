export const ADDRESS_CHANGE_PROCESSING_FEE = 10000;

export function calculateShippingFeeFromDaNang(destination) {
  const provinceCode = resolveProvinceCode(destination);

  if (provinceCode === "48") {
    return 15000;
  }

  if (ADJACENT_CENTRAL_PROVINCE_CODES.has(provinceCode)) {
    return 25000;
  }

  if (SPECIAL_ROUTE_PROVINCE_CODES.has(provinceCode)) {
    return 40000;
  }

  if (OTHER_CENTRAL_PROVINCE_CODES.has(provinceCode)) {
    return 35000;
  }

  const normalized = normalizeProvinceLookupName(
    typeof destination === "object"
      ? (destination?.city ?? destination?.provinceName)
      : destination,
  );

  if (normalized === "da nang") {
    return 15000;
  }

  if (ADJACENT_CENTRAL_PROVINCES.has(normalized)) {
    return 25000;
  }

  if (SPECIAL_ROUTE_PROVINCES.has(normalized)) {
    return 40000;
  }

  if (OTHER_CENTRAL_PROVINCES.has(normalized)) {
    return 35000;
  }

  return 50000;
}

export function calculateAddressChangeFeeBreakdown({
  currentCity,
  currentProvinceCode,
  nextCity,
  nextProvinceCode,
  currentShippingFee,
}) {
  const sameProvince = isSameProvince({
    currentProvinceCode,
    nextProvinceCode,
    currentCity,
    nextCity,
  });
  const recalculatedShippingFee = calculateShippingFeeFromDaNang({
    provinceCode: nextProvinceCode,
    city: nextCity,
  });
  const effectiveShippingFee = sameProvince ? Number(currentShippingFee) : recalculatedShippingFee;
  const feeDelta =
    ADDRESS_CHANGE_PROCESSING_FEE + (effectiveShippingFee - Number(currentShippingFee));

  return {
    sameProvince,
    processingFee: ADDRESS_CHANGE_PROCESSING_FEE,
    recalculatedShippingFee,
    effectiveShippingFee,
    feeDelta,
  };
}

export function normalizeProvinceName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeProvinceCode(value) {
  if (value == null) {
    return "";
  }

  return String(value).replace(/\D+/g, "").trim();
}

export function resolveProvinceCode(destination) {
  const explicitProvinceCode = normalizeProvinceCode(
    typeof destination === "object" ? destination?.provinceCode : destination,
  );

  if (explicitProvinceCode) {
    return explicitProvinceCode;
  }

  const provinceName =
    typeof destination === "object"
      ? (destination?.city ?? destination?.provinceName)
      : destination;

  return PROVINCE_CODE_BY_NAME.get(normalizeProvinceLookupName(provinceName)) ?? "";
}

export function isSameProvince({ currentProvinceCode, nextProvinceCode, currentCity, nextCity }) {
  const currentCode = resolveProvinceCode({
    provinceCode: currentProvinceCode,
    city: currentCity,
  });
  const nextCode = resolveProvinceCode({
    provinceCode: nextProvinceCode,
    city: nextCity,
  });

  if (currentCode && nextCode) {
    return currentCode === nextCode;
  }

  return normalizeProvinceLookupName(currentCity) === normalizeProvinceLookupName(nextCity);
}

function normalizeProvinceLookupName(value) {
  return normalizeProvinceName(value)
    .replace(/^(tinh|thanh pho)\s+/, "")
    .trim();
}

const ADJACENT_CENTRAL_PROVINCE_CODES = new Set(["46", "49"]);
const ADJACENT_CENTRAL_PROVINCES = new Set(["quang nam", "hue", "thua thien hue", "thanh pho hue"]);

const SPECIAL_ROUTE_PROVINCE_CODES = new Set(["1", "79"]);
const SPECIAL_ROUTE_PROVINCES = new Set([
  "ha noi",
  "hanoi",
  "ho chi minh city",
  "ho chi minh",
  "thanh pho ho chi minh",
  "tp hcm",
  "tphcm",
  "sai gon",
  "tp ho chi minh",
]);

const OTHER_CENTRAL_PROVINCE_CODES = new Set([
  "38",
  "40",
  "42",
  "44",
  "45",
  "51",
  "52",
  "54",
  "56",
  "58",
  "60",
]);
const OTHER_CENTRAL_PROVINCES = new Set([
  "thanh hoa",
  "nghe an",
  "ha tinh",
  "quang binh",
  "quang tri",
  "quang ngai",
  "binh dinh",
  "phu yen",
  "khanh hoa",
  "ninh thuan",
  "binh thuan",
]);

const PROVINCE_CODE_BY_NAME = new Map([
  ["ha noi", "1"],
  ["ha giang", "2"],
  ["cao bang", "4"],
  ["bac kan", "6"],
  ["tuyen quang", "8"],
  ["lao cai", "10"],
  ["dien bien", "11"],
  ["lai chau", "12"],
  ["son la", "14"],
  ["yen bai", "15"],
  ["hoa binh", "17"],
  ["thai nguyen", "19"],
  ["lang son", "20"],
  ["quang ninh", "22"],
  ["bac giang", "24"],
  ["phu tho", "25"],
  ["vinh phuc", "26"],
  ["bac ninh", "27"],
  ["hai duong", "30"],
  ["hai phong", "31"],
  ["hung yen", "33"],
  ["thai binh", "34"],
  ["ha nam", "35"],
  ["nam dinh", "36"],
  ["ninh binh", "37"],
  ["thanh hoa", "38"],
  ["nghe an", "40"],
  ["ha tinh", "42"],
  ["quang binh", "44"],
  ["quang tri", "45"],
  ["hue", "46"],
  ["da nang", "48"],
  ["quang nam", "49"],
  ["quang ngai", "51"],
  ["binh dinh", "52"],
  ["phu yen", "54"],
  ["khanh hoa", "56"],
  ["ninh thuan", "58"],
  ["binh thuan", "60"],
  ["kon tum", "62"],
  ["gia lai", "64"],
  ["dak lak", "66"],
  ["dak nong", "67"],
  ["lam dong", "68"],
  ["binh phuoc", "70"],
  ["tay ninh", "72"],
  ["binh duong", "74"],
  ["dong nai", "75"],
  ["ba ria vung tau", "77"],
  ["ho chi minh", "79"],
  ["long an", "80"],
  ["tien giang", "82"],
  ["ben tre", "83"],
  ["tra vinh", "84"],
  ["vinh long", "86"],
  ["dong thap", "87"],
  ["an giang", "89"],
  ["kien giang", "91"],
  ["can tho", "92"],
  ["hau giang", "93"],
  ["soc trang", "94"],
  ["bac lieu", "95"],
  ["ca mau", "96"],
]);
