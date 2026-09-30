import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detailLevelForDistance,
  gibsTileUrl,
  groundHalfAngleDeg,
  matrixSize,
  planDetail,
  tileCoord,
  tileSpanDeg,
  wrapLon,
} from "./detail-tiles.ts";

describe("GIBS geographic grid", () => {
  it("matches the 500 m matrix spans", () => {
    assert.equal(tileSpanDeg(0), 288);
    assert.equal(tileSpanDeg(5), 9);
    assert.equal(tileSpanDeg(7), 2.25);
    assert.deepEqual(matrixSize(0), { tilesX: 2, tilesY: 1 });
    assert.deepEqual(matrixSize(5), { tilesX: 40, tilesY: 20 });
    assert.deepEqual(matrixSize(7), { tilesX: 160, tilesY: 80 });
  });

  it("places Beijing on the expected level-5 tile", () => {
    assert.deepEqual(tileCoord(39.9, 116.4, 5), { z: 5, x: 32, y: 5 });
  });

  it("builds a REST url", () => {
    assert.equal(
      gibsTileUrl(5, 5, 32),
      "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/5/5/32.jpg",
    );
  });
});

describe("detail level", () => {
  it("stays off until the 8K plate is undersampled", () => {
    assert.equal(detailLevelForDistance(3), null);
    assert.equal(detailLevelForDistance(2.5), null);
    assert.equal(detailLevelForDistance(2.1), 5);
    assert.equal(detailLevelForDistance(1.6), 6);
    assert.equal(detailLevelForDistance(1.2), 7);
  });

  it("measures a few degrees of ground across the frame when zoomed in", () => {
    const half = groundHalfAngleDeg(1.18, 23);
    assert.ok(half > 3.5 && half < 6, `expected ~4.4°, got ${half}`);
  });
});

describe("planDetail", () => {
  it("returns nothing at the default camera distance", () => {
    assert.equal(planDetail({ lat: 30, lon: 110, distance: 2.62, aspect: 1.6 }), null);
  });

  it("covers the view with a bounded tile set and includes the center", () => {
    const plan = planDetail({ lat: 39.9, lon: 116.4, distance: 1.22, aspect: 1.7 });
    assert.ok(plan);
    assert.ok(plan.level >= 6);
    assert.ok(plan.tiles.length > 0 && plan.tiles.length <= 80);
    const center = tileCoord(39.9, 116.4, plan.level);
    assert.ok(plan.tiles.some((t) => t.x === center.x && t.y === center.y));
    assert.ok(plan.north > 39.9 && plan.south < 39.9);
  });

  it("wraps tiles across the antimeridian", () => {
    const plan = planDetail({ lat: 10, lon: 179, distance: 1.22, aspect: 1.5 });
    assert.ok(plan);
    assert.equal(wrapLon(plan.centerLon), 179);
    const xs = new Set(plan.tiles.map((t) => t.x));
    assert.ok([...xs].some((x) => x > matrixSize(plan.level).tilesX * 0.9));
    assert.ok([...xs].some((x) => x < 4));
  });
});
