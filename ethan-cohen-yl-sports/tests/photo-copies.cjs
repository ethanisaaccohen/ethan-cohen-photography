// Assertion-based, local integration QA. Run with:
// NODE_PATH=/home/user/workspace/localstack/node_modules node tests/photo-copies.cjs
// Requires the local Postgres/PostgREST + storage fixture and test admin password.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const sharp = require("sharp");
const { execFileSync } = require("node:child_process");
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const fixture = "/home/user/workspace/localstack/storage-fixtures";
const gallery = "ee2c4dc0-d020-4cfb-bd44-993bc2a49c50";
async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome", headless: true,
  });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${base}/login`);
    await page.fill("input[type=password]", "localtest123");
    await page.click("form button"); await page.waitForURL("**/admin");
    await page.goto(`${base}/admin/gallery/${gallery}`);
    await page.waitForSelector('input[type=file]');
    const source = "/home/user/workspace/photo-backfill/029d8d00-6cc7-4edb-a1a2-6633b33ebc38/source.jpg";
    const original = await sharp(source).resize({ width: 6000 }).jpeg({ quality: 96 }).toBuffer();
    let originalPuts = 0;
    let originalBytes = 0;
    // The B2 transport is explicitly mocked; the application signing, resizing,
    // copy upload, photo creation and persisted retrieval remain real.
    await page.route("https://b2-test.example/**", async route => {
      assert.equal(route.request().method(), "PUT");
      originalPuts++; originalBytes = route.request().postDataBuffer()?.length;
      await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, body: "" });
    });
    await page.locator('input[type=file]').setInputFiles({ name: "integration-photo.jpg", mimeType: "image/jpeg", buffer: original });
    const copied = page.waitForResponse(r => r.url().endsWith("/derivatives") && r.request().method() === "POST");
    const published = page.waitForResponse(r => r.url().endsWith("/photo") && r.request().method() === "POST");
    await page.click("form.form button[type=submit]");
    const copyResponse = await copied;
    assert.equal(copyResponse.status(), 200, await copyResponse.text());
    const copy = await copyResponse.json();
    const photoResponse = await published;
    assert.equal(photoResponse.status(), 200, await photoResponse.text());
    const photo = await photoResponse.json();
    assert.equal(originalPuts, 1);
    assert.equal(originalBytes, original.length);
    assert.equal(photo.thumbnail_url, copy.thumbnail_url);
    assert.equal(photo.viewing_url, copy.viewing_url);
    for (const [kind, limit, budget] of [["thumbnail",1200,450000],["viewing",2048,1800000]]) {
      const bytes = fs.readFileSync(path.join(fixture, photo[`${kind}_storage_key`]));
      const m = await sharp(bytes).metadata();
      assert.ok(Math.max(m.width,m.height) <= limit);
      assert.ok(bytes.length <= budget);
      assert.notEqual(bytes.length, original.length);
      console.log(`${kind}: ${m.width}x${m.height}, ${bytes.length} bytes`);
    }
    console.log("PASS upload: local generation -> stored copies -> original PUT -> published row");
    // Incomplete uploads cannot publish a new record.
    const badRecord = await page.request.post(`${base}/api/admin/gallery/${gallery}/photo`, { data: { display_url: photo.display_url } });
    assert.equal(badRecord.status(),400);
    // Validate actual JPEG dimensions rather than trusting MIME/filename.
    const invalid = await page.request.post(`${base}/api/admin/gallery/${gallery}/derivatives`, {
      multipart: {
        thumbnail: { name:"thumbnail.jpg",mimeType:"image/jpeg",buffer:original },
        viewing: { name:"viewing.jpg",mimeType:"image/jpeg",buffer:original },
      },
    });
    assert.ok([400,413].includes(invalid.status()));
    // Failure to store copies must stop before original upload or photo publish.
    await page.request.post("http://localhost:54321/__test/fail-next");
    await page.locator('input[type=file]').setInputFiles({name:"failed.jpg",mimeType:"image/jpeg",buffer:original});
    const fail = page.waitForResponse(r=>r.url().endsWith("/derivatives"));
    await page.click("form.form button[type=submit]");
    assert.equal((await fail).status(),400);
    await page.waitForSelector(".upload-list .error", {timeout:10000}).catch(()=>{});
    assert.equal(originalPuts,1);
    console.log("PASS failure paths: no copies -> no published record; storage failure -> no original PUT");
    // Tag the isolated test photo so the public Search page can exercise it.
    await page.request.patch(`${base}/api/admin/photos/${photo.id}`, {data:{tags:["COPY-QA"],caption:"Stored-copy QA"}});
    await page.request.patch(`${base}/api/admin/gallery/${gallery}`, {data:{cover_url:photo.display_url}});
    let requests = [];
    page.on("request",r => { if(r.resourceType()==="image") requests.push(r.url()); });
    await page.goto(`${base}/gallery/hjuevwgrhieouir`);
    await page.waitForSelector(`img[src="${photo.thumbnail_url}"]`);
    await page.locator(`img[src="${photo.thumbnail_url}"]`).scrollIntoViewIfNeeded();
    await page.waitForFunction(u=>[...document.images].find(i=>i.src===u)?.naturalWidth>0,photo.thumbnail_url);
    assert.ok(requests.includes(photo.thumbnail_url));
    assert.ok(!requests.some(u=>u.includes("backblazeb2")||u.includes("/_next/image")||u.includes("/viewing.jpg")));
    await page.locator(`img[src="${photo.thumbnail_url}"]`).locator("..").click();
    await page.waitForSelector(".lightbox-image.is-loaded");
    assert.equal(await page.locator(".lightbox-image").getAttribute("src"), photo.viewing_url);
    assert.equal(await page.locator(".lightbox-footer a[download]").getAttribute("href"),photo.display_url);
    assert.equal(requests.filter(u=>u.includes("/viewing.jpg")).length,1);
    await page.keyboard.press("Escape");
    await page.screenshot({path:"/home/user/workspace/photo-copies-desktop.png",fullPage:false});
    console.log("PASS gallery: stored thumbnails only; clicked viewing copy only; original is a link");
    await page.goto(base);
    assert.equal(await page.locator(`.card img[src="${photo.thumbnail_url}"]`).count(),1);
    await page.goto(`${base}/search?q=COPY-QA`);
    await page.waitForSelector(".search-card");
    assert.equal(await page.locator(".search-card img").getAttribute("src"),photo.thumbnail_url);
    await page.locator(".search-card").click();
    await page.waitForSelector(".lightbox-image.is-loaded");
    assert.equal(await page.locator(".lightbox-image").getAttribute("src"),photo.viewing_url);
    console.log("PASS cover, Search and deep-linked lightbox use the stored copies");
    const mobile = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const mp = await mobile.newPage();
    await mp.goto(`${base}/gallery/hjuevwgrhieouir?photo=${photo.id}`);
    await mp.waitForSelector(".lightbox-image.is-loaded");
    await mp.waitForFunction(() => Number(getComputedStyle(document.querySelector(".lightbox-image")).opacity) > .99);
    assert.equal(await mp.locator(".lightbox-image").getAttribute("src"),photo.viewing_url);
    await mp.screenshot({path:"/home/user/workspace/photo-copies-mobile.png"});
    assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log("PASS mobile viewport + no browser exceptions");
    // Original-dependency guard: legacy records without copies must use placeholders.
    const imageCode = fs.readFileSync(path.join(__dirname,"../lib/images.ts"),"utf8");
    assert.ok(!imageCode.includes("getImageProps"));
    assert.ok(!imageCode.includes("src: photo.display_url"));
    // Clean only the generated local test record (not production data).
    await page.request.delete(`${base}/api/admin/photos/${photo.id}`);
    console.log("ALL PHOTO-COPY INTEGRATION CHECKS PASSED");
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e);process.exitCode=1; });
