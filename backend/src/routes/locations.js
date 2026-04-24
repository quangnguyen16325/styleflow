import { Router } from "express";
<<<<<<< HEAD

const router = Router();

router.get("/provinces", async (_req, res) => {
  try {
    const provinces = await getCachedJson("provinces", async () => {
      const data = await fetchLocationJson("/api/v1/?depth=1");
      return data.map((province) => ({
        code: Number(province.code),
        name: province.name,
        divisionType: province.division_type,
        codename: province.codename,
        phoneCode: province.phone_code == null ? null : Number(province.phone_code),
      }));
    });

    return res.json(provinces);
=======
import https from "https";

const router = Router();
const BASE_URL = "https://provinces.open-api.vn/api";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const cache = new Map();

router.get("/provinces", async (_req, res) => {
  try {
    const data = await fetchWithCache("provinces", `${BASE_URL}/p/`);
    return res.json(
      Array.isArray(data)
        ? data
            .map((province) => ({
              code: province.code == null ? null : String(province.code),
              name: province.name,
            }))
            .filter((province) => province.code && province.name)
        : [],
    );
>>>>>>> 8a11a3e (fix(locations): use native https for Vietnam location API)
  } catch (error) {
    console.error("GET /locations/provinces failed:", error);
    return res.status(500).json(internalError("Failed to fetch provinces"));
  }
});

router.get("/provinces/:provinceCode/districts", async (req, res) => {
<<<<<<< HEAD
  const provinceCode = parsePositiveInteger(req.params.provinceCode);
  if (!provinceCode) {
    return res.status(400).json(validationError("provinceCode must be a positive integer"));
  }

  try {
    const districts = await getCachedJson(`province:${provinceCode}:districts`, async () => {
      const province = await fetchLocationJson(`/api/v1/p/${provinceCode}?depth=2`);
      return (province.districts ?? []).map((district) => ({
        code: Number(district.code),
        name: district.name,
        divisionType: district.division_type,
        codename: district.codename,
        provinceCode: Number(district.province_code),
      }));
    });

    return res.json(districts);
  } catch (error) {
    if (error instanceof LocationApiNotFoundError) {
      return res.status(404).json(notFoundError("Province not found"));
    }

=======
  const provinceCode = sanitizeCode(req.params.provinceCode);
  if (!provinceCode) {
    return res.status(400).json(validationError("Province code is required"));
  }

  try {
    const data = await fetchWithCache(
      `province:${provinceCode}:districts`,
      `${BASE_URL}/p/${provinceCode}?depth=2`,
    );
    return res.json(
      Array.isArray(data?.districts)
        ? data.districts
            .map((district) => ({
              code: district.code == null ? null : String(district.code),
              name: district.name,
            }))
            .filter((district) => district.code && district.name)
        : [],
    );
  } catch (error) {
>>>>>>> 8a11a3e (fix(locations): use native https for Vietnam location API)
    console.error(`GET /locations/provinces/${provinceCode}/districts failed:`, error);
    return res.status(500).json(internalError("Failed to fetch districts"));
  }
});

router.get("/districts/:districtCode/wards", async (req, res) => {
<<<<<<< HEAD
  const districtCode = parsePositiveInteger(req.params.districtCode);
  if (!districtCode) {
    return res.status(400).json(validationError("districtCode must be a positive integer"));
  }

  try {
    const wards = await getCachedJson(`district:${districtCode}:wards`, async () => {
      const district = await fetchLocationJson(`/api/v1/d/${districtCode}?depth=2`);
      return (district.wards ?? []).map((ward) => ({
        code: Number(ward.code),
        name: ward.name,
        divisionType: ward.division_type,
        codename: ward.codename,
        districtCode: Number(ward.district_code),
      }));
    });

    return res.json(wards);
  } catch (error) {
    if (error instanceof LocationApiNotFoundError) {
      return res.status(404).json(notFoundError("District not found"));
    }

=======
  const districtCode = sanitizeCode(req.params.districtCode);
  if (!districtCode) {
    return res.status(400).json(validationError("District code is required"));
  }

  try {
    const data = await fetchWithCache(
      `district:${districtCode}:wards`,
      `${BASE_URL}/d/${districtCode}?depth=2`,
    );
    return res.json(
      Array.isArray(data?.wards)
        ? data.wards
            .map((ward) => ({
              code: ward.code == null ? null : String(ward.code),
              name: ward.name,
            }))
            .filter((ward) => ward.code && ward.name)
        : [],
    );
  } catch (error) {
>>>>>>> 8a11a3e (fix(locations): use native https for Vietnam location API)
    console.error(`GET /locations/districts/${districtCode}/wards failed:`, error);
    return res.status(500).json(internalError("Failed to fetch wards"));
  }
});

export default router;

<<<<<<< HEAD
const LOCATION_API_BASE_URL = process.env.LOCATION_API_BASE_URL || "https://provinces.open-api.vn";
const LOCATION_CACHE_TTL_MS = Number(process.env.LOCATION_CACHE_TTL_MS || 1000 * 60 * 60 * 12);
const locationCache = new Map();

async function getCachedJson(cacheKey, loader) {
  const now = Date.now();
  const cached = locationCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await loader();
  locationCache.set(cacheKey, {
    value,
    expiresAt: now + LOCATION_CACHE_TTL_MS,
  });
  return value;
}

async function fetchLocationJson(pathname) {
  const response = await fetch(`${LOCATION_API_BASE_URL}${pathname}`);

  if (response.status === 404) {
    throw new LocationApiNotFoundError();
  }

  if (!response.ok) {
    throw new Error(`Location API request failed with status ${response.status}`);
  }

  return response.json();
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
=======
async function fetchWithCache(cacheKey, url) {
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await fetchJson(url);
  cache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return data;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const { statusCode } = response;
      let rawData = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        rawData += chunk;
      });

      response.on("end", () => {
        if (!statusCode || statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Upstream responded with ${statusCode || "unknown"}`));
          return;
        }

        try {
          resolve(JSON.parse(rawData));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);
    request.end();
  });
}

function sanitizeCode(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
>>>>>>> 8a11a3e (fix(locations): use native https for Vietnam location API)
}

function validationError(message) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

<<<<<<< HEAD
function notFoundError(message) {
  return {
    error: {
      code: "NOT_FOUND",
      message,
    },
  };
}

=======
>>>>>>> 8a11a3e (fix(locations): use native https for Vietnam location API)
function internalError(message) {
  return {
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  };
}
<<<<<<< HEAD

class LocationApiNotFoundError extends Error {}
=======
>>>>>>> 8a11a3e (fix(locations): use native https for Vietnam location API)
