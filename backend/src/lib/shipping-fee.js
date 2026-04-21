export const ADDRESS_CHANGE_PROCESSING_FEE = 10000;

export function calculateShippingFeeFromDaNang(destination) {
  const provinceCode = normalizeProvinceCode(
    typeof destination === "object" ? destination?.provinceCode : null,
  );

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

  const normalized = normalizeProvinceName(
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

export function isSameProvince({ currentProvinceCode, nextProvinceCode, currentCity, nextCity }) {
  const currentCode = normalizeProvinceCode(currentProvinceCode);
  const nextCode = normalizeProvinceCode(nextProvinceCode);

  if (currentCode && nextCode) {
    return currentCode === nextCode;
  }

  return normalizeProvinceName(currentCity) === normalizeProvinceName(nextCity);
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
