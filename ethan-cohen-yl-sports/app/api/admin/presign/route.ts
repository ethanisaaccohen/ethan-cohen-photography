import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { signedUpload } from "@/lib/storage";

const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

export async function POST(request: NextRequest) {
  const adminToken = (await cookies()).get("ec_admin")?.value;
  const isAdmin = await verifyAdminToken(adminToken);

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in again." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const filename =
      typeof body.filename === "string" ? body.filename : "";

    const type =
      typeof body.type === "string" && body.type
        ? body.type
        : "application/octet-stream";

    const galleryId =
      typeof body.galleryId === "string" ? body.galleryId : "";

    if (!filename || !galleryId) {
      return NextResponse.json(
        { error: "A filename and gallery ID are required." },
        { status: 400 }
      );
    }

    const extension = filename.split(".").pop()?.toLowerCase();

    if (!extension || !allowedExtensions.has(extension)) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    const publicBaseUrl = process.env.B2_PUBLIC_BASE_URL?.replace(/\/$/, "");

    if (!publicBaseUrl) {
      return NextResponse.json(
        { error: "Image storage is not configured: B2_PUBLIC_BASE_URL is missing." },
        { status: 500 }
      );
    }

    const key = `galleries/${galleryId}/${crypto.randomUUID()}.${extension}`;

    const url = await signedUpload(key, type);

    if (!url) {
      return NextResponse.json(
        { error: "Image storage did not return an upload URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url,
      key,
      publicUrl: `${publicBaseUrl}/${key}`,
    });
  } catch (error) {
    console.error("Could not create signed upload URL:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not prepare upload: ${error.message}`
            : "Could not prepare upload.",
      },
      { status: 500 }
    );
  }
}
