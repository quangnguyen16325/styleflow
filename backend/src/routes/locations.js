import { lookup } from "node:dns";
import { request as httpsRequest } from "node:https";

import { Router } from "express";

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
  } catch (error) {
    console.error("GET /locations/provinces failed:", error);
    return res.status(500).json(internalError("Failed to fetch provinces"));
  }
});

router.get("/provinces/:provinceCode/districts", async (req, res) => {
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

    console.error(`GET /locations/provinces/${provinceCode}/districts failed:`, error);
    return res.status(500).json(internalError("Failed to fetch districts"));
  }
});

router.get("/districts/:districtCode/wards", async (req, res) => {
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

    console.error(`GET /locations/districts/${districtCode}/wards failed:`, error);
    return res.status(500).json(internalError("Failed to fetch wards"));
  }
});

export default router;

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
  const response = await requestLocationJson(pathname);

  if (response.statusCode === 404) {
    throw new LocationApiNotFoundError();
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Location API request failed with status ${response.statusCode}`);
  }

  try {
    return JSON.parse(response.body);
  } catch (error) {
    throw new Error("Location API returned invalid JSON", { cause: error });
  }
}

function requestLocationJson(pathname) {
  const url = new URL(pathname, LOCATION_API_BASE_URL);

  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        lookup(hostname, options, callback) {
          return lookup(hostname, { ...options, family: 4 }, callback);
        },
      },
      (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 500,
            body,
          });
        });
      },
    );

    req.setTimeout(10_000, () => {
      req.destroy(new Error("Location API request timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function validationError(message) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

function notFoundError(message) {
  return {
    error: {
      code: "NOT_FOUND",
      message,
    },
  };
}

function internalError(message) {
  return {
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  };
}

class LocationApiNotFoundError extends Error {}
